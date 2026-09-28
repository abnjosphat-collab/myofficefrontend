import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(process.env.PPE_CDP_URL || 'http://127.0.0.1:9222', { timeout: 120_000 });
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

let failRecords = false;
let failStats = false;
let failEmployees = false;
let failMatrix = false;
const blockedWrites = [];
const responses = [];
const consoleErrors = [];
const orderListKey = 'oz_ppe_order_list';
let originalOrderList = null;
const backgroundResponses = new Map([
  ['/api/breakdowns/get-breakdowns', []],
  ['/api/breakdowns/dashboard/overview', {}],
  ['/api/maintenance/work-orders', []],
  ['/api/maintenance/work-orders/stats/summary', {}],
  ['/api/overtime', []],
  ['/api/tasks-events', []],
  ['/api/sheq', []],
  ['/api/employees', []],
  ['/api/equipment', []],
  ['/api/leaves', []],
  ['/api/notices', []],
]);

await page.route('**/api/**', async route => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (request.method() !== 'GET') {
    blockedWrites.push({ method: request.method(), pathname });
    await route.abort('blockedbyclient');
    return;
  }
  if (backgroundResponses.has(pathname)) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(backgroundResponses.get(pathname)),
    });
    return;
  }
  if (
    (failRecords && pathname === '/api/ppe') ||
    (failStats && pathname === '/api/ppe/stats/summary') ||
    (failEmployees && pathname === '/api/employees/') ||
    (failMatrix && pathname === '/api/ppe/matrix')
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
  if (['/api/ppe', '/api/ppe/stats/summary', '/api/employees/', '/api/ppe/matrix'].includes(pathname)) {
    responses.push({ pathname, status: response.status() });
  }
});
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const phase = message => fs.writeSync(2, `[ppe] ${message}\n`);
const height = async locator => Math.round((await locator.boundingBox()).height);
const setAppearance = async (design, theme) => {
  await page.evaluate(({ design, theme }) => {
    localStorage.setItem('myoffice_design', design);
    localStorage.setItem('myoffice_theme', theme);
  }, { design, theme });
};
const waitForText = async text => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 180_000 });
};
const waitForRefreshIdle = async () => {
  await page.waitForFunction(() => {
    const refresh = [...document.querySelectorAll('button')].find(button =>
      ['Refresh PPE records', 'Refresh'].includes(button.getAttribute('title') || '') ||
      button.getAttribute('aria-label') === 'Refresh PPE records');
    return Boolean(refresh && !refresh.disabled);
  }, undefined, { timeout: 360_000 });
};
const waitForRegisterSuccess = async () => {
  await page.waitForFunction(() => /\d+ PPE records total/.test(document.body.innerText), undefined, { timeout: 360_000 });
  await waitForRefreshIdle();
};
const retryUntilRecovered = async ({ label, endpoints, button, ready, attempts = 5 }) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const retryButton = button();
    await retryButton.waitFor({ state: 'visible', timeout: 360_000 });
    await page.waitForFunction(element => !element.disabled, await retryButton.elementHandle(), { timeout: 360_000 });
    phase(`${label}: retry ${attempt}/${attempts}`);
    const responsePromises = endpoints.map(endpoint => page.waitForResponse(response =>
      new URL(response.url()).pathname === endpoint && response.request().method() === 'GET',
    { timeout: 360_000 }));
    await retryButton.click();
    const endpointResponses = await Promise.all(responsePromises);
    const statuses = endpointResponses.map(response => response.status());
    phase(`${label}: ${statuses.join(', ')}`);
    if (statuses.every(status => status === 200)) {
      await ready();
      return statuses;
    }
    if (attempt < attempts) await page.waitForTimeout(30_000);
  }
  throw new Error(`${label} did not recover after ${attempts} free-tier retries.`);
};
const waitForRegister = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    phase(`live register: wait ${attempt + 1}/5`);
    try {
      await page.waitForFunction(() =>
        /\d+ PPE records total/.test(document.body.innerText) ||
        document.body.innerText.includes("Couldn't load PPE records"),
      undefined, { timeout: 360_000 });
    } catch { /* retry below */ }
    if (/\d+ PPE records total/.test(await page.locator('body').innerText())) {
      await waitForRefreshIdle();
      return;
    }
    if (attempt === 4) break;
    await page.waitForTimeout(30_000);
    const retry = page.getByRole('button', { name: 'Retry', exact: true });
    if (await retry.isVisible().catch(() => false)) {
      const response = page.waitForResponse(candidate =>
        new URL(candidate.url()).pathname === '/api/ppe' && candidate.request().method() === 'GET',
      { timeout: 360_000 });
      await retry.click();
      phase(`live register: retry returned ${(await response).status()}`);
      await page.waitForFunction(() => !document.body.innerText.includes("Couldn't load PPE records"), undefined, { timeout: 30_000 }).catch(() => {});
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    }
  }
  throw new Error('The live PPE register did not recover after five free-tier retries.');
};
const readLiveCounts = async () => {
  const text = await page.locator('main').last().innerText();
  const match = text.match(/(\d+) employees? · (\d+) PPE records total/);
  if (!match) throw new Error('Could not read live PPE employee and record counts.');
  return { employees: Number(match[1]), records: Number(match[2]) };
};
const bodyOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const mainOverflow = async () => page.locator('main').last().evaluate(element => element.scrollWidth - element.clientWidth);

try {
  phase('opening live Dallaglio register');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/ppe', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  originalOrderList = await page.evaluate(key => localStorage.getItem(key), orderListKey);
  await setAppearance('dallaglio', 'light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  const live = await readLiveCounts();

  phase('checking quiet register failure');
  failRecords = true;
  const quietFailureResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/ppe' && response.status() === 503,
  { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh PPE records' }).click();
  await quietFailureResponse;
  await waitForText('The PPE register could not be refreshed');
  const quietFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'The PPE register could not be refreshed' }).isVisible(),
    countsPreserved: JSON.stringify(await readLiveCounts()) === JSON.stringify(live),
    falseEmpty: await page.getByText('No PPE records yet', { exact: true }).count(),
  };

  failRecords = false;
  const [quietRetryStatus] = await retryUntilRecovered({
    label: 'quiet register recovery',
    endpoints: ['/api/ppe'],
    button: () => page.getByRole('alert').filter({ hasText: 'The PPE register could not be refreshed' }).getByRole('button', { name: 'Try again' }),
    ready: waitForRegisterSuccess,
  });

  phase('checking initial register failure');
  failRecords = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForText("Couldn't load PPE records");
  const initialText = await page.locator('main').last().innerText();
  const initialFailure = {
    errorVisible: await page.getByText("Couldn't load PPE records", { exact: true }).isVisible(),
    retryHeight: await height(page.getByRole('button', { name: 'Retry', exact: true })),
    falseEmpty: initialText.includes('No PPE records yet'),
    falseInvite: initialText.includes('Issue PPE to an employee to get started'),
    issueDisabled: await page.getByRole('button', { name: 'Issue PPE', exact: true }).isDisabled(),
  };

  failRecords = false;
  await retryUntilRecovered({
    label: 'initial register recovery',
    endpoints: ['/api/ppe'],
    button: () => page.getByRole('button', { name: 'Retry', exact: true }),
    ready: waitForRegisterSuccess,
  });

  phase('checking supporting-resource failures');
  failStats = true;
  failEmployees = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  await waitForText('PPE statistics are unavailable');
  const supportingFailure = {
    countsPreserved: JSON.stringify(await readLiveCounts()) === JSON.stringify(live),
    statsWarning: await page.getByText('PPE statistics are unavailable.', { exact: true }).isVisible(),
    employeeWarning: await page.getByText(/Personnel details are unavailable/).isVisible(),
    issueEnabled: !(await page.getByRole('button', { name: 'Issue PPE', exact: true }).isDisabled()),
  };

  failStats = false;
  failEmployees = false;
  const supportingRetryStatuses = await retryUntilRecovered({
    label: 'supporting-resource recovery',
    endpoints: ['/api/ppe/stats/summary', '/api/employees/'],
    button: () => page.getByRole('alert').filter({ hasText: 'PPE statistics are unavailable' }).getByRole('button', { name: 'Try again' }),
    ready: async () => {
      await waitForRefreshIdle();
      await page.getByText('PPE statistics are unavailable.', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 });
      await page.getByText(/Personnel details are unavailable/).waitFor({ state: 'hidden', timeout: 30_000 });
    },
  });

  phase('checking replacement-matrix failure');
  failMatrix = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  await page.getByRole('button', { name: 'Matrix', exact: true }).click();
  const matrixDialog = page.getByRole('dialog', { name: 'PPE Replacement Matrix' });
  await matrixDialog.getByText(/saved replacement matrix is unavailable/).waitFor({ state: 'visible', timeout: 30_000 });
  const matrixFailure = {
    alert: await matrixDialog.getByRole('alert').isVisible(),
    inputsDisabled: await matrixDialog.locator('input[type="number"]').evaluateAll(inputs => inputs.length > 0 && inputs.every(input => input.disabled)),
    recalculateAllDisabled: await matrixDialog.getByRole('button', { name: 'Recalculate all types' }).isDisabled(),
  };

  failMatrix = false;
  const [matrixRetryStatus] = await retryUntilRecovered({
    label: 'matrix recovery',
    endpoints: ['/api/ppe/matrix'],
    button: () => matrixDialog.getByRole('button', { name: 'Try again' }),
    ready: async () => matrixDialog.getByText(/saved replacement matrix is unavailable/).waitFor({ state: 'hidden', timeout: 30_000 }),
  });
  const matrixInput = matrixDialog.locator('input[type="number"]').first();
  const originalInterval = Number(await matrixInput.inputValue());
  const draftInterval = originalInterval === 120 ? 119 : originalInterval + 1;
  const writesBeforeDraft = blockedWrites.length;
  await matrixInput.fill(String(draftInterval));
  const matrixDraft = {
    noWriteOnTyping: blockedWrites.length === writesBeforeDraft,
    saveEnabled: !(await matrixDialog.getByRole('button', { name: 'Save', exact: true }).first().isDisabled()),
    recalculateDisabledWhileDirty: await matrixDialog.getByRole('button', { name: 'Recalculate', exact: true }).first().isDisabled(),
  };
  await matrixDialog.getByRole('button', { name: 'Close' }).click();

  phase('checking populated desktop interactions');
  const controls = {
    expandAll: await height(page.getByRole('button', { name: 'Expand all', exact: true })),
    matrix: await height(page.getByRole('button', { name: 'Matrix', exact: true })),
    refresh: await height(page.getByRole('button', { name: 'Refresh PPE records' })),
    allTab: await height(page.getByRole('tab', { name: /All Employees/ })),
    activeTab: await height(page.getByRole('tab', { name: /Has Active/ })),
    search: await height(page.getByLabel('Search employee')),
  };

  await page.getByRole('tab', { name: /Has Active/ }).click();
  await page.getByRole('tab', { name: /All Employees/ }).click();
  const firstEmployeeName = (await page.locator('h4').first().innerText()).trim();
  await page.getByLabel('Search employee').fill(firstEmployeeName);
  const searchedEmployee = page.getByRole('heading', { name: firstEmployeeName, exact: true }).first();
  await searchedEmployee.waitFor({ state: 'visible', timeout: 5_000 });
  const searchedEmployeeVisible = await searchedEmployee.isVisible();
  await page.getByLabel('Search employee').fill('');

  await page.getByRole('button', { name: 'Expand All', exact: true }).click();
  const expandAllWorked = await page.getByRole('button', { name: 'Collapse All', exact: true }).isVisible();
  await page.getByRole('button', { name: 'Collapse All', exact: true }).click();
  await page.waitForTimeout(750);
  const firstEmployeeCard = page.getByText(firstEmployeeName, { exact: true }).first().locator('xpath=ancestor::*[@data-ds="card"][1]');
  await firstEmployeeCard.scrollIntoViewIfNeeded();
  await firstEmployeeCard.getByRole('button', { name: 'Show details' }).first().click();
  await page.waitForTimeout(500);
  const firstRecordCard = firstEmployeeCard.locator('[data-ds="card"]').first();
  await firstRecordCard.locator('button[aria-label="Show details"]').click();
  const firstRecordView = firstRecordCard.getByRole('button', { name: 'View', exact: true });
  await firstRecordView.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await firstRecordView.click();
  const detailDialog = page.getByRole('dialog', { name: 'PPE Item Details' });
  const detailsVisible = await detailDialog.isVisible();
  const detailClose = detailDialog.locator('button[data-ds="button"]').filter({ hasText: 'Close' });
  const detailCloseHeight = await height(detailClose);
  await detailClose.click();

  await firstRecordCard.getByRole('button', { name: 'Edit', exact: true }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit PPE Record' });
  const editVisible = await editDialog.isVisible();
  await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await firstRecordCard.getByRole('button', { name: 'Delete', exact: true }).click();
  const deleteDialog = page.getByRole('alertdialog');
  const deleteVisible = await deleteDialog.isVisible();
  await page.waitForTimeout(300);
  const deleteCancelHeight = await height(deleteDialog.getByRole('button', { name: 'Cancel', exact: true }));
  await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Issue PPE', exact: true }).click();
  const issueDialog = page.getByRole('dialog', { name: 'Issue New PPE' });
  const issueVisible = await issueDialog.isVisible();
  await issueDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('tab', { name: /Overdue/ }).click();
  const overdueText = await page.locator('main').last().innerText();
  const overdueVisible = overdueText.includes('Overdue') && !overdueText.includes('No overdue items');
  const addToOrder = page.getByRole('button', { name: 'Add to order list' });
  let orderListAdded = false;
  for (let index = 0; index < await addToOrder.count(); index += 1) {
    const candidate = addToOrder.nth(index);
    if (await candidate.isVisible().catch(() => false) && await candidate.isEnabled().catch(() => false)) {
      await candidate.click();
      orderListAdded = await page.getByText('Order List', { exact: true }).isVisible();
      break;
    }
  }
  await page.evaluate(({ key, value }) => {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }, { key: orderListKey, value: originalOrderList });

  phase('checking Dallaglio dark at phone width');
  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance('dallaglio', 'dark');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  await page.getByRole('tab', { name: /Overdue/ }).click();
  const mobileBase = {
    bodyOverflow: await bodyOverflow(),
    mainOverflow: await mainOverflow(),
  };
  await page.getByRole('button', { name: 'Matrix', exact: true }).click();
  const mobileMatrix = page.getByRole('dialog', { name: 'PPE Replacement Matrix' });
  const mobile = {
    ...mobileBase,
    matrixOverflow: await mobileMatrix.evaluate(element => element.scrollWidth - element.clientWidth),
    matrixInputHeight: await height(mobileMatrix.locator('input[type="number"]').first()),
    matrixControlsContained: await mobileMatrix.locator('input[type="number"]').evaluateAll(inputs => inputs.every(input => {
      const row = input.parentElement?.parentElement;
      if (!row) return false;
      const rowRect = row.getBoundingClientRect();
      return [...row.querySelectorAll('input, button')].every(control => {
        const rect = control.getBoundingClientRect();
        return rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1;
      });
    })),
  };
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-ppe-dark-mobile.png'), fullPage: true });
  await mobileMatrix.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('tab', { name: /All Employees/ }).click();
  await page.getByRole('button', { name: 'Issue PPE', exact: true }).click();
  const mobileIssue = page.getByRole('dialog', { name: 'Issue New PPE' });
  mobile.issueOverflow = await mobileIssue.evaluate(element => element.scrollWidth - element.clientWidth);
  mobile.issueCancelHeight = await height(mobileIssue.getByRole('button', { name: 'Cancel', exact: true }));
  await mobileIssue.getByRole('button', { name: 'Cancel', exact: true }).click();

  phase('checking Classic smoke and restoring appearance');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setAppearance('classic', 'light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  const classicSmoke = {
    heading: await page.getByRole('heading', { name: 'PPE Management' }).isVisible(),
    counts: await readLiveCounts(),
    noOverflow: await bodyOverflow() === 0,
  };

  await setAppearance('dallaglio', 'light');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRegister();
  const restored = {
    counts: await readLiveCounts(),
    design: await page.evaluate(() => localStorage.getItem('myoffice_design')),
    theme: await page.evaluate(() => localStorage.getItem('myoffice_theme')),
    orderList: await page.evaluate(key => localStorage.getItem(key), orderListKey),
  };

  const evidence = {
    live,
    quietFailure,
    quietRetryStatus,
    initialFailure,
    supportingFailure,
    supportingRetryStatuses,
    matrixFailure,
    matrixRetryStatus,
    matrixDraft,
    controls,
    interactions: {
      searchedEmployeeVisible,
      expandAllWorked,
      detailsVisible,
      detailCloseHeight,
      editVisible,
      deleteVisible,
      deleteCancelHeight,
      issueVisible,
      overdueVisible,
      orderListAdded,
    },
    mobile,
    classicSmoke,
    blockedWrites,
    consoleErrors,
    responses: {
      total: responses.length,
      successful: responses.filter(response => response.status === 200).length,
      simulatedFailures: responses.filter(response => response.status === 503).length,
      paths: [...new Set(responses.map(response => response.pathname))],
    },
    restored,
  };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);

  check(live.records > 0 && live.employees > 0, 'The live PPE register did not contain populated data.');
  check(quietFailure.alert && quietFailure.countsPreserved && quietFailure.falseEmpty === 0 && quietRetryStatus === 200, 'Quiet register failure was not truthful or recoverable.');
  check(initialFailure.errorVisible && initialFailure.retryHeight >= 36 && !initialFailure.falseEmpty && !initialFailure.falseInvite && initialFailure.issueDisabled, 'Initial register failure state was misleading.');
  check(supportingFailure.countsPreserved && supportingFailure.statsWarning && supportingFailure.employeeWarning && supportingFailure.issueEnabled, 'Supporting-resource failures hid or disabled the usable register.');
  check(supportingRetryStatuses.every(status => status === 200), 'Supporting-resource retry did not recover.');
  check(matrixFailure.alert && matrixFailure.inputsDisabled && matrixFailure.recalculateAllDisabled && matrixRetryStatus === 200, 'Matrix failure state did not safely disable writes or recover.');
  check(matrixDraft.noWriteOnTyping && matrixDraft.saveEnabled && matrixDraft.recalculateDisabledWhileDirty, 'Dallaglio matrix editing still writes on input or permits stale recalculation.');
  check(Object.values(controls).every(value => value >= 36), 'A primary Dallaglio PPE control is below 36px.');
  check(searchedEmployeeVisible && expandAllWorked && detailsVisible && editVisible && deleteVisible && issueVisible && detailCloseHeight >= 36 && deleteCancelHeight >= 36, 'A key populated PPE interaction failed.');
  check(overdueVisible, 'The populated overdue workflow was not rendered.');
  check(mobile.bodyOverflow === 0 && mobile.mainOverflow === 0 && mobile.matrixOverflow === 0 && mobile.issueOverflow === 0 && mobile.matrixControlsContained, 'A phone-width PPE surface overflowed or clipped controls horizontally.');
  check(mobile.matrixInputHeight >= 36 && mobile.issueCancelHeight >= 36, 'A phone-width PPE control is below 36px.');
  check(classicSmoke.heading && classicSmoke.counts.records === live.records && classicSmoke.noOverflow, 'Classic PPE smoke check failed.');
  check(restored.counts.records === live.records && restored.design === 'dallaglio' && restored.theme === 'light' && restored.orderList === originalOrderList, 'The live browser was not restored exactly.');
} catch (error) {
  if (originalOrderList !== null || page) {
    await page.evaluate(({ key, value }) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }, { key: orderListKey, value: originalOrderList }).catch(() => {});
  }
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
process.exit(0);
