import type { ContributionCalendar, GithubUser, ProfileConfig, ProjectRecord } from '../types.ts';
import { CANONICAL_USERNAME } from '../constants.ts';

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

export interface Edge {
  a: number;
  b: number;
  kind: 'topic' | 'language';
  label: string;
}

/** Relationships derived only from real shared topics / primary language. */
export function buildEdges(projects: ProjectRecord[]): Edge[] {
  const edges: Edge[] = [];
  for (let a = 0; a < projects.length; a++) {
    for (let b = a + 1; b < projects.length; b++) {
      const pa = projects[a]!;
      const pb = projects[b]!;
      const shared = pa.topics.filter((t) => pb.topics.includes(t));
      if (shared.length > 0) edges.push({ a, b, kind: 'topic', label: shared[0]! });
      else if (pa.primaryLanguage && pa.primaryLanguage === pb.primaryLanguage) edges.push({ a, b, kind: 'language', label: pa.primaryLanguage });
    }
  }
  return edges;
}

export interface Stats {
  publicRepos: number;
  followers: number;
  totalContributions: number | null;
  activeRepos90d: number;
  totalStars: number;
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
