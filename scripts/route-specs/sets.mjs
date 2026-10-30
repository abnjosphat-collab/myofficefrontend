// /tools sets: set types, Add a set with pasted lines, Issue a set to several people, and the
// drawer's piece list. Same route as the tools spec; the runner executes every spec file for the route.
const iso = days => new Date(Date.now() + days * 86400000).toISOString();
const PEOPLE = [
  { id: 'e1', employee_number: 'E-001', name: 'A. Moyo', department: 'Engineering', job_title: 'Fitter', active: true },
  { id: 'e2', employee_number: 'E-002', name: 'B. Dube', department: 'Engineering', job_title: 'Electrician', active: true },
];
const tool = (n, name, status, extra = {}) => ({ id: `id${n}`, register_number: `T-00${n}`, name, make_model: 'Bosch GSR', serial_number: `S${n}`, category: 'Power tools', storage_location: 'Main workshop', department: 'Engineering', status, eligible_employees: PEOPLE.map(p => ({ id: p.id, employee_number: p.employee_number, name: p.name, department: p.department, job_title: p.job_title })), inspection_due: [], ...extra });
const pieces = [1, 2, 3].map(n => ({ id: `p${n}`, set_tool_id: 'ids1', line_no: n, piece_number: `SET-07/${String(n).padStart(3, '0')}`, name: ['Spanner 13mm', 'Spanner 14mm', 'Torque wrench'][n - 1], size: ['13', '14', null][n - 1], qty: 1, notes: null, condition: 'Good', status: 'present', set_type_line_id: `tl${n}`, created_at: iso(-20), updated_at: iso(-20) }));
const SET_TYPE = { id: 'type-1', title: 'Gedore socket set', make_model: 'Gedore', category: 'Hand tools', competency_required: false, notes: null, active: true, line_count: 3, physical_total: 1, in_store: 0, out: 1, attention: 0 };
const TYPE_LINES = [1, 2, 3].map(n => ({ id: `tl${n}`, set_type_id: 'type-1', line_no: n, name: pieces[n - 1].name, size: pieces[n - 1].size, qty: 1, notes: null }));
const TOOLS = [
  tool(1, 'Cordless drill', 'available'),
  tool(4, 'Torque wrench', 'available', { category: 'Hand tools' }),
  tool(9, 'Gedore socket set', 'issued', {
    id: 'ids1', register_number: 'SET-07', category: 'Hand tools', set_type_id: 'type-1', set_type_title: 'Gedore socket set',
    pieces: pieces.map(p => ({ id: p.id, line_no: p.line_no, piece_number: p.piece_number, name: p.name, size: p.size, condition: p.condition, status: p.status })),
    custody: { employee_name: 'A. Moyo', expected_return_at: iso(2), job_reference: 'WO-2408' },
  }),
];
const SESSION = { version: 1, browserId: 'b1', account: { id: 'u1', name: 'Test Issuer', username: 'issuer', password: '', role: 'issuer', department: 'Engineering', canIssue: true, token: 'tok' } };

const spec = {
  route: '/tools',
  h1: 'Overview',
  storage: { 'myoffice.tools.browser.v1': 'b1', 'myoffice.tools.session.v2': SESSION },
  data: {
    '/api/tools-workspace/auth/me': { id: 'u1', name: 'Test Issuer', username: 'issuer', role: 'issuer', department: 'Engineering', can_issue: true, approval_roles: [] },
    '/api/tools-workspace/tools': TOOLS,
    '/api/tools-workspace/employees': PEOPLE,
    '/api/tools-workspace/history': [],
    '/api/tools-workspace/source-registers': [],
    '/api/tools-workspace/notifications': { alerts: [], unread_count: 0 },
    '/api/tools-workspace/compliance': { competencies: [], inspections: [], incidents: [], gate_passes: [], inspection_plan: [] },
    '/api/tools-workspace/set-types': [SET_TYPE],
    '/api/tools-workspace/set-types/type-1': { set_type: SET_TYPE, lines: TYPE_LINES },
    'POST /api/tools-workspace/set-types': { set_type: { ...SET_TYPE, id: 'type-2' }, lines: TYPE_LINES },
    'POST /api/tools-workspace/set-types/type-1/issue': { set_type_id: 'type-1', issued: 1, failed: 0, idempotency_key: 'k', replayed: false, results: [{ employee_id: 'e1', employee_name: 'A. Moyo', ok: true, set_id: 'ids1', register_number: 'SET-07', piece_count: 3 }] },
  },
  async ready(page, calls, { check, shot }) {
    await page.getByRole('button', { name: 'Sets & checks', exact: true }).first().click();
    check(await page.getByRole('heading', { name: 'Set types' }).isVisible(), 'the toolbox tab lists set types');
    check(await page.getByText('Gedore socket set').first().isVisible(), 'with the type title');
    check(await page.getByText('3 pieces · 0 in store · 1 out').isVisible(), 'with in-store and out counts');

    // Add a set: paste rows from Excel, preview what was added, validation first.
    await page.getByRole('button', { name: 'Tools', exact: true }).first().click();
    await page.getByRole('button', { name: 'Add a set' }).click();
    const add = page.getByRole('dialog', { name: 'Add a set' });
    await add.waitFor();
    await add.getByLabel('Paste from Excel').fill('Spanner 13mm\t13\t2\nTorque wrench\t\t1\n\t\t\nBad row\tx\tmany');
    await add.getByRole('button', { name: 'Add pasted rows' }).click();
    check(await add.getByText('2 rows added, 1 could not be read').isVisible(), 'pasting previews the added rows and the unreadable ones');
    await add.getByRole('button', { name: 'Save set type' }).click();
    check(await add.getByText('Name the set type').isVisible(), 'saving without a title refuses with a reason');
    await add.getByLabel('Set title').fill('Gedore socket set');
    await shot(page, 'add-set@1440');
    await add.getByRole('button', { name: 'Cancel' }).click();

    // Issue a set: type, people with a counted button, results with links.
    await page.getByRole('button', { name: 'Issue a set' }).click();
    const issue = page.getByRole('dialog', { name: 'Issue a set' });
    await issue.waitFor();
    check(await issue.getByRole('combobox', { name: 'Set type' }).isVisible(), 'the issue dialog offers the set type');
    await issue.getByRole('checkbox', { name: 'Issue to A. Moyo' }).check();
    check(await issue.getByRole('button', { name: 'Issue 1 set' }).isVisible(), 'the button counts the ticked people');
    await issue.getByRole('button', { name: 'Mark exceptions for A. Moyo' }).click();
    check(await issue.getByRole('group', { name: 'Spanner 14mm condition for A. Moyo' }).isVisible(), 'piece exceptions open per person');
    await issue.getByLabel('Location').fill('Pit shaft');
    await issue.getByRole('button', { name: 'Issue 1 set' }).click();
    await page.waitForTimeout(800);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.endsWith('/set-types/type-1/issue')).pop();
    check(post?.body.employee_ids?.join() === 'E-001' && post?.body.location === 'Pit shaft', 'issuing sends the people and the location', JSON.stringify(post?.body).slice(0, 140));
    check(await issue.getByText('SET-07 issued to A. Moyo (3 pieces)').isVisible(), 'each person gets their own numbered set from the results');
    await issue.getByRole('button', { name: 'Done' }).click();

    // The drawer's set page: number, type, holder and the pieces with download.
    await page.getByRole('button', { name: 'Tools', exact: true }).first().click();
    await page.getByRole('button', { name: 'List view' }).click();
    await page.getByRole('button', { name: 'View Gedore socket set' }).click();
    const panel = page.getByRole('dialog', { name: /Gedore socket set/ });
    await panel.waitFor();
    check(await panel.getByText('Pieces (3)').isVisible(), 'the set page lists its pieces');
    check(await panel.getByText('SET-07/002').first().isVisible(), 'with numbered pieces');
    check(await panel.getByRole('button', { name: 'Pieces XLSX' }).isVisible(), 'with a piece-list download');
    await panel.getByRole('button', { name: 'Receive return' }).click();
    const ret = page.getByRole('dialog', { name: 'Record a return' });
    await ret.waitFor();
    check(await ret.getByText('Condition of each piece').isVisible(), 'the return records per-piece condition and status');
    await shot(page, 'set-return@1440');
  },
};
export default spec;
