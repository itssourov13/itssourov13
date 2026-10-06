import { useState } from 'react';
import { Html } from '@react-three/drei';
import { AMBER_HI, COOL, GEO, openExternal } from './palette.ts';

interface Props {
  links: { key: string; label: string; url: string }[];
  coarse: boolean;
}

/** Exit area: one portal ring per configured link (≤ 7). Every link also exists in the DOM "Links" list. */
export function LinksGate({ links, coarse }: Props) {
  const [hot, setHot] = useState<string | null>(null);
  if (links.length === 0) return null;
  return (
    <group position={[10, 0, 14]}>
      <mesh geometry={GEO.box} dispose={null} position={[-2.6, 1.6, 0]} scale={[0.25, 3.2, 0.25]}><meshStandardMaterial color="#1b1f26" metalness={0.6} roughness={0.4} /></mesh>
      <mesh geometry={GEO.box} dispose={null} position={[2.6, 1.6, 0]} scale={[0.25, 3.2, 0.25]}><meshStandardMaterial color="#1b1f26" metalness={0.6} roughness={0.4} /></mesh>
      <mesh geometry={GEO.box} dispose={null} position={[0, 3.25, 0]} scale={[5.5, 0.2, 0.25]}><meshStandardMaterial color="#1b1f26" emissive={COOL} emissiveIntensity={0.25} metalness={0.6} roughness={0.4} /></mesh>
      {links.map((l, i) => {
        const x = links.length === 1 ? 0 : (i / (links.length - 1) - 0.5) * 4;
        const on = hot === l.key;
        return (
          <group key={l.key} position={[x, 1.5, 0]} scale={(on ? 1.2 : 1) * (coarse ? 1.3 : 1)}>
            <mesh
              geometry={GEO.portal}
              dispose={null}
              onPointerOver={(e) => { e.stopPropagation(); setHot(l.key); }}
              onPointerOut={() => setHot(null)}
              onClick={(e) => { e.stopPropagation(); openExternal(l.url); }}
            >
              <meshStandardMaterial color="#1b1f26" emissive={on ? AMBER_HI : COOL} emissiveIntensity={on ? 1.4 : 0.6} />
            </mesh>
            {on && !coarse && (
              <Html center position={[0, 0.8, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
                <div className="node-label small">{l.label}</div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
