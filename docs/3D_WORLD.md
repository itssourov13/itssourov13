# 3D world

Stack (unchanged): React 19, Vite, three.js, React Three Fiber, drei. No post-processing, no new dependencies.

## Zones (each has a purpose and a DOM equivalent where it is interactive)

| Zone | Scene file | Data source | DOM equivalent |
| --- | --- | --- | --- |
| Central core | `Core.tsx` | top languages (orbiting markers: colour = language, size ∝ share) | Languages section |
| Project constellation | `ProjectConstellation.tsx` | `scene` + `edges` in generated JSON (≤ 12 nodes). Node colour = activity. Lines = shared topic / shared language only | Projects list (select / open buttons), Selected-project panel |
| Contribution terrain | `ContributionTerrain.tsx` | contribution calendar (1 instanced mesh) | Stats |
| GitHub intelligence wall | `IntelligenceWall.tsx` | language shares + monthly totals (no numbers drawn in 3D) | Stats, Languages |
| Security lab | `ResearchLab.tsx` | `focus` from `profile.config.yml` (identity text, no metrics): one rack per focus area, slow scan bar | Focus list |
| Timeline corridor | `Timeline.tsx` | real `createdAt` dates (spacing ∝ gaps, min gap enforced); marker = a published release exists | Selected-project panel |
| Portrait | `MediaWall.tsx` | `assets/source/profile.png` if valid | — (decorative) |
| Links gate | `LinksGate.tsx` | `socials` | Links list |

A camera stop (`stops.ts`) is only offered when its zone has content (`availableStops`). Not built: a research-archive room (no data source) and any fabricated network/“telemetry” diagrams.

## Interaction model

- **Mouse/touch:** orbit/zoom; hover highlights; **first click selects** a project (details panel), **clicking the selected node again opens the repo**. Touch targets are enlarged on coarse pointers and dense 3D labels are suppressed (the DOM sheet carries the text).
- **Keyboard / screen reader:** camera stop buttons, per-project “select” buttons and “open ↗” links, Previous/Next project, Escape clears selection, skip link to the details panel. A polite live region announces camera and selection changes (never hover or animation).
- **Reduced motion** (OS setting, site default, or the toggle; precedence in `effects/motion.ts`): no ambient motion, camera jump-cuts, no particle drift.

## Performance architecture

| Concern | Decision |
| --- | --- |
| Render loop | **Hybrid.** `frameloop="always"` only while ambient motion is on; otherwise `"demand"`. Frames are requested by OrbitControls (drei), the camera tour (`state.invalidate()` while moving) and `Invalidator` (selection/hover/quality/reduced-motion/portrait changes). |
| Resolution | `AdaptiveResolution` owns DPR through the R3F store (`setDpr`): `cap(level) × performance.current`. Camera movement calls `regress` (OrbitControls `regress`, plus the tour) → temporary lower resolution, restored after 250 ms idle. DPR is capped at 2. |
| Quality levels | `low` (cap 1, 0 particles, no shadows) · `medium` (≤1.5, 250) · `high` (≤2, 700, shadows). Particle count only moves a draw range on one fixed buffer. Shadow casting is a light flag; the renderer is not rebuilt. |
| Hysteresis | `effects/qualityController.ts` (pure, tested): step down needs 2 PerformanceMonitor declines within 6 s and ≥5 s since the last change; step up needs 15 s without declines, one level at a time, never above the ceiling; a step down within 60 s of a step up is ping-pong → that level becomes the session ceiling and upgrades stop. |
| Canvas recreation | Only when the **user manually** switches between Low and a non-Low level (antialiasing is fixed at context creation). Auto never remounts. |
| Monitor | Mounted only in Auto **and** while frames are produced (a demand-mode idle scene would otherwise look “slow”). |
| Draw calls | Terrain 1 · lab 3 (+light) · intelligence bars 1 · relationship lines 4 batched `lineSegments` (spokes, topic, language, selected) · ≤12 node meshes sharing one geometry · ≤12 timeline pillars · ≤7 portals. No per-item growth beyond the caps. |
| Frame loops | No React state updates and no allocations inside `useFrame` (module-level temporaries; refs mutated imperatively). Static zones are `memo`-ized. |
| Lazy work | Scene chunk loads after the JSON; the portrait texture loads when idle or when the Portrait stop is visited; the texture is disposed on unmount. |

## Failure states

Skeleton while JSON loads · retry button on malformed/missing JSON · “Preparing 3D scene…” while the chunk loads · error boundary around the scene → text summary · no WebGL / context lost → text summary · missing/corrupt portrait → empty frame, never an error.

## Preferences

`localStorage` key `itssourov13-world:prefs:v1` stores `{quality, reduceMotion, pauseAmbient}` (`effects/preferences.ts`). Every field is validated individually; corrupt JSON or blocked storage falls back to defaults. “Reset display settings” restores defaults.

## Base path

`world/base.ts` (`/itssourov13/` by default, `WORLD_BASE` overrides). The JSON URL uses `import.meta.env.BASE_URL`.

## Dev

`npm run generate && npm run world:dev`. `npm run generate:fixture` writes synthetic previews to `.preview/` only.
