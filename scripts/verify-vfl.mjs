import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

let simulateFailure = false;
const blockedWrites = [];
const vflResponses = [];

await page.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() !== 'GET') {
    blockedWrites.push({ method: request.method(), url: request.url() });
    await route.abort('blockedbyclient');
    return;
  }
  if (simulateFailure && url.pathname === '/api/vfl/') {
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
  if (new URL(response.url()).pathname === '/api/vfl/' && response.request().method() === 'GET') {
    vflResponses.push(response.status());
  }
});

const record = () => page.getByText('VFL #1', { exact: true });
const waitForRecord = () => record().waitFor({ state: 'visible', timeout: 180_000 });
const height = async locator => Math.round((await locator.boundingBox()).height);
const selectOption = async (title, label) => {
  await page.locator(`button[title="${title}"]`).click();
  const option = page.getByRole('option', { name: label, exact: true });
  if (await option.count()) await option.click();
  else await page.getByText(label, { exact: true }).last().click();
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/vfl', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecord();

  simulateFailure = true;
  const failedRefreshResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/vfl/' && response.status() === 503, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await failedRefreshResponse;
  const staleFailure = {
    alert: await page.getByRole('alert').filter({ hasText: 'Could not load VFL reports' }).isVisible(),
    recordPreserved: await record().isVisible(),
    falseEmpty: await page.getByText('No VFL observations found', { exact: true }).count(),
  };

  simulateFailure = false;
  const staleRetryResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/vfl/' && response.request().method() === 'GET', { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const staleRetryStatus = (await staleRetryResponse).status();
  await waitForRecord();

  simulateFailure = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  const alert = page.getByRole('alert').filter({ hasText: 'Could not load VFL reports' });
  await alert.waitFor({ state: 'visible', timeout: 30_000 });
  const failureText = await page.locator('main').last().innerText();
  const initialFailure = {
    alert: await alert.isVisible(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmpty: await page.getByText('No VFL observations found', { exact: true }).count(),
    unavailableStats: failureText.includes('—'),
    newDisabled: await page.getByRole('button', { name: 'New VFL' }).isDisabled(),
  };

  simulateFailure = false;
  const retryResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/vfl/' && response.request().method() === 'GET', { timeout: 180_000 });
  await page.getByRole('button', { name: 'Try again' }).click();
  const retryStatus = (await retryResponse).status();
  await waitForRecord();

  const search = page.getByPlaceholder('Search by observer, description, actions...');
  const controls = {
    searchWidth: Math.round((await search.boundingBox()).width),
    sectionHeight: await height(page.locator('button[title="Section"]')),
    statusHeight: await height(page.locator('button[title="Status"]')),
    behaviourHeight: await height(page.locator('button[title="Behaviour"]')),
    dateHeight: await height(page.locator('input[title="From date"]')),
    refreshHeight: await height(page.getByRole('button', { name: 'Refresh' })),
    viewSegmentHeight: await height(page.getByRole('button', { name: 'Grid view' })),
    cardActionHeight: await height(page.getByRole('button', { name: 'View', exact: true }).first()),
  };

  await search.fill('hv');
  await selectOption('Section', 'Mechanical');
  await selectOption('Status', 'Submitted');
  await selectOption('Behaviour', 'Safe');
  await page.locator('input[title="From date"]').fill('2026-03-07');
  await page.locator('input[title="To date"]').fill('2026-03-07');
  const filteredCount = (await page.locator('main').last().innerText()).includes('1 of 1');
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  const detailVisible = await page.getByText('Visible Felt Leadership Observation', { exact: true }).isVisible();
  const detailStatusHeight = await height(page.locator('button[title="Change status"]'));
  const detailEditHeight = await height(page.getByRole('button', { name: 'Edit', exact: true }));
  await page.getByText('Close', { exact: true }).click();

  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const editVisible = await page.getByText('Edit VFL Observation', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  const deleteVisible = await page.getByText('Confirm Deletion', { exact: true }).isVisible();
  const deleteCancelHeight = await height(page.getByRole('button', { name: 'Cancel', exact: true }));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Table view' }).click();
  await page.locator('table').waitFor({ state: 'visible' });
  const table = {
    visible: await page.locator('table').isVisible(),
    editHeight: await height(page.getByRole('button', { name: /Edit VFL observation/ })),
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('myoffice_theme', 'dark'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecord();
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    design: document.documentElement.dataset.design,
    theme: document.documentElement.dataset.theme,
  }));
  await page.screenshot({ path: path.join(process.env.TEMP, 'myoffice-vfl-dallaglio-dark-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'classic');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecord();
  const classic = {
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    filterHeight: await height(page.locator('button[title="Section"]')),
    cardActionHeight: await height(page.getByRole('button', { name: 'View', exact: true }).first()),
    recordVisible: await record().isVisible(),
  };

  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForRecord();
  const restored = await page.evaluate(() => ({
    design: document.documentElement.dataset.design,
    theme: document.documentElement.dataset.theme,
  }));

  console.log(JSON.stringify({
    staleFailure,
    staleRetryStatus,
    initialFailure,
    retryStatus,
    controls,
    filteredCount,
    detailVisible,
    detailStatusHeight,
    detailEditHeight,
    editVisible,
    deleteVisible,
    deleteCancelHeight,
    table,
    mobile,
    classic,
    restored,
    vflResponses,
    blockedWrites: blockedWrites.length,
  }, null, 2));
} finally {
  await page.unroute('**/api/**');
}

process.exit(0);
