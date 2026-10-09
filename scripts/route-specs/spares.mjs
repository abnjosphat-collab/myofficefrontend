// /spares: the register (cards, table, stock filters, categories, favourites), detail, add/edit/delete, and the requisition builder
// (lines, save, load, delete, copy, PDF). Mock shapes mirror the real router (numbers can arrive as text).
const sp = (id, over = {}) => ({ id, stock_code: `S${id}`, description: `Part ${id}`, category: '', categories: [], current_quantity: 10, min_quantity: 2, max_quantity: 20, unit_price: 5, unit_of_measure: 'UN', priority: 'medium', storage_location: 'A1', supplier: 'Acme', safety_stock: false, notes: '', ...over });
const SPARES = [
  sp(1, { description: 'Bearing 6204', categories: ['Parts'], current_quantity: 0, priority: 'critical', unit_price: 12.5 }),
  sp(2, { description: 'Belt B52', categories: ['Belts'], current_quantity: 2, safety_stock: true }),
  sp(3, { description: 'Gasket', category: 'Seals', current_quantity: '40', unit_price: '1.5' }),
  // A legacy record with almost nothing on it must render rather than crash.
  { id: 4, stock_code: 'S4', description: 'Old hose', priority: 'medium', safety_stock: false },
];
const SAVED = [{ id: 'r1', name: 'Monthly order', requester: 'Sam', reason: 'Restock', urgency: 'routine', priority: 'medium', required_for: 'Plant', lines: [{ spare_id: 1, stock_code: 'S1', description: 'Bearing 6204', unit_of_measure: 'UN', unit_price: 12.5, qty: 2 }], grand_total: 25, saved_at: '2026-09-20T08:00:00Z' }];
let failSave = false;

const spec = {
  route: '/spares',
  h1: 'Spares',
  data: {
    '/api/spares': request => (request.method() === 'POST' ? (failSave ? { __status: 422, body: { detail: 'Stock code exists (fixture)' } } : { id: 99, ...request.postDataJSON() }) : SPARES),
    'PUT /api/spares/1': request => ({ ...SPARES[0], ...request.postDataJSON() }),
    'DELETE /api/spares/2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    '/api/spares/saved-requisitions': request => (request.method() === 'POST' ? { ...SAVED[0], id: 'r2', ...request.postDataJSON() } : SAVED),
    'DELETE /api/spares/saved-requisitions/r1': {},
    '/api/employees': [],
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Spare parts' }).getByRole('button', { name: /^Open S/ });
    check(await cards.count() === 4, 'four part cards (text numbers and a record with almost nothing on it render)', String(await cards.count()));
    check(await page.getByText('Out of stock', { exact: true }).first().isVisible() && await page.getByText('Low stock', { exact: true }).first().isVisible(), 'stock level is stated in words');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Out of stock\s*\d/ }).click();
    check(await cards.count() === 2, 'the Out of stock tile filters the register (a record with no quantity counts as none on hand)');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Safety stock\s*\d/ }).click();
    check(await cards.count() === 1, 'the Safety stock tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('belt');
    check(await cards.count() === 1, 'search finds a part by description');
    await page.getByRole('searchbox').fill('');

    // categories panel filters
    await page.getByRole('button', { name: /^Categories\s*\d/ }).click();
    await page.getByRole('button', { name: /^Belts/ }).click();
    check(await cards.count() === 1, 'choosing a category filters the register');
    await shot(page, 'categories@1440');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // favourites persist
    await page.getByRole('button', { name: 'Add S3 to favourites' }).click();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.getByRole('button', { name: 'Favourites', exact: true }).click();
    await page.keyboard.press('Escape');
    check(await cards.count() === 1, 'the Favourites filter shows only starred parts');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Spare parts' }).getByRole('row').count() === 5, 'table view lists the parts');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail then edit
    await page.getByRole('button', { name: /^Open S1/ }).click();
    const det = dialog('Bearing 6204');
    await det.waitFor({ timeout: 5000 });
    check(await det.getByText('Out of stock').first().isVisible() && await det.getByText('Critical priority').isVisible(), 'the detail states stock level and priority');
    await shot(page, 'detail@1440');
    await det.getByRole('button', { name: 'Edit', exact: true }).click();
    const ed = dialog('Edit S1');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^Description/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    check(await ed.getByText('Enter a description.').isVisible(), 'a blank description is explained');
    await ed.getByLabel(/^Description/).fill('Bearing 6204 2RS');
    await ed.getByLabel(/^On hand/).fill('6');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/spares/1').pop();
    check(put?.body.description === 'Bearing 6204 2RS' && put.body.current_quantity === 6 && put.body.categories?.[0] === 'Parts', 'saving sends the numbers as numbers and keeps the categories', JSON.stringify(put?.body).slice(0, 150));

    // delete: confirm first, refusal shows the reason
    await page.getByRole('button', { name: 'More actions for S2' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'More actions for S2' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not deleted: Manager role required/).isVisible(), 'a refused delete shows the reason');

    // requisition builder
    await page.getByRole('button', { name: 'Add S3 to the requisition' }).click();
    const rq = dialog('Parts requisition');
    await rq.waitFor({ timeout: 5000 });
    check(await rq.getByLabel('Requisition lines').getByText('Gasket').or(rq.getByText(/S3/)).first().isVisible(), 'adding a part opens the builder with that line');
    await rq.getByLabel('Quantity').fill('4');
    check(await rq.getByText('$6.00').first().isVisible(), 'the line and total are worked out');
    await rq.getByRole('button', { name: 'Add a line' }).click();
    check(await rq.getByText('Some lines are not complete').isVisible(), 'an empty line is flagged and does not count');
    await rq.getByRole('button', { name: 'Remove part 2' }).click();
    await rq.getByLabel('Save this one as').fill('Weekly order');
    await rq.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(500);
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/spares/saved-requisitions').pop();
    check(post?.body.name === 'Weekly order' && post.body.grand_total === 6 && post.body.lines.length === 1, 'saving sends the name, the complete lines and the total', JSON.stringify(post?.body).slice(0, 140));
    await shot(page, 'requisition@1440');
    await rq.getByRole('button', { name: 'Load', exact: true }).first().click();
    check(await rq.getByLabel('Requisition lines').getByText(/Bearing 6204/).isVisible().catch(() => false) || await rq.getByText(/S1/).first().isVisible(), 'loading a saved requisition fills the lines');
    await rq.getByRole('button', { name: /^Delete the saved requisition Monthly order/ }).click();
    const c2 = page.getByRole('alertdialog');
    await c2.waitFor({ timeout: 5000 });
    await c2.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/spares/saved-requisitions/r1'), 'deleting a saved requisition asks first, then deletes it');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), rq.getByRole('button', { name: 'PDF' }).click()]);
    check(!!dl && /^requisition-/.test(dl.suggestedFilename()), 'the PDF downloads', dl?.suggestedFilename());
    await page.keyboard.press('Escape');

    // a refused create keeps the dialog and the typing
    failSave = true;
    await page.getByRole('button', { name: 'Add spare' }).click();
    const nw = dialog('Add a spare part');
    await nw.waitFor({ timeout: 5000 });
    await nw.getByLabel(/^Stock code/).fill('X1');
    await nw.getByLabel(/^Description/).fill('New part');
    await nw.getByRole('button', { name: 'Add spare' }).click();
    await nw.getByText('Stock code exists (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await nw.getByText('Stock code exists (fixture)').isVisible() && (await nw.getByLabel(/^Description/).inputValue()) === 'New part', 'a refused add shows the reason and keeps what was typed');
    failSave = false;
  },
  create: {
    open: 'Add spare', dialog: 'Add a spare part', path: '/api/spares', submit: 'Add spare',
    requiredText: 'Enter the stock code.',
    async fill(dialog) { await dialog.getByLabel(/^Stock code/).fill('N9'); await dialog.getByLabel(/^Description/).fill('Hydraulic hose'); await dialog.getByLabel(/^On hand/).fill('12'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Stock code/).inputValue()) === 'N9' && (await dialog.getByLabel(/^Description/).inputValue()) === 'Hydraulic hose'; },
    body: b => b.stock_code === 'N9' && b.description === 'Hydraulic hose' && b.current_quantity === 12 && b.min_quantity === 1 && b.priority === 'medium' && b.safety_stock === false && Array.isArray(b.categories),
  },
  empty: { data: { '/api/spares': [] }, text: 'No spare parts yet' },
  failing: { paths: ['/api/spares'], text: 'Spares could not be loaded', notShown: ['No spare parts yet'], async recovered(page, { check }) { check(await page.getByRole('list', { name: 'Spare parts' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
