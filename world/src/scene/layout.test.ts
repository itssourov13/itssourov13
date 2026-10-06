import { describe, expect, it } from 'vitest';
import { layoutTimeline, nodePositions } from './layout.ts';

describe('scene layout', () => {
  it('places nodes on a ring without overlap', () => {
    const p = nodePositions(12);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const d = Math.hypot(p[i]![0] - p[j]![0], p[i]![2] - p[j]![2]);
      expect(d).toBeGreaterThan(2);
    }
  });
  it('is deterministic', () => {
    expect(nodePositions(5)).toEqual(nodePositions(5));
  });
  it('keeps real date order and a minimum gap, centred on zero', () => {
    const dates = ['2025-03-01T00:00:00Z', '2025-03-02T00:00:00Z', '2024-01-01T00:00:00Z', '2025-06-01T00:00:00Z'];
    const z = layoutTimeline(dates, 14, 1.1);
    const sorted = [...z.keys()].sort((a, b) => Date.parse(dates[a]!) - Date.parse(dates[b]!)).map((i) => z[i]!);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThan(1.09);
    expect(Math.abs(Math.max(...z) + Math.min(...z))).toBeLessThan(1e-9);
  });
  it('handles single and identical dates', () => {
    expect(layoutTimeline(['2025-01-01T00:00:00Z'])).toEqual([0]);
    expect(layoutTimeline([])).toEqual([]);
    const same = layoutTimeline(['2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z']);
    expect(Math.abs(same[0]! - same[1]!)).toBeGreaterThan(1);
  });
});
