import type { ContributionCalendar, GithubUser, ProfileConfig, ProjectRecord } from '../types.ts';
import { CANONICAL_USERNAME } from '../constants.ts';
import { classifyActivity } from '../../../shared/activity.ts';
import type { Activity } from '../../../shared/activity.ts';
import { buildRelationships } from '../../../shared/graph.ts';
import { momentum } from '../../../shared/momentum.ts';
import type { Momentum } from '../../../shared/momentum.ts';

type WithOwner = ProjectRecord & { ownerLogin: string };

/** Keep only repos owned by `username` (API owner field), de-duplicated, honouring public_only. */
export function normalizeRepos(raw: WithOwner[], username: string, publicOnly: boolean): ProjectRecord[] {
  const seen = new Set<string>();
  const out: ProjectRecord[] = [];
  for (const { ownerLogin, ...repo } of raw) {
    if (ownerLogin.toLowerCase() !== username.toLowerCase()) continue;
    if (publicOnly && repo.visibility !== 'public') continue;
    const key = repo.fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(repo);
  }
  return sortByActivity(out);
}

export function sortByActivity(repos: ProjectRecord[]): ProjectRecord[] {
  return [...repos].sort((a, b) => {
    const d = Date.parse(b.pushedAt) - Date.parse(a.pushedAt);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
}

export function isProfileRepo(p: ProjectRecord, username = CANONICAL_USERNAME): boolean {
  return p.name.toLowerCase() === username.toLowerCase();
}

/** Automatic "latest" list. Never includes the profile repository. */
export function selectLatest(projects: ProjectRecord[], rules: ProfileConfig['project_rules'], username = CANONICAL_USERNAME): ProjectRecord[] {
  return sortByActivity(projects)
    .filter((p) => !isProfileRepo(p, username))
    .filter((p) => !(rules.exclude_forks && p.fork))
    .filter((p) => !(rules.exclude_archived && p.archived))
    .slice(0, rules.latest_limit);
}

/** Manual "featured" list in configured order. Unknown names are reported, not invented. */
export function selectFeatured(projects: ProjectRecord[], names: string[], limit: number): { featured: ProjectRecord[]; missing: string[] } {
  const byName = new Map(projects.map((p) => [p.name.toLowerCase(), p]));
  const featured: ProjectRecord[] = [];
  const missing: string[] = [];
  const used = new Set<string>();
  for (const n of names) {
    const hit = byName.get(n.toLowerCase());
    if (!hit) missing.push(n);
    else if (!used.has(hit.name)) {
      used.add(hit.name);
      featured.push(hit);
    }
  }
  return { featured: featured.slice(0, limit), missing };
}

export interface LanguageShare {
  name: string;
  value: number;
  percent: number;
}
export interface LanguageSummary {
  basis: 'bytes' | 'repos';
  items: LanguageShare[];
}

/** Language distribution across public non-fork repos. Bytes when available, else primary-language repo counts. */
export function languageTotals(projects: ProjectRecord[], maxItems = 8): LanguageSummary | null {
  const own = projects.filter((p) => !p.fork && !isProfileRepo(p));
  const bytes = new Map<string, number>();
  for (const p of own) for (const [k, v] of Object.entries(p.languages ?? {})) bytes.set(k, (bytes.get(k) ?? 0) + v);
  let basis: 'bytes' | 'repos' = 'bytes';
  let totals = bytes;
  if ([...bytes.values()].reduce((a, b) => a + b, 0) === 0) {
    basis = 'repos';
    totals = new Map();
    for (const p of own) if (p.primaryLanguage) totals.set(p.primaryLanguage, (totals.get(p.primaryLanguage) ?? 0) + 1);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  if (sum === 0) return null;
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, maxItems);
  const rest = sorted.slice(maxItems).reduce((a, [, v]) => a + v, 0);
  if (rest > 0) head.push(['Other', rest]);
  return { basis, items: head.map(([name, value]) => ({ name, value, percent: Math.round((value / sum) * 1000) / 10 })) };
}

export function monthlyTotals(cal: ContributionCalendar, months = 12): { month: string; total: number }[] {
  const map = new Map<string, number>();
  for (const w of cal.weeks) for (const d of w) map.set(d.date.slice(0, 7), (map.get(d.date.slice(0, 7)) ?? 0) + d.count);
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-months).map(([month, total]) => ({ month, total }));
}

/**
 * The calendar trimmed to the period that has real activity (one empty week of lead-in, at least `minWeeks` wide).
 * New accounts would otherwise render as a long empty runway; nothing is invented or removed, only leading zeros.
 */
export function activeCalendar(cal: ContributionCalendar, minWeeks = 26): ContributionCalendar {
  const first = cal.weeks.findIndex((w) => w.some((d) => d.count > 0));
  if (first < 0) return cal;
  const start = Math.max(0, Math.min(first - 1, cal.weeks.length - minWeeks));
  return start === 0 ? cal : { total: cal.total, weeks: cal.weeks.slice(start) };
}

/** Monthly totals starting at the first month with activity (but never fewer than `minMonths` bars). */
export function activeMonthlyTotals(cal: ContributionCalendar, minMonths = 4): { month: string; total: number }[] {
  const all = monthlyTotals(cal);
  const first = all.findIndex((m) => m.total > 0);
  if (first < 0) return all.slice(-minMonths);
  return all.slice(Math.min(first, Math.max(0, all.length - minMonths)));
}

/** First calendar day of the trimmed window, as YYYY-MM-DD (null for an empty calendar). */
export function calendarStart(cal: ContributionCalendar): string | null {
  return cal.weeks[0]?.[0]?.date ?? null;
}

export interface PeakDay {
  date: string;
  count: number;
  week: number;
  weekday: number;
}
/** The single busiest day (first one wins on ties); null when there is no activity at all. */
export function peakDay(cal: ContributionCalendar): PeakDay | null {
  let best: PeakDay | null = null;
  for (let week = 0; week < cal.weeks.length; week++) {
    const days = cal.weeks[week]!;
    for (let k = 0; k < days.length; k++) {
      const d = days[k]!;
      if (d.count > 0 && (best === null || d.count > best.count)) best = { date: d.date, count: d.count, week, weekday: d.weekday ?? k };
    }
  }
  return best;
}

/** Relative change between the two 30-day windows. `pct` is null when the earlier window was empty. */
export function momentumDelta(m: Momentum): { pct: number | null; dir: 'up' | 'down' | 'flat' } {
  const dir = m.last30 > m.prev30 ? 'up' : m.last30 < m.prev30 ? 'down' : 'flat';
  return { pct: m.prev30 === 0 ? null : Math.round(((m.last30 - m.prev30) / m.prev30) * 100), dir };
}

export interface Edge {
  a: number;
  b: number;
  kind: 'topic' | 'language';
  label: string;
}

/** Relationships derived only from real shared topics / primary language (shared with the 3D world). */
export function buildEdges(projects: ProjectRecord[]): Edge[] {
  return buildRelationships(projects.map((p) => ({ topics: p.topics, language: p.primaryLanguage })));
}

export function activityOf(p: ProjectRecord, referenceIso: string): Activity {
  return classifyActivity(p.pushedAt, referenceIso);
}

export interface ExcludedProject {
  project: ProjectRecord;
  reason: 'archived' | 'fork';
}

/**
 * Public repositories that the automatic "latest" list hides because of the display rules.
 * Never includes the profile repository and never includes featured repos (they are shown anyway).
 */
export function excludedProjects(projects: ProjectRecord[], rules: ProfileConfig['project_rules'], featuredNames: string[], username = CANONICAL_USERNAME): ExcludedProject[] {
  const featured = new Set(featuredNames.map((n) => n.toLowerCase()));
  const out: ExcludedProject[] = [];
  for (const p of sortByActivity(projects)) {
    if (isProfileRepo(p, username) || featured.has(p.name.toLowerCase())) continue;
    if (rules.exclude_archived && p.archived) out.push({ project: p, reason: 'archived' });
    else if (rules.exclude_forks && p.fork) out.push({ project: p, reason: 'fork' });
  }
  return out;
}

export interface Stats {
  publicRepos: number;
  followers: number;
  totalContributions: number | null;
  activeRepos90d: number;
  totalStars: number;
  momentum: Momentum | null;
}

export function computeStats(user: GithubUser, projects: ProjectRecord[], cal: ContributionCalendar | null, refIso: string): Stats {
  const ref = Date.parse(refIso);
  const own = projects.filter((p) => !isProfileRepo(p));
  return {
    publicRepos: user.publicRepos,
    followers: user.followers,
    totalContributions: cal ? cal.total : null,
    activeRepos90d: own.filter((p) => ref - Date.parse(p.pushedAt) <= 90 * 86_400_000).length,
    totalStars: own.filter((p) => !p.fork).reduce((a, p) => a + p.stars, 0),
    momentum: cal ? momentum(cal.weeks.flat().map((d) => ({ date: d.date, count: d.count }))) : null,
  };
}

/** Unique projects for visual relationship graphs: featured first, then latest. */
export function graphProjects(featured: ProjectRecord[], latest: ProjectRecord[], max = 12): ProjectRecord[] {
  const seen = new Set<string>();
  const out: ProjectRecord[] = [];
  for (const p of [...featured, ...latest]) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      out.push(p);
    }
  }
  return out.slice(0, max);
}
