import { defineConfig } from '@playwright/test';

/** Generates README screenshots from preview mode into docs/screenshots. */
export default defineConfig({
  testDir: './e2e',
  testMatch: /screenshots\.shot\.ts/,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8796',
    launchOptions: { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] },
  },
  webServer: { command: 'npm run -s build && PORT=8796 node scripts/serve.mjs', url: 'http://localhost:8796/api/meta', timeout: 60_000 },
});
