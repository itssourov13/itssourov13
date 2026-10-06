# Automation

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | PR, push to `main` | `npm ci` → lint → typecheck → tests → `npm run check` → world build. Read-only token. |
| `update-profile.yml` | schedule (01:23, 09:23, 17:23 UTC), manual | Collect GitHub data → regenerate → validate → commit **only if files changed** → deploy the world if so. |
| `deploy-world.yml` | push touching `world/**` or `data/generated-profile.json`, manual, called by update | Builds `world/` with `WORLD_BASE=/<repo>/` and deploys to GitHub Pages. |

## Behaviour worth knowing

- **Least privilege:** `contents: write` exists only on the update job; deploy has `pages: write` + `id-token: write`.
- **No loops:** commits pushed with `GITHUB_TOKEN` do not trigger workflows, so `update-profile` calls the deploy workflow explicitly (`workflow_call`).
- **Empty-diff avoidance:** `store.ts` leaves data files untouched when only `collectedAt` would change.
- **Failure handling:** a failed collection with existing data keeps last-known-good (`--allow-stale`, used by `npm run update`) and logs a warning. Corrupt stored data fails closed.
- **Contributions** need GraphQL, which requires the token. Without it the previous calendar is kept.
- **Schedules** can be delayed or skipped under load; GitHub may disable scheduled workflows in repositories with no recent activity — re-enable from the Actions tab.
- **Secrets:** only `GITHUB_TOKEN` is used. Nothing logs headers or tokens. `npm run check:secrets` scans generated output.

## One-time setup (manual)

1. Run `npm install` once locally and **commit `package-lock.json`** (CI uses `npm ci`, which requires it).
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Settings → Actions → General → Workflow permissions: allow workflows to run; the update job requests its own write scope.
4. Run **Update profile** manually once to collect real data.

## Deployment triggers (audited)

| Change | Triggers `deploy-world`? |
| --- | --- |
| `world/**`, `shared/**` (imported by the world), `package.json`, `package-lock.json`, `assets/source/**`, `data/generated-profile.json`, the workflow itself (push to `main`) | yes |
| README-only / `assets/generated/**` / docs / `scripts/**` / `profile.config.yml` | no |
| Scheduled update that changed `data/generated-profile.json` | yes — `update-profile` calls the deploy workflow (`world_changed` output) because `GITHUB_TOKEN` pushes do not trigger workflows |
| Scheduled update that changed only README/cards/other data files | no |

Permissions are unchanged: `contents: write` only on the update job; `pages: write` + `id-token: write` only on deploy. No workflow writes back to a branch that triggers itself (bot pushes use `GITHUB_TOKEN`).

**Dependabot:** minor/patch npm updates are grouped (except `three` / `@types/three`); semver-major updates of React, R3F, drei, Vite, Vitest, TypeScript and ESLint are ignored so they are deliberate upgrades; `three` receives patch updates only (0.x minors can break R3F/drei). Revisit when you choose to upgrade the stack.
