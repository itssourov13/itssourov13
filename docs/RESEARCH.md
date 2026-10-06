# Research log

Status legend: **Verified** (checked against a live source in this session) · **Provisional** (from prior knowledge or design assumption — re-verify before relying on it).

| Topic | Finding | Status |
| --- | --- | --- |
| Pages workflow actions | GitHub docs (custom workflows for Pages) currently show `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`, `actions/checkout@v5`. Used as-is. Pin to commit SHAs if stricter supply-chain policy is wanted. | Verified (docs.github.com, 2026-10-04) |
| `actions/setup-node@v4` | Used from prior knowledge. | Provisional |
| npm package versions | `react ^19`, `@react-three/fiber ^9`, `@react-three/drei ^10`, `vite ^6`, `vitest ^3`, `three >=0.170 <1`. Chosen without registry access (sandbox network disabled). R3F v9 targets React 19. Run `npm install` and confirm no peer warnings; update ranges. | Provisional |
| README rendering | Images referenced from README render as `<img>`; SVGs cannot run scripts or load external resources, so panels are self-contained with system font stacks. `<picture>` + `prefers-color-scheme` supported for hero light/dark. | Provisional |
| `GITHUB_TOKEN` pushes | Events created by `GITHUB_TOKEN` do not trigger new workflow runs; hence explicit `workflow_call` deploy. | Provisional |
| Scheduled workflows | May be delayed; can be auto-disabled in inactive repos. | Provisional |
| GraphQL contributions | `user.contributionsCollection.contributionCalendar` requires authentication; default range is the last year. | Provisional |
| REST | `/users/{u}/repos` returns public repos, 100/page; `/repos/{o}/{r}/languages`; `/releases/latest` (404 when none). | Provisional |
| Live account | `https://github.com/itssourov13` could not be fetched here (bash network disabled); seed repos come from HANDOFF.md only. `onyx` (mentioned in the master prompt example) is unconfirmed and not featured. | Not verified |

**Action for the next agent with network access:** fetch the live profile and API, confirm repo names, run `npm install`, and move rows to Verified.

## Additions (upgrade pass)

| Topic | Finding | Status |
| --- | --- | --- |
| Live profile | `https://github.com/itssourov13/itssourov13` loaded on 2026-10-06: 22 public repositories listed by the generated README, `onyx` exists, data stamp 2026-10-05, 2 commits, 9 open pull requests (likely Dependabot). Repository contents beyond the README were not inspected. | Verified (web fetch) |
| R3F / drei APIs relied on | `Canvas` props `frameloop`, `performance`, `dpr`, `shadows`; store `setDpr`, `invalidate`, `performance.current/regress`; drei `OrbitControls regress`, `PerformanceMonitor onDecline`, `Line`, `Html`, `useTexture`. Used from prior knowledge of R3F 9 / drei 10; **typechecked only against local stubs**. Re-verify on the first real `npm run typecheck` / `world:build`. | Provisional |
| Dependabot | `groups`, `exclude-patterns`, `ignore.update-types` syntax used from prior knowledge. | Provisional |
