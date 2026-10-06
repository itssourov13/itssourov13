/**
 * Activity classification — the single definition used by the README generator and the 3D world.
 * Derived only from a real `pushedAt` timestamp relative to a reference instant (the data collection
 * time, never "now"), so generated output stays deterministic.
 */
export type Activity = 'active' | 'recent' | 'quiet' | 'dormant';

export const ACTIVITY_LABELS: Record<Activity, string> = {
  active: 'Active',
  recent: 'Recent',
  quiet: 'Quiet',
  dormant: 'Dormant',
};

const DAY = 86_400_000;

/** active ≤ 30 days · recent ≤ 90 days · quiet ≤ 365 days · dormant otherwise. */
export function classifyActivity(pushedAtIso: string, referenceIso: string): Activity {
  const age = (Date.parse(referenceIso) - Date.parse(pushedAtIso)) / DAY;
  if (!Number.isFinite(age)) return 'dormant';
  if (age <= 30) return 'active';
  if (age <= 90) return 'recent';
  if (age <= 365) return 'quiet';
  return 'dormant';
}
