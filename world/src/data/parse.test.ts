import { describe, expect, it } from 'vitest';
import { parseProfile, sceneProjects } from './parse.ts';

const valid = () => ({
  schemaVersion: 1, status: 'ok', collectedAt: '2026-01-01T00:00:00.000Z', fixture: false,
  profile: { username: 'itssourov13', displayName: 'D', shortName: 'S', headline: 'H', location: '', bio: [], profileUrl: 'https://github.com/itssourov13', focus: [], socials: { github: 'https://github.com/itssourov13' } },
  world: { title: 'T', quality: 'auto', reducedMotionDefault: false },
  media: { profileImage: null, introVideoUrl: null }, stats: null,
  featured: [{ name: 'a', url: 'https://github.com/itssourov13/a', description: '', language: 'Go', topics: ['x'], stars: 0, forks: 0, createdAt: '2025-01-01T00:00:00Z', pushedAt: '2025-12-20T00:00:00Z', release: null }],
  latest: [{ name: 'b', url: 'https://github.com/itssourov13/b', description: '', language: 'Go', topics: [], stars: 0, forks: 0, createdAt: '2025-01-01T00:00:00Z', pushedAt: '2025-01-01T00:00:00Z', release: null }],
  languages: null, contributions: { total: 1, weeks: [[[1, 1]]], monthly: [] },
});

describe('world data contract', () => {
  it('parses valid data', () => {
    const p = parseProfile(valid());
    expect(p.profile.username).toBe('itssourov13');
    expect(p.contributions!.weeks[0]![0]).toEqual([1, 1]);
  });
  it('rejects wrong schema version, non-https URLs and malformed shapes', () => {
    expect(() => parseProfile({ ...valid(), schemaVersion: 2 })).toThrow();
    const bad = valid();
    bad.featured[0]!.url = 'javascript:alert(1)';
    expect(() => parseProfile(bad)).toThrow();
    expect(() => parseProfile(null)).toThrow();
    expect(() => parseProfile({ ...valid(), world: { title: 'T', quality: 'ultra' } })).toThrow();
  });
  it('derives scene, edges and activity for older JSON that lacks them (shared rules)', () => {
    const p = parseProfile(valid());
    expect(p.scene).toEqual(['a', 'b']);
    expect(p.edges).toEqual([{ a: 0, b: 1, kind: 'language', label: 'Go' }]);
    expect(p.featured[0]!.activity).toBe('active'); // 12 days before collectedAt
    expect(p.latest[0]!.activity).toBe('quiet');
    expect(sceneProjects(p).map((x) => x.name)).toEqual(['a', 'b']);
  });
  it('uses the generated scene/edges when present and rejects out-of-range edges', () => {
    const v = { ...valid(), scene: ['b', 'a'], edges: [[0, 1, 'topic', 'x']] };
    const p = parseProfile(v);
    expect(sceneProjects(p).map((x) => x.name)).toEqual(['b', 'a']);
    expect(p.edges[0]).toEqual({ a: 0, b: 1, kind: 'topic', label: 'x' });
    expect(() => parseProfile({ ...valid(), edges: [[0, 5, 'topic', 'x']] })).toThrow();
    expect(() => parseProfile({ ...valid(), edges: [[1, 0, 'topic', 'x']] })).toThrow();
    expect(() => parseProfile({ ...valid(), edges: [[0, 1, 'magic', 'x']] })).toThrow();
  });
  it('drops scene names that do not exist instead of crashing', () => {
    expect(parseProfile({ ...valid(), scene: ['a', 'ghost'], edges: [] }).scene).toEqual(['a']);
  });
  it('caps the number of scene nodes', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...valid().featured[0]!, name: `p${i}` }));
    expect(parseProfile({ ...valid(), featured: many, latest: [] }).scene).toHaveLength(12);
  });
});
