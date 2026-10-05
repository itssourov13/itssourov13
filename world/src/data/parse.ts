/** Runtime validation of data/generated-profile.json (the only data the world consumes). */
export interface WorldProject {
  name: string;
  url: string;
  description: string;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  release: string | null;
}
export interface WorldProfile {
  status: 'ok' | 'unavailable';
  collectedAt: string | null;
  fixture: boolean;
  profile: {
    username: string; displayName: string; shortName: string; headline: string; location: string;
    bio: string[]; profileUrl: string; focus: string[]; socials: Record<string, string>;
  };
  world: { title: string; quality: 'auto' | 'low' | 'medium' | 'high'; reducedMotionDefault: boolean };
  media: { profileImage: { file: string; alt: string } | null; introVideoUrl: string | null };
  stats: { publicRepos: number; followers: number; totalContributions: number | null; activeRepos90d: number; totalStars: number } | null;
  featured: WorldProject[];
  latest: WorldProject[];
  languages: { basis: 'bytes' | 'repos'; items: { name: string; percent: number }[] } | null;
  contributions: { total: number; weeks: [number, number][][]; monthly: { month: string; total: number }[] } | null;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown, what: string): Obj => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${what} must be an object`);
  return v as Obj;
};
const str = (v: unknown, what: string): string => {
  if (typeof v !== 'string') throw new Error(`${what} must be a string`);
  return v;
};
const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${what} must be a number`);
  return v;
};
const arr = (v: unknown, what: string): unknown[] => {
  if (!Array.isArray(v)) throw new Error(`${what} must be a list`);
  return v;
};
const https = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!s.startsWith('https://')) throw new Error(`${what} must be an https URL`);
  return s;
};
const strs = (v: unknown, what: string): string[] => arr(v, what).map((x, i) => str(x, `${what}[${i}]`));

function project(v: unknown, i: number): WorldProject {
  const o = obj(v, `project[${i}]`);
  return {
    name: str(o.name, 'name'), url: https(o.url, 'url'), description: str(o.description, 'description'),
    language: o.language === null ? null : str(o.language, 'language'), topics: strs(o.topics, 'topics'),
    stars: num(o.stars, 'stars'), forks: num(o.forks, 'forks'), createdAt: str(o.createdAt, 'createdAt'),
    pushedAt: str(o.pushedAt, 'pushedAt'), release: o.release === null ? null : str(o.release, 'release'),
  };
}

export function parseProfile(raw: unknown): WorldProfile {
  const r = obj(raw, 'profile data');
  if (r.schemaVersion !== 1) throw new Error('Unsupported data schema version');
  const p = obj(r.profile, 'profile');
  const w = obj(r.world, 'world');
  const q = str(w.quality, 'world.quality');
  if (!['auto', 'low', 'medium', 'high'].includes(q)) throw new Error('world.quality invalid');
  const socialsRaw = obj(p.socials, 'socials');
  const socials: Record<string, string> = {};
  for (const k of Object.keys(socialsRaw)) socials[k] = https(socialsRaw[k], `socials.${k}`);
  const m = obj(r.media, 'media');
  const img = m.profileImage ? obj(m.profileImage, 'media.profileImage') : null;
  const stats = r.stats ? obj(r.stats, 'stats') : null;
  const langs = r.languages ? obj(r.languages, 'languages') : null;
  const contrib = r.contributions ? obj(r.contributions, 'contributions') : null;
  return {
    status: r.status === 'ok' ? 'ok' : 'unavailable',
    collectedAt: r.collectedAt === null ? null : str(r.collectedAt, 'collectedAt'),
    fixture: r.fixture === true,
    profile: {
      username: str(p.username, 'username'), displayName: str(p.displayName, 'displayName'), shortName: str(p.shortName, 'shortName'),
      headline: str(p.headline, 'headline'), location: typeof p.location === 'string' ? p.location : '', bio: strs(p.bio, 'bio'),
      profileUrl: https(p.profileUrl, 'profileUrl'), focus: strs(p.focus, 'focus'), socials,
    },
    world: { title: str(w.title, 'world.title'), quality: q as WorldProfile['world']['quality'], reducedMotionDefault: w.reducedMotionDefault === true },
    media: {
      profileImage: img && /^media\/[\w.-]+$/.test(str(img.file, 'file')) ? { file: str(img.file, 'file'), alt: typeof img.alt === 'string' ? img.alt : '' } : null,
      introVideoUrl: m.introVideoUrl ? https(m.introVideoUrl, 'introVideoUrl') : null,
    },
    stats: stats
      ? {
          publicRepos: num(stats.publicRepos, 'stats.publicRepos'), followers: num(stats.followers, 'stats.followers'),
          totalContributions: stats.totalContributions === null ? null : num(stats.totalContributions, 'stats.totalContributions'),
          activeRepos90d: num(stats.activeRepos90d, 'stats.activeRepos90d'), totalStars: num(stats.totalStars, 'stats.totalStars'),
        }
      : null,
    featured: arr(r.featured, 'featured').map(project),
    latest: arr(r.latest, 'latest').map(project),
    languages: langs
      ? { basis: langs.basis === 'repos' ? 'repos' : 'bytes', items: arr(langs.items, 'languages.items').map((x, i) => { const o = obj(x, `lang[${i}]`); return { name: str(o.name, 'name'), percent: num(o.percent, 'percent') }; }) }
      : null,
    contributions: contrib
      ? {
          total: num(contrib.total, 'contributions.total'),
          weeks: arr(contrib.weeks, 'weeks').map((wk, i) => arr(wk, `week[${i}]`).map((d) => { const a = arr(d, 'day'); return [num(a[0], 'count'), num(a[1], 'level')] as [number, number]; })),
          monthly: arr(contrib.monthly, 'monthly').map((x) => { const o = obj(x, 'month'); return { month: str(o.month, 'month'), total: num(o.total, 'total') }; }),
        }
      : null,
  };
}

/** Relationships for the 3D scene: shared topic or shared primary language. */
export function projectEdges(projects: WorldProject[]): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 0; a < projects.length; a++)
    for (let b = a + 1; b < projects.length; b++) {
      const pa = projects[a]!;
      const pb = projects[b]!;
      if (pa.topics.some((t) => pb.topics.includes(t)) || (pa.language && pa.language === pb.language)) out.push([a, b]);
    }
  return out;
}

/** Unique featured-then-latest projects shown as nodes (capped for performance). */
export function sceneProjects(p: WorldProfile, max = 12): WorldProject[] {
  const seen = new Set<string>();
  return [...p.featured, ...p.latest].filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true))).slice(0, max);
}
