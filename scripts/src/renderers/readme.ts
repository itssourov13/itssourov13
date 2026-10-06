import type { CollectedData, ProfileConfig, ProjectRecord } from '../types.ts';
import type { MediaState } from '../data/media.ts';
import { activityOf, computeStats, excludedProjects, graphProjects, languageTotals, selectFeatured, selectLatest } from '../data/normalize.ts';
import { ACTIVITY_LABELS } from '../../../shared/activity.ts';
import { escapeMd, escapeXml, safeRepoSlug, safeUrl, truncate } from '../util/escape.ts';

export const GEN = 'assets/generated';

export interface CardTarget {
  name: string;
  url: string;
  project: ProjectRecord | null;
}

/** Featured repositories to show as cards (live data when available, name+link placeholder before first collection). */
export function featuredTargets(config: ProfileConfig, data: CollectedData | null): { targets: CardTarget[]; missing: string[] } {
  const limit = config.project_rules.featured_limit;
  if (!data) {
    const names = config.featured_repositories.filter((n) => safeRepoSlug(n)).slice(0, limit);
    return { targets: names.map((name) => ({ name, url: `https://github.com/${config.profile.username}/${name}`, project: null })), missing: [] };
  }
  const { featured, missing } = selectFeatured(data.repos, config.featured_repositories, limit);
  return { targets: featured.filter((p) => safeRepoSlug(p.name)).map((p) => ({ name: p.name, url: p.url, project: p })), missing };
}

const SOCIAL_LABELS: [string, string][] = [
  ['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['x', 'X'], ['facebook', 'Facebook'],
  ['instagram', 'Instagram'], ['blog', 'Blog'], ['portfolio', 'Portfolio'],
];

const img = (src: string, alt: string, extra = '') => `<img src="${src}" alt="${escapeXml(alt)}"${extra ? ` ${extra}` : ''}>`;

function header(config: ProfileConfig, media: MediaState): string {
  const p = config.profile;
  const hero = [
    '<div align="center">',
    '<picture>',
    `  <source media="(prefers-color-scheme: light)" srcset="${GEN}/hero-light.svg">`,
    `  ${img(`${GEN}/hero-dark.svg`, `${p.display_name} — ${p.headline}`, 'width="100%"')}`,
    '</picture>',
    '</div>',
  ].join('\n');
  const photo = media.profileImage ? `${img(media.profileImage.path, p.photo_alt || p.display_name, 'align="right" width="160"')}\n\n` : '';
  const meta = [escapeMd(p.headline), p.location ? escapeMd(p.location) : ''].filter(Boolean).join(' · ');
  const links = SOCIAL_LABELS.filter(([k]) => config.socials[k]).map(([k, l]) => `[${l}](${safeUrl(config.socials[k]!)})`);
  if (p.website) links.push(`[Website](${safeUrl(p.website)})`);
  const bio = p.bio.map((b) => escapeMd(b)).join('\n\n');
  return [hero, `${photo}**${escapeMd(p.display_name)}** — ${meta}`, bio, links.join(' · ')].filter(Boolean).join('\n\n');
}

function intro(config: ProfileConfig, media: MediaState): string {
  if (!media.heroGif) return '';
  const g = img(media.heroGif.path, `Introduction animation for ${config.profile.display_name}`, 'width="100%"');
  return config.media.intro_video_url ? `<a href="${safeUrl(config.media.intro_video_url)}">${g}</a>` : g;
}

function focusSection(config: ProfileConfig): string {
  if (config.focus.length === 0) return '';
  const items = config.focus.map((f) => `<li>${escapeXml(f)}</li>`).join('');
  return [
    '## Focus',
    '',
    '<table>',
    `<tr><td width="40%" valign="top"><ul>${items}</ul></td><td width="60%" valign="top">${img(`${GEN}/terminal.svg`, `Focus areas: ${config.focus.join(', ')}`, 'width="100%"')}</td></tr>`,
    '</table>',
  ].join('\n');
}

function cardCell(t: CardTarget): string {
  const slug = safeRepoSlug(t.name)!;
  const alt = t.project
    ? `${t.name}${t.project.description ? ` — ${truncate(t.project.description, 120)}` : ''}${t.project.primaryLanguage ? ` (${t.project.primaryLanguage})` : ''}`
    : `${t.name} repository`;
  return `<td width="50%" valign="top"><a href="${safeUrl(t.url)}">${img(`${GEN}/cards/${slug}.svg`, alt, 'width="100%"')}</a></td>`;
}

function featuredSection(targets: CardTarget[]): string {
  if (targets.length === 0) return '';
  const rows: string[] = [];
  for (let i = 0; i < targets.length; i += 2) {
    const pair = targets.slice(i, i + 2).map(cardCell);
    if (pair.length === 1) pair.push('<td width="50%"></td>');
    rows.push(`<tr>${pair.join('')}</tr>`);
  }
  return `## Featured work\n\n<table>\n${rows.join('\n')}\n</table>`;
}

function latestSection(latest: ProjectRecord[], hasData: boolean, ref: string): string {
  if (!hasData) return '## Latest activity\n\n_Live repository data appears after the first scheduled update._';
  if (latest.length === 0) return '## Latest activity\n\n_No public repositories match the current display rules._';
  const rows = latest.map((p) => {
    const tags = p.topics.slice(0, 3).map((t) => `\`${t.replace(/[^A-Za-z0-9-]/g, '')}\``).join(' ');
    const desc = escapeMd(truncate(p.description || '—', 100));
    return `| [${escapeMd(p.name)}](${safeUrl(p.url)}) | ${desc}${tags ? `<br>${tags}` : ''} | ${escapeMd(p.primaryLanguage ?? '—')} | ${ACTIVITY_LABELS[activityOf(p, ref)]} | ${p.pushedAt.slice(0, 10)} |`;
  });
  return ['## Latest activity', '', '| Repository | Description | Language | Status | Last push |', '| --- | --- | --- | --- | --- |', ...rows, '', '<sub>Automatically selected from public repositories by most recent push. Status: Active ≤ 30 days · Recent ≤ 90 · Quiet ≤ 1 year · Dormant beyond, measured at the last data update.</sub>'].join('\n');
}

function excludedSection(items: ReturnType<typeof excludedProjects>): string {
  if (items.length === 0) return '';
  const rows = items.map(({ project: p, reason }) => `| [${escapeMd(p.name)}](${safeUrl(p.url)}) | ${reason === 'archived' ? 'Archived' : 'Fork'} | ${p.pushedAt.slice(0, 10)} |`);
  return ['<details>', `<summary>Archived &amp; excluded (${items.length})</summary>`, '', '| Repository | Reason | Last push |', '| --- | --- | --- |', ...rows, '', '</details>'].join('\n');
}

export function renderReadme(config: ProfileConfig, data: CollectedData | null, media: MediaState): string {
  const { targets } = featuredTargets(config, data);
  const latest = data ? selectLatest(data.repos, config.project_rules, config.profile.username) : [];
  const cal = data?.contributions ?? null;
  const c = config.content;
  const sections: string[] = [
    '<!-- GENERATED FILE — edit profile.config.yml and run `npm run generate` (see docs/CUSTOMIZATION.md). -->',
    header(config, media),
    intro(config, media),
    focusSection(config),
    featuredSection(targets),
  ];

  const graph = data ? graphProjects(targets.map((t) => t.project).filter((p): p is ProjectRecord => p !== null), latest) : [];
  if (data && c.show_constellation && graph.length >= 2) {
    sections.push(`${img(`${GEN}/project-constellation.svg`, `Project constellation: ${graph.map((g) => g.name).join(', ')}`, 'width="100%"')}`);
  }
  sections.push(latestSection(latest, data !== null, data?.collectedAt ?? ''));
  if (data) sections.push(excludedSection(excludedProjects(data.repos, config.project_rules, targets.map((t) => t.name), config.profile.username)));

  if (data) {
    const parts: string[] = [];
    if (c.show_terrain && cal) parts.push(`## Contribution terrain\n\n${img(`${GEN}/contribution-terrain.svg`, `Isometric terrain of ${cal.total} GitHub contributions over the last 12 months`, 'width="100%"')}`);
    if (c.show_intelligence) {
      const s = computeStats(data.user, data.repos, cal, data.collectedAt);
      parts.push(`## GitHub intelligence\n\n${img(`${GEN}/github-intelligence.svg`, `${s.publicRepos} public repositories, ${s.followers} followers, ${s.activeRepos90d} repositories pushed in the last 90 days, ${s.totalStars} stars received`, 'width="100%"')}`);
    }
    const langs = languageTotals(data.repos);
    const second: string[] = [];
    if (c.show_language_galaxy && langs) second.push(img(`${GEN}/language-galaxy.svg`, `Language distribution: ${langs.items.map((i) => `${i.name} ${i.percent}%`).join(', ')}`, 'width="100%"'));
    if (c.show_activity_pulse && cal) second.push(img(`${GEN}/activity-pulse.svg`, 'Monthly contribution trend over the last 12 months', 'width="100%"'));
    if (second.length) parts.push(`## Languages & activity\n\n${second.join('\n\n')}`);
    sections.push(...parts);
  }

  if (config.world.enabled) {
    sections.push(
      `## Digital world\n\n<a href="${safeUrl(config.world.url)}">${img(`${GEN}/enter-world.svg`, `Enter ${config.world.title}`, 'width="360"')}</a>\n\nAn interactive 3D companion built from the same GitHub data — [open it in your browser](${safeUrl(config.world.url)}).`,
    );
  }

  const stamp = !data ? 'Awaiting first data collection' : data.fixture ? 'Synthetic fixture data — preview only' : `GitHub data last changed ${data.collectedAt.slice(0, 10)} UTC`;
  sections.push(`---\n\n<sub>${stamp} · generated by the [profile engine](docs/ARCHITECTURE.md) · [@${config.profile.username}](${safeUrl(config.profile.profile_url)})</sub>`);
  return `${sections.filter(Boolean).join('\n\n')}\n`;
}
