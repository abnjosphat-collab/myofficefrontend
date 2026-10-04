// /training: certification register, refreshers, analytics, add/edit/delete.
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const CERTS = [
  { id: 1, employee_name: 'Ann Alpha', employee_id: 'E1', department: 'Safety', certification_name: 'First aid', expiry_date: iso(-10), required_refresher: 'BLS', status: 'Expired', certificate_url: 'https://example.invalid/a.pdf' },
  { id: 2, employee_name: 'Ben Beta', employee_id: 'E2', department: 'Mining', certification_name: 'Blasting', expiry_date: iso(40), required_refresher: '', status: 'Due Soon', certificate_url: null },
  { id: 3, employee_name: 'Cat Gamma', employee_id: 'E3', department: 'Mining', certification_name: 'Rigging', expiry_date: iso(400), required_refresher: '', status: 'Valid', certificate_url: null },
];
export default {
  route: '/training',
  h1: 'Training and certification',
  data: {
    '/api/training': CERTS,
    '/api/training/reports/compliance_rate': { compliance_rate: 67, total_tracked: 3, non_compliant: 1 },
    '/api/training/reports/due_refreshers': [{ refresher: 'BLS', employees_due: 3 }],
    'DELETE /api/training/1': {},
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
    await edit.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    await page.getByRole('button', { name: 'Delete First aid for Ann Alpha' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete First aid for Ann Alpha' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/training/1'), 'confirming sends the delete');
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
