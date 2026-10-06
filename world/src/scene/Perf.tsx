import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Owns the renderer pixel ratio. `cap` comes from the current quality level; `performance.current`
 * (R3F "regression") drops temporarily while the camera moves and returns to 1 after the debounce.
 * Pixel ratio is changed through the store, so quality changes never recreate the <Canvas>.
 */
export function AdaptiveResolution({ cap }: { cap: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const regression = useThree((s) => s.performance.current);
  useEffect(() => {
    setDpr(Math.max(0.75, cap * regression));
  }, [cap, regression, setDpr]);
  return null;
}

/** In `frameloop="demand"` mode, request a frame whenever render-relevant props change. */
export function Invalidator({ deps }: { deps: readonly unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, ...deps]);
  return null;
}
