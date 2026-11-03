// /ppe as the Mining register: the Mining badge, scoped matrix saves, the Issue Log tab (newest movement first,
// opening records, kind/date/item/section/search filters, download of the filtered result), and Mining issues posted
// as atomic events with a quantity. Mock shapes mirror the real router, including effective_date/section on events.
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const rec = (id, over = {}) => ({ id: String(id), employee_id: 'M100', employee_name: 'Tendai Moyo', position: 'Miner', department: 'Mining', ppe_type: 'jacket', item_name: 'Mine Jacket', size: 'L', issue_date: day(-100), expiry_date: day(200), condition: 'good', status: 'active', notes: '', issued_by: 'Store', location: 'Shaft Store', mine_section: 'Shaft A', ...over });
const RECS = [
  rec(1),
  rec(2, { ppe_type: 'safety_chain', item_name: 'Shaft Chain', size: '', issue_date: day(-40), expiry_date: day(-5) }),
  rec(3, { employee_id: 'M200', employee_name: 'Rudo Dube', position: 'Fitter', mine_section: 'Decline', ppe_type: 'sinking_suit', item_name: 'Sink Suit', size: 'M', issue_date: day(-20), expiry_date: day(10) }),
];
const ev = (id, over = {}) => ({ id, kind: 'issue', employee_id: 'M100', ppe_type: 'jacket', quantity: 2, department: 'Mining', section: 'Shaft A', effective_date: day(-100), record_id: 1, predecessor_event_id: null, reversed_event_id: null, idempotency_key: `k-${id}`, evidence: {}, result: {}, actor: 'store@x.com', ...over });
const EVENTS = [
  ev('ev1'),
  ev('ev2', { ppe_type: 'safety_chain', quantity: 1, effective_date: day(-40), record_id: 2, idempotency_key: 'k-ev2' }),
  ev('ev3', { kind: 'return', quantity: 1, effective_date: day(-5), record_id: 2, idempotency_key: 'k-ev3' }),
  ev('ev4', { employee_id: 'M200', ppe_type: 'sinking_suit', quantity: 1, section: 'Decline', effective_date: day(-20), record_id: 3, idempotency_key: 'k-ev4' }),
  ev('ev5', { employee_id: 'M200', ppe_type: 'helmet', quantity: null, section: 'Decline', effective_date: '2025-06-15', record_id: null, evidence: { opening_observation: true, source: 'PPE CARDS' }, idempotency_key: 'k-ev5' }),
];
const EMPLOYEES = [
  { id: 201, employee_id: 'M100', first_name: 'Tendai', last_name: 'Moyo', designation: 'Miner', department: 'Mining', section: 'Shaft A' },
  { id: 202, employee_id: 'M200', first_name: 'Rudo', last_name: 'Dube', designation: 'Fitter', department: 'Mining', section: 'Decline' },
  { id: 203, employee_id: 'M300', first_name: '', last_name: '', designation: '', department: 'Mining', section: '' },
];

const spec = {
  route: '/ppe',
  h1: 'PPE',
  storage: { 'myoffice.department-view': 'Mining' },
  data: {
    '/api/ppe': RECS,
    '/api/ppe/events': request => (request.method() === 'POST' ? { ...request.postDataJSON(), record_id: 99, duplicate: false } : EVENTS),
    '/api/ppe-order-list': [],
    '/api/ppe/matrix': request => (request.method() === 'PUT' ? { updated: 1 } : { jacket: 24, safety_chain: 24, helmet: 24, sinking_suit: 3, gumboots: 3, overall: 6, harness: 24, safety_shoes: 6 }),
    '/api/employees/': EMPLOYEES,
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Mining register').isVisible(), 'the Mining register badge shows');
    check(await page.getByRole('button', { name: /^People\s*3/ }).isVisible(), 'all three Mining people are counted (one with no PPE yet)');
    await shot(page, 'mining-register@1440');

    // the Issue Log lists the newest movement first, with the opening record badged and its quantity unknown
    await page.getByRole('tab', { name: 'Issue log' }).click();
    const log = page.getByRole('table', { name: 'PPE movements' });
    await log.waitFor({ timeout: 5000 });
    check(await log.getByRole('row').count() === 6, 'five movements are listed newest-first', String(await log.getByRole('row').count()));
    const firstRow = log.getByRole('row').nth(1);
    check(await firstRow.getByText('Return').isVisible(), 'the newest movement (a return) is first');
    check(await page.getByText('Opening record').first().isVisible(), 'the imported opening observation wears its source badge');
    check(await log.getByText('Unknown').first().isVisible(), 'the unknown opening quantity is unknown, not zero');
    check(await page.getByRole('button', { name: 'Download' }).isVisible(), 'the filtered result can be downloaded');
    await shot(page, 'issue-log@1440');

    // filters narrow the list: a search, then hiding the opening records
    await page.getByRole('searchbox').fill('M200');
    check(await log.getByRole('row').count() === 3, 'searching a mine number narrows the log', String(await log.getByRole('row').count()));
    await page.getByRole('searchbox').fill('');
    await page.getByRole('combobox', { name: 'Movement' }).click();
    await page.getByRole('option', { name: 'Return', exact: true }).click();
    check(await log.getByRole('row').count() === 2, 'the movement filter shows only returns', String(await log.getByRole('row').count()));
    await page.getByRole('combobox', { name: 'Movement' }).click();
    await page.getByRole('option', { name: 'All movements' }).click();
    await page.getByRole('checkbox', { name: /Show opening records/ }).uncheck();
    check(await log.getByRole('row').count() === 5, 'hiding opening records drops the imported row', String(await log.getByRole('row').count()));
    check(await page.getByText('Opening record', { exact: true }).count() === 0, 'no opening badge remains once hidden');
    await page.getByRole('checkbox', { name: /Show opening records/ }).check();

    // a Mining issue posts one atomic event with the quantity, scoped to Mining
    await page.getByRole('tab', { name: 'Employees' }).click();
    await page.getByRole('button', { name: 'Issue PPE' }).first().click();
    const iss = page.getByRole('dialog', { name: 'Issue PPE' });
    await iss.waitFor({ timeout: 5000 });
    await iss.getByRole('combobox', { name: 'Pick an employee' }).fill('Rudo');
    await page.getByRole('option', { name: /Rudo Dube/ }).click();
    check(await iss.getByLabel(/^Quantity/).isVisible(), 'a new Mining issue asks for the quantity');
    await iss.getByLabel(/^Quantity/).fill('3');
    await iss.getByLabel(/^Item or brand/).fill('Fixture jackets');
    const posted = page.waitForResponse(r => r.url().includes('/api/ppe/events') && r.request().method() === 'POST', { timeout: 8000 });
    await iss.getByRole('button', { name: 'Issue PPE' }).click();
    await posted;
    const eventPost = [...calls].reverse().find(c => c.method === 'POST' && c.pathname === '/api/ppe/events');
    check(!!eventPost && eventPost.body?.kind === 'issue' && eventPost.body?.quantity === 3 && eventPost.body?.employee_id === 'M200' && typeof eventPost.body?.idempotency_key === 'string', 'the issue posts one atomic event with the quantity and a key', JSON.stringify(eventPost?.body));
    check(!!eventPost && eventPost.query.includes('department=Mining') && !('department' in (eventPost.body ?? {})), 'the event is scoped in the query, never the body', eventPost?.query);

    // the temporary gaps tab surfaces the cleanup lists, Mining-only
    await page.getByRole('tab', { name: 'Gaps' }).click();
    check(await page.getByText('Temporary cleanup view').isVisible(), 'the gaps tab says it is temporary');
    for (const heading of ['Implausible issue dates', 'Missing sizes', 'No PPE at all', 'No job title', 'Import quarantine', 'Also in Engineering']) {
      check(await page.getByRole('heading', { name: new RegExp(heading) }).isVisible(), `the gaps tab lists ${heading}`);
    }
    await shot(page, 'mining-gaps@1440');

    // matrix saves from the Mining register stay inside Mining
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Replacement matrix' }).click();
    const mx = page.getByRole('dialog', { name: 'Replacement matrix' });
    await mx.waitFor({ timeout: 5000 });
    const currentInterval = Number(await mx.getByLabel('Months').first().inputValue());
    await mx.getByLabel('Months').first().fill(String(currentInterval + 1));
    await mx.getByRole('button', { name: 'Save', exact: true }).first().click();
    await page.waitForTimeout(500);
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/ppe/matrix').pop();
    check(put?.body.department === 'Mining', 'a Mining matrix save carries the department', JSON.stringify(put?.body));
    await page.keyboard.press('Escape');
  },
  mobile: async (page, { check, shot }) => {
    await page.getByRole('tab', { name: 'Issue log' }).click();
    await page.getByRole('table', { name: 'PPE movements' }).waitFor({ timeout: 5000 });
    await shot(page, 'issue-log@390');
    const px = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(px === 0, 'no horizontal page scroll on a phone', `${px}px`);
  },
};

export default spec;
