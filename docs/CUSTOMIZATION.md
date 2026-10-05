# Customization

Edit `profile.config.yml`, then `npm run generate` (and commit). `npm run validate:config` explains any mistake.

- **Identity/bio/socials:** `profile`, `socials` (https only; empty string hides an entry).
- **Featured work:** `featured_repositories` (exact repo names, order preserved). Unknown names are skipped with a warning — never invented. Add `onyx` etc. only once it exists on GitHub.
- **Latest list:** `project_rules` (limit, forks, archived). The profile repository is always excluded from Latest.
- **Sections:** `content.show_*` flags.
- **World:** `world.url` (README button target), `world.quality`, `world.reduced_motion_default`.
- **Colors/typography:** `scripts/src/generators/svg.ts` (`DARK`, `LIGHT`, font stacks). Keep the amber/graphite palette restrained; tests expect deterministic output.
- **Different account:** deliberately blocked by `CANONICAL_USERNAME` in `scripts/src/constants.ts` and the `config` test. Change it, `profile.config.yml`, `world/base.ts` and `HANDOFF.md` together.
- **Custom domain / Vercel:** set `WORLD_BASE=/` in the build and update `world.url`.
