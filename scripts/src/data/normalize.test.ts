import { describe, expect, it } from 'vitest';
import { fixtureCalendar, fixtureData } from '../../fixtures/index.ts';
import { parseRepo } from '../api/parse.ts';
import { buildEdges, languageTotals, monthlyTotals, normalizeRepos, selectFeatured, selectLatest } from './normalize.ts';

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
