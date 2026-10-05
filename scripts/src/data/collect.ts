import { GithubApi } from '../api/github.ts';
import { MAX_ENRICHED_REPOS } from '../constants.ts';
import type { CollectedData, ContributionCalendar, ProfileConfig } from '../types.ts';
import { log } from '../util/log.ts';
import { normalizeRepos } from './normalize.ts';

/**
 * Collect live data for the configured account. Aborts if the API login does not match the
 * configured username (never silently switches accounts).
 */
export async function collectFromGithub(
  config: ProfileConfig,
  api: GithubApi,
  previousContributions: ContributionCalendar | null,
  now: () => Date = () => new Date(),
): Promise<CollectedData> {
  const username = config.profile.username;
  const user = await api.getUser(username);
  if (user.login.toLowerCase() !== username.toLowerCase()) {
    throw new Error(`Configured username "${username}" does not match API login "${user.login}"`);
  }
  const repos = normalizeRepos(await api.listRepos(username), username, config.project_rules.public_only);
  log.info(`Fetched ${repos.length} repositories for ${user.login}`);

  const enrich = repos.filter((r) => !r.fork).slice(0, MAX_ENRICHED_REPOS);
  for (const repo of enrich) {
    try {
      repo.languages = await api.getLanguages(user.login, repo.name);
    } catch (err) {
      log.warn(`Languages unavailable for ${repo.name}: ${(err as Error).message}`);
    }
    try {
      const rel = await api.getLatestRelease(user.login, repo.name);
      if (rel) repo.latestRelease = rel;
    } catch (err) {
      log.warn(`Release lookup failed for ${repo.name}: ${(err as Error).message}`);
    }
  }

  let contributions = previousContributions;
  if (api.authenticated) {
    try {
      contributions = await api.getContributions(user.login);
    } catch (err) {
      log.warn(`Contribution calendar unavailable, keeping previous data: ${(err as Error).message}`);
    }
  } else {
    log.warn('No GITHUB_TOKEN: skipping contribution calendar (keeping previous data if any).');
  }
  return { collectedAt: now().toISOString(), user, repos, contributions };
}
