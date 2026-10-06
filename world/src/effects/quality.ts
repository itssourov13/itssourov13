export type QualityLevel = 'low' | 'medium' | 'high';
export type QualitySetting = QualityLevel | 'auto';

export interface QualityPreset {
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  particles: number;
}

export const PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { dpr: [1, 1], antialias: false, shadows: false, particles: 0 },
  medium: { dpr: [1, 1.5], antialias: true, shadows: false, particles: 250 },
  high: { dpr: [1, 2], antialias: true, shadows: true, particles: 700 },
};

export const ORDER: QualityLevel[] = ['low', 'medium', 'high'];

/** Heuristic starting level for "auto"; PerformanceMonitor lowers it at runtime if frames drop. */
export function detectAutoQuality(): QualityLevel {
  const nav = navigator as Navigator & { deviceMemory?: number };
  // Some phones/tablets report a fine primary pointer in desktop-site mode even though
  // the underlying hardware is still touch-first. Keep them out of the desktop/high-quality
  // path: high DPR + shadows + continuous animation is disproportionately expensive there.
  const touch = window.matchMedia('(pointer: coarse)').matches || nav.maxTouchPoints > 0;
  const weak = (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 4) <= 2;
  if (touch) return weak ? 'low' : 'medium';
  return weak ? 'medium' : 'high';
}

export function stepDown(level: QualityLevel): QualityLevel {
  return ORDER[Math.max(0, ORDER.indexOf(level) - 1)]!;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
