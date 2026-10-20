// Sincroniza estado de envío desde CJ → Stripe y avisa al cliente (enviado / entregado).
import { paidSessions, shippingOf, setPIMeta } from './lib/stripe.mjs';
import { orderDetail, trackInfo } from './lib/cj.mjs';
import { loadConfig, siteUrl } from './lib/config.mjs';
import { sendEmail, shippedEmail, deliveredEmail, emailEnabled, notifyOps } from './lib/email.mjs';
import { alertIssue } from './lib/github.mjs';
import { requireEnv, log, summary, ref, DRY } from './lib/util.mjs';

requireEnv('STRIPE_SECRET_KEY', 'CJ_API_KEY');
const cfg = loadConfig();
let stats;

export async function run() {
  stats = { checked: 0, shipped: 0, delivered: 0, cancelled: 0, emails: 0, stuck: 0 };
  const sessions = await paidSessions(Number(process.env.LOOKBACK_DAYS || 45));
  for (const s of sessions) {
    const pi = s.payment_intent, m = pi.metadata || {};
    const r = ref(cfg.fulfillment.orderPrefix, pi.id);
    const name = shippingOf(s)?.name || s.customer_details?.name;
    const email = s.customer_details?.email;
    try {
      if (m.fulfillment_status === 'ordered' && m.cj_order_id) {
        stats.checked++;
        const d = await orderDetail(m.cj_order_id);
        if (d?.orderStatus === 'CANCELLED') {
          stats.cancelled++;
          if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'error', fulfillment_error: 'Pedido cancelado en CJ' });
          await alertIssue(`Pedido ${r} cancelado en CJ`, 'CJ ha cancelado el pedido. Revisa el motivo en CJ y vuelve a tramitarlo o reembolsa al cliente en Stripe.');
          continue;
        }
        if (d?.trackNumber) {
          const trackingUrl = d.trackingUrl || `${siteUrl(cfg)}/seguimiento.html`;
          if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'shipped', tracking_number: d.trackNumber, shipped_at: new Date().toISOString().slice(0, 10) });
          stats.shipped++; log(`${r}: enviado`);
          if (email && emailEnabled()) { await sendEmail({ to: email, ...shippedEmail({ name, trackNumber: d.trackNumber, trackingUrl: d.trackingUrl }) }); stats.emails++; }
        } else {
          // Aviso si lleva >4 días sin salir del almacén
          const age = (Date.now() / 1000 - s.created) / 86400;
          if (age > 4) { stats.stuck++; await alertIssue(`Pedido ${r} lleva ${Math.floor(age)} días sin enviar`, `Estado CJ: ${d?.orderStatus || 'desconocido'}. Revísalo en CJ.`); }
        }
      } else if (m.fulfillment_status === 'shipped' && m.tracking_number) {
        stats.checked++;
        const [t] = (await trackInfo([m.tracking_number])) || [];
        if (t && /deliver|entregad/i.test(t.trackingStatus || '')) {
          if (!DRY) await setPIMeta(pi.id, { fulfillment_status: 'delivered', delivered_at: new Date().toISOString().slice(0, 10) });
          stats.delivered++; log(`${r}: entregado`);
          if (email && emailEnabled()) { await sendEmail({ to: email, ...deliveredEmail({ name, formUrl: cfg.reviewsFormUrl }) }); stats.emails++; }
        }
      }
    } catch (e) { log(`${r}: error de seguimiento ${e.message}`); }
  }
  if (stats.stuck) await notifyOps('Pedidos retrasados', `${stats.stuck} pedido(s) llevan más de 4 días sin salir del almacén. Mira las issues del repositorio.`);
  summary(`### Seguimiento\n- Revisados: ${stats.checked}\n- Nuevos enviados: ${stats.shipped}\n- Entregados: ${stats.delivered}\n- Cancelados en CJ: ${stats.cancelled}\n- Retrasados: ${stats.stuck}\n- Emails enviados: ${stats.emails}${emailEnabled() ? '' : ' (email desactivado: falta RESEND_API_KEY / EMAIL_FROM)'}`);
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) run().catch(e => { console.error(e.message); process.exit(1); });
