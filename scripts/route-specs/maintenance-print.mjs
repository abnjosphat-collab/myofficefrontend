// /maintenance/print: one work order as a clean printable job card (M8) — the request, the artisan's report, the
// foreman's sign-off, the downtime for a breakdown, and handwritten signature lines. Two specs: the bare route asks
// for a job; with ?open=<id> it shows that job's card.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const WO = {
  id: 7, work_order_number: 'WO-00007', equipment_info: 'Pump A', to_department: 'Engineering', date_raised: '2026-10-20',
  job_request_details: 'Inspect the seal', requested_by: 'Sam', authorising_foreman: 'Lee', allocated_to: 'Alex',
  estimated_hours: '4', job_instructions: 'Isolate first', status: 'in-progress', priority: 'high', progress: 40,
  work_done_details: 'Seal replaced.', time_work_started: '08:00', time_work_finished: '10:30', total_time_worked: '2h 30m',
  artisan_name: 'Alex', artisan_sign: PNG, artisan_date: '2026-10-25', foreman_name: '', foreman_sign: '', foreman_date: '',
  classification: 'breakdown', failure_mode: 'Seal failure', cause_of_failure: 'Wear & tear', corrective_action: 'Replaced seal',
  spares_used: [{ id: 's1', name: 'Seal kit', quantity: 1, unit_cost: 45 }],
  created_at: '2026-10-20T08:00:00Z', updated_at: '2026-10-25T10:00:00Z',
};
const BD = {
  id: 31, machine_id: 'Pump A', machine_name: 'Pump A', artisan_name: 'Alex', department: 'Engineering', location: '',
  breakdown_date: '2026-10-20', breakdown_type: 'mechanical', status: 'logged', priority: 'high',
  breakdown_description: 'Leaking seal', breakdown_start: '08:00', breakdown_end: '10:00', work_start: '08:30', work_end: '09:30',
  spares_used: [], work_order_id: 7,
};

const bare = {
  route: '/maintenance/print',
  h1: 'Print job card',
  data: {},
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Choose a job').isVisible(), 'without a job the page says to choose one');
    check(await page.getByRole('link', { name: 'Back to maintenance' }).getAttribute('href') === '/maintenance', 'the empty state links back to maintenance');
    check(!calls.some(c => c.pathname.startsWith('/api/maintenance/work-orders/')), 'no job means no work-order request');
    await shot(page, 'choose@1440');
  },
};

const loaded = {
  route: '/maintenance/print?open=7',
  h1: 'Pump A',
  data: {
    '/api/maintenance/work-orders/7': WO,
    '/api/maintenance/work-orders/7/breakdown': BD,
  },
  async ready(page, calls, { check, shot }) {
    check(await page.getByText('Job card #WO-00007').isVisible(), 'the header names the job and the machine');
    check(await page.getByText(/High priority/).isVisible(), 'the header states the priority in words');
    const card = page.getByRole('article', { name: 'Job card WO-00007' });
    check(await card.getByRole('heading', { name: 'Work request' }).isVisible()
      && await card.getByRole('heading', { name: 'Artisan report' }).isVisible()
      && await card.getByRole('heading', { name: 'Foreman sign-off' }).isVisible(), 'the three steps render');
    check(await card.getByText('Seal replaced.').isVisible() && await card.getByText('Seal kit').isVisible(), 'the report shows what was done and the spares');
    check(await card.getByText('Seal failure').isVisible() && await card.getByText('Wear & tear').isVisible(), 'a breakdown card shows its Problem and Cause');
    check(await card.getByRole('heading', { name: 'Downtime' }).isVisible() && await card.getByText('2h', { exact: true }).isVisible(), 'the downtime shows');
    check(await card.getByText('Not signed').isVisible(), 'the unsigned foreman block says so');
    check((await card.getByText('Signature and date').count()) === 2, 'the paper signature lines are there');
    check(await page.getByRole('link', { name: 'Back' }).getAttribute('href') === '/maintenance', 'the toolbar links back');
    await page.evaluate(() => { window.__printed = false; window.print = () => { window.__printed = true; }; });
    await page.getByRole('button', { name: 'Print' }).click();
    check(await page.evaluate(() => window.__printed) === true, 'the Print button prints');
    await shot(page, 'card@1440');
  },
  failing: {
    paths: ['/api/maintenance/work-orders/7'], text: 'That work order no longer exists', notShown: ['Job card #WO-00007'],
    async recovered(page, { check }) { check(await page.getByRole('heading', { level: 1, name: 'Pump A' }).isVisible(), 'Try again loads the card'); },
  },
};

const specs = [bare, loaded];
export default specs;
