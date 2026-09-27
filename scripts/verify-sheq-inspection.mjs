import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

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
  if (simulateFailure && pathname === '/api/sheq/') {
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
  if (new URL(response.url()).pathname === '/api/sheq/' && response.request().method() === 'GET') {
    responses.push(response.status());
  }
});

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const height = async locator => Math.round((await locator.boundingBox()).height);
const setAppearance = async (theme) => {
  await page.evaluate(nextTheme => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', nextTheme);
  }, theme);
};
const waitForLive = async () => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForFunction(() =>
      document.querySelectorAll('button[aria-label="Show inspection details"]').length >= 4 ||
      document.body.innerText.includes('Could not load SHEQ inspections'),
    undefined, { timeout: 180_000 });
    if (await page.getByRole('button', { name: 'Show inspection details' }).count() >= 4) return;
    if (attempt === 3) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    else await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  throw new Error('The live SHEQ inspection register did not recover after four free-tier retries.');
};
const selectOption = async (title, label) => {
  await page.locator(`button[title="${title}"]`).click();
  const option = page.getByRole('option', { name: label, exact: true });
  if (await option.count()) await option.click();
  else await page.getByText(label, { exact: true }).last().click();
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/sheq_inspection', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLive();

  simulateFailure = true;
  const failedRefresh = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/sheq/' && response.status() === 503,
  { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await failedRefresh;
  await page.getByText('Could not load SHEQ inspections', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load SHEQ inspections' }).isVisible(),
    recordsPreserved: await page.getByRole('button', { name: 'Show inspection details' }).count() === 4,
    falseEmpty: await page.getByText('No inspections yet', { exact: true }).count(),
  };

  simulateFailure = false;
  const staleRetry = page.waitForResponse(response => new URL(response.url()).pathname === '/api/sheq/', { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const staleRetryStatus = (await staleRetry).status();
  await waitForLive();

  simulateFailure = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Could not load SHEQ inspections', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const failureText = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load SHEQ inspections' }).isVisible(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmpty: failureText.includes('No inspections yet'),
    unavailableStats: failureText.includes('—'),
    newDisabled: await page.getByRole('button', { name: 'New Inspection' }).first().isDisabled(),
  };

  simulateFailure = false;
  const retry = page.waitForResponse(response => new URL(response.url()).pathname === '/api/sheq/', { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const retryStatus = (await retry).status();
  await waitForLive();

  const controls = {
    refresh: await height(page.getByRole('button', { name: 'Refresh' })),
    viewSegment: await height(page.getByRole('button', { name: 'Grid view' })),
    section: await height(page.locator('button[title="Section filter"]')),
    status: await height(page.locator('button[title="Status filter"]')),
    fromDate: await height(page.getByLabel('From date')),
    expandAll: await height(page.getByRole('button', { name: 'Expand all' })),
    collapseAll: await height(page.getByRole('button', { name: 'Collapse all' })),
    cardDisclosure: await height(page.getByRole('button', { name: 'Show inspection details' }).first()),
  };

  const search = page.getByPlaceholder('Search by title, inspector, location…');
  await search.fill('Dust suppression');
  const searchResult = await page.getByText('Dust suppression', { exact: true }).count() === 1;
  await search.fill('');
  await selectOption('Section filter', 'Electrical');
  const sectionFiltered = await page.getByRole('button', { name: 'Show inspection details' }).count() === 2;
  await selectOption('Section filter', 'All Sections');
  await selectOption('Status filter', 'Submitted');
  const statusFiltered = await page.getByRole('button', { name: 'Show inspection details' }).count() === 2;
  await selectOption('Status filter', 'All Status');
  await page.getByLabel('From date').fill('2026-03-01');
  await page.getByLabel('To date').fill('2026-08-31');
  const dateFiltered = await page.getByRole('button', { name: 'Show inspection details' }).count() === 4;
  const clearHeight = await height(page.getByRole('button', { name: 'Clear' }));
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'Expand all' }).click();
  const allExpanded = await page.getByRole('button', { name: 'Hide inspection details' }).count() === 4;
  const cardActionHeight = await height(page.getByRole('button', { name: 'View', exact: true }).first());
  await page.getByRole('button', { name: 'Collapse all' }).click();
  const allCollapsed = await page.getByRole('button', { name: 'Show inspection details' }).count() === 4;

  await page.getByRole('button', { name: 'Show inspection details' }).first().click();
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  const detailVisible = await page.getByText('Inspection Report', { exact: true }).isVisible();
  const detailClose = page.getByRole('button', { name: 'Close', exact: true }).last();
  const detailCloseHeight = await height(detailClose);
  const detailEditHeight = await height(page.getByRole('button', { name: 'Edit', exact: true }));
  await detailClose.click();

  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const editVisible = await page.getByText('Edit Inspection', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const modalTabHeight = await height(page.getByRole('tab', { name: 'Basic Info' }));
  await page.getByRole('tab', { name: /^Findings/ }).click();
  await page.getByRole('tab', { name: /^Photos/ }).click();
  await page.getByRole('tab', { name: 'Sign-off' }).click();
  await page.getByRole('tab', { name: 'Basic Info' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  const deleteVisible = await page.getByText('Delete this inspection?', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const deleteCancelHeight = await height(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Table view' }).click();
  await page.locator('table').waitFor({ state: 'visible' });
  const table = {
    visible: await page.locator('table').isVisible(),
    disclosure: await height(page.getByRole('button', { name: 'Show inspection findings' }).first()),
    edit: await height(page.getByRole('button', { name: 'Edit', exact: true }).first()),
    delete: await height(page.getByRole('button', { name: 'Delete', exact: true }).first()),
  };

  await page.getByRole('button', { name: 'Grid view' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLive();
  await page.getByRole('button', { name: 'New Inspection' }).first().click();
  await page.waitForTimeout(500);
  const phoneDialog = page.getByRole('dialog');
  const mobile = {
    bodyOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth),
    modalOverflow: await phoneDialog.evaluate(element => element.scrollWidth - element.clientWidth),
    tabHeight: await height(page.getByRole('tab', { name: 'Basic Info' })),
  };
  await page.getByRole('tab', { name: 'Findings' }).click();
  await page.getByRole('button', { name: 'Add First Finding' }).click();
  const removeFindingHeight = await height(page.getByRole('button', { name: 'Remove finding' }));
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-sheq-inspection-dark-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLive();

  const evidence = {
    staleFailure,
    staleRetryStatus,
    initialFailure,
    retryStatus,
    controls,
    filters: { searchResult, sectionFiltered, statusFiltered, dateFiltered, clearHeight },
    interactions: { allExpanded, allCollapsed, cardActionHeight, detailVisible, detailCloseHeight, detailEditHeight, editVisible, modalTabHeight, deleteVisible, deleteCancelHeight },
    table,
    mobile: { ...mobile, removeFindingHeight },
    blockedWrites,
    responses: {
      total: responses.length,
      successful: responses.filter(status => status === 200).length,
      simulatedFailures: responses.filter(status => status === 503).length,
    },
    restored: { design: 'dallaglio', theme: 'light' },
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(staleFailure.alert && staleFailure.recordsPreserved && staleFailure.falseEmpty === 0, 'Quiet failure did not preserve the inspection register.');
  check(initialFailure.alert && initialFailure.retryButtons === 1 && !initialFailure.falseEmpty && initialFailure.unavailableStats && initialFailure.newDisabled, 'Initial inspection failure state is misleading.');
  check(Object.entries(controls).every(([key, value]) => key === 'viewSegment' ? value === 33 : value >= 36), 'A Dallaglio register control has the wrong height.');
  check(searchResult && sectionFiltered && statusFiltered && dateFiltered && clearHeight >= 36, 'An inspection filter failed.');
  check(allExpanded && allCollapsed && cardActionHeight >= 36 && detailVisible && detailCloseHeight >= 36 && detailEditHeight >= 36 && editVisible && modalTabHeight >= 44 && deleteVisible && deleteCancelHeight >= 36, 'A card or modal interaction failed.');
  check(table.visible && table.disclosure >= 36 && table.edit >= 36 && table.delete >= 36, 'The table action pass failed.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.modalOverflow === 0 && mobile.tabHeight >= 44 && removeFindingHeight >= 36, 'The phone-width form overflowed or used undersized controls.');
} catch (error) {
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
