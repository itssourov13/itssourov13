import { memo, useMemo, useRef } from 'react';
import type { ElementRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { sceneProjects } from '../data/parse.ts';
import type { WorldProfile } from '../data/parse.ts';
import { PRESETS } from '../effects/quality.ts';
import type { QualityLevel } from '../effects/quality.ts';
import { CameraRig } from './CameraRig.tsx';
import { Core } from './Core.tsx';
import { ContributionTerrain } from './ContributionTerrain.tsx';
import { IntelligenceWall } from './IntelligenceWall.tsx';
import { LinksGate } from './LinksGate.tsx';
import { MediaWall } from './MediaWall.tsx';
import { Particles } from './Particles.tsx';
import { AdaptiveResolution, Invalidator } from './Perf.tsx';
import { ProjectConstellation } from './ProjectConstellation.tsx';
import { ResearchLab } from './ResearchLab.tsx';
import { Timeline } from './Timeline.tsx';
import { LANG_COLORS } from './palette.ts';
import { buildSceneModel } from './layout.ts';
import { STOPS } from './stops.ts';

export interface WorldSceneProps {
  profile: WorldProfile;
  level: QualityLevel;
  /** Fixed at mount for Auto; changes only when the user manually crosses the low/non-low boundary. */
  antialias: boolean;
  /** Performance monitoring only runs in Auto mode while frames are actually being produced. */
  monitor: boolean;
  onDecline: () => void;
  reduced: boolean;
  ambient: boolean;
  stopId: string;
  stopNonce: number;
  selected: string | null;
  hovered: string | null;
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
  coarse: boolean;
  portraitReady: boolean;
  onContextLost: () => void;
}

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#6a7a90', '#1a1410', 0.5]} />
      {/* Shadow map stays 1024²; only `castShadow` toggles with quality, so no renderer recreation. */}
      <directionalLight position={[-12, 20, 10]} intensity={1.1} castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} />
    </>
  );
}

function Floor() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[30, 72]} />
        <meshStandardMaterial color="#10141a" metalness={0.55} roughness={0.4} />
      </mesh>
      <gridHelper args={[60, 60, '#4a3322', '#1b2028']} position-y={0.01} />
    </>
  );
}

const LanguageRing = memo(function LanguageRing({ items }: { items: { name: string; percent: number }[] }) {
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
            <meshBasicMaterial color={it.name === 'Other' ? LANG_COLORS[8] : LANG_COLORS[i % 8]} side={DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
});

// Static zones are memoized: hover/selection re-renders of the scene must not touch them.
const StaticTerrain = memo(ContributionTerrain);
const StaticWall = memo(IntelligenceWall);
const StaticLab = memo(ResearchLab);
const StaticCore = memo(Core);

// Initial pixel-ratio hint only. AdaptiveResolution owns the ratio afterwards.
const initialDpr = () => Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 2);

export default function WorldScene(props: WorldSceneProps) {
  const { profile, level, ambient, reduced, coarse, selected, hovered } = props;
  const preset = PRESETS[level];
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const projects = useMemo(() => sceneProjects(profile), [profile]);
  const model = useMemo(() => buildSceneModel(profile, projects), [profile, projects]);
  const stop = STOPS.find((s) => s.id === props.stopId) ?? STOPS[0]!;
  const dpr0 = useRef(initialDpr());
  const languages = useMemo(() => profile.languages?.items ?? [], [profile]);

  return (
    <Canvas
      key={props.antialias ? 'aa' : 'noaa'} // the ONLY remount trigger: antialias is fixed at context creation
      frameloop={ambient ? 'always' : 'demand'} // static scene + no ambient motion → render only on input/animation
      dpr={dpr0.current}
      performance={{ min: 0.6, max: 1, debounce: 250 }}
      shadows="percentage"
      gl={{ antialias: props.antialias, powerPreference: 'high-performance' }}
      camera={{ position: [0, 16, 42], fov: 45, near: 0.1, far: 160 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          props.onContextLost();
        });
      }}
    >
      <color attach="background" args={['#0b0d10']} />
      <fog attach="fog" args={['#0b0d10', 28, 80]} />
      <Lights shadows={preset.shadows} />
      {props.monitor && <PerformanceMonitor onDecline={props.onDecline} />}
      <AdaptiveResolution cap={preset.dpr[1]} />
      <Invalidator deps={[level, selected, hovered, reduced, coarse, props.portraitReady, profile]} />

      <Floor />
      <StaticCore languages={languages} ambient={ambient} />
      {profile.languages && <LanguageRing items={languages} />}
      <ProjectConstellation projects={projects} positions={model.positions} edges={profile.edges} selected={selected} hovered={hovered} onSelect={props.onSelect} onHover={props.onHover} ambient={ambient} coarse={coarse} />
      {profile.contributions && <StaticTerrain weeks={profile.contributions.weeks} />}
      <StaticWall languages={profile.languages?.items ?? null} monthly={profile.contributions?.monthly ?? null} coarse={coarse} />
      <StaticLab items={model.lab} ambient={ambient} />
      <Timeline projects={projects} selected={selected} hovered={hovered} onSelect={props.onSelect} onHover={props.onHover} coarse={coarse} />
      {profile.media.profileImage && <MediaWall file={profile.media.profileImage.file} alt={profile.media.profileImage.alt || profile.profile.displayName} enabled={props.portraitReady} coarse={coarse} />}
      <LinksGate links={model.links} coarse={coarse} />
      <Particles count={coarse ? Math.min(preset.particles, 150) : preset.particles} ambient={ambient} />

      {/* `regress` makes camera movement lower the resolution temporarily; drei also invalidates on change. */}
      <OrbitControls ref={controls} makeDefault regress enableDamping dampingFactor={0.08} enablePan={false} minDistance={4} maxDistance={46} maxPolarAngle={Math.PI * 0.48} />
      <CameraRig stop={stop} nonce={props.stopNonce} reduced={reduced} controls={controls} />
    </Canvas>
  );
}
