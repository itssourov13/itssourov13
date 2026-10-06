import type { QualitySetting } from './quality.ts';

export interface Preferences {
  quality: QualitySetting | null; // null = follow site default
  reduceMotion: boolean | null; // null = follow OS / site default
  pauseAmbient: boolean;
}

export const PREFS_KEY = 'itssourov13-world:prefs:v1';
export const DEFAULT_PREFS: Preferences = { quality: null, reduceMotion: null, pauseAmbient: false };
const QUALITIES = ['auto', 'low', 'medium', 'high'];

/** Schema-safe: every field is validated individually; anything unexpected falls back to its default. */
export function parsePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    quality: typeof o.quality === 'string' && QUALITIES.includes(o.quality) ? (o.quality as QualitySetting) : null,
    reduceMotion: typeof o.reduceMotion === 'boolean' ? o.reduceMotion : null,
    pauseAmbient: o.pauseAmbient === true,
  };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // storage can throw (privacy mode, blocked cookies)
  }
}

export function loadPreferences(storage: StorageLike | null = defaultStorage()): Preferences {
  try {
    const text = storage?.getItem(PREFS_KEY);
    return text ? parsePreferences(JSON.parse(text)) : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS }; // corrupt JSON or blocked storage must never break the app
  }
}

export function savePreferences(prefs: Preferences, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / blocked: preferences simply do not persist */
  }
}
