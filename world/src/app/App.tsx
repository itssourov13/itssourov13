import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { ACTIVITY_LABELS } from '../../../shared/activity.ts';
import { loadProfile } from '../data/load.ts';
import { sceneProjects } from '../data/parse.ts';
import type { WorldProfile } from '../data/parse.ts';
import { resolveAmbient, resolveReduced } from '../effects/motion.ts';
import { DEFAULT_PREFS, loadPreferences, savePreferences } from '../effects/preferences.ts';
import type { Preferences } from '../effects/preferences.ts';
import { detectAutoQuality, hasWebGL } from '../effects/quality.ts';
import type { QualitySetting } from '../effects/quality.ts';
import { useAdaptiveQuality } from '../effects/useAdaptiveQuality.ts';
import { useIdleFlag } from '../effects/useIdle.ts';
import { useMediaQuery } from '../effects/useMedia.ts';
import { availableStops } from '../scene/stops.ts';
import { sanitizeSelection } from '../state/selection.ts';
import { ProfileSkeleton, SceneLoading } from '../ui/Loading.tsx';
import { Overlay } from '../ui/Overlay.tsx';
import { SceneBoundary } from '../ui/SceneBoundary.tsx';

// Heavy 3D code (three.js, R3F) is a separate chunk, fetched only after the profile JSON succeeded.
const WorldScene = lazy(() => import('../scene/WorldScene.tsx'));

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: WorldProfile };

export default function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ac = new AbortController();
    setLoad({ status: 'loading' });
    loadProfile(ac.signal).then(
      (profile) => setLoad({ status: 'ready', profile }),
      (err: unknown) => {
        if (!ac.signal.aborted) setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      },
    );
    return () => ac.abort();
  }, [attempt]);

  if (load.status === 'loading') return <ProfileSkeleton />;
  if (load.status === 'error') {
    return (
      <main className="center">
        <h1>Data unavailable</h1>
        <p>{load.message}</p>
        <p><button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button></p>
        <p><a href="https://github.com/itssourov13">github.com/itssourov13</a></p>
      </main>
    );
  }
  return <World profile={load.profile} />;
}

function World({ profile }: { profile: WorldProfile }) {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const update = useCallback((patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })), []);
  useEffect(() => savePreferences(prefs), [prefs]);

  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const narrow = useMediaQuery('(max-width: 720px)');
  const reduced = resolveReduced(prefs.reduceMotion, systemReduced, profile.world.reducedMotionDefault);
  const ambient = resolveAmbient(reduced, prefs.pauseAmbient);

  const setting: QualitySetting = prefs.quality ?? profile.world.quality;
  const [autoStart] = useState(() => detectAutoQuality());
  const ceiling = setting === 'auto' ? autoStart : setting;
  const { level, onDecline } = useAdaptiveQuality(ceiling, setting === 'auto');
  const antialias = (setting === 'auto' ? autoStart : setting) !== 'low';

  const stops = useMemo(() => availableStops(profile), [profile]);
  const projects = useMemo(() => sceneProjects(profile), [profile]);
  const [stopId, setStopId] = useState('overview');
  const [nonce, setNonce] = useState(0);
  const [selectedRaw, setSelected] = useState<string | null>(null);
  const selected = sanitizeSelection(selectedRaw, projects.map((p) => p.name));
  const [hovered, setHovered] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [webgl] = useState(() => hasWebGL());
  const [lost, setLost] = useState(false);
  const [failed, setFailed] = useState(false);
  const sceneActive = webgl && !lost && !failed;
  const idle = useIdleFlag(sceneActive);
  const portraitReady = idle || stopId === 'portrait';

  const goTo = useCallback((id: string) => {
    setStopId(id);
    setNonce((n) => n + 1);
    setAnnouncement(`Camera: ${stops.find((s) => s.id === id)?.label ?? id}`);
  }, [stops]);

  // Selection from the 3D scene (no camera move) and from the DOM list (also frames the constellation).
  const select3d = useCallback((name: string | null) => {
    setSelected(name);
    const p = projects.find((x) => x.name === name);
    setAnnouncement(p ? `Selected project ${p.name}${p.language ? `, ${p.language}` : ''}, ${ACTIVITY_LABELS[p.activity]}` : 'Selection cleared');
  }, [projects]);
  const selectDom = useCallback((name: string | null) => {
    select3d(name);
    if (name && stopId !== 'projects' && sceneActive) goTo('projects');
  }, [select3d, stopId, sceneActive, goTo]);

  const notice = sceneActive ? undefined : failed ? 'The 3D scene could not start. Showing the summary instead.' : lost ? 'The 3D view stopped (graphics context lost). Showing the summary — reload to try again.' : '3D graphics are not available in this browser. Showing the summary instead.';

  return (
    <>
      {sceneActive && (
        <div className="stage" role="img" aria-label="Interactive 3D visualization of GitHub projects and activity. Everything shown here is also available as text in the details panel.">
          <SceneBoundary onError={() => setFailed(true)}>
            <Suspense fallback={<SceneLoading />}>
              <WorldScene
                profile={profile}
                level={level}
                antialias={antialias}
                monitor={setting === 'auto' && ambient}
                onDecline={onDecline}
                reduced={reduced}
                ambient={ambient}
                stopId={stopId}
                stopNonce={nonce}
                selected={selected}
                hovered={hovered}
                onSelect={select3d}
                onHover={setHovered}
                coarse={coarse}
                portraitReady={portraitReady}
                onContextLost={() => setLost(true)}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <Overlay
        profile={profile}
        sceneActive={sceneActive}
        notice={notice}
        stops={stops}
        stopId={stopId}
        onStop={goTo}
        setting={setting}
        level={level}
        onSetting={(q) => update({ quality: q })}
        reduced={reduced}
        onReduced={(v) => update({ reduceMotion: v })}
        paused={prefs.pauseAmbient}
        onPaused={(v) => update({ pauseAmbient: v })}
        onResetPrefs={() => setPrefs({ ...DEFAULT_PREFS })}
        selected={selected}
        onSelect={selectDom}
        hovered={hovered}
        onHover={setHovered}
        announcement={announcement}
        narrow={narrow}
      />
    </>
  );
}
