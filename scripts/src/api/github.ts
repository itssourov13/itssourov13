import { API_ROOT, MAX_REPO_PAGES } from '../constants.ts';
import type { ContributionCalendar, GithubUser, ProjectRecord } from '../types.ts';
import { HttpError, requestJson, ApiShapeError } from './http.ts';
import type { RequestOptions } from './http.ts';
import { parseContributionResponse, parseLanguages, parseRelease, parseRepo, parseUser } from './parse.ts';

const CONTRIBUTIONS_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel weekday } }
      }
    }
  }
}`;

export type RepoWithOwner = ProjectRecord & { ownerLogin: string };

export class GithubApi {
  private opts: RequestOptions;
  constructor(opts: RequestOptions = {}) {
    this.opts = opts;
  }
  get authenticated(): boolean {
    return Boolean(this.opts.token);
  }

  async getUser(login: string): Promise<GithubUser> {
    return parseUser(await requestJson(`${API_ROOT}/users/${encodeURIComponent(login)}`, this.opts));
  }

  /** All public repositories owned by `login`, paginated 100 at a time (bounded by MAX_REPO_PAGES). */
  async listRepos(login: string): Promise<RepoWithOwner[]> {
    const out: RepoWithOwner[] = [];
    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
      const url = `${API_ROOT}/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`;
      const data = await requestJson(url, this.opts);
      if (!Array.isArray(data)) throw new ApiShapeError('repository list is not an array');
      for (const raw of data) out.push(parseRepo(raw));
      if (data.length < 100) return out;
    }
    return out;
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    return parseLanguages(await requestJson(`${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, this.opts));
  }

  async getLatestRelease(owner: string, repo: string): Promise<ProjectRecord['latestRelease'] | null> {
    try {
      return parseRelease(await requestJson(`${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`, this.opts));
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      throw err;
    }
  }

  /** Requires an authenticated token (GraphQL does not allow anonymous access). */
  async getContributions(login: string): Promise<ContributionCalendar> {
    if (!this.authenticated) throw new Error('Contribution data requires GITHUB_TOKEN (GraphQL needs authentication)');
    const raw = await requestJson(`${API_ROOT}/graphql`, {
      ...this.opts,
      method: 'POST',
      body: { query: CONTRIBUTIONS_QUERY, variables: { login } },
    });
    return parseContributionResponse(raw);
  }
}
