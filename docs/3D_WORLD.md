# 3D world

Stack: React 19, Vite, three.js, React Three Fiber, drei. No post-processing (kept lean on purpose).

**Scene:** amber data core (rotating wireframe + emissive sphere) · project nodes on a ring (hover/click → repository) with relationship lines from shared topics/languages · language ring on the floor (real byte shares) · contribution terrain (instanced bars, height ∝ √count) · timeline pillars by repository creation month · optional portrait frame (only if `profile.png` exists).
Not implemented: a research-archive room (there is no research data source yet).

**Camera:** six stops (Overview, Core, Projects, Activity, Timeline, Portrait). Moving the camera by hand cancels the tour move. Orbit/zoom with mouse or touch; panning is disabled for predictable mobile use.

**Quality:** `low` (DPR 1, no AA/shadows/particles) · `medium` (DPR ≤1.5, AA, 250 particles) · `high` (DPR ≤2, shadows, 700 particles) · `auto` starts from device heuristics and steps down via drei `PerformanceMonitor`.

**Accessibility/fallbacks:** all content is real DOM (panel, links, stats). Reduced motion (OS setting, config default, or toggle) disables autonomous animation and replaces camera flights with jump cuts. No WebGL, or a lost context → full-page text summary. The scene never makes network requests except the one JSON file (and the optional portrait).

**Base path:** `world/base.ts` (`/itssourov13/` by default, `WORLD_BASE` overrides). Assets are never root-absolute; the data URL is built from `import.meta.env.BASE_URL`.

**Dev:** `npm run generate:fixture` previews README assets with synthetic data; `npm run world:dev` serves the world (needs `data/generated-profile.json`, produced by `npm run generate`).
