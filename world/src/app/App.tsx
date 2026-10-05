import { Suspense, lazy, useEffect, useState } from 'react';
import { loadProfile } from '../data/load.ts';
import type { WorldProfile } from '../data/parse.ts';
import { detectAutoQuality, hasWebGL, stepDown } from '../effects/quality.ts';
import type { QualityLevel, QualitySetting } from '../effects/quality.ts';
import { useMediaQuery } from '../effects/useMedia.ts';
import { Overlay } from '../ui/Overlay.tsx';

const WorldScene = lazy(() => import('../scene/WorldScene.tsx'));

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: WorldProfile };

export default function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  useEffect(() => {
    const ac = new AbortController();
    loadProfile(ac.signal).then(
      (profile) => setLoad({ status: 'ready', profile }),
      (err: unknown) => {
        if (!ac.signal.aborted) setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      },
    );
    return () => ac.abort();
  }, []);

  if (load.status === 'loading') return <div className="center" role="status">Loading…</div>;
  if (load.status === 'error') {
    return (
      <div className="center">
        <h1>Data unavailable</h1>
        <p>{load.message}</p>
        <p><a href="https://github.com/itssourov13">github.com/itssourov13</a></p>
      </div>
    );
  }
  return <World profile={load.profile} />;
}

function World({ profile }: { profile: WorldProfile }) {
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? (systemReduced || profile.world.reducedMotionDefault);
  const [setting, setSetting] = useState<QualitySetting>(profile.world.quality);
  const [autoLevel, setAutoLevel] = useState<QualityLevel>(() => detectAutoQuality());
  const [stopId, setStopId] = useState('overview');
  const [active, setActive] = useState<string | null>(null);
  const [webgl] = useState(() => hasWebGL());
  const [lost, setLost] = useState(false);
  const level: QualityLevel = setting === 'auto' ? autoLevel : setting;
  const sceneActive = webgl && !lost;

  return (
    <>
      {sceneActive && (
        <div className="stage" role="img" aria-label="Interactive 3D visualization of GitHub projects and activity. All content is also listed in the details panel.">
          <Suspense fallback={null}>
            <WorldScene
              profile={profile}
              quality={level}
              autoQuality={setting === 'auto'}
              onDecline={() => setAutoLevel(stepDown)}
              reduced={reduced}
              stopId={stopId}
              activeProject={active}
              onActive={setActive}
              onContextLost={() => setLost(true)}
            />
          </Suspense>
        </div>
      )}
      <Overlay
        profile={profile}
        sceneActive={sceneActive}
        notice={sceneActive ? undefined : lost ? 'The 3D view stopped (graphics context lost). Showing the summary instead — reload to try again.' : '3D graphics are not available in this browser. Showing the summary instead.'}
        stopId={stopId}
        onStop={setStopId}
        quality={setting}
        onQuality={setSetting}
        reduced={reduced}
        onReduced={setReducedOverride}
        activeProject={active}
        onActive={setActive}
      />
    </>
  );
}
