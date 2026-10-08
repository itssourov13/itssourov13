import type { ProfileConfig } from '../types.ts';
import { DARK, LIGHT, f, label, motion, panel, svgDoc, text } from './svg.ts';
import type { Theme } from './svg.ts';

/**
 * Hero banner. Typographic and decorative only: no statistics, no telemetry, no personal imagery.
 * Motion (reticle sweep, orbiting nodes, scan beam, cursor) is CSS-only and disabled for reduced-motion visitors.
 */
export function renderHero(config: ProfileConfig, variant: 'dark' | 'light'): string {
  const t: Theme = variant === 'dark' ? DARK : LIGHT;
  const W = 1200;
  const H = 440;
  const p = config.profile;
  const cx = 972;
  const cy = 206;

  // Perspective floor: lines converge on a vanishing point behind the reticle and fade out toward the text.
  const vx = cx;
  const vy = 318;
  let floor = '';
  for (let i = -14; i <= 14; i++)
    floor += `<line x1="${vx}" y1="${vy}" x2="${f(vx + i * 150)}" y2="${H}" stroke="${t.accent}" stroke-opacity=".5" stroke-width="1"/>`;
  for (let k = 1; k <= 7; k++) {
    const y = vy + (H - vy) * Math.pow(k / 7, 1.9);
    floor += `<line x1="0" y1="${f(y)}" x2="${W}" y2="${f(y)}" stroke="${t.accent}" stroke-opacity=".45" stroke-width="1"/>`;
  }

  let ticks = '';
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const long = i % 9 === 0;
    const r1 = 134;
    const r2 = long ? 150 : 141;
    ticks += `<line x1="${f(cx + Math.cos(a) * r1)}" y1="${f(cy + Math.sin(a) * r1)}" x2="${f(cx + Math.cos(a) * r2)}" y2="${f(cy + Math.sin(a) * r2)}" stroke="${long ? t.accent : t.border}" stroke-width="${long ? 2 : 1}"/>`;
  }
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x} ${y + dy * 28}V${y}H${x + dx * 28}" fill="none" stroke="${t.accent}" stroke-width="2"/>`;

  // Headline "A · B · C" becomes outlined chips; width is estimated (system fonts differ), so the chip padding is generous.
  const parts = p.headline
    .split(/\s*[·|•]\s*/)
    .filter(Boolean)
    .slice(0, 4);
  let chips = '';
  let chipX = 72;
  for (const part of parts) {
    const w = Math.round(part.length * 11.4 + 46);
    chips += `<rect x="${chipX + 0.5}" y="238.5" width="${w}" height="40" rx="20" fill="${t.bg2}" fill-opacity=".7" stroke="${t.border}"/>`;
    chips += `<circle cx="${chipX + 20}" cy="258.5" r="3.5" fill="${t.accent}"/>`;
    chips += text(chipX + 34, 265, part, { size: 19, fill: t.text, opacity: 0.92 });
    chipX += w + 12;
  }

  const nameSize = Math.min(68, Math.floor(690 / (Math.max(8, p.display_name.length) * 0.65)));
  const handle = `@${p.username}`;
  const where = p.location ? `·  ${p.location}` : '';
  const eyebrow = `${p.short_name} // digital security profile`;

  let ruler = '';
  for (let i = 0; i <= 52; i++) {
    const long = i % 4 === 0;
    ruler += `<line x1="${72 + i * 12}" y1="${H - 62}" x2="${72 + i * 12}" y2="${H - (long ? 48 : 54)}" stroke="${long ? t.accent : t.border}" stroke-opacity="${long ? 0.9 : 0.8}"/>`;
  }

  const css =
    `.spin{transform-origin:${cx}px ${cy}px;animation:spin 48s linear infinite}` +
    `.spin2{transform-origin:${cx}px ${cy}px;animation:spin 30s linear infinite reverse}` +
    `.sweep{transform-origin:${cx}px ${cy}px;animation:spin 9s linear infinite}` +
    `.beam{animation:beam 7s ease-in-out infinite}` +
    `.cur{animation:blink 1.1s steps(1) infinite}` +
    `@keyframes spin{to{transform:rotate(360deg)}}` +
    `@keyframes beam{0%{transform:translateX(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateX(470px);opacity:0}}` +
    `@keyframes blink{50%{opacity:0}}`;

  const defs =
    `<defs>` +
    `<radialGradient id="glow" cx="${f((cx / W) * 100)}%" cy="${f((cy / H) * 100)}%" r="46%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".2"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="beamg" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${t.accentHi}" stop-opacity=".9"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="fade" x1="0" x2="1"><stop offset=".3" stop-color="#000"/><stop offset=".72" stop-color="#fff"/></linearGradient>` +
    `<mask id="floorMask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>` +
    `<linearGradient id="sw" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${t.cool}" stop-opacity="0"/><stop offset="1" stop-color="${t.cool}" stop-opacity=".42"/></linearGradient>` +
    `<clipPath id="card"><rect width="${W}" height="${H}" rx="16"/></clipPath>` +
    `</defs>`;

  // Radar wedge: a ~50° sector from the centre, rotated by CSS.
  const wedge = `<path d="M${cx} ${cy}L${cx + 118} ${cy}A118 118 0 0 0 ${f(cx + 118 * Math.cos(-0.87))} ${f(cy + 118 * Math.sin(-0.87))}Z" fill="url(#sw)"/>`;

  const art =
    motion(css) +
    defs +
    panel(W, H, t) +
    `<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="url(#glow)"/><g mask="url(#floorMask)">${floor}</g></g>` +
    corner(24, 24, 1, 1) +
    corner(W - 24, 24, -1, 1) +
    corner(24, H - 24, 1, -1) +
    corner(W - 24, H - 24, -1, -1) +
    ruler +
    `<g clip-path="url(#card)"><rect class="beam" x="72" y="${H - 63}" width="190" height="2" fill="url(#beamg)"/></g>` +
    ticks +
    `<circle cx="${cx}" cy="${cy}" r="120" fill="none" stroke="${t.border}" stroke-width="1.5"/>` +
    `<g class="spin"><circle cx="${cx}" cy="${cy}" r="104" fill="none" stroke="${t.accent}" stroke-width="2" stroke-dasharray="7 11" opacity=".85"/></g>` +
    `<g class="sweep">${wedge}</g>` +
    `<g class="spin2"><circle cx="${cx + 120}" cy="${cy}" r="5" fill="${t.cool}"/><circle cx="${cx - 84}" cy="${f(cy - 86)}" r="3.5" fill="${t.accentHi}"/><circle cx="${cx - 36}" cy="${f(cy + 114)}" r="3" fill="${t.accent}"/></g>` +
    `<circle cx="${cx}" cy="${cy}" r="76" fill="${t.bg2}" stroke="${t.border}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="68" fill="none" stroke="${t.accent}" stroke-opacity=".35"/>` +
    `<path d="M${cx - 120} ${cy}A120 120 0 0 1 ${cx} ${cy - 120}" fill="none" stroke="${t.cool}" stroke-width="3"/>` +
    text(cx, cy + 31, p.short_name.charAt(0).toUpperCase(), {
      size: 88,
      fill: t.accent,
      weight: 600,
      anchor: 'middle',
    }) +
    label(72, 92, eyebrow, t) +
    `<rect class="cur" x="${f(72 + eyebrow.length * 12.5 + 10)}" y="79" width="9" height="16" fill="${t.accentHi}"/>` +
    text(72, 178, p.display_name, { size: nameSize, fill: t.text, weight: 700 }) +
    `<rect x="72" y="196" width="72" height="3" rx="1.5" fill="${t.accent}"/>` +
    chips +
    text(72, 330, handle, { size: 21, mono: true, fill: t.text, opacity: 0.9 }) +
    (where
      ? text(72 + handle.length * 12.6 + 14, 330, where.trim(), {
          size: 21,
          mono: true,
          fill: t.muted,
        })
      : '');

  return svgDoc(
    W,
    H,
    art,
    `${p.display_name} — digital security profile`,
    `${p.headline}. GitHub @${p.username}.`,
  );
}
