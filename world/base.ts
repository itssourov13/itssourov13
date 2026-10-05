/**
 * Single source of truth for the deployment base path.
 * GitHub Pages project sites live under /<repo>/, so assets must never be root-absolute.
 * Override with the WORLD_BASE environment variable (the deploy workflow derives it from the repository name).
 */
export const DEFAULT_BASE = '/itssourov13/';

export function resolveBase(value: string | undefined): string {
  const v = (value ?? '').trim();
  if (v === '' || v === '/') return v === '/' ? '/' : DEFAULT_BASE;
  if (!/^[A-Za-z0-9._\-/]+$/.test(v) || v.includes('..')) throw new Error(`Invalid WORLD_BASE: ${v}`);
  const withLead = v.startsWith('/') ? v : `/${v}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}
