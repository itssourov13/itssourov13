import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './load.ts';
import { ConfigError, validateConfig } from './schema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const base = () => ({
  profile: { username: 'itssourov13', profile_url: 'https://github.com/itssourov13', display_name: 'Md Sourov Mondol', short_name: 'Sourov', headline: 'Security', bio: ['hi'] },
  world: { url: 'https://itssourov13.github.io/itssourov13/' },
});

describe('config validation', () => {
  it('accepts the repository config file', () => {
    const cfg = loadConfig(ROOT);
    expect(cfg.profile.username).toBe('itssourov13');
    expect(cfg.featured_repositories.length).toBeGreaterThan(0);
  });
  it('applies defaults', () => {
    const cfg = validateConfig(base());
    expect(cfg.project_rules.latest_limit).toBe(6);
    expect(cfg.world.quality).toBe('auto');
  });
  it('rejects a different username', () => {
    const c = base();
    c.profile.username = 'octocat';
    expect(() => validateConfig(c)).toThrow(ConfigError);
  });
  it('rejects non-https and credentialed URLs', () => {
    const c = { ...base(), socials: { x: 'http://x.com/a', linkedin: 'https://u:p@linkedin.com/a' } };
    try {
      validateConfig(c);
      expect.unreachable();
    } catch (e) {
      const msg = (e as ConfigError).problems.join('\n');
      expect(msg).toContain('socials.x');
      expect(msg).toContain('socials.linkedin');
    }
  });
  it('rejects path traversal in media paths and unknown keys', () => {
    const c = { ...base(), media: { profile_image: '../secret.png' }, typo_key: 1 };
    try {
      validateConfig(c);
      expect.unreachable();
    } catch (e) {
      const msg = (e as ConfigError).problems.join('\n');
      expect(msg).toContain('media.profile_image');
      expect(msg).toContain('typo_key');
    }
  });
});
