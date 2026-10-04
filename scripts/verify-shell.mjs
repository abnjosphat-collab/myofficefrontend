// Authenticated-render check for the shared shell and migrated routes.
// Uses a fixture Supabase session (no real sign-in, no live data) and mocked /api responses, like
// scripts/verify-maintenance.mjs. Usage:
//   node scripts/verify-shell.mjs [--base http://localhost:3100] [--routes /,/contractors] [--out <dir>]
// Writes screenshots to --out and prints PASS/FAIL per check; exits 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3100');
const ROUTES = arg('routes', '/').split(',');
const OUT = arg('out', path.resolve('node_modules/.cache/mo-audit/shots'));
fs.mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const storageKey = `sb-${supabaseUrl.hostname.split('.')[0]}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const user = { id: '00000000-0000-4000-8000-000000000009', aud: 'authenticated', role: 'authenticated', email: 'shell-check@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Shell Check' }, created_at: new Date().toISOString() };
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ aud: 'authenticated', exp: now + 3600, iat: now, sub: user.id, email: user.email, role: 'authenticated', aal: 'aal1' })}.fixture`;
const session = { access_token: token, refresh_token: 'fixture', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '820', width: 820, height: 1100 },
  { name: '390', width: 390, height: 844 },
  { name: '320', width: 320, height: 700 },
];

let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
await context.addInitScript(([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); }, [storageKey, session]);
await context.route(`${supabaseUrl.origin}/**`, async route => {
  const { pathname } = new URL(route.request().url());
  if (pathname === '/rest/v1/user_profiles') return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([{ id: user.id, email: user.email, full_name: 'Shell Check', avatar_url: null, role: 'admin', is_active: true, created_at: user.created_at }]) });
  if (pathname === '/auth/v1/user') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await context.route('**/api/**', async route => {
  const url = route.request().url();
  if (!url.includes('/api/')) return route.continue();
  if (route.request().method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});

const page = await context.newPage();
const problems = [];
page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text().slice(0, 200)}`); });

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    const tag = `${route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, '')}@${viewport.name}`;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('header', { timeout: 30_000 }).catch(() => {});

    const facts = await page.evaluate(() => {
      const html = document.documentElement;
      const body = getComputedStyle(document.body);
      const header = document.querySelector('header');
      const buttons = [...document.querySelectorAll('header button, header a')].map(el => (el.getAttribute('aria-label') || el.textContent || '').trim());
      return {
        overflow: html.scrollWidth - html.clientWidth,
        zoom: getComputedStyle(html).zoom,
        font: body.fontFamily,
        bg: body.backgroundColor,
        dark: html.classList.contains('dark'),
        theme: html.dataset.theme,
        hasHeader: Boolean(header),
        headerButtons: buttons,
        bottomBar: [...document.querySelectorAll('body *')].some(el => { const s = getComputedStyle(el); return s.position === 'fixed' && el.getBoundingClientRect().bottom >= innerHeight - 2 && el.getBoundingClientRect().top > innerHeight - 80 && /operational|feedback|settings/i.test(el.textContent || '') && el.getBoundingClientRect().width > innerWidth * 0.5; }),
        aside: Boolean(document.querySelector('aside')),
        scrollsInner: [...document.querySelectorAll('main')].some(el => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight),
      };
    });
    await page.screenshot({ path: path.join(OUT, `${tag}.png`), fullPage: false });

    check(facts.hasHeader, `${tag} top bar renders`);
    check(facts.overflow <= 0, `${tag} no horizontal page scroll`, `overflow ${facts.overflow}px`);
    check(!facts.dark && facts.theme === 'light', `${tag} single light appearance`);
    check(facts.zoom === '1' || facts.zoom === 'normal', `${tag} no CSS zoom on <html>`, facts.zoom);
    check(!facts.bottomBar, `${tag} no fixed bottom bar`);
    check(facts.headerButtons.some(label => /feedback/i.test(label)), `${tag} Feedback visible in top bar`);
    check(facts.headerButtons.some(label => /notifications/i.test(label)), `${tag} notifications in top bar`);
    check(facts.headerButtons.some(label => /^settings$/i.test(label)), `${tag} settings in top bar`);
    check(/Inter|Manrope|Jakarta/i.test(facts.font) || /__Inter|__Manrope|__Plus_Jakarta/i.test(facts.font), `${tag} UI typeface applied`, facts.font.slice(0, 60));
    check(!facts.scrollsInner, `${tag} document scrolls (no inner scroll container)`);
  }
}

// Interaction checks on the first route at desktop and phone widths.
const first = ROUTES[0];
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}${first}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});

await page.waitForTimeout(2500); // let hydration finish before the first interaction
await page.getByRole('button', { name: 'Settings', exact: true }).click();
const dialog = page.getByRole('dialog', { name: 'Settings' });
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
if (!(await dialog.isVisible())) console.log('  debug: url', page.url(), 'dialogs', await page.getByRole('dialog').count(), 'viewport', JSON.stringify(page.viewportSize()), 'gear', await page.getByRole('button', { name: 'Settings', exact: true }).count());
if (!(await dialog.isVisible())) console.log('  problems so far:', [...new Set(problems)].slice(0, 6).join(' | '));
check(await dialog.isVisible(), 'settings dialog opens');
await page.screenshot({ path: path.join(OUT, 'settings-open.png') });
const slider = dialog.getByRole('slider');
const navSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('aside nav a')).fontSize));
const before = await navSize();
await slider.focus();
for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight'); // +30 -> 130%
const after = { size: await navSize(), scale: await page.evaluate(() => document.documentElement.style.getPropertyValue('--mo-text-scale')) };
check(after.size > before * 1.25, 'text size 130% scales shell text via token', `${before}px -> ${after.size}px, scale ${after.scale}`);
await page.waitForTimeout(700); // let open animations settle
await page.screenshot({ path: path.join(OUT, 'settings-130.png') });
await page.keyboard.press('Escape');
check(await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false), 'Escape closes settings');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('myoffice_appearance_v1') || 'null'));
check(saved?.fontSize === 130, 'appearance persisted to myoffice_appearance_v1', JSON.stringify(saved));
await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
const early = await page.evaluate(() => document.documentElement.style.getPropertyValue('--mo-text-scale'));
check(early === '1.3', 'saved text size is restored after reload', early);
// reset for later runs
await page.evaluate(() => localStorage.removeItem('myoffice_appearance_v1'));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}${first}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
await page.getByRole('button', { name: 'Open navigation' }).click();
const nav = page.getByRole('dialog', { name: 'Main navigation' });
check(await nav.isVisible(), 'phone: navigation drawer opens');
await page.waitForTimeout(700); // let open animations settle
await page.screenshot({ path: path.join(OUT, 'drawer@390.png') });
await page.keyboard.press('Escape');
check(await nav.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false), 'phone: Escape closes drawer');

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}${first}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
await page.getByRole('button', { name: 'Feedback', exact: true }).click();
check(await page.getByRole('heading', { name: 'Send feedback' }).isVisible(), 'feedback popover opens');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /^Notifications/ }).click();
check(await page.getByRole('heading', { name: 'Notifications' }).isVisible(), 'notifications popover opens');
await page.keyboard.press('Escape');
const search = page.getByRole('combobox', { name: 'Search modules and pages' });
await search.fill('timesheet');
check(await page.getByRole('option').first().isVisible().catch(() => false), 'destination search shows results');
await page.waitForTimeout(700); // let open animations settle
await page.screenshot({ path: path.join(OUT, 'search@1440.png') });
await page.keyboard.press('Escape');

await page.goto(`${BASE}${first}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
await page.keyboard.press('Tab');
const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
check(/skip to main content/i.test(firstFocus || ''), 'keyboard: first Tab stop is the skip link', firstFocus);

console.log(`\nbrowser problems (${problems.length}):`);
for (const problem of [...new Set(problems)].slice(0, 15)) console.log(`  ${problem}`);
await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
