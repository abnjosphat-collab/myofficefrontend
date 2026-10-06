// Drives the Maintenance workflow PROTOTYPE (/maintenance-prototype) with the fixture session and records what it sees: Tab autofill,
// the leave-availability picker, refusals, the data states, approval, the schedule preview, and phone width. Prototype only; it checks
// behaviour and takes screenshots, it does not replace looking at them.
//   1. .env.local with placeholder values (no real keys):  NEXT_PUBLIC_SUPABASE_URL=https://fixture.invalid  NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture
//   2. npm run dev   (port 3000)
//   3. CHROME=/path/to/chromium node scripts/prototype-maintenance-review.mjs docs/plans/prototype
import { chromium, fixtureContext } from './lib/fixtures.mjs';
const OUT = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const api = route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
const log = []; const res = [];
const ok = (c, m, d = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${m}${c ? '' : ' :: ' + d}`); };
async function open(w = 1440, h = 900) {
  const ctx = await fixtureContext(browser, api, { width: w, height: h });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.push('console ' + m.text().slice(0, 300)); });
  await page.goto('http://localhost:3000/maintenance-prototype', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForSelector('main h1', { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(700);
  return { ctx, page };
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
let { ctx, page } = await open();

// --- Assignment picker with leave (the record is a pop-up, so set the conflict switch on the page first)
await page.getByText('Prototype controls').click(); await page.getByLabel('Next work order save conflicts').check(); await page.getByText('Prototype controls').click();
await page.getByPlaceholder('Search machine, number or person').fill('WO-00227'); await page.waitForTimeout(300); await page.getByRole('button', { name: /^Open work order WO-00227/ }).click();
await page.waitForTimeout(400);
ok(await page.getByText('The assigned person is now on leave').isVisible(), 'record shows the assignee-on-leave banner');
await page.getByRole('tab', { name: /Assignments/ }).click();
await page.getByRole('button', { name: 'Assign someone' }).first().click();
const dlg = page.getByRole('dialog', { name: 'Assign someone' });
const person = dlg.getByRole('combobox');
await person.click(); await person.pressSequentially('c'); await page.waitForTimeout(300);
ok(await page.getByRole('option', { name: /Chipo Example/ }).isVisible(), 'person on leave is listed, not hidden');
ok(await page.getByRole('option', { name: /Chipo Example/ }).getAttribute('aria-disabled') === 'true', 'person on leave is aria-disabled');
ok(await page.getByText(/On annual leave,.*\(approved\)/).first().isVisible(), 'reason and dates are shown');
await shot(page, '04-picker-leave');
await person.fill(''); await person.pressSequentially('ed'); await page.waitForTimeout(200);
await person.press('Tab'); await page.waitForTimeout(200);
ok((await person.inputValue()) === 'Edith Example', 'Tab fills the first AVAILABLE match (pending-leave person)', await person.inputValue());
await person.fill(''); await person.pressSequentially('Chipo Example'); await person.press('Tab');
ok((await person.inputValue()).startsWith('Chipo'), 'typed full name stays', await person.inputValue());
await dlg.getByRole('button', { name: 'Assign', exact: true }).click(); await page.waitForTimeout(500);
ok(await dlg.getByText(/cannot be assigned/).first().isVisible(), 'submitting a person on leave is refused inline with the reason');
await shot(page, '05-picker-refused');
await person.fill(''); await person.pressSequentially('Alex Example'); await person.press('Tab');
await dlg.getByRole('button', { name: 'Assign', exact: true }).click(); await page.waitForTimeout(900);
ok(await page.getByRole('table', { name: 'Assignments' }).getByText('Alex Example').isVisible(), 'an available person is assigned and appears in the table');
// --- Record: complete needs signature, permits block start
await page.getByRole('tab', { name: 'Permits' }).click();
ok(await page.getByText('The job cannot start yet').isVisible(), 'flagged permits without reference are explained');
await shot(page, '06-record-permits');
await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(700);
ok(await page.getByText(/reference is needed for/).isVisible(), 'Start is refused in place with the missing permit named (no confirm dialog first)');
// version conflict keeps the typed value
await page.getByRole('tab', { name: 'Basic info' }).click();
const desc = page.locator('textarea').first(); await desc.fill('My edited description');
await page.getByRole('button', { name: 'Save changes' }).click(); await page.waitForTimeout(700);
ok(await page.getByText('Changed by someone else').isVisible(), 'a save conflict shows who changed it');
ok((await desc.inputValue()) === 'My edited description', 'the typed value is kept after a conflict');
await shot(page, '06b-conflict');
await shot(page, '07-record-1440');
await ctx.close();

// --- States
for (const [value, label] of [['loading', /^Loading/], ['retrying', /^Retrying/], ['error', /^Failed \(400/], ['forbidden', /^Forbidden/], ['empty', /^Empty/], ['stale', /^Failed refresh/]]) {
  ({ ctx, page } = await open());
  await page.getByText('Prototype controls').click(); await page.getByLabel('Data state').click(); await page.getByRole('option', { name: label }).click(); await page.waitForTimeout(500);
  await shot(page, `08-state-${value}`);
  const text = await page.locator('main').innerText();
  if (value === 'error' || value === 'forbidden') ok(!/No work orders yet/.test(text), `${value}: failure is not shown as an empty list`);
  if (value === 'error') ok(/could not be loaded/.test(text), 'error: failure message shown');
  if (value === 'retrying' || value === 'loading') ok(!/No work orders yet/.test(text), `${value}: never claims empty`);
  if (value === 'empty') ok(/No work orders yet/.test(text), 'empty: honest empty state');
  if (value === 'stale') ok(/may be out of date/.test(text), 'stale: rows kept with warning');
  await ctx.close();
}
// --- Requests + approval
({ ctx, page } = await open());
await page.getByRole('tab', { name: 'Requests' }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Review' }).first().click(); await page.waitForTimeout(400);
const rd = page.getByRole('dialog');
ok(await rd.getByRole('button', { name: 'Approve and raise work order' }).isVisible(), 'approval dialog shown');
await shot(page, '09-approval');
await rd.getByRole('button', { name: 'Approve and raise work order' }).click(); await page.waitForTimeout(300);
ok(await rd.isVisible(), 'approve without a signature does not submit');
await page.keyboard.press('Escape');
await page.getByRole('tab', { name: 'Schedules' }).click();
await page.getByRole('button', { name: 'New schedule' }).click();
const sd = page.getByRole('dialog', { name: 'New schedule' });
const m = sd.getByRole('combobox').nth(0); await m.click(); await m.pressSequentially('pum'); await m.press('Tab'); await sd.getByRole('button', { name: 'Add machine' }).click(); await page.waitForTimeout(1200);
ok(await sd.getByRole('table', { name: 'Next occurrences' }).isVisible(), 'projection preview renders rows');
await shot(page, '10-schedule-preview');
await ctx.close();
// --- phone
({ ctx, page } = await open(390, 844));
await shot(page, '11-list-390');
const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(over <= 0, 'phone 390: no horizontal page scroll', `${over}px`);
await page.getByPlaceholder('Search machine, number or person').fill('WO-00231'); await page.waitForTimeout(300); await page.getByRole('button', { name: /^Open work order WO-00231/ }).click(); await page.waitForTimeout(500);
await shot(page, '12-record-390');
ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'phone 390 record: no horizontal page scroll');
await ctx.close();
console.log(res.join('\n')); console.log(log.length ? 'BROWSER ERRORS:\n' + log.join('\n') : 'no browser errors');
await browser.close();
