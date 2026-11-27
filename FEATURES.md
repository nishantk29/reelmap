# Reelmap: feature map

Read this before a change, then open only the files listed for the feature.

## Test commands

| Command | What it runs | When |
|---|---|---|
| `npm run test:quick` | typecheck + `scripts/lint.mjs` + Vitest unit and Worker tests (a few seconds) | every change |
| `npm run check` | `scripts/guard.mjs`: repeat-mistake checks (names, paths, secrets, theme switch, root scripts) | every change |
| `npm run test:e2e` | Playwright at 390 and 1280 px against local preview and mocked-live servers | UI changes |
| `npm run fuzz` | the Vitest suites three times in random order (seeded) | releases (CI on `v*` tags) |

## Features → files

| Feature (user's view) | Files | Tests |
|---|---|---|
| Routes: home, search, title, about, not found | `src/client/router.ts`, `src/client/views/*.ts`, `src/client/main.ts` | `e2e/app.spec.ts` |
| Instant search with keyboard support | `src/client/search.ts`, `src/client/api.ts` | `e2e/app.spec.ts` |
| Availability by service and country, filters | `src/shared/availability.ts`, `src/client/views/title.ts`, `src/client/countries.ts` | `availability.test.ts` |
| My services | `src/client/services-sheet.ts`, `src/client/store.ts` | `e2e/app.spec.ts` |
| My VPN and "Watch it" steps | `src/client/settings-sheet.ts`, `src/client/watch-sheet.ts`, `src/shared/watch.ts` | `watch.test.ts` |
| Masthead pill, tooltips, sheets | `src/client/pill.ts`, `src/client/tooltip.ts`, `src/client/sheet.ts`, `src/shared/geometry.ts` | `chrome.test.ts` |
| Theme: follows the system setting only | `src/client/theme-init.ts`, `src/client/styles.css` | `e2e/app.spec.ts` |
| Preview mode (no TMDB token) | `src/client/preview.ts`, `src/fixtures/index.ts`, `src/client/poster.ts` | `worker.test.ts`, `e2e/app.spec.ts` |
| API proxy `/api/meta`, `/api/search`, `/api/regions`, `/api/providers`, titles | `src/worker/api.ts`, `src/worker/app.ts`, `src/shared/validate.ts`, `src/shared/normalize.ts` | `worker.test.ts`, `validate.test.ts`, `normalize.test.ts` |
| Security headers, caching | `src/worker/headers.ts`, `src/worker/app.ts` | `worker.test.ts` |
| Build and deploy layouts | `scripts/build.mjs`, `scripts/build-embedded.mjs`, `src/worker/embedded.ts`, `wrangler.toml` | `worker.test.ts` |
