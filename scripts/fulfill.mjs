// Envía a CJ los pedidos pagados en Stripe que aún no se han tramitado.
// Estado guardado en los metadatos del PaymentIntent (sin base de datos, sin datos personales en el repo).
import { paidSessions, shippingOf, setPIMeta } from './lib/stripe.mjs';
import { freight, createOrder, orderDetail, pickLogistic } from './lib/cj.mjs';
import { loadConfig } from './lib/config.mjs';
import { provinceFromZip, isRemoteZip } from './lib/provinces.mjs';
import { alertIssue } from './lib/github.mjs';
import { notifyOps } from './lib/email.mjs';
import { requireEnv, log, summary, ref, DRY } from './lib/util.mjs';

requireEnv('STRIPE_SECRET_KEY', 'CJ_API_KEY');
const cfg = loadConfig();
const F = cfg.fulfillment;
const MAX_ATTEMPTS = 3;
const DONE = new Set(['ordered', 'shipped', 'delivered', 'skipped', 'manual']);
let stats;

export function buildOrder(session, cfg, logisticName, fromCountryCode) {
  // Pagos de prueba de Stripe (modo test): se crea el pedido en CJ SIN pagarlo (payType 3) para validar la integración sin gastar saldo
  const testMode = session.livemode === false;
  const pi = session.payment_intent;
  const m = pi.metadata || {};
  const bundle = cfg.bundles.find(b => b.id === m.pack);
  const variant = cfg.variants.find(v => v.id === m.color);
  if (!bundle || !variant) throw new Error(`Metadatos de pedido incompletos (pack=${m.pack}, color=${m.color})`);
  if (!variant.cjVid) throw new Error(`Falta cjVid para el color "${variant.id}" en store.config.json`);
  const sh = shippingOf(session);
  if (!sh?.address) throw new Error('Pedido sin dirección de envío');
  const a = sh.address;
  const cd = session.customer_details || {};
  return {
    orderNumber: ref(F.orderPrefix, pi.id),
    shippingCountryCode: a.country,
    shippingCountry: ({ ES: 'Spain', US: 'United States' })[a.country] || a.country,
    shippingProvince: a.state || (a.country === 'ES' ? provinceFromZip(a.postal_code) : null) || a.city,
    shippingCity: a.city,
    shippingZip: a.postal_code,
    shippingAddress: a.line1,
    shippingAddress2: a.line2 || '',
    shippingCustomerName: sh.name || cd.name,
    shippingPhone: cd.phone || sh.phone || '',
    email: cd.email || '',
    remark: `Stripe ${pi.id}`,
    logisticName,
    fromCountryCode,
    payType: testMode ? 3 : (F.autoPay ? 2 : 3),
    products: [{ vid: variant.cjVid, quantity: bundle.qty, storeLineItemId: `${m.pack}-${m.color}` }]
  };
}

async function chooseLogistic(vid, qty, to) {
  const origins = [F.fromCountryCode, ...(F.fallbackFromCountryCodes || [])];
  for (const from of origins) {
    try {
      const opts = await freight(from, to, [{ vid, quantity: qty }]);
      const pick = pickLogistic(opts, F.maxShippingDays);
      if (pick) return { from, pick };
    } catch (e) { log(`  · sin logística desde ${from}: ${e.message}`); }
  }
  throw new Error('No hay logística disponible desde ningún almacén configurado');
}

async function processSession(s) {
  const pi = s.payment_intent;
  const m = pi.metadata || {};
  const r = ref(F.orderPrefix, pi.id);
  if (!m.pack) return; // no es un pedido de esta tienda
  stats.checked++;
  if (DONE.has(m.fulfillment_status)) return;
  const attempts = Number(m.fulfillment_attempts || 0);
  if (m.fulfillment_status === 'error' && attempts >= MAX_ATTEMPTS) return;

  // Pedidos de un producto/variante que ya no existe en la configuración (p. ej. pruebas antiguas) → omitir
  if (!cfg.bundles.some(b => b.id === m.pack) || !cfg.variants.some(v => v.id === m.color)) {
    if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'skipped', fulfillment_note: `producto no reconocido (${m.pack}/${m.color})` });
    stats.skipped++; log(`${r}: omitido (producto no reconocido)`); return;
  }
  // Reembolsado antes de enviar → no tramitar
  const ch = pi.latest_charge;
  if (ch && typeof ch === 'object' && (ch.refunded || ch.amount_refunded > 0 || ch.disputed)) {
    if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'skipped', fulfillment_note: 'reembolsado/disputado antes de enviar' });
    stats.skipped++; log(`${r}: omitido (reembolso/disputa)`); return;
  }
  const addr = shippingOf(s)?.address || {};
  if (addr.country === 'ES' && isRemoteZip(addr.postal_code)) {
    if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'manual', fulfillment_note: 'zona remota (Canarias/Ceuta/Melilla): revisar' });
    await alertIssue(`Pedido ${r} requiere revisión manual`, 'Destino Canarias/Ceuta/Melilla. Revisa el pedido en Stripe y tramítalo manualmente en CJ (o reembolsa).');
    stats.skipped++; return;
  }

  // Ejecución anterior interrumpida: reconciliar con CJ antes de reintentar (evita pedidos duplicados)
  if (m.fulfillment_status === 'processing' || attempts > 0) {
    try {
      const d = await orderDetail(r);
      if (d?.orderId) {
        if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'ordered', cj_order_id: d.orderId });
        stats.reconciled++; log(`${r}: reconciliado con CJ ${d.orderId}`); return;
      }
    } catch { /* no existe en CJ: seguimos */ }
  }

  try {
    const bundle = cfg.bundles.find(b => b.id === m.pack);
    const variant = cfg.variants.find(v => v.id === m.color);
    if (!variant?.cjVid) throw new Error(`Falta cjVid para el color "${m.color}"`);
    const { from, pick } = await chooseLogistic(variant.cjVid, bundle.qty, shippingOf(s).address.country);
    const order = buildOrder(s, cfg, pick.logisticName, from);
    if (DRY) { log(`[dry-run] ${r}: crearía pedido CJ ${bundle.qty}× ${variant.id} vía ${pick.logisticName} desde ${from}`); return; }
    await setPIMeta(pi.id, { fulfillment_status: 'processing', fulfillment_attempts: String(attempts + 1) });
    const res = await createOrder(order);
    await setPIMeta(pi.id, {
      fulfillment_status: 'ordered', cj_order_id: res.orderId, cj_logistic: pick.logisticName,
      cj_from: from, cj_shipping_usd: String(pick.price ?? ''), fulfillment_error: ''
    });
    stats.ordered++; log(`${r}: pedido CJ ${res.orderId} (${pick.logisticName}, ${from})${s.livemode === false ? ' [TEST: creado sin pagar, bórralo en CJ]' : ''}`);
  } catch (e) {
    stats.errors++;
    const msg = String(e.message).slice(0, 450);
    log(`${r}: ERROR ${msg}`);
    if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'error', fulfillment_error: msg, fulfillment_attempts: String(attempts + 1) }).catch(() => {});
    if (attempts + 1 >= MAX_ATTEMPTS) {
      await alertIssue(`Pedido ${r} no se pudo enviar a CJ`, `Error tras ${MAX_ATTEMPTS} intentos:\n\n\`${msg}\`\n\nCausas típicas: saldo CJ insuficiente, cjVid incorrecto o sin stock. Corrige y pon \`fulfillment_status\` vacío en los metadatos del pago en Stripe para reintentar.`);
      await notifyOps(`Pedido ${r} sin tramitar`, msg);
    }
  }
}

export async function run() {
  stats = { checked: 0, ordered: 0, skipped: 0, errors: 0, reconciled: 0 };
  // Sin producto CJ configurado todavía: no tocar los pedidos (se tramitarán en cuanto se configure)
  if (!cfg.variants.some(v => v.cjVid)) { summary('⏸ Ningún color tiene `cjVid` en store.config.json: pedidos en espera.'); return stats; }
  const sessions = await paidSessions(Number(process.env.LOOKBACK_DAYS || 14));
  for (const s of sessions.reverse()) await processSession(s);
  summary(`### Fulfilment\n- Revisados: ${stats.checked}\n- Enviados a CJ: ${stats.ordered}\n- Reconciliados: ${stats.reconciled}\n- Omitidos: ${stats.skipped}\n- Errores: ${stats.errors}`);
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(st => { if (st.errors) process.exitCode = 1; }).catch(e => { console.error(e.message); process.exit(1); });
}
