// /artisan-timesheets: selecting an artisan opens their month straight into the Quick view (a new month is filled from approved leave,
// overtime (approved or paid), standby and public holidays, a saved one comes back as saved), pending items show without counting,
// a settled draft autosaves itself, unsaved changes are protected, and a saved timesheet opens and deletes from its list.
const EMP = [
  { id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter Class 1', id_number: '12-345', employment_type: 'SALARIED' },
  { id: 2, employee_id: 'C200', first_name: 'Bob', last_name: 'Beta', designation: 'Electrician Class 1', employment_type: 'SALARIED' },
  { id: 3, employee_id: 'C300', first_name: 'Cy', last_name: 'Gamma', designation: 'Clerk', employment_type: 'HOURLY' },
];
const SAVED = [{ id: 5, employee_id: 'C100', employee_db_id: 1, employee_name: 'Ann Alpha', id_number: '12-345', year: 2026, month: 1, shift_rate: 12.5, hourly_rate: null, daily_rows: [{ date: '2026-01-05', day: 'Mon', day_status: '', normal_hrs: 10, ot_15: 2, ot_20: 0, sb_15: 0, sb_20: 0, night_shift: 0, on_standby: false, sign_in_time: '', sign_in_signature: '', sign_out_time: '', sign_out_signature: '', comments: 'Pump callout' }], compiled_by: 'Lee Foreman', updated_at: '2026-01-31T10:00:00Z' }];
const listHandler = request => {
  if (request.method() === 'POST') return { id: 99, ...request.postDataJSON() };
  const q = new URL(request.url()).searchParams;
  return SAVED.filter(s => (!q.get('employee_id') || s.employee_id === q.get('employee_id')) && (!q.get('year') || s.year === Number(q.get('year'))) && (!q.get('month') || s.month === Number(q.get('month'))));
};
const pickOption = async (page, trigger, name) => { await trigger.click(); await page.getByRole('option', { name, exact: true }).click(); };

const spec = {
  route: '/artisan-timesheets',
  h1: 'Artisan timesheets',
  data: {
    '/api/employees': EMP,
    '/api/artisan-timesheets': listHandler,
    'GET /api/artisan-timesheets/5': SAVED[0],
    'PATCH /api/artisan-timesheets/5': request => ({ ...SAVED[0], ...request.postDataJSON() }),
    'PATCH /api/artisan-timesheets/99': request => ({ id: 99, ...request.postDataJSON() }),
    'DELETE /api/artisan-timesheets/5': { success: true },
    '/api/leaves': [{ id: 1, employee_id: 'C100', leave_type: 'annual', start_date: '2026-02-10', end_date: '2026-02-11', status: 'approved', reason: 'Family visit' }],
    '/api/overtime': [
      { employee_id: 'C100', overtime_type: 'regular', date: '2026-02-12', start_time: '17:00', end_time: '19:00', status: 'paid', reason: 'Paid callout' },
      { employee_id: 'C100', overtime_type: 'regular', date: '2026-02-13', start_time: '17:00', end_time: '18:00', status: 'pending', reason: 'Awaiting signoff' },
    ],
    '/api/standby': [],
  },
  async ready(page, calls, { check, shot }) {
    const glance = () => page.getByRole('table', { name: /Every day of the month/ });
    check(await page.getByText('Open a month to begin').isVisible(), 'nothing is open until an artisan is chosen');
    await page.getByRole('combobox', { name: 'Artisan' }).click();
    check(!(await page.getByRole('option', { name: /Cy Gamma/ }).isVisible().catch(() => false)) && await page.getByRole('option', { name: /Ann Alpha/ }).isVisible(), 'only salaried artisans are offered (an hourly clerk is not)');
    await page.getByRole('option', { name: /Ann Alpha/ }).click();
    await glance().waitFor({ timeout: 8000 });
    check(await glance().isVisible(), 'selecting an artisan opens their month in the Quick view without Open month');
    await pickOption(page, page.getByRole('combobox', { name: 'Month' }), 'February');
    await pickOption(page, page.getByRole('combobox', { name: 'Year' }), '2026');
    await page.getByRole('button', { name: 'Open month' }).click();
    await glance().waitFor({ timeout: 8000 });
    check(await glance().getByRole('row').count() === 28 + 3, 'a new February has 28 day rows, a header, a totals row and a pending footnote');
    check(await page.getByRole('row', { name: /^10 Feb 2026/ }).getByRole('cell').nth(2).textContent() === '8.00', 'approved leave carries 8 normal hours on the day');
    check(await page.getByRole('row', { name: /^21 Feb 2026/ }).getByRole('cell').nth(3).textContent() === '0.00' && await page.getByRole('row', { name: /^21 Feb 2026/ }).getByRole('cell').nth(4).textContent() === '0.00', 'there is no overtime on a public holiday');
    check(await page.getByRole('row', { name: /^12 Feb 2026/ }).getByRole('cell').nth(3).textContent() === '2.00', 'paid overtime counts like approved overtime');
    check(await page.getByText('Pending').isVisible(), 'overtime awaiting approval is flagged on the day');
    check(await page.getByText('Excludes 1.00h overtime awaiting approval — counted once approved.').isVisible(), 'pending hours are footnoted, not totalled');
    await shot(page, 'quick@1440');

    // a standby toggle marks the draft unsaved; a manual save posts it
    await page.getByRole('checkbox', { name: 'Standby on 3 Feb 2026' }).click();
    check(await page.getByText('Unsaved changes', { exact: true }).isVisible(), 'the page says there are unsaved changes');
    await page.getByRole('button', { name: 'Save timesheet' }).click();
    await page.waitForTimeout(600);
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/artisan-timesheets').pop();
    check(post?.body.employee_id === 'C100' && post.body.year === 2026 && post.body.month === 2 && post.body.daily_rows.length === 28 && post.body.shift_rate === null, 'saving sends the month, all its days and blank rates as null', JSON.stringify(post?.body).slice(0, 120));
    check(await page.getByRole('button', { name: 'Update timesheet' }).isVisible(), 'once saved the action becomes Update');

    // a settled draft saves itself without a click
    await page.getByRole('checkbox', { name: 'Standby on 4 Feb 2026' }).click();
    await page.getByText('Saved', { exact: true }).waitFor({ timeout: 10000 });
    check(calls.some(c => c.method === 'PATCH' && c.pathname === '/api/artisan-timesheets/99'), 'letting the draft settle autosaves it');

    // unsaved changes are protected when another month is opened
    await page.getByRole('checkbox', { name: 'Standby on 5 Feb 2026' }).click();
    await page.getByRole('button', { name: 'Open month' }).click();
    const c1 = page.getByRole('alertdialog'); await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    await c1.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(await page.getByText('Unsaved changes', { exact: true }).isVisible(), 'cancelling the discard prompt keeps the edits');
    await page.getByText('Saved', { exact: true }).waitFor({ timeout: 10000 });

    // saved list, open, delete
    await page.getByRole('tab', { name: 'Saved timesheets' }).click();
    check(await page.getByRole('table', { name: 'Saved artisan timesheets' }).getByText('January 2026').isVisible(), 'saved timesheets are listed by period');
    check(calls.some(c => c.method === 'GET' && c.pathname === '/api/artisan-timesheets' && /summary=true/.test(c.query)), 'the saved list asks for the summary (no days or signatures)');
    await shot(page, 'saved@1440');
    await page.getByRole('button', { name: 'Open', exact: true }).first().click();
    await glance().waitFor({ timeout: 8000 });
    check(calls.some(c => c.method === 'GET' && c.pathname === '/api/artisan-timesheets/5'), 'opening a saved timesheet fetches it in full');
    check(await page.getByRole('row', { name: /^5 Jan 2026/ }).getByRole('cell').nth(2).textContent() === '10.00', 'a saved timesheet opens with its figures as saved');
    await page.getByRole('tab', { name: 'Day cards' }).click();
    check(await page.getByText('Pump callout').isVisible(), 'the saved comment shows on the day card');
    await page.getByRole('tab', { name: 'Saved timesheets' }).click();
    await page.getByRole('button', { name: /^Delete the timesheet of Ann Alpha for January 2026/ }).click();
    const c2 = page.getByRole('alertdialog'); await c2.waitFor({ timeout: 5000 });
    await c2.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/artisan-timesheets/5'), 'deleting asks first, then deletes');
  },
  empty: { data: { '/api/employees': [] }, text: 'No artisan employees found' },
  failing: { paths: ['/api/employees'], text: 'artisans could not be loaded', notShown: ['No artisan employees found'], async recovered(page, { check }) { await page.getByRole('combobox', { name: 'Artisan' }).waitFor({ timeout: 8000 }).catch(() => {}); check(await page.getByRole('combobox', { name: 'Artisan' }).isVisible(), 'Try again loads the artisans'); } },
};
export default spec;
