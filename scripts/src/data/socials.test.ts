import { describe, expect, it } from 'vitest';
import { ApiShapeError } from '../api/http.ts';
import { parseSocialAccounts } from '../api/parse.ts';
import { normalizeSocialProvider, resolveSocials, validateSocialUrl } from './socials.ts';

const LI = 'https://www.linkedin.com/in/mdsourov-mondol630';
const X = 'https://x.com/md_sourov630';
const FB = 'https://www.facebook.com/md.sourov.mondol630';
const IG = 'https://www.instagram.com/md.sourov.mondol630';

describe('provider mapping', () => {
  it.each([
    ['linkedin', 'linkedin'],
    ['LinkedIn', 'linkedin'],
    ['twitter', 'x'],
    ['Twitter', 'x'],
    ['x', 'x'],
    [' X ', 'x'],
    ['facebook', 'facebook'],
    ['instagram', 'instagram'],
  ])('maps %s to %s', (raw, key) => {
    expect(normalizeSocialProvider(raw)).toBe(key);
  });
  it.each(['mastodon', 'generic', 'youtube', '', 'constructor', '__proto__', 'toString'])(
    'ignores unsupported provider "%s" without throwing',
    (raw) => {
      expect(normalizeSocialProvider(raw)).toBeNull();
    },
  );
});

describe('URL validation', () => {
  it('accepts https URLs on the provider domain, including subdomains', () => {
    expect(validateSocialUrl('linkedin', LI)).toBe(LI);
    expect(validateSocialUrl('x', X)).toBe(X);
    expect(validateSocialUrl('x', 'https://twitter.com/someone')).toBe('https://twitter.com/someone');
    expect(validateSocialUrl('facebook', 'https://m.facebook.com/someone')).toBe('https://m.facebook.com/someone');
    expect(validateSocialUrl('instagram', IG)).toBe(IG);
  });
  it.each([
    ['plain http', 'linkedin', 'http://www.linkedin.com/in/a'],
    ['embedded credentials', 'linkedin', 'https://user:pw@www.linkedin.com/in/a'],
    ['custom port', 'linkedin', 'https://www.linkedin.com:8443/in/a'],
    ['other provider host', 'linkedin', 'https://x.com/a'],
    ['look-alike suffix', 'x', 'https://notx.com/a'],
    ['look-alike prefix', 'x', 'https://x.com.evil.example/a'],
    ['javascript scheme', 'instagram', 'javascript:alert(1)'],
    ['not a URL', 'facebook', 'not a url'],
    ['empty', 'facebook', ''],
    ['too long', 'linkedin', `https://www.linkedin.com/in/${'a'.repeat(300)}`],
  ] as const)('rejects %s', (_n, key, url) => {
    expect(validateSocialUrl(key, url)).toBeNull();
  });
});

describe('parseSocialAccounts', () => {
  it('maps all four supported providers and normalizes twitter to x', () => {
    const { links, ignoredProviders } = parseSocialAccounts([
      { provider: 'linkedin', url: LI },
      { provider: 'twitter', url: X },
      { provider: 'facebook', url: FB },
      { provider: 'instagram', url: IG },
    ]);
    expect(links).toEqual({ linkedin: LI, x: X, facebook: FB, instagram: IG });
    expect(ignoredProviders).toEqual([]);
  });
  it('accepts the provider name "x" as well', () => {
    expect(parseSocialAccounts([{ provider: 'x', url: X }]).links).toEqual({ x: X });
  });
  it('treats a successful empty list as "no accounts", not as an error', () => {
    expect(parseSocialAccounts([])).toEqual({ links: {}, ignoredProviders: [] });
  });
  it('ignores unknown providers, even malformed ones, without failing the rest', () => {
    const { links, ignoredProviders } = parseSocialAccounts([
      { provider: 'mastodon', url: 'https://hachyderm.io/@x' },
      { provider: 'generic', url: 42 },
      { provider: 'Bad\nName::set-output', url: null },
      { provider: 'linkedin', url: LI },
    ]);
    expect(links).toEqual({ linkedin: LI });
    expect(ignoredProviders).toEqual(['bad?name??set-output', 'generic', 'mastodon']);
  });
  it('keeps the first account when a provider is listed more than once', () => {
    const second = 'https://www.linkedin.com/in/other';
    expect(parseSocialAccounts([{ provider: 'linkedin', url: LI }, { provider: 'linkedin', url: second }]).links).toEqual({ linkedin: LI });
    expect(parseSocialAccounts([{ provider: 'twitter', url: X }, { provider: 'x', url: 'https://x.com/other' }]).links).toEqual({ x: X });
  });
  it.each([
    ['an error object', { message: 'Not Found' }],
    ['null', null],
    ['a string', 'oops'],
    ['a non-object entry', ['linkedin']],
    ['an entry without provider', [{ url: LI }]],
    ['a supported provider without url', [{ provider: 'linkedin' }]],
    ['a supported provider with an http URL', [{ provider: 'linkedin', url: 'http://www.linkedin.com/in/a' }]],
    ['a supported provider with a foreign host', [{ provider: 'facebook', url: 'https://evil.example/a' }]],
    ['one bad supported entry among good ones', [{ provider: 'linkedin', url: LI }, { provider: 'instagram', url: 'ftp://x' }]],
  ])('rejects %s so previous data is never erased by it', (_n, raw) => {
    expect(() => parseSocialAccounts(raw)).toThrow(ApiShapeError);
  });
});

describe('resolveSocials', () => {
  const configured = {
    github: 'https://github.com/itssourov13',
    linkedin: 'https://www.linkedin.com/in/old',
    x: 'https://x.com/old',
    facebook: 'https://www.facebook.com/old',
    instagram: 'https://www.instagram.com/old',
    blog: 'https://blog.example/',
    portfolio: 'https://portfolio.example/',
  };
  it('falls back to the configuration when nothing was ever fetched', () => {
    expect(resolveSocials(configured, null)).toEqual(configured);
    expect(resolveSocials(configured, undefined)).toEqual(configured);
  });
  it('replaces changed URLs and keeps manual fields', () => {
    const r = resolveSocials(configured, { linkedin: LI, x: X, facebook: FB, instagram: IG });
    expect(r).toEqual({ ...configured, linkedin: LI, x: X, facebook: FB, instagram: IG });
  });
  it('drops a synced provider that was removed from the live profile', () => {
    const r = resolveSocials(configured, { linkedin: LI });
    expect(r).toEqual({ github: configured.github, linkedin: LI, blog: configured.blog, portfolio: configured.portfolio });
    expect(r.x).toBeUndefined();
    expect(r.facebook).toBeUndefined();
    expect(r.instagram).toBeUndefined();
  });
  it('a successful empty result hides all synced providers but never github/blog/portfolio', () => {
    expect(resolveSocials(configured, {})).toEqual({ github: configured.github, blog: configured.blog, portfolio: configured.portfolio });
  });
  it('adds a provider that exists live but not in the configuration', () => {
    expect(resolveSocials({ github: configured.github }, { x: X })).toEqual({ github: configured.github, x: X });
  });
});
