import type { ContributionCalendar } from '../types.ts';
import { DARK, f, label, panel, shade, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;
const TOP = ['#1b2027', '#5b3a22', '#8f5a30', '#c17a3e', '#f0a65a'];
// Projection basis: i = week (right, slightly down), j = weekday (down-left), h = height (up).
const AI = [16, 3.6] as const;
const AJ = [-9, 14] as const;
const H_MAX = 95;
const GAP = 0.1;

export function renderTerrain(cal: ContributionCalendar | null): string {
  const W = 1200;
  const H = 500;
  if (!cal || cal.weeks.length === 0) return unavailable(W, H, t, 'Contribution terrain', 'Contribution data unavailable — it appears after the next successful update.');

  const max = Math.max(0, ...cal.weeks.flat().map((d) => d.count));
  const height = (count: number) => (count === 0 || max === 0 ? 1.5 : 6 + (H_MAX - 6) * Math.sqrt(count / max));
  type Cell = { i: number; j: number; h: number; level: number };
  const cells: Cell[] = [];
  cal.weeks.forEach((week, i) => week.forEach((d, k) => cells.push({ i, j: d.weekday ?? k, h: height(d.count), level: d.level })));

  const proj = (i: number, j: number, h: number): [number, number] => [i * AI[0] + j * AJ[0], i * AI[1] + j * AJ[1] - h];
  // Fit the projected bounding box into the panel.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cells) for (const [di, dj, h] of [[0, 0, c.h], [1, 0, c.h], [0, 1, c.h], [1, 1, c.h], [0, 0, 0], [1, 1, 0], [0, 1, 0]] as const) {
    const [x, y] = proj(c.i + di, c.j + dj, h);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const padX = 50, top = 90, bottom = 60;
  const s = Math.min((W - 2 * padX) / (maxX - minX), (H - top - bottom) / (maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2 - minX * s;
  const oy = top + ((H - top - bottom) - (maxY - minY) * s) / 2 - minY * s;
  const P = (i: number, j: number, h: number) => {
    const [x, y] = proj(i, j, h);
    return `${f(x * s + ox)} ${f(y * s + oy)}`;
  };
  const poly = (pts: string[], fill: string, extra = '') => `<path d="M${pts.join('L')}Z" fill="${fill}"${extra}/>`;

  // Ground shadows first (light from the upper-left → shadow cast to the right).
  let shadows = '';
  let solids = '';
  const ordered = [...cells].sort((a, b) => a.i * AI[1] + a.j * AJ[1] - (b.i * AI[1] + b.j * AJ[1]) || a.i - b.i);
  for (const c of ordered) {
    if (c.h > 10) {
      const dx = c.h * 0.045;
      shadows += poly([P(c.i + 1 - GAP, c.j + GAP, 0), P(c.i + 1 + dx, c.j + GAP, 0), P(c.i + 1 + dx, c.j + 1 - GAP, 0), P(c.i + 1 - GAP, c.j + 1 - GAP, 0)], '#000', ' opacity=".28"');
    }
  }
  for (const c of ordered) {
    const top0 = TOP[c.level] ?? TOP[0]!;
    const a = c.i + GAP, b = c.i + 1 - GAP, d = c.j + GAP, e = c.j + 1 - GAP;
    if (c.h > 2) {
      solids += poly([P(a, e, 0), P(b, e, 0), P(b, e, c.h), P(a, e, c.h)], shade(top0, 0.72)); // face toward +j
      solids += poly([P(b, d, 0), P(b, e, 0), P(b, e, c.h), P(b, d, c.h)], shade(top0, 0.5)); // face toward +i
    }
    solids += poly([P(a, d, c.h), P(b, d, c.h), P(b, e, c.h), P(a, e, c.h)], top0, ' stroke="#000" stroke-opacity=".25" stroke-width=".6"');
  }

  let legend = text(W - 330, H - 24, 'Less', { size: 15, fill: t.muted, anchor: 'end' });
  TOP.forEach((c, k) => (legend += `<rect x="${W - 318 + k * 26}" y="${H - 38}" width="18" height="18" rx="3" fill="${c}"/>`));
  legend += text(W - 178, H - 24, 'More', { size: 15, fill: t.muted });

  const body =
    panel(W, H, t) + label(40, 52, 'Contribution terrain', t) +
    text(40, 78, `${cal.total.toLocaleString('en-US')} contributions · last 12 months · height ∝ √ daily count`, { size: 17, fill: t.muted }) +
    shadows + solids + legend;
  return svgDoc(W, H, body, 'Contribution terrain', `Isometric terrain of ${cal.total} GitHub contributions over the last 12 months.`);
}
