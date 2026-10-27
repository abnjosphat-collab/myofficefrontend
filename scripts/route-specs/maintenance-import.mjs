// /maintenance/import: eMaint import (M7) — assets and PM schedules. Upload,
// template, column mapping, register matching, import with confirmation, and
// the unmatched report. Two specs: the assets tab, then the PM tab.
let failInferA = false;
let failCommitA = false;
const INFER_A = {
  inferred: { asset_id: 'Asset ID', name: 'Asset Description', status: 'Status' },
  confidence: { asset_id: 1, name: 1, status: 0.8 },
  all_columns: ['Asset ID', 'Asset Description', 'Status'],
  raw_rows: [
    { _row: 2, 'Asset ID': 'CRS-9', 'Asset Description': 'New Conveyor', Status: 'Active' },
    { _row: 3, 'Asset ID': 'CRS-1', 'Asset Description': 'Crusher 1', Status: 'Active' },
    { _row: 4, 'Asset ID': '', 'Asset Description': 'mill 3', Status: 'Active' },
  ],
  total_rows: 3,
};
const PREVIEW_A = {
  rows: [
    { row: 2, ref: 'CRS-9', status: 'new', values: { asset_id: 'CRS-9', name: 'New Conveyor', held: { manufacturer: 'BeltCo' } }, errors: [], match: null, note: '' },
    { row: 3, ref: 'CRS-1', status: 'exists', values: { asset_id: 'CRS-1', name: 'Crusher 1', held: {} }, errors: [], match: { id: 7, name: 'Crusher 1', equipment_id: 'CRS-1' }, note: 'Equipment ID CRS-1 is already on the register (Crusher 1)' },
    { row: 4, ref: '', status: 'close', values: { asset_id: '', name: 'mill 3', held: {} }, errors: [], match: { id: 9, name: 'Mill 3', equipment_id: 'MILL-3' }, note: "Not imported: 'mill 3' closely matches 'Mill 3' on the register (MILL-3)." },
  ],
  summary: { new: 1, exists: 1, close: 1, invalid: 0 },
};
const RESULT_A = {
  created: 1, skipped: 2, errors: 0, total: 3,
  rows: [
    { row: 2, ref: 'CRS-9', status: 'created', id: 44, reasons: [] },
    { row: 3, ref: 'CRS-1', status: 'exists', id: null, reasons: ['Equipment ID CRS-1 is already on the register (Crusher 1)'] },
    { row: 4, ref: '', status: 'close', id: null, reasons: ["Not imported: 'mill 3' closely matches 'Mill 3' on the register (MILL-3)."] },
  ],
};
const INFER_S = {
  inferred: { title: 'PM Description', frequency: 'Frequency', asset_id: 'Asset ID' },
  confidence: { title: 1, frequency: 1, asset_id: 1 },
  all_columns: ['PM ID', 'Asset ID', 'PM Description', 'Frequency', 'Next Due'],
  raw_rows: [
    { _row: 2, 'PM ID': 'PM-101', 'Asset ID': 'CRS-1', 'PM Description': 'Weekly liner check', Frequency: 'Weekly', 'Next Due': '2026-11-06' },
    { _row: 3, 'PM ID': 'PM-103', 'Asset ID': 'NOPE-1', 'PM Description': 'Tighten bolts', Frequency: 'Monthly', 'Next Due': '2026-11-20' },
  ],
  total_rows: 2,
};
const PREVIEW_S = {
  rows: [
    { row: 2, ref: 'PM-101', status: 'new', values: { title: 'Weekly liner check', asset_id: 'CRS-1', asset_name: 'Crusher 1', frequency: 'weekly', next_due: '2026-11-06' }, errors: [], match: { id: 7, name: 'Crusher 1', equipment_id: 'CRS-1' }, note: '' },
    { row: 3, ref: 'PM-103', status: 'invalid', values: { title: 'Tighten bolts', asset_id: 'NOPE-1', asset_name: '', frequency: 'monthly', next_due: '2026-11-20' }, errors: ["No register machine 'NOPE-1' (import the asset first, or fix the spelling)"], match: null, note: '' },
  ],
  summary: { new: 1, exists: 0, close: 0, invalid: 1 },
};
const RESULT_S = {
  created: 1, skipped: 1, errors: 0, total: 2,
  rows: [
    { row: 2, ref: 'PM-101', status: 'created', id: 21, reasons: [] },
    { row: 3, ref: 'PM-103', status: 'invalid', id: null, reasons: ["No register machine 'NOPE-1' (import the asset first, or fix the spelling)"] },
  ],
};

const assets = {
  route: '/maintenance/import',
  h1: 'Import assets from eMaint',
  data: {
    'POST /api/emaint-import/assets/infer': () => (failInferA ? { __status: 400, body: { detail: 'Unsupported file (fixture)' } } : INFER_A),
    'POST /api/emaint-import/assets/preview': () => PREVIEW_A,
    'POST /api/emaint-import/assets/commit': () => (failCommitA ? { __status: 500, body: { detail: 'Commit failed (fixture)' } } : RESULT_A),
  },
  async ready(page, calls, { check, shot }) {
    const file = { name: 'assets.csv', mimeType: 'text/csv', buffer: Buffer.from('fixture') };
    check(await page.getByRole('tab', { name: 'Assets' }).getAttribute('aria-selected') === 'true', 'the assets tab is selected first');
    check(await page.getByRole('button', { name: 'Download template' }).isVisible(), 'the template is offered before any upload');
    check(await page.getByRole('table', { name: 'Expected columns' }).getByText('Asset Description').isVisible(), 'the column guide names the required heading');
    await shot(page, 'upload@1440');

    // a file the server refuses is explained and the page stays usable
    failInferA = true;
    await page.getByLabel('eMaint assets file', { exact: true }).setInputFiles(file);
    await page.getByText('The file could not be read').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('The file could not be read').isVisible() && await page.getByText('Unsupported file (fixture)').isVisible(), 'a refused file shows the reason on the page');
    failInferA = false;

    await page.getByLabel('eMaint assets file', { exact: true }).setInputFiles(file);
    await page.getByText('Column mapping').waitFor({ timeout: 8000 });
    check(await page.getByRole('combobox', { name: /Asset Description/ }).innerText().then(t => t.includes('Asset Description')), 'the detected columns are pre-selected');
    check((await page.getByText('Exact heading').count()) >= 2 && await page.getByText('Known alias').isVisible(), 'confidence is stated in words');
    await page.getByRole('button', { name: 'Check matches' }).click();
    await page.getByText('New Conveyor').first().waitFor({ timeout: 8000 });
    check(await page.getByText('1 asset to import').isVisible() && await page.getByText('1 already there').isVisible() && await page.getByText('1 near miss').isVisible(), 'new, existing and near-miss rows are counted');
    const preview = page.getByRole('table', { name: 'Assets import preview' });
    check(await preview.getByText('Will import').isVisible() && await preview.getByText('Already there — skipped').isVisible() && await preview.getByText('Near miss — held').isVisible(), 'every row carries its outcome');
    check(await preview.getByText(/Held for now: Manufacturer BeltCo/).isVisible(), 'held fields say they are stored nowhere yet');
    await shot(page, 'review@1440');

    // import confirms first, then reports what landed and what did not
    await page.getByRole('button', { name: 'Import 1 asset' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.pathname === '/api/emaint-import/assets/commit'), 'cancelling the confirmation imports nothing');

    failCommitA = true;
    await page.getByRole('button', { name: 'Import 1 asset' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Import' }).click();
    await page.getByText('The import failed').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText('The import failed').isVisible() && await page.getByText(/Commit failed \(fixture\)/).isVisible(), 'a failed import shows the reason and keeps the matches');
    failCommitA = false;

    await page.getByRole('button', { name: /^Try again/ }).click();
    await page.getByText('What was not imported').waitFor({ timeout: 5000 }).catch(() => {});
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/emaint-import/assets/commit').pop();
    check(post?.body?.rows?.length === 3 && typeof post?.body?.mapping === 'object', 'the commit re-sends the raw rows and the mapping', JSON.stringify({ n: post?.body?.rows?.length }));
    check(await page.getByRole('link', { name: 'View the register' }).getAttribute('href') === '/equipment', 'the result links the register');
    const report = page.getByRole('table', { name: 'Rows not imported' });
    check(await report.getByText('Crusher 1').first().isVisible() && await report.getByText('Already there').isVisible() && await report.getByText('Near miss').isVisible(), 'the unmatched report names each row and why');
    check(await page.getByRole('button', { name: 'Export Excel' }).isVisible(), 'the unmatched report downloads');
    await shot(page, 'result@1440');
  },
};

const schedules = {
  route: '/maintenance/import?kind=schedules',
  h1: 'Import PM schedules from eMaint',
  data: {
    'POST /api/emaint-import/schedules/infer': () => INFER_S,
    'POST /api/emaint-import/schedules/preview': () => PREVIEW_S,
    'POST /api/emaint-import/schedules/commit': () => RESULT_S,
  },
  async ready(page, calls, { check, shot }) {
    const file = { name: 'pm.csv', mimeType: 'text/csv', buffer: Buffer.from('fixture') };
    check(await page.getByRole('tab', { name: 'PM schedules' }).getAttribute('aria-selected') === 'true', '?kind=schedules lands on the PM tab');
    await page.getByLabel('eMaint schedules file', { exact: true }).setInputFiles(file);
    await page.getByText('Column mapping').waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Check matches' }).click();
    await page.getByText('Weekly liner check').first().waitFor({ timeout: 8000 });
    check(await page.getByText('1 PM schedule to import').isVisible() && await page.getByText('1 cannot import').isVisible(), 'the PM counts separate the new from the invalid');
    const preview = page.getByRole('table', { name: 'PM schedules import preview' });
    check(await preview.getByText('weekly · due 2026-11-06').isVisible(), 'the rhythm shows the mapped frequency and first due date');
    check(await preview.getByText(/No register machine 'NOPE-1'/).isVisible(), 'an unknown machine says to import the asset first');
    await shot(page, 'pm-review@1440');
    await page.getByRole('button', { name: 'Import 1 PM schedule' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Import' }).click();
    await page.getByText('What was not imported').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByRole('link', { name: 'View schedules' }).getAttribute('href') === '/maintenance', 'the PM result links the schedules');
    await shot(page, 'pm-result@1440');
  },
};

const specs = [assets, schedules];
export default specs;
