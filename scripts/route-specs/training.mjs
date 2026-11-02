// /training: certification register, refreshers, analytics, add/edit/delete.
const pad2 = n => String(n).padStart(2, '0');
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }; // local date, like the app's daysUntil
const CERTS = [
  { id: 1, employee_name: 'Ann Alpha', employee_id: 'E1', department: 'Safety', certification_name: 'First aid', expiry_date: iso(-10), required_refresher: 'BLS', status: 'Expired', certificate_url: 'https://example.invalid/a.pdf' },
  { id: 2, employee_name: 'Ben Beta', employee_id: 'E2', department: 'Mining', certification_name: 'Blasting', expiry_date: iso(40), required_refresher: '', status: 'Due Soon', certificate_url: null },
  { id: 3, employee_name: 'Cat Gamma', employee_id: 'E3', department: 'Mining', certification_name: 'Rigging', expiry_date: iso(400), required_refresher: '', status: 'Valid', certificate_url: null },
];
const REGISTER = [
  { id: 1, employee_id: 'C1165', first_name: 'Ed', last_name: 'Echo', designation: 'Fitter Class 1', section: 'Mechanical', department: 'Engineering', id_number: '63-1234567-A1' },
  { id: 2, employee_id: 'C1166', first_name: 'Fay', last_name: 'Foxtrot', designation: 'Electrician', section: 'Electrical', department: 'Engineering', id_number: '08-7654321-B2' },
];
const spec = {
  route: '/training',
  h1: 'Training',
  data: {
    '/api/training': CERTS,
    '/api/training/reports/compliance_rate': { compliance_rate: 67, total_tracked: 3, non_compliant: 1 },
    '/api/training/reports/due_refreshers': [{ refresher: 'BLS', employees_due: 3 }],
    'DELETE /api/training/1': {},
    'POST /api/training': { id: 999 },
    '/api/employees': REGISTER,
    'POST /api/training/bulk': {
      batch_id: 'b1', total: 2, created: 1, skipped: 0, failed: 1,
      results: [
        { employee_id: 'C1165', outcome: 'created', record_id: 'n1', uncertain: false },
        { employee_id: 'C1166', outcome: 'failed', reason: 'No save confirmation received.', uncertain: true },
      ],
    },
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Certification register' });
    check(await table.getByRole('row').count() === 4, 'header plus three certifications');
    check(/Ann Alpha/.test(await table.getByRole('row').nth(1).innerText()), 'expired certifications are listed first');
    check(await table.getByText('Expired', { exact: true }).isVisible() && await table.getByText('Due soon', { exact: true }).isVisible(), 'status is a labelled badge');
    check(await table.getByText(/10 days overdue/).isVisible(), 'overdue time is stated in words');
    check(await page.getByText('67%').first().isVisible(), 'compliance rate from the service is shown');
    await page.getByRole('combobox', { name: 'Filter by department' }).click();
    await page.getByRole('option', { name: 'Mining' }).click();
    check(await table.getByRole('row').count() === 3, 'department filter narrows the register');
    await page.getByRole('combobox', { name: 'Filter by department' }).click();
    await page.getByRole('option', { name: 'All departments' }).click();

    await page.getByRole('tab', { name: 'Refreshers due' }).click();
    check(await page.getByText('3 employees').isVisible(), 'refreshers tab lists the refresher and how many are due');
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText('Compliance by department').isVisible() && await page.getByText(/Overall compliance: 67%/).isVisible(), 'analytics tab shows department and overall compliance');
    await shot(page, 'analytics@1440');
    await page.getByRole('tab', { name: 'Certification register' }).click();

    // edit validation, then delete with confirmation
    await page.getByRole('button', { name: 'Edit Blasting for Ben Beta' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit certification' });
    await edit.waitFor({ timeout: 5000 });
    await edit.getByLabel(/^Employee name/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Enter the employee name.').isVisible(), 'clearing a required field shows its error');
    await edit.getByRole('button', { name: 'Cancel' }).click();
    const dc = page.getByRole('alertdialog');
    await dc.waitFor({ timeout: 5000 });
    check(await dc.getByText(/Discard the changes/).isVisible(), 'cancelling a dirty edit asks before discarding');
    await dc.getByRole('button', { name: 'Discard changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByRole('button', { name: 'Delete First aid for Ann Alpha' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete First aid for Ann Alpha' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/training/1'), 'confirming sends the delete');

    // bulk certification entry: validation, trade filter, select-all, review, partial result
    await page.getByRole('button', { name: 'Bulk entry' }).click();
    const bulk = page.getByRole('dialog', { name: 'Certifications for several people' });
    await bulk.waitFor({ timeout: 5000 });
    await bulk.getByRole('button', { name: 'Record certifications' }).click();
    check(await bulk.getByText('Add at least one employee.').isVisible(), 'bulk entry requires people');
    await bulk.getByRole('combobox', { name: 'Trade' }).click();
    await page.getByRole('option', { name: 'Fitter Class 1' }).click();
    await page.waitForTimeout(500);
    check(await bulk.getByRole('button', { name: 'Select all 1' }).isVisible(), 'trade filter narrows to Fitter Class 1');
    await bulk.getByRole('combobox', { name: 'Trade' }).click();
    await page.getByRole('option', { name: 'All trades' }).click();
    await bulk.getByRole('button', { name: 'Select all 2' }).click();
    await page.waitForTimeout(500);
    check((await bulk.innerText()).includes('2 picked'), 'select-all adds everyone the filters match');
    check(await bulk.getByText('Review (2)').isVisible(), 'chosen people are reviewable before sending');
    await bulk.getByRole('list', { name: 'Chosen people, review' }).getByRole('button', { name: 'Remove' }).first().click();
    await page.waitForTimeout(500);
    check((await bulk.innerText()).includes('1 picked'), 'one person can be removed from the review');
    await bulk.getByRole('button', { name: 'Select all 1' }).click();
    await bulk.getByLabel(/^Certification/).fill('Safety induction');
    await bulk.getByLabel(/^Training date/).fill(iso(0));
    await bulk.getByLabel(/^Expiry date/).fill(iso(200));
    await bulk.getByRole('button', { name: 'Record 2 certifications' }).click();
    await page.waitForTimeout(700);
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/training/bulk').pop();
    check(post?.body?.items?.length === 2, 'bulk sends one entry per person', JSON.stringify(post?.body).slice(0, 200));
    check(await bulk.getByText('Not confirmed', { exact: true }).isVisible(), 'uncertain outcomes are reported, not hidden');
    await page.waitForTimeout(500);
    check((await bulk.innerText()).includes('1 picked'), 'confirmed rows leave the retry list');
    await shot(page, 'bulk@1440');
    await bulk.getByRole('button', { name: 'Cancel' }).click();
    const bdc = page.getByRole('alertdialog');
    await bdc.waitFor({ timeout: 5000 });
    await bdc.getByRole('button', { name: 'Discard changes' }).click();
    await bulk.waitFor({ state: 'hidden', timeout: 5000 });

    // no-expiry save + register autofill (trade, section, department, national ID)
    await page.getByRole('button', { name: 'Add certification' }).click();
    const add = page.getByRole('dialog', { name: 'Add certification' });
    await add.waitFor({ timeout: 5000 });
    await add.getByLabel(/^Employee name/).fill('Ed Echo');
    await add.getByLabel(/^Employee ID/).fill('C1165');
    check((await add.innerText()).includes('Fitter Class 1'), 'trade autofills from the register');
    check((await add.innerText()).includes('63-1234567-A1'), 'national ID autofills from the register');
    await add.getByLabel(/^Certification name/).fill('Induction');
    await add.getByRole('checkbox', { name: 'Does not expire' }).click();
    check((await add.getByLabel(/^Expiry date/).count()) === 0, 'no-expiry hides the expiry date');
    await add.getByRole('button', { name: 'Save certification' }).click();
    await add.waitFor({ state: 'hidden', timeout: 5000 });
    check(true, 'no-expiry save closes the dialog');
  },
  async mobile(page, { check, shot, expectNoOverflow }) {
    await page.getByRole('button', { name: 'Bulk entry' }).click();
    const bulk = page.getByRole('dialog', { name: 'Certifications for several people' });
    await bulk.waitFor({ timeout: 5000 });
    await bulk.getByRole('button', { name: 'Select all 2' }).click();
    check((await bulk.innerText()).includes('2 picked'), 'bulk selection works at 390px');
    check(await bulk.getByText('Review (2)').isVisible(), 'the review list reads at 390px');
    await expectNoOverflow(page, 'bulk@390');
    await shot(page, 'bulk@390');
    await page.keyboard.press('Escape');
  },
  create: {
    open: 'Add certification', dialog: 'Add certification', path: '/api/training', submit: 'Save certification',
    requiredText: 'Enter the employee name.',
    async fill(dialog) { await dialog.getByLabel(/^Employee name/).fill('Dee Delta'); await dialog.getByLabel(/^Employee ID/).fill('E9'); await dialog.getByLabel(/^Certification name/).fill('Confined space'); await dialog.getByLabel(/^Expiry date/).fill(iso(200)); },
    async kept(dialog) { return (await dialog.getByLabel(/^Employee name/).inputValue()) === 'Dee Delta'; },
    body: () => true,
  },
  empty: { data: { '/api/training': [], '/api/training/reports/compliance_rate': { compliance_rate: 0, total_tracked: 0, non_compliant: 0 }, '/api/training/reports/due_refreshers': [] }, text: 'No certifications yet' },
  failing: { paths: ['/api/training'], text: 'Certifications could not be loaded', notShown: ['No certifications yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Certification register' }).isVisible(), 'Try again loads the register'); } },
};

export default spec;
