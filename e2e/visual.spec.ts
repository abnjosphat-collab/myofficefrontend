// e2e/visual.spec.ts — visual-regression net for the shared UI. Screenshots a representative page set (the homepage, a
// dense table page (spares), a form-heavy page (breakdowns), a dashboard-style page (maintenance) and the employee
// register) signed in as a fixture admin, with every /api/** call answered by the same mockApi helper e2e/smoke.mjs
// uses, so it needs no backend and no real account. The default appearance is Sage light (Mono dark is a
// flag-gated trial), so each page has one baseline unless a test opts into a second look.
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

// Collapsed-rail regression net: /documents pins the desktop sidebar to its 68 px rail. Geometry is asserted
// (uniform rows, centred icons, hidden labels contributing nothing, no page overflow), so the original defect —
// labels wrapping into invisible columns and pushing rows to 58–184 px with ~5 px off-centre icons — fails here.
// The still is saved to the test output for human inspection; pixel comparison needs a baseline from the
// sanctioned workflow (ubuntu baselines, see above), so this test captures but does not compare.
test('sidebar-rail', async ({ page }, testInfo) => {
  await preparePage(page);
  await page.goto('/documents', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { name: /^Sign in/ })).toHaveCount(0);
  await page.waitForSelector('aside');
  // Let the collapse transition and any entrance animation finish.
  await page.waitForTimeout(1500);
  const rail = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    const rows = [...(aside?.querySelectorAll('nav a, nav button') ?? [])].map((el) => {
      const box = el.getBoundingClientRect();
      const icon = el.querySelector(':scope > span');
      const iconBox = icon?.getBoundingClientRect();
      const label = el.querySelector('span[aria-hidden="true"], strong[aria-hidden="true"]');
      const labelBox = label?.getBoundingClientRect();
      return {
        height: box.height,
        iconOffset: iconBox ? (iconBox.left + iconBox.width / 2) - (box.left + box.width / 2) : null,
        labelArea: labelBox ? labelBox.width * labelBox.height : null,
      };
    });
    return {
      width: aside?.getBoundingClientRect().width,
      rows,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(rail.width).toBe(68);
  expect(rail.overflow).toBe(0);
  expect(rail.rows.length).toBeGreaterThan(0);
  for (const row of rail.rows) {
    expect(row.height).toBe(40);
    expect(Math.abs(row.iconOffset ?? 99)).toBeLessThanOrEqual(1);
    expect(row.labelArea).toBe(0);
  }
  await page.screenshot({ path: testInfo.outputPath('sidebar-rail.png'), fullPage: false });
});
