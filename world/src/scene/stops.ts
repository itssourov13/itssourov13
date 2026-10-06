import type { WorldProfile } from '../data/parse.ts';

export interface Stop {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

/** Each stop corresponds to a real zone in the scene. */
export const STOPS: Stop[] = [
  { id: 'overview', label: 'Overview', pos: [0, 10, 26], target: [0, 1.5, -2] },
  { id: 'core', label: 'Core', pos: [0, 3.2, 9], target: [0, 1.8, 0] },
  { id: 'projects', label: 'Projects', pos: [0, 7, 15], target: [0, 1.6, 0] },
  { id: 'activity', label: 'Activity', pos: [0, 7.5, -2], target: [0, 0.8, -14] },
  { id: 'intelligence', label: 'Intelligence', pos: [0, 6.5, -9], target: [0, 5.5, -22] },
  { id: 'lab', label: 'Lab', pos: [0, 4, 9], target: [0, 1.8, 17] },
  { id: 'timeline', label: 'Timeline', pos: [6, 4.5, 0], target: [14, 1, 0] },
  { id: 'portrait', label: 'Portrait', pos: [-6, 3, 0], target: [-14, 2.2, 0] },
  { id: 'links', label: 'Links', pos: [5, 3.2, 8], target: [10, 1.6, 14] },
];

/** A stop is offered only when its zone has content to show. */
export function availableStops(p: WorldProfile): Stop[] {
  const has: Record<string, boolean> = {
    overview: true,
    core: true,
    projects: p.scene.length > 0,
    activity: p.contributions !== null,
    intelligence: p.contributions !== null || (p.languages?.items.length ?? 0) > 0,
    lab: p.profile.focus.length > 0,
    timeline: p.scene.length > 0,
    portrait: p.media.profileImage !== null,
    links: Object.keys(p.profile.socials).length > 0,
  };
  return STOPS.filter((s) => has[s.id]);
}
