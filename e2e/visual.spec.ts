// e2e/visual.spec.ts — visual-regression net for the UI foundation hardening work
// (audit/07-ui-polish-findings.md). Screenshots the same representative page set the
// 2026-08-29 UI audit used — homepage, a dense table page (spares), a form/modal-heavy
// page (breakdowns), a dashboard-style page (maintenance) — in both light and dark
// theme, with every /api/** call mocked via the same discoverRoutes/mockApi helpers
// e2e/smoke.mjs uses (e2e/mockApi.mjs — split from the rest of smoke.mjs's shared
// route-discovery code in shared.mjs, since that file's use of `import.meta` isn't
// something @playwright/test's test-file transform can load), so this needs no
// backend or auth.
//
// Updating baselines: see the note at the top of playwright.config.ts — baselines
// must come from a CI (ubuntu-latest) run with --update-snapshots, not a local
// Windows/Mac run, or every comparison will spuriously fail on font/AA differences
// that have nothing to do with a real regression.
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './mockApi.mjs';

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/spares', name: 'spares' },
  { path: '/breakdowns', name: 'breakdowns' },
  { path: '/maintenance', name: 'maintenance' },
  // Added for the 2026-08-30 UI-consistency pass — permanent regression guards for
  // the dark-mode/icon-size fixes on Visualization and the Class-badge parity fix
  // on Employees (see e2e/auth-gate.spec.ts's header comment for the auth-model
  // context these two pages share with the rest of the app).
  { path: '/visualization', name: 'visualization' },
  { path: '/employees', name: 'employees' },
] as const;

async function preparePage(page: Page, theme: 'light' | 'dark') {
  // Skip the first-run preferences modal (same trick smoke.mjs uses) and force the
  // theme directly via localStorage — matches the key/values ThemeProvider itself
  // reads (design-system/tokens.tsx), so this is exercising the real persisted-theme
  // path, not a test-only shortcut.
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('oz_prefsSeen', '1');
      localStorage.setItem('myoffice_theme', t);
    } catch { /* ignore */ }
  }, theme);
  await page.route('**/api/**', mockApi);
}

for (const { path, name } of PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${name} — ${theme}`, async ({ page }) => {
      await preparePage(page, theme);
      await page.goto(path, { waitUntil: 'load' });
      // Let the pre-paint script/ThemeProvider settle and any entrance animation finish.
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: false });
    });
  }
}
