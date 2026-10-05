import type { ProfileConfig } from '../types.ts';
import { f, label, panel, svgDoc, text, DARK, LIGHT } from './svg.ts';
import type { Theme } from './svg.ts';

/** Hero banner. Purely typographic/decorative: no statistics, no telemetry, no personal imagery. */
export function renderHero(config: ProfileConfig, variant: 'dark' | 'light'): string {
  const t: Theme = variant === 'dark' ? DARK : LIGHT;
  const W = 1200;
  const H = 400;
  const p = config.profile;
  const cx = 980;
  const cy = 200;

  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = 128;
    const r2 = long ? 142 : 135;
    ticks += `<line x1="${f(cx + Math.cos(a) * r1)}" y1="${f(cy + Math.sin(a) * r1)}" x2="${f(cx + Math.cos(a) * r2)}" y2="${f(cy + Math.sin(a) * r2)}" stroke="${long ? t.accent : t.border}" stroke-width="${long ? 2 : 1}"/>`;
  }
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x} ${y + dy * 28}V${y}H${x + dx * 28}" fill="none" stroke="${t.accent}" stroke-width="2"/>`;

  const art =
    `<defs><radialGradient id="glow" cx="82%" cy="50%" r="45%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".16"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${t.accent}" stop-opacity=".5"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>` +
    panel(W, H, t) +
    `<rect width="${W}" height="${H}" rx="16" fill="url(#glow)"/>` +
    corner(24, 24, 1, 1) + corner(W - 24, 24, -1, 1) + corner(24, H - 24, 1, -1) + corner(W - 24, H - 24, -1, -1) +
    `<rect x="72" y="${H - 52}" width="640" height="1" fill="url(#scan)"/>` +
    ticks +
    `<circle cx="${cx}" cy="${cy}" r="112" fill="none" stroke="${t.border}" stroke-width="1.5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${t.accent}" stroke-width="2" stroke-dasharray="6 10" opacity=".8"/>` +
    `<circle cx="${cx}" cy="${cy}" r="72" fill="${t.bg2}" stroke="${t.border}"/>` +
    `<path d="M${cx - 112} ${cy}A112 112 0 0 1 ${cx} ${cy - 112}" fill="none" stroke="${t.cool}" stroke-width="3"/>` +
    text(cx, cy + 30, p.short_name.charAt(0).toUpperCase(), { size: 84, fill: t.accent, weight: 600, anchor: 'middle' }) +
    label(72, 96, 'Digital security profile', t) +
    text(72, 190, p.display_name, { size: 66, fill: t.text, weight: 600 }) +
    text(72, 244, p.headline, { size: 26, fill: t.muted }) +
    text(72, 304, `@${p.username}${p.location ? `  ·  ${p.location}` : ''}`, { size: 20, mono: true, fill: t.text, opacity: 0.85 });

  return svgDoc(W, H, art, `${p.display_name} — digital security profile`, `${p.headline}. GitHub @${p.username}.`);
}
