// /standby: the week's standby board (holders, crew, call/WhatsApp actions, rotation
// sequence), the rotations tab, and the duty officials tab.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const ROTATIONS = [
  {
    id: 1, name: 'Electrical', section: 'Electrical', is_active: true, week_length_days: 7, cycle_start_date: local(-2),
    members: [
      { employee_id: 'C001', employee_name: 'Ann Alpha', phone: '0771111111', designation: 'Electrician', crew: [{ employee_id: 'C010', employee_name: 'Crew One', phone: '0771010101' }] },
      { employee_id: 'C002', employee_name: 'Bob Beta', phone: '0772222222', crew: [] },
    ],
  },
  // Starts in the future: the board says so instead of naming a holder.
  {
    id: 2, name: 'Mechanical', section: null, is_active: true, week_length_days: 7, cycle_start_date: local(3),
    members: [{ employee_id: 'C003', employee_name: 'Cy Gamma', crew: [] }],
  },
  // Inactive: listed under Rotations, never on the board.
  {
    id: 3, name: 'Winding', section: 'Winding', is_active: false, week_length_days: 7, cycle_start_date: local(-9),
    members: [{ employee_id: 'C004', employee_name: 'Dee Delta', crew: [] }],
  },
];
const DUTY = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', phone: '0779999999', department: null, date_from: local(-1), date_to: local(5) },
  { id: 2, employee_id: 'C200', employee_name: 'Eli Eng', phone: null, department: 'Engineering', date_from: local(2), date_to: local(9) },
];
const EMPLOYEES = [{ id: 31, employee_id: 'E31', first_name: 'Eve', last_name: 'Epsilon', designation: 'Welder', department: 'Plant', phone: '0775555555' }];
const spec = {
  route: '/standby',
  h1: 'Standby',
  data: {
    '/api/standby-rotations': ROTATIONS,
    'DELETE /api/standby-rotations/3': {},
    '/api/duty-roster': DUTY,
    'DELETE /api/duty-roster/2': {},
    '/api/employees': EMPLOYEES,
  },
  async ready(page, calls, { check, shot }) {
    // the week board names this stint's holder, crew and contact actions
    const board = page.getByRole('heading', { name: 'Electrical' });
    check(await board.isVisible(), 'the active rotation is on the board');
    check(await page.getByText(/Stint 1 of 2/).isVisible(), 'the stint position within the rotation is stated');
    check(await page.getByText(/next: Bob Beta/).isVisible(), 'the next holder is named');
    const call = page.getByRole('link', { name: /Call Ann Alpha/ });
    check(await call.getAttribute('href') === 'tel:+263771111111', 'tap-to-call dials the holder', await call.getAttribute('href'));
    check(await page.getByRole('link', { name: /WhatsApp Ann Alpha/ }).getAttribute('href') === 'https://wa.me/263771111111', 'WhatsApp opens a wa.me chat with the holder');
    check(await page.getByText('Crew One').isVisible(), 'the crew backing the holder is listed');
    check(await page.getByText('1. Ann Alpha').getAttribute('aria-current') === 'true', 'the sequence strip marks the current stint');
    check(await page.getByText(/Starts /).isVisible(), 'a rotation that has not started says so instead of naming a holder');
    check(!(await page.getByRole('heading', { name: 'Winding' }).isVisible().catch(() => false)), 'an inactive rotation is not on the board');
    check(await page.getByText('Dee Delta').first().isVisible() && await page.getByText('Mine-wide').first().isVisible(), 'the week\u2019s duty officials are shown with scope');
    await shot(page, 'week@1440');

    // week navigation rotates the holder
    await page.getByRole('button', { name: 'Next week' }).click();
    check(await page.getByText(/Stint 2 of 2/).isVisible(), 'next week shows the next stint');
    check(await page.getByRole('link', { name: /Call Bob Beta/ }).isVisible(), 'the holder rotated to Bob Beta');
    await page.getByRole('button', { name: 'This week' }).click();
    check(await page.getByText(/Stint 1 of 2/).isVisible(), 'This week jumps back to the current stint');

    // rotations tab: table, validation, remove with confirmation
    await page.getByRole('tab', { name: 'Rotations' }).click();
    const rtable = page.getByRole('table', { name: 'Standby rotations' });
    check(await rtable.getByRole('row').count() === 4, 'the rotations table lists all three rotations');
    await page.getByRole('button', { name: 'New rotation' }).click();
    const rd = page.getByRole('dialog', { name: 'New standby rotation' });
    await rd.waitFor({ timeout: 5000 });
    await rd.getByRole('button', { name: 'Create rotation' }).click();
    check(await rd.getByText('Give the rotation a name.').isVisible(), 'a rotation without a name is explained');
    await rd.getByRole('button', { name: 'Cancel' }).click();
    await rd.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: 'Delete the Winding rotation' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation removes nothing');
    await page.getByRole('button', { name: 'Delete the Winding rotation' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/standby-rotations/3'), 'confirming sends the delete');

    // duty tab: table and remove with confirmation
    await page.getByRole('tab', { name: 'Duty officials' }).click();
    const dtable = page.getByRole('table', { name: 'Duty officials' });
    check(await dtable.getByRole('row').count() === 3, 'the duty table lists both officials');
    await page.getByRole('button', { name: 'Remove Eli Eng as duty official' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
    await page.waitForTimeout(600);
    check(calls.some(c => c.method === 'DELETE' && c.pathname === '/api/duty-roster/2'), 'confirming removes the official');
    await shot(page, 'duty@1440');
  },
  create: {
    open: 'New rotation', dialog: 'New standby rotation', path: '/api/standby-rotations', submit: 'Create rotation',
    requiredText: 'Give the rotation a name.',
    async before(page) { await page.getByRole('tab', { name: 'Rotations' }).click(); },
    async fill(dialog, page) {
      await dialog.getByLabel('Name', { exact: true }).fill('Nightly');
      await dialog.getByRole('combobox', { name: 'Add member' }).click();
      await page.getByRole('option', { name: /Eve Epsilon/ }).click();
    },
    async kept(dialog) { return (await dialog.getByLabel('Name', { exact: true }).inputValue()) === 'Nightly'; },
    body: b => b.name === 'Nightly' && b.members.length === 1 && b.members[0].employee_id === 'E31' && b.members[0].employee_name === 'Eve Epsilon' && b.week_length_days === 7 && /^\d{4}-\d{2}-\d{2}$/.test(b.cycle_start_date),
  },
  empty: { data: { '/api/standby-rotations': [], '/api/duty-roster': [] }, text: 'No standby rotations yet' },
  failing: { paths: ['/api/standby-rotations'], text: 'Standby rotations could not be loaded', notShown: ['No standby rotations yet'], async recovered(page, { check }) { check(await page.getByRole('heading', { name: 'Electrical' }).isVisible(), 'Try again loads the board'); } },
};
export default spec;
