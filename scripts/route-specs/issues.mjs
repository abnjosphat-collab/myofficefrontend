// /issues: record a stock issue (form first), the issue log, analytics, detail and delete.
const today = new Date();
const iso = offset => { const d = new Date(today); d.setDate(d.getDate() + offset); d.setHours(10, 0, 0, 0); return d.toISOString(); };
const ISSUES = [
  { id: 1, issued_at: iso(-2), recipient_name: 'Ann Alpha', recipient_id: 'E1', issued_by: 'Store Clerk', notes: 'Pump repair', items: [{ stock_code: 'BRG-1', description: 'Bearing 6204', qty: 2, unit: 'UN', unit_price: 12.5 }, { description: 'Grease', qty: 1, unit: 'KG' }] },
  { id: 2, issued_at: iso(-10), recipient_name: 'Ben Beta', items: [{ stock_code: 'SEAL-9', description: 'Seal kit', qty: 4, unit: 'UN', unit_price: 30 }] },
  // A legacy record with no items and no date must render rather than crash.
  { id: 3, recipient_name: 'Cy Gamma', issued_at: '', items: null },
];
const SPARES = [
  { id: 1, stock_code: 'BRG-1', description: 'Bearing 6204', unit_of_measure: 'UN', unit_price: 12.5, category: 'Bearings', current_quantity: 3 },
  { id: 2, stock_code: 'SEAL-9', description: 'Seal kit', unit_of_measure: 'UN', unit_price: 30, category: 'Seals', current_quantity: 10 },
];
let failCreate = false;
const spec = {
  route: '/issues',
  h1: 'Stock issues',
  data: {
    '/api/issues': request => (request.method() === 'POST' ? (failCreate ? { __status: 422, body: { detail: 'Quantity rejected (fixture)' } } : { id: 99 }) : ISSUES),
    'DELETE /api/issues/2': {},
    '/api/issues/stats/summary': { total: 3, today: 0, this_week: 1, unique_recipients: 3 },
    '/api/spares': SPARES,
    '/api/employees': [{ id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', department: 'Mining' }],
  },
  async ready(page, calls, { check, shot }) {
    const log = page.getByRole('table', { name: 'Stock issue log' });
    check(await log.getByRole('row').count() === 4, 'header plus three issues (a legacy record with no items or date does not crash)');
    check(await log.getByText('No price').first().isVisible(), 'an issue with no price says so instead of $0');
    check(await page.getByText(/does not change the stock quantities/).isVisible(), 'the page says it records issues and does not change stock');
    await shot(page, 'page@1440');

    // validation is explained on the field and nothing is sent
    await page.getByRole('button', { name: 'Record issue' }).click();
    check(await page.getByText('Enter who received the items.').isVisible() && await page.getByText(/Add at least one item/).isVisible(), 'a blank form explains what is missing');
    check(!calls.some(c => c.method === 'POST' && c.pathname === '/api/issues'), 'an invalid form sends nothing');

    // picking a spare fills the row; a quantity above stock warns
    await page.getByLabel('Issued to').fill('Ann Alpha');
    await page.getByRole('combobox', { name: 'Stock code' }).first().click();
    await page.getByRole('option', { name: /BRG-1/ }).click();
    check((await page.getByLabel('Description, item 1').inputValue()) === 'Bearing 6204' && (await page.getByLabel('Unit cost, item 1').inputValue()) === '12.5', 'choosing a spare fills its description and unit cost');
    await page.getByLabel('Quantity, item 1').fill('5');
    check(await page.getByText('Only 3 of BRG-1 in stock.').isVisible(), 'a quantity above stock is flagged');
    await page.getByLabel('Quantity, item 1').fill('0');
    await page.getByRole('button', { name: 'Record issue' }).click();
    check(await page.getByText('Quantity must be more than 0.').first().isVisible(), 'a zero quantity is an error, not silently changed to 1');
    await page.getByLabel('Quantity, item 1').fill('2');

    // a refused save keeps everything and says why
    failCreate = true;
    await page.getByRole('button', { name: 'Record issue' }).click();
    await page.getByText('The issue was not recorded').waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/Quantity rejected \(fixture\)/).isVisible() && (await page.getByLabel('Issued to').inputValue()) === 'Ann Alpha' && (await page.getByLabel('Quantity, item 1').inputValue()) === '2', 'a refused save shows the reason and keeps what was typed');
    failCreate = false;
    await page.getByRole('button', { name: 'Record issue' }).click();
    await page.waitForTimeout(800);
    const post = calls.filter(c => c.method === 'POST' && c.pathname === '/api/issues').pop();
    check(post?.body.recipient_name === 'Ann Alpha' && post.body.items.length === 1 && post.body.items[0].stock_code === 'BRG-1' && post.body.items[0].qty === 2 && post.body.items[0].unit_price === 12.5 && /T/.test(post.body.issued_at), 'saving sends the recipient, the item and an ISO date', JSON.stringify(post?.body).slice(0, 160));
    check((await page.getByLabel('Issued to').inputValue()) === '', 'the form is cleared after a good save');

    // detail and delete
    await log.getByRole('row').filter({ hasText: 'Ann Alpha' }).first().click();
    const detail = page.getByRole('dialog', { name: /Issue to Ann Alpha/ });
    await detail.waitFor({ timeout: 5000 });
    check(await detail.getByText('Bearing 6204').isVisible() && await detail.getByText('Grease').isVisible(), 'the detail lists every item');
    await shot(page, 'detail@1440');
    await detail.getByRole('button', { name: 'Close' }).first().click();
    await page.getByRole('button', { name: /^Delete the issue to Ben Beta/ }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete the issue to Ben Beta/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/issues/2'), 'confirming sends the delete');

    // analytics
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByRole('heading', { name: 'Cost over time' }).isVisible() && await page.getByRole('heading', { name: /Top recipients/ }).isVisible(), 'analytics shows the cost charts');
    check(await page.getByText(/issues have prices/).isVisible(), 'the statistics state how many issues carry a price');
    await shot(page, 'analytics@1440');
  },
  empty: { data: { '/api/issues': [] }, text: 'No issues recorded yet' },
  failing: { paths: ['/api/issues'], text: 'Stock issues could not be loaded', notShown: ['No issues recorded yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Stock issue log' }).isVisible(), 'Try again loads the log'); } },
};
export default spec;
