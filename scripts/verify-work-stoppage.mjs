import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

let simulateFailure = true;
const blockedWrites = [];
const workResponses = [];

await page.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() !== 'GET') {
    blockedWrites.push({ method: request.method(), url: request.url() });
    await route.abort('blockedbyclient');
    return;
  }
  if (simulateFailure && url.pathname === '/api/work-stoppage/') {
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
  const url = new URL(response.url());
  if (url.pathname === '/api/work-stoppage/' && response.request().method() === 'GET') {
    workResponses.push(response.status());
  }
});

const height = async locator => Math.round((await locator.boundingBox()).height);

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/work_stoppage', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });

  const alert = page.getByRole('alert').filter({ hasText: 'Could not load work stoppages' });
  await alert.waitFor({ state: 'visible', timeout: 30_000 });
  const failure = {
    alert: await alert.isVisible(),
    message: await alert.innerText(),
    retryButtons: await page.getByRole('button', { name: 'Try again' }).count(),
    falseEmptyState: await page.getByText('No work stoppages issued', { exact: true }).count(),
    unavailableStats: (await page.locator('main').last().innerText()).includes('—'),
  };

  simulateFailure = false;
  let liveStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const responsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/api/work-stoppage/' && response.request().method() === 'GET';
    }, { timeout: 130_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Try again' }).click();
    const response = await responsePromise;
    liveStatus = response?.status() ?? 0;
    if (liveStatus === 200) break;
    await page.waitForTimeout(10_000);
    if (!(await page.getByRole('button', { name: 'Try again' }).count())) break;
  }
  if (liveStatus !== 200) throw new Error(`Live work-stoppage GET did not recover; last status ${liveStatus}`);
  await page.waitForFunction(() => !document.body.innerText.includes('Could not load work stoppages'), null, { timeout: 30_000 });

  const reportDisclosure = page.getByRole('button', { name: /work stoppage details/i }).first();
  await reportDisclosure.waitFor({ state: 'visible', timeout: 30_000 });
  const search = page.getByPlaceholder('Search by department, description, issued by…');
  const controls = {
    searchWidth: Math.round((await search.boundingBox()).width),
    sectionHeight: await height(page.locator('button[title="Section"]')),
    statusHeight: await height(page.locator('button[title="Status"]')),
    fromDateHeight: await height(page.locator('input[title="From date"]')),
    refreshHeight: await height(page.getByRole('button', { name: 'Refresh' })),
    expandAllHeight: await height(page.getByRole('button', { name: 'Expand all' })),
    collapseAllHeight: await height(page.getByRole('button', { name: 'Collapse all' })),
    gridHeight: await height(page.getByRole('button', { name: 'Grid view' })),
    disclosureHeight: await height(reportDisclosure),
  };

  await reportDisclosure.click();
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  await page.getByText('Close', { exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const editDialogVisible = await page.getByRole('dialog').isVisible().catch(() => false);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  const deleteDialogVisible = await page.getByText('Delete this work stoppage report?', { exact: true }).isVisible().catch(() => false);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'List view' }).click();
  await page.locator('table').waitFor({ state: 'visible' });
  const listRows = await page.locator('tbody > tr').count();
  await page.getByRole('button', { name: /report details/i }).first().click();
  const listExpandedRows = await page.locator('tbody > tr').count();
  await page.getByRole('button', { name: 'Grid view' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('myoffice_theme', 'dark'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /work stoppage details/i }).first().waitFor({ state: 'visible', timeout: 130_000 });
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    design: document.documentElement.dataset.design,
    theme: document.documentElement.dataset.theme,
  }));
  await page.screenshot({ path: path.join(process.env.TEMP, 'myoffice-work-stoppage-dallaglio-dark-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'classic');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('button[title="Expand"]').first().waitFor({ state: 'visible', timeout: 130_000 });
  const classic = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    design: document.documentElement.dataset.design,
    theme: document.documentElement.dataset.theme,
    bodyHasRecords: !document.body.innerText.includes('No work stoppages issued'),
  }));
  await page.screenshot({ path: path.join(process.env.TEMP, 'myoffice-work-stoppage-classic-light.png'), fullPage: true });

  await page.evaluate(() => {
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /work stoppage details/i }).first().waitFor({ state: 'visible', timeout: 130_000 });
  const restored = await page.evaluate(() => ({
    design: document.documentElement.dataset.design,
    theme: document.documentElement.dataset.theme,
  }));

  console.log(JSON.stringify({
    failure,
    liveStatus,
    workResponses,
    controls,
    editDialogVisible,
    deleteDialogVisible,
    listRows,
    listExpandedRows,
    mobile,
    classic,
    restored,
    blockedWrites: blockedWrites.length,
  }, null, 2));
} finally {
  await page.unroute('**/api/**');
}

process.exit(0);
