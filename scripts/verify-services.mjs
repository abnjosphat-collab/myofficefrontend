import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

let ownsBrowser = false;
let browser;
try {
  browser = await chromium.connectOverCDP(process.env.SERVICES_CDP_URL || 'http://127.0.0.1:9223', { timeout: 10_000 });
} catch {
  browser = await chromium.launch({ headless: true });
  ownsBrowser = true;
}
const context = browser.contexts()[0] || await browser.newContext();
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const env = Object.fromEntries(fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const projectRef = supabaseUrl.hostname.split('.')[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const user = { id: '00000000-0000-4000-8000-000000000003', aud: 'authenticated', role: 'authenticated', email: 'services-audit@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Services Audit' }, created_at: new Date().toISOString() };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ aud: 'authenticated', exp: now + 3600, iat: now, sub: user.id, email: user.email, role: 'authenticated', aal: 'aal1' })}.fixture`;
const session = { access_token: token, refresh_token: 'fixture-refresh-token', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };
const service = {
  id: 'service-audit-1', created_at: '2026-09-28T08:00:00Z', date: '2026-09-28',
  description: 'Audit pump alignment service', supplier: 'Audit Engineering', contact_person: 'Tariro Moyo',
  requisition_number: 'REQ-001', invoice_number: 'INV-001', order_number: 'PO-001', amount: 'USD 1,250',
  category: 'Maintenance', general_comments: 'Read-only verification fixture', planning_signed: true,
  planning_signed_by: 'Audit Planner', planning_signed_date: '2026-09-28', planning_comments: 'Planned',
  eng_mgr_signed: false, eng_mgr_signed_by: '', eng_mgr_signed_date: null, eng_mgr_comments: '',
  finance_signed: false, finance_signed_by: '', finance_signed_date: null, finance_comments: '',
  gm_signed: false, gm_signed_by: '', gm_signed_date: null, gm_comments: '', stores_signed: false,
  stores_signed_by: '', stores_signed_date: null, stores_comments: '', stores_grv_number: '', payment_done: false,
  payment_paid_by: '', payment_date: null, payment_reference: '', payment_comments: '',
};
let failServices = false;
const blockedWrites = [];
const responses = [];
const consoleErrors = [];

await page.route(`${supabaseUrl.origin}/**`, async route => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname === '/rest/v1/user_profiles') {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([{ id: user.id, email: user.email, full_name: 'Services Audit', avatar_url: null, role: 'admin', is_active: true, created_at: user.created_at }]) });
    return;
  }
  if (pathname === '/auth/v1/user') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.route('**/api/**', async route => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (request.method() !== 'GET') {
    blockedWrites.push({ method: request.method(), pathname });
    await route.abort('blockedbyclient');
    return;
  }
  if (pathname === '/api/services') {
    const status = failServices ? 503 : 200;
    responses.push({ pathname, status });
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(failServices ? { detail: 'Service unavailable while Supabase wakes up' } : [service]) });
    return;
  }
  if (pathname === '/api/services/service-audit-1/attachments') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

const check = (condition, message) => { if (!condition) throw new Error(message); };
const waitText = text => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60_000 });
const overflow = locator => locator.evaluate(element => element.scrollWidth - element.clientWidth);

try {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const original = await page.evaluate(key => ({ auth: localStorage.getItem(key), design: localStorage.getItem('myoffice_design'), theme: localStorage.getItem('myoffice_theme'), preferencesSeen: localStorage.getItem('oz_prefsSeen') }), authStorageKey);
  const restore = () => page.evaluate(({ key, values }) => {
    for (const [storageKey, value] of Object.entries({ [key]: values.auth, myoffice_design: values.design, myoffice_theme: values.theme, oz_prefsSeen: values.preferencesSeen })) {
      if (value === null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, value);
    }
  }, { key: authStorageKey, values: original });
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
    localStorage.setItem('oz_prefsSeen', '1');
  }, { key: authStorageKey, value: session });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/services', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit pump alignment service');
  const desktopLight = { recordVisible: true, documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), mainOverflow: await overflow(page.locator('main').last()) };

  await page.getByRole('button', { name: 'Pipeline & Attachments', exact: true }).click();
  await waitText('Audit Planner');
  const pipelineVisible = (await page.locator('body').innerText()).includes('Audit Planner');
  await page.getByRole('button', { name: 'attachments', exact: true }).click();
  await waitText('No attachments yet');
  const attachmentsVisible = await page.getByText('No attachments yet', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Table view' }).click();
  await waitText('Audit pump alignment service');
  await page.getByRole('button', { name: /Sheet view/ }).click();
  await waitText('Audit pump alignment service');
  await page.getByRole('button', { name: 'Grid view' }).click();

  failServices = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await waitText('Services may be out of date');
  const quietFailure = { warning: true, recordPreserved: await page.getByText('Audit pump alignment service', { exact: true }).first().isVisible(), falseEmpty: (await page.locator('body').innerText()).includes('No service records yet') };
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Services register unavailable');
  const initialFailure = {
    unavailable: (await page.locator('body').innerText()).includes('Records unavailable'),
    falseEmpty: (await page.locator('body').innerText()).includes('No service records yet'),
    newDisabled: await page.getByRole('button', { name: 'New Service', exact: true }).isDisabled(),
    importDisabled: await page.getByRole('button', { name: 'Import', exact: true }).isDisabled(),
    scanDisabled: await page.getByRole('button', { name: 'Scan', exact: true }).isDisabled(),
  };
  failServices = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await waitText('Audit pump alignment service');

  await page.evaluate(() => localStorage.setItem('myoffice_theme', 'dark'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit pump alignment service');
  const mobileDark = { documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), mainOverflow: await overflow(page.locator('main').last()) };
  await page.getByRole('button', { name: 'New Service', exact: true }).click();
  let dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  mobileDark.newDialogOverflow = await overflow(dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByTitle('Edit record').first().click();
  dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  mobileDark.editDialogOverflow = await overflow(dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-services-dark-mobile.png'), fullPage: true });

  await restore();
  const evidence = { desktopLight, pipelineVisible, attachmentsVisible, quietFailure, initialFailure, mobileDark, blockedWrites, consoleErrors, responses };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);
  check(desktopLight.recordVisible && desktopLight.documentOverflow === 0 && desktopLight.mainOverflow === 0, 'Desktop services verification failed.');
  check(pipelineVisible && attachmentsVisible, 'Pipeline or attachments did not render.');
  check(quietFailure.warning && quietFailure.recordPreserved && !quietFailure.falseEmpty, 'Quiet services failure was misleading.');
  check(initialFailure.unavailable && !initialFailure.falseEmpty && initialFailure.newDisabled && initialFailure.importDisabled && initialFailure.scanDisabled, 'Initial services failure was unsafe.');
  check(Object.values(mobileDark).every(value => value === 0), 'Services overflowed at 390px.');
  if (ownsBrowser) await browser.close();
} catch (error) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\nURL: ${page.url()}\nBODY:\n${body.slice(0, 5000)}\n`);
  if (ownsBrowser) await browser.close().catch(() => {});
  process.exit(1);
}
process.exit(0);
