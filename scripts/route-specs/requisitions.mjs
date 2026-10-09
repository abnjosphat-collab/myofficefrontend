// /requisitions: purchase requisitions (table, filters, analytics, detail with items, add/edit/delete).
const iso = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
// The backend shape: snake_case fields and a nested requisition_items list.
const REQS = [
  { id: 1, date: iso(-3), requester: 'Ann Alpha', section: 'Electrical', required_for: 'Pump 1', priority: 'Critical', status: 'Pending', requisition_number: 'REQ-001', notes: 'Urgent', line_number: 1,
    requisition_items: [{ description: 'Seal kit', cost_per_unit: 120.5, quantity: 2, reason: 'Worn' }, { description: 'Gasket', cost_per_unit: 10, quantity: 5, reason: '' }] },
  { id: 2, date: iso(-12), requester: 'Ben Beta', section: 'Mechanical', required_for: '', priority: 'Low', status: 'Approved', requisition_number: 'REQ-002', notes: '', line_number: 2,
    requisition_items: [{ description: 'Bearing', cost_per_unit: 300, quantity: 1, reason: 'Planned' }] },
  { id: 3, date: iso(-30), requester: 'Cat Gamma', section: 'Mechanical', required_for: 'Conveyor 2', priority: 'Medium', status: 'Weird', requisition_number: 'REQ-003', notes: '', line_number: 3, requisition_items: [] },
];
const spec = {
  route: '/requisitions',
  h1: 'Requisitions',
  data: {
    '/api/requisitions': request => (request.method() === 'POST' ? { id: 9, requisition_items: [] } : REQS),
    'PATCH /api/requisitions/1': { id: 1, requisition_items: [] },
    'DELETE /api/requisitions/2': {},
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Electrical' }],
    '/api/equipment': [{ id: 1, name: 'Pump 1', location: 'Electrical' }, { id: 2, name: 'Conveyor 2', location: 'Mechanical' }],
  },
  async ready(page, calls, { check, shot }) {
    const table = page.getByRole('table', { name: 'Purchase requisitions' });
    check(await table.getByRole('row').count() === 4, 'header plus three requisitions (an unrecognised status does not crash the page)');
    check(await table.getByText('$291.00').isVisible() && await table.getByText('$300.00').isVisible(), 'costs are the sum of unit cost times quantity (2x120.50 + 5x10 = 291)');
    check(await page.getByText('$591.00').first().isVisible(), 'total value sums the filtered requisitions');
    check(await table.getByText('Critical', { exact: true }).isVisible() && await table.getByText('Pending', { exact: true }).isVisible(), 'priority and status are labelled badges');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: /^Pending/ }).first().click();
    check(await table.getByRole('row').count() === 2, 'the Pending tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText(/By status: Pending 1 worth \$291\.00/).count() === 1, 'analytics carry a text alternative with the values');
    await shot(page, 'analytics@1440');
    await page.getByRole('tab', { name: 'Requisitions' }).click();

    await table.getByRole('row').nth(1).click();
    const detail = page.getByRole('dialog', { name: 'Requisition REQ-001' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Seal kit').isVisible() && await detail.getByText('Urgent').isVisible(), 'detail lists the items and notes');
    await page.waitForTimeout(400);
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit REQ-001' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Description \(item 2\)/).inputValue()) === 'Gasket', 'edit dialog loads the items');
    await edit.getByLabel(/^Description \(item 2\)/).fill('');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText('Describe the item.').isVisible(), 'a blank item description shows its error');
    await edit.getByLabel(/^Description \(item 2\)/).fill('Gasket set');
    await edit.getByLabel(/^Qty \(item 2\)/).fill('6');
    check(await edit.getByText('$301.00').first().isVisible(), 'the form total updates as items change (2x120.50 + 6x10 = 301)');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH').pop();
    check(patch?.pathname === '/api/requisitions/1' && patch.body.requisition_number === 'REQ-001' && patch.body.items.length === 2 && patch.body.items[1].quantity === 6 && patch.body.items[0].cost_per_unit === 120.5, 'saving sends a PATCH in the backend shape with both items', JSON.stringify(patch?.body).slice(0, 140));
    await page.getByRole('button', { name: 'Delete requisition REQ-002' }).click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete requisition REQ-002' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/requisitions/2'), 'confirming sends the delete');
  },
  create: {
    open: 'New requisition', dialog: 'New purchase requisition', path: '/api/requisitions', submit: 'Create requisition',
    requiredText: 'Enter the requester.',
    async fill(dialog) { await dialog.getByLabel(/^Requester/).fill('Dee Delta'); await dialog.getByLabel(/^Description \(item 1\)/).fill('Filter element'); await dialog.getByLabel(/^Unit cost \(item 1\)/).fill('45.5'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Requester/).inputValue()) === 'Dee Delta' && (await dialog.getByLabel(/^Description \(item 1\)/).inputValue()) === 'Filter element'; },
    body: b => b.requester === 'Dee Delta' && b.status === 'Draft' && /^REQ-/.test(b.requisition_number) && b.items.length === 1 && b.items[0].cost_per_unit === 45.5 && b.items[0].quantity === 1,
  },
  empty: { data: { '/api/requisitions': [] }, text: 'No requisitions yet' },
  failing: { paths: ['/api/requisitions'], text: 'Requisitions could not be loaded', notShown: ['No requisitions yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Purchase requisitions' }).isVisible(), 'Try again loads the register'); } },
};
export default spec;
