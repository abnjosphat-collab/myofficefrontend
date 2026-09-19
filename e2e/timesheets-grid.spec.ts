// Timesheets grid — sticky layout and scroll behavior with mocked API data (UI01/UI10).
import { test, expect } from '@playwright/test';
import { mockTimesheetsApi } from './timesheetsMockApi.mjs';

async function prepareTimesheetsPage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oz_prefsSeen', '1');
      localStorage.setItem('myoffice_theme', 'dark');
    } catch { /* ignore */ }
  });
  await page.route('**/api/**', mockTimesheetsApi);
}

test.describe('Timesheets grid', () => {
  test.setTimeout(60_000);

  test('loads NEC roster without load-error banner', async ({ page }) => {
    await prepareTimesheetsPage(page);
    await page.goto('/timesheets', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'NEC' }).click();
    await expect(page.getByText('Alex Artisan')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('alert')).not.toBeVisible();
    await expect(page.getByText('Employee', { exact: true }).first()).toBeVisible();
  });

  test('sticky employee column stays visible after horizontal scroll', async ({ page }) => {
    await prepareTimesheetsPage(page);
    await page.goto('/timesheets', { waitUntil: 'load' });
    await expect(page.getByText('Alex Artisan')).toBeVisible({ timeout: 15_000 });

    const scroller = page.locator('[data-slot="table-container"]').first();
    await scroller.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.waitForTimeout(300);

    await expect(page.getByText('Alex Artisan')).toBeVisible();
    await expect(page.getByText('Employee', { exact: true }).first()).toBeVisible();
  });

  // Baseline screenshots: generate on CI (linux) with --update-snapshots after `npx playwright install`.
  test('grid table container is scrollable', async ({ page }) => {
    await prepareTimesheetsPage(page);
    await page.goto('/timesheets', { waitUntil: 'load' });
    await expect(page.getByText('Jordan Verylongsurname')).toBeVisible({ timeout: 15_000 });
    const scroller = page.locator('[data-slot="table-container"]').first();
    const metrics = await scroller.evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  });
});
