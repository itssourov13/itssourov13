import { GithubApi } from '../api/github.ts';
import { MAX_ENRICHED_REPOS } from '../constants.ts';
import type { CollectedData, ContributionCalendar, ProfileConfig, SocialLinks } from '../types.ts';
import { log } from '../util/log.ts';
import { normalizeRepos } from './normalize.ts';

/**
 * Fetch the live social links. A successful response (even with no accounts) is authoritative and
 * replaces `previous`. A failed or invalid response keeps `previous`; `null` means nothing was ever
 * fetched, so profile.config.yml stays in effect.
 */
export async function collectSocials(
  api: GithubApi,
  login: string,
  previous: SocialLinks | null,
): Promise<SocialLinks | null> {
  try {
    const { links, ignoredProviders } = await api.getSocialAccounts(login);
    if (ignoredProviders.length > 0) log.info(`Ignoring unsupported social providers: ${ignoredProviders.join(', ')}`);
    log.info(`Fetched ${Object.keys(links).length} supported social link(s) for ${login}`);
    return links;
  } catch (err) {
    log.warn(`Social accounts unavailable, keeping ${previous ? 'last-known-good' : 'configured'} links: ${(err as Error).message}`);
    return previous;
  }
}

/**
 * Collect live data for the configured account. Aborts if the API login does not match the
 * configured username (never silently switches accounts).
 */
export async function collectFromGithub(
  config: ProfileConfig,
  api: GithubApi,
  previousContributions: ContributionCalendar | null,
  now: () => Date = () => new Date(),
  previousSocials: SocialLinks | null = null,
): Promise<CollectedData> {
  const username = config.profile.username;
  const user = await api.getUser(username);
  if (user.login.toLowerCase() !== username.toLowerCase()) {
    throw new Error(`Configured username "${username}" does not match API login "${user.login}"`);
  }
  const socials = await collectSocials(api, user.login, previousSocials);
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
  return { collectedAt: now().toISOString(), user, repos, contributions, socials };
}
