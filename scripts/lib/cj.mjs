// Cliente de la API de CJ Dropshipping v2 (QPS = 1)
import { sleep } from './util.mjs';
const BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
let token = process.env.CJ_ACCESS_TOKEN || null;
let last = 0;

async function throttle() {
  const wait = Number(process.env.CJ_MIN_INTERVAL_MS ?? 1100) - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
}

export async function getToken() {
  if (token) return token;
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error('CJ_API_KEY no configurada');
  await throttle();
  const r = await fetch(`${BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }) });
  const d = await r.json();
  if (!d.result || !d.data?.accessToken) throw new Error(`CJ auth: ${d.message || r.status}`);
  token = d.data.accessToken;
  return token;
}

export async function cj(method, path, { query, body } = {}, retries = 2) {
  const t = await getToken();
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).flatMap(([k, v]) => Array.isArray(v) ? v.map(x => [k, x]) : [[k, v]])).toString() : '';
  for (let i = 0; ; i++) {
    await throttle();
    const r = await fetch(BASE + path + qs, { method, headers: { 'CJ-Access-Token': t, 'Content-Type': 'application/json', platformToken: '' }, body: body ? JSON.stringify(body) : undefined });
    let d; try { d = await r.json(); } catch { d = { result: false, message: `HTTP ${r.status}` }; }
    if ((r.status === 429 || r.status >= 500) && i < retries) { await sleep(2000 * (i + 1)); continue; }
    if (!d.result && d.code !== 200) { const e = new Error(`CJ ${path}: ${d.message || r.status} (code ${d.code})`); e.cj = d; throw e; }
    return d.data;
  }
}

export const freight = (from, to, products) => cj('POST', '/logistic/freightCalculate', { body: { startCountryCode: from, endCountryCode: to, products } });
export const createOrder = body => cj('POST', '/shopping/order/createOrderV2', { body });
export const orderDetail = orderId => cj('GET', '/shopping/order/getOrderDetail', { query: { orderId } });
export const trackInfo = nums => cj('GET', '/logistic/trackInfo', { query: { trackNumber: nums } });
export const productDetail = pid => cj('GET', '/product/query', { query: { pid } });
export const searchProducts = (keyWord, countryCode, size = 20) => cj('GET', '/product/listV2', { query: { keyWord, countryCode, page: 1, size } });

/** Elige la logística: la más barata dentro del plazo máximo; si ninguna cumple, la más rápida */
export function pickLogistic(options, maxDays) {
  const parsed = (options || []).map(o => ({ ...o, days: Math.max(...String(o.logisticAging || '99').split('-').map(Number).filter(n => !isNaN(n))), price: Number(o.totalPostageFee ?? o.logisticPrice ?? 999) }));
  const ok = parsed.filter(o => o.days <= maxDays).sort((a, b) => a.price - b.price);
  if (ok.length) return ok[0];
  return parsed.sort((a, b) => a.days - b.days || a.price - b.price)[0] || null;
}
