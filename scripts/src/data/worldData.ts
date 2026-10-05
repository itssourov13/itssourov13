import { SCHEMA_VERSION } from '../constants.ts';
import type { CollectedData, ProfileConfig, ProjectRecord } from '../types.ts';
import type { MediaState } from './media.ts';
import { computeStats, languageTotals, monthlyTotals, selectFeatured, selectLatest } from './normalize.ts';

function card(p: ProjectRecord) {
  return {
    name: p.name, url: p.url, description: p.description, language: p.primaryLanguage ?? null, topics: p.topics,
    stars: p.stars, forks: p.forks, createdAt: p.createdAt, pushedAt: p.pushedAt,
    release: p.latestRelease?.tag ?? null,
  };
}

/** Stable JSON contract consumed by the 3D world (world/src/data/parse.ts). Contains plain data only. */
export function buildWorldData(config: ProfileConfig, data: CollectedData | null, media: MediaState) {
  const featured = data ? selectFeatured(data.repos, config.featured_repositories, config.project_rules.featured_limit).featured : [];
  const latest = data ? selectLatest(data.repos, config.project_rules, config.profile.username) : [];
  const langs = data ? languageTotals(data.repos) : null;
  const cal = data?.contributions ?? null;
  return {
    schemaVersion: SCHEMA_VERSION,
    status: data ? 'ok' : 'unavailable',
    collectedAt: data?.collectedAt ?? null,
    fixture: data?.fixture === true,
    profile: {
      username: config.profile.username, displayName: config.profile.display_name, shortName: config.profile.short_name,
      headline: config.profile.headline, location: config.profile.location, bio: config.profile.bio,
      profileUrl: config.profile.profile_url, focus: config.focus, socials: config.socials,
    },
    world: { title: config.world.title, quality: config.world.quality, reducedMotionDefault: config.world.reduced_motion_default },
    media: {
      profileImage: media.profileImage ? { file: `media/${media.profileImage.path.split('/').pop()}`, sourcePath: media.profileImage.path, alt: config.profile.photo_alt } : null,
      introVideoUrl: config.media.intro_video_url || null,
    },
    stats: data ? computeStats(data.user, data.repos, cal, data.collectedAt) : null,
    featured: featured.map(card),
    latest: latest.map(card),
    languages: langs ? { basis: langs.basis, items: langs.items.map((i) => ({ name: i.name, percent: i.percent })) } : null,
    contributions: cal ? { total: cal.total, weeks: cal.weeks.map((w) => w.map((d) => [d.count, d.level])), monthly: monthlyTotals(cal) } : null,
  };
}
export type WorldData = ReturnType<typeof buildWorldData>;
