// Realistic, fictional Tools fixtures for rendered inspection (no real records). GET-only; writes are blocked by the caller.
const iso = (days, hours = 0) => new Date(Date.UTC(2026, 9, 3 + days, 8 + hours)).toISOString();
export const TOOLS_ACCOUNT = { id: 'acct-1', name: 'Tendai Moyo', username: 'tmoyo', role: 'admin', can_issue: true, approval_roles: ['engineering_manager'], signing_pin_configured: true };
const eligible = [
  { id: 'e1', employee_number: 'C1042', name: 'Mina Dube', department: 'Engineering', job_title: 'Fitter' },
  { id: 'e2', employee_number: 'C2210', name: 'Farai Chikwanha-Mutasa', department: 'Engineering', job_title: 'Boilermaker' },
];
const tool = (n, over) => ({
  id: `t${n}`, register_number: `PP-UG-ENG-${String(n).padStart(3, '0')}`, name: 'Tool', make_model: 'Makita GA9020', serial_number: `SN-${1000 + n}`,
  category: 'Power tools', equipment_kind: 'power-tool', storage_location: 'Main workshop tool room', department: 'Engineering', section: 'Mechanical',
  status: 'available', condition: 'Good', specifications: { Voltage: '230 V', Disc: '230 mm' }, archived: false, evidence: [],
  eligible_employees: eligible, inspection_due: [], latest_inspections: {}, criticality: 'standard', ownership_type: 'company', required_ppe: ['Safety glasses', 'Gloves'],
  ...over,
});
export const SERVER_TOOLS = [
  tool(1, { name: 'Angle grinder 230 mm', status: 'available' }),
  tool(2, { name: 'Rotary hammer drill', make_model: 'Bosch GBH 5-40 DCE', status: 'issued', custody: { employee_name: 'Mina Dube', expected_return_at: iso(1), original_due_at: iso(1), job_reference: 'WO-24817', assigned_equipment: ['LHD 14'] } }),
  tool(3, { name: 'Torque wrench 3/4" drive 100–600 N·m with calibration certificate', category: 'Measurement & test', equipment_kind: 'measurement', status: 'overdue', calibration_required: true, custody: { employee_name: 'Farai Chikwanha-Mutasa', expected_return_at: iso(-2), original_due_at: iso(-3), job_reference: 'WO-24790', assigned_equipment: ['Dump truck DT-07', 'Grader G2'] } }),
  tool(4, { name: 'Chain block 2 t', category: 'Lifting equipment', equipment_kind: 'lifting', status: 'attention', notes: 'Hook latch spring broken — hold until replaced.', criticality: 'safety_critical', inspection_due: ['monthly_inspection'] }),
  tool(5, { name: 'Digital multimeter', make_model: 'Fluke 87V', category: 'Measurement & test', equipment_kind: 'measurement', status: 'available', department: 'Electrical', section: 'Instrumentation' }),
  tool(6, { name: 'Gas detector (4-gas)', make_model: 'Dräger X-am 2500', category: 'Safety equipment', equipment_kind: 'safety', status: 'issued', department: 'Safety', custody: { employee_name: 'Rudo Ncube', expected_return_at: iso(0, 6), original_due_at: iso(0, 6), job_reference: 'Shaft inspection' } }),
  tool(7, { name: 'Impact wrench 1"', make_model: 'Ingersoll Rand 2850MAX', status: 'available' }),
  tool(8, { name: 'Socket set 1/2" drive (42 pieces)', category: 'Hand tools', equipment_kind: 'hand-tool', status: 'available', storage_location: 'Shaft 3 satellite store' }),
  tool(9, { name: 'Hydraulic puller 30 t', category: 'Lifting equipment', equipment_kind: 'lifting', status: 'issued', custody: { employee_name: 'Mina Dube', expected_return_at: iso(3), original_due_at: iso(2), job_reference: 'WO-24822' } }),
  tool(10, { name: 'Laser alignment kit', make_model: 'SKF TKSA 41', category: 'Measurement & test', equipment_kind: 'measurement', status: 'available' }),
  tool(11, { name: 'Welding machine 400 A', make_model: 'Lincoln Invertec V350-Pro', category: 'Power tools', status: 'available', department: 'Engineering', section: 'Boilermaking' }),
  tool(12, { name: 'Retired pipe threader', status: 'available', archived: true }),
];
export const SERVER_EMPLOYEES = [
  { id: 'e1', employee_number: 'C1042', name: 'Mina Dube', department: 'Engineering', job_title: 'Fitter', supervisor_name: 'J. Phiri', active: true },
  { id: 'e2', employee_number: 'C2210', name: 'Farai Chikwanha-Mutasa', department: 'Engineering', job_title: 'Boilermaker', supervisor_name: 'J. Phiri', active: true },
  { id: 'e3', employee_number: 'C3301', name: 'Rudo Ncube', department: 'Safety', job_title: 'Safety officer', active: true },
  { id: 'e4', employee_number: 'C4410', name: 'Tatenda Mukwena', department: 'Electrical', job_title: 'Instrument technician', active: true },
];
export const SERVER_HISTORY = [
  { id: 'h1', tool_id: 'PP-UG-ENG-002', tool_name: 'Rotary hammer drill', action: 'Issued', detail: 'To Mina Dube for WO-24817', actor_name: 'Tendai Moyo', event_at: iso(0, -2) },
  { id: 'h2', tool_id: 'PP-UG-ENG-003', tool_name: 'Torque wrench 3/4" drive', action: 'Extended', detail: 'New return 1 Oct 10:00', actor_name: 'Tendai Moyo', event_at: iso(-3) },
  { id: 'h3', tool_id: 'PP-UG-ENG-004', tool_name: 'Chain block 2 t', action: 'Returned damaged', detail: 'Hook latch spring broken', actor_name: 'Tendai Moyo', event_at: iso(-1) },
  { id: 'h4', tool_id: 'PP-UG-ENG-006', tool_name: 'Gas detector (4-gas)', action: 'Issued', detail: 'To Rudo Ncube', actor_name: 'Tendai Moyo', event_at: iso(0, -1) },
];
export const TOOLS_FIXTURES = {
  '/api/tools-workspace/auth/me': TOOLS_ACCOUNT,
  '/api/tools-workspace/employees': SERVER_EMPLOYEES,
  '/api/tools-workspace/tools': SERVER_TOOLS,
  '/api/tools-workspace/history': SERVER_HISTORY,
  '/api/tools-workspace/source-registers': [],
  '/api/tools-workspace/notifications': { alerts: [
    { key: 'n1', kind: 'overdue', tool_id: 't3', tool_name: 'Torque wrench 3/4" drive', department: 'Engineering', read: false },
    { key: 'n2', kind: 'inspection_due', inspection_type: 'monthly_inspection', tool_id: 't4', tool_name: 'Chain block 2 t', department: 'Engineering', read: false },
  ], unread_count: 2 },
  '/api/tools-workspace/compliance': { competencies: [], inspections: [], incidents: [
    { id: 'i1', tool_id: 't4', incident_type: 'damaged', status: 'investigating', reported_at: iso(-1), occurred_at: iso(-1), explanation: 'Hook latch spring broken on return.' },
  ], gate_passes: [] },
  '/api/tools-workspace/analytics': { usage: [], errors: [], feedback: [] },
  '/api/tools-workspace/accounts': [TOOLS_ACCOUNT],
};

export async function installToolsFixtures(page, { blocked = [] } = {}) {
  await page.route('**/api/**', async route => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (req.method() !== 'GET') { blocked.push(`${req.method()} ${pathname}`); return route.abort('blockedbyclient'); }
    if (pathname in TOOLS_FIXTURES) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TOOLS_FIXTURES[pathname]) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript(account => {
    try {
      localStorage.setItem('oz_prefsSeen', '1');
      localStorage.setItem('myoffice.tools.session.v1', JSON.stringify({ ...account, password: '', canIssue: true, approvalRoles: account.approval_roles, token: 'fixture' }));
    } catch { /* ignore */ }
  }, TOOLS_ACCOUNT);
}
