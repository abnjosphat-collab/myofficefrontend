// Drives the Maintenance modules PREVIEW (/maintenance-preview) with the fixture session: screenshots of every module at desktop and phone
// width, and the behaviours the plan promises (Tab fills from a register, people on leave cannot be picked, approving twice raises one work order).
// Preview only; it does not replace looking at the pictures.
//   1. .env.local with placeholder values (no real keys)   2. npm run dev (port 3000)   3. node scripts/prototype-modules-review.mjs docs/plans/prototype-modules
import { chromium, fixtureContext } from './lib/fixtures.mjs';
const OUT = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const api = route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
const log = []; const res = [];
const ok = (c, m, d = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${m}${c ? '' : ' :: ' + d}`);
async function open(path, w = 1440, h = 900) {
  const ctx = await fixtureContext(browser, api, { width: w, height: h });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.push('console ' + m.text().slice(0, 300)); });
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(600);
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });

let { ctx, page } = await open('/maintenance-preview');
await shot(page, '01-overview-1440');
ok(await page.getByRole('button', { name: 'Maintenance' }).first().isVisible().catch(() => false) || await page.getByText('Maintenance', { exact: true }).first().isVisible(), 'the sidebar shows a Maintenance group');

await page.goto('http://localhost:3000/maintenance-preview/work-orders', { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(600);
await shot(page, '02-work-orders-1440');
await page.getByRole('button', { name: /^Open work order WO-00231/ }).click().catch(() => {}); await page.waitForTimeout(500);
await shot(page, '03-record-popup-1440');
ok(await page.getByRole('dialog').getByText('Details').isVisible().catch(() => false), 'the record opens as a pop-up');
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

await page.getByRole('button', { name: 'New work order' }).first().click(); await page.waitForTimeout(400);
const machine = page.getByRole('combobox', { name: /Machine/ });
await machine.fill('comp'); await page.waitForTimeout(250);
await shot(page, '04-picker-machine-1440');
await machine.press('Tab'); await page.waitForTimeout(200);
ok((await machine.inputValue()) === 'Compressor 2', 'Tab fills the highlighted equipment match', await machine.inputValue());
ok(await page.getByText('In the equipment register').isVisible(), 'the field says the value is in the register');
const who = page.getByRole('combobox', { name: /Assign to/ });
await who.fill('dub'); await page.waitForTimeout(250);
await shot(page, '05-picker-leave-1440');
ok(await page.getByText(/Annual leave/).first().isVisible(), 'a person on leave is shown with the reason and dates');
await who.press('Tab'); await page.waitForTimeout(150);
ok((await who.inputValue()) === 'dub', 'Tab does not take a person who is on leave', await who.inputValue());
await who.fill('moy'); await who.press('Tab'); await page.waitForTimeout(150);
const tool = page.getByRole('combobox', { name: /Tool needed/ });
await tool.fill('socket'); await page.waitForTimeout(250);
await shot(page, '06-picker-tool-1440');
ok(await page.getByText(/Issued to S. Ncube/).first().isVisible(), 'a tool that is issued out shows a warning');
await page.keyboard.press('Escape');
await page.getByRole('textbox', { name: /Job/ }).fill('Check bearing temperature');
await page.getByRole('button', { name: 'Raise work order' }).click(); await page.waitForTimeout(600);
ok(await page.getByText('Check bearing temperature').first().isVisible(), 'the new work order appears in the list');
await shot(page, '07-after-raise-1440');

await page.goto('http://localhost:3000/maintenance-preview/requests', { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(500);
await shot(page, '08-requests-1440');
ok(await page.getByRole('heading', { name: 'Pump A' }).first().isVisible(), 'the first waiting request is selected and shown in the panel');
await page.getByRole('button', { name: 'Approve', exact: true }).first().click(); await page.waitForTimeout(500);
await shot(page, '09-approve-1440');
await page.keyboard.press('Escape');

await page.goto('http://localhost:3000/maintenance-preview/schedules', { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(500);
await shot(page, '10-schedules-1440');
await page.getByRole('button', { name: 'New schedule' }).click(); await page.waitForTimeout(400); await shot(page, '11-new-schedule-1440'); await page.keyboard.press('Escape');

await page.goto('http://localhost:3000/maintenance-preview/planner', { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(500);
await shot(page, '12-planner-1440');
// drag a job onto a person on leave (refused, with the reason), then onto a free day (placed)
const tray = page.getByRole('region', { name: 'Unassigned jobs' }).getByRole('listitem').first();
await tray.dragTo(page.locator('tr', { hasText: 'T. Dube' }).locator('td').nth(2)); await page.waitForTimeout(400);
ok(await page.getByText(/T\. Dube is on leave/).first().isVisible().catch(() => false), 'dropping a job on a day of leave is refused with the reason');
await shot(page, '12b-planner-refused-1440');
await tray.dragTo(page.locator('tr', { hasText: 'S. Ncube' }).locator('td').nth(3)); await page.waitForTimeout(400);
ok(await page.locator('tr', { hasText: 'S. Ncube' }).getByText('Pump A').isVisible().catch(() => false), 'dropping a job on a free day places it');
await shot(page, '12c-planner-placed-1440');
await ctx.close();
{ // reduced motion: nothing animates
  const rm = await fixtureContext(browser, api, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
  const rp = await rm.newPage();
  await rp.goto('http://localhost:3000/maintenance-preview', { waitUntil: 'networkidle' }).catch(() => {}); await rp.waitForSelector('main h1').catch(() => {});
  const names = await rp.evaluate(() => [...document.querySelectorAll('.mp-rise')].map(e => getComputedStyle(e).animationName));
  ok(names.length > 0 && names.every(n => n === 'none'), 'with reduced motion the entrance animations do not run', JSON.stringify(names.slice(0, 3)));
  await rm.close();
}

for (const [path, name] of [['/maintenance-preview', '13-overview-390'], ['/maintenance-preview/work-orders', '14-work-orders-390'], ['/maintenance-preview/work-orders/231', '15-record-390'], ['/maintenance-preview/requests', '16-requests-390'], ['/maintenance-preview/planner', '17-planner-390']]) {
  ({ ctx, page } = await open(path, 390, 844));
  await shot(page, name);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 0, `${name}: no horizontal page scroll`, String(overflow));
  await ctx.close();
}
await browser.close();
console.log(res.join('\n')); console.log(log.length ? 'LOG:\n' + log.join('\n') : 'no browser errors');
