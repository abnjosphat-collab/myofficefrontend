// /safety_complaints: complaints register (table, filters, analytics tab, detail, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const COMPLAINTS = [
  { id: 'c1', date: iso(-4), raisedBy: 'Ann Alpha', issueRaised: 'Guard missing from a rotating shaft.', category: 'Safety', priority: 'critical', section: 'Mechanical', location: 'Workshop 1', actionPlan: 'Isolate and fit a guard.', byWho: 'Ben Beta', byWhen: iso(2), supervisorName: 'Cat Gamma', supervisorSignature: 'C.G.', dateClosed: null, status: 'open', submittedAt: iso(-4) },
  { id: 'c2', date: iso(-12), raisedBy: '', issueRaised: 'Poor lighting on the haul road.', category: 'Health', priority: 'medium', section: 'General', location: 'Haul road', actionPlan: '', byWho: '', byWhen: '', supervisorName: '', supervisorSignature: '', dateClosed: null, status: 'overdue', submittedAt: iso(-12) },
  { id: 'c3', date: iso(-40), raisedBy: 'Dee Delta', issueRaised: 'Spill kit empty.', category: 'Environment', priority: 'low', section: 'Electrical', location: 'Stores', actionPlan: 'Restocked.', byWho: 'Ben Beta', byWhen: iso(-35), supervisorName: 'Cat Gamma', supervisorSignature: '', dateClosed: iso(-36), status: 'closed', submittedAt: iso(-40) },
];
const spec = {
  route: '/safety_complaints',
  h1: 'Safety complaints',
  data: {
    '/api/safety-complaints/': request => (request.method() === 'POST' ? { id: 'new' } : COMPLAINTS),
    'PATCH /api/safety-complaints/c1': {},
    'DELETE /api/safety-complaints/c2': {},
    '/api/lookup-lists/location': [{ value: 'Workshop 1' }],
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Safety complaints' });
    check(await table.getByRole('row').count() === 4, 'header plus three complaints');
    check(await table.getByText('Critical', { exact: true }).isVisible() && await table.getByText('Overdue', { exact: true }).isVisible(), 'priority and status are labelled badges');
    check(await table.getByText('Anonymous').isVisible(), 'a complaint without a person reads Anonymous');
    await page.getByRole('button', { name: /^Closed/ }).first().click();
    check(await table.getByRole('row').count() === 2, 'the Closed tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('lighting');
    check(await table.getByRole('row').count() === 2, 'search matches the issue text');
    await page.getByRole('searchbox').fill('');

    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText(/Complaints by category: Safety 1, Health 1, Environment 1/).count() === 1, 'analytics carry a text alternative with the values');
    check(await page.getByText(/1 overdue complaint needs attention/).isVisible(), 'overdue complaints are called out');
    await shot(page, 'analytics@1440');
    await page.getByRole('tab', { name: 'Complaints register' }).click();

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Safety complaint' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Isolate and fit a guard.').isVisible() && await detail.getByText('Cat Gamma (C.G.)').isVisible(), 'detail shows the action plan and supervisor');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit complaint' });
    await edit.waitFor({ timeout: 5000 });
    await edit.getByLabel(/^Issue raised/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Describe the issue raised.').isVisible(), 'clearing a required field shows its error');
    await edit.getByLabel(/^Issue raised/).fill('Guard missing, now urgent.');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/safety-complaints/c1' && patch.body.issue_raised === 'Guard missing, now urgent.' && patch.body.by_when && patch.body.date_closed === null, 'saving sends a snake_case PATCH', JSON.stringify(patch?.body).slice(0, 140));
    await page.getByRole('button', { name: /^Delete complaint of/ }).nth(1).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete complaint of/ }).nth(1).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/safety-complaints/c2'), 'confirming sends the delete');
  },
  create: {
    open: 'New complaint', dialog: 'New safety complaint', path: '/api/safety-complaints/', submit: 'Submit complaint',
    requiredText: 'Describe the issue raised.',
    async fill(dialog) { await dialog.getByLabel(/^Issue raised/).fill('Loose cable on the walkway.'); await dialog.getByLabel(/^Raised by/).fill('Eve Epsilon'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Issue raised/).inputValue()) === 'Loose cable on the walkway.' && (await dialog.getByLabel(/^Raised by/).inputValue()) === 'Eve Epsilon'; },
    body: b => b.issue_raised === 'Loose cable on the walkway.' && b.raised_by === 'Eve Epsilon' && b.status === 'open' && b.priority === 'medium',
  },
  empty: { data: { '/api/safety-complaints/': [] }, text: 'No safety complaints yet' },
  failing: { paths: ['/api/safety-complaints/'], text: 'Safety complaints could not be loaded', notShown: ['No safety complaints yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Safety complaints' }).isVisible(), 'Try again loads the register'); } },
};

export default spec;
