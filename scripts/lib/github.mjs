// Alertas como GitHub Issues (sin datos personales: el repo es público)
const API = 'https://api.github.com';
export async function alertIssue(title, body, labels = ['alerta']) {
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) { console.log(`[alerta] ${title}\n${body}`); return; }
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lisso-ops' };
  try {
    const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`);
    const s = await (await fetch(`${API}/search/issues?q=${q}`, { headers: h })).json();
    if (s.total_count > 0) return;
    await fetch(`${API}/repos/${repo}/issues`, { method: 'POST', headers: h, body: JSON.stringify({ title, body, labels }) });
  } catch (e) { console.log('No se pudo crear la issue:', e.message); }
}
