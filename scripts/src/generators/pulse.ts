import type { ContributionCalendar } from '../types.ts';
import { activeMonthlyTotals } from '../data/normalize.ts';
import { DARK, f, label, panel, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

/** Monthly contributions as bars, starting at the first month with real activity. */
export function renderPulse(cal: ContributionCalendar | null): string {
  const W = 1200;
  const H = 250;
  if (!cal)
    return unavailable(
      W,
      H,
      t,
      'Activity pulse',
      'Contribution data unavailable — it appears after the next successful update.',
    );
  const data = activeMonthlyTotals(cal);
  if (data.length === 0)
    return unavailable(W, H, t, 'Activity pulse', 'No contribution months to show yet.');

  const max = Math.max(1, ...data.map((d) => d.total));
  const x0 = 70,
    x1 = W - 70,
    yb = 196,
    yt = 118;
  const slot = (x1 - x0) / data.length;
  const bw = Math.min(88, slot * 0.56);
  const cx = (i: number) => x0 + slot * (i + 0.5);
  const hOf = (v: number) => (v === 0 ? 3 : 8 + (v / max) * (yb - yt - 8));
  const peakIdx = data.reduce((best, d, i) => (d.total > data[best]!.total ? i : best), 0);

  let body =
    `<defs><linearGradient id="bar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${t.accentHi}"/><stop offset="1" stop-color="${t.accent}" stop-opacity=".25"/></linearGradient></defs>` +
    panel(W, H, t) +
    label(40, 50, 'Activity pulse', t);
  body += text(
    40,
    76,
    `Contributions per month since ${monthName(data[0]!.month)} ${data[0]!.month.slice(0, 4)} · first and last month may be partial`,
    { size: 17, fill: t.muted },
  );
  body += `<line x1="${x0 - 20}" y1="${yb}" x2="${x1 + 20}" y2="${yb}" stroke="${t.border}"/>`;

  const pts: string[] = [];
  data.forEach((d, i) => {
    const h = hOf(d.total);
    const y = yb - h;
    const x = cx(i) - bw / 2;
    body +=
      d.total === 0
        ? `<rect x="${f(x)}" y="${yb - 3}" width="${f(bw)}" height="3" rx="1.5" fill="${t.border}"/>`
        : `<path d="M${f(x)} ${yb}V${f(y + 8)}Q${f(x)} ${f(y)} ${f(x + 8)} ${f(y)}H${f(x + bw - 8)}Q${f(x + bw)} ${f(y)} ${f(x + bw)} ${f(y + 8)}V${yb}Z" fill="url(#bar)" fill-opacity="${i === peakIdx ? 1 : 0.78}"/>`;
    pts.push(`${f(cx(i))} ${f(y)}`);
    body += text(cx(i), y - 12, String(d.total), {
      size: 16,
      mono: true,
      fill: i === peakIdx ? t.accentHi : t.text,
      anchor: 'middle',
      weight: i === peakIdx ? 700 : 400,
    });
    body += text(cx(i), yb + 26, monthName(d.month), { size: 15, fill: t.muted, anchor: 'middle' });
  });
  if (data.length > 1)
    body += `<path d="M${pts.join('L')}" fill="none" stroke="${t.accentHi}" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round" stroke-dasharray="1 5" stroke-linecap="round"/>`;

  return svgDoc(
    W,
    H,
    body,
    'Activity pulse',
    `Monthly contributions: ${data.map((d) => `${d.month} ${d.total}`).join(', ')}.`,
  );
}
