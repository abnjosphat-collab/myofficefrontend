// frontend/app/maintenance/helpers.ts — pure display/calc functions used by
// both the maintenance page and its extracted modal/analytics components.
import { todayLocal } from '@/lib/dates';
import { ACCENT_HEX } from '@/components/shared/theme';
import {
  Clock, PlayCircle, CheckCircle2, PauseCircle, XCircle, CalendarOff, AlertCircle,
} from '@/components/shared/theme';
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority, MaintenanceSchedule } from './types';

export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n: number): string { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// getNextOccurrence() and isScheduleDue() used to live here so the browser could
// decide what was due and raise the work orders itself. The server owns both now
// (app/routers/schedules.py), which is what makes generation happen whether or
// not anyone opens this page, and stops two open tabs raising the same job
// twice. recurrenceLabel() stays — describing a rule is a display concern.
export function recurrenceLabel(s: MaintenanceSchedule): string {
  switch (s.recurrence_type) {
    case 'daily': return 'Every day';
    case 'weekly': return `Every ${DOW[s.recurrence_dow]}`;
    case 'biweekly': return `Every 2 weeks on ${DOW[s.recurrence_dow]}`;
    case 'monthly': return `Monthly on the ${ordinal(s.recurrence_dom)}`;
    case 'quarterly': return `Quarterly — ${(s.recurrence_months ?? []).map(m => MON[m]).join(', ')}`;
    case 'yearly': return `Yearly — ${MON[s.recurrence_months?.[0] ?? 0]} ${ordinal(s.recurrence_dom)}`;
    case 'custom': return `Custom (${(s.specific_dates ?? []).length} date${(s.specific_dates ?? []).length !== 1 ? 's' : ''})`;
    default: return '';
  }
}

export function statusCfg(s: WorkOrderStatus) {
  const m = {
    'pending': { Icon: Clock, color: '#facc15', label: 'Pending' },
    'in-progress': { Icon: PlayCircle, color: ACCENT_HEX.blue, label: 'In Progress' },
    'completed': { Icon: CheckCircle2, color: '#34d399', label: 'Completed' },
    'on-hold': { Icon: PauseCircle, color: '#fb923c', label: 'On Hold' },
    'cancelled': { Icon: XCircle, color: '#f87171', label: 'Cancelled' },
    'postponed': { Icon: CalendarOff, color: '#c084fc', label: 'Postponed' },
    'not-done': { Icon: AlertCircle, color: '#94a3b8', label: 'Not Done' },
  } as const;
  return m[s] ?? m['pending'];
}
export function priorityCfg(p: WorkOrderPriority) {
  const m = {
    'urgent': { color: '#ef4444', label: 'Urgent' },
    'high': { color: '#f97316', label: 'High' },
    'medium': { color: '#eab308', label: 'Medium' },
    'low': { color: '#22c55e', label: 'Low' },
  } as const;
  return m[p] ?? m['medium'];
}

export const DONE_STATUSES: WorkOrderStatus[] = ['completed', 'cancelled'];

/**
 * Overdue = has a due date that has already passed, and the job is still open.
 *
 * Compares ISO date strings rather than Date objects: `new Date('2026-07-18') <
 * new Date()` is true from one second past midnight on the 18th, which marks a
 * job due *today* as already late. Cancelled work can't be overdue either.
 */
export function isOverdue(w: Pick<WorkOrder, 'due_date' | 'status'>, today = todayLocal()): boolean {
  if (!w.due_date || DONE_STATUSES.includes(w.status)) return false;
  return w.due_date < today;
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
    // Actual time the artisan recorded ("7h 30m"); fall back to the supervisor's
    // estimate only when no actual was captured. This chart used to sum estimates
    // exclusively, so it reported planned workload as if it were real hours.
    const actual = parseDurationHours(w.total_time_worked);
    if (actual > 0) artisanCostMap[name].hours += actual;
    else {
      const est = parseFloat(w.estimated_hours || '0') || 0;
      artisanCostMap[name].hours += est;
      artisanCostMap[name].estimated += est;
    }
    artisanCostMap[name].count += 1;
    (w.spares_used || []).forEach(s => { artisanCostMap[name].sparesCost += s.quantity * s.unit_cost; });
  });
  // Sorted by hours (what the bars show). The old sort key was hours*50+spares —
  // a labour cost at an invented R50/hr rate that was never displayed anywhere.
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
    overdue: orders.filter(o => isOverdue(o)).length,
    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
    plannedMaintenance: byClass('planned_maintenance'), projects: byClass('project'), breakdowns: byClass('breakdown'), customClass: byClass('custom'),
    mechanical: byDiscipline('Mechanical'), electrical: byDiscipline('Electrical'),
    artisanCost, failureModes, hourBuckets, sparesTotalCost,
  };
}

export function nextWONumber(existingOrders: WorkOrder[], offset = 0): string {
  const nums = existingOrders.map(w => { const m = w.work_order_number?.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `WO-${String(max + 1 + offset).padStart(5, '0')}`;
}

/** Parse a calcTotal()-style duration ("7h 30m") — or a bare number — to hours. */
export function parseDurationHours(s: string | undefined): number {
  if (!s) return 0;
  const hm = s.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (hm) return parseInt(hm[1], 10) + (hm[2] ? parseInt(hm[2], 10) / 60 : 0);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
