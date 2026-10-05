import type { ContributionCalendar, ContributionDay, GithubUser, ProjectRecord } from '../types.ts';
import { safeRepoSlug } from '../util/escape.ts';
import { ApiShapeError } from './http.ts';

type Obj = Record<string, unknown>;

function asObj(v: unknown, what: string): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ApiShapeError(`${what} is not an object`);
  return v as Obj;
}
function reqStr(o: Obj, k: string, what: string): string {
  const v = o[k];
  if (typeof v !== 'string' || v === '') throw new ApiShapeError(`${what}.${k} missing or not a string`);
  return v;
}
function reqNum(o: Obj, k: string, what: string): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ApiShapeError(`${what}.${k} missing or not a number`);
  return v;
}
function reqBool(o: Obj, k: string, what: string): boolean {
  const v = o[k];
  if (typeof v !== 'boolean') throw new ApiShapeError(`${what}.${k} missing or not a boolean`);
  return v;
}
function reqDate(o: Obj, k: string, what: string): string {
  const s = reqStr(o, k, what);
  if (Number.isNaN(Date.parse(s))) throw new ApiShapeError(`${what}.${k} is not a date`);
  return s;
}
function optStr(o: Obj, k: string): string | undefined {
  const v = o[k];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

export function parseUser(raw: unknown): GithubUser {
  const o = asObj(raw, 'user');
  return {
    login: reqStr(o, 'login', 'user'),
    name: optStr(o, 'name') ?? null,
    htmlUrl: reqStr(o, 'html_url', 'user'),
    publicRepos: reqNum(o, 'public_repos', 'user'),
    followers: reqNum(o, 'followers', 'user'),
    createdAt: reqDate(o, 'created_at', 'user'),
  };
}

/** Parse one REST repository object into a normalized ProjectRecord (plus owner login for filtering). */
export function parseRepo(raw: unknown): ProjectRecord & { ownerLogin: string } {
  const o = asObj(raw, 'repo');
  const name = reqStr(o, 'name', 'repo');
  if (!safeRepoSlug(name)) throw new ApiShapeError(`repo.name has unexpected characters`);
  const url = reqStr(o, 'html_url', 'repo');
  if (!url.startsWith('https://github.com/')) throw new ApiShapeError('repo.html_url is not a github.com URL');
  const owner = asObj(o.owner, 'repo.owner');
  const topics = Array.isArray(o.topics) ? o.topics.filter((t): t is string => typeof t === 'string').sort() : [];
  const license = o.license && typeof o.license === 'object' ? optStr(o.license as Obj, 'spdx_id') : undefined;
  const priv = o.private === true;
  const record: ProjectRecord & { ownerLogin: string } = {
    ownerLogin: reqStr(owner, 'login', 'repo.owner'),
    name,
    fullName: reqStr(o, 'full_name', 'repo'),
    url,
    description: optStr(o, 'description') ?? '',
    topics,
    stars: reqNum(o, 'stargazers_count', 'repo'),
    forks: reqNum(o, 'forks_count', 'repo'),
    createdAt: reqDate(o, 'created_at', 'repo'),
    updatedAt: reqDate(o, 'updated_at', 'repo'),
    pushedAt: optStr(o, 'pushed_at') && !Number.isNaN(Date.parse(String(o.pushed_at))) ? String(o.pushed_at) : reqDate(o, 'updated_at', 'repo'),
    archived: reqBool(o, 'archived', 'repo'),
    fork: reqBool(o, 'fork', 'repo'),
    visibility: optStr(o, 'visibility') ?? (priv ? 'private' : 'public'),
    defaultBranch: optStr(o, 'default_branch') ?? 'main',
  };
  const lang = optStr(o, 'language');
  if (lang) record.primaryLanguage = lang;
  if (license && license !== 'NOASSERTION') record.license = license;
  return record;
}

export function parseLanguages(raw: unknown): Record<string, number> {
  const o = asObj(raw, 'languages');
  const out: Record<string, number> = {};
  for (const k of Object.keys(o).sort()) {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ApiShapeError(`languages.${k} is not a number`);
    out[k] = v;
  }
  return out;
}

export function parseRelease(raw: unknown): NonNullable<ProjectRecord['latestRelease']> {
  const o = asObj(raw, 'release');
  const url = reqStr(o, 'html_url', 'release');
  if (!url.startsWith('https://github.com/')) throw new ApiShapeError('release.html_url is not a github.com URL');
  const out: NonNullable<ProjectRecord['latestRelease']> = { tag: reqStr(o, 'tag_name', 'release'), url };
  const pub = optStr(o, 'published_at');
  if (pub && !Number.isNaN(Date.parse(pub))) out.publishedAt = pub;
  return out;
}

const LEVELS: Record<string, 0 | 1 | 2 | 3 | 4> = {
  NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4,
};

/** Parse the GraphQL response for `user.contributionsCollection.contributionCalendar`. */
export function parseContributionResponse(raw: unknown): ContributionCalendar {
  const root = asObj(raw, 'graphql');
  if (Array.isArray(root.errors) && root.errors.length > 0) {
    const first = asObj(root.errors[0], 'graphql.errors[0]');
    throw new ApiShapeError(`GraphQL error: ${typeof first.message === 'string' ? first.message.slice(0, 200) : 'unknown'}`);
  }
  const data = asObj(root.data, 'graphql.data');
  const user = asObj(data.user, 'graphql.data.user');
  const cal = asObj(asObj(user.contributionsCollection, 'contributionsCollection').contributionCalendar, 'contributionCalendar');
  const total = reqNum(cal, 'totalContributions', 'contributionCalendar');
  if (!Array.isArray(cal.weeks)) throw new ApiShapeError('contributionCalendar.weeks is not a list');
  const weeks: ContributionDay[][] = cal.weeks.map((w, wi) => {
    const wo = asObj(w, `weeks[${wi}]`);
    if (!Array.isArray(wo.contributionDays)) throw new ApiShapeError(`weeks[${wi}].contributionDays is not a list`);
    return wo.contributionDays.map((d, di): ContributionDay => {
      const dop = asObj(d, `weeks[${wi}].days[${di}]`);
      const date = reqStr(dop, 'date', 'day');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiShapeError('day.date is not YYYY-MM-DD');
      const lvl = LEVELS[reqStr(dop, 'contributionLevel', 'day')];
      if (lvl === undefined) throw new ApiShapeError('unknown contributionLevel');
      return { date, count: reqNum(dop, 'contributionCount', 'day'), level: lvl, weekday: reqNum(dop, 'weekday', 'day') };
    });
  });
  return { total, weeks };
}
