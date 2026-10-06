import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AMBER, AMBER_HI, COOL, GEO } from './palette.ts';

interface Props {
  items: string[]; // focus areas from profile.config.yml — identity content, not data
  ambient: boolean;
}

const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const E = new THREE.Euler();
const RADIUS = 17;
const SCREEN_H = 1.6;

/**
 * Security-lab zone: one isolated rack per configured focus area. Racks and screens are two
 * InstancedMeshes (2 draw calls for ≤ 8 racks). The only motion is a slow scan bar crossing each
 * screen, which runs only when `ambient`. No figures, logs or "telemetry" are rendered.
 */
export function ResearchLab({ items, ambient }: Props) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const screens = useRef<THREE.InstancedMesh>(null);
  const scans = useRef<THREE.InstancedMesh>(null);
  const n = items.length;

  const racks = useMemo(
    () =>
      items.map((_, i) => {
        const th = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.3; // arc of ~75°, facing the centre
        return { x: Math.sin(th) * RADIUS, z: Math.cos(th) * RADIUS, yaw: th + Math.PI };
      }),
    [items, n],
  );

  const place = (mesh: THREE.InstancedMesh, i: number, local: [number, number, number], scale: [number, number, number]) => {
    const r = racks[i]!;
    const fx = Math.sin(r.yaw);
    const fz = Math.cos(r.yaw);
    // rack front (local +z) direction = (fx, fz); local x axis = (fz, -fx)
    P.set(r.x + local[2] * fx + local[0] * fz, local[1], r.z + local[2] * fz - local[0] * fx);
    Q.setFromEuler(E.set(0, r.yaw, 0));
    S.set(...scale);
    mesh.setMatrixAt(i, M.compose(P, Q, S));
  };

  useLayoutEffect(() => {
    if (!bodies.current || !screens.current) return;
    racks.forEach((_, i) => {
      place(bodies.current!, i, [0, 1.4, 0], [1.6, 2.8, 0.8]);
      place(screens.current!, i, [0, 1.7, 0.41], [1.25, SCREEN_H, 1]);
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    screens.current.instanceMatrix.needsUpdate = true;
    bodies.current.computeBoundingSphere();
    screens.current.computeBoundingSphere();
  }, [racks]);

  const scan = (t: number) => {
    const mesh = scans.current;
    if (!mesh) return;
    racks.forEach((_, i) => {
      const phase = ambient ? (t * 0.22 + i * 0.17) % 1 : 0.5;
      place(mesh, i, [0, 1.7 - SCREEN_H / 2 + phase * SCREEN_H, 0.42], [1.25, 0.035, 1]);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useFrame((s) => ambient && scan(s.clock.elapsedTime));
  useLayoutEffect(() => scan(0), [racks, ambient]);

  if (n === 0) return null;
  return (
    <group>
      <mesh geometry={GEO.box} dispose={null} position={[0, 0.04, RADIUS * 0.96]} scale={[16, 0.08, 7]} receiveShadow>
        <meshStandardMaterial color="#0d1218" metalness={0.4} roughness={0.5} />
      </mesh>
      <instancedMesh ref={bodies} args={[GEO.box, undefined, n]} dispose={null} castShadow receiveShadow>
        <meshStandardMaterial color="#161b22" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={screens} args={[GEO.plane, undefined, n]} dispose={null}>
        <meshStandardMaterial color="#0b0d10" emissive={COOL} emissiveIntensity={0.28} />
      </instancedMesh>
      <instancedMesh ref={scans} args={[GEO.plane, undefined, n]} dispose={null} frustumCulled={false}>
        <meshBasicMaterial color={AMBER_HI} transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <pointLight position={[0, 4, RADIUS - 3]} color={AMBER} intensity={14} distance={14} decay={2} />
    </group>
  );
}
