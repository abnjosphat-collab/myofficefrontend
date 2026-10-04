// /breakdowns: the register (cards, table, tiles as filters, search), detail, log/edit/delete, and the Analytics tab. Mock shapes mirror
// the real router (the list is wrapped in {data}, spares can arrive as a JSON string).
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const bd = (id, over = {}) => ({ id, machine_id: `M${id}`, machine_name: `Machine ${id}`, artisan_name: 'Ann Alpha', department: 'Engineering', location: '6 Level', breakdown_date: local(-id), breakdown_type: 'mechanical', status: 'logged', priority: 'medium', breakdown_description: `Fault ${id}`, spares_used: [], ...over });
const RECS = [
  bd(1, { machine_name: 'Winder 1', machine_id: 'W1', status: 'resolved', priority: 'critical', breakdown_nature: 'Bearing failure', breakdown_start: '08:00:00', breakdown_end: '10:00:00', work_start: '08:30:00', work_end: '09:45:00', work_done: 'Replaced the bearing', spares_used: [{ name: 'Bearing 6204', quantity: 2, unit_price: 10, total_cost: 20 }] }),
  bd(2, { machine_name: 'Crusher 1', machine_id: 'C1', priority: 'high', breakdown_type: 'electrical', location: 'Plant' }),
  bd(3, { machine_name: 'Fan 3', status: 'in_progress', spares_used: '[{"name":"Belt","quantity":1,"unit_price":5,"total_cost":5}]' }),
  // A legacy record with almost nothing on it must render rather than crash.
  { id: 4, machine_name: 'Legacy rig', status: 'weird', priority: 'weird' },
];
const HEAT = Array.from({ length: 24 }, () => Array(7).fill(0)); HEAT[8][1] = 3; HEAT[14][4] = 1; HEAT[22][0] = 2;
const INSIGHTS = {
  success: true,
  summary: { total_breakdowns: 6, unique_machines: 3, unique_artisans: 2, unique_spares: 2, unique_departments: 1, unique_types: 2, total_downtime_minutes: 300, total_repair_time_minutes: 150, total_spare_cost: 1250 },
  heatmap: { hour_day: HEAT, labels: { hours: [], days: [] } },
  hourly_distribution: Array.from({ length: 24 }, (_, h) => ({ hour: `${pad(h)}:00`, count: h === 8 ? 3 : h === 14 ? 1 : h === 22 ? 2 : 0 })),
  daily_distribution: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => ({ day, count: i === 1 ? 3 : i === 4 ? 1 : i === 0 ? 2 : 0 })),
  top_problem_machines: [{ name: 'Winder 1', count: 3, total_downtime: 240, department: 'Engineering', avg_downtime: 80, avg_repair_time: 60, avg_response_time: 10 }, { name: 'Crusher 1', count: 2, total_downtime: 60, department: 'Plant', avg_downtime: 30, avg_repair_time: 20, avg_response_time: 5 }],
  top_artisans: [], artisan_performance: [{ name: 'Ann Alpha', count: 4, total_repair_time: 120, avg_repair_time: 30 }, { name: 'Bob Beta', count: 2, total_repair_time: 30, avg_repair_time: 15 }],
  top_spare_parts: [{ name: 'Bearing 6204', count: 2, total_cost: 1200, part_number: 'B6204', total_quantity: 4 }],
  breakdown_type_distribution: [{ type: 'mechanical', count: 4 }, { type: 'electrical', count: 2 }],
  priority_distribution: [{ priority: 'high', count: 2 }, { priority: 'weird', count: 1 }], status_distribution: [{ status: 'resolved', count: 3 }], department_comparison: [{ department: 'Engineering', count: 6, downtime: 300 }],
  monthly_trends: [{ month: '2026-08', count: 2 }, { month: '2026-09', count: 4 }], weekly_trends: [], location_distribution: [{ location: '6 Level', count: 4 }, { location: 'Plant', count: 2 }],
};
let failSave = false;

const spec = {
  route: '/breakdowns',
  h1: 'Equipment breakdowns',
  data: {
    '/api/breakdowns/get-breakdowns': { data: RECS, count: RECS.length, success: true },
    '/api/breakdowns/': request => (failSave ? { __status: 422, body: { detail: 'Machine ID rejected (fixture)' } } : { id: 99, ...request.postDataJSON() }),
    'PATCH /api/breakdowns/1': request => ({ ...RECS[0], ...request.postDataJSON() }),
    'DELETE /api/breakdowns/2': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    '/api/breakdowns/analytics/heatmap': INSIGHTS,
    '/api/equipment': [{ id: 1, name: 'Winder 1', equipment_id: 'W1', department: 'Engineering', location: '6 Level', status: 'operational' }, { id: 2, name: 'Hoist 2', equipment_id: 'H2', department: 'Engineering', location: 'Shaft', status: 'operational' }],
    '/api/employees': [], '/api/spares': [],
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Breakdowns' }).getByRole('button', { name: /^Open the breakdown of/ });
    check(await cards.count() === 4, 'four cards (a JSON-string parts list and a record with almost nothing on it render)', String(await cards.count()));
    check(await page.getByText('Critical').first().isVisible() && await page.getByText('Resolved', { exact: true }).first().isVisible(), 'status and priority are stated in words');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Open\s*\d/ }).click();
    check(await cards.count() === 2, 'the Open tile filters to logged and in-progress breakdowns', String(await cards.count()));
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Critical\s*\d/ }).click();
    check(await cards.count() === 1, 'the Critical tile filters by priority');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('crusher');
    check(await cards.count() === 1, 'search finds a breakdown by machine');
    await page.getByRole('searchbox').fill('');
    check(await page.getByText('2h').first().isVisible(), 'downtime is worked out from the times');

    await page.getByRole('button', { name: 'Table view' }).click();
    check(await page.getByRole('table', { name: 'Breakdowns' }).getByRole('row').count() === 5, 'table view lists the breakdowns');
    await shot(page, 'table@1440');
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail then edit keeps the nature and the machine ID
    await page.getByRole('button', { name: /^Open the breakdown of Winder 1/ }).click();
    const det = dialog('Winder 1');
    await det.waitFor({ timeout: 5000 });
    check(await det.getByText('Bearing failure').isVisible() && await det.getByText('Bearing 6204').isVisible(), 'the detail shows the nature and the parts used');
    await shot(page, 'detail@1440');
    await det.getByRole('button', { name: 'Edit', exact: true }).click();
    const ed = dialog(/^Edit breakdown/);
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^What happened/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    check(await ed.getByText('Describe what happened.').isVisible(), 'a blank description is explained on its field');
    await ed.getByLabel(/^What happened/).fill('Bearing seized');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const patch = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/breakdowns/1').pop();
    check(patch?.body.breakdown_description === 'Bearing seized' && patch.body.breakdown_nature === 'Bearing failure' && patch.body.machine_id === 'W1' && patch.body.breakdown_start === '08:00', 'saving sends the nature, the machine ID and the times as HH:MM', JSON.stringify(patch?.body).slice(0, 160));

    // delete: confirm first, refusal shows the reason
    await page.getByRole('button', { name: 'More actions for Crusher 1' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const c1 = page.getByRole('alertdialog');
    await c1.waitFor({ timeout: 5000 });
    await c1.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'More actions for Crusher 1' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Manager role required/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not deleted: Manager role required/).isVisible(), 'a refused delete shows the reason');

    // analytics tab
    await page.getByRole('tab', { name: 'Analytics' }).click();
    await page.getByRole('heading', { name: 'By month' }).waitFor({ timeout: 8000 }).catch(() => {});
    check(await page.getByRole('heading', { name: 'By month' }).isVisible() && await page.getByRole('heading', { name: 'By kind of fault' }).isVisible(), 'the Analytics tab shows the overview');
    await shot(page, 'analytics@1440');
    await page.getByRole('tab', { name: 'When' }).click();
    check(await page.getByRole('table', { name: /^When breakdowns start/ }).isVisible(), 'the heatmap is a table with the counts printed');
    await shot(page, 'analytics-when@1440');
    await page.getByRole('tab', { name: 'Machines' }).click();
    check(await page.getByRole('table', { name: 'Machines ranked by breakdowns' }).getByText('Winder 1').isVisible(), 'machines are ranked with their figures');
    await page.getByRole('tab', { name: 'People and parts' }).click();
    check(await page.getByRole('table', { name: 'Spare parts ranked by quantity' }).getByText('Bearing 6204').isVisible(), 'parts used are ranked with quantity and cost');
    await page.getByRole('tab', { name: 'Mix' }).click();
    check(await page.getByText('weird').first().isVisible(), 'an unknown priority is shown as it was recorded');
    await shot(page, 'analytics-mix@1440');
    await page.getByRole('tab', { name: 'Records' }).click();

    // a refused log keeps the dialog and the typing
    failSave = true;
    await page.getByRole('button', { name: 'Log breakdown' }).first().click();
    const nw = dialog('Log a breakdown');
    await nw.waitFor({ timeout: 5000 });
    await nw.getByLabel(/^Machine name/).fill('Hoist 2');
    await nw.getByLabel(/^Machine ID/).fill('H2');
    await nw.getByLabel(/^What happened/).fill('Rope slipped');
    await nw.getByLabel(/^Artisan/).fill('Ann Alpha');
    await nw.getByLabel(/^Location/).fill('Shaft');
    await nw.getByRole('button', { name: 'Log breakdown' }).click();
    await nw.getByText('Machine ID rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await nw.getByText('Machine ID rejected (fixture)').isVisible() && (await nw.getByLabel(/^Machine name/).inputValue()) === 'Hoist 2', 'a refused log shows the reason and keeps what was typed');
    failSave = false;
  },
  create: {
    open: 'Log breakdown', dialog: 'Log a breakdown', path: '/api/breakdowns/', listPath: '/api/breakdowns/get-breakdowns', submit: 'Log breakdown',
    requiredText: 'Enter the machine name.',
    async fill(dialog) {
      await dialog.getByLabel(/^Machine name/).fill('Hoist 2'); await dialog.getByLabel(/^Machine ID/).fill('H2'); await dialog.getByLabel(/^What happened/).fill('Rope slipped');
      await dialog.getByLabel(/^Artisan/).fill('Ann Alpha'); await dialog.getByLabel(/^Location/).fill('Shaft'); await dialog.getByLabel(/^Nature of the breakdown/).fill('Rope wear');
      await dialog.getByLabel(/^Breakdown started/).fill('22:30'); await dialog.getByLabel(/^Breakdown ended/).fill('01:00');
    },
    async kept(dialog) { return (await dialog.getByLabel(/^Machine name/).inputValue()) === 'Hoist 2' && (await dialog.getByLabel(/^Nature of the breakdown/).inputValue()) === 'Rope wear'; },
    body: b => b.machine_id === 'H2' && b.machine_name === 'Hoist 2' && b.breakdown_nature === 'Rope wear' && b.breakdown_start === '22:30' && b.breakdown_end === '01:00' && b.status === 'logged' && Array.isArray(b.spares_used),
  },
  empty: { data: { '/api/breakdowns/get-breakdowns': { data: [], count: 0, success: true } }, text: 'No breakdowns logged yet' },
  failing: { paths: ['/api/breakdowns/get-breakdowns'], text: 'Breakdowns could not be loaded', notShown: ['No breakdowns logged yet'], async recovered(page, { check }) { await page.getByRole('list', { name: 'Breakdowns' }).getByRole('button').first().waitFor({ timeout: 8000 }).catch(() => {}); check(await page.getByRole('list', { name: 'Breakdowns' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
