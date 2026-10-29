// N5 motion traces: 6 Chrome performance traces (CDP devtools.timeline) at 4x
// CPU throttle, saved as JSON under captures/traces/, with a longtask +
// layout-shift census per window printed as PASS/FAIL.
//   node scripts/perf-motion-traces.mjs [--base http://localhost:3100]
// Fixture data only. Budgets: no longtask over 50ms in a motion window,
// layout shift caused by motion 0.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3100');
const THR = Number(process.env.THROTTLE ?? 4);
const OUT = path.resolve('../audit/motion-search-next-2026-10-27/captures/traces');
fs.mkdirSync(OUT, { recursive: true });

const maintenance = (await import(pathToFileURL(path.resolve('scripts/route-specs/maintenance.mjs')).href)).default;
const compressors = (await import(pathToFileURL(path.resolve('scripts/route-specs/compressors.mjs')).href)).default;

const pad = n => String(n).padStart(2, '0');
const day = o => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wo = id => ({
  id, work_order_number: `WO-${String(id).padStart(5, '0')}`, equipment_info: `Pump ${id}`, to_department: 'Engineering',
  date_raised: day(-5), job_request_details: 'Inspect the seal', requested_by: 'Sam', authorising_foreman: 'Lee',
  allocated_to: 'Alex', estimated_hours: '4', job_instructions: '', status: 'pending', priority: 'medium', progress: 0,
  work_done_details: '', cause_of_failure: '', delay_details: '', artisan_name: 'Alex', artisan_sign: '', artisan_date: '',
  foreman_name: '', foreman_sign: '', foreman_date: '', time_work_started: '', time_work_finished: '', total_time_worked: '',
  overtime_start_time: '', overtime_end_time: '', overtime_hours: '', delay_from_time: '', delay_to_time: '',
  total_delay_hours: '', spares_used: [], created_at: `${day(-5)}T08:00:00Z`, updated_at: `${day(-5)}T08:00:00Z`,
});
const hundred = Array.from({ length: 100 }, (_, i) => wo(i + 1));
const maintenance100 = { ...maintenance.data, '/api/maintenance/work-orders': () => hundred };

const browser = await chromium.launch({ headless: true });
let failures = 0;

async function trace(name, route, data, storage, flow) {
  const file = path.join(OUT, `${name}.json`);
  const context = await fixtureContext(browser, makeHandler(data, []), { width: 1440, height: 900 });
  if (storage) await context.addInitScript(entries => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, storage);
  const page = await context.newPage();
  if (THR > 1) await context.newCDPSession(page).then(s => s.send('Emulation.setCPUThrottlingRate', { rate: THR }));
  await page.addInitScript(() => {
    window.__lt = []; window.__ls = [];
    try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__ls.push({ start: e.startTime, value: e.value }); } }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, duration: e.duration }); }).observe({ entryTypes: ['longtask'] });
    } catch { /* old headless */ }
  });
  const cdp = await context.newCDPSession(page);
  const chunks = [];
  cdp.on('Tracing.dataCollected', ({ value }) => { if (value) chunks.push(...value); });
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
    await page.waitForSelector('main h1', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] } });
    const t0 = await page.evaluate(() => performance.now());
    await flow(page);
    const census = await page.evaluate(t => {
      const tasks = window.__lt.filter(x => x.start >= t);
      const cls = window.__ls.filter(x => x.start >= t).reduce((s, x) => s + x.value, 0);
      return { ms: Math.round(performance.now() - t), tasks, cls };
    }, t0);
    await cdp.send('Tracing.end');
    await page.waitForTimeout(500);
    fs.writeFileSync(file, JSON.stringify({ traceEvents: chunks }));
    const over = census.tasks.filter(t => t.duration > 50);
    const max = census.tasks.reduce((m, t) => Math.max(m, t.duration), 0);
    const ok = over.length === 0 && census.cls === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${census.tasks.length} longtasks, ${over.length} over 50ms, max ${max.toFixed(0)}ms, CLS ${census.cls.toFixed(4)}, window ${census.ms}ms, trace ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${String(error).split('\n')[0].slice(0, 200)}`);
  }
  await context.close();
}

const cards = page => page.getByRole('button', { name: /^Open work order WO-/ });

// 1. Opening a drawer (card -> detail zoom).
await trace('drawer-open', '/maintenance', maintenance.data, maintenance.storage, async page => {
  await cards(page).first().click();
  await page.getByRole('dialog').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
});

// 2. The bulk bar (select -> bar with rolling counts).
await trace('bulk-bar', '/maintenance', maintenance.data, maintenance.storage, async page => {
  await page.getByRole('checkbox', { name: 'Select work order WO-00001' }).check();
  await page.waitForTimeout(600);
  await page.getByRole('checkbox', { name: 'Select work order WO-00002' }).check();
  await page.waitForTimeout(1500);
});

// 3. The toast stack (fire two, watch enter + re-flow).
await trace('toast-stack', '/dev/motion', {}, undefined, async page => {
  await page.getByRole('button', { name: 'Success toast' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Info toast' }).click();
  await page.waitForTimeout(1500);
});

// 4. The sidebar collapse (chevron both ways).
await trace('sidebar-collapse', '/maintenance', maintenance.data, maintenance.storage, async page => {
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.waitForTimeout(1000);
});

// 5. A compressor first load (cold page with 25 pods).
await trace('compressor-load', '/compressors', compressors.data, undefined, async page => {
  await page.getByRole('button', { name: /Open to record a reading/ }).first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
});

// 6. A card list of 100 items (register load).
await trace('card-list-100', '/maintenance', maintenance100, maintenance.storage, async page => {
  await cards(page).first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
});

await browser.close();
console.log(failures === 0 ? `\nPASS perf-motion-traces: 6 traces in ${OUT}` : `\nFAIL perf-motion-traces: ${failures} trace(s) over budget`);
process.exit(failures === 0 ? 0 : 1);
