// /equipment/history: one machine's history (M6) — its jobs, breakdowns, planned
// work, spares, hours and measures. The bare route asks for a machine; with
// ?equipment=<id> it shows that machine's history. Two specs: the first keeps
// the ledger's exact route match, the second drives the loaded page.
const HISTORY = {
  equipment: { id: 15, equipment_id: 'EQ-015', name: 'Crusher One', status: 'maintenance', category: 'Crushers', location: 'Plant', department: 'Engineering', model: 'C-900', manufacturer: 'Acme', serial_number: 'SN-CRUSH-9', criticality: 'High', commission_date: '2022-03-01' },
  period: { days: 90, start: '2026-07-28', end: '2026-10-26' },
  links_active: true,
  totals: { jobs: 2, open_jobs: 1, breakdowns: 1, schedules: 1, labour_hours: 2.5, spares_cost: 32, downtime_hours: 1.5, counts_by_status: { pending: 1, completed: 1 } },
  jobs: [
    { id: '21', work_order_number: 'WO-00021', equipment_info: 'Crusher One', status: 'pending', priority: 'high', progress: 0, date_raised: '2026-10-20', total_time_worked: '2h 30m', job_request_details: 'Replace the worn liner', created_at: '', updated_at: '' },
    { id: '9', work_order_number: 'WO-00009', equipment_info: 'Crusher One', status: 'completed', priority: 'medium', progress: 100, date_raised: '2026-09-02', total_time_worked: '', job_request_details: 'Quarterly service', created_at: '', updated_at: '' },
  ],
  breakdowns: [
    { id: 44, machine_id: 'CRS-1', machine_name: 'Crusher One', artisan_name: 'T. Banda', department: 'Engineering', location: 'Plant', breakdown_date: '2026-10-05', breakdown_type: 'mechanical', breakdown_nature: 'Bearing failure', status: 'resolved', priority: 'high', downtime_minutes: 90, repair_time_minutes: 60 },
  ],
  schedules: [
    { id: '11', name: 'Weekly crush', equipment_info: 'Crusher One', to_department: 'Engineering', allocated_to: '', authorising_foreman: '', estimated_hours: '', job_request_details: '', job_instructions: '', priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [], advance_days: 0, active: true, next_due_date: '2026-10-30', last_generated: '', created_at: '' },
  ],
  spares: [{ name: 'Bearing', quantity: 3, cost: 32, jobs: 1, breakdowns: 1 }],
  measures: {
    pm_on_time: { percent: 50, on_time: 1, total: 2, ids: [9, 21], on_time_ids: [9] },
    downtime: { machine: 'Crusher One', breakdowns: 1, downtime_hours: 1.5, mttr_hours: 1.0, mtbf_days: null, breakdown_ids: [44] },
    repeat_failures: {
      groups_30d: 1, groups_90d: 0,
      groups: [{ machine: 'Crusher One', code: 'Snap', count: 2, window_days: 30, first: '2026-10-01', last: '2026-10-10', ids: [5, 6] }],
    },
  },
};
const EMPTY_HISTORY = {
  ...HISTORY,
  totals: { jobs: 0, open_jobs: 0, breakdowns: 0, schedules: 0, labour_hours: 0, spares_cost: 0, downtime_hours: 0, counts_by_status: {} },
  jobs: [], breakdowns: [], schedules: [], spares: [],
  measures: {
    pm_on_time: { percent: null, on_time: 0, total: 0, ids: [], on_time_ids: [] },
    downtime: null,
    repeat_failures: { groups_30d: 0, groups_90d: 0, groups: [] },
  },
};

const bare = {
  route: '/equipment/history',
  h1: 'Machine history',
  data: {},
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Choose a machine').isVisible(), 'without a machine the page says to choose one');
    check(await page.getByRole('link', { name: 'Back to the register' }).getAttribute('href') === '/equipment', 'the empty state links back to the register');
    check(!calls.some(c => c.pathname.startsWith('/api/equipment/')), 'no machine means no history request');
    await shot(page, 'choose@1440');
  },
};

const loaded = {
  route: '/equipment/history?equipment=15',
  h1: 'Crusher One',
  data: { '/api/equipment/15/history': HISTORY },
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('SN-CRUSH-9').isVisible(), 'the header shows the serial number');
    check(await page.getByText('Open jobs').isVisible() && await page.getByText('Spares cost').isVisible(), 'the tiles render');
    const jobs = page.getByRole('table', { name: 'Jobs for this machine' });
    check(await jobs.getByText('#WO-00021').isVisible(), 'the jobs list the counted rows');
    check(await page.getByText('Bearing failure').isVisible(), 'the breakdowns list');
    check(await page.getByText('Weekly crush').isVisible(), 'the planned work lists');
    check(await page.getByText('50% (1 of 2)').isVisible(), 'the measures show the PM share');
    check(await page.getByText(/MTTR 1h/).isVisible(), 'the measures show MTTR');
    await shot(page, 'history@1440');
    await jobs.getByText('#WO-00021').click();
    await page.waitForURL('**/maintenance?open=21', { timeout: 5000 }).catch(() => {});
    check(page.url().includes('/maintenance?open=21'), 'a job row opens the work order', page.url().slice(-32));
    await page.goBack();
    await page.getByRole('heading', { level: 1, name: 'Crusher One' }).waitFor({ timeout: 8000 });
    const bds = page.getByRole('table', { name: 'Breakdowns for this machine' });
    await bds.getByText('Bearing failure').click();
    await page.waitForURL('**/breakdowns?open=44', { timeout: 5000 }).catch(() => {});
    check(page.url().includes('/breakdowns?open=44'), 'a breakdown row opens the breakdown', page.url().slice(-32));
  },
  empty: { data: { '/api/equipment/15/history': EMPTY_HISTORY }, text: 'No jobs recorded for this machine yet' },
  failing: {
    paths: ['/api/equipment/15/history'], text: 'This machine is not on the register', notShown: ['#WO-00021'],
    async recovered(page, { check }) { check(await page.getByRole('heading', { level: 1, name: 'Crusher One' }).isVisible(), 'Try again loads the history'); },
  },
};

const specs = [bare, loaded];
export default specs;
