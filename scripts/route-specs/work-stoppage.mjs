// /work_stoppage: stoppage register (cards, table, detail with corrective actions, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const REPORTS = [
  { id: 'w1', date: iso(-5), department: 'Mining', section: 'Mechanical', description: 'Worker below an unsupported load.', investigationFindings: 'No lifting plan.', stoppageBy: 'Ann Alpha', stoppagePosition: 'Safety Officer', acceptedBy: 'Ben Beta', sheqCheckedBy: '',
    correctiveActions: [
      { id: 'a1', finding: 'No lifting plan', action: 'Write a lifting plan', byWho: 'Ben Beta', byWhen: iso(-1), status: 'Pending' },
      { id: 'a2', finding: 'Untrained rigger', action: 'Rigging refresher', byWho: 'Cat Gamma', byWhen: iso(10), status: 'Completed', completedDate: iso(-2), remarks: 'Done on site' },
    ], submittedAt: iso(-5) },
  { id: 'w2', date: iso(-30), department: 'Engineering', section: 'Electrical', description: 'Open distribution board.', investigationFindings: '', stoppageBy: 'Dee Delta', stoppagePosition: '', acceptedBy: '', sheqCheckedBy: '', correctiveActions: [], submittedAt: iso(-30) },
  { id: 'w3', date: iso(-60), department: 'Stores', section: 'Unknown', description: 'Legacy record with an unrecognised section.', investigationFindings: '', stoppageBy: 'Eve Epsilon', stoppagePosition: '', acceptedBy: '', sheqCheckedBy: '', correctiveActions: [], submittedAt: iso(-60) },
];
const spec = {
  route: '/work_stoppage',
  h1: 'Work stoppages',
  data: {
    '/api/work-stoppage/': request => (request.method() === 'POST' ? { id: 'new' } : REPORTS),
    'PATCH /api/work-stoppage/w1': {},
    'DELETE /api/work-stoppage/w2': {},
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining', designation: 'Safety Officer' }],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View .* report of/ });
    check(await cards.count() === 3, 'three report cards (an unrecognised section does not crash the page)');
    check(await page.getByText('1 overdue').first().isVisible(), 'an overdue action is called out on the card');
    check(await page.getByText('1 of 2 completed').first().isVisible(), 'action progress is stated in words');
    await shot(page, 'cards@1440');
    await page.getByRole('button', { name: /^Overdue/ }).click();
    check(await cards.count() === 1, 'the Overdue tile filters to reports with an overdue action');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Work stoppages' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three reports');
    await shot(page, 'table@1440');

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Work stoppage report' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Write a lifting plan').first().isVisible() && await detail.getByText(/Done on site/).isVisible() && await detail.getByText('Overdue', { exact: true }).isVisible(), 'detail lists each corrective action with its status and remarks');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit work stoppage' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Finding or issue \(action 1\)/).inputValue()) === 'No lifting plan', 'edit dialog loads the corrective actions');
    await edit.getByLabel(/^Finding or issue \(action 2\)/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Describe the finding.').isVisible(), 'a blank action field shows its error');
    await edit.getByLabel(/^Finding or issue \(action 2\)/).fill('Untrained rigger');
    await edit.getByRole('button', { name: 'Add action' }).click();
    check(await edit.getByLabel(/^Finding or issue \(action 3\)/).isVisible(), 'Add action appends a new action');
    await edit.getByRole('button', { name: 'Remove action 3' }).click();
    await edit.getByLabel(/^Description of unsafe act/).fill('Worker below an unsupported load, now escalated.');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/work-stoppage/w1' && patch.body.description.includes('escalated') && patch.body.correctiveActions.length === 2, 'saving sends a PATCH with the edits and both actions', JSON.stringify(patch?.body).slice(0, 120));
    await page.getByRole('button', { name: /^Delete Engineering report of/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete Engineering report of/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/work-stoppage/w2'), 'confirming sends the delete');
  },
  create: {
    open: 'Issue stoppage', dialog: 'New work stoppage', path: '/api/work-stoppage/', submit: 'Issue work stoppage',
    requiredText: 'Describe the unsafe act.',
    async fill(dialog) { await dialog.getByLabel(/^Description of unsafe act/).fill('Guard removed from a crusher.'); await dialog.getByLabel(/^Stoppage issued by/).fill('Fay Zeta'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Description of unsafe act/).inputValue()) === 'Guard removed from a crusher.' && (await dialog.getByLabel(/^Stoppage issued by/).inputValue()) === 'Fay Zeta'; },
    body: b => b.description === 'Guard removed from a crusher.' && b.stoppageBy === 'Fay Zeta' && b.section === 'General' && Array.isArray(b.correctiveActions),
  },
  empty: { data: { '/api/work-stoppage/': [] }, text: 'No work stoppages issued' },
  failing: { paths: ['/api/work-stoppage/'], text: 'Work stoppages could not be loaded', notShown: ['No work stoppages issued'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View .* report of/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
