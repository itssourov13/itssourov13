import type { ProjectRecord } from '../types.ts';
import { buildEdges } from '../data/normalize.ts';
import { classifyActivity } from '../../../shared/activity.ts';
import type { Activity } from '../../../shared/activity.ts';
import {
  DARK,
  f,
  hashString,
  label,
  languageColor,
  midEllipsis,
  panel,
  rng,
  svgDoc,
  text,
  unavailable,
} from './svg.ts';

const t = DARK;
const RADIUS: Record<Activity, number> = { active: 13, recent: 11, quiet: 9, dormant: 8 };

interface Group {
  language: string;
  members: { project: ProjectRecord; index: number }[];
}

/**
 * Project constellation. Projects are clustered by primary language; links come only from real shared topics
 * (solid) and shared primary language (dashed). Ring size follows recency, a halo marks featured projects.
 */
export function renderConstellation(
  projects: ProjectRecord[],
  featuredNames: string[],
  referenceIso: string,
): string {
  const W = 1200;
  const H = 480;
  if (projects.length < 2)
    return unavailable(
      W,
      H,
      t,
      'Project constellation',
      'Relationships appear once at least two public projects exist.',
    );

  const nodes = [...projects].sort(
    (a, b) =>
      (a.primaryLanguage ?? '~').localeCompare(b.primaryLanguage ?? '~') ||
      a.name.localeCompare(b.name),
  );
  const featured = new Set(featuredNames.map((n) => n.toLowerCase()));
  const edges = buildEdges(nodes);

  const byLang = new Map<string, Group>();
  nodes.forEach((project, index) => {
    const language = project.primaryLanguage ?? 'Other';
    const g = byLang.get(language) ?? { language, members: [] };
    g.members.push({ project, index });
    byLang.set(language, g);
  });
  const groups = [...byLang.values()].sort(
    (a, b) => b.members.length - a.members.length || a.language.localeCompare(b.language),
  );

  // Column widths: a lone project needs room for its label, a bigger cluster grows sub-linearly.
  const weights = groups.map((g) => 1 + (g.members.length - 1) * 0.9);
  const plotX = 40;
  const plotW = W - 80;
  const unit = Math.min(150, plotW / weights.reduce((a, b) => a + b, 0));
  const baseY = 262;

  const pos: { x: number; y: number }[] = new Array<{ x: number; y: number }>(nodes.length);
  let cursor = plotX + (plotW - unit * weights.reduce((a, b) => a + b, 0)) / 2;
  const clusters: { g: Group; x: number; w: number }[] = [];
  groups.forEach((g, gi) => {
    const gw = unit * weights[gi]!;
    clusters.push({ g, x: cursor, w: gw });
    const n = g.members.length;
    const cols = n === 1 ? 1 : Math.ceil(Math.sqrt(n * 1.6));
    const rows = Math.ceil(n / cols);
    g.members.forEach((m, k) => {
      const c = k % cols;
      const r = Math.floor(k / cols);
      const jitter = ((hashString(m.project.name) % 29) - 14) * 0.9;
      let x = cursor + (gw * (c + 0.5)) / cols;
      let y = baseY + (r - (rows - 1) / 2) * 96 + jitter;
      if (n === 1) y = baseY + ((hashString(m.project.name) % 3) - 1) * 52;
      else if (rows > 1) x += (r % 2 === 0 ? -1 : 1) * (gw / (cols * 5));
      pos[m.index] = { x, y };
    });
    cursor += gw;
  });

  // Background stars (decorative, seeded).
  const r = rng(1301);
  let stars = '';
  for (let i = 0; i < 70; i++) {
    stars += `<circle cx="${f(plotX + r() * plotW)}" cy="${f(104 + r() * 300)}" r="${f(0.6 + r() * 1.1)}" fill="${t.text}" fill-opacity="${f(0.1 + r() * 0.25)}"/>`;
  }

  let body = panel(W, H, t) + label(40, 52, 'Project constellation', t);
  body += text(
    40,
    78,
    'Projects cluster by primary language · links join a shared topic or language',
    { size: 17, fill: t.muted },
  );
  body += stars;

  // Cluster halos + captions.
  for (const c of clusters) {
    const color = languageColor(c.g.language);
    const cx = c.x + c.w / 2;
    body += `<ellipse cx="${f(cx)}" cy="${baseY}" rx="${f(Math.max(52, c.w / 2 - 6))}" ry="${c.g.members.length > 1 ? 128 : 100}" fill="${color}" fill-opacity=".045" stroke="${color}" stroke-opacity=".22" stroke-dasharray="3 7"/>`;
    body += `<line x1="${f(c.x + 14)}" y1="${H - 84}" x2="${f(c.x + c.w - 14)}" y2="${H - 84}" stroke="${color}" stroke-opacity=".55" stroke-width="2"/>`;
    body += text(cx, H - 60, `${c.g.language.toUpperCase()} · ${c.g.members.length}`, {
      size: 13,
      mono: true,
      fill: color,
      anchor: 'middle',
      spacing: 2,
    });
  }

  edges.forEach((e, i) => {
    const A = pos[e.a]!;
    const B = pos[e.b]!;
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    const bulge = (i % 2 === 0 ? 1 : -1) * Math.min(70, len * 0.22);
    const qx = mx + (-dy / len) * bulge;
    const qy = my + (dx / len) * bulge;
    const style =
      e.kind === 'topic'
        ? `stroke="${t.accent}" stroke-opacity=".75" stroke-width="1.7"`
        : `stroke="${t.cool}" stroke-opacity=".5" stroke-width="1.3" stroke-dasharray="5 6"`;
    body += `<path d="M${f(A.x)} ${f(A.y)}Q${f(qx)} ${f(qy)} ${f(B.x)} ${f(B.y)}" fill="none" ${style}/>`;
  });

  nodes.forEach((p, i) => {
    const q = pos[i]!;
    const act = classifyActivity(p.pushedAt, referenceIso);
    const rad = RADIUS[act];
    const color = languageColor(p.primaryLanguage ?? 'Other');
    const isFeatured = featured.has(p.name.toLowerCase());
    if (isFeatured) {
      body += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${rad + 14}" fill="${t.accent}" fill-opacity=".1"/><circle cx="${f(q.x)}" cy="${f(q.y)}" r="${rad + 7}" fill="none" stroke="${t.accentHi}" stroke-opacity=".8" stroke-dasharray="2 4"/>`;
    }
    body += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${rad}" fill="${t.bg}" stroke="${color}" stroke-width="2.2"/><circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(rad * 0.38)}" fill="${isFeatured ? t.accentHi : color}"/>`;
    body += text(q.x, q.y + rad + (isFeatured ? 30 : 23), midEllipsis(p.name, 17), {
      size: 15,
      mono: true,
      fill: t.text,
      anchor: 'middle',
    });
  });

  // Legend.
  const ly = H - 24;
  body +=
    `<line x1="40" y1="${ly - 5}" x2="76" y2="${ly - 5}" stroke="${t.accent}" stroke-width="2"/>` +
    text(86, ly, 'shared topic', { size: 14, fill: t.muted });
  body +=
    `<line x1="214" y1="${ly - 5}" x2="250" y2="${ly - 5}" stroke="${t.cool}" stroke-width="2" stroke-dasharray="5 6"/>` +
    text(260, ly, 'shared language', { size: 14, fill: t.muted });
  body +=
    `<circle cx="420" cy="${ly - 5}" r="9" fill="none" stroke="${t.accentHi}" stroke-dasharray="2 4"/><circle cx="420" cy="${ly - 5}" r="3.5" fill="${t.accentHi}"/>` +
    text(438, ly, 'featured', { size: 14, fill: t.muted });
  body += text(W - 40, ly, 'ring size = how recently pushed', {
    size: 14,
    fill: t.muted,
    anchor: 'end',
  });

  return svgDoc(
    W,
    H,
    body,
    'Project constellation',
    `${nodes.length} projects in ${groups.length} language clusters with ${edges.length} relationships.`,
  );
}
