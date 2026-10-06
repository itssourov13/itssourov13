import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { AMBER, AMBER_HI, COOL, LANG_COLORS } from './palette.ts';

interface Props {
  languages: { name: string; percent: number }[];
  ambient: boolean;
}

/**
 * Layered data core: emissive nucleus, counter-rotating wire shell, two tilted orbit rings.
 * Orbiting markers are the real top languages (colour = language ring on the floor, size ∝ share).
 * Slow rotation only when `ambient`; with ambient off nothing here animates.
 */
export function Core({ languages, ambient }: Props) {
  const shell = useRef<THREE.Mesh>(null);
  const nucleus = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Group>(null);
  const sats = languages.filter((l) => l.name !== 'Other').slice(0, 6);

  useFrame((_, dt) => {
    if (!ambient) return;
    if (nucleus.current) nucleus.current.rotation.y += dt * 0.1;
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.18;
      shell.current.rotation.x += dt * 0.04;
    }
    if (orbit.current) orbit.current.rotation.y += dt * 0.22;
  });

  return (
    <group position={[0, 1.8, 0]}>
      <mesh ref={nucleus}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshStandardMaterial color={AMBER_HI} emissive={AMBER} emissiveIntensity={1.2} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#2a2118" wireframe emissive={AMBER} emissiveIntensity={0.55} />
      </mesh>
      <group rotation-x={0.45}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.2, 0.018, 8, 96]} />
          <meshBasicMaterial color={COOL} transparent opacity={0.8} />
        </mesh>
      </group>
      <group rotation-x={-0.6} rotation-z={0.3}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.7, 0.012, 8, 96]} />
          <meshBasicMaterial color={AMBER} transparent opacity={0.45} />
        </mesh>
      </group>
      <group ref={orbit} rotation-x={0.45}>
        {sats.map((l, i) => {
          const a = (i / sats.length) * Math.PI * 2;
          return (
            <mesh key={l.name} position={[Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2]}>
              <sphereGeometry args={[0.07 + Math.sqrt(l.percent) * 0.02, 12, 10]} />
              <meshStandardMaterial color={LANG_COLORS[i % LANG_COLORS.length]} emissive={LANG_COLORS[i % LANG_COLORS.length]} emissiveIntensity={0.7} />
            </mesh>
          );
        })}
      </group>
      <pointLight color="#e8a15c" intensity={40} distance={24} decay={2} />
    </group>
  );
}
