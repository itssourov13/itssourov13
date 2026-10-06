/** Reduced-motion resolution: explicit user choice > OS preference > site default. */
export function resolveReduced(userOverride: boolean | null, systemPrefersReduced: boolean, configDefault: boolean): boolean {
  return userOverride ?? (systemPrefersReduced || configDefault);
}

/** Ambient (purely decorative, continuous) motion runs only when neither reduction nor pause is active. */
export function resolveAmbient(reduced: boolean, paused: boolean): boolean {
  return !reduced && !paused;
}
