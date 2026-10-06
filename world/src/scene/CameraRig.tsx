import { useEffect, useMemo, useRef } from 'react';
import type { ElementRef, RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Stop } from './stops.ts';

const MAX_MS = 2500; // a tour move never lasts longer than this, even on slow frames
const REGRESS_EVERY_MS = 120;

interface Props {
  stop: Stop;
  /** Bumped when the same stop is re-requested so the move replays. */
  nonce: number;
  reduced: boolean;
  controls: RefObject<ElementRef<typeof OrbitControls> | null>;
}

/**
 * Smooth, interruptible tour. Any user input on the controls cancels the move immediately (no
 * trapping). While moving it asks R3F to "regress" so the resolution drops temporarily and recovers
 * once idle. With reduced motion the camera jump-cuts and nothing animates.
 */
export function CameraRig({ stop, nonce, reduced, controls }: Props) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const performance = useThree((s) => s.performance);
  const goalPos = useMemo(() => new THREE.Vector3(...stop.pos), [stop]);
  const goalTarget = useMemo(() => new THREE.Vector3(...stop.target), [stop]);
  const run = useRef({ active: true, elapsed: 0, lastRegress: -Infinity });

  useEffect(() => {
    run.current.elapsed = 0;
    if (reduced) {
      camera.position.copy(goalPos);
      const c = controls.current;
      if (c) {
        c.target.copy(goalTarget);
        c.update();
      }
      run.current.active = false;
    } else run.current.active = true;
    invalidate();
  }, [goalPos, goalTarget, nonce, reduced, camera, controls, invalidate]);

  // Listener registered once and removed on unmount (no accumulation across stop changes).
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => { run.current.active = false; };
    c.addEventListener('start', cancel);
    return () => c.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((state, dt) => {
    const r = run.current;
    const c = controls.current;
    if (!r.active || !c) return;
    r.elapsed += dt * 1000;
    const now = r.elapsed;
    if (now - r.lastRegress >= REGRESS_EVERY_MS) {
      performance.regress();
      r.lastRegress = now;
    }
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2.4);
    camera.position.lerp(goalPos, k);
    c.target.lerp(goalTarget, k);
    c.update();
    if (camera.position.distanceTo(goalPos) < 0.05 || now >= MAX_MS) {
      camera.position.copy(goalPos);
      c.target.copy(goalTarget);
      c.update();
      r.active = false;
    }
    state.invalidate(); // keeps frames coming in demand mode while moving
  });
  return null;
}
