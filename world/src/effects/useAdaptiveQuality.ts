import { useCallback, useEffect, useRef, useState } from 'react';
import type { QualityLevel } from './quality.ts';
import { initQuality, reduceQuality } from './qualityController.ts';
import type { QEvent, QState } from './qualityController.ts';

const TICK_MS = 2000;

/**
 * Binds the pure quality controller to React. State is updated only when the level actually changes
 * (rare); timers are cleaned up on unmount. In manual mode the user's level is used verbatim.
 */
export function useAdaptiveQuality(ceiling: QualityLevel, adaptive: boolean): { level: QualityLevel; onDecline: () => void } {
  const [level, setLevel] = useState<QualityLevel>(ceiling);
  const state = useRef<QState>(initQuality(ceiling, performance.now()));

  const apply = useCallback((e: QEvent) => {
    const next = reduceQuality(state.current, e);
    state.current = next;
    setLevel(next.level); // no-op re-render when unchanged
  }, []);

  useEffect(() => {
    apply({ type: 'ceiling', ceiling, now: performance.now() });
  }, [ceiling, apply]);

  useEffect(() => {
    if (!adaptive) return;
    const id = window.setInterval(() => {
      if (!document.hidden) apply({ type: 'tick', now: performance.now() });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [adaptive, apply]);

  const onDecline = useCallback(() => {
    if (adaptive) apply({ type: 'decline', now: performance.now() });
  }, [adaptive, apply]);

  return { level: adaptive ? level : ceiling, onDecline };
}
