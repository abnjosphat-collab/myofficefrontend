// /inventory: the shared register behind /api/inventory/items. No seeded sample data; add/edit/delete go to the
// server; a browser's old local items are moved up once; a failed load says so instead of showing an empty list.
const ITEMS = [
  { id: 'a', name: 'Fixture Bearing', sku: 'BRG-1', category: 'Mechanical', description: 'A bearing', currentStock: 12, minStock: 5, maxStock: 40, unit: 'pcs', cost: 10, supplier: 'Acme', location: 'A1', status: 'in-stock', lastRestocked: '2026-09-01T00:00:00Z', createdAt: '', updatedAt: '' },
  { id: 'b', name: 'Fixture Gloves', sku: 'GLV-1', category: 'Safety', description: '', currentStock: 3, minStock: 5, maxStock: 50, unit: 'pairs', cost: 4.5, supplier: 'SafeCo', location: 'B2', status: 'low-stock', lastRestocked: '2026-09-02T00:00:00Z', createdAt: '', updatedAt: '' },
  { id: 'c', name: 'Fixture Fuse', sku: 'FUS-1', category: 'Electrical', description: '', currentStock: 0, minStock: 5, maxStock: 20, unit: 'pcs', cost: 1, supplier: 'Acme', location: 'C3', status: 'out-of-stock', lastRestocked: '2026-08-01T00:00:00Z', createdAt: '', updatedAt: '' },
];
const STORE = new Map(ITEMS.map(i => [i.id, { ...i }]));
const status = i => (i.currentStock <= 0 ? 'out-of-stock' : i.currentStock <= i.minStock ? 'low-stock' : 'in-stock');
let next = 1;
const create = request => { const body = request.postDataJSON(); const id = `n${next++}`; const item = { ...body, id, status: status(body), lastRestocked: body.lastRestocked ?? '', createdAt: '', updatedAt: '' }; STORE.set(id, item); return item; };
const update = id => request => { const item = { ...STORE.get(id), ...request.postDataJSON() }; item.status = status(item); STORE.set(id, item); return item; };

const spec = {
  route: '/inventory',
  // One item this browser saved before the register was shared: it is moved up on the first visit.
  storage: { 'inventory-items': [{ id: 'old-1', name: 'Fixture Old Valve', sku: 'OLD-1', category: '', description: '', currentStock: 2, minStock: 1, maxStock: 5, unit: 'pcs', cost: 3, supplier: '', location: '', status: 'in-stock', lastRestocked: '2025-12-01T00:00:00Z' }] },
  h1: 'Inventory',
  data: {
    'GET /api/inventory/items': () => [...STORE.values()],
    'POST /api/inventory/items': create,
    'PUT /api/inventory/items/b': update('b'),
    'DELETE /api/inventory/items/c': () => { STORE.delete('c'); return { message: 'deleted' }; },
  },
  async ready(page, calls, { check, shot }) {
    check(!(await page.getByText('Stored in this browser only').isVisible().catch(() => false)), 'no longer claims the data is only in this browser');
    await page.getByRole('button', { name: 'Edit Fixture Old Valve' }).waitFor({ timeout: 15000 }).catch(() => {});
    check(calls.some(c => c.method === 'POST' && c.body?.sku === 'OLD-1' && c.body?.lastRestocked === '2025-12-01T00:00:00Z'), 'an old local item from this browser is sent to the server with its restock date');
    check((await page.evaluate(() => localStorage.getItem('inventory-items'))) === null, 'and then removed from this browser');
    check(await page.getByRole('button', { name: /^Edit Fixture/ }).count() === 4, 'three items from the server plus the moved one');
    const body = await page.locator('main').innerText();
    check(!/Industrial Circuit Boards|CNC Cutting Tools|Laser Printer Toner/.test(body), 'no seeded sample items');
    await page.getByRole('button', { name: 'Low stock', exact: true }).first().click();
    check(await page.getByRole('button', { name: /^Edit Fixture/ }).count() === 1, 'status filter shows only the low-stock item');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Inventory items' }).isVisible(), 'table view renders');
    await page.getByRole('button', { name: 'Card view' }).click();

    // add with validation
    await page.getByRole('button', { name: 'Add item' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add item' });
    await dialog.waitFor({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Add item' }).click();
    check(await dialog.getByText('Enter the item name.').isVisible() && await dialog.getByText('Enter the SKU.').isVisible(), 'required fields show errors');
    await dialog.getByLabel(/^Item name/).fill('Fixture Pump');
    await dialog.getByLabel(/^SKU/).fill('brg-1');
    await dialog.getByRole('button', { name: 'Add item' }).click();
    check(await dialog.getByText('Another item already uses this SKU.').isVisible(), 'duplicate SKU is rejected (case-insensitive)');
    await dialog.getByLabel(/^SKU/).fill('PMP-1');
    await dialog.getByLabel(/^Current stock/).fill('abc');
    await dialog.getByRole('button', { name: 'Add item' }).click();
    check(await dialog.getByText('Enter a whole number, 0 or more.').first().isVisible(), 'stock must be a whole number');
    await dialog.getByLabel(/^Current stock/).fill('7');
    await dialog.getByLabel(/^Reorder level/).fill('2');
    await dialog.getByLabel(/^Maximum stock/).fill('30');
    await dialog.getByLabel(/^Unit cost/).fill('99.5');
    await dialog.getByRole('button', { name: 'Add item' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const post = calls.find(c => c.method === 'POST' && c.pathname === '/api/inventory/items' && c.body?.sku === 'PMP-1');
    check(post?.body?.sku === 'PMP-1' && post.body.currentStock === 7 && post.body.cost === 99.5 && !('id' in post.body), 'the new item is sent to the server');
    check(await page.getByRole('button', { name: 'Edit Fixture Pump' }).isVisible(), 'the new item appears after the list reloads');
    await shot(page, 'after-add@1440');

    // edit, then delete with confirmation
    await page.getByRole('button', { name: 'Edit Fixture Gloves' }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit item' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Item name/).inputValue()) === 'Fixture Gloves', 'edit dialog loads the item');
    await edit.getByLabel(/^Current stock/).fill('20');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(calls.some(c => c.method === 'PUT' && c.pathname === '/api/inventory/items/b' && c.body?.currentStock === 20), 'the change is sent to the server');
    await page.getByRole('button', { name: 'Delete Fixture Fuse' }).first().click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Fixture Fuse' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(800);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/inventory/items/c') && !(await page.getByRole('button', { name: 'Edit Fixture Fuse' }).isVisible().catch(() => false)), 'confirming deletes the item on the server');
  },
  empty: { data: { '/api/inventory/items': [] }, storage: {}, text: 'No inventory items yet' },
  failing: { paths: ['GET /api/inventory/items'], text: 'Inventory could not be loaded', notShown: ['No inventory items yet'] },
};

export default spec;
