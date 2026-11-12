import { test } from '@playwright/test';

const sizes = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;
const themes = ['light', 'dark'] as const;

for (const size of sizes) {
  for (const theme of themes) {
    test(`${size.name} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: theme, deviceScaleFactor: size.name === 'phone' ? 2 : 1 });
      const page = await ctx.newPage();
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('reelmap:v1:services', '[8]'));
      await page.reload();
      await page.getByTestId('featured-grid').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `docs/screenshots/home-${size.name}-${theme}.png` });

      await page.goto('/title/movie/900110?in=GB');
      await page.getByTestId('services').locator('.service').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `docs/screenshots/title-${size.name}-${theme}.png` });

      await page.getByTestId('watch-primary').click();
      await page.getByTestId('watch-sheet').waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `docs/screenshots/watch-${size.name}-${theme}.png` });
      await ctx.close();
    });
  }
}
