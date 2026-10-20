import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnv, installMock, makeSession } from './mock.mjs';

const env = setupEnv();
const world = { sessions: [] };
installMock(world);
const fulfill = await import('../scripts/fulfill.mjs');
const tracking = await import('../scripts/tracking.mjs');

test('pedido pagado → pedido en CJ con vid, cantidad, dirección y logística correctas', async () => {
  world.sessions = [makeSession({ id: 'a1' })];
  const st = await fulfill.run();
  assert.equal(st.ordered, 1);
  const order = Object.values(world.cjOrders)[0];
  assert.equal(order.products[0].vid, 'VID-CLASSIC');
  assert.equal(order.products[0].quantity, 2);
  assert.equal(order.shippingProvince, 'CA');
  assert.equal(order.shippingCountry, 'United States');
  assert.equal(order.shippingZip, '94110');
  assert.equal(order.logisticName, 'UniUni+', 'la más barata dentro del plazo máximo');
  assert.equal(order.fromCountryCode, 'US');
  assert.equal(order.payType, 2);
  assert.match(order.orderNumber, /^SL-/);
  const m = world.sessions[0].payment_intent.metadata;
  assert.equal(m.fulfillment_status, 'ordered');
  assert.equal(m.cj_order_id, 'CJ1');
});

test('idempotente: una segunda ejecución no duplica el pedido', async () => {
  const st = await fulfill.run();
  assert.equal(st.ordered, 0);
  assert.equal(Object.keys(world.cjOrders).length, 1);
});

test('pedido reembolsado antes de enviar → se omite', async () => {
  world.sessions.push(makeSession({ id: 'b2', refunded: true }));
  const st = await fulfill.run();
  assert.equal(st.skipped, 1);
  assert.equal(world.sessions[1].payment_intent.metadata.fulfillment_status, 'skipped');
  assert.equal(Object.keys(world.cjOrders).length, 1);
});

test('dirección sin estado → usa la ciudad como provincia (CJ la exige)', async () => {
  world.sessions.push(makeSession({ id: 'c3', state: '' }));
  await fulfill.run();
  const o = Object.values(world.cjOrders).find(x => x.remark.includes('pi_c3'));
  assert.equal(o.shippingProvince, 'San Francisco');
});

test('error en CJ → reintenta y tras 3 intentos alerta por email', async () => {
  world.sessions.push(makeSession({ id: 'd4' }));
  world.cjFail = 'Insufficient balance';
  world.emails = [];
  for (let i = 0; i < 4; i++) await fulfill.run();
  const m = world.sessions[3].payment_intent.metadata;
  assert.equal(m.fulfillment_status, 'error');
  assert.equal(m.fulfillment_attempts, '3');
  assert.ok(world.emails.some(e => e.to[0] === 'ops@example.com' && /sin tramitar/.test(e.subject)));
  world.cjFail = null;
});

test('ejecución interrumpida (processing) → se reconcilia con CJ sin duplicar', async () => {
  const s = makeSession({ id: 'e5' });
  world.sessions.push(s);
  world.cjOrders['CJ99'] = { orderId: 'CJ99', orderNumber: 'SL-' + s.payment_intent.id.replace(/^pi_/, ''), orderStatus: 'UNSHIPPED' };
  s.payment_intent.metadata.fulfillment_status = 'processing';
  const n = Object.keys(world.cjOrders).length;
  const st = await fulfill.run();
  assert.equal(st.reconciled, 1);
  assert.equal(s.payment_intent.metadata.cj_order_id, 'CJ99');
  assert.equal(Object.keys(world.cjOrders).length, n);
});

test('tracking: CJ envía → Stripe "shipped" + email al cliente con número de seguimiento', async () => {
  world.emails = [];
  world.cjOrders.CJ1.trackNumber = 'TRK123ES';
  const st = await tracking.run();
  assert.equal(st.shipped, 1);
  const m = world.sessions[0].payment_intent.metadata;
  assert.equal(m.fulfillment_status, 'shipped');
  assert.equal(m.tracking_number, 'TRK123ES');
  const mail = world.emails.find(e => e.to[0] === 'a1@example.com');
  assert.ok(mail && mail.html.includes('TRK123ES'));
});

test('tracking: entregado → "delivered" + email pidiendo opinión', async () => {
  world.emails = []; world.trackStatus = 'Delivered';
  const st = await tracking.run();
  assert.equal(st.delivered, 1);
  assert.equal(world.sessions[0].payment_intent.metadata.fulfillment_status, 'delivered');
  assert.ok(world.emails.some(e => e.html.includes('forms.example/review')));
});

test('pago de prueba (Stripe test mode) → pedido CJ sin pagar (payType 3)', async () => {
  const s = makeSession({ id: 'f6' }); s.livemode = false;
  world.sessions.push(s);
  await fulfill.run();
  const order = Object.values(world.cjOrders).find(o => o.remark?.includes('pi_f6'));
  assert.equal(order.payType, 3);
});

test('pedido de una variante que ya no existe → se omite sin error', async () => {
  const s = makeSession({ id: 'g7', color: 'arena' });
  world.sessions.push(s);
  const st = await fulfill.run();
  assert.equal(st.errors, 0);
  assert.equal(s.payment_intent.metadata.fulfillment_status, 'skipped');
});
