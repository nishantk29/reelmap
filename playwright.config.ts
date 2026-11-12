import { defineConfig } from '@playwright/test';

/**
 * Local runs build the app and start the Worker in Node (scripts/serve.mjs):
 * one server in preview mode and one in live mode against a mocked TMDB.
 * Set BASE_URL to run the same suite against a deployed site instead.
 */
const remote = process.env.BASE_URL;
const PREVIEW = 'http://localhost:8788';
const LIVE_MOCK = 'http://localhost:8789';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  testIgnore: remote ? /mocked-live\.spec\.ts/ : undefined,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  use: {
    baseURL: remote ?? PREVIEW,
    launchOptions: { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'off',
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: remote
    ? undefined
    : [
        { command: 'npm run -s build && PORT=8788 node scripts/serve.mjs', url: `${PREVIEW}/api/meta`, reuseExistingServer: false, timeout: 60_000 },
        { command: 'PORT=8789 MOCK_TMDB=1 node scripts/serve.mjs', url: `${LIVE_MOCK}/api/meta`, reuseExistingServer: false, timeout: 60_000 },
      ],
});
