import { describe, expect, it } from 'vitest';
import { resolveAmbient, resolveReduced } from './motion.ts';

describe('motion preferences', () => {
  it('user override wins over OS and config', () => {
    expect(resolveReduced(false, true, true)).toBe(false);
    expect(resolveReduced(true, false, false)).toBe(true);
  });
  it('falls back to OS preference, then config default', () => {
    expect(resolveReduced(null, true, false)).toBe(true);
    expect(resolveReduced(null, false, true)).toBe(true);
    expect(resolveReduced(null, false, false)).toBe(false);
  });
  it('ambient motion needs both reduced and paused to be off', () => {
    expect(resolveAmbient(false, false)).toBe(true);
    expect(resolveAmbient(true, false)).toBe(false);
    expect(resolveAmbient(false, true)).toBe(false);
  });
});
