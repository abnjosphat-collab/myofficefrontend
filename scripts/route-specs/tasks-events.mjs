// /tasks-events: manager-only events and tasks board (list, complete/reopen, details with comments, add/edit/delete).
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const ITEMS = [
  { id: 1, title: 'Service the north pump', description: 'Replace the seal.', task_type: 'Task', event_date: local(-4), due_date: local(-2), responsible_people: ['Ann Alpha', 'Bob Beta'], status: 'pending', priority: 'High' },
  { id: 2, title: 'Safety meeting', description: '', task_type: 'Meeting', event_date: local(3), due_date: local(3), responsible_people: [], status: 'pending', priority: 'Medium' },
  { id: 3, title: 'Audit closed out', task_type: 'Deadline', due_date: local(-10), status: 'completed', completed_by: 'shell-check@example.invalid', priority: 'Low', responsible_people: ['Cy Gamma'] },
  // A legacy record with no task type or lists must render rather than crash.
  { id: 4, title: 'Legacy item', status: 'pending' },
];
const COMMENTS = [{ id: 1, task_id: 1, author: 'Ann Alpha', text: 'Parts ordered.', created_at: '2026-10-01T08:00:00Z' }];
const spec = {
  route: '/tasks-events',
  h1: 'Events and tasks',
  data: {
    '/api/tasks-events': request => (request.method() === 'POST' ? { id: 9 } : ITEMS),
    'PATCH /api/tasks-events/1': {},
    'PATCH /api/tasks-events/2': { __status: 403, body: { detail: 'Managers only (fixture)' } },
    'PATCH /api/tasks-events/3': {},
    'DELETE /api/tasks-events/2': {},
    '/api/tasks-events/1/comments': request => (request.method() === 'POST' ? { id: 2, task_id: 1, author: 'shell-check@example.invalid', text: 'On site now.', created_at: '2026-10-03T08:00:00Z' } : COMMENTS),
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining' }, { id: 2, employee_id: 'E2', first_name: 'Bob', last_name: 'Beta', department: 'Mining' }],
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Events and tasks' });
    check(await table.getByRole('row').count() === 5, 'header plus four items (a legacy item with no type does not crash)');
    check(await table.getByText('Overdue').first().isVisible(), 'an overdue item is labelled in words');
    check(await page.getByRole('button', { name: /^Overdue\s*\d/ }).isVisible(), 'the Overdue tile is shown');
    await shot(page, 'board@1440');

    await page.getByRole('button', { name: /^Overdue\s*\d/ }).click();
    check(await table.getByRole('row').count() === 2, 'the Overdue tile filters to overdue items');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // complete: optimistic, sends the patch
    await table.getByRole('button', { name: 'Mark "Service the north pump" complete' }).click();
    await page.waitForTimeout(500);
    const p1 = calls.filter(c => c.method === 'PATCH').pop();
    check(p1?.pathname === '/api/tasks-events/1' && p1.body.status === 'completed' && p1.body.completed_by === 'shell-check@example.invalid', 'completing sends the status and who completed it', JSON.stringify(p1?.body));
    // a refused change is put back with the reason
    await table.getByRole('button', { name: 'Mark "Safety meeting" complete' }).click();
    await page.waitForTimeout(600);
    check(await table.getByRole('button', { name: 'Mark "Safety meeting" complete' }).isVisible(), 'a refused change is put back');
    check(await page.getByText(/Managers only \(fixture\)/).first().isVisible(), 'the reason for the refusal is shown');

    // details with comments
    await table.getByRole('row').filter({ hasText: 'Service the north pump' }).click();
    const detail = page.getByRole('dialog', { name: 'Service the north pump' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Parts ordered.').isVisible() && await detail.getByText('Ann Alpha, Bob Beta').isVisible(), 'details show the comments and the people');
    await detail.getByLabel('Add a progress update').fill('On site now.');
    await detail.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(500);
    const post = calls.find(c => c.method === 'POST' && c.pathname === '/api/tasks-events/1/comments');
    check(post?.body.text === 'On site now.' && await detail.getByText('On site now.').isVisible(), 'a progress comment is posted and shown', JSON.stringify(post?.body));
    await shot(page, 'detail@1440');

    // edit with a required title and the people picker
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit event or task' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Title/).inputValue()) === 'Service the north pump' && await edit.getByRole('button', { name: 'Remove Ann Alpha' }).isVisible(), 'edit loads the item and its people');
    await edit.getByLabel(/^Title/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Enter a title.').isVisible(), 'a blank title shows its error');
    await edit.getByLabel(/^Title/).fill('Service the north pump (moved)');
    await edit.getByRole('button', { name: 'Remove Ann Alpha' }).click();
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/tasks-events/1').pop();
    check(patch?.body.title.includes('moved') && JSON.stringify(patch.body.responsible_people) === '["Bob Beta"]', 'saving sends the edit with the people changed', JSON.stringify(patch?.body));

    // delete confirms first
    await page.getByRole('button', { name: 'Delete "Safety meeting"' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete "Safety meeting"' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/tasks-events/2'), 'confirming sends the delete');
  },
  create: {
    open: 'New', dialog: 'New event or task', path: '/api/tasks-events', submit: 'Add to the board',
    requiredText: 'Enter a title.',
    async fill(dialog) { await dialog.getByLabel(/^Title/).fill('Order spares'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Title/).inputValue()) === 'Order spares'; },
    body: b => b.title === 'Order spares' && b.task_type === 'Task' && b.priority === 'Medium' && Array.isArray(b.responsible_people),
  },
  empty: { data: { '/api/tasks-events': [] }, text: 'Nothing on the board yet' },
  failing: { paths: ['/api/tasks-events'], text: 'Events and tasks could not be loaded', notShown: ['Nothing on the board yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Events and tasks' }).isVisible(), 'Try again loads the board'); } },
};
export default spec;
