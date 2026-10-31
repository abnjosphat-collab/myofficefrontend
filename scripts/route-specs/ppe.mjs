// /ppe: employees with PPE (tiles as filters, search, detail), due items (select, order list, not required), the order basket, the replacement
// matrix, the summary, and issue/edit/delete. The basket is automatic + shared: overdue on-register items join on their own, the rest is
// kept on the server (added, listed, patched and removed through the API). Mock shapes mirror the real router, including its defaults.
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
  // an archived holder's record: hidden from the live views by default, on the register so never unmatched
  rec(6, { employee_id: 'C500', employee_name: 'Eve Epsilon', position: 'Hoist Driver', mine_section: 'Shaft', expiry_date: day(-5) }),
];
let failSave = false;
// the register is served under both paths: the page reads /api/employees (no slash) for the register check
const EMPLOYEES = [{ id: 101, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'MAINTENANCE', section: 'Mechanical' }, { id: 104, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Welder', department: 'MAINTENANCE', section: 'Mechanical' }, { id: 103, employee_id: 'C300', first_name: '', last_name: '', designation: '', section: '' }, { id: 105, employee_id: 'C500', first_name: 'Eve', last_name: 'Epsilon', designation: 'Hoist Driver', department: 'MAINTENANCE', section: 'Shaft', archived: true }];

const spec = {
  route: '/ppe',
  h1: 'PPE',
  data: {
    '/api/ppe': request => (request.method() === 'POST' ? (failSave ? { __status: 422, body: { detail: 'Employee ID rejected (fixture)' } } : { id: '99', ...request.postDataJSON() }) : RECS),
    'PATCH /api/ppe/1': request => ({ ...RECS[0], ...request.postDataJSON() }),
    'PATCH /api/ppe/4': request => ({ ...RECS[3], ...request.postDataJSON() }),
    'DELETE /api/ppe/2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    '/api/ppe-order-list': request => {
      if (request.method() === 'POST') { for (const e of request.postDataJSON().entries) if (!ORDER.has(e.record_id)) ORDER.set(e.record_id, { kind: 'line', source: 'manual', qty: 1, note: '', ...e }); return { added: 1 }; }
      if (request.method() === 'DELETE') { ORDER.clear(); return { ok: true }; }
      return [...ORDER.values()];
    },
    'POST /api/ppe-order-list/remove': request => { for (const id of request.postDataJSON().record_ids) ORDER.delete(id); return { ok: true }; },
    '/api/ppe/matrix': request => (request.method() === 'PUT' ? { updated: 2 } : { safety_shoes: 12, helmet: 24 }),
    '/api/employees/': EMPLOYEES,
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Employees' }).getByRole('button', { name: /^Open the PPE held by/ });
    check(await cards.count() === 4, 'four employee cards (a record with almost nothing on it renders, and a register person with no PPE gets a blank card)', String(await cards.count()));
    check(await page.getByRole('list', { name: 'Employees' }).getByRole('link', { name: 'Personnel' }).first().getAttribute('href') === '/employees?highlight=C100', 'each card links to the person on the Personnel register');
    check(await page.getByText('overdue', { exact: false }).first().isVisible(), 'standing is stated in words');
    await shot(page, 'employees@1440');

    await page.getByRole('button', { name: /^Overdue\s*\d/ }).click();
    check(await cards.count() === 2, 'the Overdue tile filters to the people with overdue items', String(await cards.count()));
    await page.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
    await page.getByRole('button', { name: /^People\s*\d/ }).click();
    await page.getByRole('searchbox').first().fill('bob');
    check(await cards.count() === 1, 'search finds a person by name');
    await page.getByRole('searchbox').first().fill('');

    // the No PPE yet view lists only the blank cards
    await page.getByRole('group', { name: 'Show' }).getByRole('button', { name: /^No PPE yet/ }).click();
    check(await cards.count() === 1, 'the No PPE yet view lists only the register person with no PPE', String(await cards.count()));
    check(await page.getByRole('button', { name: 'Open the PPE held by Dee Delta' }).isVisible(), 'the blank card belongs to the register person with no records');
    check(await page.getByRole('list', { name: 'Employees' }).getByText('No PPE issued yet').isVisible(), 'the blank card says no PPE is issued instead of Up to date');
    await page.getByRole('group', { name: 'Show' }).getByRole('button', { name: /^Everyone/ }).click();

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

    // unmatched delete-all: the notice offers it, cancelling deletes nothing, confirming deletes each and refetches
    await page.getByText('2 PPE records do not match the employee register').waitFor({ timeout: 5000 });
    await shot(page, 'unmatched-notice@1440');
    await page.getByRole('button', { name: 'Delete 2 unmatched PPE records' }).click();
    const c2 = page.getByRole('alertdialog');
    await c2.waitFor({ timeout: 5000 });
    check(await c2.getByText('Bob Beta').isVisible(), 'the bulk confirm names who is affected');
    await c2.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE' && (c.pathname === '/api/ppe/3' || c.pathname === '/api/ppe/4')), 'cancelling the bulk confirm deletes nothing');
    const getsBefore = calls.filter(c => c.method === 'GET' && c.pathname === '/api/ppe').length;
    await page.getByRole('button', { name: 'Delete 2 unmatched PPE records' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText('2 PPE records deleted.').waitFor({ timeout: 5000 }).catch(() => {});
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/ppe/3') && calls.some(c => c.method === 'DELETE' && c.pathname === '/api/ppe/4'), 'confirming deletes each unmatched record');
    check(await page.getByText('2 PPE records deleted.').isVisible(), 'the bulk delete reports how many went');
    check(calls.filter(c => c.method === 'GET' && c.pathname === '/api/ppe').length > getsBefore, 'the list refetches after the bulk delete');

    // archived holders are hidden by default and open read-only when shown (left shown: due must still exclude them)
    await page.getByRole('button', { name: 'Show archived (1)' }).waitFor({ timeout: 5000 });
    check(await page.getByRole('button', { name: 'Show archived (1)' }).isVisible(), 'an archived holder is hidden behind a toggle');
    await page.getByRole('button', { name: 'Show archived (1)' }).click();
    check(await cards.count() === 5, 'showing archived reveals the hidden holder', String(await cards.count()));
    await shot(page, 'archived-shown@1440');
    await page.getByRole('button', { name: 'Open the PPE held by Eve Epsilon' }).click();
    const arch = dialog('Eve Epsilon');
    await arch.waitFor({ timeout: 5000 });
    check(!(await arch.getByRole('button', { name: 'Issue PPE' }).isVisible().catch(() => false)), 'an archived holder opens read-only: no issue action');
    check(await arch.getByText('kept for history').isVisible(), 'the archived detail says why it is read-only');
    await shot(page, 'archived-detail@1440');
    await page.keyboard.press('Escape');
    await arch.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    // new issues pick the person from the register: no typed IDs, no archived people, no department posted
    await page.getByRole('button', { name: 'Issue PPE' }).first().click();
    const iss = dialog('Issue PPE');
    await iss.waitFor({ timeout: 5000 });
    await iss.getByRole('combobox', { name: 'Pick an employee' }).fill('Ann');
    await page.getByRole('option', { name: /Ann Alpha/ }).waitFor({ timeout: 5000 });
    check(!(await page.getByRole('option', { name: /Eve Epsilon/ }).isVisible().catch(() => false)), 'the issue picker offers no archived people');
    check(!(await iss.getByLabel(/^Employee ID/).isVisible().catch(() => false)), 'the person cannot be typed: there is no ID input');
    await iss.getByRole('combobox', { name: 'Pick an employee' }).fill('Dee');
    await page.getByRole('option', { name: /Dee Delta/ }).click();
    await page.getByRole('option', { name: /Dee Delta/ }).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await iss.getByText('Welder').waitFor({ timeout: 5000 });
    const facts = iss.locator('dl[aria-label="Person"]');
    check(await facts.getByText('C400').isVisible() && await facts.getByText('Dee Delta').isVisible() && await facts.getByText('Welder').isVisible(), 'the picked person shows as facts');
    await iss.getByLabel(/^Item or brand/).fill('Fixture boots');
    await iss.getByRole('button', { name: 'Issue PPE' }).click();
    await iss.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const posted = [...calls].reverse().find(c => c.method === 'POST' && c.pathname === '/api/ppe');
    check(!!posted && posted.body?.employee_id === 'C400' && !('department' in (posted.body ?? {})), 'the issue posts the picked number and no department (the server stamps it)');

    // bulk issue: one shared item for several people, one POST each, no department posted
    await page.getByRole('button', { name: 'Issue to several people' }).click();
    const bulk = dialog('Issue to several people');
    await bulk.waitFor({ timeout: 5000 });
    await bulk.getByRole('button', { name: 'Issue PPE' }).click();
    check(await bulk.getByText('Add at least one employee.').isVisible(), 'an empty bulk submit names the people list');
    await bulk.getByRole('checkbox', { name: /Dee Delta/ }).click();
    await bulk.getByRole('checkbox', { name: /Ann Alpha/ }).click();
    check(!(await bulk.getByRole('checkbox', { name: /Eve Epsilon/ }).isVisible().catch(() => false)), 'the bulk picker offers no archived people');
    await bulk.getByLabel(/^Item or brand/).fill('Fixture bulk visors');
    await bulk.getByRole('button', { name: 'Issue to 2 people' }).click();
    await bulk.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const bulks = [...calls].reverse().filter(c => c.method === 'POST' && c.pathname === '/api/ppe').slice(0, 2);
    check(bulks.length === 2 && bulks.every(c => !('department' in (c.body ?? {}))) && bulks.map(c => c.body?.employee_id).sort().join(',') === 'C100,C400', 'the bulk issue posts one record per person, each with its own number and no department', JSON.stringify(bulks.map(c => c.body?.employee_id)));

    // due items: the overdue on-register item is already on the basket (automatic); flagging it again says so and sends nothing
    await page.getByRole('tab', { name: 'Due items' }).click();
    const due = page.getByRole('table', { name: 'Overdue PPE' });
    await due.waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 3, 'two overdue items are listed', String(await due.getByRole('row').count()));
    check(!(await due.getByText('Eve Epsilon').isVisible().catch(() => false)), 'due never lists an archived holder, even while shown');
    await shot(page, 'due@1440');
    check(await page.getByRole('tab', { name: /^Order list\s*1$/ }).isVisible(), 'the overdue on-register item is on the basket on its own (the off-register one never joins automatically)');
    const postsBefore = calls.filter(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list').length;
    await due.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Add to the order list' }).click();
    await page.getByText('Already on the order list.').waitFor({ timeout: 5000 });
    check(calls.filter(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list').length === postsBefore && ORDER.size === 0, 'flagging an already-covered item sends nothing to the server');

    // flagging an item that is only due soon adds it by hand
    await page.getByRole('group', { name: 'Which items' }).getByRole('button', { name: /^Expiring soon/ }).click();
    const soon = page.getByRole('table', { name: 'PPE expiring soon' });
    await soon.waitFor({ timeout: 5000 });
    await soon.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Add to the order list' }).click();
    check(await page.getByRole('tab', { name: /^Order list\s*2$/ }).isVisible(), 'flagging a due-soon item adds it to the basket by hand');
    check(calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list' && c.body.entries.length === 1 && c.body.entries[0].record_id === '2') && ORDER.size === 1, 'the flagged item is stored on the shared order list');

    // mark not required sends the status
    await page.getByRole('group', { name: 'Which items' }).getByRole('button', { name: /^Overdue/ }).click();
    await due.waitFor({ timeout: 5000 });
    await due.getByRole('checkbox').nth(2).check();
    await page.getByRole('button', { name: 'Mark not required' }).click();
    await page.waitForTimeout(500);
    check(calls.some(c => c.method === 'PATCH' && c.pathname.startsWith('/api/ppe/') && c.body.status === 'not_required'), 'marking not required patches only the status');

    // the type lens narrows due + basket, and the browser remembers it
    check(await page.getByRole('tab', { name: /^Order list\s*2$/ }).isVisible(), 'before the lens the basket holds the automatic shoes and the flagged helmet');
    await page.getByRole('button', { name: 'PPE types filter: All types' }).click();
    await page.getByRole('group', { name: 'Which values to show' }).getByRole('button', { name: 'All except these' }).click();
    await page.getByRole('checkbox', { name: /Safety Shoes/ }).check();
    await page.keyboard.press('Escape');
    check(await page.getByRole('button', { name: 'Clear filters' }).count() === 0, 'with only the lens active there is no dead Clear filters button');
    await page.getByPlaceholder('Search employee or item').fill('zzz');
    check(await page.getByRole('button', { name: 'Clear filters' }).count() === 2, 'a local filter brings its own Clear back (toolbar and empty state)');
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.getByText('Acid-proof overall').waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 2, 'excluding a type empties the due list of it (the overall stays)', String(await due.getByRole('row').count()));
    check(await page.getByRole('button', { name: 'Reset' }).isVisible(), 'clearing local filters keeps the lens');
    check(await page.getByRole('group', { name: 'Which items' }).getByRole('button', { name: /^Overdue \(1\)/ }).isVisible(), 'the due counts follow the lens');
    await page.getByRole('tab', { name: /^Order list/ }).click();
    check(await page.getByRole('tab', { name: /^Order list\s*1$/ }).isVisible(), 'the basket count follows the lens (the automatic shoes hide, the flagged helmet stays)');
    await page.reload();
    await page.getByRole('tab', { name: 'Due items' }).click();
    await due.waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 2, 'the lens survives a reload', String(await due.getByRole('row').count()));
    await shot(page, 'due-lens@1440');
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'PPE types filter: All types' }).waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 3, 'resetting the lens brings everything back', String(await due.getByRole('row').count()));

    // including shows only that type
    await page.getByRole('button', { name: 'PPE types filter: All types' }).click();
    await page.waitForTimeout(350);
    await shot(page, 'due-lens-open@1440');
    await page.getByRole('checkbox', { name: /Safety Shoes/ }).check();
    await page.keyboard.press('Escape');
    check(await due.getByRole('row').count() === 2, 'including a type shows only it (the shoes, not the overall)', String(await due.getByRole('row').count()));
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'PPE types filter: All types' }).waitFor({ timeout: 5000 });
    check(await due.getByRole('row').count() === 3, 'resetting from include brings everything back', String(await due.getByRole('row').count()));

    // the two tabs share one lens, and lensing out every order line says so
    await page.getByRole('button', { name: 'PPE types filter: All types' }).click();
    await page.getByRole('checkbox', { name: /Rain Suit/ }).check();
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /^Order list/ }).click();
    check(await page.getByText('Nothing matches the type lens').isVisible(), 'the order tab honours the lens set on the due tab instead of pretending the list is empty');
    await page.waitForTimeout(350);
    await shot(page, 'basket-lens-empty@1440');
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'PPE types filter: All types' }).waitFor({ timeout: 5000 });
    check(await page.getByRole('tab', { name: /^Order list\s*2$/ }).isVisible(), 'resetting brings the order lines back');

    // order list
    await page.getByRole('tab', { name: /^Order list/ }).click();
    const poToggle = page.getByRole('button', { name: /Purchase order lines/ });
    check(await poToggle.isVisible() && await poToggle.getAttribute('aria-expanded') === 'false', 'the purchase order lines start collapsed');
    check(!(await page.getByRole('list', { name: 'Purchase order lines', exact: true }).isVisible()), 'collapsed lines are hidden so they do not get in the way');
    await poToggle.click();
    check(await page.getByRole('list', { name: 'Purchase order lines', exact: true }).isVisible(), 'opening the section shows the purchase order lines');
    await shot(page, 'order@1440');
    check(await page.getByText('Shared order list').isVisible(), 'the order list says it is shared');
    // issuing from the order list renews the item in place (new issue date, expiry from the matrix, still active = In date); nothing is marked returned
    // (the first row is the automatic overdue line; the stored manual line is the due-soon one added above)
    const dueId = '1';
    const before = calls.length;
    await page.getByRole('button', { name: 'Issue', exact: true }).first().click();
    const issue = dialog('Issue PPE');
    await issue.waitFor({ timeout: 5000 });
    await issue.getByRole('button', { name: 'Issue PPE' }).click();
    const unknown = page.getByRole('alertdialog');
    if (await unknown.waitFor({ timeout: 1500 }).then(() => true).catch(() => false)) await unknown.getByRole('button', { name: 'Save anyway' }).click();
    await page.waitForTimeout(800);
    const after = calls.slice(before);
    const renew = after.find(c => c.method === 'PATCH' && c.pathname === `/api/ppe/${dueId}`);
    check(!!renew && renew.body.status === 'active' && !!renew.body.issue_date, 'issuing from the order list updates that record in place: still active (In date), with the new issue date', JSON.stringify(after.map(c => `${c.method} ${c.pathname}`)));
    check(!after.some(c => c.method === 'PATCH' && c.body?.status === 'returned') && !after.some(c => c.method === 'POST' && c.pathname === '/api/ppe'), 'nothing is marked returned and no second record is created');
    await page.getByRole('tab', { name: /^Order list/ }).click();
    await page.getByRole('table', { name: 'Items on the order list' }).getByRole('row', { name: /MSA V-Gard/ }).getByRole('button', { name: 'Remove' }).click();
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
    const nwOpt = page.getByRole('option', { name: /Dee Delta/ });
    await nwOpt.waitFor({ timeout: 5000 });
    await nwOpt.click();
    await nwOpt.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await nw.getByLabel(/^Item or brand/).fill('Fixture gloves');
    await nw.getByRole('button', { name: 'Issue PPE' }).click();
    await nw.getByText('Employee ID rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await nw.getByText('Employee ID rejected (fixture)').isVisible() && (await nw.getByLabel(/^Item or brand/).inputValue()) === 'Fixture gloves' && await nw.locator('dl[aria-label="Person"]').getByText('Dee Delta').isVisible(), 'a refused issue shows the reason and keeps what was picked and typed');
    failSave = false;
  },
  create: {
    open: 'Issue PPE', dialog: 'Issue PPE', path: '/api/ppe', submit: 'Issue PPE',
    requiredText: 'Pick the person from the register.',
    async fill(dialog, page) { const box = dialog.getByRole('combobox', { name: 'Pick an employee' }); const opt = page.getByRole('option', { name: /Dee Delta/ }); if ((await box.getAttribute('aria-expanded').catch(() => null)) !== 'true') await box.click(); await box.fill('Dee'); await opt.waitFor({ timeout: 8000 }); await opt.click(); await dialog.getByLabel(/^Item or brand/).fill('Fixture visor'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Item or brand/).inputValue()) === 'Fixture visor' && await dialog.locator('dl[aria-label="Person"]').getByText('Dee Delta').isVisible(); },
    body: b => b.employee_id === 'C400' && b.item_name === 'Fixture visor' && !('department' in b),
  },
  empty: { data: { '/api/ppe': [] }, text: 'No PPE issued yet' },
  failing: { paths: ['/api/ppe'], text: 'PPE records could not be loaded', notShown: ['No PPE issued yet'], async recovered(page, { check }) { await page.getByRole('list', { name: 'Employees' }).getByRole('button').first().waitFor({ timeout: 8000 }).catch(() => {}); check(await page.getByRole('list', { name: 'Employees' }).getByRole('button').first().isVisible(), 'Try again loads the records'); } },
  mobile: async (page, { check, shot }) => {
    await page.getByRole('tab', { name: 'Due items' }).click();
    await page.getByRole('table', { name: 'Overdue PPE' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'PPE types filter: All types' }).click();
    await page.waitForTimeout(350);
    await shot(page, 'due-lens-open@390');
    check(await page.getByRole('checkbox', { name: /Safety Shoes/ }).isVisible(), 'the type lens opens on a phone');
  },
};
// Second /ppe entry: the order basket on its own fixtures (automatic lines, twins, legacy rows, exclusions, free lines,
// week adds, the choose dialog, qty edits, issuing, clearing by hand). --only /ppe runs both entries.
const mon0 = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
const atDay = diff => { const d = new Date(mon0); d.setDate(d.getDate() + diff); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const thisThu = atDay(3);
const nextWed = atDay(9);
const RECS2 = [
  rec(11, { expiry_date: day(-10) }),
  rec(12, { ppe_type: 'helmet', item_name: 'MSA V-Gard', size: '', expiry_date: day(-20) }),
  rec(13, { ppe_type: 'gloves', item_name: 'Atlas gloves', size: 'M', expiry_date: day(40) }),
  rec(14, { ppe_type: 'glasses', item_name: 'Safety specs', size: '', expiry_date: thisThu }),
  rec(15, { ppe_type: 'vest', item_name: 'Hi-vis', size: 'L', expiry_date: nextWed }),
  rec(16, { ppe_type: 'gumboots', item_name: 'Dunlop', size: '9', expiry_date: day(25) }),
];
const ORDER2 = new Map();
// legacy rows, stored before the basket (no kind): a twin of the automatic line, and a line not due yet
ORDER2.set('11', { record_id: '11', employee_id: 'C100', employee_name: 'Ann Alpha', ppe_type: 'safety_shoes', item_name: 'Bata Industrial', size: '8', expiry_date: day(-10), added_at: '2026-10-01T08:00:00Z' });
ORDER2.set('13', { record_id: '13', employee_id: 'C100', employee_name: 'Ann Alpha', ppe_type: 'gloves', item_name: 'Atlas gloves', size: 'M', expiry_date: day(40), added_at: '2026-10-01T08:00:00Z' });
ORDER2.set(`x:12:${day(-20)}`, { record_id: `x:12:${day(-20)}`, employee_id: 'C100', employee_name: 'Ann Alpha', ppe_type: 'helmet', item_name: 'MSA V-Gard', size: '', expiry_date: day(-20), kind: 'excluded', source: 'manual', added_at: '2026-10-02T08:00:00Z' });
ORDER2.set('free:00000000-0000-4000-8000-000000000001', { record_id: 'free:00000000-0000-4000-8000-000000000001', employee_id: '', employee_name: '', ppe_type: 'gloves', item_name: 'Spare gloves', size: 'XL', qty: 5, note: '', kind: 'free', source: 'manual', added_at: '2026-10-03T08:00:00Z' });
function patchOrderLine2(request) {
  const id = decodeURIComponent(new URL(request.url()).pathname.split('/').pop());
  const e = ORDER2.get(id);
  if (!e) return { __status: 404, body: { detail: 'That order line is not on the list. (fixture)' } };
  const next = { ...e, ...request.postDataJSON() };
  ORDER2.set(e.record_id, next);
  return next;
}
const data2base = {
  '/api/ppe': RECS2,
  'PATCH /api/ppe/13': request => ({ ...RECS2.find(r => r.id === '13'), ...request.postDataJSON() }),
  '/api/ppe-order-list': request => {
    if (request.method() === 'POST') { for (const e of request.postDataJSON().entries) if (!ORDER2.has(e.record_id)) ORDER2.set(e.record_id, { kind: 'line', source: 'manual', qty: 1, note: '', ...e }); return { added: 1 }; }
    return [...ORDER2.values()];
  },
  'POST /api/ppe-order-list/remove': request => { for (const id of request.postDataJSON().record_ids) ORDER2.delete(id); return { ok: true }; },
  '/api/ppe/matrix': { safety_shoes: 12, helmet: 24 },
  '/api/employees/': EMPLOYEES,
  '/api/employees': EMPLOYEES,
};
// PATCH arrives per line id, which cannot be enumerated (free: ids are minted in the browser): route them all to one merge.
const data2 = new Proxy(data2base, { get: (t, k) => (typeof k === 'string' && k.startsWith('PATCH /api/ppe-order-list/') ? patchOrderLine2 : t[k]) });

const basketSpec = {
  route: '/ppe',
  h1: 'PPE',
  data: data2,
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const orderTable = () => page.getByRole('table', { name: 'Items on the order list' });
    const tabCount = async () => Number((await page.getByRole('tab', { name: /^Order list/ }).textContent()).match(/\d+/)[0]);

    // this Thursday's record joins on its own once Thursday comes (or is today): the opening count depends on the weekday
    const thuCovered = thisThu <= day(0);
    const openCount = thuCovered ? 4 : 3;
    // opens with the automatic line(s), the manual line and the free line; the twin and the legacy row wait in the banner
    await page.getByRole('tab', { name: /^Order list/ }).click();
    await orderTable().waitFor({ timeout: 5000 });
    check(await tabCount() === openCount, 'the basket opens with the automatic, manual and free lines', String(await tabCount()));
    check(await page.getByText('already covered by the automatic list').isVisible(), 'the banner names the twin already covered');
    check(await page.getByText('not due yet').isVisible(), 'the banner names the legacy line not due yet');
    check(await page.getByText('Shared order list').isVisible(), 'the basket says it is shared');

    // the type lens narrows the basket, the week helper and the choose picker
    await page.getByRole('button', { name: 'PPE types filter: All types' }).click();
    await page.getByRole('group', { name: 'Which values to show' }).getByRole('button', { name: 'All except these' }).click();
    await page.getByRole('checkbox', { name: /Safety Glasses/ }).check();
    await page.keyboard.press('Escape');
    check(await page.getByRole('button', { name: 'Clear filters' }).count() === 0, 'with only the lens active the basket offers no dead Clear filters button');
    check(await tabCount() === openCount - (thuCovered ? 1 : 0), 'excluding a type hides its basket lines', String(await tabCount()));
    await page.getByRole('button', { name: 'Add items' }).click();
    const lensWeek = page.getByRole('menuitem', { name: /Due this week/ });
    check((await lensWeek.textContent()).includes('(0)'), 'the week helper counts only the types in the lens', await lensWeek.textContent());
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Add items' }).click();
    await page.getByRole('menuitem', { name: /Choose from due soon/ }).click();
    const lensChoose = dialog('Choose from due soon');
    await lensChoose.waitFor({ timeout: 5000 });
    check(await lensChoose.getByRole('checkbox', { name: /Safety Glasses/ }).count() === 0, 'the choose picker hides the lensed-out type');
    check(await lensChoose.getByRole('checkbox', { name: /Safety Gum Boots/ }).isVisible() && await lensChoose.getByRole('checkbox', { name: /High-Vis Vest/ }).isVisible(), 'the choose picker keeps the types in the lens');
    await page.keyboard.press('Escape');
    await lensChoose.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'PPE types filter: All types' }).waitFor({ timeout: 5000 });
    check(await tabCount() === openCount, 'resetting the lens brings the basket back', String(await tabCount()));
    await shot(page, 'basket@1440');

    // the purchase order lines count quantities, not lines
    const poToggle = page.getByRole('button', { name: /Purchase order lines/ });
    await poToggle.click();
    const po = page.getByRole('list', { name: 'Purchase order lines', exact: true });
    check(await po.getByText('5 ×').isVisible(), 'the free line counts its 5 in the purchase order lines');

    // editing a line patches its quantity on the server and the purchase order adds it up
    await orderTable().getByRole('row', { name: /Atlas gloves/ }).getByRole('button', { name: 'Edit' }).click();
    const ed = dialog('Edit order line');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/Quantity/).fill('4');
    const pw1 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/13') && r.request().method() === 'PATCH');
    await ed.getByRole('button', { name: 'Save line' }).click();
    await pw1;
    await ed.waitFor({ state: 'hidden', timeout: 5000 });
    const patched = [...calls].reverse().find(c => c.method === 'PATCH' && c.pathname === '/api/ppe-order-list/13');
    check(!!patched && patched.body.qty === 4, 'editing a line patches its quantity on the server', JSON.stringify(patched?.body));
    check(await po.getByText('4 ×').isVisible(), 'the purchase order lines add the edited quantity up');
    await shot(page, 'basket-edited@1440');

    // keeping a legacy line graduates it; removing twins drops the stored twin; the automatic line stays
    const pw2 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/13') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Keep as manual' }).click();
    await pw2;
    const grad = [...calls].reverse().find(c => c.method === 'PATCH' && c.pathname === '/api/ppe-order-list/13');
    check(!!grad && grad.body.kind === 'line' && grad.body.source === 'manual', 'keeping a legacy line graduates it with kind and source', JSON.stringify(grad?.body));
    await page.waitForTimeout(300);
    check(!(await page.getByText('not due yet').isVisible().catch(() => false)), 'the tidied line leaves the banner');
    const pw3 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/remove') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Remove twins' }).click();
    await pw3;
    check(!ORDER2.has('11') && calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list/remove' && c.body.record_ids.includes('11')), 'removing twins drops the stored twin from the server');
    check(!(await page.getByText('Tidy the order list').isVisible().catch(() => false)), 'the banner goes away once everything is tidied');
    check(await tabCount() === openCount, 'the automatic line stays: only its stored twin went', String(await tabCount()));

    // week adds are computed for the actual weekday (this Thursday may already be past, hence covered)
    await page.getByRole('button', { name: 'Add items' }).click();
    const thisWeek = page.getByRole('menuitem', { name: /Due this week/ });
    check((await thisWeek.textContent()).includes(`(${thuCovered ? 0 : 1})`), 'the this-week count is computed for the actual weekday', await thisWeek.textContent());
    if (await thisWeek.getAttribute('aria-disabled') === 'true') {
      check(thuCovered, 'an empty this week disables its menu item');
      await page.keyboard.press('Escape');
    } else {
      const pw4 = page.waitForResponse(r => r.url().endsWith('/api/ppe-order-list') && r.request().method() === 'POST');
      await thisWeek.click();
      await pw4;
      check(ORDER2.has('14') && calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list' && c.body.entries.some(e => e.record_id === '14')), 'adding due-this-week stores the record');
    }

    // next week asks first, naming what will change
    await page.getByRole('button', { name: 'Add items' }).click();
    const nextWeek = page.getByRole('menuitem', { name: /Due next week/ });
    check((await nextWeek.textContent()).includes('(1)'), 'next week offers its one due record', await nextWeek.textContent());
    await nextWeek.click();
    const cf = page.getByRole('alertdialog');
    await cf.waitFor({ timeout: 5000 });
    check(await cf.getByText('Add 1 item due next week?').isVisible(), 'adding next week asks first, naming what will change');
    await shot(page, 'basket-add-confirm@1440');
    const pw5 = page.waitForResponse(r => r.url().endsWith('/api/ppe-order-list') && r.request().method() === 'POST');
    await cf.getByRole('button', { name: 'Add to the order list' }).click();
    await pw5;
    check(ORDER2.has('15'), 'confirming stores the next-week record');

    // choosing from due soon stores the picked record
    await page.getByRole('button', { name: 'Add items' }).click();
    await page.getByRole('menuitem', { name: /Choose from due soon/ }).click();
    const ch = dialog('Choose from due soon');
    await ch.waitFor({ timeout: 5000 });
    await ch.getByRole('checkbox', { name: /Gum Boots/ }).check();
    const pw6 = page.waitForResponse(r => r.url().endsWith('/api/ppe-order-list') && r.request().method() === 'POST');
    await ch.getByRole('button', { name: /Add 1 to the order list/ }).click();
    await pw6;
    check(ORDER2.has('16'), 'choosing from due soon stores the picked record');
    check(!(await page.getByText('Tidy the order list').isVisible().catch(() => false)), 'freshly added lines are stamped manual and raise no tidy banner');

    // a free line is stored under a free: id, shows with edit but no issue
    await page.getByRole('button', { name: 'Add items' }).click();
    await page.getByRole('menuitem', { name: /Add a free line/ }).click();
    const fl = dialog('Add a free line');
    await fl.waitFor({ timeout: 5000 });
    await fl.getByRole('combobox', { name: 'PPE type' }).click();
    await page.getByRole('option', { name: 'Safety Shoes' }).click();
    await fl.getByLabel(/^Item or brand/).fill('Spare laces');
    await fl.getByLabel(/Quantity/).fill('2');
    const pw7 = page.waitForResponse(r => r.url().endsWith('/api/ppe-order-list') && r.request().method() === 'POST');
    await fl.getByRole('button', { name: 'Add free line' }).click();
    await pw7;
    await fl.waitFor({ state: 'hidden', timeout: 5000 });
    const freePost = [...calls].reverse().find(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list');
    check(!!freePost && freePost.body.entries[0].record_id.startsWith('free:') && freePost.body.entries[0].kind === 'free', 'a free line is stored under a free: id', JSON.stringify(freePost?.body.entries[0]).slice(0, 140));
    const freeRow = orderTable().getByRole('row', { name: /Spare laces/ });
    check(await freeRow.isVisible(), 'the free line shows in the basket');
    check(await freeRow.getByRole('button', { name: 'Issue' }).count() === 0, 'a free line has no Issue action');
    check(await freeRow.getByRole('button', { name: 'Edit' }).isVisible(), 'a free line can be edited');
    await shot(page, 'basket-free@1440');

    // excluding shuts the automatic line out under x:id:expiry; restoring brings it back
    const before = await tabCount();
    const pw8 = page.waitForResponse(r => r.url().endsWith('/api/ppe-order-list') && r.request().method() === 'POST');
    await orderTable().getByRole('row', { name: /Bata Industrial/ }).getByRole('button', { name: 'Exclude' }).click();
    await pw8;
    const exId = `x:11:${day(-10)}`;
    check(ORDER2.has(exId), 'excluding stores the shut-out under x:id:expiry');
    check(await tabCount() === before - 1, 'the shut-out line leaves the basket', `${before} -> ${await tabCount()}`);
    const exToggle = page.getByRole('button', { name: /Excluded/ });
    check(await exToggle.isVisible(), 'the excluded disclosure appears');
    await exToggle.click();
    check(await page.getByRole('list', { name: 'Excluded from the automatic list' }).getByText('Bata Industrial').isVisible(), 'the shut-out line waits in the disclosure');
    await shot(page, 'basket-excluded@1440');
    const pw9 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/remove') && r.request().method() === 'POST');
    await page.getByRole('list', { name: 'Excluded from the automatic list' }).locator('li', { hasText: 'Bata Industrial' }).getByRole('button', { name: 'Restore' }).click();
    await pw9;
    check(!ORDER2.has(exId) && await tabCount() === before, 'restoring lifts the shut-out and the automatic line returns');

    // issuing a manual line renews its record in place and drops the fulfilled line from the server
    await orderTable().getByRole('row', { name: /Atlas gloves/ }).getByRole('button', { name: 'Issue' }).click();
    const iss = dialog('Issue PPE');
    await iss.waitFor({ timeout: 5000 });
    const pw10 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/remove') && r.request().method() === 'POST');
    await iss.getByRole('button', { name: 'Issue PPE' }).click();
    await pw10;
    check(calls.some(c => c.method === 'PATCH' && c.pathname === '/api/ppe/13'), 'issuing a manual line renews its record in place');
    check(!ORDER2.has('13') && calls.some(c => c.method === 'POST' && c.pathname === '/api/ppe-order-list/remove' && (c.body.record_ids ?? []).includes('13')), 'issuing drops the fulfilled manual line from the server');

    // clearing by hand keeps the exclusions and drops everything else
    await page.getByRole('button', { name: 'Clear added lines' }).click();
    const cc = page.getByRole('alertdialog');
    await cc.waitFor({ timeout: 5000 });
    const pw11 = page.waitForResponse(r => r.url().includes('/api/ppe-order-list/remove') && r.request().method() === 'POST');
    await cc.getByRole('button', { name: 'Remove' }).click();
    await pw11;
    await cc.waitFor({ state: 'hidden', timeout: 5000 });
    const rest = [...ORDER2.keys()];
    check(rest.length > 0 && rest.every(k => k.startsWith('x:')), 'clearing by hand keeps the exclusions and drops everything else', rest.join(','));
    check(await page.getByRole('tab', { name: new RegExp(`^Order list\\s*${thuCovered ? 2 : 1}$`) }).isVisible(), 'only the automatic lines are left');
    await shot(page, 'basket-cleared@1440');
  },
};
const specs = [spec, basketSpec];
export default specs;

