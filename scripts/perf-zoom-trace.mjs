// B4 perf gate: 100 fixture work-order cards at 4x CPU throttle. Fails when any
// main-thread task over 50ms lands inside a zoom or list animation window.
//   node scripts/perf-zoom-trace.mjs [--base http://localhost:3000]
// Prints per-window counts/max, then PASS/FAIL. Fixture data only.
import process from 'node:process';
import { chromium, fixtureContext, makeHandler } from './lib/fixtures.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://localhost:3000');
const LIMIT_MS = 50;

const pad = n => String(n).padStart(2, '0');
const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wo = id => ({
  id, work_order_number: `WO-${String(id).padStart(5, '0')}`, equipment_info: `Pump ${id}`, to_department: 'Engineering',
  date_raised: day(-5), job_request_details: 'Inspect the seal', requested_by: 'Sam', authorising_foreman: 'Lee',
  allocated_to: 'Alex', estimated_hours: '4', job_instructions: '', status: 'pending', priority: 'medium', progress: 0,
  work_done_details: '', cause_of_failure: '', delay_details: '', artisan_name: 'Alex', artisan_sign: '', artisan_date: '',
  foreman_name: '', foreman_sign: '', foreman_date: '', time_work_started: '', time_work_finished: '', total_time_worked: '',
  overtime_start_time: '', overtime_end_time: '', overtime_hours: '', delay_from_time: '', delay_to_time: '',
  total_delay_hours: '', spares_used: [], created_at: `${day(-5)}T08:00:00Z`, updated_at: `${day(-5)}T08:00:00Z`,
});
let orders = Array.from({ length: 100 }, (_, i) => wo(i + 1));
const data = {
  '/api/maintenance/work-orders': () => orders,
  '/api/schedules': [],
  '/api/maintenance/measures': { period: { days: 90, weeks: 4, start: day(-90), end: day(0) } },
  '/api/equipment': [],
  '/api/employees': [],
};

const browser = await chromium.launch({ headless: true });
const context = await fixtureContext(browser, makeHandler(data, []), { width: 1440, height: 900 });
const page = await context.newPage();
await context.newCDPSession(page).then(s => s.send('Emulation.setCPUThrottlingRate', { rate: 4 }));
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

await page.goto(`${BASE}/maintenance`, { waitUntil: 'networkidle' });
const cards = page.getByRole('button', { name: /Open work order/ });
await cards.first().waitFor({ timeout: 15000 });
const count = await cards.count();
console.log(`cards rendered: ${count}`);
if (count !== 100) { console.log(`FAIL expected 100 cards, saw ${count}`); await browser.close(); process.exit(1); }
// Let first paint settle outside any window (initial mount never animates).
await page.waitForTimeout(1000);

let failures = 0;
// Window 1: card -> detail zoom (gentle 0.45s + margin).
let t0 = await now();
await cards.first().click();
await page.getByRole('dialog').first().waitFor({ timeout: 8000 });
await page.waitForTimeout(900);
failures += report('zoom-open ', await tasksBetween(t0, await now()));

// Window 2: detail -> card shrink-back.
t0 = await now();
await page.keyboard.press('Escape');
await page.getByRole('dialog').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
await page.waitForTimeout(900);
failures += report('zoom-close', await tasksBetween(t0, await now()));

// Window 3: background-refresh insert (one new row + highlight wash).
orders = [wo(101), ...orders];
t0 = await now();
await page.evaluate(() => window.dispatchEvent(new Event('online')));
await page.getByRole('button', { name: /Open work order WO-00101/ }).waitFor({ timeout: 10000 });
await page.waitForTimeout(1600); // enter + 1.2s wash
failures += report('list-insert', await tasksBetween(t0, await now()));

await browser.close();
console.log(failures === 0 ? 'PASS perf-zoom-trace: no task over 50ms in any animation window' : `FAIL perf-zoom-trace: ${failures} tasks over 50ms`);
process.exit(failures === 0 ? 0 : 1);
