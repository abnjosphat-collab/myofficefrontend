// app/maintenance-preview/fixtures.ts — EXAMPLE DATA for the preview only. Every name, machine and tool below is invented to show
// the screens; none of it is a MyOffice record. This route is never merged to main (see docs/plans/maintenance-modules.md).

export type Status = 'pending' | 'in-progress' | 'awaiting-signoff' | 'completed' | 'on-hold';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Person { id: string; name: string; trade: string; section: string; leave?: { from: string; to: string; reason: string } }
export interface Machine { id: string; name: string; code: string; section: string }
export interface Tool { id: string; name: string; code: string; state: 'available' | 'issued' | 'overdue-inspection'; detail?: string }

export interface WorkOrder {
  id: number; number: string; machine: string; title: string; type: 'Breakdown' | 'Preventive' | 'Corrective'; status: Status; priority: Priority;
  assignees: string[]; due: string; section: string; raised: string; raisedBy: string; source?: string; tools: string[]; description: string;
}
export interface Request { id: number; number: string; machine: string; title: string; by: string; when: string; priority: Priority; status: 'waiting' | 'approved' | 'rejected'; workOrder?: string; reason?: string; details?: string }
export interface Schedule { id: number; name: string; machines: string[]; rule: string; next: string; active: boolean; dates: string[] }

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
export const dayOffset = day;

export const PEOPLE: Person[] = [
  { id: 'E1', name: 'A. Moyo', trade: 'Fitter', section: 'Plant 2' },
  { id: 'E2', name: 'T. Dube', trade: 'Electrician', section: 'Plant 2', leave: { from: day(1), to: day(4), reason: 'Annual leave' } },
  { id: 'E3', name: 'S. Ncube', trade: 'Fitter', section: 'Crushing' },
  { id: 'E4', name: 'L. Banda', trade: 'Boilermaker', section: 'Crushing' },
  { id: 'E5', name: 'P. Sibanda', trade: 'Rigger', section: 'Plant 1', leave: { from: day(-1), to: day(2), reason: 'Sick leave' } },
];
export const MACHINES: Machine[] = [
  { id: 'M1', name: 'Compressor 2', code: 'EQ-015', section: 'Plant 2' },
  { id: 'M2', name: 'Compressor 1', code: 'EQ-014', section: 'Plant 2' },
  { id: 'M3', name: 'Pump A', code: 'EQ-021', section: 'Plant 2' },
  { id: 'M4', name: 'Crusher 1', code: 'EQ-002', section: 'Crushing' },
  { id: 'M5', name: 'Conveyor 3', code: 'EQ-033', section: 'Crushing' },
  { id: 'M6', name: 'Fan 2', code: 'EQ-040', section: 'Plant 1' },
];
export const TOOLS: Tool[] = [
  { id: 'T1', name: 'Socket set 24 mm', code: 'TL-0231', state: 'issued', detail: 'Issued to S. Ncube, due back today' },
  { id: 'T2', name: 'Torque wrench 200 Nm', code: 'TL-0044', state: 'overdue-inspection', detail: 'Inspection overdue 3 days' },
  { id: 'T3', name: 'Bearing puller kit', code: 'TL-0102', state: 'available' },
  { id: 'T4', name: 'Angle grinder 230 mm', code: 'TL-0310', state: 'available' },
];

export const INITIAL_ORDERS: WorkOrder[] = [
  { id: 231, number: 'WO-00231', machine: 'Compressor 2', title: 'Drive end bearing', type: 'Breakdown', status: 'in-progress', priority: 'high', assignees: ['A. Moyo'], due: day(2), section: 'Plant 2', raised: day(-1), raisedBy: 'T. Dube', source: 'REQ-00018', tools: ['Bearing puller kit'], description: 'Bearing noise and heat at the drive end. Compressor running on reduced load until replaced.' },
  { id: 229, number: 'WO-00229', machine: 'Pump A', title: 'Discharge valve', type: 'Preventive', status: 'pending', priority: 'medium', assignees: [], due: day(-3), section: 'Plant 2', raised: day(-9), raisedBy: 'Planner', source: 'Weekly pumps', tools: [], description: 'Inspect and exercise the discharge valve; replace the gland packing if worn.' },
  { id: 228, number: 'WO-00228', machine: 'Crusher 1', title: 'Liner inspection', type: 'Preventive', status: 'awaiting-signoff', priority: 'medium', assignees: ['S. Ncube', 'L. Banda'], due: day(-1), section: 'Crushing', raised: day(-8), raisedBy: 'Planner', source: 'Monthly crusher', tools: ['Angle grinder 230 mm'], description: 'Measure liner wear and record readings.' },
  { id: 226, number: 'WO-00226', machine: 'Conveyor 3', title: 'Replace idler rollers', type: 'Corrective', status: 'pending', priority: 'urgent', assignees: ['L. Banda'], due: day(0), section: 'Crushing', raised: day(-2), raisedBy: 'S. Ncube', tools: [], description: 'Three idlers seized near the tail pulley.' },
  { id: 222, number: 'WO-00222', machine: 'Fan 2', title: 'Vibration check', type: 'Corrective', status: 'on-hold', priority: 'low', assignees: [], due: day(6), section: 'Plant 1', raised: day(-12), raisedBy: 'P. Sibanda', tools: [], description: 'Waiting for the vibration analyser to be free.' },
  { id: 219, number: 'WO-00219', machine: 'Compressor 1', title: 'Oil and filter service', type: 'Preventive', status: 'completed', priority: 'medium', assignees: ['A. Moyo'], due: day(-6), section: 'Plant 2', raised: day(-14), raisedBy: 'Planner', source: 'Compressor service', tools: [], description: 'Routine service done.' },
];
export const INITIAL_REQUESTS: Request[] = [
  { id: 18, number: 'REQ-00018', machine: 'Pump A', title: 'Gland leaking', by: 'T. Dube', when: 'Today, 07:42', priority: 'high', status: 'waiting', details: 'Gland has been weeping since the night shift and is now dripping onto the base plate. Packing looks worn.' },
  { id: 17, number: 'REQ-00017', machine: 'Fan 2', title: 'Vibration on start-up', by: 'S. Ncube', when: 'Yesterday, 14:10', priority: 'medium', status: 'waiting', details: 'Noticeable vibration for the first minute after start-up, settles after that. Worse on cold mornings.' },
  { id: 16, number: 'REQ-00016', machine: 'Compressor 2', title: 'Noise at drive end', by: 'T. Dube', when: '3 days ago', priority: 'high', status: 'approved', workOrder: 'WO-00231' },
  { id: 15, number: 'REQ-00015', machine: 'Conveyor 3', title: 'Belt tracking off', by: 'L. Banda', when: '5 days ago', priority: 'low', status: 'rejected', reason: 'Already covered by WO-00226' },
];
export const INITIAL_SCHEDULES: Schedule[] = [
  { id: 1, name: 'Weekly pumps', machines: ['Pump A'], rule: 'Mondays', next: day(5), active: true, dates: [day(5), day(12), day(19)] },
  { id: 2, name: 'Monthly crusher', machines: ['Crusher 1'], rule: 'The 22nd', next: day(15), active: true, dates: [day(15), day(45), day(76)] },
  { id: 3, name: 'Compressor service', machines: ['Compressor 1', 'Compressor 2'], rule: 'Every 3 months', next: day(40), active: false, dates: [day(40), day(130)] },
];

export const STATUS_LABEL: Record<Status, string> = { pending: 'Pending', 'in-progress': 'In progress', 'awaiting-signoff': 'Awaiting sign-off', completed: 'Completed', 'on-hold': 'On hold' };
export const STATUS_TONE: Record<Status, 'warning' | 'info' | 'brand' | 'success' | 'neutral'> = { pending: 'warning', 'in-progress': 'info', 'awaiting-signoff': 'brand', completed: 'success', 'on-hold': 'neutral' };
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export const isOverdue = (w: WorkOrder) => w.status !== 'completed' && w.due < day(0);
export const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const progressOf = (w: WorkOrder) => ({ pending: 0, 'in-progress': 55, 'awaiting-signoff': 95, completed: 100, 'on-hold': 30 }[w.status]);
/** "Today", "Tomorrow", "in 5 days", "3 days ago": the form people say out loud. */
export const rel = (iso: string) => {
  const d = Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${day(0)}T00:00:00`).getTime()) / 86_400_000);
  return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : d > 0 ? `in ${d} days` : `${-d} days ago`;
};
export const fmtLong = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
