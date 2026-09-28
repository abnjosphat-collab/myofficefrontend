import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

let ownsBrowser = false;
let browser;
try { browser = await chromium.connectOverCDP(process.env.COMPRESSORS_CDP_URL || 'http://127.0.0.1:9223', { timeout: 10_000 }); }
catch { browser = await chromium.launch({ headless: true }); ownsBrowser = true; }
const context = browser.contexts()[0] || await browser.newContext();
let page = context.pages().find(candidate => candidate.url().startsWith('http://localhost:3000'));
if (!page) page = await context.newPage();

const env = Object.fromEntries(fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const authStorageKey = `sb-${supabaseUrl.hostname.split('.')[0]}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const user = { id: '00000000-0000-4000-8000-000000000004', aud: 'authenticated', role: 'authenticated', email: 'compressors-audit@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Compressors Audit' }, created_at: new Date().toISOString() };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ aud: 'authenticated', exp: now + 3600, iat: now, sub: user.id, email: user.email, role: 'authenticated', aal: 'aal1' })}.fixture`;
const session = { access_token: token, refresh_token: 'fixture-refresh-token', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };
const compressor = { id: 1, name: 'Audit Compressor A', model: 'Atlas AC-100', capacity: '100 CFM', location: 'Main Plant', status: 'running', total_running_hours: 1200, total_loaded_hours: 900, initial_total_running: 1000, initial_total_loaded: 750, color: 'bg-brand-500' };
let failRegister = false;
const blockedWrites = [];
const responses = [];
const consoleErrors = [];

await page.route(`${supabaseUrl.origin}/**`, async route => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname === '/rest/v1/user_profiles') { await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([{ id: user.id, email: user.email, full_name: 'Compressors Audit', avatar_url: null, role: 'admin', is_active: true, created_at: user.created_at }]) }); return; }
  if (pathname === '/auth/v1/user') { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }); return; }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  if (request.method() !== 'GET') { blockedWrites.push({ method: request.method(), pathname }); await route.abort('blockedbyclient'); return; }
  let body = [];
  let status = 200;
  if (pathname === '/api/compressors/compressors') { status = failRegister ? 503 : 200; body = failRegister ? { detail: 'Service unavailable while Supabase wakes up' } : [compressor]; responses.push({ pathname, status }); }
  else if (pathname.includes('/api/compressors/readings/1/detailed')) body = { data: [{ date: '2026-09-27', total_running_hours: 1192, total_loaded_hours: 894 }] };
  else if (pathname === '/api/compressors/stats') body = { total_compressors: 1, total_running_hours: 1200, avg_efficiency: 75, upcoming_services: 1, urgent_alerts: 0, active_compressors: 1 };
  else if (pathname === '/api/compressors/service-due') body = [{ compressor_id: 1, compressor_name: 'Audit Compressor A', service_interval: 2000, current_hours: 1200, next_service_hours: 2000, hours_remaining: 800, days_remaining: 100, urgency: 'low' }];
  else if (pathname.includes('/analytics/performance-metrics')) body = [{ compressor_id: 1, compressor_name: 'Audit Compressor A', avg_efficiency: 75, avg_daily_running_hours: 8, avg_daily_loaded_hours: 6, total_running_hours: 1200, total_loaded_hours: 900, downtime_percentage: 5, service_count: 1 }];
  else if (pathname.includes('/analytics/trends')) body = { success: true, data: [{ compressor_name: 'Audit Compressor A', efficiency_trend: 'stable', avg_efficiency: 75 }], message: '', has_data: true };
  else if (pathname.includes('/analytics/comparison')) body = { success: true, data: [{ compressor_id: 1, compressor_name: 'Audit Compressor A', location: 'Main Plant', value: 75, rating: 'Good' }], message: '', count: 1 };
  else if (pathname.includes('/management/summary')) body = { status_distribution: { running: 1 }, location_distribution: { 'Main Plant': 1 }, age_distribution: { less_than_year: 1 }, total_compressors: 1, unread_alerts: 0, recent_alerts: [], recent_services: [] };
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
});
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

const waitText = text => page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60_000 });
const overflow = locator => locator.evaluate(element => element.scrollWidth - element.clientWidth);
const check = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const original = await page.evaluate(key => ({ auth: localStorage.getItem(key), design: localStorage.getItem('myoffice_design'), theme: localStorage.getItem('myoffice_theme'), preferencesSeen: localStorage.getItem('oz_prefsSeen') }), authStorageKey);
  const restore = () => page.evaluate(({ key, values }) => { for (const [storageKey, value] of Object.entries({ [key]: values.auth, myoffice_design: values.design, myoffice_theme: values.theme, oz_prefsSeen: values.preferencesSeen })) { if (value === null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, value); } }, { key: authStorageKey, values: original });
  await page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('myoffice_design', 'dallaglio'); localStorage.setItem('myoffice_theme', 'light'); localStorage.setItem('oz_prefsSeen', '1'); }, { key: authStorageKey, value: session });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/compressors', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit Compressor A');
  const desktopLight = { cardVisible: true, documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), mainOverflow: await overflow(page.locator('main').last()) };
  await page.getByRole('button', { name: 'List view' }).click();
  await waitText('Audit Compressor A');
  await page.getByRole('button', { name: 'Card view' }).click();
  await page.getByRole('tab', { name: 'Services' }).click();
  await waitText('Upcoming Services');
  await page.getByRole('tab', { name: 'Analytics' }).click();
  await waitText('Performance Metrics');
  await page.getByRole('tab', { name: 'Management' }).click();
  await waitText('Status Distribution');
  const tabsVisible = true;
  await page.getByRole('tab', { name: 'Daily View' }).click();

  failRegister = true;
  await page.getByTitle('Refresh compressors').click();
  await waitText('Compressor register may be out of date');
  const quietFailure = { warning: true, cardPreserved: await page.getByText('Audit Compressor A', { exact: true }).first().isVisible(), falseEmpty: (await page.locator('body').innerText()).includes('No compressors found') };
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Could not load compressors');
  const initialFailure = { unavailable: true, falseEmpty: (await page.locator('body').innerText()).includes('No compressors found'), addDisabled: await page.getByRole('button', { name: 'Add Compressor', exact: true }).isDisabled() };
  failRegister = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await waitText('Audit Compressor A');

  await page.evaluate(() => localStorage.setItem('myoffice_theme', 'dark'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitText('Audit Compressor A');
  const mobileDark = { documentOverflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), mainOverflow: await overflow(page.locator('main').last()) };
  await page.getByRole('button', { name: 'Add Compressor', exact: true }).click();
  let dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  mobileDark.addDialogOverflow = await overflow(dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Running', exact: true }).first().click();
  dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  mobileDark.statusDialogOverflow = await overflow(dialog);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: path.join(os.tmpdir(), 'myoffice-compressors-dark-mobile.png'), fullPage: true });

  await restore();
  const evidence = { desktopLight, tabsVisible, quietFailure, initialFailure, mobileDark, blockedWrites, consoleErrors, responses };
  fs.writeSync(1, `${JSON.stringify(evidence, null, 2)}\n`);
  check(desktopLight.cardVisible && desktopLight.documentOverflow === 0 && desktopLight.mainOverflow === 0, 'Desktop compressor verification failed.');
  check(tabsVisible, 'A compressor tab did not render.');
  check(quietFailure.warning && quietFailure.cardPreserved && !quietFailure.falseEmpty, 'Quiet compressor failure was misleading.');
  check(initialFailure.unavailable && !initialFailure.falseEmpty && initialFailure.addDisabled, 'Initial compressor failure was unsafe.');
  check(Object.values(mobileDark).every(value => value === 0), 'Compressors overflowed at 390px.');
  if (ownsBrowser) await browser.close();
} catch (error) {
  const body = await page.locator('body').innerText().catch(() => '');
  fs.writeSync(2, `${error instanceof Error ? error.stack || error.message : String(error)}\nURL: ${page.url()}\nBODY:\n${body.slice(0, 5000)}\n`);
  if (ownsBrowser) await browser.close().catch(() => {});
  process.exit(1);
}
process.exit(0);
