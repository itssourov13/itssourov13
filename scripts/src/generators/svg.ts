import { escapeXml } from '../util/escape.ts';

export interface Theme {
  bg: string;
  bg2: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHi: string;
  cool: string;
  grid: string;
}

export const DARK: Theme = {
  bg: '#0b0d10', bg2: '#11151a', panel: '#12161c', border: '#262c35', text: '#e8e6e1',
  muted: '#9098a3', accent: '#d98a4e', accentHi: '#f0a65a', cool: '#5fa8c9', grid: '#1b2028',
};
export const LIGHT: Theme = {
  bg: '#f4f1ec', bg2: '#ebe7e0', panel: '#faf8f4', border: '#d6d1c8', text: '#15181c',
  muted: '#5d646e', accent: '#a85a1c', accentHi: '#c46a22', cool: '#2b7494', grid: '#e1ddd6',
};

export const FONT_SANS = "Inter, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
export const FONT_MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

/** Number formatting with fixed precision so output is byte-stable. */
export const f = (n: number): string => String(Math.round(n * 100) / 100);

export function svgDoc(w: number, h: number, inner: string, title: string, desc: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">` +
    `<title id="t">${escapeXml(title)}</title><desc id="d">${escapeXml(desc)}</desc>${inner}</svg>\n`
  );
}

/** Panel background with subtle grid and border. Panels carry their own background so they read on light and dark pages. */
export function panel(w: number, h: number, t: Theme): string {
  return (
    `<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.grid}" stroke-width="1"/></pattern></defs>` +
    `<rect width="${w}" height="${h}" rx="16" fill="${t.bg}"/><rect width="${w}" height="${h}" rx="16" fill="url(#g)"/>` +
    `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${t.border}"/>`
  );
}

export interface TextOpts {
  size?: number;
  fill?: string;
  weight?: number | string;
  mono?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  spacing?: number;
  opacity?: number;
}
export function text(x: number, y: number, s: string, o: TextOpts = {}): string {
  const attrs = [
    `x="${f(x)}"`, `y="${f(y)}"`, `font-family="${o.mono ? FONT_MONO : FONT_SANS}"`, `font-size="${o.size ?? 18}"`,
    `fill="${o.fill ?? '#e8e6e1'}"`,
  ];
  if (o.weight) attrs.push(`font-weight="${o.weight}"`);
  if (o.anchor) attrs.push(`text-anchor="${o.anchor}"`);
  if (o.spacing) attrs.push(`letter-spacing="${o.spacing}"`);
  if (o.opacity !== undefined) attrs.push(`opacity="${o.opacity}"`);
  return `<text ${attrs.join(' ')}>${escapeXml(s)}</text>`;
}

export function label(x: number, y: number, s: string, t: Theme): string {
  return text(x, y, s.toUpperCase(), { size: 15, mono: true, fill: t.accent, spacing: 3 });
}

function parseHex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Multiply brightness (k<1 darkens). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * k, g * k, b * k);
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Greedy word wrap into at most `maxLines` lines of ~`maxChars`; last line ellipsized if truncated. */
export function wrapText(input: string, maxChars: number, maxLines: number): string[] {
  const words = input.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < words.length; i++) {
    const w = words[i]!.length > maxChars ? `${words[i]!.slice(0, maxChars - 1)}…` : words[i]!;
    if ((cur + ' ' + w).trim().length <= maxChars) cur = (cur + ' ' + w).trim();
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) {
    lines.push(cur);
    i = words.length;
  }
  if (i < words.length && lines.length > 0) {
    const last = lines[maxLines - 1] ?? lines[lines.length - 1]!;
    lines[lines.length - 1] = last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines.slice(0, maxLines);
}

export function unavailable(w: number, h: number, t: Theme, title: string, message: string): string {
  return svgDoc(
    w, h,
    panel(w, h, t) + label(40, 52, title, t) + text(40, h / 2 + 8, message, { size: 20, fill: t.muted }),
    `${title} (unavailable)`, message,
  );
}

export const LANGUAGE_COLORS = ['#e8a15c', '#5fa8c9', '#8fb08a', '#d9c7a0', '#a98bb5', '#7a8aa0', '#c46a4a', '#4f9d9a'];
