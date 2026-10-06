import * as THREE from 'three';
import type { Activity } from '../../../shared/activity.ts';

export const AMBER = '#d98a4e';
export const AMBER_HI = '#f0a65a';
export const COOL = '#5fa8c9';
export const INK = '#10141a';
export const LANG_COLORS = ['#e8a15c', '#5fa8c9', '#8fb08a', '#d9c7a0', '#a98bb5', '#7a8aa0', '#c46a4a', '#4f9d9a', '#6b7280'];
export const LEVEL_COLORS = ['#1b2027', '#5b3a22', '#8f5a30', '#c17a3e', '#f0a65a'];
/** Node colour encodes real activity (see shared/activity.ts); the DOM panel states the same value in text. */
export const ACTIVITY_COLOR: Record<Activity, string> = { active: AMBER_HI, recent: AMBER, quiet: COOL, dormant: '#6b7280' };

export const BASE = import.meta.env.BASE_URL;

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Module-level shared geometry: created once, reused by every instance, never re-created per render.
 * Meshes using these pass `dispose={null}` so React unmounts do not dispose a geometry still in use.
 */
export const GEO = {
  node: new THREE.SphereGeometry(0.45, 24, 16),
  halo: new THREE.TorusGeometry(0.72, 0.02, 8, 48),
  pillar: new THREE.BoxGeometry(0.5, 1.2, 0.5),
  marker: new THREE.OctahedronGeometry(0.2),
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  portal: new THREE.TorusGeometry(0.38, 0.04, 8, 40),
};
