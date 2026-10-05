import { describe, expect, it } from 'vitest';
import { GithubApi } from './github.ts';
import { RateLimitError } from './http.ts';

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init });
const repo = (i: number) => ({
  name: `r${i}`, full_name: `itssourov13/r${i}`, html_url: `https://github.com/itssourov13/r${i}`, owner: { login: 'itssourov13' },
  fork: false, archived: false, stargazers_count: 0, forks_count: 0, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
});
const noSleep = async () => {};

describe('GithubApi', () => {
  it('paginates repositories until a short page', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      const page = Number(new URL(url).searchParams.get('page'));
      return json(page === 1 ? Array.from({ length: 100 }, (_, i) => repo(i)) : [repo(100)]);
    }) as unknown as typeof fetch;
    const repos = await new GithubApi({ fetchImpl, sleep: noSleep }).listRepos('itssourov13');
    expect(repos).toHaveLength(101);
    expect(urls).toHaveLength(2);
  });
  it('retries server errors with backoff then succeeds', async () => {
    let calls = 0;
    const fetchImpl = (async () => (++calls < 3 ? new Response('x', { status: 502 }) : json({ login: 'itssourov13', html_url: 'https://github.com/itssourov13', public_repos: 1, followers: 0, created_at: '2020-01-01T00:00:00Z' }))) as unknown as typeof fetch;
    const user = await new GithubApi({ fetchImpl, sleep: noSleep }).getUser('itssourov13');
    expect(user.login).toBe('itssourov13');
    expect(calls).toBe(3);
  });
  it('surfaces rate limiting clearly', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' } })) as unknown as typeof fetch;
    await expect(new GithubApi({ fetchImpl, sleep: noSleep }).getUser('itssourov13')).rejects.toBeInstanceOf(RateLimitError);
  });
  it('rejects malformed payloads instead of guessing', async () => {
    const fetchImpl = (async () => json([{ name: 'x' }])) as unknown as typeof fetch;
    await expect(new GithubApi({ fetchImpl, sleep: noSleep }).listRepos('itssourov13')).rejects.toThrow(/Unexpected GitHub API response/);
  });
  it('maps latest-release 404 to null and never sends the token to other hosts', async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => (seen.push(url), new Response('{}', { status: 404 }))) as unknown as typeof fetch;
    const api = new GithubApi({ fetchImpl, sleep: noSleep, token: 'ghp_' + 'a'.repeat(36) });
    expect(await api.getLatestRelease('itssourov13', 'x')).toBeNull();
    expect(seen.every((u) => u.startsWith('https://api.github.com/'))).toBe(true);
  });
  it('parses the GraphQL contribution calendar and reports GraphQL errors', async () => {
    const ok = { data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 3, weeks: [{ contributionDays: [{ date: '2026-01-01', contributionCount: 3, contributionLevel: 'SECOND_QUARTILE', weekday: 4 }] }] } } } } };
    const api = new GithubApi({ token: 't', sleep: noSleep, fetchImpl: (async () => json(ok)) as unknown as typeof fetch });
    const cal = await api.getContributions('itssourov13');
    expect(cal.total).toBe(3);
    expect(cal.weeks[0]![0]!.level).toBe(2);
    const bad = new GithubApi({ token: 't', sleep: noSleep, fetchImpl: (async () => json({ errors: [{ message: 'boom' }] })) as unknown as typeof fetch });
    await expect(bad.getContributions('itssourov13')).rejects.toThrow(/boom/);
    await expect(new GithubApi({ sleep: noSleep }).getContributions('itssourov13')).rejects.toThrow(/GITHUB_TOKEN/);
  });
});
