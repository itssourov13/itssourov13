import { Component, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { BASE } from './palette.ts';

function Frame({ children, caption, coarse }: { children?: ReactNode; caption: string; coarse: boolean }) {
  return (
    <group position={[-14, 2.2, 0]} rotation-y={Math.PI / 2}>
      <mesh position-z={-0.06}>
        <boxGeometry args={[3.1, 3.7, 0.1]} />
        <meshStandardMaterial color="#1b1f26" metalness={0.6} roughness={0.35} />
      </mesh>
      {children}
      {!coarse && (
        <Html center position={[0, -2.2, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div className="node-label small">{caption}</div>
        </Html>
      )}
    </group>
  );
}

function Portrait({ file, alt, coarse }: { file: string; alt: string; coarse: boolean }) {
  const tex = useTexture(`${BASE}${file}`);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return () => tex.dispose(); // release GPU memory when the portrait unmounts
  }, [tex]);
  return (
    <Frame caption={alt} coarse={coarse}>
      <mesh>
        <planeGeometry args={[2.8, 3.4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </Frame>
  );
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Portrait frame. The texture is only requested when `enabled` (idle or when the Portrait stop is
 * visited), and a missing/corrupt file degrades to an empty frame — never an error or a broken scene.
 */
export function MediaWall({ file, alt, enabled, coarse }: { file: string; alt: string; enabled: boolean; coarse: boolean }) {
  const empty = <Frame caption="Portrait unavailable" coarse={coarse} />;
  if (!enabled) return <Frame caption={alt} coarse={coarse} />;
  return (
    <Boundary fallback={empty}>
      <Suspense fallback={<Frame caption={alt} coarse={coarse} />}>
        <Portrait file={file} alt={alt} coarse={coarse} />
      </Suspense>
    </Boundary>
  );
}
