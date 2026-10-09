// /near_miss: near miss register (table, filters, detail, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const REPORTS = [
  { id: 'a1', department: 'Mining', section: 'Mechanical', date: iso(-3), time: '09:15', location: 'North pit ramp', description: 'A guard came loose on a conveyor during inspection.', witnessDetails: 'Ben Beta', reporterName: 'Ann Alpha', submittedAt: iso(-3) },
  { id: 'a2', department: 'Engineering', section: 'Electrical', date: iso(-10), time: '', location: 'Workshop 2', description: 'Flash seen at a distribution board.', witnessDetails: '', reporterName: '', submittedAt: iso(-10) },
  { id: 'a3', department: 'Safety', section: 'General', date: iso(-20), time: '14:00', location: 'Stores yard', description: 'Slipped on a wet surface near the stores.', witnessDetails: '', reporterName: 'Ann Alpha', submittedAt: iso(-20) },
];
const spec = {
  route: '/near_miss',
  h1: 'Near miss',
  data: {
    '/api/nearmiss/': request => (request.method() === 'POST' ? { id: 'new' } : REPORTS),
    'PATCH /api/nearmiss/a1': {},
    'DELETE /api/nearmiss/a2': {},
    '/api/lookup-lists/location': [{ value: 'Workshop 2' }],
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining' }],
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Near miss reports' });
    check(await table.getByRole('row').count() === 4, 'header plus three reports');
    check(await table.getByText('Mechanical', { exact: true }).isVisible() && await table.getByText('Electrical', { exact: true }).isVisible(), 'section is a labelled badge');
    check(!(await page.getByText('Invalid Date').isVisible().catch(() => false)), 'a missing time never renders as "Invalid Date"');
    check(await table.getByText('Anonymous').isVisible(), 'a report without a reporter reads Anonymous');
    check(await page.getByRole('region', { name: 'Reports by reporter' }).getByText('Ann Alpha · 2').isVisible(), 'reports are counted per reporter');
    await page.getByRole('button', { name: 'Electrical', exact: false }).filter({ hasText: /^Electrical/ }).first().click();
    check(await table.getByRole('row').count() === 2, 'the Electrical tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('stores');
    check(await table.getByRole('row').count() === 2, 'search matches the location');
    await page.getByRole('searchbox').fill('');

    // detail, then edit -> PATCH, then delete with confirmation
    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Near miss report' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('A guard came loose on a conveyor during inspection.').isVisible() && await detail.getByText('Ben Beta').isVisible(), 'detail shows the description and the witness');
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit near miss report' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Location/).inputValue()) === 'North pit ramp', 'edit dialog loads the report');
    await edit.getByLabel(/^Location/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Enter where it happened.').isVisible(), 'clearing a required field shows its error');
    await edit.getByLabel(/^Location/).fill('South pit ramp');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/nearmiss/a1' && patch.body.location === 'South pit ramp', 'saving sends a PATCH with the edit', JSON.stringify(patch?.body).slice(0, 120));
    await page.getByRole('button', { name: /^Delete report from Engineering/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete report from Engineering/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/nearmiss/a2'), 'confirming sends the delete');
  },
  create: {
    open: 'New report', dialog: 'New near miss report', path: '/api/nearmiss/', submit: 'Submit report',
    requiredText: 'Enter where it happened.',
    async fill(dialog) { await dialog.getByLabel(/^Location/).fill('Crusher plant'); await dialog.getByLabel(/^Description of incident/).fill('Rock fell near the walkway.'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Location/).inputValue()) === 'Crusher plant' && (await dialog.getByLabel(/^Description of incident/).inputValue()) === 'Rock fell near the walkway.'; },
    body: b => b.location === 'Crusher plant' && b.department === 'Engineering' && b.section === 'General',
  },
  empty: { data: { '/api/nearmiss/': [] }, text: 'No near miss reports yet' },
  failing: { paths: ['/api/nearmiss/'], text: 'Near miss reports could not be loaded', notShown: ['No near miss reports yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Near miss reports' }).isVisible(), 'Try again loads the register'); } },
};

export default spec;
