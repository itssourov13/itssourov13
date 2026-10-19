import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixtureData } from '../../fixtures/index.ts';
import { GithubApi } from '../api/github.ts';
import { validateConfig } from '../config/schema.ts';
import type { CollectedData, SocialLinks } from '../types.ts';
import { collectFromGithub, collectSocials } from './collect.ts';
import { FILES, loadCollected, saveCollected } from './store.ts';

const LI = 'https://www.linkedin.com/in/mdsourov-mondol630';
const X = 'https://x.com/md_sourov630';
const OLD: SocialLinks = {
  linkedin: 'https://www.linkedin.com/in/old',
  x: 'https://x.com/old',
  facebook: 'https://www.facebook.com/old',
  instagram: 'https://www.instagram.com/old',
};
const config = validateConfig({
  profile: { username: 'itssourov13', profile_url: 'https://github.com/itssourov13', display_name: 'D', short_name: 'S', headline: 'H', bio: ['b'] },
  world: { url: 'https://itssourov13.github.io/itssourov13/' },
});
const noSleep = async () => {};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Mock GitHub: user + empty repo list, and a programmable social_accounts endpoint. No live network. */
function mockApi(social: () => Response) {
  const fetchImpl = (async (url: string) => {
    const p = new URL(url).pathname;
    if (p === '/users/itssourov13') return json({ login: 'itssourov13', html_url: 'https://github.com/itssourov13', public_repos: 0, followers: 0, created_at: '2025-01-01T00:00:00Z' });
    if (p === '/users/itssourov13/repos') return json([]);
    if (p === '/users/itssourov13/social_accounts') return social();
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
  return new GithubApi({ fetchImpl, sleep: noSleep });
}
const collect = (social: () => Response, previous: SocialLinks | null = null) =>
  collectFromGithub(config, mockApi(social), null, () => new Date('2026-02-01T00:00:00Z'), previous);

describe('social collection', () => {
  it('a successful response replaces previous links (changed URLs win)', async () => {
    const data = await collect(() => json([{ provider: 'linkedin', url: LI }, { provider: 'twitter', url: X }]), OLD);
    expect(data.socials).toEqual({ linkedin: LI, x: X });
  });
  it('a successful empty response removes previously synced links (not treated as a failure)', async () => {
    expect((await collect(() => json([]), OLD)).socials).toEqual({});
  });
  it('keeps last-known-good links when the endpoint keeps failing; the rest of collection still succeeds', async () => {
    const data = await collect(() => new Response('x', { status: 502 }), OLD);
    expect(data.socials).toEqual(OLD);
    expect(data.user.login).toBe('itssourov13');
  });
  it('keeps last-known-good links on an invalid 200 response', async () => {
    expect((await collect(() => json({ message: 'weird' }), OLD)).socials).toEqual(OLD);
    expect((await collect(() => json([{ provider: 'linkedin', url: 'http://evil.example/x' }]), OLD)).socials).toEqual(OLD);
  });
  it('falls back to the configuration (null) when it fails and nothing was ever stored', async () => {
    expect((await collect(() => new Response('x', { status: 500 }))).socials).toBeNull();
  });
  it('does not crash on unknown providers', async () => {
    const data = await collect(() => json([{ provider: 'mastodon', url: 'https://example.social/@a' }, { provider: 'linkedin', url: LI }]));
    expect(data.socials).toEqual({ linkedin: LI });
  });
  it('collectSocials returns previous on failure and live data on success', async () => {
    expect(await collectSocials(mockApi(() => new Response('x', { status: 500 })), 'itssourov13', OLD)).toEqual(OLD);
    expect(await collectSocials(mockApi(() => json([{ provider: 'x', url: X }])), 'itssourov13', OLD)).toEqual({ x: X });
  });
});

describe('social storage', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'socials-'));
  const withSocials = (s: CollectedData['socials']): CollectedData => ({ ...fixtureData(), socials: s });

  it('stays backward compatible: legacy data (no socials file) loads as null and is not rewritten', () => {
    const dir = tmp();
    saveCollected(dir, fixtureData()); // legacy shape: no `socials` property
    expect(fs.existsSync(path.join(dir, FILES.socials))).toBe(false);
    expect(loadCollected(dir)!.socials).toBeNull();
    expect(saveCollected(dir, { ...fixtureData(), collectedAt: '2027-01-01T00:00:00.000Z', socials: null })).toEqual({ changed: false });
    expect(fs.existsSync(path.join(dir, FILES.socials))).toBe(false);
  });
  it('round-trips links, including an empty (successfully none) result', () => {
    const dir = tmp();
    expect(saveCollected(dir, withSocials({ linkedin: LI, x: X })).changed).toBe(true);
    expect(loadCollected(dir)!.socials).toEqual({ linkedin: LI, x: X });
    expect(saveCollected(dir, withSocials({}))).toEqual({ changed: true });
    expect(fs.existsSync(path.join(dir, FILES.socials))).toBe(true);
    expect(loadCollected(dir)!.socials).toEqual({});
  });
  it('adds the file on the first successful sync of an existing checkout, then goes quiet', () => {
    const dir = tmp();
    saveCollected(dir, fixtureData());
    expect(saveCollected(dir, withSocials({ linkedin: LI })).changed).toBe(true);
    expect(saveCollected(dir, { ...withSocials({ linkedin: LI }), collectedAt: '2028-01-01T00:00:00.000Z' })).toEqual({ changed: false });
    expect(saveCollected(dir, withSocials({ linkedin: 'https://www.linkedin.com/in/new' })).changed).toBe(true);
  });
  it('writes the file deterministically (sorted keys, schemaVersion)', () => {
    const dir = tmp();
    saveCollected(dir, withSocials({ x: X, linkedin: LI }));
    expect(fs.readFileSync(path.join(dir, FILES.socials), 'utf8')).toBe(
      `{\n  "accounts": {\n    "linkedin": "${LI}",\n    "x": "${X}"\n  },\n  "schemaVersion": 1\n}\n`,
    );
  });
  it('fails closed on a corrupt or unsafe stored file', () => {
    const dir = tmp();
    saveCollected(dir, withSocials({ linkedin: LI }));
    const file = path.join(dir, FILES.socials);
    for (const body of [
      '{"accounts":{"mastodon":"https://a.example/"}}',
      '{"accounts":{"linkedin":"http://www.linkedin.com/in/a"}}',
      '{"accounts":{"linkedin":"https://evil.example/in/a"}}',
      '{"accounts":[]}',
      '{"schemaVersion":1}',
      '[]',
    ]) {
      fs.writeFileSync(file, body);
      expect(() => loadCollected(dir)).toThrow(/github\.socials\.json/);
    }
  });
});
