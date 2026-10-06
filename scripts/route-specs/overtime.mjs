// /overtime: requests (cards, table, filters, month and employee scope), detail, create/edit/bulk, delete, the signature step,
// insights (overview, analytics, patterns with the heatmap, causes) and the weekly summary. Mock shapes mirror the real router.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const row = (id, over = {}) => ({ id, employee_name: 'Jane Doe', employee_id: 'C1', position: 'Fitter', department: 'Mining', cost_centre: 'Engineering', overtime_type: 'regular', planning_status: 'planned', payout_method: 'cash', date: local(-2), start_time: '17:00', end_time: '20:00', hours: null, reason: 'Burnet daily checks', status: 'pending', contact_number: '', spares_used: [], created_at: `${local(-2)}T08:00:00Z`, ...over });
const RECORDS = [
  row(1),
  row(2, { employee_name: 'Bo Ng', employee_id: 'C2', overtime_type: 'weekend', date: local(-3), start_time: null, end_time: null, hours: 4, reason: '', status: 'approved' }),
  // A legacy type the form no longer offers, unclassified planning, time in lieu, charged to another department.
  row(3, { employee_name: 'Cy Wu', employee_id: 'C3', overtime_type: 'emergency', planning_status: null, payout_method: 'lieu', cost_centre: 'Projects', date: local(-9), reason: 'Crusher breakdown' }),
  // A legacy record with no times, no hours and an unknown type must render rather than crash.
  { id: 4, employee_name: 'Dee Delta', employee_id: 'C4', position: 'Welder', overtime_type: 'mystery', date: local(-20), status: 'pending' },
];
const EMPLOYEES = [
  { id: 11, employee_id: 'C1', first_name: 'Jane', last_name: 'Doe', designation: 'Fitter', department: 'Mining', section: 'Mechanical', phone: '0771111111' },
  { id: 12, employee_id: 'C2', first_name: 'Bo', last_name: 'Ng', designation: 'Electrician', department: 'Mining', section: 'Electrical', phone: '0772222222' },
  { id: 15, employee_id: 'C5', first_name: 'Eve', last_name: 'Epsilon', designation: 'Welder', department: 'Plant', section: 'Civil', phone: '0775555555' },
  { id: 16, employee_id: 'C6', first_name: 'Fay', last_name: 'Zeta', designation: 'Fitter', department: 'Plant', section: 'Mechanical', phone: '0776666666' },
];
const GRID = Array.from({ length: 24 }, () => Array(7).fill(0)); GRID[17][0] = 3; GRID[8][5] = 1.5;
const ANALYSIS = {
  summary: 'Most overtime is routine daily checks after the day shift.', total_hours: 7, total_instances: 3, employees_involved: 3, sections_involved: 2, avg_hours_per_instance: 2.3, avg_hours_per_employee: 2.3, double_time_pct: 57,
  top_reasons: [{ phrase: 'daily checks', count: 2, hours: 5 }, { phrase: 'crusher breakdown', count: 1, hours: 3 }],
  category_detail: [{ category: 'daily checks', instances: 2, hours: 5, avg_hours: 2.5, pct_of_total: 70, top_weekday: 'Mon', top_employee: 'Jane Doe', top_spare: null, records: [{ employee_name: 'Jane Doe', date: local(-2), hours: 3, reason: 'Burnet daily checks' }] }],
  top_machines: [{ name: 'Crusher', count: 1, hours: 3 }], top_employees: [], top_sections: [],
  weekly_series: [{ week: 'W1', hours: 2 }, { week: 'W2', hours: 5 }], trend_direction: 'worsening', trends: [{ metric: 'hours', direction: 'worsening', insight: 'Hours are rising week on week.', older_hours: 2, newer_hours: 5 }],
  hour_weekday_hours: GRID, weekday_labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], punch_records: { '17-0': [{ employee_name: 'Jane Doe', hours: 3, reason: 'Burnet daily checks', date: local(-2) }] },
  possible_causes: [{ title: 'Recurring after-shift checks', description: 'The same task is logged as overtime every week.', severity: 'high' }],
  recommendations: [{ priority: 'immediate', action: 'Roster the daily checks into the shift', rationale: 'It recurs on most days', target: 'Mechanical section' }],
  _records_analysed: 3, generated_at: new Date().toISOString(),
};
let failSave = false; let failAnalysis = false; let refuseFor = null;

const spec = {
  route: '/overtime',
  h1: 'Overtime',
  data: {
    '/api/overtime': request => (request.method() === 'POST'
      ? (refuseFor && request.postData()?.includes(refuseFor) ? { __status: 422, body: { detail: 'Position is required (fixture)' } } : { id: 99, ...request.postDataJSON() })
      : RECORDS),
    'PATCH /api/overtime/2': request => (failSave ? { __status: 403, body: { detail: 'Manager role required (fixture)' } } : { ...RECORDS[1], ...request.postDataJSON() }),
    'DELETE /api/overtime/4': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    'DELETE /api/overtime/3': {},
    'POST /api/overtime/analyze': () => (failAnalysis ? { __status: 500, body: { detail: 'Analysis is down (fixture)' } } : ANALYSIS),
    '/api/employees': EMPLOYEES,
    '/api/spares': [{ id: 1, description: 'Bearing 6204', stock_code: 'B-6204', unit_price: 12.5, current_quantity: 4, category: 'Bearings' }],
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Overtime requests' }).getByRole('button', { name: /^Open the request/ });
    check(await cards.count() === 4, 'four request cards (a legacy record with no times, hours or known type does not crash)', String(await cards.count()));
    check(await page.getByText('4.0h').first().isVisible() && await page.getByText('Hours only').first().isVisible(), 'an hours-only request shows its hours, and one with neither shows "Hours only"');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Pending\s*\d/ }).click();
    check(await cards.count() === 3, 'the Pending tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('burnet');
    check(await cards.count() === 1, 'search matches the reason');
    await page.getByRole('searchbox').fill('');

    // table: hours column uses the same hours as the detail, bulk bar counts pending, the signature step names what it will approve
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Overtime requests' });
    check(await table.getByRole('row').count() === 5 && await table.getByText('4.0h').isVisible(), 'the table lists the requests and shows hours-only records\' hours (it used to show a dash)');
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    const bulk = page.getByRole('region', { name: 'Bulk actions' });
    check(await bulk.getByText('4 selected, 3 pending').isVisible(), 'the bulk bar says how many are pending');
    await bulk.getByRole('button', { name: 'Approve' }).click();
    await page.getByText(/Approve 3 overtime requests/).first().waitFor({ timeout: 5000 });
    check(await page.getByText(/Approve 3 overtime requests/).first().isVisible(), 'the signature step says what is being approved');
    await page.keyboard.press('Escape');
    check(!calls.some(c => c.pathname === '/api/overtime/bulk-status'), 'dismissing the signature step approves nothing');
    await bulk.getByRole('button', { name: 'Clear selection' }).click();
    await page.getByRole('button', { name: 'Card view' }).click();

    // month and employee scope
    const month = page.getByRole('group', { name: 'Filter by month' }).getByRole('button').first();
    await month.click();
    check(await month.getAttribute('aria-pressed') === 'true', 'a month shortcut scopes the dates');
    await month.click();
    await page.getByRole('combobox', { name: /^Employees/ }).click();
    await page.getByRole('option', { name: /Bo Ng/ }).click();
    check(await cards.count() === 1, 'choosing an employee shows only their requests');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // detail
    await page.getByRole('button', { name: /^Open the request from Jane Doe/ }).click();
    const det = dialog('Jane Doe');
    await det.waitFor({ timeout: 5000 });
    check(await det.getByText('3.0 hours').isVisible() && await det.getByText('17:00 to 20:00').isVisible() && await det.getByRole('button', { name: 'Approve' }).isVisible(), 'the detail shows the time, duration and the pending actions');
    await shot(page, 'detail@1440');
    await page.keyboard.press('Escape');

    // edit: switching an hours-only request to times must clear the stored hours; a refusal shows its reason
    await page.getByRole('button', { name: /^Edit the request from Bo Ng/ }).click();
    const ed = dialog('Edit overtime request');
    await ed.waitFor({ timeout: 5000 });
    check(await ed.getByRole('checkbox', { name: /Just enter the hours/ }).isChecked(), 'an hours-only request reopens in hours mode');
    check(await ed.getByText(/needs a manager/).isVisible(), 'editing an approved request says it needs a manager');
    await ed.getByRole('checkbox', { name: /Just enter the hours/ }).uncheck();
    failSave = true;
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.getByText('Manager role required (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await ed.getByText('Manager role required (fixture)').isVisible(), 'a refused save shows the server\'s reason and keeps the dialog');
    failSave = false;
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/overtime/2').pop();
    check(patch?.body.hours === null && patch.body.start_time === '17:00' && patch.body.end_time === '20:00', 'saving times clears the old hours, so they cannot win over the times', JSON.stringify(patch?.body).slice(0, 160));

    // delete confirms; a refusal shows the reason
    await page.getByRole('button', { name: /^Delete the request from Dee Delta/ }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete the request from Dee Delta/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/The request was not deleted: Manager role required/).isVisible(), 'a refused delete shows the server\'s reason');

    // bulk entry: one refused person stays with the reason, the saved one leaves the list
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Bulk entry' }).click();
    const bk = dialog('Bulk overtime');
    await bk.waitFor({ timeout: 5000 });
    await bk.getByRole('button', { name: 'Submit' }).click();
    check(await bk.getByText('Add at least one employee.').isVisible(), 'submitting with nobody chosen is explained');
    for (const who of [/Eve Epsilon/, /Fay Zeta/]) { await bk.getByRole('combobox', { name: /^Employees/ }).click(); await page.getByRole('option', { name: who }).click(); }
    refuseFor = 'Fay Zeta';
    await bk.getByRole('button', { name: 'Submit 2 requests' }).click();
    await bk.getByText(/1 submitted, 1 not saved/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await bk.getByText(/Fay Zeta: Position is required \(fixture\)/).isVisible() && await bk.getByRole('button', { name: 'Submit 1 request' }).isVisible(), 'a refused person is named with the reason and only they stay for a retry');
    await shot(page, 'bulk-error@1440');
    refuseFor = null;
    await bk.getByRole('button', { name: 'Cancel' }).click();

    // insights
    await page.getByRole('tab', { name: 'Insights' }).click();
    check(await page.getByText('Total hours').first().isVisible() && await page.getByRole('heading', { name: 'Top employees' }).isVisible(), 'the overview shows the headline numbers and top employees');
    await shot(page, 'insights@1440');
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByRole('heading', { name: 'By overtime type' }).isVisible() && await page.getByRole('heading', { name: 'By weekday' }).isVisible(), 'analytics lists types, statuses, sections and weekdays');
    await page.getByRole('tab', { name: 'Patterns' }).click();
    await page.getByRole('heading', { name: 'Most common reasons' }).waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByText('Most overtime is routine').isVisible() && await page.getByRole('heading', { name: 'When overtime happens' }).isVisible(), 'patterns show the analysis summary and the heatmap');
    await page.getByRole('button', { name: /^Mon 17:00, 3\.0 hours/ }).click();
    check(await page.getByRole('region', { name: 'Entries for the chosen cell' }).getByText('Jane Doe').isVisible(), 'choosing a heatmap cell lists the entries behind it');
    await shot(page, 'patterns@1440');
    await page.getByRole('tab', { name: 'Causes and actions' }).click();
    check(await page.getByText('Recurring after-shift checks').isVisible() && await page.getByText('Roster the daily checks into the shift').isVisible(), 'causes and actions are listed with their severity and priority in words');
    failAnalysis = true;
    await page.getByRole('button', { name: 'Run the analysis again' }).click();
    await page.getByText(/The analysis could not be refreshed/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByText(/Analysis is down \(fixture\)/).isVisible(), 'a failed re-run keeps the last result and says why');
    failAnalysis = false;

    // weekly summary
    await page.getByRole('tab', { name: 'Weekly summary' }).click();
    await page.getByLabel('From', { exact: true }).fill(local(-30));
    await page.getByLabel('To', { exact: true }).fill(local(0));
    const grid = page.getByRole('table', { name: /^Overtime hours per person per day/ });
    await grid.waitFor({ timeout: 5000 });
    check(await page.getByText(/leaves out 1 record charged to another department/).isVisible(), 'other cost centres are left out and the summary says so');
    check(await page.getByRole('heading', { name: 'Main reason, by person' }).isVisible() && await page.getByRole('heading', { name: 'Overtime by person' }).isVisible(), 'each person\'s main reason and entries are listed');
    await shot(page, 'weekly@1440');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.getByRole('button', { name: 'Download Excel' }).click()]);
    check(!!download && /OT_Weekly_Summary/.test(download.suggestedFilename()), 'Download Excel produces the workbook', download?.suggestedFilename());
  },
  create: {
    open: 'New request', dialog: 'New overtime request', path: '/api/overtime', submit: 'Submit request',
    requiredText: 'Enter the employee name.',
    async fill(dialog, page) {
      await dialog.getByRole('combobox', { name: /^Pick an employee/ }).click();
      await page.getByRole('option', { name: /Eve Epsilon/ }).click();
      await dialog.getByLabel(/^Reason/).fill('Replace conveyor belt');
    },
    async kept(dialog) { return (await dialog.getByLabel(/^Employee ID/).inputValue()) === 'C5' && (await dialog.getByLabel(/^Reason/).inputValue()) === 'Replace conveyor belt'; },
    body: b => b.employee_id === 'C5' && b.employee_name === 'Eve Epsilon' && b.position === 'Welder' && b.reason === 'Replace conveyor belt' && b.start_time === '17:00' && b.end_time === '20:00' && !('hours' in b) && b.planning_status === 'planned' && b.payout_method === 'cash' && b.cost_centre === 'Engineering' && b.status === 'pending',
  },
  empty: { data: { '/api/overtime': [] }, text: 'No overtime requests yet' },
  failing: { paths: ['/api/overtime'], text: 'Overtime requests could not be loaded', notShown: ['No overtime requests yet'], async recovered(page, { check }) { check(await page.getByRole('list', { name: 'Overtime requests' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
