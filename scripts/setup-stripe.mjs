// Crea/actualiza en Stripe: producto, precios por pack, envío gratis y 9 Payment Links (pack × color).
// Idempotente: se puede ejecutar tantas veces como quieras (p. ej. tras cambiar precios).
import { stripe, listAll } from './lib/stripe.mjs';
import { loadConfig, saveConfig, siteUrl } from './lib/config.mjs';
import { requireEnv, log, summary, DRY } from './lib/util.mjs';

requireEnv('STRIPE_SECRET_KEY');
const cfg = loadConfig();
const url = siteUrl(cfg);
const live = process.env.STRIPE_SECRET_KEY.startsWith('sk_live') || process.env.STRIPE_SECRET_KEY.startsWith('rk_live');
log(`Modo Stripe: ${live ? 'LIVE' : 'TEST'} · web: ${url}`);

// 1) Producto
const products = await listAll('/v1/products', { active: true });
let product = products.find(p => p.metadata?.lisso === 'product');
const productParams = { name: cfg.brand.productName, description: 'Quitapelusas eléctrico recargable por USB-C.', metadata: { lisso: 'product' }, images: [`${url}/assets/img/og.png`] };
product = product
  ? await stripe('POST', `/v1/products/${product.id}`, { name: productParams.name, description: productParams.description })
  : await stripe('POST', '/v1/products', productParams);
log(`Producto: ${product.id}`);

// 2) Precios (uno por pack, IVA incluido)
const prices = {};
for (const b of cfg.bundles) {
  const lookup = `lisso_${b.id}`;
  const amount = Math.round(b.price * 100);
  const found = (await stripe('GET', '/v1/prices', { lookup_keys: [lookup], active: true })).data[0];
  if (found && found.unit_amount === amount && found.product === product.id) { prices[b.id] = found; continue; }
  prices[b.id] = await stripe('POST', '/v1/prices', {
    product: product.id, currency: 'eur', unit_amount: amount, tax_behavior: 'inclusive',
    nickname: b.label, lookup_key: lookup, transfer_lookup_key: true, metadata: { pack: b.id, qty: b.qty }
  });
  log(`Precio ${b.id}: ${b.price} € (${prices[b.id].id})`);
}

// 3) Tarifa de envío gratuita
const rates = await listAll('/v1/shipping_rates', { active: true });
let rate = rates.find(r => r.metadata?.lisso === 'free');
if (!rate) rate = await stripe('POST', '/v1/shipping_rates', {
  display_name: cfg.shipping.label, type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'eur' }, tax_behavior: 'inclusive',
  delivery_estimate: { minimum: { unit: 'business_day', value: cfg.shipping.minDays }, maximum: { unit: 'business_day', value: cfg.shipping.maxDays } },
  metadata: { lisso: 'free' }
});

// 4) Payment Links (uno por pack × color)
const links = await listAll('/v1/payment_links', { active: true });
const out = {}, ids = {};
for (const b of cfg.bundles) for (const v of cfg.variants) {
  const key = `${b.id}:${v.id}`;
  const redirect = `${url}/gracias.html?pack=${b.id}&color=${v.id}&session_id={CHECKOUT_SESSION_ID}`;
  const meta = { lisso_key: key, pack: b.id, color: v.id, qty: String(b.qty) };
  const existing = links.find(l => l.metadata?.lisso_key === key);
  const fresh = existing && existing.metadata?.price_id === prices[b.id].id && existing.after_completion?.redirect?.url === redirect;
  if (fresh) { out[key] = existing.url; ids[key] = existing.id; continue; }
  if (DRY) { log(`[dry-run] crearía link ${key}`); continue; }
  if (existing) await stripe('POST', `/v1/payment_links/${existing.id}`, { active: false });
  const link = await stripe('POST', '/v1/payment_links', {
    line_items: [{ price: prices[b.id].id, quantity: 1 }],
    after_completion: { type: 'redirect', redirect: { url: redirect } },
    shipping_address_collection: { allowed_countries: cfg.shipping.countries },
    shipping_options: [{ shipping_rate: rate.id }],
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_creation: 'if_required',
    submit_type: 'pay',
    custom_text: { submit: { message: `Envío gratis · ${cfg.shipping.returnDays} días para probarlo · Color: ${v.name}` } },
    metadata: { ...meta, price_id: prices[b.id].id },
    payment_intent_data: { metadata: meta, description: `${cfg.brand.productName} · ${b.label} · ${v.name}` }
  });
  out[key] = link.url; ids[key] = link.id;
  log(`Link ${key}: creado`);
}

if (!DRY) {
  cfg.paymentLinks = out;
  cfg.paymentLinkIds = ids;
  cfg.stripeMode = live ? 'live' : 'test';
  saveConfig(cfg);
}
summary(`### Stripe configurado (${live ? 'LIVE' : 'TEST'})\n\n| Pack | Color | Link |\n|---|---|---|\n` +
  Object.entries(out).map(([k, u]) => `| ${k.split(':')[0]} | ${k.split(':')[1]} | ${u} |`).join('\n'));
