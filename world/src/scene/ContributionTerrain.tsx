import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, LEVEL_COLORS } from './palette.ts';

// Temporary objects reused across effect runs (no per-cell allocation).
const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const C = new THREE.Color();

/** Real contribution calendar as one InstancedMesh (≤ ~371 cells, 1 draw call). Static: never animated. */
export function ContributionTerrain({ weeks }: { weeks: [number, number][][] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => weeks.flatMap((w, i) => w.map(([count, level], j) => ({ i, j, count, level }))), [weeks]);
  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    cells.forEach((c, n) => {
      const h = c.count === 0 ? 0.05 : 0.25 + 2.8 * Math.sqrt(c.count / max); // height ∝ √count, as in the README terrain
      P.set((c.i - weeks.length / 2) * 0.44, h / 2, -14 + c.j * 0.44);
      S.set(0.36, h, 0.36);
      mesh.setMatrixAt(n, M.compose(P, Q, S));
      mesh.setColorAt(n, C.set(LEVEL_COLORS[c.level] ?? LEVEL_COLORS[0]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cells, max, weeks.length]);

  return (
    <instancedMesh ref={ref} args={[GEO.box, undefined, cells.length]} dispose={null} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.55} metalness={0.15} />
    </instancedMesh>
  );
}
