import type { ContributionCalendar } from '../types.ts';
import { activeCalendar, peakDay } from '../data/normalize.ts';
import { DARK, f, label, panel, shade, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;
const TOP = ['#1d232b', '#5b3a22', '#8f5a30', '#c17a3e', '#f0a65a'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Projection basis: i = week (right, slightly down), j = weekday (down-left), h = height (up).
const AI = [16, 3.6] as const;
const AJ = [-9, 14] as const;
const H_MAX = 95;
const GAP = 0.1;

const shortDate = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1] ?? iso.slice(5, 7)} ${Number(iso.slice(8, 10))}`;

export function renderTerrain(full: ContributionCalendar | null): string {
  const W = 1200;
  const H = 480;
  if (!full || full.weeks.length === 0)
    return unavailable(
      W,
      H,
      t,
      'Contribution terrain',
      'Contribution data unavailable — it appears after the next successful update.',
    );

  // Leading empty weeks (a young account) are dropped so the terrain uses the panel for real activity.
  const cal = activeCalendar(full);
  const max = Math.max(0, ...cal.weeks.flat().map((d) => d.count));
  const height = (count: number) =>
    count === 0 || max === 0 ? 1.5 : 6 + (H_MAX - 6) * Math.sqrt(count / max);
  type Cell = { i: number; j: number; h: number; level: number };
  const cells: Cell[] = [];
  cal.weeks.forEach((week, i) =>
    week.forEach((d, k) =>
      cells.push({ i, j: d.weekday ?? k, h: height(d.count), level: d.level }),
    ),
  );

  const proj = (i: number, j: number, h: number): [number, number] => [
    i * AI[0] + j * AJ[0],
    i * AI[1] + j * AJ[1] - h,
  ];
  // Fit the projected bounding box into the panel.
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const c of cells)
    for (const [di, dj, h] of [
      [0, 0, c.h],
      [1, 0, c.h],
      [0, 1, c.h],
      [1, 1, c.h],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ] as const) {
      const [x, y] = proj(c.i + di, c.j + dj, h);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  const padX = 50,
    top = 104,
    bottom = 58;
  const s = Math.min((W - 2 * padX) / (maxX - minX), (H - top - bottom) / (maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2 - minX * s;
  const oy = top + (H - top - bottom - (maxY - minY) * s) / 2 - minY * s;
  const N = (i: number, j: number, h: number): [number, number] => {
    const [x, y] = proj(i, j, h);
    return [x * s + ox, y * s + oy];
  };
  const P = (i: number, j: number, h: number) => {
    const [x, y] = N(i, j, h);
    return `${f(x)} ${f(y)}`;
  };
  const poly = (pts: string[], fill: string, extra = '') =>
    `<path d="M${pts.join('L')}Z" fill="${fill}"${extra}/>`;

  // Footprint outline of the whole grid, so the "ground" reads as a slab even where it is empty.
  const nW = cal.weeks.length;
  const slab = poly(
    [P(0, 0, 0), P(nW, 0, 0), P(nW, 7, 0), P(0, 7, 0)],
    'none',
    ` stroke="${t.border}" stroke-opacity=".9"`,
  );

  // Ground shadows first (light from the upper-left → shadow cast to the right).
  let shadows = '';
  let solids = '';
  const ordered = [...cells].sort(
    (a, b) => a.i * AI[1] + a.j * AJ[1] - (b.i * AI[1] + b.j * AJ[1]) || a.i - b.i,
  );
  for (const c of ordered) {
    if (c.h > 10) {
      const dx = c.h * 0.045;
      shadows += poly(
        [
          P(c.i + 1 - GAP, c.j + GAP, 0),
          P(c.i + 1 + dx, c.j + GAP, 0),
          P(c.i + 1 + dx, c.j + 1 - GAP, 0),
          P(c.i + 1 - GAP, c.j + 1 - GAP, 0),
        ],
        '#000',
        ' opacity=".3"',
      );
    }
  }
  for (const c of ordered) {
    const top0 = TOP[c.level] ?? TOP[0]!;
    const a = c.i + GAP,
      b = c.i + 1 - GAP,
      d = c.j + GAP,
      e = c.j + 1 - GAP;
    if (c.h > 2) {
      solids += poly([P(a, e, 0), P(b, e, 0), P(b, e, c.h), P(a, e, c.h)], shade(top0, 0.72)); // face toward +j
      solids += poly([P(b, d, 0), P(b, e, 0), P(b, e, c.h), P(b, d, c.h)], shade(top0, 0.5)); // face toward +i
    }
    solids += poly(
      [P(a, d, c.h), P(b, d, c.h), P(b, e, c.h), P(a, e, c.h)],
      top0,
      ' stroke="#000" stroke-opacity=".25" stroke-width=".6"',
    );
  }

  // Peak-day annotation (real data): leader line + label above the tallest column.
  let peak = '';
  const pk = peakDay(cal);
  if (pk) {
    const h = height(pk.count);
    const [px, py] = N(pk.week + 0.5, pk.weekday + 0.5, h);
    const ly = Math.max(104, py - 42);
    const lx = Math.min(W - 150, Math.max(150, px));
    peak += `<path d="M${f(px)} ${f(py - 4)}L${f(px)} ${f(ly + 8)}${lx !== px ? `L${f(lx)} ${f(ly + 8)}` : ''}" fill="none" stroke="${t.accentHi}" stroke-opacity=".8" stroke-dasharray="2 3"/>`;
    peak += `<circle cx="${f(px)}" cy="${f(py - 4)}" r="3.5" fill="${t.accentHi}"/>`;
    peak += text(lx, ly, `Peak · ${pk.count} on ${shortDate(pk.date)}`, {
      size: 14,
      mono: true,
      fill: t.accentHi,
      anchor: 'middle',
    });
  }

  let legend = text(W - 330, H - 26, 'Less', { size: 15, fill: t.muted, anchor: 'end' });
  TOP.forEach(
    (c, k) =>
      (legend += `<rect x="${W - 318 + k * 26}" y="${H - 40}" width="18" height="18" rx="3" fill="${c}"/>`),
  );
  legend += text(W - 178, H - 26, 'More', { size: 15, fill: t.muted });

  const defs = `<defs><radialGradient id="amb" cx="50%" cy="62%" r="52%"><stop offset="0" stop-color="${t.accent}" stop-opacity=".13"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>`;
  const body =
    defs +
    panel(W, H, t) +
    `<rect width="${W}" height="${H}" rx="16" fill="url(#amb)"/>` +
    label(40, 52, 'Contribution terrain', t) +
    text(
      40,
      78,
      `${full.total.toLocaleString('en-US')} contributions · ${cal.weeks.length} weeks shown · height ∝ √ daily count`,
      { size: 17, fill: t.muted },
    ) +
    slab +
    shadows +
    solids +
    peak +
    legend;
  return svgDoc(
    W,
    H,
    body,
    'Contribution terrain',
    `Isometric terrain of ${full.total} GitHub contributions across ${cal.weeks.length} weeks${pk ? `; busiest day ${pk.date} with ${pk.count}` : ''}.`,
  );
}
