import type { Stats } from '../data/normalize.ts';
import { momentumDelta } from '../data/normalize.ts';
import { DARK, f, label, panel, svgDoc, text, unavailable } from './svg.ts';

const t = DARK;

export function renderIntelligence(
  stats: Stats | null,
  collectedAt: string | null,
  fixture: boolean,
): string {
  const W = 1200;
  if (!stats)
    return unavailable(
      W,
      200,
      t,
      'GitHub intelligence',
      'Metrics unavailable — they appear after the first successful data collection.',
    );

  const tiles: [string, string][] = [
    ['Public repositories', String(stats.publicRepos)],
    ['Pushed in 90 days', String(stats.activeRepos90d)],
    [
      'Contributions · 12 mo',
      stats.totalContributions === null ? '—' : stats.totalContributions.toLocaleString('en-US'),
    ],
    ['Stars received', String(stats.totalStars)],
    ['Followers', String(stats.followers)],
  ];
  const mo = stats.momentum;
  const H = mo ? 300 : 214;

  let body = panel(W, H, t) + label(40, 50, 'GitHub intelligence', t);
  const src = fixture
    ? 'Synthetic fixture data — preview only'
    : `GitHub API · data last changed ${collectedAt ? collectedAt.slice(0, 10) : 'n/a'} UTC`;
  body += text(W - 40, 50, src, { size: 14, mono: true, fill: t.muted, anchor: 'end' });

  const tw = (W - 80) / tiles.length;
  tiles.forEach(([k, v], i) => {
    const x = 40 + i * tw;
    if (i > 0)
      body += `<line x1="${f(x - 14)}" y1="84" x2="${f(x - 14)}" y2="158" stroke="${t.border}"/>`;
    body += text(x, 134, v, { size: 54, weight: 700, fill: i === 2 ? t.accentHi : t.text });
    body += text(x, 160, k, { size: 16, fill: t.muted });
  });

  if (mo) {
    const d = momentumDelta(mo);
    body += `<line x1="40" y1="190" x2="${W - 40}" y2="190" stroke="${t.border}"/>`;
    body += text(40, 222, 'Momentum · last 30 days vs the 30 before', {
      size: 14,
      mono: true,
      fill: t.accent,
      spacing: 1.5,
    });
    const barX = 188;
    const barW = 560;
    const max = Math.max(1, mo.last30, mo.prev30);
    const row = (y: number, name: string, value: number, fill: string) => {
      body += text(40, y + 5, name, { size: 15, fill: t.muted });
      body += `<rect x="${barX}" y="${y - 8}" width="${barW}" height="12" rx="6" fill="${t.bg2}"/>`;
      body += `<rect x="${barX}" y="${y - 8}" width="${f(Math.max(6, (value / max) * barW))}" height="12" rx="6" fill="${fill}"/>`;
      body += text(barX + barW + 16, y + 5, String(value), { size: 16, mono: true, fill: t.text });
    };
    row(250, 'Last 30 days', mo.last30, t.accentHi);
    row(278, 'Previous 30', mo.prev30, '#5b6572');
    const arrow = d.dir === 'up' ? '▲' : d.dir === 'down' ? '▼' : '■';
    const big = d.pct === null ? (mo.last30 > 0 ? 'New' : '—') : `${d.pct > 0 ? '+' : ''}${d.pct}%`;
    const color = d.dir === 'up' ? t.accentHi : d.dir === 'down' ? t.cool : t.muted;
    body += text(W - 40, 256, `${arrow} ${big}`, {
      size: 44,
      weight: 700,
      fill: color,
      anchor: 'end',
    });
    body += text(W - 40, 280, 'contributions vs previous window', {
      size: 14,
      fill: t.muted,
      anchor: 'end',
    });
  }

  return svgDoc(
    W,
    H,
    body,
    'GitHub intelligence',
    [
      ...tiles.map(([k, v]) => `${k}: ${v}`),
      mo ? `Last 30 days ${mo.last30}, previous 30 days ${mo.prev30}` : '',
    ]
      .filter(Boolean)
      .join('; '),
  );
}
