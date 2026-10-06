import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Relationship } from '../../../shared/graph.ts';
import type { WorldProject } from '../data/parse.ts';
import { clickOutcome } from '../state/selection.ts';
import type { Vec3 } from './layout.ts';
import { ACTIVITY_COLOR, AMBER, AMBER_HI, COOL, GEO, openExternal } from './palette.ts';

interface Props {
  projects: WorldProject[];
  positions: Vec3[];
  edges: Relationship[];
  selected: string | null;
  hovered: string | null;
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
  ambient: boolean;
  coarse: boolean;
}

const CORE: Vec3 = [0, 1.8, 0];

function segments(pairs: [Vec3, Vec3][]): Float32Array {
  const a = new Float32Array(pairs.length * 6);
  pairs.forEach(([p, q], i) => a.set([...p, ...q], i * 6));
  return a;
}

function Lines({ data, color, opacity }: { data: Float32Array; color: string; opacity: number }) {
  if (data.length === 0) return null;
  return (
    <lineSegments key={data.length}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

/**
 * Project constellation (≤ 12 nodes, see MAX_SCENE). Nodes share one geometry; all relationship lines
 * are batched into three <lineSegments> (spokes, topic/language links, selected links) regardless of count.
 * Click selects; clicking the selected node again opens the repository. The same actions exist in the DOM list.
 */
export function ProjectConstellation({ projects, positions, edges, selected, hovered, onSelect, onHover, ambient, coarse }: Props) {
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const selIndex = projects.findIndex((p) => p.name === selected);

  const spokes = useMemo(() => segments(positions.map((p) => [CORE, p])), [positions]);
  const topic = useMemo(() => segments(edges.filter((e) => e.kind === 'topic').map((e) => [positions[e.a]!, positions[e.b]!])), [edges, positions]);
  const language = useMemo(() => segments(edges.filter((e) => e.kind === 'language').map((e) => [positions[e.a]!, positions[e.b]!])), [edges, positions]);
  const related = useMemo(() => segments(edges.filter((e) => e.a === selIndex || e.b === selIndex).map((e) => [positions[e.a]!, positions[e.b]!])), [edges, positions, selIndex]);

  // Scale is written imperatively (no React state per frame). Subtle "breathing" only when ambient.
  const applyScales = (t: number) => {
    projects.forEach((p, i) => {
      const g = nodes.current[i];
      if (!g) return;
      const base = (p.name === selected ? 1.35 : p.name === hovered ? 1.15 : 1) * (coarse ? 1.25 : 1);
      g.scale.setScalar(ambient ? base * (1 + 0.03 * Math.sin(t * 1.3 + i)) : base);
    });
  };
  useFrame((s) => applyScales(s.clock.elapsedTime));
  useLayoutEffect(() => applyScales(0), [selected, hovered, ambient, coarse, projects]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  return (
    <group>
      <Lines data={spokes} color={AMBER} opacity={0.14} />
      <Lines data={topic} color={AMBER} opacity={0.5} />
      <Lines data={language} color={COOL} opacity={0.35} />
      <Lines data={related} color={AMBER_HI} opacity={0.95} />
      {projects.map((p, i) => {
        const on = p.name === selected;
        const hot = on || p.name === hovered;
        const showLabel = on || (hot && !coarse);
        return (
          <group key={p.name} position={positions[i]} ref={(g) => { nodes.current[i] = g; }}>
            <mesh
              geometry={GEO.node}
              dispose={null}
              castShadow
              onPointerOver={(e) => { e.stopPropagation(); onHover(p.name); }}
              onPointerOut={() => onHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (clickOutcome(selected, p.name) === 'open') openExternal(p.url);
                else onSelect(p.name);
              }}
            >
              <meshStandardMaterial color="#1b1f26" emissive={ACTIVITY_COLOR[p.activity]} emissiveIntensity={hot ? 1.6 : 0.7} metalness={0.5} roughness={0.35} />
            </mesh>
            {on && <mesh geometry={GEO.halo} dispose={null} rotation-x={Math.PI / 2}><meshBasicMaterial color={AMBER_HI} /></mesh>}
            {showLabel && (
              <Html center position={[0, 1.05, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
                <div className="node-label"><strong>{p.name}</strong>{p.language && <span>{p.language}</span>}</div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
