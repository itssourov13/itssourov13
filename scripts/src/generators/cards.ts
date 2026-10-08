import type { ProjectRecord } from '../types.ts';
import { ACTIVITY_LABELS, classifyActivity } from '../../../shared/activity.ts';
import { truncate } from '../util/escape.ts';
import {
  ACTIVITY_DOT,
  DARK,
  f,
  hashString,
  languageColor,
  panel,
  rng,
  svgDoc,
  text,
  wrapText,
} from './svg.ts';

const W = 580;
const H = 288;
const t = DARK;

const day = (iso: string) => iso.slice(0, 10);

/** Per-repository language mix (top 4 + rest), from real byte counts. Empty when the API gave no breakdown. */
function languageMix(project: ProjectRecord): { name: string; pct: number }[] {
  const entries = Object.entries(project.languages ?? {}).filter(([, v]) => v > 0);
  const sum = entries.reduce((a, [, v]) => a + v, 0);
  if (sum === 0) return [];
  const sorted = entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, 4).map(([name, v]) => ({ name, pct: (v / sum) * 100 }));
  const rest = sorted.slice(4).reduce((a, [, v]) => a + v, 0);
  if (rest > 0) head.push({ name: 'Other', pct: (rest / sum) * 100 });
  return head;
}

/** Faint, unique-per-project glyph: concentric arcs + dots seeded by the repository name (decorative only). */
function glyph(name: string, color: string): string {
  const r = rng(hashString(name));
  const cx = W - 84;
  const cy = 64;
  let g = '';
  for (let i = 0; i < 4; i++) {
    const rad = 16 + i * 14;
    const start = r() * Math.PI * 2;
    const len = 1.4 + r() * 3.2;
    const x1 = cx + Math.cos(start) * rad;
    const y1 = cy + Math.sin(start) * rad;
    const x2 = cx + Math.cos(start + len) * rad;
    const y2 = cy + Math.sin(start + len) * rad;
    g += `<path d="M${f(x1)} ${f(y1)}A${rad} ${rad} 0 ${len > Math.PI ? 1 : 0} 1 ${f(x2)} ${f(y2)}" fill="none" stroke="${color}" stroke-width="${i === 0 ? 2.5 : 1.6}" stroke-opacity="${f(0.55 - i * 0.1)}" stroke-linecap="round"/>`;
  }
  const a = r() * Math.PI * 2;
  g += `<circle cx="${f(cx + Math.cos(a) * 58)}" cy="${f(cy + Math.sin(a) * 58)}" r="3.5" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="3" fill="${t.accentHi}"/>`;
  return g;
}

/** Project card. `project` is null for a configured-but-not-yet-collected repository (name + link only). */
export function renderCard(
  name: string,
  project: ProjectRecord | null,
  referenceIso: string,
  index = 1,
): string {
  const accent = project?.primaryLanguage ? languageColor(project.primaryLanguage) : t.accent;
  let body = panel(W, H, t) + `<rect x="0" y="28" width="4" height="56" fill="${t.accent}"/>`;
  body += glyph(name, accent);
  body += text(32, 52, `${String(index).padStart(2, '0')} / FEATURED`, {
    size: 13,
    mono: true,
    fill: t.accent,
    spacing: 3,
  });
  body += text(32, 98, truncate(name, 26), { size: 31, mono: true, weight: 700, fill: t.text });

  const desc = project
    ? project.description || 'No description provided.'
    : 'Repository details appear after the next data update.';
  wrapText(desc, 51, 3).forEach(
    (l, i) => (body += text(32, 134 + i * 24, l, { size: 17, fill: t.muted })),
  );

  if (project) {
    const act = classifyActivity(project.pushedAt, referenceIso);
    const mix = languageMix(project);
    if (mix.length > 0) {
      const barX = 32;
      const barW = W - 64;
      let x = barX;
      body += `<clipPath id="bar"><rect x="${barX}" y="204" width="${barW}" height="6" rx="3"/></clipPath><g clip-path="url(#bar)"><rect x="${barX}" y="204" width="${barW}" height="6" fill="${t.bg2}"/>`;
      for (const m of mix) {
        const w = (m.pct / 100) * barW;
        body += `<rect x="${f(x)}" y="204" width="${f(Math.max(w, 2))}" height="6" fill="${languageColor(m.name)}"/>`;
        x += w;
      }
      body += '</g>';
      let lx = 32;
      for (const m of mix.slice(0, 3)) {
        const label = `${truncate(m.name, 12)} ${m.pct >= 10 ? Math.round(m.pct) : m.pct.toFixed(1)}%`;
        body +=
          `<circle cx="${lx + 5}" cy="227" r="5" fill="${languageColor(m.name)}"/>` +
          text(lx + 16, 232, label, { size: 14, mono: true, fill: t.text, opacity: 0.9 });
        lx += 32 + label.length * 8.6;
      }
    } else if (project.primaryLanguage) {
      body +=
        `<circle cx="37" cy="227" r="5" fill="${accent}"/>` +
        text(48, 232, truncate(project.primaryLanguage, 18), {
          size: 14,
          mono: true,
          fill: t.text,
        });
    }
    body += text(W - 32, 232, `★ ${project.stars}   ⑂ ${project.forks}`, {
      size: 14,
      mono: true,
      fill: t.muted,
      anchor: 'end',
    });

    const dot = ACTIVITY_DOT[act];
    body += `<line x1="32" y1="248" x2="${W - 32}" y2="248" stroke="${t.border}"/>`;
    body += `<circle cx="38" cy="269" r="4" fill="${dot}"/>`;
    const foot = [ACTIVITY_LABELS[act], `Pushed ${day(project.pushedAt)}`];
    if (project.latestRelease) foot.push(`Release ${truncate(project.latestRelease.tag, 18)}`);
    body += text(50, 274, foot.join('  ·  '), { size: 13.5, mono: true, fill: t.muted });
    const tags = project.topics
      .slice(0, 3)
      .map((x) => `#${truncate(x, 12)}`)
      .join(' ');
    if (tags)
      body += text(W - 32, 274, tags, { size: 13.5, mono: true, fill: t.cool, anchor: 'end' });
    if (project.archived)
      body += text(W - 32, 52, 'ARCHIVED', {
        size: 13,
        mono: true,
        fill: t.muted,
        anchor: 'end',
        spacing: 2,
      });
  }
  const title = project
    ? `${project.name}: ${truncate(project.description || 'repository', 90)}${project.archived ? ' (archived)' : ''}`
    : `${name} repository`;
  return svgDoc(W, H, body, title, `Repository card for ${name}`);
}
