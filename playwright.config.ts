// playwright.config.ts — config for the @playwright/test-based visual-regression
// suite (e2e/visual.spec.ts) ONLY. The behavioral smoke suite (e2e/smoke.mjs) is a
// separate, plain-`playwright`-library script with its own runner (`npm run
// test:smoke`) — testMatch below is scoped to *.spec.ts so this config never picks
// smoke.mjs up as a test file.
//
// Screenshot diffing is sensitive to OS/font rendering — a baseline generated on
// Windows will NOT match what Linux CI renders (different subpixel AA, font
// hinting). Playwright's default snapshot naming already accounts for this: it
// suffixes each snapshot file with the platform it was captured on (e.g.
// `-win32.png` vs `-linux.png`), so baselines from different platforms never
// collide or get compared against each other — but it also means a baseline must
// be generated ONCE on the same platform that will later compare against it.
// This repo's CI (.github/workflows/ci.yml) runs on ubuntu-latest, so the
// authoritative baseline has to come from a CI run with --update-snapshots
// committed back, not from a local Windows/Mac dev machine. See the "Updating
// baselines" note in e2e/visual.spec.ts.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // one Next.js dev/prod server, keep load light and deterministic
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // matches smoke.mjs's own one-retry policy for transient flakes
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      // A few px of anti-aliasing/font-hinting drift is expected even within one
      // platform; this is intentionally tight — it should catch a real visual
      // regression, not just be silenced into uselessness.
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: process.env.SMOKE_BASE || 'http://localhost:3000',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
