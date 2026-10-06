import { describe, expect, it } from 'vitest';
import { clickOutcome, sanitizeSelection, stepIndex } from './selection.ts';

describe('project selection', () => {
  it('wraps in both directions and starts at the ends', () => {
    expect(stepIndex(null, 3, 1)).toBe(0);
    expect(stepIndex(null, 3, -1)).toBe(2);
    expect(stepIndex(2, 3, 1)).toBe(0);
    expect(stepIndex(0, 3, -1)).toBe(2);
    expect(stepIndex(null, 0, 1)).toBeNull();
  });
  it('requires a second click to open', () => {
    expect(clickOutcome(null, 'a')).toBe('select');
    expect(clickOutcome('b', 'a')).toBe('select');
    expect(clickOutcome('a', 'a')).toBe('open');
  });
  it('drops stale selections', () => {
    expect(sanitizeSelection('a', ['a', 'b'])).toBe('a');
    expect(sanitizeSelection('x', ['a', 'b'])).toBeNull();
    expect(sanitizeSelection(null, ['a'])).toBeNull();
  });
});
