import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const endpoint = '/api/safety-complaints/';
const fixture = {
  id: 'audit-read-only-complaint',
  date: '2026-09-27',
  raisedBy: 'Audit Observer',
  issueRaised: 'Read-only audit fixture: missing machine guard',
  category: 'Safety',
  priority: 'high',
  section: 'Mechanical',
  location: 'Workshop',
  actionPlan: 'Isolate equipment and replace the guard',
  byWho: 'Maintenance Foreman',
  byWhen: '2026-09-28',
  supervisorName: 'Shift Supervisor',
  supervisorSignature: 'S.S.',
  dateClosed: null,
  status: 'open',
  submittedAt: '2026-09-27T09:00:00Z',
};

let responseMode = 'live';
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
  if (pathname === endpoint && responseMode === 'failure') {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Service unavailable while Supabase wakes up' }) });
    return;
  }
  if (pathname === endpoint && responseMode === 'fixture') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fixture]) });
    return;
  }
  await route.continue();
});

page.on('response', response => {
  if (new URL(response.url()).pathname === endpoint && response.request().method() === 'GET') {
    responses.push({ status: response.status(), mode: responseMode });
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
const waitForLiveEmpty = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForFunction(() =>
      document.body.innerText.includes('No safety complaints have been logged yet.') ||
      document.body.innerText.includes('Could not load safety complaints'),
    undefined, { timeout: 180_000 });
    if (await page.getByText('No safety complaints have been logged yet.', { exact: true }).count()) return;
    if (attempt === 4) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    else await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  }
  throw new Error('The live safety complaints register did not recover after five free-tier retries.');
};
const waitForFixture = async () => {
  await page.getByText(fixture.issueRaised, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};
const selectOption = async (title, label) => {
  await page.locator(`button[title="${title}"]`).click();
  const listbox = page.getByRole('listbox').last();
  await listbox.waitFor({ state: 'visible', timeout: 5_000 });
  await listbox.getByRole('option', { name: label, exact: true }).click();
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/safety_complaints', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLiveEmpty();
  const liveEmpty = {
    emptyMessage: await page.getByText('No safety complaints have been logged yet.', { exact: true }).isVisible(),
    firstAction: await page.getByRole('button', { name: 'Log First Complaint' }).isVisible(),
    totalText: await page.locator('main').last().innerText(),
  };

  responseMode = 'fixture';
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForFixture();

  responseMode = 'failure';
  const failedRefresh = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.status() === 503, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await failedRefresh;
  await page.getByText('Could not load safety complaints', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load safety complaints' }).isVisible(),
    recordPreserved: await page.getByText(fixture.issueRaised, { exact: true }).isVisible(),
    falseEmpty: await page.getByText('No safety complaints have been logged yet.', { exact: true }).count(),
  };

  responseMode = 'fixture';
  await page.getByRole('button', { name: 'Try again' }).click();
  await waitForFixture();

  responseMode = 'failure';
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Could not load safety complaints', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const failureText = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load safety complaints' }).isVisible(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmpty: failureText.includes('No safety complaints have been logged yet.'),
    unavailableStats: failureText.includes('—'),
    newDisabled: await page.getByRole('button', { name: 'New Complaint' }).isDisabled(),
  };

  responseMode = 'fixture';
  const retry = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.status() === 200, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const retryStatus = (await retry).status();
  await waitForFixture();

  const controls = {
    refresh: await height(page.getByRole('button', { name: 'Refresh' })),
    recordsTab: await height(page.getByRole('tab', { name: 'Records' })),
    analyticsTab: await height(page.getByRole('tab', { name: 'Analytics' })),
    status: await height(page.locator('button[title="Status"]')),
    section: await height(page.locator('button[title="Section"]')),
    priority: await height(page.locator('button[title="Priority"]')),
    category: await height(page.locator('button[title="Category"]')),
    fromDate: await height(page.getByLabel('From date')),
    disclosure: await height(page.getByRole('button', { name: 'Show complaint details' })),
    edit: await height(page.getByRole('button', { name: 'Edit', exact: true })),
    delete: await height(page.getByRole('button', { name: 'Delete', exact: true })),
  };

  const search = page.getByPlaceholder('Search complaints…');
  await search.fill('missing machine guard');
  const searchMatched = await page.getByText(fixture.issueRaised, { exact: true }).count() === 1;
  await search.fill('');
  await selectOption('Status', 'open');
  const statusMatched = await page.getByText(fixture.issueRaised, { exact: true }).count() === 1;
  await selectOption('Section', 'Mechanical');
  await selectOption('Priority', 'high');
  await selectOption('Category', 'Safety');
  await selectOption('Responsible', 'Maintenance Foreman');
  await selectOption('Location', 'Workshop');
  await page.getByLabel('From date').fill('2026-09-01');
  await page.getByLabel('To date').fill('2026-09-30');
  const allFiltersMatched = await page.getByText(fixture.issueRaised, { exact: true }).count() === 1;
  const clearHeight = await height(page.getByRole('button', { name: 'Clear' }));
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'Show complaint details' }).click();
  const expanded = await page.getByRole('button', { name: 'Hide complaint details' }).isVisible();
  await page.getByText(fixture.issueRaised, { exact: true }).first().click();
  const detailVisible = await page.getByText('Complaint Detail', { exact: true }).isVisible();
  const detailClose = page.getByRole('button', { name: 'Close', exact: true }).last();
  const detailCloseHeight = await height(detailClose);
  const detailEditHeight = await height(page.getByRole('button', { name: 'Edit', exact: true }));
  await detailClose.click();

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editVisible = await page.getByText('Edit Complaint', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const deleteVisible = await page.getByText('Delete this complaint?', { exact: true }).isVisible();
  await page.waitForTimeout(500);
  const deleteCancelHeight = await height(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('tab', { name: 'Analytics' }).click();
  const analyticsVisible = await page.getByText('Overall Closure Rate', { exact: true }).isVisible();
  await page.getByRole('tab', { name: 'Records' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForFixture();
  const mobileBefore = {
    bodyOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth),
  };
  await page.getByRole('button', { name: 'New Complaint' }).click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog');
  const mobile = {
    ...mobileBefore,
    modalOverflow: await dialog.evaluate(element => element.scrollWidth - element.clientWidth),
    cancelHeight: await height(page.getByRole('button', { name: 'Cancel', exact: true })),
  };
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-safety-complaints-dark-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  responseMode = 'live';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForLiveEmpty();

  const evidence = {
    liveEmpty: { emptyMessage: liveEmpty.emptyMessage, firstAction: liveEmpty.firstAction, zeroRecords: liveEmpty.totalText.includes('0 of 0') },
    staleFailure,
    initialFailure,
    retryStatus,
    controls,
    filters: { searchMatched, statusMatched, allFiltersMatched, clearHeight },
    interactions: { expanded, detailVisible, detailCloseHeight, detailEditHeight, editVisible, deleteVisible, deleteCancelHeight, analyticsVisible },
    mobile,
    blockedWrites,
    responses,
    restored: { responseMode, design: 'dallaglio', theme: 'light', liveEmpty: true },
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(liveEmpty.emptyMessage && liveEmpty.firstAction && liveEmpty.totalText.includes('0 of 0'), 'The live empty register did not render truthfully.');
  check(staleFailure.alert && staleFailure.recordPreserved && staleFailure.falseEmpty === 0, 'Quiet failure did not preserve the complaint fixture.');
  check(initialFailure.alert && initialFailure.retryButtons === 1 && !initialFailure.falseEmpty && initialFailure.unavailableStats && initialFailure.newDisabled, 'Initial complaint failure state is misleading.');
  check(retryStatus === 200, 'The complaint retry did not recover.');
  check(Object.entries(controls).every(([key, value]) => key.endsWith('Tab') ? value >= 44 : value >= 36), 'A Dallaglio complaint control has the wrong height.');
  check(searchMatched && statusMatched && allFiltersMatched && clearHeight >= 36, 'A complaint filter failed.');
  check(expanded && detailVisible && detailCloseHeight >= 36 && detailEditHeight >= 36 && editVisible && deleteVisible && deleteCancelHeight >= 36 && analyticsVisible, 'A complaint interaction failed.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.modalOverflow === 0 && mobile.cancelHeight >= 36, 'The phone-width complaint page or form overflowed.');
} catch (error) {
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
