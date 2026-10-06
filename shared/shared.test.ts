import { describe, expect, it } from 'vitest';
import { classifyActivity } from './activity.ts';
import { buildRelationships } from './graph.ts';
import { momentum } from './momentum.ts';

const REF = '2026-10-01T00:00:00Z';

describe('classifyActivity', () => {
  it('buckets by age relative to the reference time', () => {
    expect(classifyActivity('2026-09-20T00:00:00Z', REF)).toBe('active');
    expect(classifyActivity('2026-08-15T00:00:00Z', REF)).toBe('recent');
    expect(classifyActivity('2026-01-01T00:00:00Z', REF)).toBe('quiet');
    expect(classifyActivity('2024-01-01T00:00:00Z', REF)).toBe('dormant');
  });
  it('treats unparseable dates as dormant instead of guessing', () => {
    expect(classifyActivity('nope', REF)).toBe('dormant');
  });
  it('has inclusive boundaries (30 days is still active)', () => {
    expect(classifyActivity('2026-09-01T00:00:00Z', REF)).toBe('active');
    expect(classifyActivity('2026-08-31T00:00:00Z', REF)).toBe('recent');
  });
});

describe('buildRelationships', () => {
  it('links shared topics first, then shared language; never anything else', () => {
    const rel = buildRelationships([
      { topics: ['security'], language: 'Go' },
      { topics: ['security'], language: 'Python' },
      { topics: [], language: 'Go' },
      { topics: [], language: null },
    ]);
    expect(rel).toEqual([
      { a: 0, b: 1, kind: 'topic', label: 'security' },
      { a: 0, b: 2, kind: 'language', label: 'Go' },
    ]);
  });
  it('does not relate nodes without a language to each other', () => {
    expect(buildRelationships([{ topics: [] }, { topics: [] }])).toEqual([]);
  });
});

describe('momentum', () => {
  const series = (n: number, f: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10), count: f(i) }));
  it('compares the last 30 days with the 30 before', () => {
    const m = momentum(series(90, (i) => (i >= 60 ? 2 : i >= 30 ? 1 : 0)))!;
    expect(m).toEqual({ last30: 60, prev30: 30 });
  });
  it('returns null without enough history', () => {
    expect(momentum(series(40, () => 1))).toBeNull();
  });
});
