# Customization

Edit `profile.config.yml`, then `npm run generate` (and commit). `npm run validate:config` explains any mistake.

- **Identity/bio/socials:** `profile`, `socials` (https only; an empty string hides a manual entry, while synced providers are overridden after the first successful live sync).
- **Social links sync automatically:** `linkedin`, `x` (GitHub's `twitter` is mapped to it), `facebook` and `instagram` are read from your GitHub profile (Settings → Public profile → Social accounts) by every `update` run. After a successful sync the live profile wins: changed URLs replace the old ones and an account you remove on GitHub disappears from the README and the 3D world. The values in `socials` only apply until the first successful sync, or if GitHub has never been reachable. `github`, `blog`, `portfolio` and `profile.website` are never overwritten. Other providers (Mastodon, YouTube, …) are ignored. To change a synced link, change it on GitHub, not in this file.
- **Featured work:** `featured_repositories` (exact repo names, order preserved). Unknown names are skipped with a warning — never invented. Add `onyx` etc. only once it exists on GitHub.
- **Latest list:** `project_rules` (limit, forks, archived). The profile repository is always excluded from Latest.
- **Sections:** `content.show_*` flags.
- **World:** `world.url` (README button target), `world.quality`, `world.reduced_motion_default`.
- **Colors/typography:** `scripts/src/generators/svg.ts` (`DARK`, `LIGHT`, font stacks). Keep the amber/graphite palette restrained; tests expect deterministic output.
- **Different account:** deliberately blocked by `CANONICAL_USERNAME` in `scripts/src/constants.ts` and the `config` test. Change it, `profile.config.yml`, `world/base.ts` and `HANDOFF.md` together.
- **Custom domain / Vercel:** set `WORLD_BASE=/` in the build and update `world.url`.

## Display preferences (visitors)

Visitors can set Quality (Auto/Low/Medium/High), Reduce motion and Pause ambient motion; choices persist in `localStorage` (`itssourov13-world:prefs:v1`). Site defaults come from `world.quality` and `world.reduced_motion_default`; a visitor's explicit choice overrides them, and the OS reduced-motion setting is respected when the visitor has made no choice.

## Project showcase

Status labels and “Archived & excluded” are derived from real data (thresholds in `shared/activity.ts`). There are no hand-written categories: use GitHub **topics** on your repositories — the cards, the Recent work table and the constellation links all use them.

## README V3 sections

`content.show_*` flags control the intelligence panel, terrain, pulse, language galaxy and constellation; `cinematic.*` controls the "After hours" frame (see docs/MEDIA.md); `world.enabled` controls the Explore banner. Terrain and pulse start at your first real contribution, so a young account never renders as a long empty runway.
