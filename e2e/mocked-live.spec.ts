import { test, expect } from './fixtures';

// Live mode with the Worker talking to a mocked TMDB (see scripts/serve.mjs).
test.use({ baseURL: 'http://localhost:8789' });

test('live mode: no preview banner, search and title through the proxy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('preview-banner')).toHaveCount(0);
  const input = page.getByRole('combobox');
  await input.fill('glass');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('title-heading')).toHaveText('The Glass Orchard');
  await expect(page.getByTestId('services').locator('.service').first()).toBeVisible();
  const res = await page.request.get('/api/title/tv/900105');
  expect(res.headers()['cache-control']).toBe('public, max-age=43200');
});
