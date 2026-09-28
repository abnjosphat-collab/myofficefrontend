import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

let ownsBrowser = false;
let browser;
try {
  browser = await chromium.connectOverCDP(process.env.MAINTENANCE_CDP_URL || 'http://127.0.0.1:9223', { timeout: 10_000 });
} catch {
  browser = await chromium.launch({ headless: true });
  ownsBrowser = true;
}

const context = browser.contexts()[0] || await browser.newContext();
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const env = Object.fromEntries(fs.readFileSync(path.resolve('.env.local'), 'utf8')
  .split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const projectRef = supabaseUrl.hostname.split('.')[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const testUser = {
  id: '00000000-0000-4000-8000-000000000002',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'maintenance-audit@example.invalid',
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Maintenance Audit' },
  created_at: new Date().toISOString(),
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ aud: 'authenticated', exp: now + 3600, iat: now, sub: testUser.id, email: testUser.email, role: 'authenticated', aal: 'aal1' })}.fixture`;
const session = { access_token: accessToken, refresh_token: 'fixture-refresh-token', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user: testUser };

const workOrder = {
  id: 'wo-audit-1', work_order_number: 'WO-AUDIT-001', equipment_info: 'Audit pump A',
  to_department: 'Engineering', to_section: 'Mechanical', from_department: '', from_section: '',
  date_raised: '2026-09-20', time_raised: '08:00', account_number: '', user_lab_today: '',
  job_type: { operational: false, maintenance: true, mining: false }, job_request_details: 'Inspect pump seal',
  requested_by: 'Audit Requester', authorising_foreman: 'Audit Foreman', authorising_engineer: '',
  allocated_to: 'Audit Artisan', estimated_hours: '4', responsible_foreman: 'Audit Foreman', job_instructions: '',
  manpower: [], work_done_details: '', cause_of_failure: '', delay_details: '', artisan_name: '', artisan_sign: '',
  artisan_date: '', foreman_name: '', foreman_sign: '', foreman_date: '', time_work_started: '', time_work_finished: '',
  total_time_worked: '', overtime_start_time: '', overtime_end_time: '', overtime_hours: '', delay_from_time: '',
  delay_to_time: '', total_delay_hours: '', status: 'pending', priority: 'high', progress: 25,
  due_date: '2026-10-02', created_at: '2026-09-20T08:00:00Z', updated_at: '2026-09-20T08:00:00Z',
  classification: 'planned_maintenance', discipline: 'Mechanical', trade: 'Fitter', spares_used: [],
};
const schedule = {
  id: 'schedule-audit-1', name: 'Weekly pump inspection', equipment_info: 'Audit pump A',
  to_department: 'Engineering', allocated_to: 'Audit Artisan', authorising_foreman: 'Audit Foreman',
  estimated_hours: '2', job_request_details: 'Inspect pump condition', job_instructions: '', priority: 'medium',
  recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [],
  advance_days: 1, active: true, next_due_date: '2026-10-05', last_generated: '', created_at: '2026-09-20T08:00:00Z',
};

let failWorkOrders = false;
let failSchedules = false;
const blockedWrites = [];
const responses = [];
const consoleErrors = [];

await page.route(`${supabaseUrl.origin}/**`, async route => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname === '/rest/v1/user_profiles') {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([{ id: testUser.id, email: testUser.email, full_name: 'Maintenance Audit', avatar_url: null, role: 'admin', is_active: true, created_at: testUser.created_at }]) });
    return;
  }
  if (pathname === '/auth/v1/user') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(testUser) });
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
  if (pathname === '/api/maintenance/work-orders') {
    const status = failWorkOrders ? 503 : 200;
    responses.push({ pathname, status });
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(failWorkOrders ? { detail: 'Service unavailable while Supabase wakes up' } : [workOrder]) });
    return;
  }
  if (pathname === '/api/schedules') {
    const status = failSchedules ? 503 : 200;
    responses.push({ pathname, status });
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(failSchedules ? { detail: 'Schedule service unavailable' } : [schedule]) });
    return;
  }
  const fallback = pathname.endsWith('/stats/summary') ? {} : [];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fallback) });
});

page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

const check = (condition, message) => { if (!condition) throw new Error(message); };
const waitText = text => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60_000 });
const overflow = locator => locator.evaluate(element => element.scrollWidth - element.clientWidth);
const setAppearance = theme => page.evaluate(value => {
  localStorage.setItem('myoffice_design', 'dallaglio');
  localStorage.setItem('myoffice_theme', value);
}, theme);

try {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const original = await page.evaluate(key => ({
    auth: localStorage.getItem(key),
    design: localStorage.getItem('myoffice_design'),
    theme: localStorage.getItem('myoffice_theme'),
    preferencesSeen: localStorage.getItem('oz_prefsSeen'),
    workOrdersRescued: localStorage.getItem('maint_local_fields_uploaded_v1'),
    schedulesRescued: localStorage.getItem('maint_schedules_uploaded_v1'),
  }), authStorageKey);
  const restore = () => page.evaluate(({ key, values }) => {
    const entries = {
      [key]: values.auth,
      myoffice_design: values.design,
      myoffice_theme: values.theme,
      oz_prefsSeen: values.preferencesSeen,
      maint_local_fields_uploaded_v1: values.workOrdersRescued,
      maint_schedules_uploaded_v1: values.schedulesRescued,
    };
    for (const [storageKey, value] of Object.entries(entries)) {
      if (value === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, value);
    }
  }, { key: authStorageKey, values: original });

  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('myoffice_design', 'dallaglio');
    localStorage.setItem('myoffice_theme', 'light');
    localStorage.setItem('oz_prefsSeen', '1');
    localStorage.setItem('maint_local_fields_uploaded_v1', 'verified');
    localStorage.setItem('maint_schedules_uploaded_v1', 'verified');
  }, { key: authStorageKey, value: session });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/maintenance', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit pump A');
  const desktopLight = {
    workOrderVisible: await page.getByText('Audit pump A', { exact: true }).first().isVisible(),
    documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await overflow(page.locator('main').last()),
  };

  await page.getByRole('tab', { name: 'Schedules' }).click();
  await waitText('Weekly pump inspection');
  const scheduleVisible = await page.getByText('Weekly pump inspection', { exact: true }).isVisible();
  await page.getByRole('tab', { name: 'Analytics' }).click();
  await waitText('Completion');
  const analyticsVisible = await page.getByText('Completion', { exact: true }).isVisible();
  await page.getByRole('tab', { name: /Work orders/ }).click();

  failWorkOrders = true;
  await page.getByRole('button', { name: 'Refresh work orders' }).click();
  await waitText('Work orders may be out of date');
  const quietFailure = {
    warning: true,
    recordPreserved: await page.getByText('Audit pump A', { exact: true }).first().isVisible(),
    falseEmpty: (await page.locator('body').innerText()).includes('No work orders yet'),
  };

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Could not load work orders');
  const initialFailure = {
    unavailable: (await page.locator('body').innerText()).includes('Work orders unavailable'),
    falseEmpty: (await page.locator('body').innerText()).includes('No work orders yet'),
    createDisabled: await page.getByRole('button', { name: 'New work order', exact: true }).isDisabled(),
  };
  failWorkOrders = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await waitText('Audit pump A');

  failSchedules = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit pump A');
  await page.getByRole('tab', { name: 'Schedules' }).click();
  await waitText('Could not load schedules');
  const scheduleFailure = {
    unavailable: (await page.locator('body').innerText()).includes('Schedules unavailable'),
    falseEmpty: (await page.locator('body').innerText()).includes('No recurring schedules yet'),
    createDisabled: await page.getByRole('button', { name: 'New schedule', exact: true }).isDisabled(),
  };
  failSchedules = false;

  await setAppearance('dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit pump A');
  const mobileDark = {
    documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mainOverflow: await overflow(page.locator('main').last()),
  };
  await page.getByRole('button', { name: 'New work order', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  mobileDark.dialogOverflow = await overflow(dialog);
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-maintenance-dark-mobile.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await restore();
  const evidence = { desktopLight, scheduleVisible, analyticsVisible, quietFailure, initialFailure, scheduleFailure, mobileDark, blockedWrites, consoleErrors, responses };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);
  check(desktopLight.workOrderVisible && desktopLight.documentOverflow === 0 && desktopLight.mainOverflow === 0, 'Desktop light verification failed.');
  check(scheduleVisible && analyticsVisible, 'Schedules or analytics did not render.');
  check(quietFailure.warning && quietFailure.recordPreserved && !quietFailure.falseEmpty, 'Quiet failure discarded or misrepresented loaded work orders.');
  check(initialFailure.unavailable && !initialFailure.falseEmpty && initialFailure.createDisabled, 'Initial work-order failure was unsafe.');
  check(scheduleFailure.unavailable && !scheduleFailure.falseEmpty && scheduleFailure.createDisabled, 'Initial schedule failure was unsafe.');
  check(Object.values(mobileDark).every(value => value === 0), 'Maintenance overflowed at 390px.');
  if (ownsBrowser) await browser.close();
} catch (error) {
  const debug = page ? await page.locator('body').innerText().catch(() => '') : '';
  const currentUrl = page?.url() || '';
  if (page) await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-maintenance-verifier-error.png'), fullPage: true }).catch(() => {});
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\nURL: ${currentUrl}\nBODY:\n${debug.slice(0, 6000)}\n`);
  if (ownsBrowser) await browser.close().catch(() => {});
  process.exit(1);
}

process.exit(0);
