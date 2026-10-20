// Construye /dist a partir de /site + store.config.json (sin dependencias)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, siteUrl } from './lib/config.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'site');
const OUT = path.join(ROOT, process.env.OUT_DIR || 'dist');
const cfg = loadConfig();
const url = siteUrl(cfg);
const build = Date.now().toString(36);

// Config pública: nunca publicar costes, IDs de proveedor ni ajustes internos
const publicCfg = {
  brand: { ...cfg.brand, siteUrl: url },
  variants: cfg.variants.map(({ cjVid, ...v }) => v),
  bundles: cfg.bundles,
  shipping: cfg.shipping,
  tracking: cfg.tracking,
  specs: cfg.specs,
  reviewsFormUrl: cfg.reviewsFormUrl,
  paymentLinks: cfg.paymentLinks || {}
};

const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const tpl = (s, extra = {}) => s.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
  if (k in extra) return extra[k];
  const v = get(cfg, k);
  return v == null ? m : String(v);
});

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyDir(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (['_layout', 'pages'].includes(e.name) && src === SRC) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); }
    else fs.copyFileSync(s, d);
  }
}
copyDir(SRC, OUT);

const prices = cfg.bundles.map(b => b.price);
const jsonld = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Product',
  name: cfg.brand.productName, brand: { '@type': 'Brand', name: cfg.brand.name },
  description: 'Quitapelusas eléctrico recargable por USB-C para ropa, sofás y mantas.',
  image: `${url}/assets/img/og.png`,
  offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: cfg.bundles.length, availability: 'https://schema.org/InStock', url: `${url}/` }
}).replace(/</g, '\\u003c');

// index
const index = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
fs.writeFileSync(path.join(OUT, 'index.html'), tpl(index, { siteUrl: url, build, jsonld }));

// páginas con layout
const layout = fs.readFileSync(path.join(SRC, '_layout/page.html'), 'utf8');
const pages = [];
for (const f of fs.readdirSync(path.join(SRC, 'pages'))) {
  let body = fs.readFileSync(path.join(SRC, 'pages', f), 'utf8');
  const meta = Object.fromEntries((body.match(/^<!--(.*?)-->/)?.[1] || '').split('|').map(x => x.split(':').map(y => y.trim())).filter(x => x[0]));
  body = body.replace(/^<!--.*?-->\n?/, '');
  const scripts = [...body.matchAll(/<script>[\s\S]*?<\/script>/g)].map(m => m[0]).join('\n');
  body = body.replace(/<script>[\s\S]*?<\/script>/g, '');
  const html = tpl(layout, { title: meta.title || 'Lisso', robots: meta.robots || 'index,follow', content: tpl(body), scripts, build });
  fs.writeFileSync(path.join(OUT, f), html);
  if (!(meta.robots || '').includes('noindex')) pages.push(f);
}

fs.writeFileSync(path.join(OUT, 'config.js'), `window.STORE=${JSON.stringify(publicCfg)};`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${url}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', ...pages].map(p => `  <url><loc>${url}/${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
if (cfg.brand.customDomain) fs.writeFileSync(path.join(OUT, 'CNAME'), cfg.brand.customDomain + '\n');

const missing = cfg.bundles.flatMap(b => cfg.variants.map(v => `${b.id}:${v.id}`)).filter(k => !(cfg.paymentLinks || {})[k]);
console.log(`✓ Build en ${path.relative(ROOT, OUT)} · ${url}`);
if (missing.length) console.log(`⚠ Faltan ${missing.length} payment links (ejecuta el workflow "Setup Stripe").`);
