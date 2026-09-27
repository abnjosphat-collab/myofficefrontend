import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const endpoints = new Set([
  '/api/nearmiss',
  '/api/work-stoppage',
  '/api/vfl',
  '/api/pto',
  '/api/sheq',
  '/api/pachedu',
]);
const normalize = pathname => pathname.replace(/\/+$/, '');
const isDataEndpoint = pathname => endpoints.has(normalize(pathname));
let simulateFailure = false;
const blockedWrites = [];
const responses = [];

await page.route('**/api/**', async route => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (request.method() !== 'GET') {
    blockedWrites.push({ method: request.method(), pathname });
    await route.abort('blockedbyclient');
    return;
  }
  if (simulateFailure && isDataEndpoint(pathname)) {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Service unavailable while Supabase wakes up' }) });
    return;
  }
  await route.continue();
});

page.on('response', response => {
  const pathname = normalize(new URL(response.url()).pathname);
  if (endpoints.has(pathname) && response.request().method() === 'GET') {
    responses.push({ pathname, status: response.status() });
  }
});

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const height = async locator => Math.round((await locator.boundingBox()).height);
const setAppearance = async theme => {
  await page.evaluate(nextTheme => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', nextTheme);
  }, theme);
};
const getStat = async label => page.locator('main').last().locator('div').evaluateAll((elements, expectedLabel) => {
  const labelElement = elements.find(element =>
    element.textContent?.trim() === expectedLabel &&
    element.style.fontSize === '12px' &&
    element.parentElement?.children[1]?.style.fontSize === '32px');
  return labelElement?.parentElement?.children[1]?.textContent?.trim() ?? '';
}, label);
const waitForDashboard = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForFunction(() =>
      document.body.innerText.includes('Total Reports') ||
      document.body.innerText.includes('Could not load the complete SHEQ dashboard'),
    undefined, { timeout: 180_000 });
    if (await page.getByText('Total Reports', { exact: true }).isVisible().catch(() => false)) return;
    if (attempt === 4) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    else await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  throw new Error('The live SHEQ dashboard did not recover after five free-tier retries.');
};
const isSingleColumn = async locator => locator.evaluate(element => {
  const children = Array.from(element.children).filter(child => child.getBoundingClientRect().height > 0);
  if (children.length < 2) return true;
  const first = children[0].getBoundingClientRect();
  const second = children[1].getBoundingClientRect();
  return second.top >= first.bottom - 1;
});

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/sheq', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForDashboard();

  const live = {
    totalReports: await getStat('Total Reports'),
    nearMiss: await getStat('Near Miss'),
    workStoppages: await getStat('Work Stoppages'),
    vfl: await getStat('VFL Observations'),
    pto: await getStat('PTO Reports'),
    inspections: await getStat('Inspections'),
  };
  const moduleScope = {
    hero: await page.getByText('Live overview across Near Miss, Work Stoppage, VFL, PTO, Inspections & Pachedu', { exact: true }).isVisible(),
    total: await page.getByText('All 6 modules', { exact: true }).isVisible(),
  };

  simulateFailure = true;
  const quietFailures = Promise.all([...endpoints].map(endpoint =>
    page.waitForResponse(response => normalize(new URL(response.url()).pathname) === endpoint && response.status() === 503, { timeout: 30_000 })));
  await page.getByRole('button', { name: 'Refresh' }).click();
  await quietFailures;
  await page.getByText('Could not load the complete SHEQ dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load the complete SHEQ dashboard' }).isVisible(),
    totalPreserved: await getStat('Total Reports') === live.totalReports,
    dashboardPreserved: await page.getByText('Weekly Performance vs Target', { exact: true }).isVisible(),
  };

  simulateFailure = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await waitForDashboard();
  const staleRecovered = await page.getByRole('alert').filter({ hasText: 'Could not load the complete SHEQ dashboard' }).count() === 0;

  simulateFailure = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Could not load the complete SHEQ dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const failureMain = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load the complete SHEQ dashboard' }).isVisible(),
    retryHeight: await height(page.getByRole('button', { name: 'Try again' })),
    noDashboard: await page.getByText('Total Reports', { exact: true }).count() === 0,
    noRefreshedTime: !failureMain.includes('Refreshed '),
    noPerfectScore: !failureMain.includes('100 / 100'),
  };

  simulateFailure = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await waitForDashboard();

  const controls = {
    nearMissLink: await height(page.getByRole('link', { name: 'Near Miss', exact: true })),
    expandAll: await height(page.getByRole('button', { name: 'Expand All' })),
    auto: await height(page.getByRole('button', { name: 'Auto OFF' })),
    refresh: await height(page.getByRole('button', { name: 'Refresh' })),
    sevenDays: await height(page.getByRole('button', { name: '7 Days', exact: true })),
    allTime: await height(page.getByRole('button', { name: 'All Time', exact: true })),
  };

  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  controls.fromDate = await height(page.getByLabel('From date'));
  controls.toDate = await height(page.getByLabel('To date'));
  await page.getByLabel('From date').fill('2026-08-01');
  await page.getByLabel('To date').fill('2026-09-27');
  const customRangeApplied = await page.getByRole('button', { name: 'Custom', exact: true }).getAttribute('aria-pressed') === 'true';
  await page.getByRole('button', { name: 'All Time', exact: true }).click();

  await page.getByRole('button', { name: 'Expand All' }).click();
  const sectionsOpen = await page.getByRole('button', { name: 'Collapse All' }).isVisible() &&
    await page.getByRole('button', { name: /Weekly Performance vs Target/ }).getAttribute('aria-expanded').catch(() => 'not-set') !== 'false';

  const openLinks = page.getByRole('link', { name: 'Open' });
  const openLinkHeights = [];
  for (let index = 0; index < await openLinks.count(); index += 1) openLinkHeights.push(await height(openLinks.nth(index)));

  await page.getByRole('button', { name: 'Edit Targets' }).click();
  const targetControls = {
    cancel: await height(page.getByRole('button', { name: 'Cancel', exact: true })),
    save: await height(page.getByRole('button', { name: 'Save Targets' })),
    input: await height(page.getByLabel('VFL Observations target')),
  };
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  const nonMutatingActions = {
    analyseHeight: await height(page.getByRole('button', { name: 'Analyse', exact: true })),
    addNoteHeight: await height(page.getByRole('button', { name: 'Add', exact: true })),
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForDashboard();
  await page.getByRole('button', { name: 'Expand All' }).click();
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.waitForTimeout(500);

  const weeklyRowsContained = await page.locator('.sheq-weekly-row').evaluateAll(rows => rows.every(row => {
    const rowBox = row.getBoundingClientRect();
    return Array.from(row.children).every(child => {
      const box = child.getBoundingClientRect();
      return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
    });
  }));
  const notesInputs = page.locator('.sheq-notes-form input');
  const firstNoteInput = await notesInputs.nth(0).boundingBox();
  const secondNoteInput = await notesInputs.nth(1).boundingBox();
  const customRange = page.locator('.sheq-custom-range');
  const mobile = {
    bodyOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth),
    weeklyRowsContained,
    scoreStacked: await isSingleColumn(page.locator('.sheq-score-grid')),
    analyticsStacked: await isSingleColumn(page.locator('.sheq-two-col').first()),
    trendColumns: await page.locator('.sheq-five-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length),
    notesStacked: secondNoteInput.y >= firstNoteInput.y + firstNoteInput.height,
    customRangeOverflow: await customRange.evaluate(element => element.scrollWidth - element.clientWidth),
    analyseHeight: await height(page.getByRole('button', { name: 'Analyse', exact: true })),
    addNoteHeight: await height(page.getByRole('button', { name: 'Add', exact: true })),
  };
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-sheq-dark-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForDashboard();
  const restored = {
    totalReports: await getStat('Total Reports'),
    design: await page.evaluate(() => localStorage.getItem('myoffice_design')),
    theme: await page.evaluate(() => localStorage.getItem('myoffice_theme')),
  };

  const evidence = {
    live,
    moduleScope,
    staleFailure,
    staleRecovered,
    initialFailure,
    controls,
    customRangeApplied,
    sectionsOpen,
    openLinkHeights,
    targetControls,
    nonMutatingActions,
    mobile,
    blockedWrites,
    responses: {
      total: responses.length,
      successful: responses.filter(response => response.status === 200).length,
      simulatedFailures: responses.filter(response => response.status === 503).length,
      paths: [...new Set(responses.map(response => response.pathname))],
    },
    restored,
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(Number(live.totalReports) > 0 && restored.totalReports === live.totalReports, 'The live SHEQ dashboard did not restore its total.');
  check(Object.values(live).every(value => /^\d+$/.test(value)), 'A live SHEQ module total was not rendered.');
  check(moduleScope.hero && moduleScope.total, 'The SHEQ dashboard does not describe all six aggregated modules.');
  check(staleFailure.alert && staleFailure.totalPreserved && staleFailure.dashboardPreserved && staleRecovered, 'A quiet SHEQ failure did not preserve and recover the dashboard.');
  check(initialFailure.alert && initialFailure.retryHeight >= 36 && initialFailure.noDashboard && initialFailure.noRefreshedTime && initialFailure.noPerfectScore, 'The initial SHEQ failure state presented plausible dashboard data.');
  check(Object.values(controls).every(value => value >= 36), 'A Dallaglio SHEQ hero or range control has the wrong height.');
  check(customRangeApplied && sectionsOpen, 'SHEQ range or disclosure interactions failed.');
  check(openLinkHeights.length === 6 && openLinkHeights.every(value => value >= 36), 'A SHEQ module Open action has the wrong height.');
  check(Object.values(targetControls).every(value => value >= 36), 'A SHEQ target-edit control has the wrong height.');
  check(Object.values(nonMutatingActions).every(value => value >= 36), 'A SHEQ analysis or note action has the wrong height.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.weeklyRowsContained, 'The phone-width SHEQ dashboard overflowed.');
  check(mobile.scoreStacked && mobile.analyticsStacked && mobile.trendColumns === 2 && mobile.notesStacked && mobile.customRangeOverflow === 0, 'A phone-width SHEQ grid or form did not reflow.');
  check(mobile.analyseHeight >= 36 && mobile.addNoteHeight >= 36, 'A phone-width SHEQ action has the wrong height.');
  check(blockedWrites.length > 0 && blockedWrites.every(request => request.method !== 'GET'), 'The SHEQ verifier did not block background writes.');
  check(responses.filter(response => response.status === 200).length >= 18, 'The SHEQ verifier did not observe complete successful load cycles.');
  check(responses.filter(response => response.status === 503).length >= 12, 'The SHEQ verifier did not exercise both failure states.');
  check(restored.design === 'dallaglio' && restored.theme === 'light', 'The browser was not restored to Dallaglio light.');
} catch (error) {
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
