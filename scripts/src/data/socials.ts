import type { CollectedData, ProfileConfig, SocialLinks, SyncedSocialKey } from '../types.ts';

/** Providers synchronised from the live GitHub profile. Everything else in `socials` stays manual. */
export const SYNCED_SOCIAL_KEYS: readonly SyncedSocialKey[] = [
  'linkedin',
  'x',
  'facebook',
  'instagram',
];

/** GitHub provider name (lower-case) → normalized key. GitHub reports X as "twitter"; "x" is accepted too. */
const PROVIDER_KEYS = new Map<string, SyncedSocialKey>([
  ['linkedin', 'linkedin'],
  ['twitter', 'x'],
  ['x', 'x'],
  ['facebook', 'facebook'],
  ['instagram', 'instagram'],
]);

/** A URL for a provider must be on one of its own domains (or a subdomain such as www. / m.). */
const PROVIDER_HOSTS: Record<SyncedSocialKey, readonly string[]> = {
  linkedin: ['linkedin.com'],
  x: ['x.com', 'twitter.com'],
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
};

/** Same cap as `socials.*` in profile.config.yml. */
const MAX_URL_LENGTH = 300;

/** Map a GitHub provider name to a synced key; `null` for unsupported providers (which are ignored). */
export function normalizeSocialProvider(provider: string): SyncedSocialKey | null {
  return PROVIDER_KEYS.get(provider.trim().toLowerCase()) ?? null;
}

/**
 * https only, no credentials or custom port, and a host that belongs to the provider.
 * Returns the normalized URL, or `null` when the value must not be trusted.
 */
export function validateSocialUrl(key: SyncedSocialKey, value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!PROVIDER_HOSTS[key].some((d) => host === d || host.endsWith(`.${d}`))) return null;
  return url.href.length <= MAX_URL_LENGTH ? url.href : null;
}

/**
 * Merge the configured socials with live GitHub data. Once a fetch has succeeded the live
 * profile is authoritative for the synced providers: configured values are replaced, and a
 * provider missing from the live profile is hidden. `github`, `blog`, `portfolio` (and any
 * other key) always come from the config. Without live data the config is used unchanged.
 */
export function resolveSocials(
  configured: Record<string, string>,
  live: SocialLinks | null | undefined,
): Record<string, string> {
  if (!live) return configured;
  const manual = Object.entries(configured).filter(
    ([k]) => !(SYNCED_SOCIAL_KEYS as readonly string[]).includes(k),
  );
  return { ...Object.fromEntries(manual), ...live };
}

/** Config with `socials` resolved against the collected data; the single place this merge happens. */
export function withLiveSocials(config: ProfileConfig, data: CollectedData | null): ProfileConfig {
  if (!data?.socials) return config;
  return { ...config, socials: resolveSocials(config.socials, data.socials) };
}
