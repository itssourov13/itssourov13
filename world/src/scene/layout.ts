import type { WorldProfile, WorldProject } from '../data/parse.ts';

export type Vec3 = [number, number, number];

/** Ring layout for project nodes; deterministic, evenly spaced, slight height variation. */
export function nodePositions(n: number, radius = 7): Vec3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * radius, 1.6 + (i % 3) * 0.55, Math.sin(a) * radius] as Vec3;
  });
}

/**
 * Timeline positions along one axis, proportional to real creation dates but with a minimum gap so
 * markers never overlap. Returns coordinates centred on 0.
 */
export function layoutTimeline(isoDates: string[], span = 14, minGap = 1.1): number[] {
  const t = isoDates.map((d) => Date.parse(d));
  if (t.length === 0) return [];
  const order = t.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = order[0]![0];
  const hi = order[order.length - 1]![0];
  const out = new Array<number>(t.length).fill(0);
  let prev = -Infinity;
  for (const [v, i] of order) {
    const raw = hi === lo ? 0 : ((v - lo) / (hi - lo)) * span;
    prev = Math.max(raw, prev + minGap);
    out[i] = prev;
  }
  const mid = (Math.max(...out) + Math.min(...out)) / 2;
  return out.map((x) => x - mid);
}

export interface SceneModel {
  projects: WorldProject[];
  positions: Vec3[];
  lab: string[];
  links: { key: string; label: string; url: string }[];
}

const SOCIAL_LABELS: Record<string, string> = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X', facebook: 'Facebook', instagram: 'Instagram', blog: 'Blog', portfolio: 'Portfolio' };
export const MAX_LAB = 8;

export function buildSceneModel(profile: WorldProfile, projects: WorldProject[]): SceneModel {
  return {
    projects,
    positions: nodePositions(projects.length),
    lab: profile.profile.focus.slice(0, MAX_LAB),
    links: Object.entries(profile.profile.socials).map(([key, url]) => ({ key, label: SOCIAL_LABELS[key] ?? key, url })),
  };
}
