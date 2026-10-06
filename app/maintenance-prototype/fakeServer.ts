// app/maintenance-prototype/fakeServer.ts — PROTOTYPE ONLY. An in-memory stand-in for the Maintenance API so the screens can be clicked
// through without a backend. Every row is visibly synthetic ("Example"); nothing is a real record. The rules below (leave, transitions)
// copy docs/plans/maintenance-workflow.md sections M.4 and M.5 so the screens can be judged; in Phase 2 the REAL rules live on the server
// (app/maintenance_rules.py, app/maintenance_availability.py) and this file is deleted.
import type { WorkOrderStatus } from '../maintenance/types';
import type { Availability, FlowOrder, FlowRequest, Machine, Permits, Person, ProjectionRow } from '../maintenance/workflowTypes';

export const iso = (offset: number): string => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };

export const MACHINES: Machine[] = [
  { id: 1, name: 'Compressor 1 (example)', code: 'EX-001', section: 'Plant 1', status: 'operational' },
  { id: 2, name: 'Compressor 2 (example)', code: 'EX-002', section: 'Plant 2', status: 'operational' },
  { id: 3, name: 'Pump A (example)', code: 'EX-010', section: 'Plant 2', status: 'operational' },
  { id: 4, name: 'Pump B (example)', code: 'EX-011', section: 'Plant 2', status: 'maintenance' },
  { id: 5, name: 'Conveyor 4 (example)', code: 'EX-020', section: 'Plant 1', status: 'operational' },
  { id: 6, name: 'Crusher 2 (example)', code: 'EX-030', section: 'Crushing', status: 'out_of_service' },
];
export const SECTIONS = ['Plant 1', 'Plant 2', 'Crushing', 'Workshop'];

interface RawPerson { id: number; name: string; designation: string; section: string; archived?: boolean; leave?: { type: string; from: number; to: number; status: 'approved' | 'pending' } }
const PEOPLE: RawPerson[] = [
  { id: 1, name: 'Alex Example', designation: 'Fitter', section: 'Plant 2' },
  { id: 2, name: 'Blessing Example', designation: 'Fitter', section: 'Plant 2' },
  { id: 3, name: 'Chipo Example', designation: 'Electrician', section: 'Plant 2', leave: { type: 'Annual leave', from: -1, to: 6, status: 'approved' } },
  { id: 4, name: 'Dumisani Example', designation: 'Boilermaker', section: 'Crushing' },
  { id: 5, name: 'Edith Example', designation: 'Fitter', section: 'Plant 1', leave: { type: 'Annual leave', from: 2, to: 4, status: 'pending' } },
  { id: 6, name: 'Farai Example', designation: 'Foreman', section: 'Plant 2' },
  { id: 7, name: 'Gift Example', designation: 'Fitter', section: 'Plant 1', archived: true },
  { id: 8, name: 'Hope Example', designation: 'Electrician', section: 'Plant 1', leave: { type: 'Sick leave', from: 10, to: 12, status: 'approved' } },
];

/** The leave rule of plan section M.5, for one person on one day. */
export function availabilityOn(p: RawPerson, day: string): Availability {
  if (p.archived) return { state: 'archived' };
  const l = p.leave;
  if (l && day >= iso(l.from) && day <= iso(l.to)) {
    const leave = { leave_type: l.type, start_date: iso(l.from), end_date: iso(l.to), status: l.status };
    return { state: l.status === 'approved' ? 'on_leave' : 'leave_requested', leave };
  }
  return { state: 'available' };
}
export const peopleOn = (day: string): Person[] => PEOPLE.map(p => ({ id: p.id, name: p.name, designation: p.designation, section: p.section, availability: availabilityOn(p, day) }));

export type Refusal = { ok: false; code: 'employee_unavailable' | 'employee_archived'; message: string };
/** What the server does on every assignment (plan R7): refuse a person on approved leave or archived, whatever the path. */
export function checkAssignable(personId: number | null, name: string, day: string): { ok: true } | Refusal {
  const raw = PEOPLE.find(p => (personId !== null ? p.id === personId : p.name.toLowerCase() === name.trim().toLowerCase()));
  if (!raw) return { ok: true }; // free text: allowed, stored unverified
  const a = availabilityOn(raw, day);
  if (a.state === 'archived') return { ok: false, code: 'employee_archived', message: `${raw.name} is no longer on the staff register.` };
  if (a.state === 'on_leave' && a.leave) return { ok: false, code: 'employee_unavailable', message: `${raw.name} is on ${a.leave.leave_type.toLowerCase()} from ${a.leave.start_date} to ${a.leave.end_date} (approved). Choose another person or another day.` };
  return { ok: true };
}

/** The transition table of plan section M.4, by role. `manager` also covers foreman and planner. */
export function allowedTransitions(status: WorkOrderStatus, role: 'manager' | 'user'): WorkOrderStatus[] {
  const m = role === 'manager';
  switch (status) {
    case 'pending': return m ? ['in-progress', 'on-hold', 'postponed', 'cancelled'] : ['in-progress'];
    case 'in-progress': return m ? ['completed', 'on-hold', 'not-done', 'postponed'] : ['completed', 'on-hold', 'not-done'];
    case 'on-hold': return m ? ['in-progress', 'cancelled'] : ['in-progress'];
    case 'postponed': case 'not-done': case 'cancelled': return m ? ['pending'] : [];
    case 'completed': return m ? ['in-progress'] : [];
    default: return [];
  }
}

export const noPermits = (): Permits => ({
  permit_to_work: { required: false, reference: '' }, hot_work: { required: false, reference: '' }, hazardous_work: { required: false, reference: '' },
  confined_space: { required: false, reference: '' }, high_voltage_switching: { required: false, reference: '' }, land_disturbance: { required: false, reference: '' },
  other: { required: false, reference: '', label: '' },
});

const order = (o: Partial<FlowOrder> & Pick<FlowOrder, 'id' | 'number' | 'machine' | 'description' | 'status'>): FlowOrder => {
  const base: FlowOrder = {
    classification: 'planned_maintenance', priority: 'medium', section: { text: 'Plant 2', id: 2 }, assignee: { text: '', id: null }, foreman: { text: 'Farai Example', id: 6 }, requestedBy: 'Example requester',
    scheduled_date: iso(0), due_date: iso(3), est_hours: 4, progress: 0, source: { kind: 'manual' }, version: 1, allowed_transitions: [], awaiting_signoff: false, permits: noPermits(),
    events: [{ id: 1, at: `${iso(-2)} 08:10`, who: 'Farai Example', what: 'Created' }], comments: [], assignments: [], ...o,
  } as FlowOrder;
  return { ...base, allowed_transitions: allowedTransitions(base.status, 'manager') };
};
const ref = (m: Machine) => ({ text: m.name, id: m.id });

export const seedOrders = (): FlowOrder[] => [
  order({ id: 1, number: 'WO-00231', machine: ref(MACHINES[1]), description: 'Drive end bearing noisy and hot.', status: 'in-progress', classification: 'breakdown', priority: 'high', assignee: { text: 'Alex Example', id: 1 }, progress: 40, source: { kind: 'request', ref: 'REQ-00018' }, due_date: iso(1), comments: [{ id: 1, at: `${iso(0)} 09:02`, who: 'Alex Example', body: 'Bearing ordered from stores, back this afternoon.' }], assignments: [{ id: 1, person: { text: 'Alex Example', id: 1 }, role: 'lead', day: iso(0), hours: 4, status: 'published' }], events: [{ id: 1, at: `${iso(-2)} 08:10`, who: 'Farai Example', what: 'Created from request REQ-00018', signed: true }, { id: 2, at: `${iso(0)} 07:35`, who: 'Alex Example', what: 'Status: Pending to In progress' }] }),
  order({ id: 2, number: 'WO-00229', machine: ref(MACHINES[2]), description: 'Weekly pump check.', status: 'pending', assignee: { text: '', id: null }, needs_assignment: true, source: { kind: 'schedule', ref: 'Weekly pumps' }, due_date: iso(-2) }),
  order({ id: 3, number: 'WO-00228', machine: ref(MACHINES[4]), description: 'Replace conveyor belt idlers.', status: 'completed', classification: 'project', awaiting_signoff: true, assignee: { text: 'Blessing Example', id: 2 }, progress: 100, due_date: iso(-1) }),
  order({ id: 4, number: 'WO-00227', machine: ref(MACHINES[0]), description: 'Service and oil change.', status: 'pending', assignee: { text: 'Chipo Example', id: 3 }, assignee_now_on_leave: true, due_date: iso(4), scheduled_date: iso(3), permits: { ...noPermits(), permit_to_work: { required: true, reference: '' }, confined_space: { required: true, reference: '' } } }),
  order({ id: 5, number: 'WO-00224', machine: ref(MACHINES[3]), description: 'Seal replacement.', status: 'on-hold', priority: 'urgent', assignee: { text: 'Dumisani Example', id: 4 }, progress: 20, due_date: iso(0) }),
  order({ id: 6, number: 'WO-00219', machine: ref(MACHINES[5]), description: 'Jaw plate inspection.', status: 'completed', assignee: { text: 'Alex Example', id: 1 }, progress: 100, due_date: iso(-9), awaiting_signoff: false }),
  ...Array.from({ length: 24 }, (_, i) => order({ id: 7 + i, number: `WO-${String(200 - i).padStart(5, '0')}`, machine: ref(MACHINES[i % MACHINES.length]), description: `Routine task ${i + 1} (example).`, status: (['pending', 'in-progress', 'completed'] as WorkOrderStatus[])[i % 3], assignee: i % 4 ? { text: PEOPLE[i % 5].name, id: PEOPLE[i % 5].id } : { text: '', id: null }, due_date: iso(i - 8), progress: i % 3 === 2 ? 100 : (i * 7) % 90 })),
];

export const seedRequests = (): FlowRequest[] => [
  { id: 1, number: 'REQ-00018', status: 'open', machine: ref(MACHINES[2]), description: 'Discharge valve leaking, product on the floor.', priority: 'high', classification: 'breakdown', requester: 'Example requester', department: 'Production', section: 'Plant 2', needed_by: iso(2), created: `${iso(0)} 08:12`, foreman: { text: 'Farai Example', id: 6 } },
  { id: 2, number: 'REQ-00017', status: 'open', machine: ref(MACHINES[4]), description: 'Guard missing on the tail pulley.', priority: 'urgent', classification: 'breakdown', requester: 'Example safety officer', department: 'Safety', section: 'Plant 1', needed_by: iso(1), created: `${iso(0)} 05:40`, foreman: { text: '', id: null } },
  { id: 3, number: 'REQ-00012', status: 'approved', machine: ref(MACHINES[0]), description: 'Air pressure drops after lunch.', priority: 'medium', classification: 'planned_maintenance', requester: 'Example stores clerk', department: 'Stores', section: 'Plant 1', needed_by: iso(-3), created: `${iso(-4)} 13:20`, foreman: { text: 'Farai Example', id: 6 }, work_order: { number: 'WO-00227', status: 'pending' } },
  { id: 4, number: 'REQ-00009', status: 'rejected', machine: { text: 'Office air conditioner', id: null }, description: 'Not cooling.', priority: 'low', classification: 'custom', requester: 'Example clerk', department: 'Admin', section: 'Offices', needed_by: iso(-6), created: `${iso(-8)} 10:00`, foreman: { text: '', id: null }, decision_note: 'Not engineering plant; please log with Facilities.' },
];

/** A stand-in for the real projection: same shape, simplified rules (weekly, every 2 weeks, monthly), enough to judge the preview. */
export function projectSchedule(input: { assets: string[]; kind: 'weekly' | 'biweekly' | 'monthly'; leadDays: number; suppressDays: number; person: string; count: number }): ProjectionRow[] {
  const step = input.kind === 'weekly' ? 7 : input.kind === 'biweekly' ? 14 : 30;
  const rows: ProjectionRow[] = [];
  for (let n = 1; n <= input.count; n += 1) {
    const due = iso(n * step); const raise = iso(n * step - input.leadDays);
    for (const asset of input.assets) {
      const row: ProjectionRow = { due, raise_on: raise, machine: asset };
      const raw = PEOPLE.find(p => p.name.toLowerCase() === input.person.trim().toLowerCase());
      const a = raw ? availabilityOn(raw, due) : null;
      if (a?.state === 'on_leave' && a.leave) { row.note = `${raw?.name} is on leave ${a.leave.start_date} to ${a.leave.end_date}: raised unassigned`; row.tone = 'warning'; }
      if (input.suppressDays > 0 && n === 2) { row.note = `Skipped: done within ${input.suppressDays} days (suppression)`; row.tone = 'neutral'; }
      rows.push(row);
    }
  }
  return rows;
}
