// /vfl: visible felt leadership observations (cards, table, detail with status change, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const REPORTS = [
  { id: 'v1', observerName: 'Ann Alpha', designation: 'Safety Officer', sectionChoice: 'Mechanical', departmentSection: 'Engineering', date: iso(-3), time: '09:30', behaviourCategory: 'Unsafe Behaviour', observationType: 'At Risk Behaviour', description: 'Technician working without isolation.', coachingTechnique: 'SBR', status: 'submitted', created_at: iso(-3),
    actions: [
      { id: 'x1', action: 'Refresh isolation training', responsible: 'Ben Beta', targetDate: iso(7), status: 'Pending' },
      { id: 'x2', action: 'Toolbox talk', responsible: 'Cat Gamma', targetDate: iso(1), status: 'Completed', completedDate: iso(0), remarks: 'Whole shift attended' },
    ] },
  { id: 'v2', observerName: 'Dee Delta', designation: '', sectionChoice: 'Electrical', departmentSection: '', date: iso(-20), time: 'not-a-time', behaviourCategory: 'Safe Behaviour', observationType: 'Safe Condition', description: 'Board correctly labelled and locked.', coachingTechnique: null, status: 'closed', created_at: iso(-20), actions: [] },
  { id: 'v3', observerName: 'Eve Epsilon', designation: 'Foreman', sectionChoice: 'Plant', departmentSection: 'Mining', date: iso(-40), time: '14:00', behaviourCategory: 'Safe Behaviour', observationType: 'Safe Behaviour', description: 'Legacy record with an unrecognised section.', coachingTechnique: 'CC', status: 'draft', created_at: iso(-40), actions: [] },
];
const spec = {
  route: '/vfl',
  h1: 'Visible felt leadership',
  data: {
    '/api/vfl/': request => (request.method() === 'POST' ? { id: 'new' } : REPORTS),
    'PATCH /api/vfl/v1/': {},
    'DELETE /api/vfl/v2/': {},
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining', designation: 'Safety Officer' }],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View VFL observation for/ });
    check(await cards.count() === 3, 'three observation cards (an unrecognised section does not crash the page)');
    check(!(await page.getByText('Invalid Date').isVisible().catch(() => false)) && !(await page.getByText(/undefined/).isVisible().catch(() => false)), 'a bad time or missing technique never renders as "Invalid Date" or "undefined"');
    check(await page.getByText('Not specified').first().isVisible(), 'a missing coaching technique reads Not specified');
    await shot(page, 'cards@1440');
    await page.getByRole('button', { name: /^Closed/ }).first().click();
    check(await cards.count() === 1, 'the Closed tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Unsafe/ }).click();
    check(await cards.count() === 1, 'the Unsafe behaviour filter narrows the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'VFL observations' });
    check(await table.getByRole('row').count() === 4, 'table view lists the three observations');
    await shot(page, 'table@1440');

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Visible felt leadership observation' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Refresh isolation training').isVisible() && await detail.getByText(/Whole shift attended/).isVisible(), 'detail lists each action with its status and remarks');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('combobox', { name: 'Change status' }).click();
    await page.getByRole('option', { name: 'Reviewed' }).click();
    await page.waitForTimeout(500);
    const statusPatch = calls.filter(c => c.method === 'PATCH').pop();
    check(statusPatch?.pathname === '/api/vfl/v1/' && statusPatch.body.status === 'reviewed', 'changing status sends a PATCH with the new status', JSON.stringify(statusPatch?.body));
    check(await detail.getByText('Reviewed', { exact: true }).first().isVisible(), 'the open dialog shows the new status at once');

    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit VFL observation' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Action description \(action 1\)/).inputValue()) === 'Refresh isolation training', 'edit dialog loads the actions');
    await edit.getByLabel(/^Action description \(action 2\)/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Describe the action.').isVisible(), 'a blank action field shows its error');
    await edit.getByLabel(/^Action description \(action 2\)/).fill('Toolbox talk');
    await edit.getByLabel(/^Description/).fill('Technician working without isolation, now coached.');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/vfl/v1/' && patch.body.description.includes('now coached') && patch.body.actions.length === 2 && patch.body.updated_at, 'saving sends a PATCH with the edits and both actions', JSON.stringify(patch?.body).slice(0, 120));
    await page.getByRole('button', { name: /^Delete VFL observation for Dee Delta/ }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete VFL observation for Dee Delta/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/vfl/v2/'), 'confirming sends the delete');
  },
  create: {
    open: 'New observation', dialog: 'New VFL observation', path: '/api/vfl/', submit: 'Save observation',
    requiredText: 'Describe the observation.',
    async fill(dialog) { await dialog.getByLabel(/^Observer's name/).fill('Fay Zeta'); await dialog.getByLabel(/^Description/).fill('Good housekeeping at the workshop.'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Observer's name/).inputValue()) === 'Fay Zeta' && (await dialog.getByLabel(/^Description/).inputValue()) === 'Good housekeeping at the workshop.'; },
    body: b => b.observerName === 'Fay Zeta' && b.description === 'Good housekeeping at the workshop.' && b.status === 'submitted' && !!b.submitted_at && b.coachingTechnique === 'SBR',
  },
  empty: { data: { '/api/vfl/': [] }, text: 'No VFL observations yet' },
  failing: { paths: ['/api/vfl/'], text: 'VFL observations could not be loaded', notShown: ['No VFL observations yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View VFL observation for/ }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
