import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// A deployed site without a TMDB token also runs in preview mode: set PREVIEW=1 with BASE_URL.
const preview = !process.env.BASE_URL || process.env.PREVIEW === '1';

const offerTypes = (page: Page) =>
  page.locator('.offer').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-offer') ?? ''))].sort());

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('home shows the preview banner, samples and attribution', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where is it streaming?');
  if (preview) {
    await expect(page.getByTestId('preview-banner')).toContainText("Live data isn't connected yet. You're looking at sample titles.");
    await expect(page.getByTestId('featured-grid').locator('li')).toHaveCount(8);
  }
  await expect(page.locator('footer')).toContainText('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  await expect(page.locator('footer a[href="https://www.themoviedb.org"] img')).toBeVisible();
  await expect(page.locator('footer a[href="https://www.justwatch.com"]')).toBeVisible();
});

test('search with keyboard: slash, arrows, escape, enter', async ({ page }) => {
  test.skip(!preview, 'uses sample titles');
  await page.goto('/');
  await page.getByRole('heading', { level: 1 }).click();
  await page.keyboard.press('/');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.pressSequentially('the');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(3);
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(options.first()).toContainText('The Last Projectionist');

  await page.keyboard.press('ArrowDown');
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveAttribute('aria-activedescendant', (await options.nth(1).getAttribute('id')) ?? '');

  await page.keyboard.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/title\/movie\/900101$/);
  await expect(page.getByTestId('title-heading')).toHaveText('The Lantern Keepers');

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where is it streaming?');
  await expect(page.getByTestId('recent-grid')).toContainText('The Lantern Keepers');
});

test('search empty state, people dropped, results page', async ({ page }) => {
  test.skip(!preview, 'uses sample titles');
  await page.goto('/');
  const input = page.getByRole('combobox');
  await input.fill('zzqx');
  await expect(page.locator('.results-status')).toContainText('Nothing matches "zzqx"');
  await input.fill('Marguerite');
  await expect(page.locator('.results-status')).toContainText('Nothing matches');
  await input.fill('hymn');
  await expect(page.getByRole('option')).toHaveCount(1);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=hymn/);
  await expect(page.getByTestId('results-grid')).toContainText('Saltwater Hymn');
});

test.describe('title page', () => {
  test.skip(!preview, 'uses sample titles');

  test('groups availability by service, sorted by country count', async ({ page }) => {
    await page.goto('/title/movie/900110');
    await expect(page.getByTestId('title-heading')).toHaveText('The Last Projectionist');
    await expect(page.locator('.title-meta')).toHaveText('Movie · 2025 · 1 h 52 min');
    const cards = page.getByTestId('services').locator('.service');
    await expect(cards.first()).toBeVisible();
    const nums = (await cards.locator('.svc-count').allTextContents()).map((c) => parseInt(c, 10));
    expect(nums.length).toBeGreaterThan(4);
    expect([...nums].sort((a, b) => b - a)).toEqual(nums);
    expect(await offerTypes(page)).toEqual(['ads', 'buy', 'free', 'rent', 'stream']);
    await expect(page.locator('.jw a[href="https://www.justwatch.com"]').first()).toBeVisible();
    await expect(page.getByTestId('region-panel').getByRole('link', { name: /More options/ })).toHaveAttribute('href', /themoviedb\.org\/movie\/900110\/watch/);
  });

  test('type filters are multi-select chips with counts', async ({ page }) => {
    await page.goto('/title/movie/900110');
    const stream = page.getByRole('button', { name: /^Stream \d+$/ });
    const rent = page.getByRole('button', { name: /^Rent \d+$/ });
    await expect(stream).toHaveAttribute('aria-pressed', 'false');
    await stream.click();
    await expect(stream).toHaveAttribute('aria-pressed', 'true');
    expect(await offerTypes(page)).toEqual(['stream']);
    await rent.click();
    await expect(rent).toHaveAttribute('aria-pressed', 'true');
    expect(await offerTypes(page)).toEqual(['rent', 'stream']);
    await stream.click();
    await rent.click();
    expect(await offerTypes(page)).toEqual(['ads', 'buy', 'free', 'rent', 'stream']);
  });

  test('My services persist, sort first and filter', async ({ page }) => {
    await page.goto('/title/movie/900110');
    await page.getByTestId('open-services').click();
    const sheet = page.getByTestId('services-sheet');
    await expect(sheet).toBeVisible();
    await sheet.getByTestId('services-search').fill('disney');
    await sheet.getByLabel('Disney Plus').check();
    await expect(sheet.getByRole('status')).toHaveText('1 selected');
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet).toBeHidden();

    const first = page.getByTestId('services').locator('.service').first();
    await expect(first.locator('.svc-name')).toContainText('Disney Plus');
    await expect(first.locator('.mine-tag')).toHaveText('Yours');

    await page.reload();
    await expect(page.getByTestId('services').locator('.service').first().locator('.svc-name')).toContainText('Disney Plus');
    await page.getByTestId('only-mine').click();
    await expect(page.getByTestId('only-mine')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('services').locator('.service')).toHaveCount(1);
    await page.reload();
    await expect(page.getByTestId('only-mine')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('services').locator('.service')).toHaveCount(1);
  });

  test('country search filters chips and opens the region view', async ({ page }) => {
    await page.goto('/title/movie/900110');
    await page.getByTestId('country-filter').fill('germ');
    await expect(page.getByTestId('summary')).toContainText('in 1 country');
    expect(new Set(await page.locator('.cc-code').allTextContents())).toEqual(new Set(['DE']));
    await page.getByTestId('country-jump').click();
    await expect(page.getByTestId('region-select')).toHaveValue('DE');
    await expect(page).toHaveURL(/[?&]in=DE/);
    await expect(page.getByTestId('region-panel')).toContainText('Netflix');

    await page.getByTestId('country-filter').fill('atlantis');
    await expect(page.locator('.country-hint')).toContainText('No country matching "atlantis"');
    await expect(page.locator('.empty-card')).toContainText('No services match these filters.');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByTestId('services').locator('.service').first()).toBeVisible();

    await page.getByTestId('region-select').selectOption('JP');
    await expect(page).toHaveURL(/[?&]in=JP/);
    await page.reload();
    await expect(page.getByTestId('region-select')).toHaveValue('JP');
  });

  test('Watch it: ExpressVPN by default, CLI copy, shortcut link, reopen step', async ({ page }) => {
    await page.goto('/title/movie/900110?in=US');
    await page.getByTestId('watch-primary').click();
    const sheet = page.getByTestId('watch-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Watch on Netflix');
    await expect(sheet.getByTestId('watch-vpn')).toHaveValue('expressvpn');
    await expect(sheet.getByTestId('watch-country')).toHaveValue('US');
    await expect(sheet.getByTestId('cli-command')).toContainText('expressvpnctl get regions');

    await sheet.getByTestId('copy-cli').click();
    await expect(sheet.getByText('Copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('expressvpnctl connect');

    const target = 'https://www.netflix.com/search?q=The%20Last%20Projectionist';
    await expect(sheet.getByTestId('run-shortcut')).toHaveAttribute(
      'href',
      'shortcuts://run-shortcut?name=Reelmap%20Watch&input=text&text=' + encodeURIComponent(`US|${target}`),
    );
    await expect(sheet.getByTestId('shortcut-input')).toHaveText(`US|${target}`);
    await expect(sheet.getByTestId('manual-steps')).toContainText('Fully close and reopen the streaming app so it re-detects your region.');
    await expect(sheet.getByTestId('open-service')).toHaveAttribute('href', target);
    await expect(sheet.getByTestId('more-options')).toHaveAttribute('href', /locale=US/);
    await sheet.locator('summary', { hasText: 'Set up the shortcut once' }).click();
    await expect(sheet.locator('.recipe').first()).toContainText('Reelmap Watch');

    await sheet.getByTestId('watch-country').selectOption('DE');
    await expect(sheet.getByTestId('shortcut-input')).toContainText('DE|');
    await sheet.getByTestId('watch-vpn').selectOption('mullvad');
    await expect(sheet.getByTestId('cli-command')).toHaveText('mullvad relay set location de\nmullvad connect');
    await sheet.getByTestId('watch-vpn').selectOption('surfshark');
    await expect(sheet.getByTestId('cli-none')).toBeVisible();
    await expect(sheet.getByTestId('manual-steps')).toContainText('Fully close and reopen');

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await page.getByTestId('open-settings').click();
    await expect(page.getByTestId('settings-sheet').getByLabel(/Surfshark/)).toBeChecked();
  });

  test('unknown title shows a clear message', async ({ page }) => {
    await page.goto('/title/movie/123');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We could not find this title');
  });
});

test('theme toggle switches and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.locator('#theme-toggle');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 19, 16)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
});

test.describe('not found', () => {
  // Chrome logs the document's own 404 status; that line is expected here only.
  test.use({ allowConsole: /status of 404/ });
  test('unknown path renders the not found page with 404', async ({ page }) => {
  const res = await page.goto('/nowhere');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page is not on the programme');
  });
});

test('security headers and input validation', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect((await request.get('/api/title/movie/abc')).status()).toBe(400);
});
