import { useEffect, useState } from 'react';

/** Becomes true once the browser is idle (or after `fallbackMs`), used to defer heavy optional assets. */
export function useIdleFlag(enabled: boolean, fallbackMs = 3000): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || ready) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: fallbackMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), fallbackMs);
    return () => window.clearTimeout(t);
  }, [enabled, ready, fallbackMs]);
  return ready;
}
