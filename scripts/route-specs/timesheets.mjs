// /timesheets: the roster grid for the NEC and salaried rosters, leave and overtime laid over entered days, entering a day, quick add and remove, bulk entry,
// fill across days from the keyboard, copying the previous period (asks before replacing), adding people, per-period notes, downloads, and honest failure.
// Mock shapes mirror the real routers.
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
// The NEC cycle the page opens on: the 13th of last month to the 12th of this one.
const start = new Date(now.getFullYear(), now.getMonth() - 1, 13);
const end = new Date(now.getFullYear(), now.getMonth(), 12);
const days = []; for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
const weekdays = days.map((d, i) => ({ d, i })).filter(x => x.d.getDay() >= 1 && x.d.getDay() <= 5);
const D = i => iso(days[i]);
const [w0, w1, w2, w3, w4, w5] = weekdays.map(x => x.i);
const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 13);

const EMP = [
  { id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter Class 1', department: 'Maintenance', employment_type: 'NEC' },
  { id: 2, employee_id: 'C200', first_name: 'Bob', last_name: 'Beta', designation: 'Electrician Class 1', department: 'Maintenance', employment_type: 'NEC' },
  { id: 3, employee_id: 'C300', first_name: 'Cy', last_name: 'Gamma', designation: 'Lamp Room Attendant', department: 'Lamp Room', employment_type: 'NEC' },
  { id: 4, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Foreman', department: 'Maintenance', employment_type: 'SALARIED' },
  { id: 5, employee_id: 'C500', first_name: 'Eve', last_name: 'Epsilon', designation: 'Welder', department: 'Workshop' },
];
const entry = (id, employee_id, date, over = {}) => ({ id, employee_id, date, status: 'work', start_time: '07:00', end_time: '17:00', regular_hours: 10, overtime_hours: 0, holiday_overtime_hours: 0, nightshift_hours: 0, standby_allowance: false, nightshift_allowance: false, total_hours: 10, notes: '', overtime_periods: [], callout_overtime_hours: 0, callout_count: 0, ...over });
const CURRENT = [entry(501, 1, D(w0))];
const PREVIOUS = [entry(700, 1, iso(new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + w0))), entry(701, 1, iso(new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + w1)))];
let created = 0; let refuseEmployees = false;

const spec = {
  route: '/timesheets',
  h1: 'Maintenance timesheets',
  data: {
    '/api/employees': () => (refuseEmployees ? { __status: 403, body: { detail: 'Not allowed (fixture)' } } : EMP),
    '/api/timesheets': request => {
      if (request.method() === 'POST') return { id: 900 + (created += 1), ...request.postDataJSON() };
      const q = new URL(request.url()).searchParams;
      return q.get('start_date') === iso(prevStart) ? PREVIOUS : CURRENT;
    },
    'PATCH /api/timesheets/501': request => ({ ...CURRENT[0], ...request.postDataJSON() }),
    'DELETE /api/timesheets/501': {},
    '/api/leaves': [{ id: 1, employee_id: 'C200', leave_type: 'annual', start_date: D(w2), end_date: D(w3), status: 'approved', reason: 'Family visit' }],
    '/api/overtime': [{ id: 1, employee_id: 'C100', overtime_type: 'regular', date: D(w1), start_time: '17:00', end_time: '19:00', hours: 2, status: 'pending', reason: 'Pump callout' }],
    '/api/standby': [],
    '/api/nec-timesheet-import/config': { requires_review_json_upload: true, extraction_provider: 'none' },
  },
  async ready(page, calls, { check, shot }) {
    const grid = page.getByRole('table', { name: /one row for each person/ });
    const cellOf = (who, i) => page.getByRole('button', { name: new RegExp(`^${who}, ${D(i)}`) });
    await grid.waitFor({ timeout: 10000 });
    check(await grid.getByRole('row').count() === 3 + 2, 'three NEC people, the header and the period totals row', String(await grid.getByRole('row').count()));
    check(await grid.getByText('Ann Alpha').isVisible() && !(await grid.getByText('Dee Delta').isVisible().catch(() => false)), 'the NEC roster shows its people only');
    check(/Leave/.test(await cellOf('Bob Beta', w2).textContent()) && /8/.test(await cellOf('Bob Beta', w2).textContent()), 'approved leave is laid over the grid as 8 hours of leave');
    check(await cellOf('Ann Alpha', w1).getByText('Pending').isVisible(), 'pending overtime is shown with its status in words');
    check(/10/.test(await cellOf('Ann Alpha', w0).textContent()), 'an entered day shows its hours');
    await shot(page, 'grid@1440');

    // roster and search
    await page.getByRole('button', { name: 'Salaried', exact: true }).click();
    await grid.getByText('Dee Delta').waitFor({ timeout: 8000 }).catch(() => {});
    check(await grid.getByText('Dee Delta').isVisible() && !(await grid.getByText('Ann Alpha').isVisible().catch(() => false)), 'the Salaried roster shows its own people');
    await page.getByRole('button', { name: 'NEC', exact: true }).click();
    await grid.getByText('Ann Alpha').waitFor({ timeout: 8000 }).catch(() => {});
    await page.getByRole('searchbox').fill('cy');
    check(await grid.getByRole('row').count() === 1 + 2, 'search narrows the roster', String(await grid.getByRole('row').count()));
    await page.getByRole('searchbox').fill('');

    // enter a day
    await cellOf('Bob Beta', w0).click();
    const dlg = page.getByRole('dialog', { name: 'Timesheet entry' });
    await dlg.waitFor({ timeout: 5000 });
    check(await dlg.getByText('Regular hours').isVisible(), 'the day opens as a work day');
    await shot(page, 'entry@1440');
    await dlg.getByRole('button', { name: 'Save entry' }).click();
    await dlg.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/timesheets').pop();
    check(post?.body.employee_id === 2 && post.body.date === D(w0) && post.body.status === 'work' && post.body.regular_hours === 10, 'saving a day sends the person, the date and the hours', JSON.stringify(post?.body).slice(0, 120));

    // quick add and quick remove
    await page.getByRole('button', { name: `Quick add a shift for Cy Gamma on ${D(w4)}` }).click({ force: true });
    await page.waitForTimeout(500);
    const quick = calls.filter(c => c.method === 'POST' && c.pathname === '/api/timesheets').pop();
    check(quick?.body.employee_id === 3 && quick.body.date === D(w4) && quick.body.regular_hours === 8, 'quick add writes the role\'s normal shift (8 hours for a lamp room attendant)', JSON.stringify(quick?.body).slice(0, 120));
    check(await page.getByText(/Saved 1 entry/).first().isVisible().catch(() => false), 'a write can be undone from its toast');
    await page.getByRole('button', { name: `Remove the entry for Ann Alpha on ${D(w0)}` }).click({ force: true });
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/timesheets/501'), 'quick remove deletes that day\'s entry');

    // fill across days from the keyboard: Enter, two arrows, Enter
    const fill = page.getByRole('row').filter({ hasText: 'Cy Gamma' }).getByRole('button', { name: `Fill from ${D(w4)}` });
    const before = calls.filter(c => (c.method === 'POST' || c.method === 'PATCH') && c.pathname.startsWith('/api/timesheets')).length;
    await fill.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check(await page.getByText(/Fill: 8h to 2 days/).isVisible(), 'the keyboard fill says what it will do');
    await shot(page, 'fill@1440');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    const after = calls.filter(c => (c.method === 'POST' || c.method === 'PATCH') && c.pathname.startsWith('/api/timesheets')).length;
    check(after - before === 2, 'filling two days writes two entries', String(after - before));

    // bulk entry
    await page.getByRole('button', { name: 'Bulk entry' }).click();
    const bulk = page.getByRole('dialog', { name: 'Bulk assign or clear shifts' });
    await bulk.waitFor({ timeout: 5000 });
    await bulk.getByRole('button', { name: 'Weekdays' }).click();
    const applyBtn = bulk.getByRole('button', { name: /^Apply \d+ entries$/ });
    check(await applyBtn.isVisible(), 'choosing the weekdays prepares the entries');
    await shot(page, 'bulk@1440');
    const wd = weekdays.length;
    check((await applyBtn.textContent()).includes(String(wd)), `one entry for each weekday for the one person selected (${wd})`, await applyBtn.textContent());
    const bulkBefore = calls.filter(c => c.method === 'POST' && c.pathname === '/api/timesheets').length;
    await applyBtn.click();
    await page.waitForTimeout(900);
    const bulkAfter = calls.filter(c => c.method === 'POST' && c.pathname === '/api/timesheets').length;
    check(bulkAfter - bulkBefore >= wd - 1, 'applying writes the entries (days that already exist are updated)', String(bulkAfter - bulkBefore));
    await bulk.getByRole('button', { name: 'Done' }).click();
    await bulk.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // add a person the roster missed
    await page.getByRole('button', { name: 'Add employees' }).click();
    const add = page.getByRole('dialog', { name: 'Add employees' });
    await add.waitFor({ timeout: 5000 });
    await add.getByRole('checkbox', { name: /Eve Epsilon/ }).check();
    await add.getByRole('button', { name: 'Add 1 employee' }).click();
    await add.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(await grid.getByText('Eve Epsilon').isVisible(), 'a person added by hand appears on the roster');

    // period notes belong to their period
    await page.getByRole('textbox', { name: /^Ann Alpha/ }).fill('Covering for Bob');
    await page.getByRole('button', { name: 'Previous period', exact: true }).click();
    await page.waitForTimeout(500);
    check((await page.getByRole('textbox', { name: /^Ann Alpha/ }).inputValue().catch(() => '')) === '', 'the next period starts without the last period\'s notes');
    await page.getByRole('button', { name: 'Next period', exact: true }).click();
    await page.waitForTimeout(500);
    check((await page.getByRole('textbox', { name: /^Ann Alpha/ }).inputValue().catch(() => '')) === 'Covering for Bob', 'and the note is still there when you come back');

    // copy previous asks before replacing
    await page.getByRole('button', { name: 'Copy previous period' }).click();
    await page.waitForTimeout(600);
    const copyConfirm = page.getByRole('alertdialog');
    if (await copyConfirm.isVisible().catch(() => false)) { check(/replacing/.test(await copyConfirm.textContent()), 'copying over existing entries says how many it replaces'); await copyConfirm.getByRole('button', { name: 'Cancel' }).click(); await copyConfirm.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {}); }
    else check(await page.getByText(/Saved \d+ entr/).first().isVisible().catch(() => false), 'copying into empty days saves the entries');

    // download
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Download' }).click();
    const dl = page.getByRole('dialog', { name: 'Download timesheet' });
    await dl.waitFor({ timeout: 5000 });
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), dl.getByRole('button', { name: 'Download' }).click()]);
    check(!!file && /^timesheet-nec-.*\.xlsx$/.test(file.suggestedFilename()), 'the Excel workbook downloads', file?.suggestedFilename());
    await file?.saveAs('node_modules/.cache/mo-audit/timesheet-export.xlsx').catch(() => {});

    // NEC import opens
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Import scans' }).click();
    const imp = page.getByRole('dialog', { name: 'Import scanned NEC timesheets' });
    await imp.waitFor({ timeout: 5000 });
    check(await imp.getByRole('button', { name: 'Start import for this period' }).isVisible(), 'the scan import opens on its first step');
    await shot(page, 'import@1440');
    await page.keyboard.press('Escape');
    await imp.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // a refused refresh says so and keeps the grid it already has (a server outage is retried automatically instead)
    refuseEmployees = true;
    await page.getByRole('button', { name: 'Refresh timesheets' }).click();
    await page.getByText('Could not load timesheets').waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByText('Could not load timesheets').isVisible() && await page.getByText('Not allowed (fixture)').first().isVisible(), 'a refused refresh shows the reason');
    check(await grid.isVisible(), 'and the grid already on screen stays');
    refuseEmployees = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.waitForTimeout(800);
    check(!(await page.getByText('Could not load timesheets').isVisible().catch(() => false)), 'Try again clears it');
  },
  empty: { data: { '/api/employees': [] }, text: 'No employees on this roster' },
};
export default spec;
