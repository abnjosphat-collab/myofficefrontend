// /employees: the personnel register (cards grouped by section and trade, table, filters, archived), detail, add/edit, delete,
// the organised roster export, the registry download and the roster clean-up. Mock shapes mirror the real router.
const emp = (id, over = {}) => ({ id, employee_id: `C${id}`, first_name: 'Ann', last_name: 'Alpha', id_number: `ID-${id}`, email: '', phone: '', address: '', date_of_engagement: '2020-03-01', designation: 'Fitter', employee_class: 'Permanent', employment_type: 'NEC', supervisor: '', section: 'Mechanical', department: '', grade: '', qualifications: [], offences: ['Late 2025'], awards_recognition: [], other_positions: [], previous_employer: '', archived: false, ...over });
const EMPLOYEES = [
  emp(1, { phone: '+263 77 111 1111', email: 'ann@example.test', qualifications: ['Class 1 Fitter'] }),
  emp(2, { first_name: 'Bo', last_name: 'Beta', employment_type: 'SALARIED', employee_class: 'Contract' }),
  emp(3, { first_name: 'Cy', last_name: 'Gamma', designation: 'Electrician', section: 'Electrical', employee_class: 'Permanent', employment_type: 'NEC' }),
  emp(4, { first_name: 'Dee', last_name: 'Delta', designation: 'Hoist Driver', section: '', archived: true }),
  // A legacy record with almost nothing on it must render rather than crash.
  { id: 5, employee_id: 'C5', first_name: 'Eve', last_name: 'Epsilon' },
  // A non-standard title and phone number the clean-up would change.
  emp(6, { first_name: 'Fay', last_name: 'Zeta', designation: 'Assistant Fitter', phone: '0771234567', employment_type: '', employee_class: '' }),
];
let failNormalise = false;

const spec = {
  route: '/employees',
  h1: 'Personnel',
  data: {
    '/api/employees': request => (request.method() === 'POST' ? { id: 99, ...request.postDataJSON() } : EMPLOYEES),
    'PUT /api/employees/1': request => ({ ...EMPLOYEES[0], ...request.postDataJSON() }),
    'DELETE /api/employees/2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    'POST /api/employees/bulk-normalize': () => (failNormalise ? { succeeded: 0, failed: 1, errors: ['Update refused (fixture)'] } : { succeeded: 1, failed: 0 }),
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const open = page.getByRole('button', { name: /^Open / });
    check(await open.filter({ hasText: /./ }).count() >= 0 && await page.getByRole('heading', { name: /^Mechanical/ }).isVisible() && await page.getByRole('heading', { name: /^Electrical/ }).isVisible(), 'the people are grouped under their sections');
    check(await page.getByRole('button', { name: 'Open Ann Alpha' }).isVisible() && await page.getByRole('button', { name: 'Open Eve Epsilon' }).isVisible(), 'a legacy record with almost nothing on it renders');
    check(!(await page.getByRole('button', { name: 'Open Dee Delta' }).isVisible().catch(() => false)), 'archived people are hidden from the active roster');
    await shot(page, 'cards@1440');

    // a section collapses and reopens
    const mech = page.getByRole('button', { name: /^Mechanical/ });
    await mech.click();
    check(await mech.getAttribute('aria-expanded') === 'false' && !(await page.getByRole('button', { name: 'Open Ann Alpha' }).isVisible().catch(() => false)), 'collapsing a section hides its people');
    await mech.click();

    // tiles filter; search; archived people are found when asked for
    await page.getByRole('button', { name: /^Salaried\s*\d/ }).click();
    check(await page.getByRole('button', { name: 'Open Bo Beta' }).isVisible() && !(await page.getByRole('button', { name: 'Open Ann Alpha' }).isVisible().catch(() => false)), 'the Salaried tile filters the roster');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('delta');
    await page.getByText('No one matches').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('No one matches').isVisible(), 'an archived person is not in the active results');
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.getByRole('combobox', { name: 'Show' }).click();
    await page.getByRole('option', { name: 'Everyone' }).click();
    await page.keyboard.press('Escape');
    check(await page.getByRole('button', { name: 'Open Dee Delta' }).isVisible() && await page.getByText('Archived', { exact: true }).first().isVisible(), 'asking for everyone finds them, marked Archived');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // table
    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Personnel' }).getByRole('row').count() === 6, 'table view lists the active people');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail: shows contact and tenure, never offence records
    await page.getByRole('button', { name: 'Open Ann Alpha' }).click();
    const det = dialog('Ann Alpha');
    await det.waitFor({ timeout: 5000 });
    check(await det.getByRole('link', { name: '+263 77 111 1111' }).isVisible() && await det.getByText('Class 1 Fitter').isVisible() && !(await det.getByText('Late 2025').isVisible().catch(() => false)), 'the detail shows contact details and qualifications but not offence records');
    await shot(page, 'detail@1440');
    await det.getByRole('button', { name: 'Edit', exact: true }).click();

    // edit: a missing required field is explained on its field; saving sends a null date when it is cleared
    const ed = dialog('Edit Ann Alpha');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^First name/).fill('');
    await ed.getByLabel(/^Date of engagement/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    check(await ed.getByText('Enter the first name.').isVisible(), 'a missing first name is explained on its field');
    await ed.getByLabel(/^First name/).fill('Anna');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/employees/1').pop();
    check(put?.body.first_name === 'Anna' && put.body.date_of_engagement === null && put.body.phone === '+263 77 111 1111', 'saving sends the change, a cleared date as null and the phone in one format', JSON.stringify(put?.body).slice(0, 140));

    // delete: confirm first; a refusal shows the reason
    await page.getByRole('button', { name: 'Delete Bo Beta' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Bo Beta' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not deleted: Manager role required/).isVisible(), 'a refused delete shows the server\'s reason');

    // organised roster export
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Organised roster' }).click();
    const ro = dialog('Download the organised roster');
    await ro.waitFor({ timeout: 5000 });
    check(await ro.getByText(/3 groups, 5 people/).isVisible(), 'the export previews how many groups and people it will hold');
    await shot(page, 'roster@1440');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), ro.getByRole('button', { name: 'Download' }).click()]);
    check(!!dl && /Personnel_By_Section_and_Profession/.test(dl.suggestedFilename()), 'Download produces the organised workbook', dl?.suggestedFilename());
    await ro.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});

    // registry download
    const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), (async () => { await page.getByRole('button', { name: 'More' }).click(); await page.getByRole('menuitem', { name: 'Registry (Excel)', exact: true }).click(); })()]);
    check(!!dl2 && /Personnel_Registry/.test(dl2.suggestedFilename()), 'the registry download produces a workbook', dl2?.suggestedFilename());

    // normalise: shows what it will change; a refused batch says so
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Normalise' }).click();
    const nr = dialog('Normalise the roster');
    await nr.waitFor({ timeout: 5000 });
    check(await nr.getByText('Fay Zeta').isVisible() && await nr.getByRole('heading', { name: 'Changes to be made' }).locator('xpath=..').getByText('Fitter Assistant').isVisible(), 'it lists each change before making it');
    await shot(page, 'normalise@1440');
    failNormalise = true;
    await nr.getByRole('button', { name: /^Normalise \d+ records?/ }).click();
    await nr.getByText(/Update refused \(fixture\)/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await nr.getByText(/Update refused \(fixture\)/).isVisible(), 'a refused batch says so inside the dialog');
    failNormalise = false;
    await nr.getByRole('button', { name: /^Normalise \d+ records?/ }).click();
    await nr.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    check(calls.filter(c => c.method === 'POST' && c.pathname === '/api/employees/bulk-normalize').length === 2, 'a second attempt sends the batch again');
  },
  create: {
    open: 'Add employee', dialog: 'Add an employee', path: '/api/employees', submit: 'Add employee',
    requiredText: 'Enter the mine number.',
    async fill(dialog, page) {
      await dialog.getByLabel(/^Mine number/).fill('c77');
      await dialog.getByLabel(/^ID number/).fill('ID-77');
      await dialog.getByLabel(/^First name/).fill('Gus');
      await dialog.getByLabel(/^Last name/).fill('Theta');
      await dialog.getByRole('combobox', { name: /^Designation/ }).click();
      await page.getByRole('option', { name: 'Fitter Class 1', exact: true }).click();
    },
    async kept(dialog) { return (await dialog.getByLabel(/^First name/).inputValue()) === 'Gus' && (await dialog.getByLabel(/^Mine number/).inputValue()) === 'C77'; },
    body: b => b.employee_id === 'C77' && b.first_name === 'Gus' && b.designation === 'Fitter Class 1' && b.section === 'Mechanical' && b.date_of_engagement === null && b.archived === false,
  },
  empty: { data: { '/api/employees': [] }, text: 'No employees yet' },
  failing: { paths: ['/api/employees'], text: 'Personnel could not be loaded', notShown: ['No employees yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^Open / }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
