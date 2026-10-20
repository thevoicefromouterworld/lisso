import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupEnv, installMock, makeSession } from './mock.mjs';

const env = setupEnv();
const world = { sessions: [makeSession({ id: 'r1', pack: 'pack3', color: 'niebla' }), makeSession({ id: 'r2', pack: 'pack1' })] };
world.sessions[0].amount_total = 4495; world.sessions[1].amount_total = 2495;
installMock(world);

test('informe diario: agrega ventas y calcula margen y CPA máximo', async () => {
  const { run, unitEconomics } = await import('../scripts/report.mjs');
  const ue = unitEconomics({ price: 24.95, qty: 1 });
  assert.ok(ue.contribution > 10 && ue.contribution < 13, `margen pack1 = ${ue.contribution}`);
  const r = await run();
  assert.equal(r.d1.orders, 2);
  assert.equal(r.d1.units, 4);
  assert.equal(Math.round(r.d1.gross * 100), 6990);
  assert.ok(world.emails.some(e => /Informe diario/.test(e.subject)));
  assert.ok(!fs.readFileSync(process.env.GITHUB_STEP_SUMMARY, 'utf8').includes('69,90'), 'no publica cifras en repo público');
});

test('stock: marca colores agotados/bajos en stock.json', async () => {
  world.cjVariants = [
    { vid: 'VID-NIEBLA', variantSellPrice: 5, inventories: [{ countryCode: 'ES', totalInventory: 300 }] },
    { vid: 'VID-ARENA', variantSellPrice: 5, inventories: [{ countryCode: 'ES', totalInventory: 10 }, { countryCode: 'CN', totalInventory: 9999 }] },
    { vid: 'VID-GRAFITO', variantSellPrice: 5, inventories: [{ countryCode: 'CN', totalInventory: 500 }] }
  ];
  const { run } = await import('../scripts/stock.mjs');
  const { result } = await run();
  assert.deepEqual(result.variants.niebla, { available: true, low: false });
  assert.deepEqual(result.variants.arena, { available: true, low: true });
  assert.equal(result.variants.grafito.available, false, 'stock solo en China no cuenta');
  const real = JSON.parse(fs.readFileSync(new URL('../site/data/stock.json', import.meta.url)));
  assert.deepEqual(real.variants, {}, 'el test no toca el stock.json real');
});

test('setup Stripe: crea 9 payment links con metadatos y redirección a gracias.html', async () => {
  const created = [];
  world.stripeHandler = (u, method, opts, json) => {
    const p = u.pathname;
    if (method === 'GET') return json({ data: [], has_more: false });
    const body = Object.fromEntries(new URLSearchParams(opts.body));
    if (p === '/v1/products') return json({ id: 'prod_1' });
    if (p === '/v1/prices') return json({ id: 'price_' + body['metadata[pack]'], unit_amount: +body.unit_amount, product: 'prod_1' });
    if (p === '/v1/shipping_rates') return json({ id: 'shr_1' });
    if (p === '/v1/payment_links') { created.push(body); return json({ id: 'plink_' + created.length, url: 'https://buy.stripe.com/test_' + created.length }); }
    return json({ error: { message: 'x' } }, 400);
  };
  await import('../scripts/setup-stripe.mjs');
  assert.equal(created.length, 9);
  const l = created.find(b => b['metadata[lisso_key]'] === 'pack2:grafito');
  assert.equal(l['payment_intent_data[metadata][qty]'], '2');
  assert.equal(l['shipping_address_collection[allowed_countries][0]'], 'ES');
  assert.equal(l['after_completion[redirect][url]'], 'https://demo.github.io/lisso/gracias.html?pack=pack2&color=grafito&session_id={CHECKOUT_SESSION_ID}');
  const cfg = JSON.parse(fs.readFileSync(env.cfgPath, 'utf8'));
  assert.equal(Object.keys(cfg.paymentLinks).length, 9);
  assert.equal(cfg.stripeMode, 'test');
});
