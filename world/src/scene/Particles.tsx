import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

export const MAX_PARTICLES = 700;

/**
 * One buffer sized for the maximum; quality changes only move the draw range (no re-allocation).
 * Positions come from a fixed-seed generator so the layout is identical every session.
 * Drift is purely decorative → only when `ambient`; otherwise the points stay static as a depth cue.
 */
export function Particles({ count, ambient }: { count: number; ambient: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    let s = 1337;
    const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const a = new Float32Array(MAX_PARTICLES * 3);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      a[i * 3] = (rnd() - 0.5) * 50;
      a[i * 3 + 1] = rnd() * 14 + 0.5;
      a[i * 3 + 2] = (rnd() - 0.5) * 50;
    }
    return a;
  }, []);
  useEffect(() => {
    ref.current?.geometry.setDrawRange(0, Math.min(count, MAX_PARTICLES));
  }, [count]);
  useFrame((_, dt) => {
    if (ambient && ref.current) ref.current.rotation.y += dt * 0.01;
  });
  if (count <= 0) return null;
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e8a15c" size={0.06} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}
