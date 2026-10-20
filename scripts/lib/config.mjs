import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const CONFIG_PATH = process.env.CONFIG_PATH || path.join(ROOT, 'store.config.json');

export function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}
export function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}
export function siteUrl(cfg) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (cfg.brand.customDomain) return `https://${cfg.brand.customDomain}`;
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const [owner, name] = repo.split('/');
    return name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? `https://${name}` : `https://${owner.toLowerCase()}.github.io/${name}`;
  }
  return cfg.brand.siteUrl.replace(/\/$/, '');
}
export function bundleById(cfg, id) { return cfg.bundles.find(b => b.id === id); }
export function variantById(cfg, id) { return cfg.variants.find(v => v.id === id); }
