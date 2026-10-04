// /sheq_inspection: inspections register (cards, table, detail with findings and photos, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
const INSPECTIONS = [
  { id: 's1', inspectors: 'Ann Alpha, Ben Beta', title: 'Monthly safety audit', place: 'Workshop 1', date: iso(-6), time: '08:30', department: 'Engineering', section: 'mechanical', hodName: 'Cat Gamma', sheqOfficialName: '', status: 'submitted',
    before_photos: [PIXEL], after_photos: [], createdAt: iso(-6), updatedAt: iso(-6),
    findings: [
      { id: 'f1', finding: 'Guard missing on grinder', requiredAction: 'Fit a guard', byWho: 'Ben Beta', byWhen: iso(2), status: 'open', priority: 'critical', section: 'mechanical' },
      { id: 'f2', finding: 'Fire extinguisher expired', requiredAction: 'Replace', byWho: 'Cat Gamma', byWhen: iso(-3), status: 'closed', priority: 'medium', section: 'mechanical', completedDate: iso(-4), remarks: 'Replaced same day' },
    ] },
  { id: 's2', inspectors: 'Dee Delta', title: 'Substation walk-down', place: 'Substation 3', date: iso(-25), time: '14:00', department: '', section: 'electrical', hodName: '', sheqOfficialName: '', status: 'approved', before_photos: [], after_photos: [], createdAt: iso(-25), updatedAt: iso(-25), findings: [] },
];
const spec = {
  route: '/sheq_inspection',
  h1: 'SHEQ inspections',
  data: {
    '/api/sheq/': request => (request.method() === 'POST' ? { id: 'new' } : INSPECTIONS),
    'PATCH /api/sheq/s1/': {},
    'DELETE /api/sheq/s2/': {},
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining' }],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View inspection/ });
    check(await cards.count() === 2, 'two inspection cards');
    check(await page.getByText('2 (1 closed, 1 critical)').isVisible(), 'finding counts are stated in words');
    check(await page.getByText(/1 critical finding across all inspections/).isVisible(), 'critical findings are counted');
    await shot(page, 'cards@1440');
    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Approved' }).click();
    check(await cards.count() === 1, 'the status filter narrows the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'SHEQ inspections' });
    check(await table.getByRole('row').count() === 3, 'table view lists both inspections');
    await shot(page, 'table@1440');

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Inspection report' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Guard missing on grinder').isVisible() && await detail.getByText('Replaced same day').isVisible() && await detail.getByText('Critical', { exact: true }).isVisible(), 'detail lists findings with priority, status and remarks');
    check(await detail.getByText('Cat Gamma (not yet signed)').isVisible(), 'an unsigned sign-off says so');
    await page.waitForTimeout(500);
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit inspection' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Finding description \(finding 1\)/).inputValue()) === 'Guard missing on grinder', 'edit dialog loads the findings');
    await edit.getByLabel(/^Required action \(finding 2\)/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Say what action is required.').isVisible(), 'a blank finding field shows its error');
    await edit.getByLabel(/^Required action \(finding 2\)/).fill('Replace');
    await edit.getByRole('button', { name: 'Add finding' }).click();
    await edit.getByRole('button', { name: 'Remove finding 3' }).click();
    check(await edit.getByLabel(/^Completed date \(finding 1\)/).isDisabled(), 'completed date is disabled until a finding is closed');
    await edit.getByLabel(/^Inspection title/).fill('Monthly safety audit (revised)');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/sheq/s1/' && patch.body.title.includes('revised') && patch.body.findings.length === 2 && patch.body.before_photos.length === 1, 'saving sends a PATCH with the edits, findings and photos', JSON.stringify(patch?.body).slice(0, 120));
    await page.getByRole('button', { name: /^Delete inspection Substation/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete inspection Substation/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/sheq/s2/'), 'confirming sends the delete');
  },
  create: {
    open: 'New inspection', dialog: 'New inspection', path: '/api/sheq/', submit: 'Create inspection',
    requiredText: 'Enter a title.',
    async fill(dialog) { await dialog.getByLabel(/^Inspection title/).fill('Quarterly audit'); await dialog.getByLabel(/^Inspector\(s\)/).fill('Fay Zeta'); await dialog.getByLabel(/^Location/).fill('Plant'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Inspection title/).inputValue()) === 'Quarterly audit' && (await dialog.getByLabel(/^Location/).inputValue()) === 'Plant'; },
    body: b => b.title === 'Quarterly audit' && b.inspectors === 'Fay Zeta' && b.place === 'Plant' && b.status === 'draft' && b.section === 'mechanical',
  },
  empty: { data: { '/api/sheq/': [] }, text: 'No inspections yet' },
  failing: { paths: ['/api/sheq/'], text: 'SHEQ inspections could not be loaded', notShown: ['No inspections yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View inspection/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
