// /tools: the Tools & Equipment workspace on the shared frame — a saved Tools session (its own sign-in, not the app's), the
// overview, the equipment register as cards and as a table, one tool's side panel, a real issue with the overdue-check override,
// a refused past return date, a bulk issue of two tools to one borrower, employees, compliance and the shared settings dialog.
const iso = days => new Date(Date.now() + days * 86400000).toISOString();
const PEOPLE = [
  { id: 'e1', employee_number: 'E-001', name: 'A. Moyo', department: 'Engineering', job_title: 'Fitter', active: true },
  { id: 'e2', employee_number: 'E-002', name: 'B. Dube', department: 'Engineering', job_title: 'Electrician', active: true },
];
const eligible = PEOPLE.map(p => ({ id: p.id, employee_number: p.employee_number, name: p.name, department: p.department, job_title: p.job_title }));
const tool = (n, name, status, extra = {}) => ({ id: `id${n}`, register_number: `T-00${n}`, name, make_model: 'Bosch GSR', serial_number: `S${n}`, category: 'Power tools', storage_location: 'Main workshop', department: 'Engineering', status, eligible_employees: eligible, inspection_due: [], ...extra });
const TOOLS = [
  tool(1, 'Cordless drill', 'available', { inspection_due: ['monthly'] }),
  tool(2, 'Angle grinder', 'issued', { custody: { employee_name: 'A. Moyo', expected_return_at: iso(2), job_reference: 'WO-2408' } }),
  tool(3, 'Rotary hammer', 'overdue', { custody: { employee_name: 'B. Dube', expected_return_at: iso(-3), job_reference: 'WO-2412' } }),
  tool(4, 'Torque wrench', 'available', { category: 'Hand tools', notes: 'Needs calibration' }),
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
    '/api/tools-workspace/history': [{ id: 'h1', tool_id: 'T-003', tool_name: 'Rotary hammer', action: 'Issued', detail: 'WO-2412', actor_name: 'Issuer', employee_name: 'B. Dube', event_at: iso(-5) }],
    '/api/tools-workspace/source-registers': [],
    '/api/tools-workspace/notifications': { alerts: [{ key: 'k1', kind: 'overdue', tool_id: 'id3', tool_name: 'Rotary hammer', department: 'Engineering', read: false }] },
    '/api/tools-workspace/compliance': { competencies: [], inspections: [], incidents: [], gate_passes: [] },
    'POST /api/tools-workspace/tools/id1/commands': { ok: true },
    'POST /api/tools-workspace/tools/id4/commands': { ok: true },
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByRole('navigation', { name: 'Workspace shortcuts' }).isVisible(), 'the overview offers shortcuts to the sections');
    check(await page.getByRole('button', { name: /Equipment\s*4/ }).isVisible(), 'the overview counts the active equipment');
    check(await page.getByRole('button', { name: '1 unread tool notifications' }).isVisible(), 'the bell shows the unread notification');
    await shot(page, 'overview@1440');

    // The register as cards: one per tool, status filters in the figure row.
    await page.getByRole('button', { name: 'Equipment', exact: true }).first().click();
    await page.getByRole('button', { name: 'Grid view' }).click();
    // U1: the cards are native buttons now (they were divs with role="button"), so locate by role+name.
    const pods = page.getByRole('button', { name: /Open for details/ });
    await pods.first().waitFor();
    check(await pods.count() === 4, 'one card per tool');
    await page.getByRole('button', { name: /Return overdue\s*1/ }).click();
    check(await pods.count() === 1, 'the overdue figure filters the register to the overdue tool');
    await page.getByRole('button', { name: /Return overdue\s*1/ }).click();
    await shot(page, 'register@1440');

    // One tool's panel: what it can do next, then issue it against an overdue monthly check (reason required).
    await pods.filter({ hasText: 'Cordless drill' }).click();
    const panel = page.getByRole('dialog', { name: 'Cordless drill' });
    await panel.waitFor();
    check(await panel.getByText('Scheduled checks overdue').isVisible(), 'an overdue check is stated in the panel');
    await shot(page, 'tool-panel@1440');
    await panel.getByRole('button', { name: 'Issue tool' }).click();
    const form = page.getByRole('dialog', { name: 'Issue tool' });
    await form.waitFor();
    await form.getByRole('combobox', { name: 'Employee' }).fill('A. Moyo');
    await form.getByRole('combobox', { name: 'Employee' }).press('Enter');
    // G2: suggest-fields are the shared Combobox now — open, type, take the match (or the Use row for new text).
    const fillSuggest = async (scope, label, text) => {
      await scope.getByRole('combobox', { name: label }).click();
      await page.getByPlaceholder(`Search ${label.toLowerCase()}…`).fill(text);
      const useRow = page.getByRole('option', { name: `Use “${text}”` });
      if (await useRow.count() > 0) await useRow.click();
      else await page.getByRole('option', { name: text }).click();
    };
    await fillSuggest(form, 'Current work location', 'Main workshop');
    await fillSuggest(form, 'Work order / job', 'WO-1');
    await form.getByLabel('Expected return').fill('2000-01-01T16:00');
    await form.getByRole('checkbox', { name: /Go ahead anyway/ }).check();
    await form.getByRole('textbox', { name: 'Reason for going ahead' }).fill('Breakdown repair today');
    await form.getByRole('button', { name: 'Issue tool' }).click();
    check((await form.getByRole('alert').first().textContent())?.includes('future'), 'a past return time is refused with a reason');
    check(!calls.some(c => c.method === 'POST' && c.pathname.endsWith('/commands')), 'a refused issue is not sent');
    await form.getByLabel('Expected return').fill('2050-09-25T16:00');
    await form.getByRole('button', { name: 'Issue tool' }).click();
    await page.waitForTimeout(800);
    const post = calls.filter(c => c.method === 'POST' && c.pathname.endsWith('/tools/id1/commands')).pop();
    check(post?.body.kind === 'issue' && post.body.employee_name === 'A. Moyo' && post.body.job_reference === 'WO-1' && post.body.override_due_checks === true, 'issuing sends the movement with the override reason', JSON.stringify(post?.body).slice(0, 160));

    // Bulk issue: two tools, one borrower, one command each; tools that are out stay greyed out.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Issue tools' }).click();
    const bulk = page.getByRole('dialog', { name: 'Issue tools' });
    await bulk.waitFor();
    check(await bulk.getByRole('checkbox', { name: /T-002/ }).isDisabled(), 'a tool that is out is greyed out with its holder stated');
    await bulk.getByRole('checkbox', { name: /T-001/ }).check();
    await bulk.getByRole('checkbox', { name: /T-004/ }).check();
    await shot(page, 'bulk-issue@1440');
    check(await bulk.getByText('monthly check overdue').isVisible(), 'the picked tools show their conditions');
    await bulk.getByRole('combobox', { name: 'Employee' }).fill('A. Moyo');
    await bulk.getByRole('combobox', { name: 'Employee' }).press('Enter');
    await fillSuggest(bulk, 'Current work location', 'Main workshop');
    await fillSuggest(bulk, 'Work order / job', 'WO-9');
    await bulk.getByLabel('Expected return').fill('2050-10-01T16:00');
    await bulk.getByRole('checkbox', { name: /Go ahead anyway/ }).check();
    await bulk.getByRole('textbox', { name: 'Reason for going ahead' }).fill('Shutdown cover this week');
    await bulk.getByRole('button', { name: 'Issue 2 tools' }).click();
    await page.waitForTimeout(800);
    const bulkPosts = calls.filter(c => c.method === 'POST' && /\/tools\/id[14]\/commands$/.test(c.pathname) && c.body?.job_reference === 'WO-9');
    check(bulkPosts.length === 2 && bulkPosts.every(p => p.body.kind === 'issue' && p.body.employee_name === 'A. Moyo'), 'bulk issuing sends one command per tool', `${bulkPosts.length} posts`);

    // The table, then the other sections.
    await page.getByRole('button', { name: 'List view' }).click();
    check(await page.getByRole('table', { name: 'Equipment register' }).isVisible(), 'the register also reads as a table');
    await page.getByRole('button', { name: 'Employees', exact: true }).first().click();
    check(await page.getByRole('button', { name: /A\. Moyo/ }).isVisible(), 'employees are listed by department');
    await page.getByRole('button', { name: 'Compliance', exact: true }).first().click();
    check(await page.getByRole('table', { name: 'Inspections by equipment' }).isVisible(), 'compliance opens on the inspections that are overdue');
    await shot(page, 'compliance@1440');

    // Settings: the shared typeface, text size and hints, then the Tools-only choices.
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.waitFor();
    check(await settings.getByRole('combobox', { name: 'Typeface' }).isVisible(), 'settings carry the shared typeface choice');
    check(await settings.getByRole('radiogroup', { name: 'Sidebar icon style' }).isVisible(), 'and the sidebar icon style');
    await shot(page, 'settings@1440');
    await page.keyboard.press('Escape');
  },
};
export default spec;
