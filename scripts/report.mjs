// Informe diario de negocio: pedidos, ingresos, margen estimado y estado de fulfilment.
import { paidSessions } from './lib/stripe.mjs';
import { loadConfig } from './lib/config.mjs';
import { notifyOps } from './lib/email.mjs';
import { requireEnv, summary, money, round2, isPrivateRepo } from './lib/util.mjs';

requireEnv('STRIPE_SECRET_KEY');
const cfg = loadConfig();
const E = cfg.economics;

export function unitEconomics(bundle) {
  const net = bundle.price / (1 + E.vatRate);
  const cogs = E.unitCostEUR * bundle.qty + (E.shippingCostEUR[String(bundle.qty)] ?? E.shippingCostEUR['1'] * bundle.qty);
  const fees = bundle.price * E.paymentFeePct + E.paymentFeeFixedEUR;
  const contribution = net - cogs - fees;
  return { net: round2(net), cogs: round2(cogs), fees: round2(fees), contribution: round2(contribution), breakevenCPA: round2(contribution) };
}

function aggregate(sessions) {
  const a = { orders: 0, units: 0, gross: 0, net: 0, contribution: 0, refunds: 0, byPack: {}, byColor: {}, status: {} };
  for (const s of sessions) {
    const m = s.payment_intent.metadata || {};
    const b = cfg.bundles.find(x => x.id === m.pack); if (!b) continue;
    const ue = unitEconomics(b);
    a.orders++; a.units += b.qty; a.gross += s.amount_total / 100; a.net += ue.net; a.contribution += ue.contribution;
    const ch = s.payment_intent.latest_charge; if (ch?.amount_refunded) a.refunds += ch.amount_refunded / 100;
    a.byPack[b.label] = (a.byPack[b.label] || 0) + 1;
    a.byColor[m.color] = (a.byColor[m.color] || 0) + 1;
    const st = m.fulfillment_status || 'pendiente'; a.status[st] = (a.status[st] || 0) + 1;
  }
  return a;
}

export async function run() {
  const all = await paidSessions(7);
  const since24 = Date.now() / 1000 - 86400;
  const d1 = aggregate(all.filter(s => s.created >= since24)), d7 = aggregate(all);
  const aov = d => d.orders ? money(d.gross / d.orders) : '—';
  const be = cfg.bundles.map(b => `  ${b.label}: margen ${money(unitEconomics(b).contribution)} → CPA máximo rentable ${money(unitEconomics(b).breakevenCPA)}`).join('\n');
  const text = `ÚLTIMAS 24 H
  Pedidos: ${d1.orders} · Unidades: ${d1.units} · Ventas: ${money(d1.gross)} · Ticket medio: ${aov(d1)}
  Margen de contribución estimado (antes de ads): ${money(d1.contribution)}
  → Puedes gastar hasta ${money(d1.contribution)} en ads hoy sin perder dinero.

ÚLTIMOS 7 DÍAS
  Pedidos: ${d7.orders} · Ventas: ${money(d7.gross)} · Ticket medio: ${aov(d7)} · Reembolsos: ${money(d7.refunds)}
  Margen de contribución estimado: ${money(d7.contribution)}
  Mix de packs: ${Object.entries(d7.byPack).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
  Colores: ${Object.entries(d7.byColor).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
  Fulfilment: ${Object.entries(d7.status).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}

ECONOMÍA UNITARIA (config)
${be}`;
  await notifyOps(`Informe diario · ${d1.orders} pedidos · ${money(d1.gross)}`, text);
  // En repos públicos el resumen de Actions es visible: solo publicamos el detalle si el repo es privado
  summary(isPrivateRepo() ? '```\n' + text + '\n```' : `Informe generado${process.env.OPS_EMAIL ? ' y enviado por email' : ' (configura OPS_EMAIL + Resend para recibirlo)'}. Detalle oculto porque el repositorio es público.`);
  return { d1, d7, text };
}

if (import.meta.url === `file://${process.argv[1]}`) run().catch(e => { console.error(e.message); process.exit(1); });
