// e2e/review-flag.spec.ts — proof that the persistent duplicate-verification
// flag (owner decision Q1) surfaces in the real overtime UI: the Needs review
// tile counts flagged records, flagged rows carry a danger badge, the detail
// dialog shows the red warning with a pair-selection action, and the
// review-only filter narrows the list. API is mocked with a fixed flagged
// pair, so this needs no backend and no real account. Screenshots are
// captured for human inspection only (no baseline compare).
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './mockApi.mjs';
import { signInFixture } from '../scripts/lib/fixtures.mjs';

const FLAG = 'Possible duplicate - verification required';
const PAIR = [
  {
    id: 9001, employee_name: 'Review Ana', employee_id: 'C9001',
    position: 'Fitter', overtime_type: 'regular', date: '2026-11-09',
    start_time: '17:00', end_time: '19:00', hours: 2,
    reason: 'Winder checks', status: 'pending',
    notes: `${FLAG} [pair: T1 / T2]`,
    contact_number: '+263770000001', department: 'Engineering',
    cost_centre: 'Engineering',
  },
  {
    id: 9002, employee_name: 'Review Ana', employee_id: 'C9001',
    position: 'Fitter', overtime_type: 'regular', date: '2026-11-09',
    start_time: null, end_time: null, hours: 2,
    reason: 'Winder checks', status: 'pending',
    notes: `${FLAG} [pair: T2 / T1]`,
    contact_number: '+263770000001', department: 'Engineering',
    cost_centre: 'Engineering',
  },
  {
    id: 9003, employee_name: 'Calm Bo', employee_id: 'C9002',
    position: 'Electrician', overtime_type: 'weekend', date: '2026-11-08',
    start_time: '08:00', end_time: '12:00', hours: 4,
    reason: 'Lights', status: 'approved', notes: null,
    contact_number: '+263770000002', department: 'Engineering',
    cost_centre: 'Engineering',
  },
];

async function preparePage(page: Page) {
  await signInFixture(page.context());
  await page.addInitScript(() => {
    try { localStorage.setItem('oz_prefsSeen', '1'); } catch { /* noop */ }
  });
  await page.route('**/api/**', mockApi);
  await page.route('**/api/overtime', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PAIR),
    }),
  );
}

test('duplicate-verification flag is visible and filters the list', async ({ page }, testInfo) => {
  await preparePage(page);
  await page.goto('/overtime', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { name: /^Sign in/ })).toHaveCount(0);
  await expect(page.getByRole('main')).toBeVisible();

  const tile = page.getByRole('button', { name: /Needs review/ });
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute('aria-pressed', 'false');

  // Row badges on both flagged records (StatusBadge, not buttons).
  await expect(page.getByText('Needs review', { exact: true })).toHaveCount(3);

  // Review-only filter narrows the list to the flagged pair.
  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Calm Bo')).toHaveCount(0);
  await expect(page.getByText('Review Ana').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('review-only.png') });
  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Calm Bo')).toBeVisible();

  // Detail dialog shows the red warning distinct from the approval status.
  await page.getByText('Review Ana').first().click();
  await expect(
    page.getByText('Possible duplicate — verification required'),
  ).toBeVisible();
  await expect(page.getByText(/separate from the approval status/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('review-banner.png') });

  // Pair selection closes the dialog and selects both records.
  await page.getByRole('button', { name: 'Select possible pair' }).click();
  await expect(
    page.getByText('Possible duplicate — verification required'),
  ).toHaveCount(0);
});
