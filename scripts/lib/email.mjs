// Emails transaccionales vía Resend (opcional: si no hay RESEND_API_KEY no se envía nada)
import { loadConfig, siteUrl } from './config.mjs';
import { DRY } from './util.mjs';

export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!emailEnabled()) return { skipped: true };
  if (DRY) { console.log(`[dry-run] email "${subject}"`); return { dry: true }; }
  const r = await fetch(process.env.RESEND_API_BASE || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, reply_to: replyTo || loadConfig().brand.supportEmail })
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function layout(title, inner) {
  const cfg = loadConfig(), url = siteUrl(cfg);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F0E8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1C1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#FBF8F3;border:1px solid #E2D9CC;border-radius:18px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 8px;font:600 22px Georgia,serif">${esc(cfg.brand.name)}</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.6">
<h1 style="font:400 28px/1.15 Georgia,serif;margin:8px 0 16px">${title}</h1>${inner}
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #E2D9CC;font-size:12px;color:#8F877C">¿Dudas? Responde a este email o escribe a ${esc(cfg.brand.supportEmail)} · <a href="${url}" style="color:#8F877C">${url.replace('https://', '')}</a></td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href, label) => `<p style="margin:24px 0"><a href="${href}" style="background:#B4512F;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;display:inline-block">${label}</a></p>`;

export function shippedEmail({ name, trackNumber, trackingUrl }) {
  const first = esc(String(name || '').split(' ')[0]);
  const url = trackingUrl || `https://t.17track.net/es#nums=${encodeURIComponent(trackNumber)}`;
  return {
    subject: '¡Tu pedido ya está en camino! 📦',
    html: layout(`¡Ya va de camino${first ? ', ' + first : ''}!`, `<p>Tu Lisso ha salido de nuestro almacén. Puedes seguirlo con este número:</p>
<p style="font:600 18px monospace;background:#fff;border:1px solid #E2D9CC;border-radius:10px;padding:12px 16px;display:inline-block">${esc(trackNumber)}</p>
${btn(url, 'Seguir mi pedido')}
<p style="color:#6B645B">El seguimiento puede tardar unas horas en actualizarse. Consejo: para el mejor resultado, estira la prenda sobre una superficie plana y pasa el Lisso en círculos suaves, sin presionar.</p>`)
  };
}
export function deliveredEmail({ name, formUrl }) {
  const first = esc(String(name || '').split(' ')[0]);
  return {
    subject: '¿Qué tal con tu Lisso?',
    html: layout(`${first ? first + ', ¿' : '¿'}qué tal ha ido?`, `<p>Tu pedido figura como entregado. Esperamos que tus jerséis ya luzcan como nuevos.</p>
${formUrl ? `<p>¿Nos dejas tu opinión? Son 30 segundos y nos ayuda muchísimo.</p>${btn(formUrl, 'Dejar mi opinión')}` : ''}
<p style="color:#6B645B">Si algo no ha ido bien, responde a este email y lo solucionamos. Tienes 30 días para probarlo.</p>`)
  };
}
export function opsEmail(subject, md) {
  return { subject: `[Lisso ops] ${subject}`, html: layout(esc(subject), `<pre style="white-space:pre-wrap;font:13px/1.5 ui-monospace,Menlo,monospace">${esc(md)}</pre>`) };
}
export async function notifyOps(subject, text) {
  if (!process.env.OPS_EMAIL) return;
  try { await sendEmail({ to: process.env.OPS_EMAIL, ...opsEmail(subject, text) }); } catch (e) { console.log('Aviso ops no enviado:', e.message); }
}
