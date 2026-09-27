import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const endpoint = '/api/nearmiss/';
const isEndpoint = pathname => pathname.replace(/\/+$/, '') === endpoint.replace(/\/+$/, '');
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
  if (simulateFailure && isEndpoint(pathname)) {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Service unavailable while Supabase wakes up' }) });
    return;
  }
  await route.continue();
});

page.on('response', response => {
  if (isEndpoint(new URL(response.url()).pathname) && response.request().method() === 'GET') {
    responses.push(response.status());
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
const waitForLive = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForFunction(() =>
      document.querySelectorAll('button[aria-label="Show report details"]').length > 0 ||
      document.body.innerText.includes('Could not load near miss reports'),
    undefined, { timeout: 180_000 });
    const count = await page.getByRole('button', { name: 'Show report details' }).count();
    if (count > 0) return count;
    if (attempt === 4) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    else await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  throw new Error('The live near miss register did not recover after five free-tier retries.');
};
const selectOption = async (title, label) => {
  await page.locator(`button[title="${title}"]`).filter({ visible: true }).first().click();
  const listbox = page.getByRole('listbox').last();
  await listbox.waitFor({ state: 'visible', timeout: 5_000 });
  await listbox.getByRole('option', { name: label, exact: true }).click();
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/near_miss', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  const liveCount = await waitForLive();

  simulateFailure = true;
  const failedRefresh = page.waitForResponse(response => isEndpoint(new URL(response.url()).pathname) && response.status() === 503, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await failedRefresh;
  await page.getByText('Could not load near miss reports', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load near miss reports' }).isVisible(),
    recordsPreserved: await page.getByRole('button', { name: 'Show report details' }).count() === liveCount,
    falseEmpty: await page.getByText('Submit the first near miss report using the button above', { exact: true }).count(),
  };

  simulateFailure = false;
  const staleRetry = page.waitForResponse(response => isEndpoint(new URL(response.url()).pathname), { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const staleRetryStatus = (await staleRetry).status();
  await waitForLive();

  simulateFailure = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Could not load near miss reports', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const failureText = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load near miss reports' }).isVisible(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmpty: failureText.includes('Submit the first near miss report using the button above'),
    unavailableStats: failureText.includes('—'),
    newDisabled: await page.getByRole('button', { name: 'New Report' }).isDisabled(),
  };

  simulateFailure = false;
  const retry = page.waitForResponse(response => isEndpoint(new URL(response.url()).pathname), { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const retryStatus = (await retry).status();
  await waitForLive();

  const controls = {
    refresh: await height(page.getByRole('button', { name: 'Refresh' })),
    section: await height(page.locator('button[title="Section"]').filter({ visible: true }).first()),
    fromDate: await height(page.getByLabel('From date')),
    disclosure: await height(page.getByRole('button', { name: 'Show report details' }).first()),
    edit: await height(page.getByRole('button', { name: 'Edit', exact: true }).first()),
    delete: await height(page.getByRole('button', { name: 'Delete', exact: true }).first()),
  };

  const search = page.getByPlaceholder('Search department, reporter, location…');
  await search.fill('Engineering workshop');
  const searchCount = await page.getByRole('button', { name: 'Show report details' }).count();
  await search.fill('');
  await selectOption('Section', 'Electrical');
  const sectionCount = await page.getByRole('button', { name: 'Show report details' }).count();
  await selectOption('Section', 'All Sections');
  await page.getByLabel('From date').fill('2026-08-04');
  await page.getByLabel('To date').fill('2026-08-04');
  const dateCount = await page.getByRole('button', { name: 'Show report details' }).count();
  const clearHeight = await height(page.getByRole('button', { name: 'Clear' }));
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'Show report details' }).first().click();
  const expanded = await page.getByRole('button', { name: 'Hide report details' }).first().isVisible();
  await page.locator('tbody tr').first().click();
  const detailVisible = await page.getByText('Near Miss Report Details', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const detailClose = page.getByRole('button', { name: 'Close', exact: true }).last();
  const detail = {
    close: await height(detailClose),
    edit: await height(page.getByRole('button', { name: 'Edit', exact: true })),
    delete: await height(page.getByRole('button', { name: 'Delete', exact: true })),
  };
  await detailClose.click();

  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const editVisible = await page.getByText('Edit Near Miss Report', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  const deleteVisible = await page.getByText('Delete this report?', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const deleteCancelHeight = await height(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLive();
  await page.getByRole('button', { name: 'New Report' }).click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog');
  const departmentBox = await page.getByPlaceholder('e.g. Engineering').boundingBox();
  const sectionBox = await page.getByRole('button', { name: 'General / Other' }).boundingBox();
  const witnessBox = await page.getByPlaceholder('Names and contact info').boundingBox();
  const reporterBox = await page.getByPlaceholder('Select or type name (optional)').boundingBox();
  const mobile = {
    bodyOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth),
    modalOverflow: await dialog.evaluate(element => element.scrollWidth - element.clientWidth),
    firstRowStacked: sectionBox.y >= departmentBox.y + departmentBox.height,
    lastRowStacked: reporterBox.y >= witnessBox.y + witnessBox.height,
    cancelHeight: await height(page.getByRole('button', { name: 'Cancel', exact: true })),
  };
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-near-miss-dark-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  const restoredCount = await waitForLive();

  const evidence = {
    liveCount,
    staleFailure,
    staleRetryStatus,
    initialFailure,
    retryStatus,
    controls,
    filters: { searchCount, sectionCount, dateCount, clearHeight },
    interactions: { expanded, detailVisible, detail, editVisible, deleteVisible, deleteCancelHeight },
    mobile,
    blockedWrites,
    responses: { total: responses.length, successful: responses.filter(status => status === 200).length, simulatedFailures: responses.filter(status => status === 503).length },
    restored: { count: restoredCount, design: 'dallaglio', theme: 'light' },
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(liveCount > 0 && restoredCount === liveCount, 'The live near miss register did not restore.');
  check(staleFailure.alert && staleFailure.recordsPreserved && staleFailure.falseEmpty === 0, 'Quiet failure did not preserve the near miss register.');
  check(initialFailure.alert && initialFailure.retryButtons === 1 && !initialFailure.falseEmpty && initialFailure.unavailableStats && initialFailure.newDisabled, 'Initial near miss failure state is misleading.');
  check(staleRetryStatus === 200 && retryStatus === 200, 'A near miss retry did not recover.');
  check(Object.values(controls).every(value => value >= 36), 'A Dallaglio near miss control has the wrong height.');
  check(searchCount > 0 && searchCount < liveCount && sectionCount > 0 && sectionCount < liveCount && dateCount > 0 && dateCount < liveCount && clearHeight >= 36, 'A near miss filter failed.');
  check(expanded && detailVisible && Object.values(detail).every(value => value >= 36) && editVisible && deleteVisible && deleteCancelHeight >= 36, 'A near miss interaction failed.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.modalOverflow === 0 && mobile.firstRowStacked && mobile.lastRowStacked && mobile.cancelHeight >= 36, 'The phone-width near miss form overflowed or did not stack.');
} catch (error) {
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
