import { CANONICAL_USERNAME, GITHUB_WEB } from '../constants.ts';
import type { ProfileConfig } from '../types.ts';

export class ConfigError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Invalid profile.config.yml:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

type Obj = Record<string, unknown>;
const SOCIAL_KEYS = ['github', 'linkedin', 'x', 'facebook', 'instagram', 'blog', 'portfolio'];
const QUALITY = ['auto', 'low', 'medium', 'high'];

class Ctx {
  problems: string[] = [];
  fail(path: string, msg: string): void {
    this.problems.push(`${path}: ${msg}`);
  }
}

function obj(c: Ctx, v: unknown, path: string, allowed: string[]): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    c.fail(path, 'must be a mapping');
    return {};
  }
  const o = v as Obj;
  for (const k of Object.keys(o)) if (!allowed.includes(k)) c.fail(`${path}.${k}`, 'unknown key');
  return o;
}

function str(c: Ctx, o: Obj, key: string, path: string, opts: { optional?: boolean; max?: number } = {}): string {
  const v = o[key];
  const p = `${path}.${key}`;
  if (v === undefined || v === null) {
    if (!opts.optional) c.fail(p, 'is required');
    return '';
  }
  if (typeof v !== 'string') {
    c.fail(p, 'must be a string');
    return '';
  }
  const s = v.trim();
  if (!opts.optional && s.length === 0) c.fail(p, 'must not be empty');
  if (s.length > (opts.max ?? 200)) c.fail(p, `must be at most ${opts.max ?? 200} characters`);
  return s;
}

function bool(c: Ctx, o: Obj, key: string, path: string, def: boolean): boolean {
  const v = o[key];
  if (v === undefined) return def;
  if (typeof v !== 'boolean') {
    c.fail(`${path}.${key}`, 'must be true or false');
    return def;
  }
  return v;
}

function int(c: Ctx, o: Obj, key: string, path: string, def: number, min: number, max: number): number {
  const v = o[key];
  if (v === undefined) return def;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    c.fail(`${path}.${key}`, `must be an integer between ${min} and ${max}`);
    return def;
  }
  return v;
}

function strList(c: Ctx, o: Obj, key: string, path: string, maxItems: number, maxLen: number): string[] {
  const v = o[key];
  const p = `${path}.${key}`;
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    c.fail(p, 'must be a list of strings');
    return [];
  }
  if (v.length > maxItems) c.fail(p, `at most ${maxItems} entries`);
  const out: string[] = [];
  v.forEach((item, i) => {
    if (typeof item !== 'string' || item.trim() === '') c.fail(`${p}[${i}]`, 'must be a non-empty string');
    else if (item.length > maxLen) c.fail(`${p}[${i}]`, `must be at most ${maxLen} characters`);
    else out.push(item.trim());
  });
  return out;
}

/** https-only, no embedded credentials. Returns '' for empty optional values. */
export function checkHttpsUrl(c: Ctx, value: string, path: string): string {
  if (value === '') return '';
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') c.fail(path, 'must be an https:// URL');
    else if (u.username || u.password) c.fail(path, 'must not contain credentials');
    else if (value.length > 300) c.fail(path, 'URL too long');
    else return u.href;
  } catch {
    c.fail(path, 'is not a valid URL');
  }
  return '';
}

/** Repo-relative path: no absolute paths, no `..`, no backslashes, conservative charset. */
export function checkRelPath(c: Ctx, value: string, path: string): string {
  if (value === '') return '';
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.startsWith('/') || value.split('/').includes('..')) {
    c.fail(path, 'must be a safe repository-relative path (letters, digits, . _ - /; no "..")');
    return '';
  }
  return value;
}

export function validateConfig(raw: unknown): ProfileConfig {
  const c = new Ctx();
  const top = obj(c, raw, 'config', [
    'profile', 'socials', 'focus', 'featured_repositories', 'project_rules', 'content', 'media', 'world',
  ]);

  const pRaw = obj(c, top.profile, 'profile', [
    'username', 'profile_url', 'display_name', 'short_name', 'headline', 'location', 'website', 'photo_alt', 'bio',
  ]);
  const username = str(c, pRaw, 'username', 'profile', { max: 39 });
  if (username && username.toLowerCase() !== CANONICAL_USERNAME) {
    c.fail('profile.username', `must be "${CANONICAL_USERNAME}" (canonical account; see HANDOFF.md to change it deliberately)`);
  }
  const profileUrl = checkHttpsUrl(c, str(c, pRaw, 'profile_url', 'profile'), 'profile.profile_url');
  if (profileUrl && profileUrl.replace(/\/$/, '').toLowerCase() !== `${GITHUB_WEB}/${CANONICAL_USERNAME}`) {
    c.fail('profile.profile_url', `must be ${GITHUB_WEB}/${CANONICAL_USERNAME}`);
  }
  const bio = strList(c, pRaw, 'bio', 'profile', 4, 400);
  const profile = {
    username,
    profile_url: profileUrl,
    display_name: str(c, pRaw, 'display_name', 'profile', { max: 80 }),
    short_name: str(c, pRaw, 'short_name', 'profile', { max: 40 }),
    headline: str(c, pRaw, 'headline', 'profile', { max: 120 }),
    location: str(c, pRaw, 'location', 'profile', { optional: true, max: 80 }),
    website: checkHttpsUrl(c, str(c, pRaw, 'website', 'profile', { optional: true, max: 300 }), 'profile.website'),
    photo_alt: str(c, pRaw, 'photo_alt', 'profile', { optional: true, max: 160 }),
    bio,
  };

  const sRaw = obj(c, top.socials ?? {}, 'socials', SOCIAL_KEYS);
  const socials: Record<string, string> = {};
  for (const k of SOCIAL_KEYS) {
    const url = checkHttpsUrl(c, str(c, sRaw, k, 'socials', { optional: true, max: 300 }), `socials.${k}`);
    if (url) socials[k] = url;
  }

  const focus = strList(c, top, 'focus', 'config', 12, 60);
  const featured = strList(c, top, 'featured_repositories', 'config', 24, 100);
  featured.forEach((n, i) => {
    if (!/^[A-Za-z0-9._-]+$/.test(n)) c.fail(`featured_repositories[${i}]`, 'not a valid repository name');
  });

  const prRaw = obj(c, top.project_rules ?? {}, 'project_rules', [
    'latest_limit', 'featured_limit', 'exclude_forks', 'exclude_archived', 'public_only',
  ]);
  const project_rules = {
    latest_limit: int(c, prRaw, 'latest_limit', 'project_rules', 6, 0, 24),
    featured_limit: int(c, prRaw, 'featured_limit', 'project_rules', 6, 0, 12),
    exclude_forks: bool(c, prRaw, 'exclude_forks', 'project_rules', true),
    exclude_archived: bool(c, prRaw, 'exclude_archived', 'project_rules', true),
    public_only: bool(c, prRaw, 'public_only', 'project_rules', true),
  };

  const cRaw = obj(c, top.content ?? {}, 'content', [
    'show_constellation', 'show_terrain', 'show_intelligence', 'show_language_galaxy', 'show_activity_pulse',
  ]);
  const content = {
    show_constellation: bool(c, cRaw, 'show_constellation', 'content', true),
    show_terrain: bool(c, cRaw, 'show_terrain', 'content', true),
    show_intelligence: bool(c, cRaw, 'show_intelligence', 'content', true),
    show_language_galaxy: bool(c, cRaw, 'show_language_galaxy', 'content', true),
    show_activity_pulse: bool(c, cRaw, 'show_activity_pulse', 'content', true),
  };

  const mRaw = obj(c, top.media ?? {}, 'media', ['profile_image', 'hero_animation', 'intro_video', 'intro_video_url']);
  const media = {
    profile_image: checkRelPath(c, str(c, mRaw, 'profile_image', 'media', { optional: true }), 'media.profile_image'),
    hero_animation: checkRelPath(c, str(c, mRaw, 'hero_animation', 'media', { optional: true }), 'media.hero_animation'),
    intro_video: checkRelPath(c, str(c, mRaw, 'intro_video', 'media', { optional: true }), 'media.intro_video'),
    intro_video_url: checkHttpsUrl(c, str(c, mRaw, 'intro_video_url', 'media', { optional: true, max: 300 }), 'media.intro_video_url'),
  };

  const wRaw = obj(c, top.world ?? {}, 'world', ['enabled', 'title', 'url', 'reduced_motion_default', 'quality']);
  const quality = str(c, wRaw, 'quality', 'world', { optional: true }) || 'auto';
  if (!QUALITY.includes(quality)) c.fail('world.quality', `must be one of ${QUALITY.join(', ')}`);
  const world = {
    enabled: bool(c, wRaw, 'enabled', 'world', true),
    title: str(c, wRaw, 'title', 'world', { optional: true, max: 80 }) || 'SOUROV // DIGITAL WORLD',
    url: checkHttpsUrl(c, str(c, wRaw, 'url', 'world', { optional: true, max: 300 }), 'world.url'),
    reduced_motion_default: bool(c, wRaw, 'reduced_motion_default', 'world', false),
    quality: (QUALITY.includes(quality) ? quality : 'auto') as ProfileConfig['world']['quality'],
  };
  if (world.enabled && !world.url) c.fail('world.url', 'is required when world.enabled is true');

  if (c.problems.length > 0) throw new ConfigError(c.problems);
  return { profile, socials, focus, featured_repositories: featured, project_rules, content, media, world };
}
