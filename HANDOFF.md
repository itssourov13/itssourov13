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

**Status:** Phase 1 complete (code, workflows, docs written) — **not yet installed, built, or run in a real toolchain or on GitHub.**
**Date of this state:** 2026-10-04

### What exists right now

- `profile.config.yml` — validated source of truth (username pinned to `itssourov13`).
- `scripts/src/` — config validator, GitHub API client (timeouts/retries/strict parsing), collection, normalization, deterministic SVG generators (hero light/dark, project cards, isometric contribution terrain, constellation, language galaxy, activity pulse, intelligence panel, terminal, CTA), README renderer, media inspection, validation checks, CLI (`collect | generate | update | validate-config | check-generated | check-links | check-secrets`).
- `world/` — Vite + React 19 + R3F app (data core, project nodes, language ring, instanced contribution terrain, timeline pillars, optional portrait frame, particles, camera tour, quality presets, reduced motion, no-WebGL/context-lost fallback, DOM overlay with all content as real links/text).
- `.github/workflows/` — `ci.yml`, `update-profile.yml`, `deploy-world.yml`, `dependabot.yml`.
- `docs/` — ARCHITECTURE, AUTOMATION, MEDIA, 3D_WORLD, CUSTOMIZATION, TROUBLESHOOTING, RESEARCH.
- `README.md`, `assets/generated/*`, `data/generated-profile.json` — generated in the **"no collected data yet"** state: hero, focus, featured cards (name + link only, "details appear after next update"), world CTA. **No GitHub-derived numbers are present because none have been collected.** `data/github.*.json` and `data/repositories.json` do not exist until the first `collect`.

### Environment limits of the session that produced this
Sandbox network was disabled (GitHub API and npm registry returned 403), so: no `npm install`, no lockfile, no live API call, no real `vitest`/`eslint`/`vite` run. The user said they would install/build in their own terminal.

### Decisions made
- npm (not pnpm), single `package.json` at root (world is not a separate package). **`package-lock.json` is missing and must be generated and committed** (`npm ci` in CI requires it).
- Featured seeds: `passhunter`, `cyberos` (from verified seed list). `onyx` (mentioned in master prompt example) is unconfirmed, so not featured. Others (`blog`, `study-planner-apk`, `personal-website-demo`) are discoverable via Latest, not featured — user can add.
- Focus areas, headline and bio in `profile.config.yml` are **seed text derived from the master prompt example**; the user should review them.
- Hand-written config validator (no zod) to keep dependencies minimal. Only runtime script dependency: `yaml`.
- No image-processing dependency: media is validated, not transcoded (see docs/MEDIA.md). No contribution-snake (needs third-party action); optional GIF slot instead.
- No postprocessing in the world (kept lean). No research-archive room (no research data source).
- Deploy is triggered explicitly from the update workflow via `workflow_call` because `GITHUB_TOKEN` pushes do not trigger workflows.

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
| Repository inspected | ✅ | Greenfield: only the two uploaded markdown files existed (`ls`, `find`). |
| Config schema validated | ✅ | `node scripts/src/index.ts validate-config` → OK (run via Node 22 type stripping; `yaml` 2.8.3 borrowed from a global package). |
| Dependencies installed from lockfile | ☐ | Not done — no network, no lockfile. |
| Lint passes | ☐ | `eslint` never run. |
| Typecheck passes | ◐ | Global `tsc` 6.0.3 on `scripts/**` (incl. tests, via a vitest type shim) and `world/src/data/parse.ts`, `world/base.ts`: **0 errors**. Full `npm run typecheck` (incl. React/R3F/three types) **not run**; the world TSX was only syntax-checked (no TS1xxx errors; other errors were missing-module noise). |
| Unit tests pass | ◐ | 45/45 pass, but executed with a **~60-line stand-in for vitest**, not real vitest. Re-run `npm test`. |
| Generator runs | ✅ | `node scripts/src/index.ts generate` (no data) and `generate --fixture` (synthetic data). |
| README generated | ✅ | No-data state only. Data-rich README only exercised with fixtures in tests / `.preview/` (deleted). |
| Generated assets exist | ✅ | `assets/generated/{hero-dark,hero-light,terminal,enter-world}.svg`, `cards/{passhunter,cyberos}.svg` |
| No broken local asset paths | ✅ | `check-links` → OK |
| No secrets emitted | ✅ | `check-secrets` → OK |
| Git diff clean check | ☐ | Not a git repo in the sandbox; run `git diff --check`. |
| 3D production build passes | ☐ | Not run. |
| Pages workflow validated | ◐ | All four YAML files parse. Never executed on GitHub. Action versions cross-checked with GitHub Pages docs (docs/RESEARCH.md). |
| Browser/WebGL runtime tested | ☐ | Not run. (Chromium exists in the sandbox at `/opt/pw-browsers`, used only to screenshot SVGs.) |
| Mobile behavior tested | ☐ | Not run. CSS has a ≤720px layout; untested. |
| Reduced motion tested | ☐ | Not run. |
| Final README inspected | ◐ | No-data README read in full. Fixture SVGs (hero, terrain, constellation, language galaxy, pulse, intelligence, cards, terminal, CTA) were rendered with headless Chromium and viewed; fixed: terrain depth, constellation bounds, card text overflow. Not viewed: hero-light, and any rendering on github.com itself. |

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
