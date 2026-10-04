// /artisan-timesheets: choose an artisan and a month, open it (a new month is filled from approved leave and public holidays, a saved one
// comes back as saved), edit, save, refuse an impossible figure, protect unsaved changes, delete a saved one, and say when a source failed.
const EMP = [
  { id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter Class 1', id_number: '12-345' },
  { id: 2, employee_id: 'C200', first_name: 'Bob', last_name: 'Beta', designation: 'Electrician Class 1' },
  { id: 3, employee_id: 'C300', first_name: 'Cy', last_name: 'Gamma', designation: 'Clerk' },
];
const SAVED = [{ id: 5, employee_id: 'C100', employee_db_id: 1, employee_name: 'Ann Alpha', id_number: '12-345', year: 2026, month: 1, shift_rate: 12.5, hourly_rate: null, daily_rows: [{ date: '2026-01-05', day: 'Mon', day_status: '', normal_hrs: 10, ot_15: 2, ot_20: 0, sb_15: 0, sb_20: 0, night_shift: 0, on_standby: false, sign_in_time: '', sign_in_signature: '', sign_out_time: '', sign_out_signature: '', comments: 'Pump callout' }], compiled_by: 'Lee Foreman', updated_at: '2026-01-31T10:00:00Z' }];
let failSave = false;
const listHandler = request => {
  if (request.method() === 'POST') return failSave ? { __status: 409, body: { detail: 'A timesheet for this employee, month, and year already exists (fixture).' } } : { id: 99, ...request.postDataJSON() };
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
    'DELETE /api/artisan-timesheets/5': { success: true },
    '/api/leaves': [{ id: 1, employee_id: 'C100', leave_type: 'annual', start_date: '2026-02-10', end_date: '2026-02-11', status: 'approved', reason: 'Family visit' }],
    '/api/overtime': [], '/api/standby': [],
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Open a month to begin').isVisible(), 'nothing is open until a month is chosen');
    await page.getByRole('combobox', { name: 'Artisan' }).click();
    check(!(await page.getByRole('option', { name: /Cy Gamma/ }).isVisible().catch(() => false)) && await page.getByRole('option', { name: /Ann Alpha/ }).isVisible(), 'only artisans are offered (a clerk is not)');
    await page.getByRole('option', { name: /Ann Alpha/ }).click();
    await pickOption(page, page.getByRole('combobox', { name: 'Month' }), 'February');
    await pickOption(page, page.getByRole('combobox', { name: 'Year' }), '2026');
    await page.getByRole('button', { name: 'Open month' }).click();
    await page.getByRole('table', { name: /one row for each day/ }).waitFor({ timeout: 8000 });
    check(await page.getByRole('table', { name: /one row for each day/ }).getByRole('row').count() === 28 + 2, 'a new February has 28 day rows, a header and a totals row');
    check(await page.getByLabel('Status on 10 Feb 2026').inputValue() === 'leave' && await page.getByLabel('Status on 11 Feb 2026').inputValue() === 'leave', 'approved leave marks the days');
    check(await page.getByLabel('O/T @ 2.0 on 21 Feb 2026').inputValue() === '8.00', 'a public holiday is credited at double time');
    await shot(page, 'grid@1440');

    // an impossible figure cannot be saved, a good one can
    await page.getByLabel('O/T @ 1.5 on 3 Feb 2026').fill('30');
    await page.getByRole('button', { name: 'Save timesheet' }).click();
    check(await page.getByText('Fix these before saving').isVisible() && await page.getByText(/not a possible number of hours/).first().isVisible(), 'a daily figure over 24 hours is refused with the reason');
    await page.getByLabel('O/T @ 1.5 on 3 Feb 2026').fill('2.5');
    check((await page.getByLabel('O/T @ 1.5 on 3 Feb 2026').inputValue()) === '2.5', 'a decimal can be typed without being rewritten under the cursor');
    check(await page.getByText('Unsaved changes').first().isVisible(), 'the page says there are unsaved changes');
    await page.getByRole('button', { name: 'Save timesheet' }).click();
    await page.waitForTimeout(600);
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/artisan-timesheets').pop();
    check(post?.body.employee_id === 'C100' && post.body.year === 2026 && post.body.month === 2 && post.body.daily_rows.length === 28 && post.body.shift_rate === null, 'saving sends the month, all its days and blank rates as null', JSON.stringify(post?.body).slice(0, 120));
    check(await page.getByRole('button', { name: 'Update timesheet' }).isVisible(), 'once saved the action becomes Update');

    // copy down by keyboard
    await page.getByRole('button', { name: /^Copy Normal Hrs down from day 1$/ }).press('Enter');
    check(await page.getByText(/Copied Normal Hrs to 27 days/).first().isVisible().catch(() => false), 'a column can be copied to the end of the month from the keyboard');

    // unsaved changes are protected when another month is opened
    await page.getByRole('button', { name: 'Open month' }).click();
    const c1 = page.getByRole('alertdialog'); await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    await c1.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(await page.getByText('Unsaved changes').first().isVisible(), 'cancelling the discard prompt keeps the edits');

    // saved list, open, delete
    await page.getByRole('button', { name: 'Update timesheet' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Saved timesheets' }).click();
    check(await page.getByRole('table', { name: 'Saved artisan timesheets' }).getByText('January 2026').isVisible(), 'saved timesheets are listed by period');
    check(calls.some(c => c.method === 'GET' && c.pathname === '/api/artisan-timesheets' && /summary=true/.test(c.query)), 'the saved list asks for the summary (no days or signatures)');
    await shot(page, 'saved@1440');
    await page.getByRole('button', { name: 'Open', exact: true }).first().click();
    await page.getByRole('table', { name: /one row for each day/ }).waitFor({ timeout: 8000 });
    check(calls.some(c => c.method === 'GET' && c.pathname === '/api/artisan-timesheets/5'), 'opening a saved timesheet fetches it in full');
    check(await page.getByLabel('Normal Hrs on 5 Jan 2026').inputValue() === '10.00' && await page.getByLabel(/^Shift rate/).inputValue() === '12.5', 'a saved timesheet opens as it was saved');
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
