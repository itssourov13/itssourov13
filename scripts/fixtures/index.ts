import type { CollectedData, ContributionCalendar, ContributionDay, ProjectRecord } from '../src/types.ts';

/** Deterministic PRNG (mulberry32) so fixture output is byte-stable. */
function rng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** SYNTHETIC test calendar ending on 2026-01-03 (a Saturday). Not real contribution data. */
export function fixtureCalendar(): ContributionCalendar {
  const r = rng(13);
  const weeks: ContributionDay[][] = [];
  const start = Date.UTC(2025, 0, 5); // a Sunday
  let total = 0;
  for (let w = 0; w < 52; w++) {
    const week: ContributionDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start + (w * 7 + d) * 86_400_000).toISOString().slice(0, 10);
      const burst = Math.sin(w / 5) > 0.3 ? 3 : 1;
      const count = d === 0 || d === 6 ? Math.floor(r() * 3) : Math.floor(r() * 9 * burst * (r() > 0.25 ? 1 : 0));
      const level = (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
      total += count;
      week.push({ date, count, level, weekday: d });
    }
    weeks.push(week);
  }
  return { total, weeks };
}

function repo(name: string, description: string, language: string, langs: Record<string, number>, topics: string[], pushed: string, extra: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    name, fullName: `itssourov13/${name}`, url: `https://github.com/itssourov13/${name}`, description, primaryLanguage: language,
    languages: langs, topics, stars: 0, forks: 0, createdAt: '2025-01-10T00:00:00Z', updatedAt: pushed, pushedAt: pushed,
    archived: false, fork: false, visibility: 'public', defaultBranch: 'main', ...extra,
  };
}

/** SYNTHETIC data for tests and `npm run generate:fixture`. Never committed to data/. */
export function fixtureData(): CollectedData {
  const repos = [
    repo('fixture-scanner', 'Synthetic fixture: network scanner used only for tests.', 'Python', { Python: 52000, Shell: 4000 }, ['security', 'scanner'], '2026-01-02T10:00:00Z', { stars: 4, forks: 1, latestRelease: { tag: 'v0.3.0', url: 'https://github.com/itssourov13/fixture-scanner/releases/tag/v0.3.0' } }),
    repo('fixture-notes', 'Synthetic fixture: notes app.', 'TypeScript', { TypeScript: 30000, CSS: 5000 }, ['web'], '2025-12-20T10:00:00Z', { stars: 2 }),
    repo('fixture-os', 'Synthetic fixture: a long description that should wrap across two lines and then be truncated gracefully when it exceeds the available space on a card.', 'C', { C: 18000 }, ['security', 'systems'], '2025-11-02T10:00:00Z'),
    repo('fixture-site', 'Synthetic fixture: personal site.', 'TypeScript', { TypeScript: 9000 }, ['web'], '2025-10-01T10:00:00Z'),
    repo('fixture-fork', 'Synthetic fixture: a fork.', 'Go', { Go: 1000 }, [], '2025-12-31T10:00:00Z', { fork: true }),
    repo('itssourov13', 'Profile repository (must never appear as a card).', 'Markdown', {}, [], '2026-01-03T10:00:00Z'),
  ];
  return {
    collectedAt: '2026-01-03T12:00:00.000Z',
    fixture: true,
    user: { login: 'itssourov13', name: 'Md Sourov Mondol', htmlUrl: 'https://github.com/itssourov13', publicRepos: repos.length, followers: 3, createdAt: '2022-01-01T00:00:00Z' },
    repos,
    contributions: fixtureCalendar(),
  };
}
