// /equipment: the equipment register (cards, table, filters, pagination, detail, add/edit/delete).
const mk = (n, over = {}) => ({ id: n, equipment_id: `EQ-${String(n).padStart(3, '0')}`, name: `Machine ${String(n).padStart(2, '0')}`, category: n % 2 ? 'Machinery' : 'Pumps', status: 'operational', location: n % 3 ? 'Plant' : 'Shaft', department: 'Engineering', model: `M-${n}`, manufacturer: 'Acme', criticality: 'Medium', commission_date: '2022-03-01', ...over });
const ITEMS = [
  ...Array.from({ length: 14 }, (_, i) => mk(i + 1)),
  mk(15, { name: 'Crusher One', status: 'maintenance', serial_number: 'SN-CRUSH-9', category: 'Crushers', criticality: 'High', supplier: 'Rock Co', maintenance_interval: 6, purchase_cost: 12500 }),
  // A legacy record with no status, category, location or dates must render rather than crash.
  { id: 16, name: 'Legacy rig' },
];
const spec = {
  route: '/equipment',
  h1: 'Equipment management',
  data: {
    '/api/equipment': request => (request.method() === 'POST' ? { id: 99 } : ITEMS),
    'PUT /api/equipment/15': {},
    'DELETE /api/equipment/16': {},
    '/api/lookups/location': ['Plant', 'Shaft', 'Workshop A'],
  },
  async ready(page, calls, { check, shot }) {
    const cards = page.getByRole('button', { name: /^View / });
    check(await cards.count() === 12, 'the first page shows 12 cards (a legacy record with no fields does not crash)');
    check(await page.getByText('1 – 12 of 16').or(page.getByText(/1.*12.*16/)).first().isVisible(), 'the page range is stated');
    await shot(page, 'cards@1440');
    await page.getByRole('button', { name: 'Next page' }).click();
    check(await cards.count() === 4, 'the second page shows the remaining four');
    await page.getByRole('button', { name: 'Previous page' }).click();

    await page.getByRole('searchbox').fill('crush');
    check(await cards.count() === 1, 'search finds the crusher by name and by serial number');
    await page.getByRole('searchbox').fill('SN-CRUSH');
    check(await cards.count() === 1, 'search matches the serial number');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Maintenance\s*\d/ }).click();
    check(await cards.count() === 1, 'the Maintenance tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Equipment register' });
    check(await table.getByRole('row').count() === 13, 'table view lists the first page');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail then edit
    await page.getByRole('searchbox').fill('crusher');
    await cards.first().click();
    const detail = page.getByRole('dialog', { name: 'Crusher One' });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('SN-CRUSH-9').isVisible() && await detail.getByText('6 months').isVisible(), 'the detail shows the serial number and maintenance interval');
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit equipment' });
    await edit.waitFor({ timeout: 5000 });
    check((await edit.getByLabel(/^Equipment name/).inputValue()) === 'Crusher One' && (await edit.getByLabel(/^Serial number/).inputValue()) === 'SN-CRUSH-9', 'edit loads the asset');
    await edit.getByLabel(/^Equipment name/).fill('');
    await edit.getByRole('button', { name: 'Update equipment' }).click();
    check(await edit.getByText('Enter the equipment name.').isVisible(), 'a blank name is explained');
    await edit.getByLabel(/^Equipment name/).fill('Crusher One (rebuilt)');
    await edit.getByLabel(/^Model/).fill('');
    await edit.getByRole('button', { name: 'Update equipment' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT').pop();
    check(put?.pathname === '/api/equipment/15' && put.body.name === 'Crusher One (rebuilt)' && put.body.model === null && put.body.purchase_cost === 12500 && put.body.id === 15, 'saving sends the edit; a cleared optional field is sent as null', JSON.stringify(put?.body).slice(0, 140));

    // delete confirms first
    await page.getByRole('searchbox').fill('legacy');
    await page.getByRole('button', { name: 'Delete Legacy rig' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete Legacy rig' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/equipment/16'), 'confirming sends the delete');
  },
  create: {
    open: 'Add equipment', dialog: 'Add equipment', path: '/api/equipment', submit: 'Add equipment',
    requiredText: 'Enter the equipment ID.',
    async fill(dialog) { await dialog.getByLabel(/^Equipment ID/).fill('EQ-100'); await dialog.getByLabel(/^Equipment name/).fill('New compressor'); await dialog.getByLabel(/^Purchase cost/).fill('4500'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Equipment name/).inputValue()) === 'New compressor' && (await dialog.getByLabel(/^Purchase cost/).inputValue()) === '4500'; },
    body: b => b.equipment_id === 'EQ-100' && b.name === 'New compressor' && b.status === 'operational' && b.purchase_cost === 4500 && b.model === null,
  },
  empty: { data: { '/api/equipment': [] }, text: 'No equipment yet' },
  failing: { paths: ['/api/equipment'], text: 'Equipment could not be loaded', notShown: ['No equipment yet'], async recovered(page, { check }) { check(await page.getByRole('button', { name: /^View / }).first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
