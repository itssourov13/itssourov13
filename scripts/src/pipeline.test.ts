import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixtureData } from '../fixtures/index.ts';
import { validateConfig } from './config/schema.ts';
import type { CollectedData } from './types.ts';
import type { MediaState } from './data/media.ts';
import { inspectMedia } from './data/media.ts';
import { buildOutputs, diffOutputs, writeOutputs } from './pipeline.ts';
import { checkLinks, checkSecrets, findLocalRefs, scanForSecrets } from './validation/checks.ts';

const config = validateConfig({
  profile: {
    username: 'itssourov13',
    profile_url: 'https://github.com/itssourov13',
    display_name: 'Md Sourov Mondol',
    short_name: 'Sourov',
    headline: 'Security',
    bio: ['Hello & welcome'],
  },
  featured_repositories: ['fixture-scanner', 'fixture-os'],
  focus: ['AppSec'],
  socials: { github: 'https://github.com/itssourov13' },
  world: { url: 'https://itssourov13.github.io/itssourov13/' },
});
const noMedia: MediaState = { warnings: [] };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'profile-'));

describe('generation', () => {
  it('is deterministic', () => {
    const a = buildOutputs(config, fixtureData(), noMedia).files;
    const b = buildOutputs(config, fixtureData(), noMedia).files;
    expect(a).toEqual(b);
  });
  it('renders a valid state before any data is collected, without fabricated metrics', () => {
    const { files } = buildOutputs(config, null, noMedia);
    const readme = files.find((f) => f.path === 'README.md')!.content;
    expect(readme).toContain('Awaiting first data collection');
    expect(readme).not.toMatch(/followers|stars received/i);
    expect(files.some((f) => f.path.endsWith('contribution-terrain.svg'))).toBe(false);
    JSON.parse(files.find((f) => f.path === 'data/generated-profile.json')!.content);
  });
  it('never creates a card for the profile repository', () => {
    const { files } = buildOutputs(
      { ...config, featured_repositories: ['fixture-scanner'] },
      fixtureData(),
      noMedia,
    );
    expect(files.some((f) => f.path.endsWith('/itssourov13.svg'))).toBe(false);
    const readme = files.find((f) => f.path === 'README.md')!.content;
    expect(readme).not.toContain('repos/itssourov13/itssourov13');
  });
  it('escapes hostile repository metadata', () => {
    const data = fixtureData();
    data.repos[0]!.description = '<script>alert(1)</script> | **x** [a](javascript:alert(1))';
    data.repos[0]!.topics = ['"><svg onload=alert(1)>'];
    const { files } = buildOutputs(config, data, noMedia);
    for (const f of files.filter((x) => x.path.endsWith('.svg') || x.path === 'README.md')) {
      expect(f.content).not.toContain('<script>');
      expect(f.content).not.toContain('<svg onload');
    }
  });
  it('writes only what it should, removes stale SVGs, and passes the sync/link/secret checks', () => {
    const root = tmp();
    const { files } = buildOutputs(config, fixtureData(), noMedia);
    fs.mkdirSync(path.join(root, 'assets/generated'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets/generated/stale.svg'), '<svg/>');
    fs.writeFileSync(path.join(root, 'assets/generated/keep.png'), 'x');
    writeOutputs(root, files);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/ARCHITECTURE.md'), '# x');
    expect(fs.existsSync(path.join(root, 'assets/generated/stale.svg'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'assets/generated/keep.png'))).toBe(true);
    expect(diffOutputs(root, files)).toEqual([]);
    expect(checkLinks(root)).toEqual([]);
    expect(checkSecrets(root)).toEqual([]);
    fs.appendFileSync(path.join(root, 'README.md'), 'x');
    expect(diffOutputs(root, files)).toEqual(['out of date: README.md']);
  });
  it('detects broken local references and secret-looking values', () => {
    const root = tmp();
    fs.writeFileSync(
      path.join(root, 'README.md'),
      '<img src="assets/missing.svg"> [x](docs/none.md) [ok](https://example.com)',
    );
    expect(checkLinks(root)).toHaveLength(2);
    expect(findLocalRefs('<a href="#a"><img src="a/b.svg?x=1">')).toEqual(['a/b.svg']);
    expect(scanForSecrets('token ghp_' + 'A'.repeat(36))).toContain('GitHub token');
    expect(scanForSecrets('nothing here')).toEqual([]);
  });
});

describe('README project sections (phase 2)', () => {
  const readme = (data = fixtureData()) =>
    buildOutputs(config, data, noMedia).files.find((f) => f.path === 'README.md')!.content;
  it('shows a status column and topic tags in Latest, backed by real data', () => {
    const r = readme();
    expect(r).toContain('| Repository | Description | Language | Status | Last push |');
    expect(r).toMatch(/\| Active \| 2026-01-02 \|/);
    expect(r).toContain('`security`');
  });
  it('keeps Featured, Latest and Archived & excluded as separate sections', () => {
    const data = fixtureData();
    data.repos.push({
      ...data.repos[1]!,
      name: 'fixture-archived',
      fullName: 'itssourov13/fixture-archived',
      url: 'https://github.com/itssourov13/fixture-archived',
      archived: true,
    });
    const r = readme(data);
    const iFeat = r.indexOf('## Featured work');
    const iLatest = r.indexOf('## Recent work');
    const iExcl = r.indexOf('Archived &amp; excluded');
    expect(iFeat).toBeLessThan(iLatest);
    expect(iLatest).toBeLessThan(iExcl);
    expect(r.slice(iLatest, iExcl)).not.toContain('fixture-archived');
    expect(r.slice(iExcl)).toContain('fixture-archived');
    expect(r.slice(iExcl)).toContain('| Fork |');
  });
  it('omits the excluded block when nothing is excluded', () => {
    const data = fixtureData();
    data.repos = data.repos.filter((p) => !p.fork);
    expect(readme(data)).not.toContain('Archived &amp; excluded');
  });
  it('escapes hostile topics and descriptions in the Latest table', () => {
    const data = fixtureData();
    data.repos[0]!.topics = ['x|y', '<img src=x>'];
    data.repos[0]!.description = '| injected | cell <b>bold</b>';
    const r = readme(data);
    const latestRow = r
      .split('\n')
      .find((l) => l.includes('[fixture-scanner]') && l.startsWith('|'))!;
    expect(latestRow).not.toContain('<b>');
    expect(latestRow).not.toContain('<img src=x>');
    expect(latestRow).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect((latestRow.match(/(?<!\\)\|/g) ?? []).length).toBe(6);
  });
  it('shows an archived marker on featured cards', () => {
    const data = fixtureData();
    data.repos[0]!.archived = true;
    const svg = buildOutputs(
      { ...config, featured_repositories: ['fixture-scanner'] },
      data,
      noMedia,
    ).files.find((f) => f.path.endsWith('cards/fixture-scanner.svg'))!.content;
    expect(svg).toContain('ARCHIVED');
  });
  it('is byte-identical across runs with the same data', () => {
    expect(readme()).toBe(readme());
  });
});

describe('cinematic section', () => {
  const files = (cfg = config, media: MediaState = noMedia) =>
    buildOutputs(cfg, fixtureData(), media).files;
  const has = (fs_: { path: string }[], suffix: string) => fs_.some((f) => f.path.endsWith(suffix));
  it('uses the generated illustration and a caption strip by default', () => {
    const out = files();
    const r = out.find((f) => f.path === 'README.md')!.content;
    expect(has(out, 'cinematic-night-city.svg')).toBe(true);
    expect(out.find((f) => f.path.endsWith('cinematic-caption.svg'))!.content).toContain(
      'ILLUSTRATED FRAME',
    );
    expect(r).toContain('## After hours');
    expect(r).toContain('cinematic-night-city.svg');
  });
  it('swaps in a real photo without generating the placeholder and keeps the same caption strip', () => {
    const media: MediaState = {
      warnings: [],
      cinematicImage: { path: 'assets/source/cinematic.jpg', bytes: 1000 },
    };
    const out = files(config, media);
    const r = out.find((f) => f.path === 'README.md')!.content;
    expect(has(out, 'cinematic-night-city.svg')).toBe(false);
    expect(r).toContain('src="assets/source/cinematic.jpg"');
    expect(r).toContain('cinematic-caption.svg');
    expect(out.find((f) => f.path.endsWith('cinematic-caption.svg'))!.content).toContain(
      'PHOTOGRAPH',
    );
  });
  it('can be disabled entirely', () => {
    const out = files({ ...config, cinematic: { ...config.cinematic, enabled: false } });
    expect(has(out, 'cinematic-night-city.svg')).toBe(false);
    expect(has(out, 'cinematic-caption.svg')).toBe(false);
    expect(out.find((f) => f.path === 'README.md')!.content).not.toContain('## After hours');
  });
  it('keeps the V3 story order', () => {
    const r = buildOutputs(config, fixtureData(), noMedia).files.find(
      (f) => f.path === 'README.md',
    )!.content;
    const order = [
      '## Focus',
      '## Featured work',
      '## After hours',
      '## GitHub intelligence',
      '## Recent work',
      '## Explore',
    ].map((h) => r.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('makes the Digital World CTA explicit and mobile-friendly', () => {
    const out = buildOutputs(config, fixtureData(), noMedia).files;
    const readme = out.find((f) => f.path === 'README.md')!.content;
    const cta = out.find((f) => f.path === 'assets/generated/enter-world.svg')!.content;
    expect(cta).toContain('INTERACTIVE 3D EXPERIENCE');
    expect(cta).toContain('CLICK / TAP');
    expect(cta).toContain('OPEN 3D WORLD  —&gt;');
    expect(cta).not.toContain('launch-arrow');
    expect(readme).toContain('↗ Open the 3D World');
    expect(readme).not.toContain('interactive WebGL experience</p>');
  });
});

describe('media handling', () => {
  const mediaCfg = {
    profile_image: 'assets/source/profile.png',
    hero_animation: 'assets/source/intro.gif',
    intro_video: 'assets/source/intro.mp4',
    intro_video_url: '',
    cinematic_image: 'assets/source/cinematic.jpg',
  };
  const png = (w: number, h: number) => {
    const b = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };
  it('treats absent media as a normal fallback (no warnings, no image in README)', () => {
    const root = tmp();
    const media = inspectMedia(root, mediaCfg);
    expect(media.profileImage).toBeUndefined();
    expect(media.warnings).toEqual([]);
    const readme = buildOutputs(config, null, media).files.find(
      (f) => f.path === 'README.md',
    )!.content;
    expect(readme).not.toContain('assets/source');
  });
  it('accepts a valid PNG and rejects disguised or out-of-range files', () => {
    const root = tmp();
    fs.mkdirSync(path.join(root, 'assets/source'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets/source/profile.png'), png(400, 400));
    const ok = inspectMedia(root, mediaCfg);
    expect(ok.profileImage).toMatchObject({
      path: 'assets/source/profile.png',
      width: 400,
      height: 400,
    });
    expect(
      buildOutputs(config, null, ok).files.find((f) => f.path === 'README.md')!.content,
    ).toContain('assets/source/profile.png');
    fs.writeFileSync(
      path.join(root, 'assets/source/profile.png'),
      'not an image at all, just text',
    );
    expect(inspectMedia(root, mediaCfg).warnings.join()).toContain('not a supported format');
    fs.writeFileSync(path.join(root, 'assets/source/profile.png'), png(10, 10));
    expect(inspectMedia(root, mediaCfg).profileImage).toBeUndefined();
  });
  it('refuses paths outside the repository', () => {
    const media = inspectMedia(tmp(), { ...mediaCfg, profile_image: '../outside.png' });
    expect(media.profileImage).toBeUndefined();
    expect(media.warnings.join()).toContain('outside the repository');
  });
});

describe('live social sync in generated output', () => {
  const manual = {
    github: 'https://github.com/itssourov13',
    blog: 'https://blog.example/',
    portfolio: 'https://portfolio.example/',
  };
  const stale = {
    linkedin: 'https://www.linkedin.com/in/old-handle',
    x: 'https://x.com/old_handle',
    facebook: 'https://www.facebook.com/old.handle',
    instagram: 'https://www.instagram.com/old.handle',
  };
  const cfg = { ...config, socials: { ...manual, ...stale } };
  const build = (socials: CollectedData['socials'], c = cfg) => {
    const { files } = buildOutputs(c, { ...fixtureData(), socials }, noMedia);
    const readme = files.find((f) => f.path === 'README.md')!.content;
    const world = JSON.parse(files.find((f) => f.path === 'data/generated-profile.json')!.content);
    return { files, readme, world, worldSocials: world.profile.socials as Record<string, string> };
  };
  /** [label, url] pairs from the README "Connect" line. */
  const connect = (readme: string) => {
    const line = readme.split('\n').find((l) => l.includes('<b>Connect</b>')) ?? '';
    return [...line.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[2]!, m[1]!]);
  };

  it('replaces outdated URLs in both the README and the world JSON, from the same data', () => {
    const live = {
      linkedin: 'https://www.linkedin.com/in/new-handle',
      x: 'https://x.com/new_handle',
      facebook: 'https://www.facebook.com/new.handle',
      instagram: 'https://www.instagram.com/new.handle',
    };
    const { readme, worldSocials } = build(live);
    expect(worldSocials).toEqual({ ...manual, ...live });
    for (const url of Object.values(stale)) {
      expect(readme).not.toContain(url);
      expect(JSON.stringify(worldSocials)).not.toContain(url);
    }
    // Every social URL in the world JSON is rendered in the README (and vice versa), under the right label.
    const links = connect(readme);
    expect(links).toContainEqual(['LinkedIn', live.linkedin]);
    expect(links).toContainEqual(['X', live.x]);
    expect(links).toContainEqual(['Facebook', live.facebook]);
    expect(links).toContainEqual(['Instagram', live.instagram]);
    expect(links.map(([, u]) => u).sort()).toEqual(Object.values(worldSocials).sort());
  });
  it('removes a provider that was deleted from the live profile everywhere, and keeps manual links', () => {
    const { readme, worldSocials } = build({ linkedin: 'https://www.linkedin.com/in/new-handle' });
    expect(Object.keys(worldSocials).sort()).toEqual(['blog', 'github', 'linkedin', 'portfolio']);
    expect(readme).not.toContain('x.com/old_handle');
    expect(readme).not.toContain('facebook.com');
    expect(readme).not.toContain('instagram.com');
    expect(connect(readme).map(([l]) => l)).toEqual(['GitHub', 'LinkedIn', 'Blog', 'Portfolio']);
  });
  it('treats a successful empty result as "no accounts" (all synced providers hidden)', () => {
    const { readme, worldSocials } = build({});
    expect(worldSocials).toEqual(manual);
    expect(connect(readme).map(([l]) => l)).toEqual(['GitHub', 'Blog', 'Portfolio']);
  });
  it('keeps using profile.config.yml until a fetch has succeeded, byte-identical to the legacy output', () => {
    const legacy = buildOutputs(cfg, fixtureData(), noMedia).files; // no `socials` property at all
    const never = buildOutputs(cfg, { ...fixtureData(), socials: null }, noMedia).files;
    expect(never).toEqual(legacy);
    const { worldSocials, readme } = build(null);
    expect(worldSocials).toEqual({ ...manual, ...stale });
    expect(readme).toContain(stale.linkedin);
  });
  it('does not touch anything else: only README.md and data/generated-profile.json differ', () => {
    const before = buildOutputs(cfg, fixtureData(), noMedia).files;
    const after = build({ linkedin: 'https://www.linkedin.com/in/new-handle' }).files;
    expect(after.map((f) => f.path)).toEqual(before.map((f) => f.path));
    const changed = after.filter((f, i) => f.content !== before[i]!.content).map((f) => f.path);
    expect(changed).toEqual(['README.md', 'data/generated-profile.json']);
  });
  it('is deterministic and offline: no network access during generation', () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('network access during generate');
    }) as unknown as typeof fetch;
    try {
      const a = build({ x: 'https://x.com/new_handle' }).files;
      const b = build({ x: 'https://x.com/new_handle' }).files;
      expect(a).toEqual(b);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  it('writes outputs that pass the sync, link and secret checks', () => {
    const root = tmp();
    const { files } = build({ linkedin: 'https://www.linkedin.com/in/new-handle' });
    writeOutputs(root, files);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/ARCHITECTURE.md'), '# x');
    expect(diffOutputs(root, files)).toEqual([]);
    expect(checkLinks(root)).toEqual([]);
    expect(checkSecrets(root)).toEqual([]);
  });
});
