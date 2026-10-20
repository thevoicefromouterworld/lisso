// Vigila stock y coste en CJ. Publica disponibilidad por color en site/data/stock.json (la web la lee)
// y abre alertas si hay rotura de stock o el coste sube.
import fs from 'node:fs';
import path from 'node:path';
import { productDetail } from './lib/cj.mjs';
import { loadConfig, ROOT } from './lib/config.mjs';
import { alertIssue } from './lib/github.mjs';
import { notifyOps } from './lib/email.mjs';
import { requireEnv, log, summary } from './lib/util.mjs';

requireEnv('CJ_API_KEY');
const cfg = loadConfig();
const F = cfg.fulfillment;
const OUT = path.join(ROOT, 'site/data/stock.json');
const USD_EUR = Number(process.env.USD_EUR || 0.92);

export async function run() {
  if (!F.cjProductId) { log('Sin cjProductId en store.config.json: nada que vigilar.'); return; }
  const p = await productDetail(F.cjProductId);
  const origins = new Set([F.fromCountryCode, ...(F.fallbackFromCountryCodes || [])]);
  const result = { updatedAt: new Date().toISOString(), variants: {} };
  const rows = [];
  for (const v of cfg.variants) {
    const cv = (p.variants || []).find(x => x.vid === v.cjVid);
    if (!cv) { result.variants[v.id] = { available: true, unknown: true }; rows.push(`| ${v.name} | ? | vid no encontrado |`); continue; }
    const inv = (cv.inventories || []).filter(i => origins.has(i.countryCode)).reduce((a, i) => a + Number(i.totalInventory || 0), 0);
    const costEUR = Number(cv.variantSellPrice || 0) * USD_EUR;
    result.variants[v.id] = { available: inv > 0, low: inv > 0 && inv < F.lowStockThreshold };
    rows.push(`| ${v.name} | ${inv} | ${inv === 0 ? 'AGOTADO' : inv < F.lowStockThreshold ? 'bajo' : 'ok'} |`);
    if (inv === 0) await alertIssue(`Sin stock: ${v.name}`, `El color ${v.name} no tiene stock en los almacenes ${[...origins].join(', ')}. La web lo marca como agotado automáticamente.`);
    else if (inv < F.lowStockThreshold) await alertIssue(`Stock bajo: ${v.name}`, `Quedan ${inv} unidades en almacenes UE.`);
    if (costEUR > cfg.economics.unitCostEUR * 1.15) await notifyOps(`Coste ${v.name} ha subido`, `Coste CJ ≈ ${costEUR.toFixed(2)} € vs. previsto ${cfg.economics.unitCostEUR} €. Revisa márgenes.`);
  }
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const changed = JSON.stringify(prev.variants) !== JSON.stringify(result.variants);
  if (changed) fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  summary(`### Stock (almacenes ${[...origins].join(', ')})\n\n| Color | Unidades | Estado |\n|---|---|---|\n${rows.join('\n')}\n\n${changed ? 'stock.json actualizado' : 'Sin cambios'}`);
  return { changed, result };
}

if (import.meta.url === `file://${process.argv[1]}`) run().catch(e => { console.error(e.message); process.exit(1); });
