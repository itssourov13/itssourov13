# HANDOFF — SOUROV // DIGITAL SECURITY PROFILE ENGINE

> **Purpose:** Continuity contract for future Claude/AI agents working on the GitHub profile README + automation + 3D companion project.
>
> **Rule:** A future agent must read this file before making significant changes.

---

## 1. Project Identity
### 1.1 Canonical GitHub Account

This repository belongs to the GitHub account below. Do not guess or replace it.

```yaml
username: itssourov13
profile_url: https://github.com/itssourov13
api_user_url: https://api.github.com/users/itssourov13
profile_repository: itssourov13/itssourov13
profile_repository_url: https://github.com/itssourov13/itssourov13
display_name: Md Sourov Mondol
short_name: Sourov
```

Seed social URLs currently associated with the public profile:

```text
GitHub    https://github.com/itssourov13
LinkedIn  https://www.linkedin.com/in/mdsourov-mondol630
X         https://x.com/md_sourov630
Facebook  https://www.facebook.com/md.sourov.mondol630
Instagram https://www.instagram.com/md.sourov.mondol630
```

These are configuration seeds, not dynamic truth. Verify the profile/config/API before publishing. Dynamic repository and contribution data must always be collected from GitHub for `itssourov13`.

Canonical showcase-repository seeds currently visible on the public profile:

```text
https://github.com/itssourov13/blog
https://github.com/itssourov13/cyberos
https://github.com/itssourov13/passhunter
https://github.com/itssourov13/study-planner-apk
https://github.com/itssourov13/personal-website-demo
```

These are only a verification seed. The generator must refresh the actual repository list from GitHub and must exclude `itssourov13/itssourov13` (the profile repository) from showcase/discovery results unless explicitly configured.


**Project:** SOUROV // DIGITAL SECURITY PROFILE ENGINE  
**GitHub account:** `itssourov13`  
**Display identity:** `Md Sourov Mondol`  
**Short name:** `Sourov`  
**Primary direction:** Cybersecurity + software engineering + research  
**Visual direction:** cinematic, premium, restrained futuristic security-lab aesthetic

### Core idea

This repository is not just a manually written GitHub README. It is a small product with three connected layers:

```text
GitHub API / GraphQL
        ↓
Data collection + normalization
        ↓
Generated assets + generated README/data
        ↓
┌─────────────────────┬────────────────────────┐
│ GitHub Profile README│ Interactive 3D World   │
│ static media/SVG/GIF │ React/Three.js/WebGL   │
└─────────────────────┴────────────────────────┘
        ↓
GitHub Actions automation
```

---

## 2. Current Status

**Status:** Upgrade pass (phases 1–14 of the upgrade brief) implemented on top of the Phase 1 delivery. **Source-complete; not verified in a real toolchain** (see §16 and the change log). Date: 2026-10-06.

### Baseline (before the upgrade)
- Live repo `itssourov13/itssourov13` (web fetch, 2026-10-06): working, 2 commits, README generated from real data (22 public repos, data stamp 2026-10-05), 9 open PRs (presumably Dependabot, not inspected).
- The upgrade was developed on a sandbox copy of the Phase 1 delivery (no `node_modules`, no network from bash, no access to the user's working copy). Baseline checks runnable there: stand-in-vitest 45/45, `validate-config`/`check-*` OK, `tsc` clean on scripts. Not runnable: `npm run lint|build|format:check` (tools not installed; installation forbidden by the brief).

### Current architecture
`profile.config.yml` → collector (`scripts/src/api`, `data/collect.ts`) → `data/*.json` → pure pipeline (`scripts/src/pipeline.ts`) → `README.md`, `assets/generated/*.svg`, `data/generated-profile.json` → world (`world/`). **New:** `shared/` (activity classification, relationship graph, momentum) is imported by both the generator and the world. See docs/ARCHITECTURE.md (selection/sorting rules), docs/3D_WORLD.md (zones, performance, a11y), docs/AUTOMATION.md (deploy-trigger audit).

### Completed phases (summary)
1. **Data model:** shared activity/graph/momentum; `excludedProjects`; tests for missing fields, dedupe, sorting, archived/fork handling.
2. **Showcase:** cards show activity status, archived marker, release; Latest table has Status + topics; collapsed “Archived & excluded”; escaping tests.
3. **Intelligence:** 30-day momentum (real calendar only), shown in the pulse panel and world; stale-data notice in the world (runtime, ≥3 days).
4. **World zones:** layered core with language satellites, batched constellation with selection/halo/detail panel, instanced terrain, GitHub intelligence wall, security lab (focus areas), date-true timeline with release markers, portrait, links gate, 9 zone-aware camera stops. Split into `world/src/scene/*`.
5–6, 9. **Interaction/a11y/mobile:** DOM equivalents for every interactive 3D concept, live region, skip link, Escape, Prev/Next project, 44px targets, bottom-sheet and tablet layouts, forced-colors rule.
7. **Performance:** hybrid frameloop (demand when no ambient motion), store-owned DPR with movement regression, pure hysteresis controller (no ping-pong), no Canvas remount except manual Low↔other, draw-call caps, memoized static zones, no per-frame state/allocations (grep-audited).
8. **Loading/failure:** skeleton, retry, scene-loading, error boundary, lazy portrait with fallback.
10–11. **Polish/settings:** restrained motion; Quality, Reduce motion, Pause ambient, status line, reset; schema-safe `localStorage` prefs.
12. **README** hierarchy preserved; **13. Actions audit:** `shared/**` added to deploy paths; deploy now runs only when `data/generated-profile.json` changed; Dependabot grouped + majors of the 3D stack ignored.
14. **Tests:** 96 (stand-in runner) across scripts, shared, world pure modules.

### Dependency requests
None. `package.json` is unchanged (no new dependencies). `DEPENDENCY_REQUEST.md` was not needed.

### Decisions not to reverse casually
- Generated outputs are authoritative; never hand-edit README/`assets/generated`/`data/generated-profile.json`.
- `schemaVersion` stays 1 with additive fields; the world parser derives missing fields via `shared/`.
- Only the Low↔non-Low manual switch remounts the Canvas (antialiasing).
- Camera stops exist only for zones with content. No invented categories, metrics, telemetry, or research items.

## 3. Immediate First Actions for a New Agent

1. Read this `HANDOFF.md` completely.
2. Read the project master prompt if it is present: `CLAUDE_MASTER_PROMPT.md`.
3. Inspect the complete repository tree.
4. Inspect `README.md`, `package.json`, lockfile, workflows, configs, docs, and media.
5. Check whether `profile.config.yml` already exists.
6. Detect whether the repo already contains `world/`, `scripts/`, `assets/`, or generated data.
7. Run non-destructive diagnostics before modifying anything.
8. Update this handoff with the real state before beginning major implementation.

---

## 4. Source-of-Truth Files

The intended canonical control points are:

```text
profile.config.yml          human-editable profile/content/config
scripts/                    collection + normalization + generation code
assets/source/              user-supplied media
assets/generated/           generated README media
README.md                   generated profile presentation
world/                      external 3D/WebGL companion
.github/workflows/          automation + CI/CD
data/                       generated/cached data snapshots
HANDOFF.md                  current agent/project state
```

If the actual implementation diverges, document the reason here.

---

## 5. Intended Architecture

### Data layer

Use real GitHub data. Preferred sources:

- GitHub REST API for repository/user/release/topic/language information.
- GitHub GraphQL API for contribution calendar and richer contribution information when useful.
- Local fixtures for tests.
- Cached snapshots to make generation deterministic and resilient to transient API failures.

### Generation layer

Recommended pipeline:

```text
profile.config.yml
        +
GitHub API data
        ↓
Normalized domain model
        ↓
Section models
        ↓
Asset generators
        ↓
README renderer
        ↓
README.md + assets/generated + data/generated-profile.json
```

### 3D layer

The web companion should consume generated JSON rather than making many GitHub API requests from every visitor browser.

```text
GitHub
  ↓
Actions
  ↓
data/generated-profile.json
  ↓
React/Vite/Three.js
```

---

## 6. README Reality / Constraints

The GitHub profile README must be treated as a constrained presentation surface.

Do not rely on:

- arbitrary JavaScript execution inside README
- inline SVG scripting
- live WebGL canvas inside GitHub README
- arbitrary embedded video players
- third-party dynamic image services as the only source of critical content

Preferred README media:

- static SVG
- PNG/JPG
- GIF for carefully selected motion
- clickable image/poster linking to an external/full experience
- `<picture>` for light/dark image variants where appropriate
- accessible Markdown/HTML links

The full real-time 3D experience belongs in the external `world/` application.

---

## 7. Intended Feature Set

### Identity

- premium cinematic hero
- optional real personal photo
- clear name/headline
- social links
- cybersecurity-focused positioning
- restrained branding/monogram

### Dynamic GitHub data

- latest public repositories
- manually selected featured repositories
- languages
- contribution calendar
- activity trend
- repository metadata
- releases where available
- project topics where available

### Generated visualizations

- 3D contribution terrain / code-city style visual
- project constellation
- language visualization / galaxy
- activity pulse
- GitHub intelligence panel
- terminal-style decorative panel

### Media

- profile photo support
- optional cinematic GIF
- project demo GIFs
- video poster linking to video/full experience
- screenshots
- designed fallbacks for missing assets

### Automation

- scheduled profile update
- manual workflow dispatch
- generated README/assets
- generated data snapshot
- only commit when generated output actually changes
- CI on PR/push

### 3D companion

- immersive research-lab environment
- central data core
- project nodes
- GitHub activity visualization
- research archive
- media wall
- timeline corridor
- cinematic camera movement
- desktop mouse/orbit controls
- touch/mobile controls
- low/medium/high/auto quality
- reduced-motion mode
- WebGL fallback
- repository-path-safe deployment

---

## 8. Current User Requirements

The user wants a very high-quality result and specifically wants:

- automatic updates when new repositories/projects are created or repository activity changes
- premium, high-end visuals
- 3D/animated presentation where GitHub's platform allows it
- realistic/high-end 3D experience outside the README
- photos and video-related presentation
- many advanced features, but without turning the profile into visual clutter
- an architecture that future Claude agents can continue cleanly

Important quality principle:

> More effects do not automatically mean more premium. Prioritize composition, typography, lighting, materials, data accuracy, performance, and consistency.

---

## 9. Repository Automation Rules

### Featured vs Latest

Keep these separate.

**Featured:** manually selected in `profile.config.yml`.  
**Latest:** automatically discovered from public repositories.

Typical latest filtering:

```text
public only
exclude forks when configured
exclude archived when configured
sort by recent push/update
cap number of displayed projects
```

Never replace featured repositories merely because a new repository was created.

### Update workflow

The updater should roughly do:

```text
checkout
  ↓
install from lockfile
  ↓
collect GitHub data
  ↓
normalize/cache
  ↓
generate assets
  ↓
generate README/data
  ↓
validate
  ↓
commit only if changed
```

Do not intentionally create recursive workflow loops.

---

## 10. Security Rules

- Never commit GitHub tokens/PATs.
- Prefer `GITHUB_TOKEN` in Actions.
- Use least-privilege workflow permissions.
- Never echo secrets.
- Escape generated HTML/text safely.
- Treat repository metadata as untrusted input.
- Avoid unsafe shell interpolation.
- Do not execute arbitrary downloaded repository content.
- Validate config and API responses.
- Use timeouts/retries/backoff.
- Keep generated data sanitized; no private data should be emitted accidentally.

---

## 11. Media Rules

User-supplied media must live under `assets/source/`.

Examples:

```text
assets/source/profile.png
assets/source/banner.png
assets/source/intro.gif
assets/source/intro.mp4
```

Never fabricate a personal portrait or personal video.

If media is missing:

```text
missing media
   ↓
designed generated fallback
```

Do not leave broken image references in the README.

Avoid committing huge raw media unnecessarily. Prefer optimized generated variants where appropriate.

---

## 12. 3D World Guidelines

The 3D companion is allowed to use real WebGL technology.

Preferred stack:

- React
- Vite
- Three.js
- React Three Fiber
- Drei where useful
- restrained postprocessing

Design goal:

```text
premium cyber-security research environment
NOT
cheap generic cyberpunk dashboard
```

Important scene concerns:

- realistic light/material balance
- depth
- scale
- shadow quality
- controlled emissive elements
- smooth camera choreography
- limited particle count
- mobile performance
- quality presets
- reduced-motion behavior

Do not make a beautiful desktop scene that becomes unusable on mobile.

---

## 13. Deployment Notes

Preferred deployment target for the 3D companion:

**GitHub Pages** using GitHub Actions.

Expected project-page URL shape for the profile repository:

```text
https://itssourov13.github.io/itssourov13/
```

Do not hard-code root-domain asset paths in the Vite app if the site is deployed under a repository subpath.

Use a single source of truth for the deployment base path.

If the user later moves the world to Vercel/Netlify/custom domain, update this section and the configuration rather than scattering URLs through the project.

---

## 14. Required Documentation

Keep these docs accurate:

```text
docs/ARCHITECTURE.md
docs/AUTOMATION.md
docs/MEDIA.md
docs/3D_WORLD.md
docs/CUSTOMIZATION.md
docs/TROUBLESHOOTING.md
docs/RESEARCH.md
```

Each should explain the real implementation, not an idealized future architecture.

---

## 15. Research Contract

A future agent must verify current GitHub/platform/library behavior instead of trusting stale snippets. Record important research findings and sources in `docs/RESEARCH.md`.

At minimum track:

- profile README support/limits
- SVG/media rendering behavior
- Actions schedule/token/permissions behavior
- REST/GraphQL data fields and limits
- Pages deployment/subpath behavior
- important 3D library/version decisions

## 16. Verification Checklist

Before an agent reports completion, update this table with real evidence:

| Check | Status | Evidence / command |
|---|---|---|
| Repository inspected | ◐ | Live README fetched; sandbox copy fully read. **User's working copy and git history not accessible** — a patch (not a commit) is provided. |
| Config schema validated | ✅ | `node scripts/src/index.ts validate-config` → OK |
| Dependencies installed from lockfile | ☐ | Forbidden by brief / unavailable. |
| Lint passes | ☐ | `eslint` not installed here. Run `npm run lint`. (Code avoids `eslint-disable` for unknown rules.) |
| Typecheck passes | ◐ | `tsc` 6.0.3: scripts + shared + world pure modules + tests **0 errors**. World TSX checked only against hand-written stubs of react/three/R3F/drei: only stub-artifact errors (implicit-any on JSX handlers, CSS import) — i.e. no cross-file mistakes, but **real library types unverified**. Run `npm run typecheck`. |
| Unit tests pass | ◐ | 96/96 with a ~60-line stand-in for vitest (`describe/it/expect` subset). Run `npm test`. |
| Generator runs / deterministic | ✅ | `generate`, `generate --fixture`; `check-generated` OK; determinism asserted in tests (README + all outputs byte-identical). |
| README generated | ◐ | Sandbox has no collected data → generated the no-data state only. **The patch deliberately excludes README.md, assets/generated/**, data/** — run `npm run generate` in your repo (it has real data).** Data-rich README exercised through fixtures/tests. |
| No broken local asset paths / secrets | ✅ | `check-links`, `check-secrets` OK (no-data state). |
| `git diff --check` | ✅ | clean in the sandbox repo. |
| Format check | ☐ | `prettier` not installed. Run `npm run format:check` / `npm run format` (code was hand-formatted, not prettier-run; expect diffs). |
| 3D production build passes | ☐ | Not run. |
| Pages workflow validated | ◐ | YAML parses; logic reviewed; never executed on GitHub. |
| Browser/WebGL/mobile/reduced-motion/keyboard runtime | ☐ | **Not run.** Nothing in `world/` has executed in a browser. |
| Visual inspection | ◐ | Fixture SVGs (cards with status dot/archived, pulse with momentum, terrain, constellation, language galaxy, intelligence, terminal, CTA) rendered in headless Chromium and viewed; one overlap fixed (pulse label). 3D scene and DOM overlay CSS never rendered. |

Never mark a runtime/browser check as passed unless it was actually performed.

---

## 17. Change Log

### Initial template

- Created the continuity contract for the profile engine project.
- Defined intended architecture and feature categories.
- Defined security, automation, media, 3D, and verification principles.

Future agents should append entries using this format:

```md
### YYYY-MM-DD — Phase X — Short title

**Changed**
- ...

**Verified**
- ...

**Not verified**
- ...

**Known limitations**
- ...

**Next**
- ...
```

---

### 2026-10-04 — Phase 1 — Full implementation (unbuilt)

**Changed**
- Added everything listed in §2 "What exists right now".
- Replaced §2 and §16 with real state.

**Verified**
- See §16 (config validation, generator runs, link/secret/sync checks, 45 tests under a stand-in runner, `tsc` on scripts, visual inspection of fixture renders).

**Not verified**
- `npm install`, lint, real vitest, Vite build, any browser/WebGL/mobile/reduced-motion run, GitHub workflows, live GitHub API calls, live account contents.
- Package version ranges in `package.json` (chosen without registry access).

**Known limitations**
- World TSX never compiled against real React/R3F/three types; expect small type or API fixes on first `npm run typecheck` / `npm run world:build` (e.g. drei prop names, `ElementRef` typing of `OrbitControls` ref).
- `check:generated` compares to committed files; run `npm run generate` after any generator change.
- Contribution calendar requires a token (GraphQL); local unauthenticated `collect` leaves it empty.
- Only 30 repos are enriched with languages/releases per run (`MAX_ENRICHED_REPOS`).
- README images are served from the repo via relative paths; checked structurally, not on github.com.

**Next (exact steps)**
1. `npm install`; commit `package-lock.json`.
2. `npm run lint && npm run typecheck && npm test` — fix whatever the real toolchain reports.
3. `GITHUB_TOKEN=<fine-grained read-only or classic, never committed> npm run update`; inspect `data/` and README; confirm featured names exist (`passhunter`, `cyberos`); decide on others.
4. `npm run generate:fixture && npm run world:dev` is NOT enough for the world (needs `data/generated-profile.json`): run `npm run generate` first, then `npm run world:dev`; test desktop, phone, Low quality, Reduce motion, and a browser with WebGL disabled.
5. `npm run build`; push; Settings → Pages → Source = GitHub Actions; run **Update profile** manually; confirm https://itssourov13.github.io/itssourov13/ loads.
6. Update docs/RESEARCH.md rows from Provisional to Verified; tick §16 honestly.
7. Optional: add `assets/source/profile.png` (see docs/MEDIA.md), review focus/bio text in `profile.config.yml`.

### 2026-10-06 — Upgrade pass (phases 1–14) — implemented, unbuilt

**Changed** (source only; see `git diff --stat` on the patch): new `shared/` (3 modules + tests); `scripts/src/data/{normalize,worldData}.ts`, `generators/{cards,panels}.ts`, `renderers/readme.ts`, `pipeline.ts` (+tests); `world/src/{data/parse.ts, effects/*, state/selection.ts, scene/* (split), ui/*, app/App.tsx, styles.css}`; `.github/workflows/{update-profile,deploy-world}.yml`, `dependabot.yml`; docs (all six + RESEARCH); `tsconfig.json`, `vitest.config.ts` (include `shared`).

**Verified**: see §16. Test count 45 → 96 (stand-in runner).

**Not verified**: everything needing npm/browsers: lint, real vitest, prettier, `vite build`, any runtime behaviour of the 3D world (frameloop demand/invalidate interplay, `regress`/DPR behaviour, PerformanceMonitor hysteresis feel, instanced lab/wall transforms, label legibility, touch), keyboard/screen-reader pass, GitHub workflows, Dependabot syntax.

**Known limitations / things most likely to need a fix on first real run**
- R3F/drei API assumptions listed in docs/RESEARCH.md (e.g. `useThree(s => s.performance.current)` re-render cadence; `OrbitControls regress`; `Html` with `distanceFactor`).
- Lab rack/screen/scan placement math (`ResearchLab.place`) is untested visually — verify racks face the core and the scan bar stays on the screen.
- Intelligence wall and lab are placed at z = −22 / +17; camera stops tuned by reasoning, not by eye.
- Stale-data notice uses `Date.now()` in the browser (README stays deterministic).
- No Prettier pass was run.

**Next (exact steps)**
1. In your repo: `git switch -c upgrade/world-v2`; `git apply --3way --check <patch>` then `git apply --3way <patch>` (patch is source-only).
2. `npm run generate` (regenerates README/cards/JSON from your real `data/*.json`), then `npm run format` (Prettier), `npm run lint`, `npm run typecheck`, `npm test`, `npm run check`, `npm run build`. Fix whatever the real toolchain reports (expect small API/type fixes in `world/src/scene/*`).
3. `npm run world:dev` and walk the checklist in docs/3D_WORLD.md: all 9 stops, select/open a project by mouse and by keyboard, Prev/Next, Escape, Low/Medium/High, Reduce motion, Pause ambient, WebGL disabled, a phone viewport (≤ 480 px) and tablet, delete `assets/source/profile.png` (portrait stop disappears), corrupt `generated-profile.json` (retry UI), refresh (preferences persist).
4. Watch `frameloop`: with Reduce motion on, confirm the scene still redraws on orbit, hover, stop change; if not, add the missing `invalidate` source in `Perf.tsx`.
5. Decide whether to feature `onyx` (it exists on GitHub) in `featured_repositories`.
6. Triage the 9 open Dependabot PRs after the new `dependabot.yml` lands (majors of the 3D stack are now ignored).
7. Update docs/RESEARCH.md rows to Verified and tick §16.

## 18. Next-Agent Handoff Format

At the end of each substantial task, replace/update the current-state fields at the top and append a change-log entry.

The handoff should answer:

1. What exists right now?
2. What changed in the latest phase?
3. What commands were actually run?
4. What passed?
5. What was not tested?
6. What remains?
7. What files are important?
8. What architectural decisions must not be accidentally reversed?
9. What exact next step should the next agent take?

A future agent should never have to infer the project's state from chat history alone.

---

## 19. Change log — README V3 (visual rebuild)

**What changed:** README redesigned as a story (hero + nav → intro → Focus terminal → Featured work cards + constellation → After hours cinematic frame → GitHub intelligence/terrain/pulse/galaxy → Recent work → Explore banner + connect → footer). `generators/panels.ts` was split into one file per visual; new `cinematic.ts` (original generated night-city frame + caption strip), `world.ts` (Explore banner + footer), shared `languageColor`/`rng`/`motion` helpers. Terrain/pulse trim leading empty history (`activeCalendar`, `activeMonthlyTotals`), terrain marks the peak day, momentum moved into the intelligence panel. New config: `cinematic.*`, `media.cinematic_image` (own photo replaces the illustration; placeholder no longer generated). `data/generated-profile.json` and the 3D world are untouched.

**Commands run:** a throwaway driver (outside the repo) ran the real generator to produce outputs; SVGs were rendered in headless Chromium and viewed. **Not run:** npm scripts, lint, typecheck, test suite, build (tests were edited/added but not executed).

**Next:** `npm run generate && npm run format && npm run lint && npm run typecheck && npm test && npm run check`; fix whatever the real toolchain reports; then drop a photo at `assets/source/cinematic.jpg` and set `cinematic.alt`.
