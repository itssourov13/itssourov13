import type { ContributionCalendar, ProfileConfig, ProjectRecord } from '../types.ts';
import type { LanguageSummary, Stats } from '../data/normalize.ts';
import { buildEdges, monthlyTotals } from '../data/normalize.ts';
import { truncate } from '../util/escape.ts';
import { DARK, LANGUAGE_COLORS, f, label, panel, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Relationship graph: edges only from real shared topics / primary language. */
export function renderConstellation(projects: ProjectRecord[]): string {
  const W = 1200, H = 440;
  if (projects.length < 2) return unavailable(W, H, t, 'Project constellation', 'Relationships appear once at least two public projects exist.');
  const nodes = [...projects].sort((a, b) => (a.primaryLanguage ?? '~').localeCompare(b.primaryLanguage ?? '~') || a.name.localeCompare(b.name));
  const n = nodes.length;
  const cx = 600, cy = 250, rx = 330, ry = 132;
  const pos = nodes.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a };
  });
  const edges = buildEdges(nodes);
  let body = panel(W, H, t) + label(40, 52, 'Project constellation', t);
  body += text(40, 78, 'Links connect projects that share a topic or a primary language', { size: 17, fill: t.muted });
  for (const e of edges) {
    const A = pos[e.a]!, B = pos[e.b]!;
    const qx = (A.x + B.x) / 2 * 0.55 + cx * 0.45, qy = (A.y + B.y) / 2 * 0.55 + cy * 0.45;
    const style = e.kind === 'topic' ? `stroke="${t.accent}" stroke-opacity=".7" stroke-width="1.6"` : `stroke="${t.cool}" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray="5 6"`;
    body += `<path d="M${f(A.x)} ${f(A.y)}Q${f(qx)} ${f(qy)} ${f(B.x)} ${f(B.y)}" fill="none" ${style}/>`;
  }
  nodes.forEach((p, i) => {
    const q = pos[i]!;
    const right = q.x >= cx;
    const lx = q.x + (right ? 20 : -20);
    body += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="11" fill="${t.bg}" stroke="${t.accent}" stroke-width="2"/><circle cx="${f(q.x)}" cy="${f(q.y)}" r="4" fill="${t.accentHi}"/>`;
    body += text(lx, q.y + 2, truncate(p.name, 20), { size: 19, mono: true, fill: t.text, anchor: right ? 'start' : 'end' });
    if (p.primaryLanguage) body += text(lx, q.y + 22, p.primaryLanguage, { size: 15, fill: t.muted, anchor: right ? 'start' : 'end' });
  });
  body += `<line x1="40" y1="${H - 34}" x2="80" y2="${H - 34}" stroke="${t.accent}" stroke-width="2"/>` + text(90, H - 28, 'shared topic', { size: 15, fill: t.muted });
  body += `<line x1="220" y1="${H - 34}" x2="260" y2="${H - 34}" stroke="${t.cool}" stroke-width="2" stroke-dasharray="5 6"/>` + text(270, H - 28, 'shared language', { size: 15, fill: t.muted });
  return svgDoc(W, H, body, 'Project constellation', `${n} projects with ${edges.length} relationships.`);
}

export function renderLanguages(summary: LanguageSummary | null): string {
  const W = 1200, H = 360;
  if (!summary) return unavailable(W, H, t, 'Language galaxy', 'Language data unavailable — it appears after the next successful update.');
  const items = summary.items;
  const cx = 300, cy = 200;
  let body = panel(W, H, t) + label(40, 52, 'Language galaxy', t);
  body += text(40, 78, summary.basis === 'bytes' ? 'Share of code (bytes) across public non-fork repositories' : 'Primary language per public non-fork repository', { size: 17, fill: t.muted });
  body += `<circle cx="${cx}" cy="${cy}" r="10" fill="${t.accentHi}"/><circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="${t.accent}" opacity=".5"/>`;
  items.forEach((it, i) => {
    const r = 46 + i * 15;
    const angle = (i * 137.5 * Math.PI) / 180;
    const color = it.name === 'Other' ? '#6b7280' : LANGUAGE_COLORS[i % LANGUAGE_COLORS.length]!;
    body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-dasharray="2 5"/>`;
    body += `<circle cx="${f(cx + Math.cos(angle) * r)}" cy="${f(cy + Math.sin(angle) * r)}" r="${f(5 + Math.sqrt(it.percent) * 1.9)}" fill="${color}"/>`;
  });
  items.forEach((it, i) => {
    const y = 112 + i * 28;
    const color = it.name === 'Other' ? '#6b7280' : LANGUAGE_COLORS[i % LANGUAGE_COLORS.length]!;
    body += `<circle cx="640" cy="${y - 6}" r="6" fill="${color}"/>` + text(660, y, it.name, { size: 19, fill: t.text });
    body += `<rect x="820" y="${y - 16}" width="260" height="10" rx="5" fill="${t.bg2}"/><rect x="820" y="${y - 16}" width="${f(Math.max(4, (it.percent / 100) * 260))}" height="10" rx="5" fill="${color}"/>`;
    body += text(1160, y, `${it.percent.toFixed(1)}%`, { size: 18, mono: true, fill: t.muted, anchor: 'end' });
  });
  return svgDoc(W, H, body, 'Language galaxy', items.map((i) => `${i.name} ${i.percent.toFixed(1)}%`).join(', '));
}

export function renderPulse(cal: ContributionCalendar | null): string {
  const W = 1200, H = 280;
  if (!cal) return unavailable(W, H, t, 'Activity pulse', 'Contribution data unavailable — it appears after the next successful update.');
  const data = monthlyTotals(cal);
  const max = Math.max(1, ...data.map((d) => d.total));
  const x0 = 80, x1 = W - 80, yb = 215, yt = 105;
  const X = (i: number) => (data.length === 1 ? (x0 + x1) / 2 : x0 + (i / (data.length - 1)) * (x1 - x0));
  const Y = (v: number) => yb - (v / max) * (yb - yt);
  let body = panel(W, H, t) + label(40, 52, 'Activity pulse', t);
  body += text(40, 78, 'Contributions per month · first and last month may be partial', { size: 17, fill: t.muted });
  const pts = data.map((d, i) => `${f(X(i))} ${f(Y(d.total))}`);
  body += `<defs><linearGradient id="a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>`;
  body += `<path d="M${f(X(0))} ${yb}L${pts.join('L')}L${f(X(data.length - 1))} ${yb}Z" fill="url(#a)"/>`;
  body += `<path d="M${pts.join('L')}" fill="none" stroke="${t.accentHi}" stroke-width="2.5" stroke-linejoin="round"/>`;
  data.forEach((d, i) => {
    const m = MONTHS[Number(d.month.slice(5, 7)) - 1] ?? d.month;
    body += `<circle cx="${f(X(i))}" cy="${f(Y(d.total))}" r="4.5" fill="${t.bg}" stroke="${t.accentHi}" stroke-width="2"/>`;
    body += text(X(i), Y(d.total) - 12, String(d.total), { size: 15, mono: true, fill: t.text, anchor: 'middle' });
    body += text(X(i), yb + 26, m, { size: 15, fill: t.muted, anchor: 'middle' });
  });
  return svgDoc(W, H, body, 'Activity pulse', `Monthly contributions: ${data.map((d) => `${d.month} ${d.total}`).join(', ')}.`);
}

export function renderIntelligence(stats: Stats | null, collectedAt: string | null, fixture: boolean): string {
  const W = 1200, H = 200;
  if (!stats) return unavailable(W, H, t, 'GitHub intelligence', 'Metrics unavailable — they appear after the first successful data collection.');
  const tiles: [string, string][] = [
    ['Public repositories', String(stats.publicRepos)],
    ['Followers', String(stats.followers)],
    ['Contributions · 12 mo', stats.totalContributions === null ? '—' : stats.totalContributions.toLocaleString('en-US')],
    ['Repos pushed · 90 d', String(stats.activeRepos90d)],
    ['Stars received', String(stats.totalStars)],
  ];
  let body = panel(W, H, t) + label(40, 48, 'GitHub intelligence', t);
  const tw = (W - 80) / tiles.length;
  tiles.forEach(([k, v], i) => {
    const x = 40 + i * tw;
    if (i > 0) body += `<line x1="${f(x - 12)}" y1="76" x2="${f(x - 12)}" y2="150" stroke="${t.border}"/>`;
    body += text(x, 122, v, { size: 46, weight: 600, fill: t.text }) + text(x, 150, k, { size: 16, fill: t.muted });
  });
  const src = fixture ? 'Synthetic fixture data — preview only' : `Source: GitHub API · data last changed ${collectedAt ? collectedAt.slice(0, 10) : 'n/a'} UTC`;
  body += text(40, H - 16, src, { size: 14, mono: true, fill: t.muted });
  return svgDoc(W, H, body, 'GitHub intelligence', tiles.map(([k, v]) => `${k}: ${v}`).join('; '));
}

/** Decorative terminal. Content is the configured focus list and is labelled as illustrative. */
export function renderTerminal(config: ProfileConfig): string {
  const lines = config.focus.slice(0, 7);
  const W = 560, H = 96 + (lines.length + 1) * 30;
  let body = panel(W, H, t);
  for (let i = 0; i < 3; i++) body += `<circle cx="${28 + i * 20}" cy="26" r="6" fill="${t.border}"/>`;
  body += text(W - 24, 31, 'profile.sh — illustrative', { size: 14, mono: true, fill: t.muted, anchor: 'end' });
  body += text(28, 78, `$ cat focus.txt`, { size: 18, mono: true, fill: t.accentHi });
  lines.forEach((l, i) => (body += text(28, 112 + i * 30, `• ${truncate(l, 40)}`, { size: 18, mono: true, fill: t.text })));
  return svgDoc(W, H, body, 'Focus areas (decorative terminal)', lines.join(', '));
}

export function renderCta(title: string): string {
  const W = 460, H = 72;
  const body =
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.accent}"/>` +
    `<rect x="1" y="1" width="6" height="${H - 2}" rx="3" fill="${t.accent}"/>` +
    text(W / 2, 44, 'ENTER DIGITAL WORLD  →', { size: 20, mono: true, weight: 600, fill: t.accentHi, anchor: 'middle', spacing: 2 });
  return svgDoc(W, H, body, truncate(title, 60), 'Open the interactive 3D companion');
}
