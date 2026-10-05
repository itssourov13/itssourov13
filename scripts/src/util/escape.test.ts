import { describe, expect, it } from 'vitest';
import { escapeMd, escapeXml, safeRepoSlug, safeUrl, truncate } from './escape.ts';

describe('escaping', () => {
  it('escapes XML/HTML metacharacters', () => {
    expect(escapeXml(`<script>alert("x")</script> & 'y'`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;');
  });
  it('neutralizes markdown and HTML in untrusted descriptions', () => {
    const out = escapeMd('x | y <img src=x onerror=1> [link](http://evil) **b**\nnewline');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('\n');
    expect(out).toContain('\\|');
    expect(out).toContain('\\[link\\]');
  });
  it('validates repository slugs', () => {
    expect(safeRepoSlug('pass-hunter_1.0')).toBe('pass-hunter_1.0');
    expect(safeRepoSlug('../etc')).toBeNull();
    expect(safeRepoSlug('a/b')).toBeNull();
    expect(safeRepoSlug('..')).toBeNull();
  });
  it('only accepts https URLs', () => {
    expect(safeUrl('https://github.com/a/b(1)')).toBe('https://github.com/a/b%281%29');
    expect(() => safeUrl('javascript:alert(1)')).toThrow();
    expect(() => safeUrl('http://example.com')).toThrow();
  });
  it('truncates with an ellipsis', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate('abc', 5)).toBe('abc');
  });
});
