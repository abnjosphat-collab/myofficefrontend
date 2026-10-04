// /inventory: browser-local register. No seeded sample data; add/edit/delete work in dialogs.
const ITEMS = [
  { id: 'a', name: 'Fixture Bearing', sku: 'BRG-1', category: 'Mechanical', description: 'A bearing', currentStock: 12, minStock: 5, maxStock: 40, unit: 'pcs', cost: 10, supplier: 'Acme', location: 'A1', status: 'in-stock', lastRestocked: '2026-09-01T00:00:00Z' },
  { id: 'b', name: 'Fixture Gloves', sku: 'GLV-1', category: 'Safety', description: '', currentStock: 3, minStock: 5, maxStock: 50, unit: 'pairs', cost: 4.5, supplier: 'SafeCo', location: 'B2', status: 'low-stock', lastRestocked: '2026-09-02T00:00:00Z' },
  { id: 'c', name: 'Fixture Fuse', sku: 'FUS-1', category: 'Electrical', description: '', currentStock: 0, minStock: 5, maxStock: 20, unit: 'pcs', cost: 1, supplier: 'Acme', location: 'C3', status: 'out-of-stock', lastRestocked: '2026-08-01T00:00:00Z' },
];

export default {
  route: '/inventory',
  h1: 'Inventory',
  data: {},
  storage: { 'inventory-items': ITEMS },
  async ready(page, _calls, { check, shot }) {
    check(await page.getByText('Stored in this browser only').isVisible(), 'says plainly that the data is stored in this browser only');
    check(await page.getByRole('button', { name: /^Edit Fixture/ }).count() === 3, 'three item cards');
    const body = await page.locator('main').innerText();
    check(!/Industrial Circuit Boards|CNC Cutting Tools|Laser Printer Toner/.test(body), 'no seeded sample items');
    check(await page.getByRole('link').filter({ hasText: /View|Edit|New Item/ }).count() === 0, 'no links to routes that do not exist');
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
    check(await page.getByRole('button', { name: 'Edit Fixture Pump' }).isVisible(), 'the new item appears');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory-items')));
    check(stored.length === 4 && stored.some(i => i.sku === 'PMP-1' && i.currentStock === 7 && i.cost === 99.5 && i.status === 'in-stock'), 'the item is saved to this browser with its computed status');
    await shot(page, 'after-add@1440');

    // edit: raising stock above min changes status; delete asks for confirmation
    await page.getByRole('button', { name: 'Edit Fixture Gloves' }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit item' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Item name/).inputValue()) === 'Fixture Gloves', 'edit dialog loads the item');
    await edit.getByLabel(/^Current stock/).fill('20');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory-items')));
    check(after.find(i => i.id === 'b')?.status === 'in-stock', 'stock above the reorder level makes the item in stock');
    await page.getByRole('button', { name: 'Delete Fixture Fuse' }).first().click();
    const confirm = page.getByRole('alertdialog');
    await confirm.waitFor({ timeout: 5000 });
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    check((await page.evaluate(() => JSON.parse(localStorage.getItem('inventory-items')))).length === 4, 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Fixture Fuse' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(500);
    check((await page.evaluate(() => JSON.parse(localStorage.getItem('inventory-items')))).length === 3, 'confirming deletes the item');
  },
  empty: { storage: {}, text: 'No inventory items yet', data: {} },
};
