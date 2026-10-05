import { parseProfile } from './parse.ts';
import type { WorldProfile } from './parse.ts';

/** Single fetch of the generated JSON, resolved against the deployment base path (never a root-absolute URL). */
export async function loadProfile(signal?: AbortSignal): Promise<WorldProfile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/generated-profile.json`, { signal, cache: 'no-cache' });
  if (!res.ok) throw new Error(`Profile data unavailable (HTTP ${res.status})`);
  return parseProfile(await res.json());
}
