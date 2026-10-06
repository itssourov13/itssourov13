import type { ProjectRecord } from '../types.ts';
import { ACTIVITY_LABELS, classifyActivity } from '../../../shared/activity.ts';
import type { Activity } from '../../../shared/activity.ts';
import { truncate } from '../util/escape.ts';
import { DARK, FONT_MONO, LANGUAGE_COLORS, f, panel, svgDoc, text, wrapText } from './svg.ts';

const W = 480;
const H = 196;
const t = DARK;

const day = (iso: string) => iso.slice(0, 10);

/** Project card. `project` is null for a configured-but-not-yet-collected repository (name + link only). */
const ACTIVITY_COLOR: Record<Activity, string> = { active: t.accentHi, recent: t.cool, quiet: t.muted, dormant: t.border };

export function renderCard(name: string, project: ProjectRecord | null, referenceIso: string): string {
  let body = panel(W, H, t) + `<rect x="0" y="24" width="4" height="48" fill="${t.accent}"/>`;
  body += text(28, 56, truncate(name, 30), { size: 24, mono: true, weight: 600, fill: t.text });
  let desc: string;
  if (!project) desc = 'Repository details appear after the next data update.';
  else desc = project.description || 'No description provided.';
  const lines = wrapText(desc, 52, 2);
  lines.forEach((l, i) => (body += text(28, 92 + i * 22, l, { size: 16, fill: t.muted })));

  if (project) {
    let x = 28;
    if (project.primaryLanguage) {
      body += `<circle cx="${x + 6}" cy="136" r="6" fill="${LANGUAGE_COLORS[Math.abs(hash(project.primaryLanguage)) % LANGUAGE_COLORS.length]}"/>`;
      body += text(x + 20, 142, truncate(project.primaryLanguage, 16), { size: 15, fill: t.text });
      x += 36 + Math.min(16, project.primaryLanguage.length) * 8.4;
    }
    const tags = project.topics.slice(0, 3).map((x2) => `#${truncate(x2, 14)}`).join('  ');
    if (tags) body += text(x, 142, tags, { size: 14, mono: true, fill: t.cool });
    const meta = [`★ ${project.stars}`, `⑂ ${project.forks}`].join('   ');
    body += text(W - 28, 142, meta, { size: 15, mono: true, fill: t.muted, anchor: 'end' });
    const act = classifyActivity(project.pushedAt, referenceIso);
    const foot = [ACTIVITY_LABELS[act], `Pushed ${day(project.pushedAt)}`];
    if (project.latestRelease) foot.push(`Release ${truncate(project.latestRelease.tag, 18)}`);
    body += `<line x1="28" y1="160" x2="${W - 28}" y2="160" stroke="${t.border}"/>`;
    body += `<circle cx="34" cy="178" r="4" fill="${ACTIVITY_COLOR[act]}"/>`;
    body += text(46, 183, foot.join('  ·  '), { size: 14, mono: true, fill: t.muted });
    if (project.archived) body += text(W - 28, 56, 'ARCHIVED', { size: 13, mono: true, fill: t.muted, anchor: 'end', spacing: 2 });
  }
  const title = project ? `${project.name}: ${truncate(project.description || 'repository', 90)}${project.archived ? ' (archived)' : ''}` : `${name} repository`;
  return svgDoc(W, H, body, title, `Repository card for ${name}`);
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}
export { FONT_MONO, f };
