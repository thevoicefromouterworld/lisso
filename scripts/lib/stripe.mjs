// Cliente mínimo de la API de Stripe (sin dependencias)
import { sleep } from './util.mjs';
const API = process.env.STRIPE_API_BASE || 'https://api.stripe.com';
const VERSION = '2024-06-20'; // fijada: shipping_details en la raíz de la Checkout Session

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) encode(v, key, out);
    else if (Array.isArray(v)) v.forEach((x, i) => typeof x === 'object' ? encode(x, `${key}[${i}]`, out) : out.push([`${key}[${i}]`, String(x)]));
    else out.push([key, String(v)]);
  }
  return out;
}

export async function stripe(method, path, params = {}, { idempotencyKey, retries = 3 } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada');
  const pairs = encode(params);
  const qs = new URLSearchParams(pairs).toString();
  const url = API + path + (method === 'GET' && qs ? (path.includes('?') ? '&' : '?') + qs : '');
  const headers = { Authorization: `Bearer ${key}`, 'Stripe-Version': VERSION };
  if (method !== 'GET') headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  for (let i = 0; ; i++) {
    const res = await fetch(url, { method, headers, body: method === 'GET' ? undefined : qs });
    if ((res.status === 429 || res.status >= 500) && i < retries) { await sleep(800 * 2 ** i); continue; }
    const data = await res.json();
    if (!res.ok) { const e = new Error(`Stripe ${method} ${path}: ${data?.error?.message || res.status}`); e.status = res.status; e.stripe = data?.error; throw e; }
    return data;
  }
}

export async function listAll(path, params = {}, max = 2000) {
  const out = []; let starting_after;
  while (out.length < max) {
    const page = await stripe('GET', path, { limit: 100, ...params, starting_after });
    out.push(...page.data);
    if (!page.has_more || !page.data.length) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return out;
}

/** Sesiones de checkout completadas (pagadas) de los últimos N días, con PaymentIntent y cargo expandidos */
export async function paidSessions(days = 14) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const sessions = await listAll('/v1/checkout/sessions', {
    status: 'complete', created: { gte: since },
    expand: ['data.payment_intent', 'data.payment_intent.latest_charge']
  });
  return sessions.filter(s => s.payment_status === 'paid' && s.payment_intent && typeof s.payment_intent === 'object');
}

export const shippingOf = s => s.shipping_details || s.collected_information?.shipping_details || s.shipping || null;

export async function setPIMeta(piId, metadata) {
  return stripe('POST', `/v1/payment_intents/${piId}`, { metadata });
}
