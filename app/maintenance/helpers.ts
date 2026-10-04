// frontend/app/maintenance/helpers.ts — pure rules for the work-order module: overdue, the headline numbers, the register's filter
// and sort, how long a job took, and the payloads the forms send. The vocabulary (labels, tones) lives in meta.ts.
import { todayLocal } from '@/lib/dates';
import { priorityMeta } from './meta';
import type { Discipline, MaintenanceSchedule, RecurrenceType, SpareItem, Trade, WOClassification, WorkOrder, WorkOrderPriority, WorkOrderStatus } from './types';

export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n: number): string { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// The server owns "what is due" and raising the work orders (app/routers/schedules.py), so generation happens whether or not anyone
// opens this page and two open tabs cannot raise the same job twice. Describing a rule is a display concern and stays here.
export function recurrenceLabel(s: MaintenanceSchedule): string {
  switch (s.recurrence_type) {
    case 'daily': return 'Every day';
    case 'weekly': return `Every ${DOW[s.recurrence_dow]}`;
    case 'biweekly': return `Every 2 weeks on ${DOW[s.recurrence_dow]}`;
    case 'monthly': return `Monthly on the ${ordinal(s.recurrence_dom)}`;
    case 'quarterly': return `Quarterly: ${(s.recurrence_months ?? []).map(m => MON[m]).join(', ')}`;
    case 'yearly': return `Yearly: ${MON[s.recurrence_months?.[0] ?? 0]} ${ordinal(s.recurrence_dom)}`;
    case 'custom': return `${(s.specific_dates ?? []).length} specific ${(s.specific_dates ?? []).length === 1 ? 'date' : 'dates'}`;
    default: return '';
  }
}

export const DONE_STATUSES: WorkOrderStatus[] = ['completed', 'cancelled'];

/**
 * Overdue = has a due date that has already passed, and the job is still open. ISO date strings are compared, not Date objects:
 * `new Date('2026-07-18') < new Date()` is true from one second past midnight on the 18th, which marks a job due today as late.
 */
export function isOverdue(w: Pick<WorkOrder, 'due_date' | 'status'>, today = todayLocal()): boolean {
  if (!w.due_date || DONE_STATUSES.includes(w.status)) return false;
  return w.due_date < today;
}

/** Parse a "7h 30m" duration, or a bare number, to hours. */
export function parseDurationHours(s: string | undefined): number {
  if (!s) return 0;
  const hm = s.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (hm) return parseInt(hm[1], 10) + (hm[2] ? parseInt(hm[2], 10) / 60 : 0);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** How long from start to finish, as "7h 30m"; a finish earlier than the start means the next day. Empty until both are set. */
export function durationText(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

/** The machines in a comma-separated list, trimmed and de-duplicated; one work order is raised for each. */
export function machinesOf(text: string): string[] {
  const seen = new Set<string>();
  return text.split(',').map(s => s.trim()).filter(m => m && !seen.has(m.toLowerCase()) && !!seen.add(m.toLowerCase()));
}

export function calcStats(orders: WorkOrder[]) {
  const by = (s: WorkOrderStatus) => orders.filter(o => o.status === s).length;
  const total = orders.length;
  const completed = by('completed');
  const byClass = (c: WorkOrder['classification']) => orders.filter(o => o.classification === c).length;
  const breakdowns = orders.filter(o => o.classification === 'breakdown');
  const byDiscipline = (d: WorkOrder['discipline']) => orders.filter(o => o.discipline === d).length;

  const artisanCostMap: Record<string, { hours: number; estimated: number; sparesCost: number; count: number }> = {};
  breakdowns.forEach(w => {
    const name = w.artisan_name || w.allocated_to || 'Unknown';
    if (!artisanCostMap[name]) artisanCostMap[name] = { hours: 0, estimated: 0, sparesCost: 0, count: 0 };
    // Actual time the artisan recorded; the supervisor's estimate only when no actual was captured (and then it is marked as estimated).
    const actual = parseDurationHours(w.total_time_worked);
    if (actual > 0) artisanCostMap[name].hours += actual;
    else { const est = parseFloat(w.estimated_hours || '0') || 0; artisanCostMap[name].hours += est; artisanCostMap[name].estimated += est; }
    artisanCostMap[name].count += 1;
    (w.spares_used || []).forEach(s => { artisanCostMap[name].sparesCost += s.quantity * s.unit_cost; });
  });
  const artisanCost = Object.entries(artisanCostMap)
    .map(([name, d]) => ({ name, hours: d.hours, estimated: d.estimated, sparesCost: d.sparesCost, count: d.count }))
    .sort((a, b) => b.hours - a.hours || b.sparesCost - a.sparesCost);

  const failureModeMap: Record<string, number> = {};
  breakdowns.forEach(w => { if (w.failure_mode) failureModeMap[w.failure_mode] = (failureModeMap[w.failure_mode] || 0) + 1; });
  const failureModes = Object.entries(failureModeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const hourBuckets = new Array(24).fill(0);
  breakdowns.forEach(w => { if (w.time_raised) { const h = parseInt(w.time_raised.split(':')[0]); if (!isNaN(h) && h >= 0 && h < 24) hourBuckets[h]++; } });

  const sparesTotalCost = orders.reduce((acc, w) => acc + (w.spares_used || []).reduce((s, x) => s + x.quantity * x.unit_cost, 0), 0);
  return {
    total, pending: by('pending'), inProgress: by('in-progress'), completed, onHold: by('on-hold'),
    overdue: orders.filter(o => isOverdue(o)).length, efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
    plannedMaintenance: byClass('planned_maintenance'), projects: byClass('project'), breakdowns: byClass('breakdown'), customClass: byClass('custom'),
    mechanical: byDiscipline('Mechanical'), electrical: byDiscipline('Electrical'), artisanCost, failureModes, hourBuckets, sparesTotalCost,
  };
}

/** The next WO number by the server's rule. The server allocates the real one on create; this is only the request's placeholder. */
export function nextWONumber(existingOrders: WorkOrder[], offset = 0): string {
  const nums = existingOrders.map(w => { const m = w.work_order_number?.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `WO-${String(max + 1 + offset).padStart(5, '0')}`;
}

// ── The register's filter and sort ──────────────────────────────────────────────────────────────────────
export type StatusFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'overdue';
export type SortKey = 'date-desc' | 'date-asc' | 'priority' | 'machine' | 'status';
export interface OrderFilters { search: string; status: StatusFilter; priorities: WorkOrderPriority[]; sort: SortKey }
export const NO_FILTERS: OrderFilters = { search: '', status: 'all', priorities: [], sort: 'date-desc' };
export const isFiltered = (f: OrderFilters) => f.search.trim() !== '' || f.status !== 'all' || f.priorities.length > 0;

const STATUS_RANK: Record<WorkOrderStatus, number> = { 'in-progress': 0, pending: 1, 'on-hold': 2, 'not-done': 3, completed: 4, postponed: 5, cancelled: 6 };

export function filterOrders(orders: WorkOrder[], f: OrderFilters, today = todayLocal()): WorkOrder[] {
  const q = f.search.trim().toLowerCase();
  const hit = (w: WorkOrder) => [w.work_order_number, w.equipment_info, w.allocated_to, w.artisan_name, w.job_request_details, w.to_department, w.requested_by].some(v => (v || '').toLowerCase().includes(q));
  const rows = orders.filter(w => {
    if (f.status === 'overdue' ? !isOverdue(w, today) : f.status !== 'all' && w.status !== f.status) return false;
    if (f.priorities.length > 0 && !f.priorities.includes(w.priority)) return false;
    return !q || hit(w);
  });
  const by: Record<SortKey, (a: WorkOrder, b: WorkOrder) => number> = {
    'date-desc': (a, b) => (b.date_raised || '').localeCompare(a.date_raised || ''),
    'date-asc': (a, b) => (a.date_raised || '').localeCompare(b.date_raised || ''),
    priority: (a, b) => priorityMeta(a.priority).rank - priorityMeta(b.priority).rank,
    machine: (a, b) => (a.equipment_info || '').localeCompare(b.equipment_info || ''),
    status: (a, b) => (STATUS_RANK[a.status] ?? 7) - (STATUS_RANK[b.status] ?? 7),
  };
  return rows.sort(by[f.sort]);
}

export function countByStatus(orders: WorkOrder[], today = todayLocal()): Record<StatusFilter, number> {
  const n = (s: WorkOrderStatus) => orders.filter(o => o.status === s).length;
  return { all: orders.length, pending: n('pending'), 'in-progress': n('in-progress'), completed: n('completed'), 'on-hold': n('on-hold'), overdue: orders.filter(o => isOverdue(o, today)).length };
}

// ── What the forms send ─────────────────────────────────────────────────────────────────────────────────
/** The fields a new work order carries beyond what the person typed. Blank on purpose: the artisan and foreman fill them in later. */
export function blankWorkOrderBody(now = new Date()) {
  return {
    to_section: '', from_department: '', from_section: '', account_number: '', user_lab_today: '', time_raised: now.toTimeString().slice(0, 5),
    job_type: { operational: false, maintenance: true, mining: false }, authorising_engineer: '', manpower: [],
    work_done_details: '', cause_of_failure: '', delay_details: '', artisan_sign: '', artisan_date: '', foreman_name: '', foreman_sign: '', foreman_date: '',
    time_work_started: '', time_work_finished: '', total_time_worked: '', overtime_start_time: '', overtime_end_time: '', overtime_hours: '',
    delay_from_time: '', delay_to_time: '', total_delay_hours: '', status: 'pending', progress: 0,
  };
}

export interface RequestForm {
  equipment_info: string; to_department: string; allocated_to: string; priority: WorkOrderPriority; estimated_hours: string; job_request_details: string;
  requested_by: string; authorising_foreman: string; job_instructions: string; date_raised: string; due_date: string; classification: WOClassification | '';
}

/** The body for one new work order (one per machine). The number is a placeholder: the server allocates the real one. */
export function newOrderBody(form: RequestForm, machine: string, number: string, now = new Date()) {
  return {
    ...blankWorkOrderBody(now), work_order_number: number, equipment_info: machine, to_department: form.to_department, allocated_to: form.allocated_to, priority: form.priority,
    estimated_hours: form.estimated_hours, job_request_details: form.job_request_details, requested_by: form.requested_by, authorising_foreman: form.authorising_foreman,
    responsible_foreman: form.authorising_foreman, job_instructions: form.job_instructions, date_raised: form.date_raised, artisan_name: form.allocated_to,
    // Omitted when blank: an empty string fails date validation on the API.
    ...(form.due_date ? { due_date: form.due_date } : {}), ...(form.classification ? { classification: form.classification } : {}),
  };
}

/** The changes from editing the request. An emptied due date is sent as null so it clears (omitting it would keep the old one). */
export function editOrderBody(form: RequestForm) {
  return {
    equipment_info: form.equipment_info.trim(), to_department: form.to_department, allocated_to: form.allocated_to, artisan_name: form.allocated_to, priority: form.priority,
    estimated_hours: form.estimated_hours, job_request_details: form.job_request_details, requested_by: form.requested_by, authorising_foreman: form.authorising_foreman,
    responsible_foreman: form.authorising_foreman, job_instructions: form.job_instructions, date_raised: form.date_raised, due_date: form.due_date || null,
    ...(form.classification ? { classification: form.classification } : {}),
  };
}

export interface ArtisanReport {
  work_done_details: string; cause_of_failure: string; delay_details: string; time_work_started: string; time_work_finished: string; overtime_start_time: string; overtime_end_time: string;
  delay_from_time: string; delay_to_time: string; artisan_name: string; artisan_sign: string; artisan_date: string; status: WorkOrderStatus; progress: number;
  classification: WOClassification | ''; classification_custom: string; failure_mode: string; discipline: Discipline | ''; trade: Trade | '';
}

/**
 * The artisan's report as the server should store it. The three durations are worked out from the times, never typed. A choice that was
 * cleared or no longer applies (a failure mode on a job that is not a breakdown) is sent as null so it is cleared, and the spares are
 * always sent as a list: sending nothing for an emptied list kept the old spares for ever.
 */
export function artisanBody(r: ArtisanReport, spares: SpareItem[]) {
  return {
    work_done_details: r.work_done_details, cause_of_failure: r.cause_of_failure, delay_details: r.delay_details,
    time_work_started: r.time_work_started, time_work_finished: r.time_work_finished, total_time_worked: durationText(r.time_work_started, r.time_work_finished),
    overtime_start_time: r.overtime_start_time, overtime_end_time: r.overtime_end_time, overtime_hours: durationText(r.overtime_start_time, r.overtime_end_time),
    delay_from_time: r.delay_from_time, delay_to_time: r.delay_to_time, total_delay_hours: durationText(r.delay_from_time, r.delay_to_time),
    artisan_name: r.artisan_name, artisan_sign: r.artisan_sign, artisan_date: r.artisan_date, status: r.status, progress: r.progress,
    classification: r.classification || null, classification_custom: r.classification === 'custom' ? r.classification_custom || null : null,
    failure_mode: r.classification === 'breakdown' ? r.failure_mode || null : null, discipline: r.discipline || null, trade: r.discipline === 'Mechanical' ? r.trade || null : null,
    spares_used: spares,
  };
}

// ── Schedules ────────────────────────────────────────────────────────────────────────────────────────────
export interface ScheduleDraft {
  name: string; equipment_info: string; to_department: string; allocated_to: string; authorising_foreman: string; estimated_hours: string; job_request_details: string; job_instructions: string;
  priority: WorkOrderPriority; recurrence_type: RecurrenceType; recurrence_dow: number; recurrence_dom: number; recurrence_months: number[]; specific_dates: string[]; advance_days: number; start_date: string;
}

/** What is missing or contradictory in a schedule before it is saved, as one reason per problem. */
export function scheduleProblems(d: ScheduleDraft): { name?: string; machines?: string; job?: string; recurrence?: string } {
  const out: { name?: string; machines?: string; job?: string; recurrence?: string } = {};
  if (!d.name.trim()) out.name = 'Give the schedule a name.';
  if (machinesOf(d.equipment_info).length === 0) out.machines = 'Add at least one machine.';
  if (!d.job_request_details.trim()) out.job = 'Describe what the artisan has to do.';
  if (d.recurrence_type === 'custom' && d.specific_dates.length === 0) out.recurrence = 'Add at least one date.';
  if (d.recurrence_type === 'quarterly' && d.recurrence_months.length === 0) out.recurrence = 'Choose at least one month.';
  return out;
}

/** The body the server stores. An empty first date is sent as null: an empty string fails date validation. */
export function scheduleBody(d: ScheduleDraft) {
  return {
    name: d.name.trim(), equipment_info: machinesOf(d.equipment_info).join(', '), to_department: d.to_department, allocated_to: d.allocated_to, authorising_foreman: d.authorising_foreman,
    estimated_hours: d.estimated_hours, job_request_details: d.job_request_details.trim(), job_instructions: d.job_instructions, priority: d.priority, recurrence_type: d.recurrence_type,
    recurrence_dow: d.recurrence_dow, recurrence_dom: d.recurrence_dom, recurrence_months: d.recurrence_months, specific_dates: d.specific_dates, advance_days: d.advance_days,
    next_due_date: d.start_date || null,
  };
}

// ── Analytics filters ────────────────────────────────────────────────────────────────────────────────────
export interface AnalyticsFilters { dateFrom: string; dateTo: string; department: string; artisan: string; machine: string; trade: string; failureMode: string; classification: string; discipline: string }
export const NO_ANALYTICS_FILTERS: AnalyticsFilters = { dateFrom: '', dateTo: '', department: '', artisan: '', machine: '', trade: '', failureMode: '', classification: '', discipline: '' };
export const analyticsFilterCount = (f: AnalyticsFilters) => Object.values(f).filter(v => v !== '').length;

export function filterAnalytics(orders: WorkOrder[], f: AnalyticsFilters): WorkOrder[] {
  return orders.filter(w => {
    if (f.dateFrom && (w.date_raised || '') < f.dateFrom) return false;
    if (f.dateTo && (w.date_raised || '') > f.dateTo) return false;
    if (f.department && w.to_department !== f.department) return false;
    if (f.discipline && w.discipline !== f.discipline) return false;
    if (f.classification && w.classification !== f.classification) return false;
    if (f.trade && w.trade !== f.trade) return false;
    if (f.failureMode && w.failure_mode !== f.failureMode) return false;
    if (f.artisan && (w.allocated_to || w.artisan_name || '').trim() !== f.artisan) return false;
    if (f.machine && !w.equipment_info?.toLowerCase().includes(f.machine.toLowerCase())) return false;
    return true;
  });
}

/** The distinct, sorted, non-blank values of a field, for a filter's choices. */
export const distinct = (values: (string | undefined | null)[]) => [...new Set(values.map(v => (v || '').trim()).filter(Boolean))].sort();

