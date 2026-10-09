// /ppe: employees with PPE (tiles as filters, search, detail), due items (select, order list, not required), the order list, the replacement
// matrix, the summary, and issue/edit/delete. The order list is shared (kept on the server): added, listed and removed through the API.
// Mock shapes mirror the real router.
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const rec = (id, over = {}) => ({ id: String(id), employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', department: 'MAINTENANCE', ppe_type: 'safety_shoes', item_name: 'Bata Industrial', size: '8', issue_date: day(-100), expiry_date: day(200), condition: 'good', status: 'active', notes: '', issued_by: 'Store', location: 'Workshop', mine_section: 'Mechanical', ...over });
const ORDER = new Map();
const RECS = [
  rec(1, { expiry_date: day(-10) }),
  rec(2, { ppe_type: 'helmet', item_name: 'MSA V-Gard', size: '', expiry_date: day(12) }),
  rec(3, { employee_id: 'C200', employee_name: 'Bob Beta', position: 'Electrician', mine_section: 'Electrical', expiry_date: day(300) }),
  rec(4, { employee_id: 'C200', employee_name: 'Bob Beta', position: 'Electrician', mine_section: 'Electrical', ppe_type: 'overall', item_name: 'Acid-proof overall', size: 'L', expiry_date: day(-3) }),
  // a legacy record with almost nothing on it must render rather than crash
  { id: '5', employee_id: 'C300', employee_name: 'Cy Gamma', ppe_type: 'safety_shoes', status: 'active' },
];
let failSave = false;

const spec = {
  route: '/ppe',
  h1: 'PPE',
  data: {
    '/api/ppe': request => (request.method() === 'POST' ? (failSave ? { __status: 422, body: { detail: 'Employee ID rejected (fixture)' } } : { id: '99', ...request.postDataJSON() }) : RECS),
    'PATCH /api/ppe/1': request => ({ ...RECS[0], ...request.postDataJSON() }),
    'PATCH /api/ppe/4': request => ({ ...RECS[3], ...request.postDataJSON() }),
    'DELETE /api/ppe/2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    '/api/ppe-order-list': request => {
      if (request.method() === 'POST') { for (const e of request.postDataJSON().entries) if (!ORDER.has(e.record_id)) ORDER.set(e.record_id, e); return { added: 1 }; }
      if (request.method() === 'DELETE') { ORDER.clear(); return { ok: true }; }
      return [...ORDER.values()];
    },
    'POST /api/ppe-order-list/remove': request => { for (const id of request.postDataJSON().record_ids) ORDER.delete(id); return { ok: true }; },
    '/api/ppe/matrix': request => (request.method() === 'PUT' ? { updated: 2 } : { safety_shoes: 12, helmet: 24 }),
    '/api/employees/': [{ employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'MAINTENANCE', section: 'Mechanical' }, { employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Welder', department: 'MAINTENANCE', section: 'Mechanical' }, { employee_id: 'C300', first_name: '', last_name: '', designation: '', section: '' }],
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Employees with PPE' }).getByRole('button', { name: /^Open the PPE held by/ });
    check(await cards.count() === 3, 'three employee cards (a record with almost nothing on it renders)', String(await cards.count()));
    check(await page.getByText('overdue', { exact: false }).first().isVisible(), 'standing is stated in words');
    await shot(page, 'employees@1440');

    await page.getByRole('button', { name: /^Overdue\s*\d/ }).click();
    check(await cards.count() === 2, 'the Overdue tile filters to the people with overdue items', String(await cards.count()));
    await page.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
    await page.getByRole('button', { name: /^People\s*\d/ }).click();
    await page.getByRole('searchbox').first().fill('bob');
    check(await cards.count() === 1, 'search finds a person by name');
    await page.getByRole('searchbox').first().fill('');

    // employee detail, then item detail
    await page.getByRole('button', { name: 'Open the PPE held by Ann Alpha' }).click();
    const det = dialog('Ann Alpha');
    await det.waitFor({ timeout: 5000 });
    check(await det.getByText('Overdue').first().isVisible(), 'the employee detail shows the overdue item');
    await shot(page, 'employee-detail@1440');
    await page.keyboard.press('Escape');

    // delete refused shows the reason
    await page.getByRole('button', { name: 'Open the PPE held by Ann Alpha' }).click();
    await det.waitFor({ timeout: 5000 });
    await det.getByRole('button', { name: /^More actions for MSA V-Gard/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await det.getByRole('button', { name: /^More actions for MSA V-Gard/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not deleted: Manager role required/).isVisible(), 'a refused delete shows the reason');
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await det.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    check(!(await det.isVisible()), 'Escape closes the employee detail after a refused delete');

    // due items: select, order list
    await page.getByRole('tab', { name: 'Due items' }).click();
    const due = page.getByRole('table', { name: 'Overdue PPE' });
    await due.waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 3, 'two overdue items are listed', String(await due.getByRole('row').count()));
    await shot(page, 'due@1440');
    await due.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Add to the order list' }).click();
    check(await page.getByRole('tab', { name: /^Order list\s*1$/ }).isVisible(), 'adding to the order list updates the tab count');
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list' && c.body.entries.length === 1 && c.body.entries[0].record_id) && ORDER.size === 1, 'the item is added to the shared order list on the server');

    // mark not required sends the status
    await due.getByRole('checkbox').nth(2).check();
    await page.getByRole('button', { name: 'Mark not required' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'PATCH' && c.pathname.startsWith('/api/ppe/') && c.body.status === 'not_required'), 'marking not required patches only the status');

    // order list
    await page.getByRole('tab', { name: /^Order list/ }).click();
    const poToggle = page.getByRole('button', { name: /Purchase order lines/ });
    check(await poToggle.isVisible() && await poToggle.getAttribute('aria-expanded') === 'false', 'the purchase order lines start collapsed');
    check(!(await page.getByRole('list', { name: 'Purchase order lines' }).isVisible()), 'collapsed lines are hidden so they do not get in the way');
    await poToggle.click();
    check(await page.getByRole('list', { name: 'Purchase order lines' }).isVisible(), 'opening the section shows the purchase order lines');
    await shot(page, 'order@1440');
    check(await page.getByText('Shared order list').isVisible(), 'the order list says it is shared');
    // issuing from the order list saves the new item and retires the one that was due, or the card keeps showing it as due
    const dueId = [...ORDER.keys()][0];
    const before = calls.length;
    await page.getByRole('button', { name: 'Issue', exact: true }).first().click();
    const issue = dialog('Issue PPE');
    await issue.waitFor({ timeout: 5000 });
    await issue.getByRole('button', { name: 'Issue PPE' }).click();
    const unknown = page.getByRole('alertdialog');
    if (await unknown.waitFor({ timeout: 1500 }).then(() => true).catch(() => false)) await unknown.getByRole('button', { name: 'Save anyway' }).click();
    await page.waitForTimeout(800);
    const after = calls.slice(before);
    check(after.some(c => c.method === 'POST' && c.pathname === '/api/ppe'), 'issuing from the order list saves the new record');
    check(after.some(c => c.method === 'PATCH' && c.pathname === `/api/ppe/${dueId}` && c.body.status === 'returned'), 'the item that was due is marked returned', JSON.stringify(after.map(c => `${c.method} ${c.pathname}`)));
    await page.getByRole('tab', { name: /^Order list/ }).click();
    await page.getByRole('button', { name: /^Remove/ }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    check(ORDER.size === 0 && calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list/remove'), 'removing an item removes it from the shared list on the server');

    // matrix
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Replacement matrix' }).click();
    const mx = dialog('Replacement matrix');
    await mx.waitFor({ timeout: 5000 });
    await mx.getByLabel('Months').first().fill('18');
    await mx.getByRole('button', { name: 'Save', exact: true }).first().click();
    await page.waitForTimeout(500);
    const put = calls.filter(c => c.method === 'PUT' && c.pathname === '/api/ppe/matrix').pop();
    check(put?.body.interval_months === 18 && typeof put.body.ppe_type === 'string', 'saving an interval sends the type and months', JSON.stringify(put?.body));
    await shot(page, 'matrix@1440');
    await page.keyboard.press('Escape');

    // summary
    await page.getByRole('tab', { name: 'Summary' }).click();
    check(await page.getByRole('heading', { name: 'By size' }).isVisible(), 'the summary shows the size breakdown');
    await shot(page, 'summary@1440');

    // a refused issue keeps the dialog and the typing
    failSave = true;
    await page.getByRole('button', { name: 'Issue PPE' }).first().click();
    const nw = dialog('Issue PPE');
    await nw.waitFor({ timeout: 5000 });
    await nw.getByLabel(/^Employee ID/).fill('C400');
    await nw.getByLabel(/^Full name/).fill('Eve Epsilon');
    await nw.getByLabel(/^Position/).fill('Rigger');
    await nw.getByLabel(/^Item or brand/).fill('Fixture gloves');
    await nw.getByRole('button', { name: 'Issue PPE' }).click();
    await nw.getByText('Employee ID rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await nw.getByText('Employee ID rejected (fixture)').isVisible() && (await nw.getByLabel(/^Full name/).inputValue()) === 'Eve Epsilon', 'a refused issue shows the reason and keeps what was typed');
    failSave = false;
  },
  create: {
    open: 'Issue PPE', dialog: 'Issue PPE', path: '/api/ppe', submit: 'Issue PPE',
    requiredText: 'Enter the employee ID.',
    async fill(dialog) { await dialog.getByLabel(/^Employee ID/).fill('C400'); await dialog.getByLabel(/^Full name/).fill('Dee Delta'); await dialog.getByLabel(/^Position/).fill('Welder'); await dialog.getByLabel(/^Item or brand/).fill('Fixture visor'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Employee ID/).inputValue()) === 'C400' && (await dialog.getByLabel(/^Full name/).inputValue()) === 'Dee Delta'; },
    body: b => b.employee_id === 'C400' && b.item_name === 'Fixture visor' && b.department === 'MAINTENANCE',
  },
  empty: { data: { '/api/ppe': [] }, text: 'No PPE issued yet' },
  failing: { paths: ['/api/ppe'], text: 'PPE records could not be loaded', notShown: ['No PPE issued yet'], async recovered(page, { check }) { await page.getByRole('list', { name: 'Employees with PPE' }).getByRole('button').first().waitFor({ timeout: 8000 }).catch(() => {}); check(await page.getByRole('list', { name: 'Employees with PPE' }).getByRole('button').first().isVisible(), 'Try again loads the records'); } },
};
export default spec;
