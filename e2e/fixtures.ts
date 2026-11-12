import { test as base, expect } from '@playwright/test';

/** Fails any test that logs a console error or warning, or throws. */
export const test = base.extend<{ consoleGuard: void; allowConsole: RegExp | null }>({
  /** A pattern for console lines a test expects (for example a deliberate 404). */
  allowConsole: [null, { option: true }],
  consoleGuard: [
    async ({ page, allowConsole }, use) => {
      const problems: string[] = [];
      page.on('console', (m) => {
        if ((m.type() === 'error' || m.type() === 'warning') && !(allowConsole && allowConsole.test(m.text()))) problems.push(`${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      await use();
      expect(problems, 'console should be clean').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
