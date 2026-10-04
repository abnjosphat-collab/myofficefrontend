// PWA update-path check. Serves ONE production build twice under two build stamps (APP_BUILD_ID), standing in for
// "an older installed build" and "a newer deployment", and drives a single browser session across the change:
//
//   1. The older build installs its worker and controls the page. Nothing account-specific is cached.
//   2. The server is replaced by the newer build. The still-open app is NOT refreshed; it is offered a "Reload" toast.
//   3. Choosing Reload activates the newer worker and reloads.
//   4. Separately: closing the app and reopening it (no prompt, no reinstall) lands on the newer worker.
//
// Requires a production build (`npm run build`). Uses fixture auth and mocked /api; no live data.
//   MSYS_NO_PATHCONV=1 node scripts/verify-pwa-update.mjs
// Limits: Playwright cannot install a PWA. This exercises the same service worker, registration and update logic a
// standalone window uses, in a normal browser window; standalone chrome and OS-level install/uninstall are not covered.
import { spawn } from 'node:child_process';
import process from 'node:process';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const PORT = 3201;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };

let server = null;
async function startServer(buildId) {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], { env: { ...process.env, APP_BUILD_ID: buildId }, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`${BASE}/sw.js`); if (r.ok) return; } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`server for ${buildId} did not start`);
}
async function stopServer() {
  if (!server) return;
  const done = new Promise(resolve => server.once('exit', resolve));
  server.kill();
  await Promise.race([done, new Promise(resolve => setTimeout(resolve, 5000))]);
  server = null;
  await new Promise(resolve => setTimeout(resolve, 800));
}

const controllerBuild = page => page.evaluate(() => new Promise(resolve => {
  const controller = navigator.serviceWorker.controller;
  if (!controller) return resolve(null);
  navigator.serviceWorker.addEventListener('message', event => { if (event.data?.type === 'BUILD_ID') resolve(event.data.buildId); });
  controller.postMessage({ type: 'GET_BUILD_ID' });
  setTimeout(() => resolve('no-reply'), 3000);
}));
const open = async (context, route = '/contractors') => {
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForSelector('main h1', { timeout: 30_000 });
  return page;
};

const browser = await chromium.launch({ headless: true });
try {
  await startServer('build-OLD');
  const context = await fixtureContext(browser, route => json(route, []), { width: 1280, height: 800 }, { serviceWorkers: 'allow' });
  const apiFromWorker = [];
  context.on('response', r => { const u = new URL(r.url()); if (u.origin === BASE && (u.pathname.startsWith('/api/') || r.request().isNavigationRequest()) && r.fromServiceWorker()) apiFromWorker.push(u.pathname); });

  // 0. Manifests and headers
  const sw = await fetch(`${BASE}/sw.js`);
  check((sw.headers.get('cache-control') ?? '').includes('no-cache'), 'sw.js is served with Cache-Control: no-cache', sw.headers.get('cache-control') ?? '');
  check(sw.headers.get('service-worker-allowed') === '/', 'sw.js may control the whole origin');
  const manifest = await (await fetch(`${BASE}/manifest.json`)).json();
  const tools = await (await fetch(`${BASE}/tools/manifest.webmanifest`)).json();
  check(manifest.id === '/' && tools.id === '/tools', 'both manifests declare a stable id', `${manifest.id}, ${tools.id}`);
  check(tools.theme_color === '#f4f6f5' && tools.background_color === '#f4f6f5' && manifest.theme_color === '#f4f6f5', 'manifest colours use the new palette (no old dark violet)');

  // 1. The older build installs and controls the page
  let page = await open(context);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 }).catch(() => {});
  check((await controllerBuild(page)) === 'build-OLD', 'the older build installed and controls the page', String(await controllerBuild(page)));
  await page.evaluate(() => { window.__stillOpen = 'marker'; });
  await page.goto(`${BASE}/inventory`, { waitUntil: 'networkidle' });
  await page.waitForSelector('main h1');
  await page.evaluate(() => { window.__stillOpen = 'marker'; });
  const caches = await page.evaluate(async () => Object.fromEntries(await Promise.all((await window.caches.keys()).map(async name => [name, (await (await window.caches.open(name)).keys()).map(r => new URL(r.url).pathname)]))));
  const cached = Object.values(caches).flat();
  check(cached.every(p => /^\/icons\/[^/]+\.png$/.test(p)), 'Cache Storage holds only static icons: no API response, no HTML, no account data', JSON.stringify(caches));
  check(apiFromWorker.length === 0, 'no navigation or API response was served by the worker', apiFromWorker.join(', '));

  // 2. A newer deployment appears; the open app is offered a reload but not refreshed
  await stopServer();
  await startServer('build-NEW');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // the app returns to the foreground
  await page.getByText('A new version of MyOffice is ready').waitFor({ timeout: 20_000 }).catch(() => {});
  check(await page.getByText('A new version of MyOffice is ready').isVisible(), 'the open app is offered the update');
  check((await page.evaluate(() => window.__stillOpen)) === 'marker', 'the open app was not reloaded or refreshed');
  check((await controllerBuild(page)) === 'build-OLD', 'the older worker still controls the open app until the user chooses');
  check(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), 'the newer worker is installed and waiting');
  await page.screenshot({ path: 'node_modules/.cache/mo-audit/shots-pwa/update-offered@1280.png' }).catch(() => {});

  // 3. Choosing Reload activates the newer worker
  await Promise.all([page.waitForEvent('load', { timeout: 20_000 }).catch(() => {}), page.getByRole('button', { name: 'Reload' }).click()]);
  await page.waitForSelector('main h1', { timeout: 30_000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 }).catch(() => {});
  check((await controllerBuild(page)) === 'build-NEW', 'after Reload the newer worker controls the page', String(await controllerBuild(page)));
  check(!(await page.getByText('A new version of MyOffice is ready').isVisible().catch(() => false)), 'the prompt is gone after updating');

  // 4. Reopen path: an even newer deployment, app closed, then reopened with no prompt and no reinstall
  await stopServer();
  await startServer('build-NEWER');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText('A new version of MyOffice is ready').waitFor({ timeout: 20_000 }).catch(() => {});
  await page.close();
  await new Promise(resolve => setTimeout(resolve, 2500)); // with no open client the waiting worker activates by itself
  page = await open(context);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 }).catch(() => {});
  const reopened = await controllerBuild(page);
  check(reopened === 'build-NEWER', 'reopening the app lands on the newest worker without reinstalling', String(reopened));
  check(!(await page.getByText('A new version of MyOffice is ready').isVisible().catch(() => false)), 'a reopened app is not nagged with an update prompt');
  check(apiFromWorker.length === 0, 'still no navigation or API response served by the worker after the updates', apiFromWorker.join(', '));
  await context.close();
} finally {
  await stopServer();
  await browser.close();
}
console.log(failures === 0 ? '\nALL PWA UPDATE CHECKS PASSED' : `\n${failures} PWA UPDATE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
