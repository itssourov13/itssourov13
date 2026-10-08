import type { LanguageSummary } from '../data/normalize.ts';
import { DARK, f, label, languageColor, panel, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;

/** Language galaxy: one orbit per language (planet size = share) plus a ranked legend. Colours are shared with the cards. */
export function renderLanguages(summary: LanguageSummary | null): string {
  const W = 1200;
  const H = 420;
  if (!summary)
    return unavailable(
      W,
      H,
      t,
      'Language galaxy',
      'Language data unavailable — it appears after the next successful update.',
    );
  const items = summary.items;
  const cx = 310;
  const cy = 244;
  const r0 = 58;
  const rMax = 150;
  const step = items.length > 1 ? (rMax - r0) / (items.length - 1) : 0;

  let body =
    `<defs><radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${t.accentHi}"/><stop offset="1" stop-color="${t.accent}"/></radialGradient>` +
    `<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".28"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>` +
    panel(W, H, t) +
    label(40, 52, 'Language galaxy', t);
  body += text(
    40,
    78,
    summary.basis === 'bytes'
      ? 'Share of code (bytes) across public non-fork repositories'
      : 'Primary language per public non-fork repository',
    { size: 17, fill: t.muted },
  );
  body += `<circle cx="${cx}" cy="${cy}" r="${rMax + 24}" fill="url(#halo)"/>`;
  items.forEach((it, i) => {
    const r = r0 + i * step;
    body += `<circle cx="${cx}" cy="${cy}" r="${f(r)}" fill="none" stroke="${t.border}" stroke-width="1.2" stroke-dasharray="2 5"/>`;
  });
  body += `<circle cx="${cx}" cy="${cy}" r="14" fill="url(#sun)"/><circle cx="${cx}" cy="${cy}" r="24" fill="none" stroke="${t.accent}" stroke-opacity=".45"/>`;
  items.forEach((it, i) => {
    const r = r0 + i * step;
    const angle = (i * 137.5 * Math.PI) / 180 - 0.6;
    const color = languageColor(it.name);
    const pr = 4 + Math.sqrt(it.percent) * 1.7;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    body += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 6)}" fill="${color}" fill-opacity=".14"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="${color}"/>`;
  });

  // Ranked legend.
  const x0 = 660;
  const rowH = items.length > 8 ? 27 : 30;
  items.forEach((it, i) => {
    const y = 126 + i * rowH;
    const color = languageColor(it.name);
    body += text(x0 - 22, y, String(i + 1).padStart(2, '0'), {
      size: 13,
      mono: true,
      fill: t.muted,
      anchor: 'end',
    });
    body +=
      `<circle cx="${x0 + 8}" cy="${y - 6}" r="6" fill="${color}"/>` +
      text(x0 + 26, y, it.name, { size: 19, fill: t.text });
    body += `<rect x="${x0 + 190}" y="${y - 15}" width="250" height="9" rx="4.5" fill="${t.bg2}"/><rect x="${x0 + 190}" y="${y - 15}" width="${f(Math.max(4, (it.percent / 100) * 250))}" height="9" rx="4.5" fill="${color}"/>`;
    body += text(W - 40, y, `${it.percent.toFixed(1)}%`, {
      size: 18,
      mono: true,
      fill: t.muted,
      anchor: 'end',
    });
  });
  return svgDoc(
    W,
    H,
    body,
    'Language galaxy',
    items.map((i) => `${i.name} ${i.percent.toFixed(1)}%`).join(', '),
  );
}
