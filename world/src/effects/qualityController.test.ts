import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, STABLE_MS, initQuality, reduceQuality } from './qualityController.ts';
import type { QEvent, QState } from './qualityController.ts';

const run = (s: QState, ...events: QEvent[]) => events.reduce(reduceQuality, s);
const T0 = 100_000;

describe('quality controller', () => {
  it('ignores a single decline signal', () => {
    expect(run(initQuality('high', T0), { type: 'decline', now: T0 + 10_000 }).level).toBe('high');
  });
  it('steps down after two declines in the window', () => {
    const s = run(initQuality('high', T0), { type: 'decline', now: T0 + 10_000 }, { type: 'decline', now: T0 + 12_000 });
    expect(s.level).toBe('medium');
  });
  it('does not step down during the cooldown after a change', () => {
    const s = run(initQuality('high', T0), { type: 'decline', now: T0 + 1_000 }, { type: 'decline', now: T0 + 2_000 });
    expect(s.level).toBe('high'); // < COOLDOWN_MS since init
    expect(COOLDOWN_MS).toBeGreaterThan(2_000);
  });
  it('never goes below low', () => {
    let s = initQuality('low', T0);
    for (let i = 0; i < 10; i++) s = reduceQuality(s, { type: 'decline', now: T0 + 10_000 + i * 100 });
    expect(s.level).toBe('low');
  });
  it('recovers one level after a stable period, never above the ceiling', () => {
    let s = run(initQuality('high', T0), { type: 'decline', now: T0 + 10_000 }, { type: 'decline', now: T0 + 12_000 });
    expect(s.level).toBe('medium');
    s = reduceQuality(s, { type: 'tick', now: T0 + 12_000 + STABLE_MS - 1 });
    expect(s.level).toBe('medium');
    s = reduceQuality(s, { type: 'tick', now: T0 + 12_000 + STABLE_MS });
    expect(s.level).toBe('high');
    s = reduceQuality(s, { type: 'tick', now: T0 + 12_000 + STABLE_MS * 3 });
    expect(s.level).toBe('high');
  });
  it('declines reset the stability timer', () => {
    let s = run(initQuality('high', T0), { type: 'decline', now: T0 + 10_000 }, { type: 'decline', now: T0 + 12_000 });
    s = reduceQuality(s, { type: 'decline', now: T0 + 20_000 });
    s = reduceQuality(s, { type: 'tick', now: T0 + 12_000 + STABLE_MS });
    expect(s.level).toBe('medium');
  });
  it('detects ping-pong and locks the failing level out for the session', () => {
    let s = run(initQuality('high', T0), { type: 'decline', now: T0 + 10_000 }, { type: 'decline', now: T0 + 12_000 });
    const upAt = T0 + 12_000 + STABLE_MS;
    s = reduceQuality(s, { type: 'tick', now: upAt });
    expect(s.level).toBe('high');
    s = run(s, { type: 'decline', now: upAt + 6_000 }, { type: 'decline', now: upAt + 7_000 });
    expect(s.level).toBe('medium');
    expect(s.locked).toBe(true);
    expect(s.ceiling).toBe('medium');
    expect(reduceQuality(s, { type: 'tick', now: upAt + 10 * STABLE_MS }).level).toBe('medium');
  });
  it('clamps to a lowered ceiling and unlocks when the ceiling is changed by the user', () => {
    let s = initQuality('high', T0);
    s = reduceQuality(s, { type: 'ceiling', ceiling: 'low', now: T0 + 1 });
    expect(s.level).toBe('low');
    s = reduceQuality(s, { type: 'ceiling', ceiling: 'high', now: T0 + 2 });
    expect(s.level).toBe('low');
    expect(s.locked).toBe(false);
    expect(reduceQuality(s, { type: 'tick', now: T0 + 2 + STABLE_MS }).level).toBe('medium');
  });
});
