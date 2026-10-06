import { describe, expect, it } from 'vitest';
import { parseProfile } from '../data/parse.ts';
import { buildSceneModel, MAX_LAB } from './layout.ts';
import { availableStops, STOPS } from './stops.ts';

const base = () => ({
  schemaVersion: 1, status: 'ok', collectedAt: '2026-01-01T00:00:00.000Z', fixture: false,
  profile: { username: 'itssourov13', displayName: 'D', shortName: 'S', headline: 'H', location: '', bio: [], profileUrl: 'https://github.com/itssourov13', focus: ['AppSec'], socials: { github: 'https://github.com/itssourov13' } },
  world: { title: 'T', quality: 'auto', reducedMotionDefault: false },
  media: { profileImage: null, introVideoUrl: null }, stats: null, featured: [], latest: [], languages: null, contributions: null,
});
const ids = (raw: unknown) => availableStops(parseProfile(raw)).map((s) => s.id);

describe('camera stops only exist for zones with content', () => {
  it('offers the minimum set when there is no data', () => {
    expect(ids(base())).toEqual(['overview', 'core', 'lab', 'links']);
  });
  it('adds data-backed zones when data exists', () => {
    const proj = { name: 'a', url: 'https://github.com/itssourov13/a', description: '', language: 'Go', topics: [], stars: 0, forks: 0, createdAt: '2025-01-01T00:00:00Z', pushedAt: '2025-12-01T00:00:00Z', release: null };
    const full = { ...base(), featured: [proj], contributions: { total: 1, weeks: [[[1, 1]]], monthly: [] }, languages: { basis: 'bytes', items: [{ name: 'Go', percent: 100 }] }, media: { profileImage: { file: 'media/profile.png', alt: '' }, introVideoUrl: null } };
    expect(ids(full)).toEqual(STOPS.map((s) => s.id));
  });
  it('hides the portrait stop for a profile-image path that is not under media/', () => {
    expect(ids({ ...base(), media: { profileImage: { file: '../x.png', alt: '' }, introVideoUrl: null } })).not.toContain('portrait');
  });
  it('has unique stop ids', () => {
    expect(new Set(STOPS.map((s) => s.id)).size).toBe(STOPS.length);
  });
});

describe('scene model', () => {
  it('caps lab racks and passes through only configured links', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Focus ${i}`);
    const p = parseProfile({ ...base(), profile: { ...base().profile, focus: many } });
    const m = buildSceneModel(p, []);
    expect(m.lab).toHaveLength(MAX_LAB);
    expect(m.links).toEqual([{ key: 'github', label: 'GitHub', url: 'https://github.com/itssourov13' }]);
    expect(m.positions).toEqual([]);
  });
});
