import { describe, expect, it } from 'vitest';
import { DEFAULT_BASE, resolveBase } from './base.ts';

describe('resolveBase', () => {
  it('defaults to the repository sub-path used by GitHub Pages', () => {
    expect(resolveBase(undefined)).toBe(DEFAULT_BASE);
    expect(DEFAULT_BASE).toBe('/itssourov13/');
  });
  it('normalizes slashes and allows the root for custom domains', () => {
    expect(resolveBase('itssourov13')).toBe('/itssourov13/');
    expect(resolveBase('/x/y')).toBe('/x/y/');
    expect(resolveBase('/')).toBe('/');
  });
  it('rejects unsafe values', () => {
    expect(() => resolveBase('/a/../b')).toThrow();
    expect(() => resolveBase('https://evil.example/')).toThrow();
  });
});
