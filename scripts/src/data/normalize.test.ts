import { describe, expect, it } from 'vitest';
import { fixtureCalendar, fixtureData } from '../../fixtures/index.ts';
import type { ContributionCalendar, ContributionDay } from '../types.ts';
import { parseRepo } from '../api/parse.ts';
import { activeCalendar, activeMonthlyTotals, activityOf, buildEdges, computeStats, excludedProjects, languageTotals, momentumDelta, monthlyTotals, normalizeRepos, peakDay, selectFeatured, selectLatest, sortByActivity } from './normalize.ts';

const rules = { latest_limit: 3, featured_limit: 6, exclude_forks: true, exclude_archived: true, public_only: true };

const rawRepo = (over: Record<string, unknown> = {}) => ({
  name: 'demo', full_name: 'itssourov13/demo', html_url: 'https://github.com/itssourov13/demo', owner: { login: 'itssourov13' },
  description: null, fork: false, archived: false, stargazers_count: 1, forks_count: 0, created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z', pushed_at: '2025-02-01T00:00:00Z', topics: ['b', 'a'], language: 'Go', private: false,
  visibility: 'public', default_branch: 'main', ...over,
});

describe('parseRepo', () => {
  it('normalizes a repository', () => {
    const r = parseRepo(rawRepo());
    expect(r.topics).toEqual(['a', 'b']);
    expect(r.description).toBe('');
    expect(r.primaryLanguage).toBe('Go');
  });
  it.each([
    ['missing name', { name: undefined }],
    ['unsafe name', { name: '../x' }],
    ['non-github url', { html_url: 'https://evil.example/x' }],
    ['bad date', { created_at: 'nope' }],
    ['negative stars', { stargazers_count: -1 }],
  ])('rejects malformed response: %s', (_n, over) => {
    expect(() => parseRepo(rawRepo(over))).toThrow();
  });
  it('rejects non-objects', () => {
    expect(() => parseRepo(null)).toThrow();
    expect(() => parseRepo('x')).toThrow();
  });
});

describe('repository selection', () => {
  const data = fixtureData();
  it('drops foreign owners, private repos and duplicates', () => {
    const raws = [parseRepo(rawRepo()), parseRepo(rawRepo()), parseRepo(rawRepo({ name: 'other', full_name: 'someone/other', owner: { login: 'someone' } })), parseRepo(rawRepo({ name: 'priv', full_name: 'itssourov13/priv', private: true, visibility: 'private' }))];
    const out = normalizeRepos(raws, 'itssourov13', true);
    expect(out.map((r) => r.name)).toEqual(['demo']);
  });
  it('latest excludes profile repo, forks, archived and respects limit and recency order', () => {
    const latest = selectLatest(data.repos, rules);
    expect(latest.map((p) => p.name)).toEqual(['fixture-scanner', 'fixture-notes', 'fixture-os']);
    expect(latest.some((p) => p.name === 'itssourov13')).toBe(false);
    expect(latest.some((p) => p.fork)).toBe(false);
  });
  it('featured keeps configured order and reports unknown names', () => {
    const { featured, missing } = selectFeatured(data.repos, ['fixture-os', 'nope', 'fixture-scanner', 'fixture-os'], 6);
    expect(featured.map((p) => p.name)).toEqual(['fixture-os', 'fixture-scanner']);
    expect(missing).toEqual(['nope']);
  });
});

describe('derived data', () => {
  it('computes language shares by bytes, excluding forks and the profile repo', () => {
    const s = languageTotals(fixtureData().repos)!;
    expect(s.basis).toBe('bytes');
    expect(s.items[0]!.name).toBe('Python');
    expect(s.items.some((i) => i.name === 'Go')).toBe(false);
    expect(Math.round(s.items.reduce((a, i) => a + i.percent, 0))).toBe(100);
  });
  it('falls back to repo counts without byte data', () => {
    const repos = fixtureData().repos.map((r) => ({ ...r, languages: undefined }));
    expect(languageTotals(repos)!.basis).toBe('repos');
  });
  it('aggregates monthly contributions consistently with the total', () => {
    const cal = fixtureCalendar();
    const monthly = monthlyTotals(cal, 99);
    expect(monthly.reduce((a, m) => a + m.total, 0)).toBe(cal.total);
    expect(monthlyTotals(cal, 12)).toHaveLength(12);
  });
  it('builds relationship edges only from real shared data', () => {
    const edges = buildEdges(fixtureData().repos.slice(0, 4));
    expect(edges.some((e) => e.kind === 'topic' && e.label === 'security')).toBe(true);
    for (const e of edges) expect(e.a).toBeLessThan(e.b);
  });
});

describe('phase 1: project intelligence', () => {
  const data = fixtureData();
  it('parses a repository with only the minimum fields (optional fields default, nothing invented)', () => {
    const r = parseRepo({ name: 'min', full_name: 'itssourov13/min', html_url: 'https://github.com/itssourov13/min', owner: { login: 'itssourov13' }, fork: false, archived: false, stargazers_count: 0, forks_count: 0, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z' });
    expect(r.description).toBe('');
    expect(r.topics).toEqual([]);
    expect(r.primaryLanguage).toBeUndefined();
    expect(r.license).toBeUndefined();
    expect(r.pushedAt).toBe('2025-03-01T00:00:00Z'); // falls back to updated_at, a real field
    expect(r.visibility).toBe('public');
  });
  it('ignores a NOASSERTION license and non-string topics', () => {
    const r = parseRepo(rawRepo({ license: { spdx_id: 'NOASSERTION' }, topics: ['ok', 3, null] }));
    expect(r.license).toBeUndefined();
    expect(r.topics).toEqual(['ok']);
  });
  it('deduplicates case-insensitively', () => {
    const out = normalizeRepos([parseRepo(rawRepo()), parseRepo(rawRepo({ full_name: 'ITSSOUROV13/DEMO' }))], 'itssourov13', true);
    expect(out).toHaveLength(1);
  });
  it('sorts by push date then name, deterministically', () => {
    const a = parseRepo(rawRepo({ name: 'b', full_name: 'itssourov13/b' }));
    const b = parseRepo(rawRepo({ name: 'a', full_name: 'itssourov13/a' }));
    const c = parseRepo(rawRepo({ name: 'c', full_name: 'itssourov13/c', pushed_at: '2025-06-01T00:00:00Z' }));
    expect(sortByActivity([a, b, c]).map((p) => p.name)).toEqual(['c', 'a', 'b']);
  });
  it('lists archived and fork repos as excluded with a reason, never the profile repo or featured ones', () => {
    const repos = [...data.repos, { ...data.repos[1]!, name: 'old', fullName: 'itssourov13/old', archived: true }];
    const ex = excludedProjects(repos, rules, ['fixture-notes'], 'itssourov13');
    expect(ex.map((e) => [e.project.name, e.reason])).toEqual([['fixture-fork', 'fork'], ['old', 'archived']]);
    expect(excludedProjects(repos, rules, ['fixture-notes', 'old', 'fixture-fork']).length).toBe(0);
  });
  it('keeps featured independent of the latest list', () => {
    const { featured } = selectFeatured(data.repos, ['fixture-site'], 6);
    const latest = selectLatest(data.repos, { ...rules, latest_limit: 1 });
    expect(featured[0]!.name).toBe('fixture-site');
    expect(latest.map((p) => p.name)).toEqual(['fixture-scanner']);
  });
  it('classifies activity from collectedAt, not the wall clock', () => {
    expect(activityOf(data.repos[0]!, data.collectedAt)).toBe('active');
    expect(activityOf(data.repos[2]!, data.collectedAt)).toBe('recent');
  });
  it('computes contribution momentum from the real calendar only', () => {
    const s = computeStats(data.user, data.repos, data.contributions, data.collectedAt);
    expect(s.momentum).not.toBeNull();
    expect(computeStats(data.user, data.repos, null, data.collectedAt).momentum).toBeNull();
  });
});

describe('active window helpers', () => {
  const day = (date: string, count: number, weekday: number): ContributionDay => ({ date, count, level: count > 0 ? 1 : 0, weekday });
  const weeks = (counts: number[]): ContributionDay[][] => counts.map((c, w) => Array.from({ length: 7 }, (_, k) => day(`2026-0${1 + Math.floor(w / 5)}-${String((w % 5) * 7 + k + 1).padStart(2, '0')}`, k === 2 ? c : 0, k)));
  const cal = (counts: number[]): ContributionCalendar => ({ total: counts.reduce((a, b) => a + b, 0), weeks: weeks(counts) });

  it('drops leading empty weeks but keeps one lead-in week and a minimum width', () => {
    const c = cal([...Array.from({ length: 40 }, () => 0), 3, 0, 5]);
    expect(c.weeks).toHaveLength(43);
    const t = activeCalendar(c, 10);
    expect(t.weeks).toHaveLength(10);
    expect(t.total).toBe(8);
    expect(activeCalendar(cal([1, 2, 3]), 26).weeks).toHaveLength(3);
  });
  it('leaves an all-empty calendar untouched', () => {
    const c = cal([0, 0, 0]);
    expect(activeCalendar(c)).toBe(c);
  });
  it('finds the busiest day and returns null without activity', () => {
    const p = peakDay(cal([1, 9, 4]))!;
    expect(p.count).toBe(9);
    expect(p.week).toBe(1);
    expect(p.weekday).toBe(2);
    expect(peakDay(cal([0, 0]))).toBeNull();
  });
  it('starts monthly bars at the first active month with a floor of minMonths', () => {
    const c = fixtureCalendar();
    const all = monthlyTotals(c);
    const trimmed = activeMonthlyTotals(c, 2);
    expect(trimmed.length).toBeLessThanOrEqual(all.length);
    expect(trimmed.length).toBeGreaterThanOrEqual(Math.min(2, all.length));
    expect(trimmed[0]!.total > 0 || trimmed.length === 2).toBe(true);
  });
  it('computes momentum deltas, including an empty earlier window', () => {
    expect(momentumDelta({ last30: 115, prev30: 46 })).toEqual({ pct: 150, dir: 'up' });
    expect(momentumDelta({ last30: 5, prev30: 10 })).toEqual({ pct: -50, dir: 'down' });
    expect(momentumDelta({ last30: 4, prev30: 0 })).toEqual({ pct: null, dir: 'up' });
    expect(momentumDelta({ last30: 0, prev30: 0 }).dir).toBe('flat');
  });
});
