import { ORDER } from './quality.ts';
import type { QualityLevel } from './quality.ts';

/**
 * Quality controller with explicit hysteresis. Pure (time is passed in) so it is unit-testable.
 *
 * Why not "step down on every PerformanceMonitor decline"? That oscillates: lowering quality improves
 * fps, the monitor reports an incline, quality goes back up, fps drops again… Rules here:
 *  - stepping DOWN needs 2 decline signals inside a 6 s window and respects a 5 s cooldown;
 *  - stepping UP needs 15 s with no decline signal and never exceeds the ceiling;
 *  - a step down within 60 s of a step up is treated as ping-pong: the level that failed becomes
 *    the new ceiling for the rest of the session (no further upgrades).
 */
export interface QState {
  level: QualityLevel;
  ceiling: QualityLevel;
  declines: number[];
  lastChangeAt: number;
  lastUpAt: number;
  stableSince: number;
  locked: boolean;
}

export type QEvent =
  | { type: 'decline'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'ceiling'; ceiling: QualityLevel; now: number };

export const WINDOW_MS = 6_000;
export const COOLDOWN_MS = 5_000;
export const STABLE_MS = 15_000;
export const PINGPONG_MS = 60_000;

export function initQuality(ceiling: QualityLevel, now: number): QState {
  return { level: ceiling, ceiling, declines: [], lastChangeAt: now, lastUpAt: -Infinity, stableSince: now, locked: false };
}

const idx = (l: QualityLevel) => ORDER.indexOf(l);

export function reduceQuality(s: QState, e: QEvent): QState {
  switch (e.type) {
    case 'ceiling': {
      const level = idx(s.level) > idx(e.ceiling) ? e.ceiling : s.level;
      return { ...s, ceiling: e.ceiling, level, locked: false, declines: [], lastChangeAt: level === s.level ? s.lastChangeAt : e.now, stableSince: e.now };
    }
    case 'decline': {
      const declines = [...s.declines.filter((t) => e.now - t <= WINDOW_MS), e.now];
      const next = { ...s, declines, stableSince: e.now };
      if (declines.length < 2 || e.now - s.lastChangeAt < COOLDOWN_MS || idx(s.level) === 0) return next;
      const pingPong = e.now - s.lastUpAt <= PINGPONG_MS;
      const level = ORDER[idx(s.level) - 1]!;
      return { ...next, level, declines: [], lastChangeAt: e.now, locked: s.locked || pingPong, ceiling: pingPong ? level : s.ceiling };
    }
    case 'tick': {
      if (s.locked || idx(s.level) >= idx(s.ceiling)) return s;
      if (e.now - s.stableSince < STABLE_MS || e.now - s.lastChangeAt < STABLE_MS) return s;
      return { ...s, level: ORDER[idx(s.level) + 1]!, lastChangeAt: e.now, lastUpAt: e.now, stableSince: e.now, declines: [] };
    }
  }
}
