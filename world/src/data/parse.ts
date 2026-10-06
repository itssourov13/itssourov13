import { classifyActivity } from '../../../shared/activity.ts';
import type { Activity } from '../../../shared/activity.ts';
import { buildRelationships } from '../../../shared/graph.ts';
import type { Relationship } from '../../../shared/graph.ts';

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
  activity: Activity;
  archived: boolean;
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
  stats: { publicRepos: number; followers: number; totalContributions: number | null; activeRepos90d: number; totalStars: number; momentum: { last30: number; prev30: number } | null } | null;
  featured: WorldProject[];
  latest: WorldProject[];
  /** Ordered names of the projects shown as nodes (featured first, then latest; capped). */
  scene: string[];
  edges: Relationship[];
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

const ACTIVITIES = ['active', 'recent', 'quiet', 'dormant'];

function project(v: unknown, i: number, ref: string | null): WorldProject {
  const o = obj(v, `project[${i}]`);
  const pushedAt = str(o.pushedAt, 'pushedAt');
  // Older JSON may lack `activity`; derive it with the shared rule rather than guessing.
  const activity = (typeof o.activity === 'string' && ACTIVITIES.includes(o.activity) ? o.activity : ref ? classifyActivity(pushedAt, ref) : 'dormant') as Activity;
  return {
    activity, archived: o.archived === true,
    name: str(o.name, 'name'), url: https(o.url, 'url'), description: str(o.description, 'description'),
    language: o.language === null ? null : str(o.language, 'language'), topics: strs(o.topics, 'topics'),
    stars: num(o.stars, 'stars'), forks: num(o.forks, 'forks'), createdAt: str(o.createdAt, 'createdAt'),
    pushedAt, release: o.release === null ? null : str(o.release, 'release'),
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
  const ref = typeof r.collectedAt === 'string' ? r.collectedAt : null;
  const featured = arr(r.featured, 'featured').map((x, i) => project(x, i, ref));
  const latest = arr(r.latest, 'latest').map((x, i) => project(x, i, ref));
  const base = [...featured, ...latest];
  const scene = Array.isArray(r.scene) ? strs(r.scene, 'scene').filter((n) => base.some((p) => p.name === n)).slice(0, MAX_SCENE) : sceneNames(featured, latest);
  const sceneList = scene.map((n) => base.find((p) => p.name === n)!);
  const edges = Array.isArray(r.edges) ? parseEdges(r.edges, scene.length) : buildRelationships(sceneList.map((p) => ({ topics: p.topics, language: p.language })));
  return {
    scene, edges,
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
          momentum: stats.momentum ? { last30: num(obj(stats.momentum, 'momentum').last30, 'last30'), prev30: num(obj(stats.momentum, 'momentum').prev30, 'prev30') } : null,
        }
      : null,
    featured,
    latest,
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

export const MAX_SCENE = 12;

function sceneNames(featured: WorldProject[], latest: WorldProject[]): string[] {
  const seen = new Set<string>();
  return [...featured, ...latest].filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true))).slice(0, MAX_SCENE).map((p) => p.name);
}

function parseEdges(raw: unknown[], n: number): Relationship[] {
  return raw.map((e, i) => {
    const a = arr(e, `edges[${i}]`);
    const [x, y] = [num(a[0], 'edge.a'), num(a[1], 'edge.b')];
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= n || y >= n || x >= y) throw new Error(`edges[${i}] out of range`);
    if (a[2] !== 'topic' && a[2] !== 'language') throw new Error(`edges[${i}] has an unknown kind`);
    return { a: x, b: y, kind: a[2], label: str(a[3], 'edge.label') };
  });
}

/** The projects drawn as nodes, in scene order (single definition: the generated `scene` list). */
export function sceneProjects(p: WorldProfile): WorldProject[] {
  const all = [...p.featured, ...p.latest];
  return p.scene.map((n) => all.find((x) => x.name === n)!).filter(Boolean);
}
