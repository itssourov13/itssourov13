import type { CollectedData, ProfileConfig, ProjectRecord } from '../types.ts';
import type { MediaState } from '../data/media.ts';
import {
  activityOf,
  computeStats,
  excludedProjects,
  graphProjects,
  languageTotals,
  selectFeatured,
  selectLatest,
} from '../data/normalize.ts';
import { ACTIVITY_LABELS } from '../../../shared/activity.ts';
import { escapeMd, escapeXml, safeRepoSlug, safeUrl, truncate } from '../util/escape.ts';

export const GEN = 'assets/generated';

export interface CardTarget {
  name: string;
  url: string;
  project: ProjectRecord | null;
}

/** Featured repositories to show as cards (live data when available, name+link placeholder before first collection). */
export function featuredTargets(
  config: ProfileConfig,
  data: CollectedData | null,
): { targets: CardTarget[]; missing: string[] } {
  const limit = config.project_rules.featured_limit;
  if (!data) {
    const names = config.featured_repositories.filter((n) => safeRepoSlug(n)).slice(0, limit);
    return {
      targets: names.map((name) => ({
        name,
        url: `https://github.com/${config.profile.username}/${name}`,
        project: null,
      })),
      missing: [],
    };
  }
  const { featured, missing } = selectFeatured(data.repos, config.featured_repositories, limit);
  return {
    targets: featured
      .filter((p) => safeRepoSlug(p.name))
      .map((p) => ({ name: p.name, url: p.url, project: p })),
    missing,
  };
}

/** What the cinematic section shows: the visitor's own photo when present and valid, otherwise the generated frame. */
export function cinematicState(
  config: ProfileConfig,
  media: MediaState,
): { enabled: boolean; kind: 'photo' | 'illustration' } {
  return {
    enabled: config.cinematic.enabled,
    kind: media.cinematicImage ? 'photo' : 'illustration',
  };
}

const SOCIAL_LABELS: [string, string][] = [
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['x', 'X'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['blog', 'Blog'],
  ['portfolio', 'Portfolio'],
];

const SEP = ' &nbsp;·&nbsp; ';
const img = (src: string, alt: string, extra = '') =>
  `<img src="${src}" alt="${escapeXml(alt)}"${extra ? ` ${extra}` : ''}>`;
const wide = (src: string, alt: string) => img(src, alt, 'width="100%"');

interface Section {
  id: string;
  nav: string;
  markdown: string;
}

function hero(config: ProfileConfig, nav: Section[]): string {
  const p = config.profile;
  const links = nav.map((s) => `<a href="#${s.id}">${escapeXml(s.nav)}</a>`).join(SEP);
  return [
    '<div align="center">',
    '<picture>',
    `  <source media="(prefers-color-scheme: light)" srcset="${GEN}/hero-light.svg">`,
    `  ${img(`${GEN}/hero-dark.svg`, `${p.display_name} — ${p.headline}`, 'width="100%"')}`,
    '</picture>',
    links ? `<p>${links}</p>` : '',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
}

function intro(config: ProfileConfig, media: MediaState): string {
  const p = config.profile;
  const bio = p.bio.map((b) => `<p align="center">${escapeXml(b)}</p>`);
  if (!media.profileImage) return bio.join('\n');
  // With a portrait the intro becomes a two-column block; without one it stays centred and typographic.
  const text = p.bio.map((b) => `<p>${escapeXml(b)}</p>`).join('');
  const photo = img(media.profileImage.path, p.photo_alt || p.display_name, 'width="150"');
  return `<table>\n<tr><td valign="middle">${text}</td><td width="190" align="center">${photo}</td></tr>\n</table>`;
}

function introMotion(config: ProfileConfig, media: MediaState): string {
  if (!media.heroGif) return '';
  const g = img(
    media.heroGif.path,
    `Introduction animation for ${config.profile.display_name}`,
    'width="100%"',
  );
  return config.media.intro_video_url
    ? `<a href="${safeUrl(config.media.intro_video_url)}">${g}</a>`
    : g;
}

function focusSection(config: ProfileConfig): Section | null {
  if (config.focus.length === 0) return null;
  return {
    id: 'focus',
    nav: 'Focus',
    markdown: `## Focus\n\n${wide(`${GEN}/terminal.svg`, `Focus areas: ${config.focus.join(', ')}`)}`,
  };
}

function cardCell(t: CardTarget): string {
  const slug = safeRepoSlug(t.name)!;
  const alt = t.project
    ? `${t.name}${t.project.description ? ` — ${truncate(t.project.description, 120)}` : ''}${t.project.primaryLanguage ? ` (${t.project.primaryLanguage})` : ''}`
    : `${t.name} repository`;
  return `<td width="50%" valign="top"><a href="${safeUrl(t.url)}">${wide(`${GEN}/cards/${slug}.svg`, alt)}</a></td>`;
}

function featuredSection(
  targets: CardTarget[],
  graph: ProjectRecord[],
  showMap: boolean,
): Section | null {
  if (targets.length === 0) return null;
  const rows: string[] = [];
  for (let i = 0; i < targets.length; i += 2) {
    const pair = targets.slice(i, i + 2).map(cardCell);
    if (pair.length === 1) pair.push('<td width="50%"></td>');
    rows.push(`<tr>${pair.join('')}</tr>`);
  }
  const parts = ['## Featured work', `<table>\n${rows.join('\n')}\n</table>`];
  if (showMap)
    parts.push(
      wide(
        `${GEN}/project-constellation.svg`,
        `Project constellation: ${graph.map((g) => g.name).join(', ')}`,
      ),
    );
  return { id: 'featured-work', nav: 'Work', markdown: parts.join('\n\n') };
}

function cinematicSection(config: ProfileConfig, media: MediaState): Section | null {
  const st = cinematicState(config, media);
  if (!st.enabled) return null;
  const { title, caption, alt } = config.cinematic;
  const frame = media.cinematicImage
    ? wide(media.cinematicImage.path, alt || `${title} — ${caption}`)
    : wide(
        `${GEN}/cinematic-night-city.svg`,
        'Illustrated night street in the rain: neon signs, wet asphalt, street lamps, light trails and a car ahead under a rose-and-amber horizon',
      );
  const strip = wide(`${GEN}/cinematic-caption.svg`, `Frame 01 — ${title}. ${caption}`);
  return {
    id: 'after-hours',
    nav: 'After hours',
    markdown: `## After hours\n\n${frame}<br>\n${strip}`,
  };
}

function intelligenceSection(config: ProfileConfig, data: CollectedData | null): Section | null {
  if (!data) return null;
  const c = config.content;
  const cal = data.contributions;
  const parts: string[] = [];
  if (c.show_intelligence) {
    const s = computeStats(data.user, data.repos, cal, data.collectedAt);
    const mo = s.momentum
      ? `; ${s.momentum.last30} contributions in the last 30 days against ${s.momentum.prev30} in the 30 before`
      : '';
    parts.push(
      wide(
        `${GEN}/github-intelligence.svg`,
        `${s.publicRepos} public repositories, ${s.activeRepos90d} pushed in the last 90 days, ${s.totalStars} stars received, ${s.followers} followers${mo}`,
      ),
    );
  }
  if (c.show_terrain && cal)
    parts.push(
      wide(
        `${GEN}/contribution-terrain.svg`,
        `Isometric terrain of ${cal.total} GitHub contributions`,
      ),
    );
  if (c.show_activity_pulse && cal)
    parts.push(wide(`${GEN}/activity-pulse.svg`, 'Monthly contribution bars'));
  const langs = languageTotals(data.repos);
  if (c.show_language_galaxy && langs)
    parts.push(
      wide(
        `${GEN}/language-galaxy.svg`,
        `Language distribution: ${langs.items.map((i) => `${i.name} ${i.percent}%`).join(', ')}`,
      ),
    );
  if (parts.length === 0) return null;
  return {
    id: 'github-intelligence',
    nav: 'Intelligence',
    markdown: `## GitHub intelligence\n\n${parts.join('\n\n')}`,
  };
}

function recentSection(latest: ProjectRecord[], data: CollectedData | null): Section {
  const id = 'recent-work';
  const nav = 'Recent';
  if (!data)
    return {
      id,
      nav,
      markdown:
        '## Recent work\n\n_Live repository data appears after the first scheduled update._',
    };
  if (latest.length === 0)
    return {
      id,
      nav,
      markdown: '## Recent work\n\n_No public repositories match the current display rules._',
    };
  const ref = data.collectedAt;
  const rows = latest.map((p) => {
    const tags = p.topics
      .slice(0, 3)
      .map((t) => `\`${t.replace(/[^A-Za-z0-9-]/g, '')}\``)
      .join(' ');
    const desc = escapeMd(truncate(p.description || '—', 100));
    return `| [${escapeMd(p.name)}](${safeUrl(p.url)}) | ${desc}${tags ? `<br>${tags}` : ''} | ${escapeMd(p.primaryLanguage ?? '—')} | ${ACTIVITY_LABELS[activityOf(p, ref)]} | ${p.pushedAt.slice(0, 10)} |`;
  });
  return {
    id,
    nav,
    markdown: [
      '## Recent work',
      '',
      '| Repository | Description | Language | Status | Last push |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
      '<sub>Selected automatically from public repositories by most recent push. Status: Active ≤ 30 days · Recent ≤ 90 · Quiet ≤ 1 year · Dormant beyond, measured at the last data update.</sub>',
    ].join('\n'),
  };
}

function excludedBlock(items: ReturnType<typeof excludedProjects>): string {
  if (items.length === 0) return '';
  const rows = items.map(
    ({ project: p, reason }) =>
      `| [${escapeMd(p.name)}](${safeUrl(p.url)}) | ${reason === 'archived' ? 'Archived' : 'Fork'} | ${p.pushedAt.slice(0, 10)} |`,
  );
  return [
    '<details>',
    `<summary>Archived &amp; excluded (${items.length})</summary>`,
    '',
    '| Repository | Reason | Last push |',
    '| --- | --- | --- |',
    ...rows,
    '',
    '</details>',
  ].join('\n');
}

function exploreSection(config: ProfileConfig): Section | null {
  const links = SOCIAL_LABELS.filter(([k]) => config.socials[k]).map(
    ([k, l]) => `<a href="${safeUrl(config.socials[k]!)}">${l}</a>`,
  );
  if (config.profile.website)
    links.push(`<a href="${safeUrl(config.profile.website)}">Website</a>`);
  const parts: string[] = [];
  if (config.world.enabled) {
    parts.push(
      `<a href="${safeUrl(config.world.url)}">${wide(`${GEN}/enter-world.svg`, `Enter ${config.world.title} — an interactive 3D companion built from the same GitHub data`)}</a>`,
    );
  }
  if (links.length > 0) parts.push(`<p align="center"><b>Connect</b>${SEP}${links.join(SEP)}</p>`);
  if (parts.length === 0) return null;
  return { id: 'explore', nav: 'Explore', markdown: `## Explore\n\n${parts.join('\n\n')}` };
}

export function renderReadme(
  config: ProfileConfig,
  data: CollectedData | null,
  media: MediaState,
): string {
  const { targets } = featuredTargets(config, data);
  const latest = data
    ? selectLatest(data.repos, config.project_rules, config.profile.username)
    : [];
  const graph = data
    ? graphProjects(
        targets.map((t) => t.project).filter((p): p is ProjectRecord => p !== null),
        latest,
      )
    : [];
  const showMap = data !== null && config.content.show_constellation && graph.length >= 2;

  // Story order: focus → featured work → atmosphere → intelligence → recent work → explore/contact.
  const sections = [
    focusSection(config),
    featuredSection(targets, graph, showMap),
    cinematicSection(config, media),
    intelligenceSection(config, data),
    recentSection(latest, data),
    exploreSection(config),
  ].filter((s): s is Section => s !== null);

  const recentIdx = sections.findIndex((s) => s.id === 'recent-work');
  if (data && recentIdx >= 0) {
    const ex = excludedBlock(
      excludedProjects(
        data.repos,
        config.project_rules,
        targets.map((t) => t.name),
        config.profile.username,
      ),
    );
    if (ex)
      sections[recentIdx] = {
        ...sections[recentIdx]!,
        markdown: `${sections[recentIdx]!.markdown}\n\n${ex}`,
      };
  }

  const stamp = !data
    ? 'Awaiting first data collection'
    : data.fixture
      ? 'Synthetic fixture data — preview only'
      : `GitHub data last changed ${data.collectedAt.slice(0, 10)} UTC`;
  const footer = `${wide(`${GEN}/footer.svg`, `${config.profile.display_name} — digital security profile`)}\n\n<p align="center"><sub>${stamp} · generated by the <a href="docs/ARCHITECTURE.md">profile engine</a> · <a href="${safeUrl(config.profile.profile_url)}">@${config.profile.username}</a></sub></p>`;

  return `${[
    '<!-- GENERATED FILE — edit profile.config.yml and run `npm run generate` (see docs/CUSTOMIZATION.md). -->',
    hero(config, sections),
    intro(config, media),
    introMotion(config, media),
    ...sections.map((s) => s.markdown),
    footer,
  ]
    .filter(Boolean)
    .join('\n\n')}\n`;
}
