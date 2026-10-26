// /maintenance: work orders (cards, table, tiles, priority and search), the three-step detail (request, artisan report, foreman
// sign-off), raise/edit, bulk delete, schedules (raise now, pause, create) and analytics. Mock shapes mirror the real router.
const pad = n => String(n).padStart(2, '0');
const local = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wo = (id, over = {}) => ({
  id, work_order_number: `WO-${String(id).padStart(5, '0')}`, equipment_info: 'Pump A', to_department: 'Engineering', date_raised: local(-5), job_request_details: 'Inspect the seal', requested_by: 'Sam', authorising_foreman: 'Lee',
  allocated_to: 'Alex', estimated_hours: '4', job_instructions: '', status: 'pending', priority: 'medium', progress: 0, work_done_details: '', cause_of_failure: '', delay_details: '', artisan_name: 'Alex', artisan_sign: '', artisan_date: '',
  foreman_name: '', foreman_sign: '', foreman_date: '', time_work_started: '', time_work_finished: '', total_time_worked: '', overtime_start_time: '', overtime_end_time: '', overtime_hours: '', delay_from_time: '', delay_to_time: '',
  total_delay_hours: '', spares_used: [], created_at: `${local(-5)}T08:00:00Z`, updated_at: `${local(-5)}T08:00:00Z`, ...over,
});
const ORDERS = [
  wo(1, { priority: 'high', due_date: local(-2), classification: 'planned_maintenance' }),
  wo(2, { equipment_info: 'Crusher 1', status: 'in-progress', progress: 40, classification: 'breakdown', failure_mode: 'Bearing failure', discipline: 'Mechanical', trade: 'Fitter', time_raised: '07:30', total_time_worked: '2h 30m', spares_used: [{ id: 's1', name: 'Bearing 6204', quantity: 2, unit_cost: 10 }] }),
  wo(3, { equipment_info: 'Fan 2', status: 'completed', priority: 'low', progress: 100 }),
  wo(5, { equipment_info: 'Conveyor 5', status: 'not-done', priority: 'low', progress: 0, classification: 'planned_maintenance' }),
  // A legacy record with an unknown status and priority and almost nothing else must render rather than crash.
  { id: 4, work_order_number: 'WO-00004', equipment_info: 'Legacy rig', status: 'weird', priority: 'weird' },
];
const SCHEDULES = [
  { id: 1, name: 'Weekly compressor check', equipment_info: 'Compressor 1, Compressor 2', to_department: 'Engineering', allocated_to: 'Alex', authorising_foreman: 'Lee', estimated_hours: '2', job_request_details: 'Check oil and belts', job_instructions: '', priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [], advance_days: 1, active: true, next_due_date: local(3) },
  { id: 2, name: 'Monthly conveyor audit', equipment_info: 'Conveyor 3', to_department: 'Plant', allocated_to: '', authorising_foreman: '', estimated_hours: '3', job_request_details: 'Audit rollers', job_instructions: '', priority: 'low', recurrence_type: 'monthly', recurrence_dow: 1, recurrence_dom: 22, recurrence_months: [], specific_dates: [], advance_days: 0, active: false, next_due_date: local(20) },
];
let failSave = false; let failPause = false; let refuseMachine = null;
let wo2breakdown = null;
const wo2shell = () => ({ id: 31, machine_id: 'Crusher 1', machine_name: 'Crusher 1', artisan_name: 'Alex', department: 'Engineering', location: '', breakdown_date: local(-5), breakdown_type: 'mechanical', status: 'logged', priority: 'high', breakdown_description: 'Bearing gone', breakdown_start: '08:00', breakdown_end: '10:00', work_start: '08:30', work_end: '09:30', spares_used: [], work_order_id: 2 });
const patchOf = id => request => (failSave ? { __status: 422, body: { detail: 'Save rejected (fixture)' } } : { ...ORDERS.find(o => o.id === id), ...request.postDataJSON(), id, updated_at: new Date().toISOString() });
const MEASURES = {
  period: { days: 90, weeks: 4, start: local(-90), end: local(0) },
  pm_on_time: { percent: 0, on_time: 0, total: 2, ids: [1, 5], on_time_ids: [] },
  backlog_by_age: {
    total: 3,
    buckets: [
      { label: '0-7 days', count: 3, ids: [1, 2, 4] },
      { label: '8-30 days', count: 0, ids: [] },
      { label: '31-90 days', count: 0, ids: [] },
      { label: 'Over 90 days', count: 0, ids: [] },
      { label: 'Date unknown', count: 0, ids: [] },
    ],
  },
  opened_vs_completed: {
    weeks: [{ week_start: local(-7), opened: 4, completed: 1, opened_ids: [1, 2, 3, 5], completed_ids: [3] }],
    undated_opened: [4], undated_completed: [],
  },
  machine_downtime: { rows: [{ machine: 'Crusher 1', breakdowns: 1, downtime_hours: 2.0, mttr_hours: 1.0, mtbf_days: null, breakdown_ids: [31] }] },
  repeat_failures: { groups_30d: 0, groups_90d: 0, groups: [] },
  worst_machines: { rows: [{ machine: 'Crusher 1', breakdowns: 1, downtime_hours: 2.0, open_jobs: 1, breakdown_ids: [31], work_order_ids: [2] }] },
  cost_by_machine: { rows: [{ machine: 'Crusher 1', equipment_id: null, labour_hours: 2.5, spares_cost: 20, jobs: 1, ids: [2] }] },
};

const spec = {
  route: '/maintenance',
  h1: 'Maintenance',
  data: {
    '/api/maintenance/work-orders': request => (request.method() === 'POST'
      ? (refuseMachine && request.postData()?.includes(refuseMachine) ? { __status: 422, body: { detail: 'Asset is locked (fixture)' } } : { id: 99, ...request.postDataJSON() })
      : ORDERS),
    'PATCH /api/maintenance/work-orders/1': patchOf(1), 'PATCH /api/maintenance/work-orders/2': patchOf(2),
    'POST /api/maintenance/work-orders/1/close': request => ({ ...ORDERS.find(o => o.id === 1), ...request.postDataJSON(), id: 1, status: 'completed', progress: 100, updated_at: new Date().toISOString() }),
    'POST /api/maintenance/work-orders/bulk-close': { closed: [1, 4], skipped: [] },
    'POST /api/maintenance/work-orders/2/close': request => ({ ...ORDERS.find(o => o.id === 2), ...request.postDataJSON(), id: 2, status: 'completed', progress: 100, updated_at: new Date().toISOString() }),
    'DELETE /api/maintenance/work-orders/4': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
    'DELETE /api/maintenance/work-orders/1': {}, 'DELETE /api/maintenance/work-orders/2': {}, 'DELETE /api/maintenance/work-orders/3': {}, 'DELETE /api/maintenance/work-orders/5': {},
    '/api/schedules': request => (request.method() === 'POST' ? { id: 77, ...request.postDataJSON() } : SCHEDULES),
    'PATCH /api/schedules/1': () => (failPause ? { __status: 500, body: { detail: 'Pause failed (fixture)' } } : {}),
    '/api/maintenance/work-orders/2/breakdown': request => {
      if (request.method() === 'POST') {
        wo2breakdown = wo2shell();
        return { work_order_id: 2, breakdown: wo2breakdown, already_linked: false };
      }
      return wo2breakdown;
    },
    '/api/maintenance/measures': MEASURES,
    '/api/lookup-lists/failure_problem': [{ id: 11, value: 'Bearing failure' }],
    '/api/lookup-lists/failure_cause': [{ id: 12, value: 'Wear & tear' }],
    '/api/lookup-lists/failure_action': [{ id: 13, value: 'Replaced component' }],
    '/api/equipment': [{ id: 1, name: 'Pump A', equipment_id: 'EQ-1', department: 'Mining', location: 'Pit', status: 'operational' }, { id: 2, name: 'Crusher 1', equipment_id: 'EQ-2', department: 'Plant', status: 'operational' }],
    '/api/employees': [{ id: 11, employee_id: 'C1', first_name: 'Alex', last_name: 'Smith', designation: 'Fitter' }, { id: 12, employee_id: 'C2', first_name: 'Lee', last_name: 'Jones', designation: 'Foreman' }],
  },
  async ready(page, calls, { check, shot }) {
    const dialog = name => page.getByRole('dialog', { name });
    const cards = page.getByRole('list', { name: 'Work orders' }).getByRole('button', { name: /^Open work order/ });
    check(await cards.count() === 5, 'five work order cards (a legacy record with an unknown status and priority does not crash)', String(await cards.count()));
    check(await page.getByText('Overdue', { exact: true }).first().isVisible(), 'an overdue job says so in words');
    await shot(page, 'cards@1440');

    await page.getByRole('button', { name: /^Overdue\s*\d/ }).click();
    check(await cards.count() === 1, 'the Overdue tile filters the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('crusher');
    check(await cards.count() === 1, 'search finds a machine');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('group', { name: 'Filter by priority' }).getByRole('button', { name: 'High' }).click();
    check(await cards.count() === 1, 'a priority button narrows the register');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // tiles: the foreman's sign-off list and the missed planned jobs
    await page.getByRole('button', { name: /^Awaiting sign-off\s*\d/ }).click();
    check(await cards.count() === 1, 'the Awaiting sign-off tile shows finished-but-unsigned jobs');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Not done\s*\d/ }).click();
    check(await cards.count() === 1, 'the Not done tile shows missed planned jobs');
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // fast close from a card: an empty submit explains, a filled one closes
    await page.getByRole('button', { name: 'Close work order WO-00001' }).click();
    const qc = dialog('Done: WO-00001');
    await qc.waitFor({ timeout: 5000 });
    await qc.getByRole('button', { name: 'Close work order' }).click();
    check(await qc.getByText('Say what was done.').isVisible(), 'closing with nothing typed explains what is missing');
    await qc.getByLabel(/Work done/).fill('Seal replaced.');
    await qc.getByLabel('Started').fill('08:00');
    await qc.getByLabel('Finished').fill('10:30');
    await shot(page, 'quick-close@1440');
    await qc.getByRole('button', { name: 'Close work order' }).click();
    await qc.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const qcCall = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/1/close').pop();
    check(qcCall?.body.work_done_details === 'Seal replaced.' && qcCall?.body.time_work_started === '08:00' && qcCall?.body.time_work_finished === '10:30' && typeof qcCall?.body.expected_updated_at === 'string', 'closing sends the note, the times and the row version', JSON.stringify(qcCall?.body).slice(0, 160));

    // table + bulk delete: confirm first, report a refused one with the server's reason
    await page.getByRole('button', { name: 'Table view' }).click();
    const table = page.getByRole('table', { name: 'Work orders' });
    check(await table.getByRole('row').count() === 6, 'table view lists the work orders');
    await shot(page, 'table@1440');
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    await page.getByRole('button', { name: 'Delete selected' }).click();
    const c0 = page.getByRole('alertdialog');
    await c0.waitFor({ timeout: 5000 });
    await c0.getByRole('button', { name: 'Cancel' }).click();
    check(!calls.some(c => c.method === 'DELETE'), 'cancelling the confirmation deletes nothing');
    await page.getByRole('button', { name: 'Delete selected' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete 5' }).click();
    await page.getByText(/1 could not be deleted: Manager role required/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/1 could not be deleted: Manager role required/).isVisible() && calls.filter(c => c.method === 'DELETE').length === 5, 'a refused delete shows the server\'s reason while the others go through');
    // bulk mark-done: the batch names who cannot join and sends only the rest (the delete above reloaded the list, so WO-00001 is pending again)
    await table.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    await page.getByRole('button', { name: 'Mark done' }).click();
    const qcb = dialog('Done: 2 work orders');
    await qcb.waitFor({ timeout: 5000 });
    check(await qcb.getByText(/cannot close in this batch/).isVisible(), 'a bulk close names the jobs that cannot join it');
    await qcb.getByLabel(/Work done/).fill('Routine check done.');
    await qcb.getByRole('button', { name: 'Hours' }).click();
    await qcb.getByLabel('Hours').fill('0.5');
    await qcb.getByRole('button', { name: 'Close 2 work orders' }).click();
    await qcb.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const bulkCall = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/bulk-close').pop();
    check(JSON.stringify(bulkCall?.body.ids) === '[1,4]' && bulkCall?.body.total_hours === 0.5, 'a bulk close sends the shared note and time for the eligible jobs only', JSON.stringify(bulkCall?.body).slice(0, 160));
    await page.getByRole('button', { name: 'Card view' }).click();

    // detail: the request (with its Done shortcut), then the artisan's report
    await page.getByRole('button', { name: /^Open work order WO-00002/ }).click();
    const d = dialog('Work order WO-00002');
    await d.waitFor({ timeout: 5000 });
    check(await d.getByRole('tab', { name: 'Artisan report' }).getAttribute('aria-selected') === 'true', 'the detail opens on the artisan report');
    await d.getByRole('button', { name: 'Done', exact: true }).click();
    const qcd = dialog('Done: WO-00002');
    await qcd.waitFor({ timeout: 5000 });
    check(await qcd.getByLabel('Problem').isVisible() && await qcd.getByLabel(/^Cause/).isVisible() && await qcd.getByLabel('Action taken').isVisible(), 'Done from the detail opens the fast close, with Problem/Cause/Action for a breakdown');
    const problemOpts = await qcd.getByLabel('Problem').evaluate(el => Array.from((document.getElementById(el.getAttribute('list'))?.querySelectorAll('option') ?? [])).map(o => o.value));
    check(problemOpts.includes('Bearing failure'), 'the Problem field offers the managed list', problemOpts.join(','));
    await qcd.getByLabel(/Work done/).fill('Bearing replaced.');
    await qcd.getByLabel(/^Cause/).fill('Wear & tear');
    await qcd.getByLabel('Action taken').fill('Replaced component');
    await qcd.getByRole('button', { name: 'Close work order' }).click();
    await qcd.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const bdCall = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/2/close').pop();
    check(bdCall?.body.corrective_action === 'Replaced component' && bdCall?.body.cause_of_failure === 'Wear & tear', 'a breakdown close sends its Cause and Action codes', JSON.stringify(bdCall?.body).slice(0, 200));
    await d.getByRole('tab', { name: 'Work request' }).click();
    check(await d.getByText('Inspect the seal').isVisible() && await d.getByText('Alex').first().isVisible(), 'the request step shows the job and who does it');
    check(await d.getByText('No downtime recorded yet.').isVisible(), 'a breakdown job without a shell offers to record its downtime');
    await d.getByRole('button', { name: 'Record downtime' }).click();
    await d.getByText('2h').first().waitFor({ timeout: 5000 }).catch(() => {});
    const recCall = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders/2/breakdown').pop();
    check(!!recCall, 'recording downtime posts to the breakdown endpoint for that job');
    check(await d.getByText('2h').first().isVisible(), 'the recorded downtime shows in the request step');
    check(await d.getByRole('link', { name: 'Open breakdown' }).getAttribute('href') === '/breakdowns?open=31', 'the downtime opens across in Breakdowns');
    await page.waitForTimeout(450); await shot(page, 'detail@1440');
    await d.getByRole('tab', { name: 'Artisan report' }).click();
    // removing the only spare must really remove it (an emptied list used to be left out of the save)
    await d.getByRole('button', { name: 'Remove Bearing 6204' }).click();
    await d.getByRole('group', { name: 'Classification' }).getByRole('button', { name: 'Not set' }).click();
    failSave = true;
    await d.getByRole('button', { name: 'Save artisan report' }).click();
    await d.getByText('Save rejected (fixture)').waitFor({ timeout: 5000 }).catch(() => {});
    check(await d.getByText('Save rejected (fixture)').isVisible(), 'a refused save shows the reason and keeps the dialog');
    failSave = false;
    await d.getByRole('button', { name: 'Save artisan report' }).click();
    await page.waitForTimeout(600);
    const put = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/2').pop();
    check(Array.isArray(put?.body.spares_used) && put.body.spares_used.length === 0, 'saving with every spare removed sends an empty list, so they really go', JSON.stringify(put?.body?.spares_used));
    check(put?.body.classification === null && put.body.failure_mode === null && put.body.corrective_action === null && put.body.total_time_worked === '', 'a cleared classification is sent as null (and drops the failure codes that only apply to breakdowns)', JSON.stringify(put?.body).slice(0, 200));

    // foreman sign-off starts from the order as saved, so it cannot write back an older status
    await d.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /^Open work order WO-00002/ }).click();
    const d2 = dialog('Work order WO-00002');
    await d2.waitFor({ timeout: 5000 });
    await d2.getByRole('tab', { name: 'Foreman sign-off' }).click();
    check(await d2.getByRole('combobox', { name: /Final status/ }).innerText().then(t => /Completed/.test(t)), 'the foreman step starts from the current status (WO-00002 was closed above)');
    await d2.getByRole('button', { name: /Foreman signature, not signed/ }).click();
    const pad = page.getByRole('dialog', { name: 'Foreman signature' });
    await pad.waitFor({ timeout: 5000 });
    const box = await pad.locator('canvas').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 50, { steps: 8 }); await page.mouse.up();
    await pad.getByRole('button', { name: 'Confirm signature' }).click();
    await pad.waitFor({ state: 'hidden', timeout: 5000 });
    await d2.getByRole('button', { name: 'Save foreman sign-off' }).click();
    await page.waitForTimeout(500);
    const fp = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/2').pop();
    check(/^data:image\/png/.test(fp?.body.foreman_sign || '') && fp.body.status === 'completed', 'the sign-off is saved with the current status', JSON.stringify(fp?.body).slice(0, 120));
    await page.keyboard.press('Escape');

    // edit the request: an emptied due date is cleared, not kept
    await page.getByRole('button', { name: 'Edit work order WO-00001' }).click();
    const ed = dialog('Edit work order WO-00001');
    await ed.waitFor({ timeout: 5000 });
    await ed.getByLabel(/^Due date/).fill('');
    await ed.getByRole('button', { name: 'Save changes' }).click();
    await ed.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const ep = calls.filter(c => c.method === 'PATCH' && c.pathname === '/api/maintenance/work-orders/1').pop();
    check(ep?.body.due_date === null, 'clearing the due date sends null so it clears');

    // the people from the last saved order are remembered: raising the next one starts with them filled in
    await page.getByRole('button', { name: 'New work order' }).click();
    const remembered = dialog('New work order');
    await remembered.waitFor({ timeout: 5000 });
    check(await remembered.getByLabel(/^Allocated to/).inputValue() === 'Alex', 'the artisan from the last saved order is already filled in');
    await remembered.getByRole('button', { name: 'Cancel' }).click();

    // raise two machines, one refused: the refused one stays with its reason
    await page.getByRole('button', { name: 'New work order' }).click();
    const nw = dialog('New work order');
    await nw.waitFor({ timeout: 5000 });
    await nw.getByLabel(/^Allocated to/).fill(''); // clear the remembered artisan: this check is about empty-form validation
    await nw.getByRole('button', { name: 'Raise work order' }).click();
    check(await nw.getByText('Add at least one machine.').isVisible() && await nw.getByText('Enter who will do the job.').isVisible(), 'missing machine, person and job are explained');
    await nw.getByLabel(/^Or type a machine name/).fill('Pump X');
    await nw.getByRole('button', { name: 'Add', exact: true }).click();
    await nw.getByLabel(/^Or type a machine name/).fill('Pump Y');
    await nw.getByRole('button', { name: 'Add', exact: true }).click();
    await nw.getByLabel(/^Allocated to/).fill('Alex');
    await nw.getByLabel(/^Job request/).fill('Grease the bearings');
    refuseMachine = 'Pump Y';
    await nw.getByRole('button', { name: 'Raise 2 work orders' }).click();
    await nw.getByText(/1 raised, 1 not/).waitFor({ timeout: 8000 }).catch(() => {});
    check(await nw.getByText(/Pump Y: Asset is locked \(fixture\)/).isVisible() && await nw.getByRole('button', { name: 'Raise work order' }).isVisible(), 'a refused machine is named with its reason and only it stays for a retry');
    await shot(page, 'new-error@1440');
    refuseMachine = null;
    await nw.getByRole('button', { name: 'Cancel' }).click();
    const dc = page.getByRole('alertdialog');
    await dc.waitFor({ timeout: 5000 });
    check(await dc.getByText(/Discard the changes/).isVisible(), 'cancelling with typing asks before discarding');
    await dc.getByRole('button', { name: 'Discard changes' }).click();
    await nw.waitFor({ state: 'hidden', timeout: 5000 });

    // schedules: raise now makes one work order per machine; a refused pause reverts with the reason
    await page.getByRole('tab', { name: /^Schedules/ }).click();
    const sched = page.getByRole('list', { name: 'Schedules' });
    await sched.waitFor({ timeout: 5000 });
    check(await sched.getByText('Active').isVisible() && await sched.getByText('Paused').isVisible() && await sched.getByText('Monthly on the 22nd').isVisible(), 'schedules say how often and whether they are active');
    await shot(page, 'schedules@1440');
    const before = calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders').length;
    await sched.getByRole('button', { name: 'Raise now' }).first().click();
    await page.waitForTimeout(800);
    check(calls.filter(c => c.method === 'POST' && c.pathname === '/api/maintenance/work-orders').length === before + 2, 'raising now creates one work order for each machine');
    failPause = true;
    await sched.getByRole('button', { name: 'Pause' }).first().click();
    await page.getByText(/was not paused: Pause failed/).waitFor({ timeout: 5000 }).catch(() => {});
    check(await page.getByText(/was not paused: Pause failed \(fixture\)/).isVisible() && await sched.getByRole('button', { name: 'Pause' }).first().isVisible(), 'a refused pause says why and puts the schedule back');
    failPause = false;
    await page.getByRole('button', { name: 'New schedule' }).click();
    const sf = dialog('New schedule');
    await sf.waitFor({ timeout: 5000 });
    await sf.getByRole('button', { name: 'Specific dates' }).click();
    await sf.getByRole('button', { name: 'Create schedule' }).click();
    check(await sf.getByText('Give the schedule a name.').isVisible() && await sf.getByText('Add at least one date.').isVisible(), 'a schedule without a name or any dates is explained');
    await sf.getByRole('button', { name: 'Cancel' }).click();
    const dc2 = page.getByRole('alertdialog');
    await dc2.waitFor({ timeout: 5000 });
    await dc2.getByRole('button', { name: 'Discard changes' }).click();
    await sf.waitFor({ state: 'hidden', timeout: 5000 });

    // analytics
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByRole('heading', { name: 'By classification' }).isVisible() && await page.getByRole('heading', { name: 'Failure modes' }).isVisible(), 'analytics shows the classification, status and failure mode breakdowns');
    await page.getByRole('combobox', { name: 'Classification' }).click();
    await page.getByRole('option', { name: 'Breakdown' }).click();
    check(await page.getByText(/Showing 1 of 5 work orders/).isVisible(), 'an analytics filter narrows the numbers and says how many are shown');
    check(await page.getByText('PM done on time').isVisible() && await page.getByRole('heading', { name: 'Downtime, MTTR and MTBF per machine' }).isVisible(), 'analytics shows the server-counted measures');
    check(await page.getByText('Completion', { exact: true }).count() === 0, 'the misleading Completion tile is gone');
    await page.getByRole('button', { name: '0-7 days: 3 jobs' }).click();
    const drill = page.getByRole('dialog', { name: 'Backlog: 0-7 days' });
    check(await drill.getByText('#WO-00002').isVisible(), 'a measure drills down to the jobs it counts');
    await drill.getByRole('button', { name: 'Close', exact: true }).click();
    await shot(page, 'analytics@1440');
  },
  create: {
    open: 'New work order', dialog: 'New work order', path: '/api/maintenance/work-orders', submit: 'Raise work order',
    requiredText: 'Add at least one machine.',
    async fill(dialog) { await dialog.getByLabel(/^Or type a machine name/).fill('Pump Z'); await dialog.getByRole('button', { name: 'Add', exact: true }).click(); await dialog.getByLabel(/^Allocated to/).fill('Alex'); await dialog.getByLabel(/^Job request/).fill('Replace the belt'); },
    async kept(dialog) { return (await dialog.getByLabel(/^Allocated to/).inputValue()) === 'Alex' && (await dialog.getByLabel(/^Job request/).inputValue()) === 'Replace the belt'; },
    body: b => b.equipment_info === 'Pump Z' && b.allocated_to === 'Alex' && b.job_request_details === 'Replace the belt' && b.status === 'pending' && b.progress === 0 && /^WO-\d{5}$/.test(b.work_order_number) && !('due_date' in b),
  },
  empty: { data: { '/api/maintenance/work-orders': [] }, text: 'No work orders yet' },
  failing: { paths: ['/api/maintenance/work-orders'], text: 'Work orders could not be loaded', notShown: ['No work orders yet'], async recovered(page, { check }) { check(await page.getByRole('list', { name: 'Work orders' }).getByRole('button').first().isVisible(), 'Try again loads the register'); } },
};
export default spec;
