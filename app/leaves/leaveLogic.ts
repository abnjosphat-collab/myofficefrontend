// app/leaves/leaveLogic.ts — the rules behind the leave register: the figures it shows, how the filters apply, the
// summaries, and the overlap warning. Pure, so what the page states is tested. Dates are YYYY-MM-DD strings compared as
// text (they sort correctly) and "today" is the user's local day, not the UTC one.
import type { Leave, Stats } from './types';

export type LeaveStatus = Leave['status'];

export function statsFromLeaves(leaves: Leave[], today: string): Stats {
  const approved = leaves.filter(l => l.status === 'approved');
  const rejected = leaves.filter(l => l.status === 'rejected');
  const decided = approved.length + rejected.length;
  const totalDays = leaves.reduce((sum, l) => sum + (l.total_days || 0), 0);
  return {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: approved.length,
    rejected: rejected.length,
    on_leave_now: approved.filter(l => l.start_date <= today && l.end_date >= today).length,
    approvalRate: decided > 0 ? Math.round((approved.length / decided) * 100) : 0,
    total_days_requested: totalDays,
    average_days: leaves.length > 0 ? Math.round(totalDays / leaves.length) : 0,
  };
}

export interface LeaveFilters { status: string; type: string; from: string; to: string; search: string; sort: string }
export const NO_FILTERS: LeaveFilters = { status: 'all', type: 'all', from: '', to: '', search: '', sort: 'date-desc' };

/**
 * Applies the filters and the sort. The date range matches a leave that overlaps it, so a leave that runs from
 * 28 June to 3 July shows up when July is chosen (a leave had to start and end inside the range before).
 */
export function filterLeaves(leaves: Leave[], f: LeaveFilters): Leave[] {
  const term = f.search.trim().toLowerCase();
  const out = leaves.filter(l =>
    (f.status === 'all' || l.status === f.status)
    && (f.type === 'all' || l.leave_type === f.type)
    && (!f.from || l.end_date >= f.from)
    && (!f.to || l.start_date <= f.to)
    && (!term || [l.employee_name, l.employee_id, l.position, l.department].some(s => s?.toLowerCase().includes(term))));
  const [field, dir] = f.sort.split('-');
  const sign = dir === 'desc' ? -1 : 1;
  return [...out].sort((a, b) => {
    if (field === 'date') return sign * (new Date(a.applied_date).getTime() - new Date(b.applied_date).getTime());
    if (field === 'days') return sign * ((a.total_days || 0) - (b.total_days || 0));
    if (field === 'name') return sign * (a.employee_name || '').localeCompare(b.employee_name || '');
    return 0;
  });
}

export function summariseByType(leaves: Leave[], types: string[]): Array<{ key: string; count: number; totalDays: number; percentage: number }> {
  return types.map(key => {
    const mine = leaves.filter(l => l.leave_type === key);
    return { key, count: mine.length, totalDays: mine.reduce((s, l) => s + (l.total_days || 0), 0), percentage: leaves.length ? Math.round((mine.length / leaves.length) * 100) : 0 };
  }).filter(r => r.count > 0);
}

/** Per employee, most days first. A status that is not one of the three is counted in no bucket instead of breaking the page. */
export function summariseByEmployee(leaves: Leave[]): Array<{ id: string; name: string; total_days: number; pending: number; approved: number; rejected: number }> {
  const map = new Map<string, { name: string; total_days: number; pending: number; approved: number; rejected: number }>();
  for (const l of leaves) {
    const e = map.get(l.employee_id) ?? { name: l.employee_name, total_days: 0, pending: 0, approved: 0, rejected: 0 };
    e.total_days += l.total_days || 0;
    if (l.status === 'pending' || l.status === 'approved' || l.status === 'rejected') e[l.status] += 1;
    map.set(l.employee_id, e);
  }
  return [...map.entries()].map(([id, d]) => ({ id, ...d })).sort((a, b) => b.total_days - a.total_days);
}

/** Another active (not rejected) leave of the same person that overlaps these dates; a warning, never a block. */
export function overlappingLeave(leaves: Leave[], employeeId: string | undefined, start: string | undefined, end: string | undefined, ignoreId?: string): Leave | undefined {
  if (!employeeId || !start || !end) return undefined;
  return leaves.find(l => l.id !== ignoreId && l.employee_id === employeeId && l.status !== 'rejected' && start <= l.end_date && end >= l.start_date);
}
