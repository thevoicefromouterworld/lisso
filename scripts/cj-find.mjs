// Busca el producto en CJ (almacenes UE) o muestra las variantes de un pid para rellenar store.config.json
// Uso: node scripts/cj-find.mjs "lint remover"   |   node scripts/cj-find.mjs --pid <PID>
import { searchProducts, productDetail, productInventory, freight } from './lib/cj.mjs';
import { requireEnv, summary } from './lib/util.mjs';
requireEnv('CJ_API_KEY');
const args = process.argv.slice(2);
const USD_EUR = Number(process.env.USD_EUR || 0.92);
const num = v => { const m = String(v ?? '').match(/\d+(\.\d+)?/g); return m ? m.map(Number) : [NaN]; };
const eur = usd => { const n = num(usd); return n.length > 1 ? `${(n[0] * USD_EUR).toFixed(2)}–${(n[n.length - 1] * USD_EUR).toFixed(2)} €` : (n[0] * USD_EUR).toFixed(2) + ' €'; };

if (args[0] === '--pid') {
 for (const pid of args[1].split(/[;, ]+/).filter(Boolean)) {
  const p = await productDetail(pid);
  const inv = await productInventory(pid).catch(() => ({}));
  let md = `### ${p.productNameEn || p.productName}\npid: \`${p.pid}\`\n\n| vid | SKU | Variante | Coste | Stock por país |\n|---|---|---|---|---|\n`;
  for (const v of p.variants || []) md += `| \`${v.vid}\` | ${v.variantSku} | ${v.variantNameEn || v.variantKey || ''} | ${eur(v.variantSellPrice)} | ${Object.entries(inv[v.vid] || {}).map(([c, n]) => `${c}:${n}`).join(' ')} |\n`;
  const first = (p.variants || [])[0];
  if (first) for (const from of ['ES', 'DE', 'FR', 'PL', 'CN']) {
    for (const q of [1, 2, 3]) { try { const o = await freight(from, 'ES', [{ vid: first.vid, quantity: q }]); if (o?.length) md += `\n**Envío ${from}→ES ×${q}**: ${o.slice(0, 3).map(x => `${x.logisticName} ${eur(x.totalPostageFee ?? x.logisticPrice)} (${x.logisticAging} d)`).join(' · ')}`; } catch {} }
  }
  summary(md);
 }
} else if (args[0]?.startsWith('@')) {
  // Catálogo con stock en un país: "@ES" o "@ES:keyword"
  const [ccs, kw] = args[0].slice(1).split(':');
 let all = '';
 for (const cc of ccs.split(',')) {
  let md = `### Catálogo CJ con stock en ${cc}${kw ? ` · "${kw}"` : ''}\n| pid | Producto | Coste | Stock | Categoría |\n|---|---|---|---|---|\n`;
  for (let page = 1; page <= 3; page++) {
    const d = await searchProducts(kw || '*', cc, 100, page);
    const list = d?.content?.[0]?.productList || [];
    if (page === 1) md = md.replace('\n|', ` (${d?.totalRecords ?? 0} productos)\n|`);
    md += list.map(p => `| \`${p.id}\` | ${(p.nameEn || '').slice(0, 80)} | ${eur(p.sellPrice || p.nowPrice || 0)} | ${p.warehouseInventoryNum ?? ''} | ${p.threeCategoryName || p.twoCategoryName || ''} |`).join('\n') + '\n';
    if (list.length < 100) break;
  }
  all += md + '\n';
 }
  summary(all);
} else {
  let md = '';
 for (const kw of (args[0] || 'lint remover').split(';').map(x => x.trim()).filter(Boolean)) {
  md += `### Resultados CJ para "${kw}"\n`;
  for (const cc of ['ES', 'DE', 'FR', 'PL', 'CN']) {
    try {
      const d = await searchProducts(kw, cc, 15);
      const list = d?.content?.[0]?.productList || d?.list || d?.productList || [];
      md += `\n#### Almacén ${cc} (${d?.totalRecords ?? 0} resultados)\n| pid | Producto | Coste | Stock |\n|---|---|---|---|\n` + list.map(p => `| \`${p.id || p.pid}\` | ${(p.nameEn || p.productNameEn || '').slice(0, 70)} | ${eur(p.sellPrice || p.nowPrice || 0)} | ${p.warehouseInventoryNum ?? p.totalVerifiedInventory ?? ''} |`).join('\n') + '\n';
    } catch (e) { md += `\n${cc}: ${e.message}\n`; }
  }
  }
  md += '\nSiguiente paso: ejecuta el workflow con `--pid <pid>` para ver los vid de cada color.';
  summary(md);
}
