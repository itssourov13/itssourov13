/** Contribution momentum: last 30 days vs the 30 days before, anchored on the calendar's own last day. */
export interface DayCount {
  date: string;
  count: number;
}
export interface Momentum {
  last30: number;
  prev30: number;
}

const DAY = 86_400_000;

export function momentum(days: DayCount[]): Momentum | null {
  if (days.length < 60) return null; // not enough real history to compare two windows
  const dated = days.map((d) => ({ t: Date.parse(d.date), c: d.count })).filter((d) => Number.isFinite(d.t));
  if (dated.length < 60) return null;
  const end = Math.max(...dated.map((d) => d.t));
  let last30 = 0;
  let prev30 = 0;
  for (const d of dated) {
    const age = Math.round((end - d.t) / DAY);
    if (age < 30) last30 += d.c;
    else if (age < 60) prev30 += d.c;
  }
  return { last30, prev30 };
}
