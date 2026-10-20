// Mock en memoria de Stripe, CJ y Resend para probar el pipeline completo sin red
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function setupEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lisso-'));
  const cfg = JSON.parse(fs.readFileSync(new URL('../store.config.json', import.meta.url)));
  cfg.variants.forEach((v, i) => v.cjVid = `VID-${v.id.toUpperCase()}`);
  cfg.fulfillment.cjProductId = 'PID-1';
  cfg.reviewsFormUrl = 'https://forms.example/review';
  const p = path.join(dir, 'store.config.json');
  fs.writeFileSync(p, JSON.stringify(cfg));
  Object.assign(process.env, {
    CONFIG_PATH: p, STRIPE_SECRET_KEY: 'sk_test_x', CJ_API_KEY: 'cj_x', CJ_MIN_INTERVAL_MS: '0',
    RESEND_API_KEY: 're_x', EMAIL_FROM: 'Lisso <hola@lisso.shop>', OPS_EMAIL: 'ops@example.com',
    SITE_URL: 'https://demo.github.io/lisso', GITHUB_STEP_SUMMARY: path.join(dir, 'summary.md')
  });
  delete process.env.GITHUB_TOKEN;
  return { dir, cfgPath: p };
}

export function makeSession({ id, pack = 'pack2', color = 'arena', zip = '08001', state = 'B', refunded = false, created }) {
  return {
    id: 'cs_' + id, object: 'checkout.session', status: 'complete', payment_status: 'paid', amount_total: 3495,
    created: created ?? Math.floor(Date.now() / 1000) - 3600,
    customer_details: { email: `${id}@example.com`, name: 'Ana García', phone: '+34600111222' },
    shipping_details: { name: 'Ana García', address: { line1: 'Carrer Major 1', line2: '2º 1ª', city: 'Barcelona', postal_code: zip, state, country: 'ES' } },
    payment_intent: { id: 'pi_' + id + '0000000000', metadata: { pack, color, qty: '2' }, latest_charge: { id: 'ch_' + id, refunded, amount_refunded: refunded ? 3495 : 0 } }
  };
}

export function installMock(world) {
  world.calls = []; world.cjOrders = world.cjOrders || {}; world.emails = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url); const method = opts.method || 'GET';
    world.calls.push(`${method} ${u.host}${u.pathname}`);
    const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
    // ---- Stripe
    if (u.host === 'api.stripe.com') {
      if (u.pathname === '/v1/checkout/sessions') return json({ data: world.sessions, has_more: false });
      const m = u.pathname.match(/^\/v1\/payment_intents\/(.+)$/);
      if (m && method === 'POST') {
        const s = world.sessions.find(x => x.payment_intent.id === m[1]);
        for (const [k, v] of new URLSearchParams(opts.body)) {
          const key = k.match(/^metadata\[(.+)\]$/)[1];
          if (v === '') delete s.payment_intent.metadata[key]; else s.payment_intent.metadata[key] = v;
        }
        return json(s.payment_intent);
      }
      return world.stripeHandler ? world.stripeHandler(u, method, opts, json) : json({ error: { message: 'not mocked ' + u.pathname } }, 404);
    }
    // ---- CJ
    if (u.host === 'developers.cjdropshipping.com') {
      const p = u.pathname.replace('/api2.0/v1', '');
      if (p === '/authentication/getAccessToken') return json({ code: 200, result: true, data: { accessToken: 'tok' } });
      if (p === '/logistic/freightCalculate') return json({ code: 200, result: true, data: [
        { logisticName: 'Correos Express', logisticAging: '2-4', logisticPrice: 4.1 },
        { logisticName: 'CJPacket Slow', logisticAging: '8-15', logisticPrice: 2.0 },
        { logisticName: 'DHL', logisticAging: '1-3', logisticPrice: 9.9 }] });
      if (p === '/shopping/order/createOrderV2') {
        if (world.cjFail) return json({ code: 1600200, result: false, message: world.cjFail });
        const body = JSON.parse(opts.body); const orderId = 'CJ' + (Object.keys(world.cjOrders).length + 1);
        world.cjOrders[orderId] = { ...body, orderId, orderStatus: 'UNSHIPPED' };
        return json({ code: 200, result: true, data: { orderId, orderStatus: 'CREATED' } });
      }
      if (p === '/shopping/order/getOrderDetail') {
        const id = u.searchParams.get('orderId');
        const o = world.cjOrders[id] || Object.values(world.cjOrders).find(x => x.orderNumber === id);
        return o ? json({ code: 200, result: true, data: o }) : json({ code: 1600404, result: false, message: 'order not found' });
      }
      if (p === '/logistic/trackInfo') return json({ code: 200, result: true, data: [{ trackingNumber: u.searchParams.get('trackNumber'), trackingStatus: world.trackStatus || 'In transit' }] });
      if (p === '/product/query') return json({ code: 200, result: true, data: { pid: 'PID-1', variants: world.cjVariants } });
    }
    // ---- Resend
    if (u.host === 'api.resend.com') { world.emails.push(JSON.parse(opts.body)); return json({ id: 'em_' + world.emails.length }); }
    return json({ error: 'unmocked ' + url }, 500);
  };
}
