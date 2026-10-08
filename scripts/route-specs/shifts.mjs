// /shifts: shift assignments (cards, table, filters), the four-week schedule with events, detail, assign/edit/remove.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const ASSIGNMENTS = [
  { id: 1, employee_id: '11', employee_name: 'Ann Alpha', designation: 'Fitter', department: 'Mining', shift_type: '10-4', on_days: 10, off_days: 4, cycle_start_date: local(-3), is_active: true, shift_label: 'day', shift_hours: '07:00–17:00', day_overrides: [{ id: 'ev1', from: local(2), to: local(3), type: 'annual_leave', note: 'Family' }], standby_periods: [], shift_timing_periods: [], created_at: '2026-09-01T00:00:00Z' },
  { id: 2, employee_id: '12', employee_name: 'Ben Beta', designation: 'Electrician', department: 'Mining', shift_type: 'standby', on_days: 0, off_days: 0, cycle_start_date: local(-10), is_active: true, day_overrides: [], standby_periods: [], shift_timing_periods: [], created_at: '2026-09-02T00:00:00Z' },
  { id: 3, employee_id: '13', employee_name: 'Cy Gamma', department: 'Plant', shift_type: '5-2', on_days: 5, off_days: 2, cycle_start_date: local(-5), is_active: true, standby_periods: [{ from: local(1), to: local(2) }], shift_timing_periods: [], day_overrides: [], created_at: '2026-09-03T00:00:00Z' },
  // A legacy record with an unknown pattern and missing numbers must render rather than crash.
  { id: 4, employee_id: '14', employee_name: 'Dee Delta', shift_type: 'weird', on_days: null, off_days: null, cycle_start_date: local(-1), is_active: true, created_at: '2026-09-04T00:00:00Z' },
];
const LEAVES = [{ id: 1, employee_id: '13', employee_name: 'Cy Gamma', leave_type: 'Sick Leave', start_date: local(4), end_date: local(5), status: 'approved' }];
const EMPLOYEES = [{ id: 31, employee_id: 'E31', first_name: 'Eve', last_name: 'Epsilon', designation: 'Welder', department: 'Plant', phone: '0775555555' }];
let failEvents = false;
const spec = {
  route: '/shifts',
  h1: 'Shifts',
  data: {
    '/api/standby': request => (request.method() === 'POST' ? { id: 99 } : ASSIGNMENTS),
    'PUT /api/standby/1': () => (failEvents ? { __status: 422, body: { detail: 'Events rejected (fixture)' } } : {}),
    'PUT /api/standby/3': {},
    'DELETE /api/standby/4': {},
    '/api/leaves': LEAVES,
    '/api/duty-roster': [],
    '/api/duty-rotations': [],
    '/api/rotation-covers': [],
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View .*assignment$/ });
    check(await cards.count() === 4, 'four assignment cards (a legacy record with an unknown pattern does not crash)');
    check(await page.getByText('On duty', { exact: true }).first().isVisible() && await page.getByText('Standby', { exact: true }).first().isVisible(), 'today\'s status is stated in words');
    check(await page.getByText('in 2 days', { exact: true }).first().isVisible(), 'an off-duty person shows the real number of days until their next on day, not a percentage');
    check(await page.getByText('Cycle not set').first().isVisible(), 'a legacy record with no cycle says so instead of "on, off"');
    check(await page.getByText('No duty official named for this week.').isVisible(), 'an empty duty week says so');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Standby\s*\d/ }).click();
    check(await cards.count() === 1, 'the Standby tile filters to who is on standby today');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('cy');
    check(await cards.count() === 1, 'search narrows the roster');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Shift assignments' });
    check(await table.getByRole('row').count() === 5, 'table view lists the four assignments');
    await page.getByRole('button', { name: 'Card view' }).click();

    // the schedule: a cell states what it is, and an event can be added
    await page.getByRole('tab', { name: 'Four-week schedule' }).click();
    const grid = page.getByRole('table', { name: /Shift schedule for/ });
    check(await grid.getByRole('row').count() === 6, 'the schedule has a month row, a day row and a row per person');
    check(await grid.getByText('AL').first().isVisible(), 'a scheduled leave event shows as AL in the grid');
    check(await grid.getByRole('button', { name: /^Cy Gamma, .*Sick leave, approved/ }).first().isVisible(), 'a leave from the leave register is synced into the grid and named in words');
    await shot(page, 'schedule@1440');
    await page.getByRole('button', { name: /^Ann Alpha, .*Add or edit an event/ }).nth(8).click();
    const ev = page.getByRole('dialog', { name: 'Schedule event' });
    await ev.waitFor({ timeout: 5000 });
    await ev.getByLabel(/^To/).fill('2000-01-01');
    await ev.getByRole('button', { name: 'Add event' }).click();
    check(await ev.getByText('The last day cannot be before the first.').isVisible(), 'a last day before the first is explained');
    failEvents = true;
    await ev.getByLabel(/^To/).fill(local(9));
    await ev.getByRole('button', { name: 'Add event' }).click();
    await ev.getByText('Events rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await ev.getByText(/Events rejected \(fixture\)/).isVisible(), 'a refused save shows the reason and keeps the dialog open');
    failEvents = false;
    await ev.getByRole('button', { name: 'Add event' }).click();
    await ev.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/standby/1').pop();
    check(put?.body.day_overrides.length === 2 && put.body.day_overrides.some(e => e.type === 'annual_leave' && e.from === local(9) || e.from > local(3)), 'saving sends the person\'s whole event list with the new event', JSON.stringify(put?.body).slice(0, 160));

    // detail, edit
    await page.getByRole('tab', { name: 'Assignments' }).click();
    await cards.filter({ hasText: 'Ann Alpha' }).click();
    const detail = page.getByRole('dialog', { name: 'Ann Alpha' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Scheduled events').isVisible() && await detail.getByText('Family').isVisible(), 'the detail lists the scheduled events');
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit assignment' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit assignment' });
    await edit.waitFor({ timeout: 5000 });
    await edit.getByRole('button', { name: 'Add period' }).click();
    await edit.getByLabel('Standby 1 from').fill(local(8));
    await edit.getByLabel('Standby 1 to').fill(local(7));
    await edit.getByRole('button', { name: 'Update assignment' }).click();
    check(await edit.getByText(/the end cannot be before the start/).first().isVisible(), 'a standby period that ends before it starts is explained');
    await edit.getByLabel('Standby 1 to').fill(local(9));
    await edit.getByRole('button', { name: 'Update assignment' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put2 = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/standby/1').pop();
    check(put2?.body.standby_periods?.length === 1 && put2.body.shift_type === '10-4', 'saving sends the edit with the standby period', JSON.stringify(put2?.body).slice(0, 140));

    // remove confirms first
    await page.getByRole('button', { name: "Remove Dee Delta's assignment" }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation removes nothing');
    await page.getByRole('button', { name: "Remove Dee Delta's assignment" }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/standby/4'), 'confirming sends the delete');
  },
  create: {
    open: 'Assign shift', dialog: 'Assign shift', path: '/api/standby', submit: 'Assign shift',
    requiredText: 'Choose the employee or enter their ID and name.',
    async fill(dialog, page) {
      await dialog.getByRole('combobox', { name: 'Employee' }).click();
      await page.getByRole('option', { name: /Eve Epsilon/ }).click();
    },
    async kept(dialog) { return (await dialog.getByLabel(/^Employee ID/).inputValue()) === '31'; },
    body: b => b.employee_id === '31' && b.employee_name === 'Eve Epsilon' && b.shift_type === '10-4' && b.on_days === 10 && b.off_days === 4 && /^\d{4}-\d{2}-\d{2}$/.test(b.cycle_start_date),
  },
  empty: { data: { '/api/standby': [] }, text: 'No shifts assigned yet' },
  failing: { paths: ['/api/standby'], text: 'Shift assignments could not be loaded', notShown: ['No shifts assigned yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View .*assignment$/ }).first().isVisible(), 'Try again loads the roster'); } },
};
export default spec;
