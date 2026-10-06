/** Pure helpers for project selection so keyboard/DOM and 3D share one behaviour. */
export function stepIndex(current: number | null, count: number, dir: 1 | -1): number | null {
  if (count <= 0) return null;
  if (current === null) return dir === 1 ? 0 : count - 1;
  return (current + dir + count) % count;
}

export type Selection = { name: string | null };

/** First click selects; clicking the already selected node again means "open it". */
export function clickOutcome(selected: string | null, clicked: string): 'select' | 'open' {
  return selected === clicked ? 'open' : 'select';
}

/** Selected names that no longer exist (e.g. after data refresh) are dropped. */
export function sanitizeSelection(selected: string | null, names: string[]): string | null {
  return selected !== null && names.includes(selected) ? selected : null;
}
