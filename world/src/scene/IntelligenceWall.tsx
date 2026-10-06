import { useLayoutEffect, useMemo, useRef } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { AMBER, AMBER_HI, COOL, GEO, LANG_COLORS } from './palette.ts';

interface Props {
  languages: { name: string; percent: number }[] | null;
  monthly: { month: string; total: number }[] | null;
  coarse: boolean;
}

const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const C = new THREE.Color();
const FRAME: [number, number, number][] = [[-11, 1.2, 0], [11, 1.2, 0], [11, 9.8, 0], [-11, 9.8, 0], [-11, 1.2, 0]];

/**
 * Visual context for real GitHub data: language columns (height ∝ share) and the monthly contribution
 * trend. It carries no numbers on purpose — exact values live in the accessible DOM panel.
 */
export function IntelligenceWall({ languages, monthly, coarse }: Props) {
  const bars = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => languages ?? [], [languages]);

  useLayoutEffect(() => {
    const mesh = bars.current;
    if (!mesh) return;
    items.forEach((l, i) => {
      const h = Math.max(0.08, (l.percent / 100) * 5.5);
      P.set(-9 + i * 1.15, 2.2 + h / 2, 0.05);
      S.set(0.7, h, 0.12);
      mesh.setMatrixAt(i, M.compose(P, Q, S));
      mesh.setColorAt(i, C.set(l.name === 'Other' ? LANG_COLORS[8]! : LANG_COLORS[i % 8]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  const trend = useMemo(() => {
    if (!monthly || monthly.length < 2) return null;
    const max = Math.max(1, ...monthly.map((m) => m.total));
    return monthly.map((m, i) => [1.5 + (i / (monthly.length - 1)) * 8.5, 2.2 + (m.total / max) * 5, 0.06] as [number, number, number]);
  }, [monthly]);

  if (items.length === 0 && !trend) return null;
  return (
    <group position={[0, 0, -22]}>
      <mesh geometry={GEO.plane} dispose={null} position={[0, 5.5, -0.05]} scale={[22, 8.6, 1]}>
        <meshStandardMaterial color="#0e1217" metalness={0.5} roughness={0.35} />
      </mesh>
      <Line points={FRAME} color={COOL} lineWidth={1} transparent opacity={0.5} />
      <Line points={[[-10, 2.15, 0.02], [10, 2.15, 0.02]]} color={AMBER} lineWidth={1} transparent opacity={0.35} />
      {items.length > 0 && (
        <instancedMesh ref={bars} args={[GEO.box, undefined, items.length]} dispose={null}>
          <meshStandardMaterial emissiveIntensity={0.35} roughness={0.4} metalness={0.2} emissive="#2a2118" />
        </instancedMesh>
      )}
      {trend && <Line points={trend} color={AMBER_HI} lineWidth={2} />}
      {!coarse && (
        <Html position={[-10.5, 10.4, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="node-label small">GitHub intelligence · languages and monthly activity</div>
        </Html>
      )}
    </group>
  );
}
