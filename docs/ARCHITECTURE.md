# Architecture

One repository, three layers, one source of truth (`profile.config.yml`).

```text
GitHub REST + GraphQL (itssourov13)
        │  scripts/src/api/*        timeouts, retries, strict response parsing
        ▼
data/github.snapshot.json · repositories.json · github.contributions.json   (cached, committed)
        │  scripts/src/pipeline.ts  pure + deterministic: config + data + media state → files
        ▼
README.md · assets/generated/*.svg · data/generated-profile.json
        │                                   │
        ▼                                   ▼
GitHub profile README              world/ (React + R3F) — reads only generated-profile.json
```

## Modules

| Path | Responsibility |
| --- | --- |
| `scripts/src/config/` | Hand-written validator for `profile.config.yml` (https-only URLs, safe relative paths, unknown keys rejected, username pinned to `itssourov13`). |
| `scripts/src/api/` | `http.ts` (timeout, retry/backoff, rate-limit errors, host allow-list), `parse.ts` (strict shape checks), `github.ts` (REST pagination, languages, releases, GraphQL calendar). |
| `scripts/src/data/` | `collect.ts` (live collection), `store.ts` (validated read/write; unchanged data is not rewritten), `normalize.ts` (selection rules, language/month/edge/stat derivations), `media.ts` (magic-byte/size/dimension checks), `worldData.ts` (JSON contract for the world). |
| `scripts/src/generators/` | SVG generators. Pure functions; fixed number formatting → byte-stable output. |
| `scripts/src/renderers/readme.ts` | README composition. All untrusted text goes through `escapeMd` / `escapeXml`; URLs through `safeUrl`. |
| `scripts/src/validation/checks.ts` | Local-link, secret-pattern and JSON checks. |
| `world/` | Vite + React + React Three Fiber app. `base.ts` is the single source of truth for the deploy base path. |

## Key decisions (do not reverse casually)

1. **Generation is a pure function of committed inputs.** `collect` is the only network step; `generate` and `check-generated` are offline and deterministic. No wall-clock values appear in outputs (the footer uses the snapshot's `collectedAt`).
2. **Featured ≠ Latest.** Featured comes only from `featured_repositories`; Latest is automatic (public, non-fork, non-archived, by push date, profile repo excluded).
3. **No fabricated data.** Missing data produces an explicit "unavailable" state, never placeholder numbers. Terminal panel is labelled illustrative and shows only configured focus areas.
4. **The browser never calls GitHub.** The world loads one static JSON file.
5. **README media is static** (SVG/PNG/GIF). Interactivity lives in `world/`.
6. **Dependency-light scripts**: only `yaml` at runtime; no image libraries (media is validated, not transcoded).

## Contract: `data/generated-profile.json`

`schemaVersion: 1`. Validated by `world/src/data/parse.ts` (rejects unknown versions and non-https URLs). Bump the version and both sides together when changing it.

## Shared model (`shared/`)

Pure logic used by **both** the README generator and the 3D world, so project intelligence is defined once:

- `activity.ts` — `classifyActivity(pushedAt, collectedAt)`: active ≤ 30 d · recent ≤ 90 d · quiet ≤ 365 d · dormant. Reference is the *collection time*, never the wall clock (deterministic).
- `graph.ts` — `buildRelationships`: link two projects only for a shared topic (preferred) or shared primary language.
- `momentum.ts` — last 30 days vs the previous 30 days of the real contribution calendar; `null` without ≥ 60 days of history.

`data/generated-profile.json` (still `schemaVersion: 1`, additive): projects gain `activity` and `archived`; top-level `scene` (ordered node names, ≤ 12), `edges` (`[a, b, kind, label]` into `scene`), `stats.momentum`. The world parser derives any missing field with the same shared functions, so older JSON keeps working.

## Project selection and sorting rules

1. **Featured** = `featured_repositories` order, exact names, manual and stable; unknown names are reported, never invented.
2. **Latest** = public, owned by `itssourov13`, de-duplicated (case-insensitive), minus the profile repository, minus forks / archived per `project_rules`, sorted by `pushedAt` descending then name, capped by `latest_limit`.
3. **Archived & excluded** = repositories hidden from Latest by those rules (archived, forks), minus the profile repo and minus anything featured. Shown collapsed in the README with the reason.
4. Missing optional API fields default to empty/absent (`description ''`, no language, no license); `pushedAt` falls back to the real `updated_at`. Malformed required fields reject the whole response (fail closed).
