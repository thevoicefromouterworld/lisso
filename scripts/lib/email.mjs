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

export function layout(title, inner, lang = 'en') {
  const cfg = loadConfig(), url = siteUrl(cfg);
  const help = lang === 'es' ? '¿Dudas? Responde a este email o escribe a' : 'Questions? Just reply to this email or write to';
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#0B1020;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#EEF2F8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#121A2E;border:1px solid #232E48;border-radius:18px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 8px;font:600 22px Georgia,serif;color:#FFD58A">${esc(cfg.brand.name)}</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.6;color:#D5DCE8">
<h1 style="font:400 28px/1.15 Georgia,serif;margin:8px 0 16px;color:#EEF2F8">${title}</h1>${inner}
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #232E48;font-size:12px;color:#6F7B93">${help} ${esc(cfg.brand.supportEmail)} · <a href="${url}" style="color:#6F7B93">${url.replace('https://', '')}</a></td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href, label) => `<p style="margin:24px 0"><a href="${href}" style="background:#F2A65A;color:#1A1206;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;display:inline-block">${label}</a></p>`;

export function shippedEmail({ name, trackNumber, trackingUrl }) {
  const first = esc(String(name || '').split(' ')[0]);
  const url = trackingUrl || `https://t.17track.net/en#nums=${encodeURIComponent(trackNumber)}`;
  return {
    subject: 'Your Snowlit is on its way ❄️',
    html: layout(`It's on its way${first ? ', ' + first : ''}!`, `<p>Your order just left our warehouse. Here's your tracking number:</p>
<p style="font:600 18px monospace;background:#0B1020;border:1px solid #232E48;border-radius:10px;padding:12px 16px;display:inline-block;color:#EEF2F8">${esc(trackNumber)}</p>
${btn(url, 'Track my order')}
<p style="color:#97A3BA">Tracking can take a few hours to update. Tip: build it in the evening with the lights low; it's half the fun.</p>`)
  };
}
export function deliveredEmail({ name, formUrl }) {
  const first = esc(String(name || '').split(' ')[0]);
  return {
    subject: 'How did your Snowlit turn out?',
    html: layout(`${first ? first + ', how' : 'How'} did it turn out?`, `<p>Your package shows as delivered. We hope your evenings just got a little cozier.</p>
${formUrl ? `<p>Would you share a quick review? It takes 30 seconds and helps us a lot.</p>${btn(formUrl, 'Leave a review')}` : ''}
<p style="color:#97A3BA">If anything isn't right, just reply to this email and we'll fix it. You have 30 days to decide.</p>`)
  };
}
export function opsEmail(subject, md) {
  const name = loadConfig().brand.name;
  return { subject: `[${name} ops] ${subject}`, html: layout(esc(subject), `<pre style="white-space:pre-wrap;font:13px/1.5 ui-monospace,Menlo,monospace;color:#D5DCE8">${esc(md)}</pre>`, 'es') };
}
export async function notifyOps(subject, text) {
  if (!process.env.OPS_EMAIL) return;
  try { await sendEmail({ to: process.env.OPS_EMAIL, ...opsEmail(subject, text) }); } catch (e) { console.log('Aviso ops no enviado:', e.message); }
}
