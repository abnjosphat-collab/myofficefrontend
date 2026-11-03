// /ppe Rainsuit tab: the Engineering size-requirements register with its size summary, fulfilment badges,
// unmatched rows kept visible, filters, and a download of the filtered result. Mock shapes mirror the real
// router: requirements carry size_source beside size_canonical and fulfilment is derived server-side.
const rec = (id, over = {}) => ({ id: String(id), employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', department: 'Engineering', ppe_type: 'safety_shoes', item_name: 'Bata Industrial', size: '8', issue_date: '2026-08-10', expiry_date: '2027-02-10', condition: 'good', status: 'active', notes: '', issued_by: 'Store', location: 'Workshop', mine_section: 'Mechanical', ...over });
const RECS = [rec(1), rec(2, { ppe_type: 'helmet', item_name: 'MSA V-Gard', size: '' })];
const EMPLOYEES = [
  { id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'Engineering', section: 'Mechanical' },
  { id: 2, employee_id: 'C1001', first_name: 'David', last_name: 'Muronda', designation: 'Artisan', department: 'Engineering', section: 'Mechanical' },
  { id: 3, employee_id: 'C1002', first_name: 'T', last_name: 'Kapenzi', designation: 'Artisan', department: 'Engineering', section: 'Mechanical' },
];
const REQUIREMENTS = [
  { id: 'req-1', employee_id: 'C1001', source_name: 'David Muronda', employee_name: 'David Muronda', department: 'Engineering', mine_section: '', ppe_type: 'rainsuit', size_source: 'L', size_canonical: 'L', quantity: 1, status: 'required', source_ref: 'raincoat-2026-10', notes: '', fulfilled: true },
  { id: 'req-2', employee_id: 'C1002', source_name: 'T. Kapenzi', employee_name: 'T. Kapenzi', department: 'Engineering', mine_section: '', ppe_type: 'rainsuit', size_source: 'S', size_canonical: 'S', quantity: 1, status: 'required', source_ref: 'raincoat-2026-10', notes: '', fulfilled: false },
  { id: 'req-3', employee_id: null, source_name: 'Togara', employee_name: 'Togara', department: 'Engineering', mine_section: '', ppe_type: 'rainsuit', size_source: 'L', size_canonical: 'L', quantity: 1, status: 'required', source_ref: 'raincoat-2026-10', notes: 'Corrected from supplementary handwritten list', fulfilled: false },
];

const spec = {
  route: '/ppe',
  h1: 'PPE',
  async mobile(page, { shot }) {
    await page.getByRole('tab', { name: 'Rainsuits' }).click();
    await page.getByRole('table', { name: 'Rainsuit requirements' }).waitFor({ timeout: 5000 });
    await shot(page, 'rainsuit-register@390');
  },
  data: {
    '/api/ppe': RECS,
    '/api/ppe/requirements': REQUIREMENTS,
    '/api/ppe-order-list': [],
    '/api/ppe/matrix': { safety_shoes: 12, helmet: 24 },
    '/api/employees/': EMPLOYEES,
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    await page.getByRole('tab', { name: 'Rainsuits' }).click();
    const table = page.getByRole('table', { name: 'Rainsuit requirements' });
    await table.waitFor({ timeout: 5000 });
    check(await table.getByRole('row').count() === 4, 'three requirements are listed', String(await table.getByRole('row').count()));
    check(await page.getByText('L: 2').isVisible(), 'the size summary counts two L rainsuits');
    check(await page.getByText('S: 1').isVisible(), 'the size summary counts one S rainsuit');
    check(await table.getByText('Fulfilled').isVisible(), 'the issued requirement wears its fulfilled badge');
    check(await table.getByText('Not linked yet').isVisible(), 'the unmatched row stays visible with no mine number');
    check(await table.getByText('Corrected from supplementary handwritten list').isVisible(), 'verification notes stay with the row');
    check(await page.getByRole('button', { name: 'Download', exact: true }).isVisible(), 'the filtered register can be downloaded');
    check(await page.getByRole('button', { name: 'Download summary' }).isVisible(), 'the size summary can be downloaded');
    await shot(page, 'rainsuit-register@1440');

    // filters narrow the register: size, then issue state, then hiding unmatched
    await page.getByRole('combobox', { name: 'Size' }).click();
    await page.getByRole('option', { name: /^S \(/ }).click();
    check(await table.getByRole('row').count() === 2, 'the size filter shows only S rows', String(await table.getByRole('row').count()));
    await page.getByRole('combobox', { name: 'Size' }).click();
    await page.getByRole('option', { name: /^All sizes/ }).click();
    await page.getByRole('combobox', { name: 'Issue state' }).click();
    await page.getByRole('option', { name: 'Fulfilled', exact: true }).click();
    check(await table.getByRole('row').count() === 2, 'the fulfilled filter shows only the issued row', String(await table.getByRole('row').count()));
    await page.getByRole('combobox', { name: 'Issue state' }).click();
    await page.getByRole('option', { name: 'Outstanding', exact: true }).click();
    check(await table.getByRole('row').count() === 3, 'outstanding keeps the unissued and the unmatched rows', String(await table.getByRole('row').count()));
    await page.getByRole('combobox', { name: 'Issue state' }).click();
    await page.getByRole('option', { name: 'Fulfilled + outstanding' }).click();
    await page.getByRole('checkbox', { name: /Show unmatched/ }).uncheck();
    check(await table.getByRole('row').count() === 3, 'hiding unmatched drops the unlinked row', String(await table.getByRole('row').count()));
    await page.getByRole('checkbox', { name: /Show unmatched/ }).check();

    // the download carries the filtered register; keep the file for inspection
    await page.getByRole('combobox', { name: 'Size' }).click();
    await page.getByRole('option', { name: /^L \(/ }).click();
    const download = page.waitForEvent('download', { timeout: 8000 });
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    await page.getByRole('menuitem', { name: /Excel/ }).click();
    const file = await download;
    await file.saveAs('C:/tmp/shots-tools-rainsuit/rainsuit-register.xlsx');
    check((await file.path()) !== null, 'the rainsuit register downloads as a file');
  },
};

export default spec;
