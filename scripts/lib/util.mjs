import fs from 'node:fs';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const env = (k, d) => (process.env[k] ?? d);
export const DRY = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');
export const money = (n, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
export const round2 = n => Math.round(n * 100) / 100;

/** Log seguro: nunca imprimir datos personales en logs (el repo es público). */
export const log = (...a) => console.log(...a);
export function summary(md) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) fs.appendFileSync(f, md + '\n');
  console.log(md);
}
/** Ref corta y no identificable de un pedido para logs/issues */
export const ref = (prefix, piId) => `${prefix}-${String(piId).replace(/^pi_/, '')}`;
export const isPrivateRepo = () => /^true$/i.test(process.env.REPO_PRIVATE || '');
/** Si faltan secretos, las tareas programadas terminan sin error (para no llenar de fallos el repo antes de configurarlo). */
export function requireEnv(...keys) {
  const miss = keys.filter(k => !process.env[k]);
  if (!miss.length) return;
  const msg = `Faltan secretos: ${miss.join(', ')}. Añádelos en Settings → Secrets and variables → Actions.`;
  if (process.env.GITHUB_EVENT_NAME === 'schedule') { console.log('⏸ ' + msg + ' Tarea omitida.'); summary('⏸ ' + msg); process.exit(0); }
  console.error(msg); process.exit(1);
}
