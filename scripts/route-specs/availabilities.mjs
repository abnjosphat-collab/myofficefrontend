// /availabilities: availability records (manual + derived from breakdowns): overview, by period, analytics, records, log/edit/delete.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const EQUIPMENT = [
  { id: 1, equipment_id: 'CR-1', name: 'Crusher One', category: 'Machinery', department: 'Production' },
  { id: 2, equipment_id: 'PU-2', name: 'Pump Two', category: 'Pumps', department: 'Engineering' },
];
const MANUAL = [
  { id: 11, equipment_id: 1, equipment_name: 'Crusher One', date: local(-3), operational_hours: 24, breakdown_hours: 2.4, availability_percentage: 90, notes: 'Belt change' },
  { id: 12, equipment_id: 2, equipment_name: 'Pump Two', date: local(-10), operational_hours: 24, breakdown_hours: 0, availability_percentage: 100, notes: '' },
  // A legacy record with missing numbers must render rather than crash.
  { id: 13, equipment_id: 2, date: local(-12) },
];
const DERIVED = [
  // Same machine and day as manual record 11: the manual one must win.
  { id: 'bd_CR-1_x', equipment_id: 1, equipment_name: 'Crusher One', date: local(-3), operational_hours: 24, breakdown_hours: 9, availability_percentage: 62.5, notes: 'Auto-computed from breakdowns', source: 'breakdown' },
  { id: 'bd_PU-2_y', equipment_id: 2, equipment_name: 'Pump Two', date: local(-5), operational_hours: 24, breakdown_hours: 1, availability_percentage: 95.83, notes: 'Auto-computed from breakdowns', source: 'breakdown' },
];
let failDerived = false;
const spec = {
  route: '/availabilities',
  h1: 'Availability records',
  data: {
    '/api/availability-records': request => (request.method() === 'POST' ? { id: 99 } : MANUAL),
    'PUT /api/availability-records/11': { id: 11 },
    'DELETE /api/availability-records/12': { ok: true },
    '/api/availability-records/from-breakdowns': () => (failDerived ? { __status: 404, body: { detail: 'Derived records are down' } } : DERIVED),
    '/api/equipment': EQUIPMENT,
  },
  async ready(page, calls, { check, shot }) {
    await page.getByRole('tab', { name: 'Records' }).click();
    const table = page.getByRole('table', { name: 'Availability records' });
    check(await table.getByRole('row').count() === 5, 'header plus four records: three manual and one derived (the duplicate day is not repeated)');
    check(await table.getByText('Belt change').isVisible() && !(await table.getByText('62.5%').isVisible().catch(() => false)), 'a manual record wins over the derived one for the same machine and day');
    check(await table.getByText('From breakdowns').isVisible(), 'a derived record says where it came from');
    check(await page.getByRole('button', { name: /^Edit the record for Crusher One/ }).count() === 1 && await page.getByRole('button', { name: /^Edit the record for Pump Two on / }).count() === 2, 'only manual records can be edited');
    await shot(page, 'records@1440');

    await page.getByRole('tab', { name: 'Overview' }).click();
    const overview = page.getByRole('table', { name: 'Latest availability per machine' });
    check(await overview.getByRole('row').count() === 3, 'overview has one row per machine');
    check(await overview.getByText('95.8%').isVisible(), 'the latest entry per machine is used (the derived day is newer than the manual one)');
    await shot(page, 'overview@1440');

    await page.getByRole('tab', { name: 'By period' }).click();
    await page.getByRole('button', { name: 'Month' }).click();
    check(await page.getByRole('table', { name: 'Availability by month' }).isVisible(), 'by period groups by month');
    await shot(page, 'period@1440');

    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByText('Production').isVisible() && await page.getByText('Needs attention').isVisible(), 'analytics lists departments and machines needing attention');
    await shot(page, 'analytics@1440');

    // edit with validation
    await page.getByRole('tab', { name: 'Records' }).click();
    await page.getByRole('button', { name: /^Edit the record for Crusher One/ }).click();
    const edit = page.getByRole('dialog', { name: 'Edit availability record' });
    await edit.waitFor({ timeout: 5000 });
    await edit.getByLabel(/^Downtime hours/).fill('30');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    check(await edit.getByText(/no more than the operational hours/).isVisible(), 'downtime above operating hours is explained, not silently clamped');
    await edit.getByLabel(/^Downtime hours/).fill('4');
    check(await edit.getByText('83.3%').isVisible(), 'the calculated availability follows the hours');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await edit.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const put = calls.filter(c => c.method === 'PUT').pop();
    check(put?.pathname === '/api/availability-records/11' && put.body.breakdown_hours === 4 && put.body.equipment_id === 1, 'saving sends the edit', JSON.stringify(put?.body));

    // delete confirms first
    await page.getByRole('button', { name: /^Delete the record for Pump Two on / }).first().click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: /^Delete the record for Pump Two on / }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(700);
    check(calls.some(c => c.method === 'DELETE' && /\/api\/availability-records\/\d+$/.test(c.pathname)), 'confirming sends the delete');

    // a failing derived source is a notice, not an empty list
    failDerived = true;
    await page.getByRole('button', { name: 'Refresh availability records' }).click();
    await page.getByText('Records derived from breakdowns could not be loaded').waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByText('Records derived from breakdowns could not be loaded').isVisible() && await page.getByText('Derived records are down').first().isVisible(), 'a failed derived source is stated with its reason');
    check(await table.getByRole('row').count() >= 3, 'the manual records stay visible');
    failDerived = false;
  },
  create: {
    open: 'Log record', dialog: 'Log availability record', path: '/api/availability-records', submit: 'Save record',
    requiredText: 'Choose the equipment.',
    async fill(dialog, page) {
      await dialog.getByRole('combobox', { name: 'Equipment' }).click();
      await page.getByRole('option', { name: 'Crusher One' }).click();
      await dialog.getByLabel(/^Downtime hours/).fill('3');
    },
    async kept(dialog) { return (await dialog.getByLabel(/^Downtime hours/).inputValue()) === '3'; },
    body: b => b.equipment_id === 1 && b.operational_hours === 24 && b.breakdown_hours === 3 && /^\d{4}-\d{2}-\d{2}$/.test(b.date),
  },
  empty: { data: { '/api/availability-records': [], '/api/availability-records/from-breakdowns': [] }, text: 'No availability records yet' },
  failing: { paths: ['/api/availability-records'], text: 'Availability records could not be loaded', notShown: ['No availability records yet'], async recovered(page, { check }) { check(await page.getByRole('table', { name: 'Latest availability per machine' }).isVisible(), 'Try again loads the records'); } },
};
export default spec;
