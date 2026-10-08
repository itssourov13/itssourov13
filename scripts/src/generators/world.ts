import type { ProfileConfig } from '../types.ts';
import { truncate } from '../util/escape.ts';
import { DARK, f, hashString, motion, panel, svgDoc, text } from './svg.ts';

const t = DARK;

export interface MiniGraph {
  count: number;
  edges: [number, number][];
}

/**
 * Banner that links to the external 3D world. The mini map on the right is a schematic of the same project graph
 * the world renders (node count and links are real; positions are decorative).
 */
export function renderCta(title: string, graph?: MiniGraph): string {
  const W = 1200;
  const H = 230;
  const cx = 902;
  const cy = 118;
  const n = graph ? Math.min(12, graph.count) : 8;

  const pos = Array.from({ length: n }, (_, i) => {
    const inner = i % 3 === 2;
    const a = (i / n) * Math.PI * 2 - 0.5;
    const rx = inner ? 104 : 206;
    const ry = inner ? 34 : 66;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });

  let map = '';
  for (let k = 0; k < 4; k++) {
    map += `<ellipse cx="${cx}" cy="${cy}" rx="${72 + k * 46}" ry="${f(22 + k * 15)}" fill="none" stroke="${t.border}" stroke-dasharray="2 6"/>`;
  }
  for (const [a, b] of graph?.edges ?? []) {
    if (a < n && b < n)
      map += `<line x1="${f(pos[a]!.x)}" y1="${f(pos[a]!.y)}" x2="${f(pos[b]!.x)}" y2="${f(pos[b]!.y)}" stroke="${t.accent}" stroke-opacity=".5"/>`;
  }
  pos.forEach((p, i) => {
    map += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${6 + (hashString(String(i)) % 3)}" fill="${t.bg}" stroke="${i % 2 ? t.cool : t.accentHi}" stroke-width="2"/>`;
  });
  map += `<circle class="core" cx="${cx}" cy="${cy}" r="30" fill="${t.accent}" fill-opacity=".18"/><circle cx="${cx}" cy="${cy}" r="12" fill="${t.accentHi}"/>`;

  const body =
    motion(
      '.core{transform-origin:902px 118px;animation:pulse 3.6s ease-in-out infinite}@keyframes pulse{50%{transform:scale(1.45);opacity:.35}}',
    ) +
    `<defs><radialGradient id="cg" cx="78%" cy="50%" r="50%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".16"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>` +
    panel(W, H, t) +
    `<rect width="${W}" height="${H}" rx="16" fill="url(#cg)"/>` +
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${t.accent}" stroke-opacity=".55"/>` +
    `<rect x="1" y="30" width="5" height="${H - 60}" fill="${t.accent}"/>` +
    text(48, 62, 'Interactive · WebGL · opens in a new experience', {
      size: 14,
      mono: true,
      fill: t.accent,
      spacing: 2,
    }) +
    text(48, 114, truncate(title, 34), { size: 38, weight: 700, fill: t.text }) +
    text(48, 146, 'A 3D companion built from the same GitHub data as this page.', {
      size: 18,
      fill: t.muted,
    }) +
    `<rect x="48.5" y="168.5" width="214" height="42" rx="21" fill="${t.accent}" fill-opacity=".14" stroke="${t.accentHi}"/>` +
    text(155.5, 195, 'ENTER  →', {
      size: 17,
      mono: true,
      weight: 700,
      fill: t.accentHi,
      anchor: 'middle',
      spacing: 3,
    }) +
    map;
  return svgDoc(W, H, body, truncate(title, 60), 'Open the interactive 3D companion');
}

/** Slim sign-off strip. Carries no statistics (the data stamp lives in the README text). */
export function renderFooter(config: ProfileConfig): string {
  const W = 1200;
  const H = 120;
  const p = config.profile;
  const cx = W / 2;
  let ticks = '';
  for (let i = -30; i <= 30; i++) {
    if (Math.abs(i) < 5) continue;
    const long = i % 5 === 0;
    ticks += `<line x1="${cx + i * 14}" y1="${long ? 50 : 54}" x2="${cx + i * 14}" y2="62" stroke="${long ? t.accent : t.border}" stroke-opacity="${f(Math.max(0.12, 1 - Math.abs(i) / 32))}"/>`;
  }
  const body =
    `<defs><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${t.accent}" stop-opacity=".8"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>` +
    panel(W, H, t) +
    `<rect x="60" y="61" width="${W - 120}" height="1" fill="url(#hl)"/>` +
    ticks +
    `<circle cx="${cx}" cy="56" r="26" fill="${t.bg2}" stroke="${t.accent}" stroke-width="1.6"/><circle cx="${cx}" cy="56" r="32" fill="none" stroke="${t.border}" stroke-dasharray="3 6"/>` +
    text(cx, 66, p.short_name.charAt(0).toUpperCase(), {
      size: 30,
      weight: 700,
      fill: t.accent,
      anchor: 'middle',
    }) +
    text(cx, 104, `${p.short_name} // digital security profile  ·  @${p.username}`, {
      size: 13,
      mono: true,
      fill: t.muted,
      anchor: 'middle',
      spacing: 2,
    });
  return svgDoc(W, H, body, `${p.display_name} — sign-off`, 'Decorative footer');
}
