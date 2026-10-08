import type { ProfileConfig } from '../types.ts';
import { truncate } from '../util/escape.ts';
import { DARK, f, motion, panel, svgDoc, text } from './svg.ts';

const t = DARK;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Focus areas as a terminal session. The window is decorative and labelled illustrative; its content is real:
 * the configured identity and focus list, plus the names of the most recently pushed public repositories.
 */
export function renderTerminal(config: ProfileConfig, recent: string[] = []): string {
  const W = 1200;
  const focus = config.focus.slice(0, 9);
  const cols = 3;
  const rows = Math.max(1, Math.ceil(focus.length / cols));
  const p = config.profile;

  let y = 96;
  let body = '';
  const prompt = (cmd: string) => {
    body +=
      text(36, y, '$', { size: 19, mono: true, fill: t.accentHi, weight: 700 }) +
      text(60, y, cmd, { size: 19, mono: true, fill: t.text });
    y += 32;
  };

  prompt('whoami');
  body += text(
    36,
    y,
    [slug(p.display_name), p.location ? slug(p.location) : ''].filter(Boolean).join('  ·  '),
    { size: 19, mono: true, fill: t.muted },
  );
  y += 50;

  prompt('cat focus.txt');
  const colW = 372;
  focus.forEach((item, i) => {
    const cx = 36 + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 34;
    body +=
      text(cx, cy, `[${String(i + 1).padStart(2, '0')}]`, { size: 18, mono: true, fill: t.cool }) +
      text(cx + 56, cy, truncate(item, 28), { size: 19, mono: true, fill: t.text });
  });
  y += (rows - 1) * 34 + 50;

  if (recent.length > 0) {
    prompt('ls -t projects | head -3');
    let rx = 36;
    for (const r of recent.slice(0, 3)) {
      const name = truncate(r, 24);
      body += text(rx, y, name, { size: 19, mono: true, fill: t.accent });
      rx += name.length * 11.4 + 34; // SVG collapses runs of spaces, so each name is positioned explicitly
    }
    y += 50;
  }

  body += text(36, y, '$', { size: 19, mono: true, fill: t.accentHi, weight: 700 });
  body += `<rect class="cur" x="62" y="${f(y - 16)}" width="11" height="21" fill="${t.accentHi}"/>`;
  const H = y + 40;

  const chrome =
    [0, 1, 2]
      .map(
        (i) =>
          `<circle cx="${34 + i * 22}" cy="30" r="6.5" fill="${i === 0 ? '#c46a4a' : i === 1 ? t.accent : '#8fb08a'}" fill-opacity=".85"/>`,
      )
      .join('') +
    text(W - 32, 36, `${p.username}@profile: ~ — illustrative`, {
      size: 14,
      mono: true,
      fill: t.muted,
      anchor: 'end',
    }) +
    `<line x1="0" y1="54" x2="${W}" y2="54" stroke="${t.border}"/>`;

  const defs =
    `<defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" fill-opacity=".022"/></pattern>` +
    `<radialGradient id="tg" cx="88%" cy="0%" r="70%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".12"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>`;

  const art =
    motion('.cur{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}') +
    defs +
    panel(W, H, t) +
    `<rect width="${W}" height="${H}" rx="16" fill="url(#tg)"/><rect width="${W}" height="${H}" rx="16" fill="url(#scan)"/>` +
    chrome +
    body;
  return svgDoc(W, H, art, 'Focus areas (decorative terminal)', focus.join(', '));
}
