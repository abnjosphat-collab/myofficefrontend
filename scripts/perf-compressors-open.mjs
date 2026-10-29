// N2 perf gate (§2.6): pod click -> UnitDrawer visible on the compressors
// floor at 4x CPU throttle. Targets: click-to-open under 300 ms; no main-
// thread task over 50 ms inside the zoom window (same bar as B4).
//   node scripts/perf-compressors-open.mjs [--base http://localhost:3000]
// Prints latency + per-window counts, then PASS/FAIL. Fixture data only.
import process from 'node:process';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const LIMIT_MS = 50;
const OPEN_BUDGET_MS = 300;

const pad = n => String(n).padStart(2, '0');
const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const run = h => Math.round(h);
const unit = id => ({
  id, name: `Compressor ${id}`, model: 'GA37', capacity: '37 kW', location: id % 2 ? 'Main Plant' : 'Plant B',
  status: id % 5 === 0 ? 'standby' : 'running',
  total_running_hours: run(400 + id * 37), total_loaded_hours: run(300 + id * 29),
  initial_total_running: 0, initial_total_loaded: 0,
});
const units = Array.from({ length: 25 }, (_, i) => unit(i + 1));
const data = {
  '/api/compressors/compressors': units,
  '/api/compressors/stats': { total_compressors: 25, total_running_hours: 20000, avg_efficiency: 72.5, upcoming_services: 2, urgent_alerts: 0, active_compressors: 25 },
  '/api/compressors/service-due': [],
  '/api/lookups/location': [],
};
for (const c of units) {
  data[`/api/compressors/readings/${c.id}/detailed`] = { success: true, data: [{ date: day(-1), total_running_hours: c.total_running_hours - 8, total_loaded_hours: c.total_loaded_hours - 6 }] };
}

const browser = await chromium.launch({ headless: true });
const context = await fixtureContext(browser, makeHandler(data, []), { width: 1440, height: 900 });
const page = await context.newPage();
const THR = Number(process.env.THROTTLE ?? 4); if (THR > 1) await context.newCDPSession(page).then(s => s.send('Emulation.setCPUThrottlingRate', { rate: THR }));
await page.addInitScript(() => {
  window.__longtasks = [];
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__longtasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* old headless: no longtask source */ }
});

const now = () => page.evaluate(() => performance.now());
const tasksBetween = (from, to) => page.evaluate(([a, b]) => window.__longtasks.filter(t => t.start >= a && t.start < b), [from, to]);
const report = (label, tasks) => {
  const over = tasks.filter(t => t.duration > LIMIT_MS);
  const max = tasks.reduce((m, t) => Math.max(m, t.duration), 0);
  console.log(`${label}: ${tasks.length} longtasks, ${over.length} over ${LIMIT_MS}ms, max ${max.toFixed(1)}ms`);
  return over.length;
};

await page.goto(`${BASE}/compressors`, { waitUntil: 'networkidle' });
const pods = page.getByRole('button', { name: /Open to record a reading/ });
// Cold first paint under throttle is not the measured window; give the dev
// bundle room, then warm up outside every window.
await pods.first().waitFor({ timeout: 90000 });
const count = await pods.count();
console.log(`pods rendered: ${count}`);
if (count !== 25) { console.log(`FAIL expected one full page of 25 pods, saw ${count}`); await browser.close(); process.exit(1); }
await page.waitForTimeout(1000);
// Warm-up open/close: dev-compile and first mount happen here, outside the
// measured windows.
await pods.first().click();
await page.getByRole('dialog', { name: /Compressor 1/ }).waitFor({ timeout: 30000 });
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

let failures = 0;
// Window 1: pod click -> drawer visible (the §2.6 click-to-open budget).
const t0 = await now();
// dispatch_event: skip Playwright actionability waits under throttle so the
// measured number is render cost, not input-pipeline waiting.
await pods.first().dispatchEvent('click');
const drawer = page.getByRole('dialog', { name: /Compressor 1/ });
await drawer.waitFor({ timeout: 8000 });
const openedMs = await now().then(t => t - t0);
console.log(`click-to-open: ${openedMs.toFixed(0)}ms (budget ${OPEN_BUDGET_MS}ms)`);
if (openedMs > OPEN_BUDGET_MS) { console.log('FAIL click-to-open over budget'); failures += 1; }
// Window 2: zoom flight + first paint of the drawer.
await page.waitForTimeout(900);
failures += report('pod-zoom   ', await tasksBetween(t0, await now()));

// Window 3: drawer close (shrink-back).
const t2 = await now();
await page.keyboard.press('Escape');
await drawer.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
await page.waitForTimeout(900);
failures += report('drawer-close', await tasksBetween(t2, await now()));

await browser.close();
console.log(failures === 0 ? 'PASS perf-compressors-open: click-to-open under budget, no task over 50ms' : `FAIL perf-compressors-open: ${failures} problem(s)`);
process.exit(failures === 0 ? 0 : 1);
