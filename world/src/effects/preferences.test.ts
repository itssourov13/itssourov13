import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, PREFS_KEY, loadPreferences, parsePreferences, savePreferences } from './preferences.ts';

const mem = (initial?: string) => {
  const data = new Map<string, string>(initial === undefined ? [] : [[PREFS_KEY, initial]]);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('stored preferences', () => {
  it('round-trips valid values', () => {
    const s = mem();
    savePreferences({ quality: 'low', reduceMotion: true, pauseAmbient: true }, s);
    expect(loadPreferences(s)).toEqual({ quality: 'low', reduceMotion: true, pauseAmbient: true });
  });
  it('falls back to defaults on corrupt JSON', () => {
    expect(loadPreferences(mem('{not json'))).toEqual(DEFAULT_PREFS);
  });
  it('validates each field independently', () => {
    expect(parsePreferences({ quality: 'ultra', reduceMotion: 'yes', pauseAmbient: 1 })).toEqual(DEFAULT_PREFS);
    expect(parsePreferences({ quality: 'high', reduceMotion: 'yes' })).toEqual({ quality: 'high', reduceMotion: null, pauseAmbient: false });
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFS);
    expect(parsePreferences([1, 2])).toEqual(DEFAULT_PREFS);
  });
  it('never throws when storage throws or is unavailable', () => {
    const boom = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(loadPreferences(boom)).toEqual(DEFAULT_PREFS);
    expect(() => savePreferences(DEFAULT_PREFS, boom)).not.toThrow();
    expect(loadPreferences(null)).toEqual(DEFAULT_PREFS);
  });
});
