// Fictional employee fixtures; every API request is intercepted. No live submissions.
import { test, expect } from '@playwright/test';
import { makeHandler, signInFixture } from '../scripts/lib/fixtures.mjs';
import overtime from '../scripts/route-specs/overtime.mjs';

for (const width of [1440, 390]) {
  test(`bulk overtime completes names with Tab and preserves an unconfirmed save at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await signInFixture(page.context());
    const calls: { method: string; pathname: string }[] = [];
    await page.route('**/api/**', makeHandler(overtime.data, calls));
    const posted: { employee_id: string; position: string; contact_number: string }[] = [];
    await page.route('**/api/overtime', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON();
      posted.push(body);
      if (body.employee_id === 'C6') return route.abort('failed');
      return route.fulfill({ json: { id: 5000, ...body, status: 'pending' } });
    });
    await page.goto('/overtime');
    await page.getByRole('button', { name: 'Overtime for several people' }).click();
    const dialog = page.getByRole('dialog', { name: 'Overtime for several people' });
    const input = dialog.getByRole('combobox', { name: 'Employees' });
    await input.fill('Eve');
    await expect(page.locator('[data-name-completion]')).toContainText('Epsilon');
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('checkbox', { name: /Eve Epsilon/ })).toBeChecked();
    await expect(input).toBeFocused();
    await input.fill('Fay');
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('checkbox', { name: /Fay Zeta/ })).toBeChecked();
    await expect(input).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(input).not.toBeFocused();
    expect(posted).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Submit 2 requests' }).click();
    await expect(dialog.getByText(/1 submitted, 1 not confirmed/)).toBeVisible();
    await expect(dialog.getByText(/Check the refreshed overtime list before retrying/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Submit 1 request' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Remove Eve Epsilon/ })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /Remove Fay Zeta/ })).toBeVisible();
    expect(posted.map(p => p.employee_id)).toEqual(['C5', 'C6']);
    expect(posted[0].position).toBeTruthy();
    expect(posted[0].contact_number).toBeTruthy();
    await expect.poll(() => calls.filter(c => c.method === 'GET' && c.pathname === '/api/overtime').length).toBeGreaterThan(1);
    expect(await page.locator('html').evaluate(e => e.scrollWidth - e.clientWidth)).toBe(0);
    expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBe(0);
    await page.screenshot({ path: info.outputPath(`bulk-overtime-unconfirmed-${width}.png`), fullPage: true });
  });
}
