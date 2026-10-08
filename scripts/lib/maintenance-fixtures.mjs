// scripts/lib/maintenance-fixtures.mjs — mock API data shared by the Maintenance route specs (work orders, schedules, overview). Shapes mirror the real routers.
// `f` holds switches a spec flips to make the next call fail or conflict; each spec gets its own copy.
export function maintenanceFixtures() {
  const f = { failSave: false, failPause: false, refuseMachine: null, conflictNext: false };
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
    wo(2, { version: 4, equipment_info: 'Crusher 1', status: 'in-progress', progress: 40, classification: 'breakdown', failure_mode: 'Bearing failure', discipline: 'Mechanical', trade: 'Fitter', time_raised: '07:30', total_time_worked: '2h 30m', spares_used: [{ id: 's1', name: 'Bearing 6204', quantity: 2, unit_cost: 10 }] }),
    wo(3, { equipment_info: 'Fan 2', status: 'completed', priority: 'low', progress: 100 }),
    // A legacy record with an unknown status and priority and almost nothing else must render rather than crash.
    { id: 4, work_order_number: 'WO-00004', equipment_info: 'Legacy rig', status: 'weird', priority: 'weird' },
  ];
  const SCHEDULES = [
    { id: 1, name: 'Weekly compressor check', equipment_info: 'Compressor 1, Compressor 2', to_department: 'Engineering', allocated_to: 'Alex', authorising_foreman: 'Lee', estimated_hours: '2', job_request_details: 'Check oil and belts', job_instructions: '', priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [], advance_days: 1, active: true, next_due_date: local(3) },
    { id: 2, name: 'Monthly conveyor audit', equipment_info: 'Conveyor 3', to_department: 'Plant', allocated_to: '', authorising_foreman: '', estimated_hours: '3', job_request_details: 'Audit rollers', job_instructions: '', priority: 'low', recurrence_type: 'monthly', recurrence_dow: 1, recurrence_dom: 22, recurrence_months: [], specific_dates: [], advance_days: 0, active: false, next_due_date: local(20) },
  ];
  const EVENTS = [
    { id: 2, entity: 'work_order', entity_id: 2, entity_number: 'WO-00002', action: 'updated', from_status: 'pending', to_status: 'in-progress', changes: { status: ['pending', 'in-progress'], allocated_to: ['', 'Alex'] }, note: null, actor_name: 'lee@mine.example', created_at: `${local(-1)}T09:00:00Z` },
    { id: 1, entity: 'work_order', entity_id: 2, entity_number: 'WO-00002', action: 'created', from_status: null, to_status: 'pending', changes: {}, note: null, actor_name: 'sam@mine.example', created_at: `${local(-5)}T08:00:00Z` },
  ];
  const COMMENTS = [{ id: 1, work_order_id: 2, body: 'Bearing ordered, due Thursday', author_name: 'lee@mine.example', created_at: `${local(-1)}T10:00:00Z` }];
  const patchOf = id => request => (f.conflictNext ? (f.conflictNext = false, { __status: 409, body: { detail: { code: 'version_conflict', message: 'This work order was changed by someone else since you opened it.', current: { ...ORDERS.find(o => o.id === id), status: 'on-hold', version: 5, updated_at: new Date().toISOString() } } } }) : f.failSave ? { __status: 422, body: { detail: 'Save rejected (fixture)' } } : { ...ORDERS.find(o => o.id === id), ...request.postDataJSON(), id, updated_at: new Date().toISOString() });
  const data = {
      '/api/maintenance/work-orders': request => (request.method() === 'POST'
        ? (f.refuseMachine && request.postData()?.includes(f.refuseMachine) ? { __status: 422, body: { detail: 'Asset is locked (fixture)' } } : { id: 99, ...request.postDataJSON() })
        : ORDERS),
      'PATCH /api/maintenance/work-orders/1': patchOf(1), 'PATCH /api/maintenance/work-orders/2': patchOf(2),
      'DELETE /api/maintenance/work-orders/4': { __status: 403, body: { detail: 'Manager role required (fixture)' } },
      'DELETE /api/maintenance/work-orders/1': {}, 'DELETE /api/maintenance/work-orders/2': {}, 'DELETE /api/maintenance/work-orders/3': {},
      '/api/maintenance/work-orders/2/events': () => EVENTS,
      'GET /api/maintenance/work-orders/2/comments': () => COMMENTS,
      'POST /api/maintenance/work-orders/2/comments': request => ({ id: 2, work_order_id: 2, author_name: 'me@mine.example', created_at: new Date().toISOString(), ...request.postDataJSON() }),
      '/api/schedules': request => (request.method() === 'POST' ? { id: 77, ...request.postDataJSON() } : SCHEDULES),
      'PATCH /api/schedules/1': () => (f.failPause ? { __status: 500, body: { detail: 'Pause failed (fixture)' } } : {}),
      '/api/equipment': [{ id: 1, name: 'Pump A', equipment_id: 'EQ-1', department: 'Mining', location: 'Pit', status: 'operational' }, { id: 2, name: 'Crusher 1', equipment_id: 'EQ-2', department: 'Plant', status: 'operational' }],
      '/api/employees': [{ id: 11, employee_id: 'C1', first_name: 'Alex', last_name: 'Smith', designation: 'Fitter' }, { id: 12, employee_id: 'C2', first_name: 'Lee', last_name: 'Jones', designation: 'Foreman' }],
    };
  return { f, data, ORDERS, SCHEDULES, local };
}
