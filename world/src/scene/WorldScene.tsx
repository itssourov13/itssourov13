import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ElementRef, ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, PerformanceMonitor, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { projectEdges, sceneProjects } from '../data/parse.ts';
import type { WorldProfile, WorldProject } from '../data/parse.ts';
import { PRESETS } from '../effects/quality.ts';
import type { QualityLevel } from '../effects/quality.ts';
import { STOPS } from './stops.ts';
import type { Stop } from './stops.ts';

const AMBER = '#d98a4e';
const AMBER_HI = '#f0a65a';
const COOL = '#5fa8c9';
const LANG_COLORS = ['#e8a15c', '#5fa8c9', '#8fb08a', '#d9c7a0', '#a98bb5', '#7a8aa0', '#c46a4a', '#4f9d9a', '#6b7280'];
const LEVEL_COLORS = ['#1b2027', '#5b3a22', '#8f5a30', '#c17a3e', '#f0a65a'];
const BASE = import.meta.env.BASE_URL;

class Boundary extends Component<{ children: ReactNode; fallback?: ReactNode; onError?: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError?.();
  }
  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

function CameraRig({ stop, reduced, controls }: { stop: Stop; reduced: boolean; controls: RefObject<ElementRef<typeof OrbitControls> | null> }) {
  const { camera } = useThree();
  const animating = useRef(true);
  const bound = useRef(false);
  const goalPos = useMemo(() => new THREE.Vector3(...stop.pos), [stop]);
  const goalTarget = useMemo(() => new THREE.Vector3(...stop.target), [stop]);

  useEffect(() => {
    if (reduced) {
      camera.position.copy(goalPos); // reduced motion: jump cut, no camera choreography
      const c = controls.current;
      if (c) {
        c.target.copy(goalTarget);
        c.update();
      }
      animating.current = false;
    } else animating.current = true;
  }, [goalPos, goalTarget, reduced, camera, controls]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (!bound.current) {
      c.addEventListener('start', () => (animating.current = false)); // user input cancels the tour move
      bound.current = true;
    }
    if (!animating.current) return;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2.2);
    camera.position.lerp(goalPos, k);
    c.target.lerp(goalTarget, k);
    c.update();
    if (camera.position.distanceTo(goalPos) < 0.05) animating.current = false;
  });
  return null;
}

function Core({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!reduced && g.current) g.current.rotation.y += dt * 0.15;
  });
  return (
    <group position={[0, 1.8, 0]}>
      <group ref={g}>
        <mesh>
          <icosahedronGeometry args={[1.5, 1]} />
          <meshStandardMaterial color="#2a2118" wireframe emissive={AMBER} emissiveIntensity={0.7} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.85, 2]} />
          <meshStandardMaterial color={AMBER_HI} emissive={AMBER} emissiveIntensity={1.3} roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.2, 0.025, 8, 96]} />
          <meshBasicMaterial color={COOL} />
        </mesh>
      </group>
      <pointLight color="#e8a15c" intensity={40} distance={24} decay={2} />
    </group>
  );
}

function Floor() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[24, 72]} />
        <meshStandardMaterial color="#10141a" metalness={0.55} roughness={0.4} />
      </mesh>
      <gridHelper args={[48, 48, '#4a3322', '#1b2028']} position-y={0.01} />
    </>
  );
}

function LanguageRing({ items }: { items: { name: string; percent: number }[] }) {
  const total = items.reduce((a, i) => a + i.percent, 0) || 1;
  let start = 0;
  return (
    <group position-y={0.03} rotation-x={-Math.PI / 2}>
      {items.map((it, i) => {
        const len = (it.percent / total) * Math.PI * 2;
        const theta = start;
        start += len;
        return (
          <mesh key={it.name}>
            <ringGeometry args={[3.3, 3.75, 48, 1, theta, Math.max(0.02, len - 0.04)]} />
            <meshBasicMaterial color={it.name === 'Other' ? LANG_COLORS[8] : LANG_COLORS[i % 8]} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function ProjectNodes({ projects, reduced, active, onActive }: { projects: WorldProject[]; reduced: boolean; active: string | null; onActive: (n: string | null) => void }) {
  const R = 7;
  const pos = useMemo(
    () =>
      projects.map((_, i) => {
        const a = (i / Math.max(1, projects.length)) * Math.PI * 2 - Math.PI / 2;
        return new THREE.Vector3(Math.cos(a) * R, 1.6 + (i % 3) * 0.55, Math.sin(a) * R);
      }),
    [projects],
  );
  const edges = useMemo(() => projectEdges(projects), [projects]);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!reduced && group.current) group.current.rotation.y += dt * 0.03;
  });
  const core = new THREE.Vector3(0, 1.8, 0);
  return (
    <group ref={group}>
      {pos.map((p, i) => (
        <Line key={`c${i}`} points={[core, p]} color={AMBER} transparent opacity={0.18} lineWidth={1} />
      ))}
      {edges.map(([a, b]) => (
        <Line key={`e${a}-${b}`} points={[pos[a]!, pos[b]!]} color={COOL} transparent opacity={0.4} lineWidth={1.2} />
      ))}
      {projects.map((pr, i) => {
        const on = active === pr.name;
        return (
          <group key={pr.name} position={pos[i]}>
            <mesh
              castShadow
              scale={on ? 1.35 : 1}
              onPointerOver={(e) => {
                e.stopPropagation();
                onActive(pr.name);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                onActive(null);
                document.body.style.cursor = '';
              }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(pr.url, '_blank', 'noopener,noreferrer');
              }}
            >
              <sphereGeometry args={[0.45, 32, 24]} />
              <meshStandardMaterial color="#1b1f26" emissive={on ? AMBER_HI : AMBER} emissiveIntensity={on ? 1.6 : 0.7} metalness={0.5} roughness={0.35} />
            </mesh>
            {on && (
              <Html center position={[0, 1, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
                <div className="node-label">
                  <strong>{pr.name}</strong>
                  {pr.language && <span>{pr.language}</span>}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Terrain({ weeks }: { weeks: [number, number][][] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => weeks.flatMap((w, i) => w.map(([count, level], j) => ({ i, j, count, level }))), [weeks]);
  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach((c, n) => {
      const h = c.count === 0 ? 0.05 : 0.25 + 2.8 * Math.sqrt(c.count / max);
      m.compose(new THREE.Vector3((c.i - weeks.length / 2) * 0.44, h / 2, -14 + c.j * 0.44), new THREE.Quaternion(), new THREE.Vector3(0.36, h, 0.36));
      mesh.setMatrixAt(n, m);
      mesh.setColorAt(n, color.set(LEVEL_COLORS[c.level] ?? LEVEL_COLORS[0]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells, max, weeks.length]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.55} metalness={0.15} />
    </instancedMesh>
  );
}

function Timeline({ projects, active, onActive }: { projects: WorldProject[]; active: string | null; onActive: (n: string | null) => void }) {
  const sorted = useMemo(() => [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [projects]);
  return (
    <group position={[14, 0, 0]}>
      {sorted.map((p, i) => {
        const z = (i - (sorted.length - 1) / 2) * 1.6;
        const on = active === p.name;
        return (
          <group key={p.name} position={[0, 0, z]}>
            <mesh position-y={0.6} castShadow onPointerOver={() => onActive(p.name)} onPointerOut={() => onActive(null)}>
              <boxGeometry args={[0.5, 1.2, 0.5]} />
              <meshStandardMaterial color="#1b1f26" emissive={COOL} emissiveIntensity={on ? 1.2 : 0.3} metalness={0.4} roughness={0.4} />
            </mesh>
            <Html center position={[0, 1.7, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
              <div className="node-label small">
                {p.createdAt.slice(0, 7)}
                {on ? ` · ${p.name}` : ''}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function MediaWall({ file, alt }: { file: string; alt: string }) {
  const tex = useTexture(`${BASE}${file}`);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <group position={[-14, 2.2, 0]} rotation-y={Math.PI / 2}>
      <mesh position-z={-0.06}>
        <boxGeometry args={[3.1, 3.7, 0.1]} />
        <meshStandardMaterial color="#1b1f26" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh>
        <planeGeometry args={[2.8, 3.4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Html center position={[0, -2.2, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className="node-label small">{alt}</div>
      </Html>
    </group>
  );
}

function Particles({ count, reduced }: { count: number; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    let s = 1337; // deterministic LCG, no Math.random → stable layout between sessions
    const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (rnd() - 0.5) * 50;
      a[i * 3 + 1] = rnd() * 14 + 0.5;
      a[i * 3 + 2] = (rnd() - 0.5) * 50;
    }
    return a;
  }, [count]);
  useFrame((_, dt) => {
    if (!reduced && ref.current) ref.current.rotation.y += dt * 0.01;
  });
  if (count === 0) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e8a15c" size={0.06} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

export interface WorldSceneProps {
  profile: WorldProfile;
  quality: QualityLevel;
  autoQuality: boolean;
  onDecline: () => void;
  reduced: boolean;
  stopId: string;
  activeProject: string | null;
  onActive: (name: string | null) => void;
  onContextLost: () => void;
}

export default function WorldScene(props: WorldSceneProps) {
  const { profile, quality, reduced, activeProject, onActive } = props;
  const preset = PRESETS[quality];
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const projects = useMemo(() => sceneProjects(profile), [profile]);
  const stop = STOPS.find((s) => s.id === props.stopId) ?? STOPS[0]!;

  return (
    <Canvas
      key={`${preset.antialias}`} // antialias is fixed at context creation; recreate when it changes
      dpr={preset.dpr}
      shadows={preset.shadows}
      gl={{ antialias: preset.antialias, powerPreference: 'high-performance' }}
      camera={{ position: [0, 16, 42], fov: 45, near: 0.1, far: 140 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          props.onContextLost();
        });
      }}
    >
      <color attach="background" args={['#0b0d10']} />
      <fog attach="fog" args={['#0b0d10', 24, 70]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#6a7a90', '#1a1410', 0.5]} />
      <directionalLight position={[-12, 20, 10]} intensity={1.1} castShadow={preset.shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} />
      {props.autoQuality && <PerformanceMonitor onDecline={props.onDecline} flipflops={3} onFallback={props.onDecline} />}
      <Floor />
      <Core reduced={reduced} />
      {profile.languages && <LanguageRing items={profile.languages.items} />}
      <ProjectNodes projects={projects} reduced={reduced} active={activeProject} onActive={onActive} />
      {profile.contributions && <Terrain weeks={profile.contributions.weeks} />}
      {projects.length > 0 && <Timeline projects={projects} active={activeProject} onActive={onActive} />}
      {profile.media.profileImage && (
        <Boundary>
          <Suspense fallback={null}>
            <MediaWall file={profile.media.profileImage.file} alt={profile.media.profileImage.alt || profile.profile.displayName} />
          </Suspense>
        </Boundary>
      )}
      <Particles count={preset.particles} reduced={reduced} />
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={4} maxDistance={42} maxPolarAngle={Math.PI * 0.48} />
      <CameraRig stop={stop} reduced={reduced} controls={controls} />
    </Canvas>
  );
}
