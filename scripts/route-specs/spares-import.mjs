// /spares/import: upload, column mapping, import mode, confirm, result. The payload must carry only what the file says.
let failInfer = false;
let failBulk = false;
const INFER = {
  inferred: { stock_code: 'Code', description: 'Desc', unit_price: 'Price' },
  confidence: { stock_code: 0.95, description: 0.8, unit_price: 0.3 },
  all_columns: ['Code', 'Desc', 'Price', 'Notes'],
  raw_rows: [
    { Code: 'A1', Desc: 'Bearing 6204', Price: '$1,234.50', _category: 'Bearings' },
    { Code: 'A2', Desc: 'Seal kit', Price: '12,50', _category: 'Seals' },
    { Code: 'A3', Desc: 'Gasket', Price: '', _category: 'Seals' },
    { Code: '', Desc: 'Orphan row', Price: '5', _category: 'Seals' },
  ],
  total_rows: 4,
  has_categories: true,
};
const spec = {
  route: '/spares/import',
  h1: 'Import spares from a spreadsheet',
  data: {
    'POST /api/spares/infer': () => (failInfer ? { __status: 400, body: { detail: 'Unsupported file (fixture)' } } : INFER),
    'POST /api/spares/bulk': () => (failBulk ? { __status: 500, body: { detail: 'Bulk save failed (fixture)' } } : { created: 2, updated: 1, skipped: 0, errors: 0, total: 3 }),
  },
  async ready(page, calls, { check, shot }) {
    const file = { name: 'spares.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('fixture') };
    check(await page.getByRole('button', { name: /Upload a spares file/ }).isVisible(), 'the upload step is shown first');
    await shot(page, 'upload@1440');

    // a file the server refuses is explained and the page stays usable
    failInfer = true;
    await page.getByLabel('Spares file', { exact: true }).setInputFiles(file);
    await page.getByText('The file could not be read').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('The file could not be read').isVisible() && await page.getByText('Unsupported file (fixture)').isVisible(), 'a refused file shows the reason on the page');
    failInfer = false;

    await page.getByLabel('Spares file', { exact: true }).setInputFiles(file);
    await page.getByText('Column mapping').waitFor({ timeout: 8000 });
    check(await page.getByRole('combobox', { name: /Stock code/ }).innerText().then(t => t.includes('Code')), 'the detected columns are pre-selected');
    check(await page.getByText('High confidence').first().isVisible() && await page.getByText('Low confidence').first().isVisible(), 'confidence is stated in words');
    check(await page.getByText('3 ready to import').isVisible() && await page.getByText(/1 skipped: no stock code or description/).isVisible(), 'valid and skipped rows are counted');
    check(await page.getByText('Kept as is').isVisible(), 'a row with no price says the price is kept');
    await shot(page, 'review@1440');

    check(await page.getByRole('radio', { name: /Update existing parts/ }).getAttribute('aria-checked') === 'true', 'update is the default mode');
    check(await page.getByText(/Stock on hand, limits, priority and supplier are kept|stock on hand, limits, priority and supplier are kept/i).first().isVisible(), 'the mode says what it keeps');

    // import confirms first, then sends only what the file says
    await page.getByRole('button', { name: 'Import 3 parts' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.pathname === '/api/spares/bulk'), 'cancelling the confirmation imports nothing');

    failBulk = true;
    await page.getByRole('button', { name: 'Import 3 parts' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Import' }).click();
    await page.getByText('The import failed').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('The import failed').isVisible() && await page.getByText(/Bulk save failed \(fixture\)/).isVisible(), 'a failed import shows the reason and keeps the mapping');
    failBulk = false;

    await page.getByRole('button', { name: /^Try again/ }).click();
    await page.getByText('Added').first().waitFor({ timeout: 5000 }).catch(() => {});
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/spares/bulk').pop();
    const items = post?.body?.items ?? [];
    check(items.length === 3 && post.body.upsert === true && post.body.skip_existing === false, 'three valid rows are sent in update mode', JSON.stringify({ n: items.length, upsert: post?.body?.upsert }));
    check(items[0].unit_price === 1234.5 && items[1].unit_price === 12.5, 'prices with thousands separators and a decimal comma are read correctly', JSON.stringify([items[0]?.unit_price, items[1]?.unit_price]));
    check(!('unit_price' in items[2]), 'a blank price is not sent (it must not overwrite the stored price with 0)');
    const forbidden = ['current_quantity', 'min_quantity', 'max_quantity', 'priority', 'safety_stock', 'lead_time_days'];
    check(items.every(i => forbidden.every(k => !(k in i))), 'stock on hand, limits, priority and lead time are never sent');
    check(await page.getByText('In the file').isVisible() && await page.getByRole('link', { name: 'View spares' }).isVisible(), 'the result step shows the counts and a way back');
    await shot(page, 'result@1440');
  },
};
export default spec;
