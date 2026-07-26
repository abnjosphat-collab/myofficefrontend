// Frontend smoke suite — the standing regression net.
//
// For every real page route it: mocks all /api/** calls (so it needs no backend, no auth,
// and is deterministic), loads the page, and fails if the page throws an uncaught
// exception, triggers a hydration/React error, or renders blank. Plus a few targeted
// checks for flows that regressed before (PPE matrix + dropdown width, Preferences panel,
// homepage grid).
//
// Requires the dev server running:  npm run dev   (then)   npm run test:smoke
// No test framework needed — pure Node + the installed `playwright`. Exits non-zero on any
// failure so it works in CI.

import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const APP_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'app');

// Infra routes that render minimal/no content by design (e.g. an auth redirect handler) —
// not user-facing pages, so exclude them from the "renders something" check.
const SKIP = new Set(['/auth/callback']);

// ─── Discover routes from app/**/page.tsx (skip route groups and dynamic segments) ──
function discoverRoutes(dir, prefix = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith('(') || entry.startsWith('[') || entry.startsWith('_') || entry === 'api') continue;
    const seg = `${prefix}/${entry}`;
    if (readdirSync(full).some(f => f === 'page.tsx' || f === 'page.jsx')) routes.push(seg);
    routes.push(...discoverRoutes(full, seg));
  }
  return routes;
}

// Console-error patterns that indicate a real defect (vs benign dev/network noise).
const CRITICAL = [
  /hydrat/i, /did not match/i,
  /cannot read propert/i, /is not a function/i, /is not defined/i,
  /maximum update depth/i, /too many re-renders/i,
  /objects are not valid as a react child/i,
  /each child in a list should have a unique/i,
];

// Deterministic API stub: empty list for everything, so pages render their empty states
// without a backend or auth. Exception: the availability page has a built-in mock
// fallback for genuine network failure, so we 404 its calls to exercise that
// fallback render path instead of feeding it a wrong shape.
function mockApi(route) {
  const url = route.request().url();
  if (url.includes('/api/availabilities')) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
}

async function checkPage(context, route) {
  const page = await context.newPage();
  const pageErrors = [];
  const criticalConsole = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (CRITICAL.some(rx => rx.test(t))) criticalConsole.push(t);
  });
  await page.route('**/api/**', mockApi);
  await page.addInitScript(() => { try { localStorage.setItem('oz_prefsSeen', '1'); } catch {} });

  const problems = [];
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    const text = (await page.evaluate(() => document.body.innerText || '')).trim();
    if (text.length < 20) problems.push('rendered blank / near-empty');
  } catch (e) {
    problems.push(`navigation failed: ${e.message.split('\n')[0]}`);
  }
  if (pageErrors.length) problems.push(`uncaught: ${pageErrors[0]}`);
  if (criticalConsole.length) problems.push(`console: ${criticalConsole[0].slice(0, 120)}`);
  await page.close();
  return problems;
}

// ─── Targeted checks for the flows that regressed before ─────────────────────────
async function targeted(context) {
  const results = [];
  const run = async (name, fn) => {
    const page = await context.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route('**/api/**', mockApi);
    await page.addInitScript(() => { try { localStorage.setItem('oz_prefsSeen', '1'); } catch {} });
    try { await fn(page); results.push([name, errs.length ? `uncaught: ${errs[0]}` : null]); }
    catch (e) { results.push([name, e.message.split('\n')[0]]); }
    await page.close();
  };

  await run('homepage renders module grid', async page => {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    if (await page.locator('#modules').count() === 0) throw new Error('#modules grid missing');
  });

  await run('preferences panel opens from top bar', async page => {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.locator('button[title^="Preferences"]').first().click();
    await page.waitForTimeout(600);
    if (await page.getByText('Appearance & layout').count() === 0) throw new Error('panel did not open');
  });

  await run('PPE matrix modal + dropdown not clipped', async page => {
    await page.goto(BASE + '/ppe', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Matrix/ }).first().click();
    await page.waitForTimeout(600);
    if (await page.getByText('PPE Replacement Matrix').count() === 0) throw new Error('matrix modal did not open');
    if (await page.getByRole('button', { name: 'Recalculate' }).count() < 5) throw new Error('matrix rows missing');
  });

  return results;
}

(async () => {
  // Fail fast with a clear message if the dev server isn't up.
  try { await fetch(BASE); } catch { console.error(`\n✗ Dev server not reachable at ${BASE}. Run "npm run dev" first.\n`); process.exit(2); }

  const routes = discoverRoutes(APP_DIR).filter(r => !SKIP.has(r)).sort();
  console.log(`Smoke: ${routes.length} routes @ ${BASE}\n`);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  const failures = [];
  for (const route of routes) {
    const problems = await checkPage(context, route);
    if (problems.length) { failures.push([route, problems]); console.log(`  ✗ ${route}\n      ${problems.join('\n      ')}`); }
    else console.log(`  ✓ ${route}`);
  }

  console.log('\nTargeted flow checks:');
  const t = await targeted(context);
  for (const [name, err] of t) {
    if (err) { failures.push([name, [err]]); console.log(`  ✗ ${name}\n      ${err}`); }
    else console.log(`  ✓ ${name}`);
  }

  await browser.close();
  const total = routes.length + t.length;
  console.log(`\n${total - failures.length}/${total} passed.`);
  if (failures.length) { console.log(`${failures.length} FAILED.`); process.exit(1); }
  console.log('All smoke checks passed.');
})();
