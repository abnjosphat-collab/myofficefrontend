// Recovery audit regressions. Fictional sessions and intercepted APIs only.
import { test, expect } from '@playwright/test';
import { makeHandler, signInFixture } from '../scripts/lib/fixtures.mjs';
import report from '../scripts/route-specs/engineering-report.mjs';
import employees from '../scripts/route-specs/employees.mjs';
import availabilities from '../scripts/route-specs/availabilities.mjs';

test('late availability prefill preserves manually entered downtime in the saved payload', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInFixture(page.context());
  await page.route('**/api/**', makeHandler(availabilities.data, []));
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const readStarted = new Promise<void>(resolve => { started = resolve; });
  await page.route('**/api/availability-records/from-breakdowns?**', async route => {
    started();
    await gate;
    const date = new URL(route.request().url()).searchParams.get('date_from');
    await route.fulfill({ json: [{ id: 'late-fixture', equipment_id: 1, date, operational_hours: 24, breakdown_hours: 9, availability_percentage: 62.5 }] });
  });
  await page.goto('/availabilities');
  await page.getByRole('button', { name: 'Log record', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Log availability record' });
  await dialog.getByRole('combobox', { name: 'Equipment' }).click();
  await page.getByRole('option', { name: 'Crusher One' }).click();
  await readStarted;
  await dialog.getByLabel(/^Downtime hours/).fill('3');
  const response = page.waitForResponse(r => r.url().includes('/from-breakdowns?'));
  release();
  await (await response).finished();
  // Allow the delivered response to commit before inspecting or submitting.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(dialog.getByLabel(/^Downtime hours/)).toHaveValue('3');
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate(e => e.clientWidth));
  await page.screenshot({ path: info.outputPath('availability-manual-downtime-390.png'), fullPage: true });
  const [post] = await Promise.all([
    page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/api/availability-records'),
    dialog.getByRole('button', { name: 'Save record', exact: true }).click(),
  ]);
  expect(post.postDataJSON().breakdown_hours).toBe(3);
  await expect(dialog).toBeHidden();
});

test('a real Radix dialog retains its modal pointer lock and releases it on close', async ({ page }) => {
  await signInFixture(page.context());
  await page.route('**/api/**', makeHandler(employees.data, []));
  await page.goto('/employees');
  await page.getByRole('button', { name: 'Add employee', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add an employee' });
  await expect(dialog).toBeVisible();
  // MutationObservers have run by the next task. Inspect the real portalled DOM,
  // rather than fabricating a data-radix-portal wrapper that Radix never renders.
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe('none');
  await dialog.getByRole('combobox', { name: /^Designation/ }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe('none');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe('none');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe('');
  await expect(page.getByRole('button', { name: 'Add employee', exact: true }).first()).toBeEnabled();
});

for (const width of [1440, 390]) {
  test(`engineering report prints the chosen period without application chrome at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await signInFixture(page.context());
    await page.route('**/api/**', makeHandler(report.data, []));
    await page.context().route('**/rest/v1/user_profiles**', route => {
      const profile = { id: '00000000-0000-4000-8000-000000000009', role: 'admin', is_active: true, permissions: { features: ['appearance_themes'] } };
      return route.fulfill({ json: /vnd.pgrst.object/.test(route.request().headers().accept || '') ? profile : [profile] });
    });
    await page.addInitScript(() => localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' })));
    await page.goto('/engineering_report');
    await expect(page.getByRole('heading', { name: 'Engineering report', exact: true })).toBeVisible();
    await expect(page.locator('[role=status][aria-label^="Loading"]').first()).toBeHidden();
    if (width === 1440) {
      await page.getByRole('combobox', { name: 'Report period' }).click();
      await page.getByRole('option').nth(1).click();
    }
    const period = await page.getByRole('combobox', { name: 'Report period' }).innerText();
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
    await expect.soft(page.locator('html')).toHaveCSS('color-scheme', 'light');
    await expect.soft(page.locator('body > div[aria-hidden="true"]')).toBeHidden();
    await expect.soft(page.getByRole('heading', { name: 'Lubrication', exact: true }).locator('..')).toHaveCSS('break-inside', 'avoid');
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden();
    await expect(page.locator('aside')).toBeHidden();
    await expect(page.locator('[data-nav-strip]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Feedback', exact: true })).toBeHidden();
    await expect(page.getByRole('combobox', { name: 'Report period' })).toBeHidden();
    await expect(page.getByRole('heading', { name: `Report summary: ${period}`, exact: true })).toBeVisible();
    // The period must be visible on the first printed page as well as the summary.
    await expect(page.locator('.mo-print-report > p').filter({ hasText: period }).first()).toBeVisible();
    const geometry = await page.evaluate(() => {
      const luminance = (color: string) => {
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const textContrasts = [...document.querySelectorAll('.mo-print-report :is(.text-success, .text-warning, .text-danger)')].map(node => 1.05 / (luminance(getComputedStyle(node).color) + 0.05));
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        report: document.querySelector('.mo-print-report')?.getBoundingClientRect().x,
        ink: getComputedStyle(document.querySelector('h1')!).color,
        surface: getComputedStyle(document.querySelector('.mo-print-report')!).backgroundColor,
        statusTexts: textContrasts.length,
        minTextContrast: Math.min(...textContrasts),
      };
    });
    expect(geometry.overflow).toBe(0);
    expect(geometry.report).toBeLessThan(40);
    expect(geometry.ink).toBe('rgb(27, 41, 35)');
    expect(geometry.surface).toBe('rgb(255, 255, 255)');
    expect(geometry.statusTexts).toBeGreaterThan(0);
    expect(geometry.minTextContrast).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: info.outputPath(`engineering-report-print-${width}.png`), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
  });
}
