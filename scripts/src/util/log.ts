/** Minimal logger. Never pass tokens or headers to these functions. */
export const log = {
  info: (msg: string) => console.log(`[info] ${msg}`),
  warn: (msg: string) => console.warn(`[warn] ${msg}`),
  error: (msg: string) => console.error(`[error] ${msg}`),
};
