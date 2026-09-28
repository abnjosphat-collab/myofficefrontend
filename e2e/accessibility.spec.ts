import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { mockApi } from './mockApi.mjs';

const PAGES = ['/login', '/auth/set-password', '/tools'] as const;

async function preparePage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oz_prefsSeen', '1');
      localStorage.setItem('myoffice_theme', 'light');
      localStorage.setItem('myoffice_design', 'dallaglio');
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }
  });
  await page.route('**/api/**', mockApi);
}

for (const path of PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await preparePage(page);
    await page.goto(path, { waitUntil: 'load' });
    await page.waitForTimeout(1_500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      violation => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
