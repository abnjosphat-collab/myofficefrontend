// e2e/visual.spec.ts — visual-regression net for the shared UI. Screenshots a representative page set (the homepage, a
// dense table page (spares), a form-heavy page (breakdowns), a dashboard-style page (maintenance) and the employee
// register) signed in as a fixture admin, with every /api/** call answered by the same mockApi helper e2e/smoke.mjs
// uses, so it needs no backend and no real account. The app has one appearance, so each page has one baseline.
//
// Signed in on purpose: without a session every page redirects to sign-in, and the first baselines (9 Oct 2026) were
// ten pictures of the sign-in card. Each test now fails if the page is the sign-in screen, so that cannot recur quietly.
//
// Updating baselines: run the "Visual baselines" workflow (.github/workflows/visual-baseline.yml). Baselines must come
// from ubuntu-latest, not a local Windows/Mac run, or every comparison fails on font and anti-aliasing differences
// that have nothing to do with a real regression.
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './mockApi.mjs';
import { signInFixture } from '../scripts/lib/fixtures.mjs';

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/spares', name: 'spares' },
  { path: '/breakdowns', name: 'breakdowns' },
  { path: '/maintenance', name: 'maintenance' },
  { path: '/employees', name: 'employees' },
] as const;

// One fixed moment for every screenshot: greetings ("Good morning"), "today", relative times and date headers would
// otherwise change the picture from one run to the next and fail the comparison for no visual reason.
const FIXED_NOW = new Date('2026-10-05T09:00:00Z');

async function preparePage(page: Page) {
  await page.clock.setFixedTime(FIXED_NOW);
  await signInFixture(page.context());
  // Skip the first-run preferences popup (same as smoke.mjs).
  await page.addInitScript(() => { try { localStorage.setItem('oz_prefsSeen', '1'); } catch { /* storage unavailable */ } });
  await page.route('**/api/**', mockApi);
}

for (const { path, name } of PAGES) {
  test(name, async ({ page }) => {
    await preparePage(page);
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: /^Sign in/ })).toHaveCount(0);
    await expect(page.getByRole('main')).toBeVisible();
    // Let data render and any entrance animation finish.
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
  });
}
