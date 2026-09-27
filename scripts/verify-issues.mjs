import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

let failIssues = false;
let failStats = false;
let failSpares = false;
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
  if (
    (failIssues && pathname === '/api/issues') ||
    (failStats && pathname === '/api/issues/stats/summary') ||
    (failSpares && pathname === '/api/spares')
  ) {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Service unavailable while Supabase wakes up' }),
    });
    return;
  }
  await route.continue();
});

page.on('response', response => {
  const pathname = new URL(response.url()).pathname;
  if (['/api/issues', '/api/issues/stats/summary', '/api/spares'].includes(pathname)) {
    responses.push({ pathname, status: response.status() });
  }
});

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const height = async locator => Math.round((await locator.boundingBox()).height);
const waitForRecords = async () => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForFunction(() =>
      document.querySelectorAll('tbody tr').length >= 75 ||
      document.body.innerText.includes('Could not load stock issues'),
    undefined, { timeout: 180_000 });
    if (await page.locator('tbody tr').count() >= 75) return;
    if (attempt === 3) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    else await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  throw new Error('The live Issues register did not recover after four free-tier retries.');
};
const waitForText = async text => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 180_000 });
};
const setAppearance = async (design, theme) => {
  await page.evaluate(({ design, theme }) => {
    localStorage.setItem('myoffice_design', design);
    localStorage.setItem('myoffice_theme', theme);
  }, { design, theme });
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/issues', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setAppearance('dallaglio', 'light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecords();
  await waitForText('75 records');

  failIssues = true;
  const failedRefresh = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/issues' && response.status() === 503,
  { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await failedRefresh;
  await waitForText('Could not load stock issues');
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load stock issues' }).isVisible(),
    recordsPreserved: await page.locator('tbody tr').count() >= 75,
    falseEmpty: await page.getByText('No issue records', { exact: true }).count(),
  };

  failIssues = false;
  const staleRetry = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/issues' && response.request().method() === 'GET',
  { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const staleRetryStatus = (await staleRetry).status();
  await waitForRecords();
  const staleRetryRecovered = await page.locator('tbody tr').count() >= 75;

  failIssues = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForText('Could not load stock issues');
  const failureText = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load stock issues' }).isVisible(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmpty: failureText.includes('No issue records'),
    inviteFirst: failureText.includes('Use the form above to record the first issue'),
    totalCostUnavailable: failureText.includes('—'),
    recordDisabled: await page.getByRole('button', { name: 'Record Issue' }).isDisabled(),
  };

  failIssues = false;
  const retry = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/issues' && response.request().method() === 'GET',
  { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const retryStatus = (await retry).status();
  await waitForRecords();
  const retryRecovered = await page.locator('tbody tr').count() >= 75;

  failStats = true;
  failSpares = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecords();
  await waitForText('Issue statistics are unavailable.');
  const supportingFailureText = await page.locator('main').last().innerText();
  const supportingFailure = {
    recordsVisible: await page.locator('tbody tr').count() >= 75,
    warning: supportingFailureText.includes('Spare catalogue search is unavailable'),
    unavailableStats: supportingFailureText.includes('—'),
    manualEntryEnabled: !(await page.getByRole('button', { name: 'Record Issue' }).isDisabled()),
  };

  failStats = false;
  failSpares = false;
  const supportRetry = Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/issues/stats/summary' && response.status() === 200, { timeout: 180_000 }),
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/spares' && response.status() === 200, { timeout: 180_000 }),
  ]);
  await page.getByRole('button', { name: 'Retry data' }).click();
  const supportRetryStatuses = (await supportRetry).map(response => response.status());
  await waitForText('75 records');

  const controls = {
    refresh: await height(page.getByRole('button', { name: 'Refresh' })),
    download: await height(page.getByRole('button', { name: 'Download' })),
    stats: await height(page.getByRole('button', { name: /statistics/ })),
    removeItem: await height(page.getByRole('button', { name: 'Remove item' })),
    logTab: await height(page.getByRole('tab', { name: 'Issue Log' })),
    expand: await height(page.getByRole('button', { name: 'Show issue details' }).first()),
    delete: await height(page.getByRole('button', { name: 'Delete record' }).first()),
    fromDate: await height(page.getByLabel('From date')),
  };

  await page.getByRole('button', { name: 'Download' }).click();
  const downloadMenu = await page.getByText('Export Excel (.xlsx)', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Close download menu' }).click();
  await page.getByRole('button', { name: 'Show statistics' }).click();
  const statsExpanded = await page.getByRole('button', { name: 'Hide statistics' }).isVisible();
  await page.getByRole('button', { name: 'Hide statistics' }).click();

  await page.getByRole('tab', { name: 'Analytics' }).click();
  await page.getByRole('tab', { name: 'Monthly' }).click();
  const analyticsVisible = await page.getByText('Descriptive Statistics · All Time', { exact: true }).isVisible();
  await page.getByRole('tab', { name: 'Issue Log' }).click();

  const firstRecipient = (await page.locator('tbody tr').first().locator('td').nth(1).innerText()).split('\n')[0].trim();
  await page.getByPlaceholder('Search recipient, item, notes…').fill(firstRecipient);
  await page.getByLabel('From date').fill('2026-01-01');
  await page.getByLabel('To date').fill('2026-12-31');
  const filteredRows = await page.locator('tbody tr').count();
  const clearHeight = await height(page.getByRole('button', { name: 'Clear' }));
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'Show issue details' }).first().click();
  const detailsVisible = await page.getByText('Items Issued', { exact: true }).first().isVisible();
  await page.getByRole('button', { name: 'Hide issue details' }).first().click();
  await page.getByRole('button', { name: 'Delete record' }).first().click();
  const deleteVisible = await page.getByText('Delete this issue record?', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const deleteCancelHeight = await height(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dallaglio', 'dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecords();
  const mobileForm = page.getByText('Items to Issue', { exact: true }).locator('xpath=../..');
  const mobile = {
    bodyOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth),
    formOverflow: await mobileForm.evaluate(element => element.scrollWidth - element.clientWidth),
    labelsVisible: await page.getByText('Stock Code', { exact: true }).last().isVisible() && await page.getByText('Unit Cost', { exact: true }).last().isVisible(),
  };
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-issues-dark-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('dallaglio', 'light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecords();

  const evidence = {
    staleFailure,
    staleRetryStatus,
    staleRetryRecovered,
    initialFailure,
    retryStatus,
    retryRecovered,
    supportingFailure,
    supportRetryStatuses,
    controls,
    interactions: { downloadMenu, statsExpanded, analyticsVisible, filteredRows, clearHeight, detailsVisible, deleteVisible, deleteCancelHeight },
    mobile,
    blockedWrites,
    responses: {
      total: responses.length,
      successfulIssues: responses.filter(response => response.pathname === '/api/issues' && response.status === 200).length,
      successfulStats: responses.filter(response => response.pathname === '/api/issues/stats/summary' && response.status === 200).length,
      successfulSpares: responses.filter(response => response.pathname === '/api/spares' && response.status === 200).length,
      simulatedFailures: responses.filter(response => response.status === 503).length,
    },
    restored: { design: 'dallaglio', theme: 'light' },
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(staleFailure.alert && staleFailure.recordsPreserved && staleFailure.falseEmpty === 0, 'Quiet failure did not preserve a truthful register.');
  check(staleRetryRecovered, 'Quiet-failure retry did not recover.');
  check(initialFailure.alert && initialFailure.retryButtons === 1 && !initialFailure.falseEmpty && !initialFailure.inviteFirst && initialFailure.totalCostUnavailable && initialFailure.recordDisabled, 'Initial register failure state is misleading.');
  check(retryRecovered, 'Initial-failure retry did not recover.');
  check(supportingFailure.recordsVisible && supportingFailure.warning && supportingFailure.unavailableStats && supportingFailure.manualEntryEnabled, 'Supporting-resource failure state is misleading.');
  check(supportRetryStatuses.every(status => status === 200), 'Supporting-resource retry did not recover.');
  check(Object.values(controls).every(value => value >= 36), 'A Dallaglio control is below 36px.');
  check(downloadMenu && statsExpanded && analyticsVisible && filteredRows > 0 && detailsVisible && deleteVisible && deleteCancelHeight >= 36 && clearHeight >= 36, 'A key Issues interaction failed.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.formOverflow === 0 && mobile.labelsVisible, 'The phone-width form still overflows or lacks labels.');
} catch (error) {
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
