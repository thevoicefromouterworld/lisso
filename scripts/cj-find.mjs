// Busca el producto en CJ (almacenes UE) o muestra las variantes de un pid para rellenar store.config.json
// Uso: node scripts/cj-find.mjs "lint remover"   |   node scripts/cj-find.mjs --pid <PID>
import { searchProducts, productDetail, freight } from './lib/cj.mjs';
import { requireEnv, summary } from './lib/util.mjs';
requireEnv('CJ_API_KEY');
const args = process.argv.slice(2);
const USD_EUR = Number(process.env.USD_EUR || 0.92);
const eur = usd => (Number(usd) * USD_EUR).toFixed(2) + ' €';

if (args[0] === '--pid') {
  const p = await productDetail(args[1]);
  let md = `### ${p.productNameEn || p.productName}\npid: \`${p.pid}\`\n\n| vid | SKU | Variante | Coste | Stock por país |\n|---|---|---|---|---|\n`;
  for (const v of p.variants || []) md += `| \`${v.vid}\` | ${v.variantSku} | ${v.variantNameEn || v.variantKey || ''} | ${eur(v.variantSellPrice)} | ${(v.inventories || []).map(i => `${i.countryCode}:${i.totalInventory}`).join(' ')} |\n`;
  const first = (p.variants || [])[0];
  if (first) for (const from of ['ES', 'DE', 'FR', 'PL', 'CN']) {
    try { const o = await freight(from, 'ES', [{ vid: first.vid, quantity: 1 }]); md += `\n**Envío ${from}→ES**: ${o.slice(0, 4).map(x => `${x.logisticName} ${eur(x.totalPostageFee ?? x.logisticPrice)} (${x.logisticAging} d)`).join(' · ')}`; } catch {}
  }
  summary(md);
} else {
  const kw = args[0] || 'lint remover electric rechargable';
  let md = `### Resultados CJ para "${kw}"\n`;
  for (const cc of ['ES', 'DE', 'FR', 'PL']) {
    try {
      const d = await searchProducts(kw, cc, 15);
      const list = d?.content?.[0]?.productList || d?.list || d?.productList || [];
      md += `\n#### Almacén ${cc}\n| pid | Producto | Coste | Stock |\n|---|---|---|---|\n` + list.map(p => `| \`${p.id || p.pid}\` | ${(p.nameEn || p.productNameEn || '').slice(0, 70)} | ${eur(p.sellPrice || p.nowPrice || 0)} | ${p.warehouseInventoryNum ?? p.totalVerifiedInventory ?? ''} |`).join('\n') + '\n';
    } catch (e) { md += `\n${cc}: ${e.message}\n`; }
  }
  md += '\nSiguiente paso: ejecuta el workflow con `--pid <pid>` para ver los vid de cada color.';
  summary(md);
}
