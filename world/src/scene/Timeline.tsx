import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { WorldProject } from '../data/parse.ts';
import { layoutTimeline } from './layout.ts';
import { ACTIVITY_COLOR, AMBER_HI, COOL, GEO } from './palette.ts';

interface Props {
  projects: WorldProject[];
  selected: string | null;
  hovered: string | null;
  onSelect: (n: string | null) => void;
  onHover: (n: string | null) => void;
  coarse: boolean;
}

/**
 * Timeline corridor: one pillar per project at its real creation date (spacing proportional to the
 * date gap, with a minimum gap for legibility). A small marker above a pillar means the repository has
 * a published release. No milestones are invented.
 */
export function Timeline({ projects, selected, hovered, onSelect, onHover, coarse }: Props) {
  const z = useMemo(() => layoutTimeline(projects.map((p) => p.createdAt)), [projects]);
  if (projects.length === 0) return null;
  const length = Math.max(...z) - Math.min(...z) + 3;
  return (
    <group position={[14, 0, 0]}>
      <mesh geometry={GEO.box} dispose={null} position={[0, 0.03, 0]} scale={[0.14, 0.06, length]}>
        <meshBasicMaterial color={COOL} transparent opacity={0.6} />
      </mesh>
      {projects.map((p, i) => {
        const on = p.name === selected;
        const hot = on || p.name === hovered;
        return (
          <group key={p.name} position={[0, 0, z[i]]}>
            <mesh
              geometry={GEO.pillar}
              dispose={null}
              position-y={0.6}
              scale={coarse ? [1.3, on ? 1.4 : 1, 1.3] : [1, on ? 1.4 : 1, 1]}
              castShadow
              onPointerOver={(e) => { e.stopPropagation(); onHover(p.name); }}
              onPointerOut={() => onHover(null)}
              onClick={(e) => { e.stopPropagation(); onSelect(p.name); }}
            >
              <meshStandardMaterial color="#1b1f26" emissive={ACTIVITY_COLOR[p.activity]} emissiveIntensity={hot ? 1.1 : 0.3} metalness={0.4} roughness={0.4} />
            </mesh>
            {p.release && (
              <mesh geometry={GEO.marker} dispose={null} position-y={on ? 1.9 : 1.6}>
                <meshBasicMaterial color={AMBER_HI} />
              </mesh>
            )}
            {(on || (hot && !coarse)) && (
              <Html center position={[0, 2.3, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
                <div className="node-label small">{p.createdAt.slice(0, 10)} · {p.name}{p.release ? ` · ${p.release}` : ''}</div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
