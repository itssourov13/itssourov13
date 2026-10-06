# Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `npm ci` fails: no lockfile | Run `npm install` once and commit `package-lock.json`. |
| `check:generated` fails in CI | Generated files are stale. Run `npm run generate`, commit. If only `data/` differs, run `npm run update` locally with a token. |
| README shows no terrain / stats | No contribution data: collection needs `GITHUB_TOKEN` (GraphQL). The scheduled workflow provides it. Locally: `GITHUB_TOKEN=… npm run collect`. |
| Featured card says "details appear after next update" | Data not collected yet, or the name is not a public repo of `itssourov13` (see the warning in the log). |
| Images missing in README preview | Relative paths render on github.com, not in every editor preview. `npm run check:links` verifies the files exist. |
| World shows blank page on Pages | Pages source must be "GitHub Actions"; check `WORLD_BASE` matches the repo name; open the browser console. |
| World shows "Data unavailable" | `data/generated-profile.json` was not deployed. Run `npm run generate`, rebuild. |
| `Rate limit` error | Unauthenticated calls are limited to 60/hour. Use a token (Actions provides one). |
| Scheduled run did not happen | GitHub can delay/skip schedules, or disable them after inactivity; run it manually. |
| Slow / hot on phone | Set quality to Low in the Display panel. |

| World is blank for a moment | Expected: a skeleton, then “Preparing 3D scene…”. If it persists, check the console for a failed `data/generated-profile.json` request (wrong `WORLD_BASE`). |
| “The 3D scene could not start” | A render error was caught by the scene boundary; the text summary still works. Open the console for the error. |
| Quality keeps dropping | By design the controller steps down after sustained slow frames and never oscillates; choose a fixed level in Display to override. |
| A stop (e.g. Lab, Intelligence) is missing | Stops only appear when their zone has content (focus items, language/contribution data, portrait, links). |
| Settings do not persist | `localStorage` may be blocked (private mode); the app works, preferences just reset. |
