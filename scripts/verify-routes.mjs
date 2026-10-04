// Spec-driven render checks for migrated routes (fixture session + mocked /api; no live data).
//   MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs [--base http://localhost:3000] [--only /reliability,/ppe/allocate] [--out <dir>]
// Every spec gets the same standard scenarios (ready, empty, failed load with retry, 390px, console errors)
// plus its own `ready` / `extra` interactions. Add a spec in scripts/route-specs/<name>.mjs and list it below.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, json } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const ONLY = arg('only', '').split(',').filter(Boolean);
const OUT = arg('out', path.resolve('node_modules/.cache/mo-audit/shots-routes'));
fs.mkdirSync(OUT, { recursive: true });

const specDir = path.resolve('scripts/route-specs');
const specs = [];
for (const file of fs.readdirSync(specDir).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(specDir, file)).href);
  specs.push(...(Array.isArray(mod.default) ? mod.default : [mod.default]));
}

let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ headless: true });
const slug = route => route.replace(/\W+/g, '-').replace(/^-|-$/g, '');

/** Mock API: `data[pathname]` is the body (or a function (request) => body | {status, body}); unknown paths return []. */
function makeHandler(data, calls) {
  return async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    calls.push({ method: request.method(), pathname, query: new URL(request.url()).search, body: request.method() === 'GET' ? null : safeJson(request) });
    const entry = data[`${request.method()} ${pathname}`] ?? data[pathname];
    const value = typeof entry === 'function' ? entry(request, calls) : entry;
    if (value === undefined) return json(route, []);
    if (value && typeof value === 'object' && '__status' in value) return route.fulfill({ status: value.__status, contentType: 'application/json', body: JSON.stringify(value.body ?? { detail: 'error' }) });
    return json(route, value);
  };
}
const safeJson = request => { try { return request.postDataJSON(); } catch { return null; } };

async function scenario(name, spec, data, run, viewport, storage = spec.storage) {
  const calls = [];
  const context = await fixtureContext(browser, makeHandler(data, calls), viewport);
  if (storage) await context.addInitScript(entries => { for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }, storage);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) problems.push(`console: ${message.text().slice(0, 160)}`); });
  try {
    await page.goto(`${BASE}${spec.route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);
    await run(page, calls);
  } catch (error) { check(false, `${name} ran to completion`, String(error).split('\n').slice(0, 6).join(' | ').slice(0, 800)); }
  check(problems.length === 0, `${name}: no browser errors`, problems[0] ?? '');
  await context.close();
}

for (const spec of specs) {
  if (ONLY.length && !ONLY.includes(spec.route)) continue;
  console.log(`\n== ${spec.route} ==`);
  const shot = (page, label) => page.screenshot({ path: path.join(OUT, `${slug(spec.route)}-${label}.png`) });
  const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const ctx = { check, shot, json, expectNoOverflow: async (page, label) => { const px = await overflow(page); check(px <= 0, `${label}: no horizontal page scroll`, `${px}px`); } };

  await scenario(`${spec.route} ready`, spec, spec.data, async (page, calls) => {
    check(await page.getByRole('heading', { level: 1, name: spec.h1 }).isVisible(), `h1 "${typeof spec.h1 === 'string' ? spec.h1 : spec.h1.source}"`);
    await shot(page, 'ready@1440');
    await spec.ready?.(page, calls, ctx);
    await spec.extra?.(page, calls, ctx);
  });

  if (spec.empty) {
    await scenario(`${spec.route} empty`, spec, spec.empty.data ?? spec.data, async page => {
      check(await page.getByText(spec.empty.text).first().isVisible(), `empty state: "${spec.empty.text}"`);
      await shot(page, 'empty@1440');
    }, undefined, spec.empty.storage ?? (spec.empty.data ? spec.storage : {}));
  }

  if (spec.failing) {
    let failing = true;
    const data = Object.fromEntries(Object.entries(spec.data).map(([key, value]) => [key, (...args) => (failing && spec.failing.paths.includes(key) ? { __status: 404, body: { detail: 'Service unavailable (fixture)' } } : typeof value === 'function' ? value(...args) : value)]));
    await scenario(`${spec.route} failed load`, spec, data, async page => {
      await page.getByText(spec.failing.text).first().waitFor({ timeout: 8000 }).catch(() => {}); // the failure appears once the request settles
      check(await page.getByText(spec.failing.text).first().isVisible(), `failure says so: "${spec.failing.text}"`);
      for (const bad of spec.failing.notShown ?? []) check(!(await page.getByText(bad).first().isVisible().catch(() => false)), `failure is not shown as: "${bad}"`);
      await shot(page, 'error@1440');
      failing = false;
      await page.getByRole('button', { name: 'Try again' }).click();
      await page.waitForTimeout(1200);
      await spec.failing.recovered?.(page, ctx);
    });
  }

  if (spec.create) {
    // Create flow: validation, a failed save keeps the dialog and typed values, a good save closes and reloads.
    const c = spec.create;
    let mode = 'fail';
    const data = { ...spec.data, [`POST ${c.path}`]: () => (mode === 'fail' ? { __status: 500, body: { detail: 'Save rejected (fixture)' } } : { id: 999 }) };
    await scenario(`${spec.route} create`, spec, data, async (page, calls) => {
      await c.before?.(page); // optional per-route setup, e.g. dismissing an overlay that covers the opener
      await page.getByRole('button', { name: c.open }).first().click();
      const dialog = page.getByRole('dialog', { name: c.dialog });
      await dialog.waitFor({ timeout: 5000 });
      if (c.requiredText) {
        await dialog.getByRole('button', { name: c.submit }).click();
        check(await dialog.getByText(c.requiredText).first().isVisible(), `required field error: "${c.requiredText}"`);
      }
      await c.fill(dialog, page);
      await dialog.getByRole('button', { name: c.submit }).click();
      await dialog.getByRole('alert').first().waitFor({ timeout: 5000 }).catch(() => {});
      check(await dialog.isVisible() && await dialog.getByText('Save rejected (fixture)').isVisible(), 'failed save keeps the dialog open and shows the server message');
      check(await c.kept(dialog), 'failed save keeps what the user typed');
      await shot(page, 'create-error@1440');
      mode = 'ok';
      const listPath = c.listPath ?? c.path; // the list may live at a different path than the create endpoint
      const before = calls.filter(x => x.method === 'GET' && x.pathname === listPath).length;
      await dialog.getByRole('button', { name: c.submit }).click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      check(!(await dialog.isVisible().catch(() => false)), 'successful save closes the dialog');
      await page.waitForTimeout(600);
      check(calls.filter(x => x.method === 'GET' && x.pathname === listPath).length > before, 'the list is reloaded after saving');
      const post = calls.filter(x => x.method === 'POST' && x.pathname === c.path).pop();
      check(c.body(post?.body ?? {}), 'the saved record has the expected fields', JSON.stringify(post?.body).slice(0, 200));
    });
  }

  await scenario(`${spec.route} @390`, spec, spec.data, async page => {
    await ctx.expectNoOverflow(page, '390px');
    await shot(page, 'ready@390');
    await spec.mobile?.(page, ctx);
  }, { width: 390, height: 844 });

  // Tablet portrait and landscape phone: no page-wide horizontal scroll (wide tables scroll inside their own region).
  for (const [width, height, label] of [[820, 1100, 'tablet-portrait'], [844, 390, 'phone-landscape'], [1180, 820, 'tablet-landscape']]) {
    await scenario(`${spec.route} @${width}x${height}`, spec, spec.data, async page => {
      await ctx.expectNoOverflow(page, `${label} ${width}x${height}`);
      await shot(page, `ready@${label}`);
    }, { width, height });
  }
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
