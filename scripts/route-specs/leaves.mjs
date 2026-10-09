// /leaves: leave requests (cards, table, filters, summary, detail, apply/edit, approve with a signature, bulk, delete).
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const LEAVES = [
  { id: 1, employee_id: 'E1', employee_name: 'Ann Alpha', position: 'Fitter', department: 'Mining', leave_type: 'annual', start_date: local(-1), end_date: local(3), reason: 'Rest', contact_number: '+263 77 111 1111', status: 'approved', total_days: 5, exclude_weekends_holidays: false, applied_date: new Date().toISOString() },
  { id: 2, employee_id: 'E2', employee_name: 'Ben Beta', position: 'Electrician', department: 'Mining', leave_type: 'sick', start_date: local(10), end_date: local(12), reason: 'Flu', contact_number: '+263 77 222 2222', status: 'pending', total_days: 3, exclude_weekends_holidays: false, applied_date: new Date().toISOString() },
  { id: 3, employee_id: 'E3', employee_name: 'Cy Gamma', position: 'Rigger', department: 'Plant', leave_type: 'compassionate', start_date: local(20), end_date: local(21), reason: 'Bereavement', contact_number: '+263 77 333 3333', status: 'pending', total_days: 2, exclude_weekends_holidays: true, applied_date: new Date().toISOString() },
  // A legacy record with an unknown type and status and no day count must render rather than crash.
  { id: 4, employee_id: 'E4', employee_name: 'Dee Delta', position: '', leave_type: 'mystery', start_date: local(-30), end_date: local(-28), reason: '', contact_number: '', status: 'odd', applied_date: '2026-01-01T00:00:00Z' },
];
const EMPLOYEES = [
  { id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', phone: '0771111111', department: 'Mining', supervisor: 'Sam Super' },
  { id: 5, employee_id: 'E5', first_name: 'Eve', last_name: 'Epsilon', designation: 'Welder', phone: '0775555555', department: 'Plant' },
];
let failCreate = false;
const spec = {
  route: '/leaves',
  h1: 'Leaves',
  data: {
    '/api/leaves': request => (request.method() === 'POST' ? (failCreate ? { __status: 422, body: { detail: 'End date rejected (fixture)' } } : { id: 9 }) : LEAVES),
    'PATCH /api/leaves/2': {},
    'PATCH /api/leaves/3': {},
    'DELETE /api/leaves/4': {},
    'POST /api/leaves/bulk-status': { succeeded: 2, failed: 0, updated: [] },
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View the leave request for/ });
    check(await cards.count() === 4, 'four request cards (a legacy record with an unknown type and status does not crash)');
    check(await page.getByText('Odd').first().isVisible(), 'an unrecognised status is shown as it is');
    check(await page.getByText('5 days').first().isVisible() && await page.getByText('—').first().isVisible(), 'a missing day count is a dash, not "undefined days"');
    check(await page.getByText('100% of decided').isVisible(), 'the approval rate says what it is a share of');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Pending\s*\d/ }).click();
    check(await cards.count() === 2, 'the Pending tile filters the requests');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('ben');
    check(await cards.count() === 1, 'search narrows the requests');
    await page.getByRole('searchbox').fill('');

    // the date filter matches a request that overlaps the range
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.getByLabel('Leave on or after').fill(local(2));
    await page.getByLabel('Leave on or before').fill(local(11));
    await page.keyboard.press('Escape');
    check(await cards.count() === 2, 'a request that overlaps the date range is included (Ann ends in the range, Ben starts in it)');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // table view with selection and bulk approval
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Leave requests' });
    check(await table.getByRole('row').count() === 5, 'table view lists the four requests');
    await shot(page, 'table@1440');
    await table.getByRole('row').filter({ hasText: 'Ben Beta' }).getByRole('checkbox').check();
    await table.getByRole('row').filter({ hasText: 'Cy Gamma' }).getByRole('checkbox').check();
    check(await page.getByText('2 selected, 2 pending').isVisible(), 'the bulk bar says how many selected requests are pending');
    await page.getByRole('region', { name: 'Bulk actions' }).getByRole('button', { name: 'Approve' }).click();
    await page.getByText(/Approve 2 leave requests/).first().waitFor({ timeout: 5000 });
    await shot(page, 'gate@1440');
    check(await page.getByText(/Approve 2 leave requests/).first().isVisible(), 'the signature step says what is being approved');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check(!calls.some(c => c.pathname === '/api/leaves/bulk-status'), 'dismissing the signature step approves nothing');

    // detail dialog
    await page.getByRole('button', { name: 'Card view' }).click();
    await cards.filter({ hasText: 'Ben Beta' }).click();
    const detail = page.getByRole('dialog', { name: /Leave request #2/ });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Flu').isVisible() && await detail.getByText('Electrician').isVisible(), 'the detail shows the person and the reason');
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();

    // edit: validation then save
    const edit = page.getByRole('dialog', { name: 'Edit leave request' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Contact number/).inputValue()) === '+263 77 222 2222', 'edit loads the request');
    await edit.getByLabel(/^Contact number/).fill('');
    await edit.getByRole('button', { name: 'Update request' }).click();
    check(await edit.getByText('Enter a contact number.').isVisible(), 'a missing contact number is explained');
    await edit.getByLabel(/^Contact number/).fill('0772222222');
    await edit.getByRole('button', { name: 'Update request' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/leaves/2').pop();
    check(patch?.body.contact_number && patch.body.total_days === 3, 'saving sends the edit with the day count', JSON.stringify(patch?.body).slice(0, 140));

    // delete confirms first
    await page.getByRole('button', { name: 'Table view' }).click();
    await page.getByRole('button', { name: /^Delete the leave request for Dee Delta/ }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete the leave request for Dee Delta/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/leaves/4'), 'confirming sends the delete');

    // summary
    await page.getByRole('tab', { name: 'Summary' }).click();
    check(await page.getByRole('heading', { name: 'By leave type' }).isVisible() && await page.getByRole('heading', { name: 'By employee' }).isVisible(), 'the summary tab shows both breakdowns');
    await shot(page, 'summary@1440');
  },
  create: {
    open: 'New leave request', dialog: 'New leave request', path: '/api/leaves', submit: 'Submit request',
    requiredText: 'Choose the employee.',
    async fill(dialog, page) {
      await dialog.getByRole('combobox', { name: 'Employee' }).click();
      await page.getByRole('option', { name: /Eve Epsilon/ }).click();
      await dialog.getByLabel(/^Start date/).fill(local(40));
      await dialog.getByLabel(/^End date/).fill(local(42));
    },
    async kept(dialog) { return (await dialog.getByLabel(/^Start date/).inputValue()) === local(40) && (await dialog.getByLabel(/^Contact number/).inputValue()) !== ''; },
    body: b => b.employee_id === 'E5' && b.employee_name === 'Eve Epsilon' && b.start_date === local(40) && b.status === 'pending' && b.leave_type === 'annual' && b.total_days > 0,
  },
  empty: { data: { '/api/leaves': [] }, text: 'No leave requests yet' },
  failing: { paths: ['/api/leaves'], text: 'Leave requests could not be loaded', notShown: ['No leave requests yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View the leave request for/ }).first().isVisible(), 'Try again loads the requests'); } },
};
export default spec;
