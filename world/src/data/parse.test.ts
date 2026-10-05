import { describe, expect, it } from 'vitest';
import { parseProfile, projectEdges, sceneProjects } from './parse.ts';

const valid = () => ({
  schemaVersion: 1, status: 'ok', collectedAt: '2026-01-01T00:00:00.000Z', fixture: false,
  profile: { username: 'itssourov13', displayName: 'D', shortName: 'S', headline: 'H', location: '', bio: [], profileUrl: 'https://github.com/itssourov13', focus: [], socials: { github: 'https://github.com/itssourov13' } },
  world: { title: 'T', quality: 'auto', reducedMotionDefault: false },
  media: { profileImage: null, introVideoUrl: null }, stats: null,
  featured: [{ name: 'a', url: 'https://github.com/itssourov13/a', description: '', language: 'Go', topics: ['x'], stars: 0, forks: 0, createdAt: '2025-01-01T00:00:00Z', pushedAt: '2025-01-01T00:00:00Z', release: null }],
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
  it('derives edges and unique scene projects', () => {
    const p = parseProfile(valid());
    expect(projectEdges(sceneProjects(p))).toEqual([[0, 1]]);
    p.latest.push({ ...p.featured[0]! });
    expect(sceneProjects(p)).toHaveLength(2);
  });
});
