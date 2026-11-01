// Behaviour and geometry regressions from the November UI audit. Fictional
// sessions and mocked APIs only; screenshots are review artifacts, not baselines.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInFixture, makeHandler } from '../scripts/lib/fixtures.mjs';
import documents from '../scripts/route-specs/documents.mjs';
import availability from '../scripts/route-specs/availability.mjs';
import employees from '../scripts/route-specs/employees.mjs';
import overtime from '../scripts/route-specs/overtime.mjs';
import breakdowns from '../scripts/route-specs/breakdowns.mjs';
import sets from '../scripts/route-specs/sets.mjs';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function prepare(page: Page, spec: { data: object; storage?: object }, { dark = false, scale = 100, reduce = false } = {}) {
  await signInFixture(page.context());
  await page.route('**/api/**', makeHandler(spec.data, []));
  if (spec.storage) await page.addInitScript(entries => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }, spec.storage);
  if (dark) await page.context().route('**/rest/v1/user_profiles**', route => {
    const profile = { id: '00000000-0000-4000-8000-000000000009', email: 'shell-check@example.invalid', full_name: 'Shell Check', role: 'admin', is_active: true, permissions: { features: ['appearance_themes'] } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/vnd.pgrst.object/.test(route.request().headers().accept || '') ? profile : [profile]) });
  });
  await page.addInitScript(({ dark, scale }) => localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: scale, guidance: true, theme: dark ? 'mono' : 'sage', darkness: dark ? 'dark' : 'light' })), { dark, scale });
  await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
}

async function open(page: Page, path: string, heading: string) {
  await page.goto(path, { waitUntil: 'load' });
  await expect(page.getByRole('heading', { level: 1, name: heading, exact: true }).first()).toBeVisible();
  await expect(page.locator('[role=status][aria-label^="Loading"]').first()).toBeHidden();
}

for (const scale of [100, 130]) test(`rich notices retain readable text at ${scale}%`, async ({ page }, info) => {
  await prepare(page, documents, { scale });
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page, '/documents', 'Documents');
  const notice = page.getByRole('status').filter({ hasText: 'The Asset Management System folders are not all set up' }).first();
  const body = notice.locator(':scope > div').first();
  const action = notice.getByRole('button', { name: 'Set up the AMS folders' });
  const textBox = await body.boundingBox(), actionBox = await action.boundingBox();
  expect(textBox!.width).toBeGreaterThan(240);
  expect(actionBox!.y).toBeGreaterThanOrEqual(textBox!.y + textBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  expect(errors.filter(e => /cannot.*descendant|cannot contain|hydration/i.test(e))).toEqual([]);
  await page.screenshot({ path: info.outputPath(`notice-${scale}.png`) });
});

test('overflowing metrics are keyboard scrollable; desktop adds no extra stop', async ({ page }) => {
  await prepare(page, availability);
  await open(page, '/availability', 'Availability overview');
  const strip = page.getByRole('region', { name: 'Summary metrics', exact: true });
  await expect(strip).toHaveAttribute('tabindex', '0');
  await strip.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => strip.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  const axe = await new AxeBuilder({ page }).include('main').withRules(['scrollable-region-focusable']).analyze();
  expect(axe.violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(strip).toHaveCount(0);
});

test('the native checkbox has a real 44px hit area in cards and tables', async ({ page }) => {
  await prepare(page, breakdowns);
  await open(page, '/breakdowns', 'Breakdowns');
  for (const view of ['Table view', 'Card view']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    const checkbox = page.getByRole('checkbox', { name: /^Select breakdown / }).first();
    await checkbox.scrollIntoViewIfNeeded();
    const r = await checkbox.boundingBox();
    expect(r!.width).toBeGreaterThanOrEqual(44);
    expect(r!.height).toBeGreaterThanOrEqual(44);
    let checked = await checkbox.isChecked();
    for (const farEdge of [false, true]) {
      await checkbox.scrollIntoViewIfNeeded();
      const box = (await checkbox.boundingBox())!;
      await page.touchscreen.tap(box.x + (farEdge ? box.width - 2 : 2), box.y + (farEdge ? box.height - 2 : 2));
      checked = !checked;
      await expect(checkbox).toBeChecked({ checked });
    }
    await page.keyboard.press('Tab');
    await checkbox.focus();
    await expect(checkbox).toBeFocused();
    expect(await checkbox.evaluate(e => e.matches(':focus-visible'))).toBe(true);
    expect(await checkbox.evaluate(e => getComputedStyle(e.nextElementSibling!).boxShadow)).not.toBe('none');
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked({ checked: !checked });
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked({ checked });
  }
});

test('changing summary dates cancels the old generation and binds the new result period', async ({ page }, info) => {
  await prepare(page, overtime);
  await open(page, '/overtime', 'Overtime');
  await page.getByRole('tab', { name: 'Summaries', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Summaries' }).getByRole('alert')).toHaveCount(0);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const requested = new Promise<void>(resolve => { started = resolve; });
  let first = true;
  await page.route('**/api/timesheets?**', async route => {
    if (first) { first = false; started(); await held; }
    if (!route.request().failure()) await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await requested;
  await page.getByLabel('From', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To', { exact: true }).fill('2026-10-31');
  await expect(page.getByText('Pick a period and press Generate.')).toBeVisible();
  release();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Overtime summary 2026-10-01 to 2026-10-31' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('summary-period.png') });
});

for (const width of [390, 1440]) for (const dark of [false, true]) test(`destructive contrast and native dates (${dark ? 'Mono' : 'Sage'}, ${width}px)`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await prepare(page, breakdowns, { dark, reduce: true });
  await open(page, '/breakdowns', 'Breakdowns');
  await page.getByRole('button', { name: 'Log breakdown', exact: true }).click();
  const date = page.getByRole('dialog').locator('input[type=date]').first();
  await expect.poll(() => date.evaluate(e => getComputedStyle(e).colorScheme)).toBe(dark ? 'dark' : 'light');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^More actions for / }).first().click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  const axe = await new AxeBuilder({ page }).include('[role=alertdialog]').withRules(['color-contrast']).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath(`confirmation-${width}-${dark ? 'dark' : 'light'}.png`) });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
});

for (const width of [390, 1440]) test(`Tools retains Sage for an eligible dark account at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await prepare(page, sets, { dark: true, scale: 130, reduce: true });
  await open(page, '/tools', 'Overview');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sage');
  await expect(page.locator('html')).toHaveAttribute('data-darkness', 'light');
  await expect.poll(() => page.locator('html').evaluate(e => getComputedStyle(e).colorScheme)).toBe('light');
  await page.screenshot({ path: info.outputPath(`tools-sage-${width}.png`) });
});

test('dark backdrop keeps transparent metrics on the dark canvas at 130%', async ({ page }, info) => {
  await prepare(page, employees, { dark: true, scale: 130 });
  await open(page, '/employees', 'Personnel');
  await expect(page.getByRole('button', { name: 'Open Ann Alpha' })).toBeVisible();
  const background = await page.locator('[class*="backdrop"]').first().evaluate(e => ({ image: getComputedStyle(e).backgroundImage, color: getComputedStyle(e).backgroundColor }));
  expect(background).toEqual({ image: 'none', color: 'rgb(14, 14, 14)' });
  await page.screenshot({ path: info.outputPath('dark-metrics-130.png') });
});

test('Tools set names span the phone row and Enter still adds a line', async ({ page }, info) => {
  await prepare(page, sets);
  await page.goto('/tools', { waitUntil: 'load' });
  await expect(page.getByRole('heading', { name: 'Overview', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Add a set', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a set' });
  const name = dialog.getByRole('textbox', { name: 'Line 1 name', exact: true });
  expect((await name.boundingBox())!.width).toBeGreaterThan(250);
  await name.fill('Spanner 13mm with a long descriptive name');
  await name.press('Enter');
  await expect(dialog.getByRole('textbox', { name: 'Line 2 name' })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Line 1 quantity' }).fill('2');
  await dialog.getByRole('textbox', { name: 'Line 2 name' }).fill('Torque wrench');
  await dialog.locator('section[aria-label="Content lines"] > ol').scrollIntoViewIfNeeded();
  expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBe(0);
  await page.screenshot({ path: info.outputPath('tools-lines.png') });
  await dialog.getByRole('button', { name: 'Remove line 2', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Line 2 name' })).toHaveCount(0);
  await expect(name).toHaveValue('Spanner 13mm with a long descriptive name');
  await expect(dialog.getByRole('textbox', { name: 'Line 1 quantity' })).toHaveValue('2');
});

// Recheck each strip flagged by the audit, including root and child resizing
// under the supported text scale. This asserts rendered geometry and behaviour.
for (const file of ['availabilities', 'availability', 'breakdowns-analytics', 'condition-monitoring', 'drivers', 'engineering-report', 'engineering-dashboard', 'issues', 'quotations', 'reliability', 'sheq-inspection', 'sop-library', 'training', 'usage-analyzer', 'competency', 'contractors']) {
  test(`metric access regression: ${file}`, async ({ page }, info) => {
    const spec = ['competency', 'contractors'].includes(file)
      ? { route: `/${file}`, h1: file === 'competency' ? 'Competency' : 'Contractors', data: {} }
      : file === 'availability' ? availability : (await import(`../scripts/route-specs/${file}.mjs`)).default;
    await prepare(page, spec, { scale: 130, reduce: true });
    await page.goto(spec.route, { waitUntil: 'load' });
    await expect(page.getByRole('heading', { level: 1, name: spec.h1 }).first()).toBeVisible();
    await expect(page.locator('[role=status][aria-label^="Loading"]').first()).toBeHidden();
    const grids = page.locator('main [class*="snap-proximity"]');
    await expect(grids.first()).toBeVisible();
    const measurements = [];
    for (const grid of await grids.all()) {
      const geometry = await grid.evaluate(e => ({ width: e.clientWidth, content: e.scrollWidth }));
      const overflow = geometry.content > geometry.width + 1;
      if (overflow) {
        await expect(grid).toHaveAttribute('role', 'region');
        await expect(grid).toHaveAttribute('tabindex', '0');
        await expect(grid).toHaveAccessibleName(/.+/);
        await grid.focus();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => grid.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
      } else {
        await expect(grid).not.toHaveAttribute('tabindex');
        await expect(grid).not.toHaveAttribute('role', 'region');
      }
      measurements.push({ ...geometry, overflow });
    }
    const axe = await new AxeBuilder({ page }).include('main').withRules(['scrollable-region-focusable']).analyze();
    expect(axe.violations).toEqual([]);
    await info.attach('metric-geometry', { body: JSON.stringify(measurements), contentType: 'application/json' });
  });
}

for (const width of [820, 821]) test(`navigation boundary ${width}px retains the expected shell`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await prepare(page, employees, { scale: 130, reduce: true });
  await open(page, '/employees', 'Personnel');
  if (width === 820) {
    await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  } else {
    await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.screenshot({ path: info.outputPath(`boundary-${width}.png`) });
});
