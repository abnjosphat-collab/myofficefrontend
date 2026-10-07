import { zimHolidayName } from '@/lib/zimHolidays';
import { computeDayStatus } from '@/app/shifts/calcShifts';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
import { typeOf } from '@/app/leaves/leaveTypes';
import { LEAVE_TYPE_TO_DAY_STATUS, dayStatusLabel, isLeaveDayStatus } from './dayStatus';
import { LEAVE_NORMAL_HRS } from './hourAlloc';
import { roundHours2 } from './hourFormat';
import { dayPart, groupOvertimeByShift, groupPendingOvertimeByShift, sameEmployee, signTimesFromOvertime } from './shiftDay';
import type { ArtisanTimesheetDayRow } from './types';

function appendComment(existing: string, addition: string): string {
  const next = addition.trim();
  if (!next) return existing;
  if (!existing.trim()) return next;
  if (existing.includes(next)) return existing;
  return `${existing}; ${next}`;
}

const OT_TYPE_TO_BUCKET: Record<string, 'ot_15' | 'ot_20'> = {
  weekend: 'ot_20',
  holiday: 'ot_20',
  regular: 'ot_15',
  emergency: 'ot_15',
  project: 'ot_15',
  night: 'ot_15',
};

export interface AutoPopulateSources {
  leaves: ApprovedLeaveRecord[];
  overtime: ApprovedOvertimeRecord[];
  standbyAssignments: ShiftAssignment[];
}

/** Hours for one OT record: stored hours, else the start/end span (overnight wraps past midnight). */
export function calcOtHours(ot: ApprovedOvertimeRecord): number {
  if (ot.hours != null && ot.hours > 0) return ot.hours;
  if (!ot.start_time || !ot.end_time) return 0;
  const [sh, sm] = ot.start_time.split(':').map(Number);
  const [eh, em] = ot.end_time.split(':').map(Number);
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e < s) e += 24;
  return roundHours2(Math.max(0, e - s));
}

function findStandbyAssignment(assignments: ShiftAssignment[], employeeMineNo: string): ShiftAssignment | undefined {
  return assignments.find(a => a.is_active !== false && sameEmployee(a.employee_id, employeeMineNo));
}

function isOnStandby(assignment: ShiftAssignment | undefined, dateStr: string): boolean {
  if (!assignment) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const status = computeDayStatus(assignment, new Date(y, m - 1, d));
  return status === 'standby' || status === 'on+standby';
}

/**
 * Merge leave, overtime (07:00–07:00 shift window), standby roster, and ZW
 * public holidays onto month rows. Credited: approved leave, approved or paid
 * overtime. There is no overtime on a public holiday — not credited, and
 * holiday overtime records are only noted, never counted. Standby shows as
 * days on standby only; the standby allowance is worked out by the Pay office.
 * Artisans are on basic pay: only leave days carry normal hours (8h); every
 * other day carries none. A standby toggle or sign time the artisan set by
 * hand is never overwritten — except on leave days, where standby and any
 * sign-in/out are always cleared, because nobody works on leave.
 */
export function autoPopulateMonthRows(
  rows: ArtisanTimesheetDayRow[],
  employeeMineNo: string,
  sources: AutoPopulateSources,
  opts: { overwrite?: boolean } = {},
): ArtisanTimesheetDayRow[] {
  const assignment = findStandbyAssignment(sources.standbyAssignments, employeeMineNo);
  const approvedLeaves = sources.leaves
    .filter(l => l.status === 'approved' && sameEmployee(l.employee_id, employeeMineNo))
    .map(l => ({ ...l, start_date: dayPart(l.start_date), end_date: dayPart(l.end_date) }));
  const otByShift = groupOvertimeByShift(sources.overtime, employeeMineNo);

  return rows.map(row => {
    const isBlank = !row.day_status &&
      row.normal_hrs === 0 && row.ot_15 === 0 && row.ot_20 === 0 &&
      row.sb_15 === 0 && row.sb_20 === 0 && (row.night_shift || 0) === 0;
    if (!opts.overwrite && row._auto !== true && !isBlank) return row;

    const next: ArtisanTimesheetDayRow = {
      ...row,
      _auto: true,
      on_standby: row._standbyManual ? row.on_standby : isOnStandby(assignment, row.date),
    };

    const leave = approvedLeaves.find(l => row.date >= l.start_date && row.date <= l.end_date);
    const otEntries = otByShift.get(row.date) ?? [];
    if (leave) {
      const dayStatus = LEAVE_TYPE_TO_DAY_STATUS[leave.leave_type] ?? 'leave';
      next.day_status = dayStatus;
      next.normal_hrs = LEAVE_NORMAL_HRS;
      next.ot_15 = 0;
      next.ot_20 = 0;
      next.sb_15 = 0;
      next.sb_20 = 0;
      next.night_shift = 0;
      // Nobody works on leave: standby and any sign-in/out are cleared however
      // they were set, and overtime on the day counts for nothing.
      next.on_standby = false;
      next.sign_in_time = '';
      next.sign_out_time = '';
      next.sign_in_signature = '';
      next.sign_out_signature = '';
      next.comments = appendComment(
        next.comments,
        leave.reason?.trim() || dayStatusLabel(dayStatus),
      );
      if (otEntries.length > 0) next.comments = appendComment(next.comments, 'Overtime recorded on leave is not counted.');
      return next;
    }

    // No leave on this day: a stale leave status (withdrawn since the last fill)
    // clears, since the Leaves module owns it; off/absent/training stay, since
    // they are attendance facts the system must not rewrite. Normal hours are
    // always zero here — artisans are on basic pay — which also clears any
    // legacy 10h values a refresh passes over.
    if (isLeaveDayStatus(next.day_status)) next.day_status = '';
    next.normal_hrs = 0;
    next.night_shift = 0;
    // Recomputed from zero on every fill: a refresh adds each overtime record exactly once instead of stacking it
    // onto the last fill, and stale or legacy figures never survive.
    next.ot_15 = 0;
    next.ot_20 = 0;
    next.sb_15 = 0;
    next.sb_20 = 0;

    const holidayName = zimHolidayName(row.date);
    if (holidayName) {
      // No overtime on a public holiday: hours stay zero and holiday overtime counts for nothing. The records
      // are noted so they are not silently lost; the standby toggle set above still stands.
      next.comments = appendComment(next.comments, holidayName);
      if (otEntries.length > 0) next.comments = appendComment(next.comments, 'Overtime recorded on a public holiday is not counted.');
      return next;
    }
    for (const ot of otEntries) {
      const bucket = OT_TYPE_TO_BUCKET[ot.overtime_type] ?? 'ot_15';
      const hrs = calcOtHours(ot);
      if (hrs <= 0) continue;
      if (bucket === 'ot_20') next.ot_20 = roundHours2((next.ot_20 || 0) + hrs);
      else next.ot_15 = roundHours2((next.ot_15 || 0) + hrs);
      next.comments = appendComment(next.comments, ot.reason?.trim() || '');
    }

    // Sign times the artisan typed (the only way hours-only overtime gets times) survive a refresh; only rows
    // still exactly as the system filled them take new times. Any hand edit already flipped _auto to false.
    const signTimes = signTimesFromOvertime(otEntries, row.date);
    if (signTimes && row._auto !== false) {
      next.sign_in_time = signTimes.signIn;
      next.sign_out_time = signTimes.signOut;
    }

    return next;
  });
}

export interface PendingDayItems {
  leaves: ApprovedLeaveRecord[];
  overtime: ApprovedOvertimeRecord[];
}

/** Leave and overtime awaiting approval for one shift day — display only, never counted in totals. */
export function pendingForDay(sources: AutoPopulateSources, employeeMineNo: string, dateStr: string): PendingDayItems {
  return {
    leaves: sources.leaves.filter(l => l.status === 'pending' && sameEmployee(l.employee_id, employeeMineNo) && dateStr >= dayPart(l.start_date) && dateStr <= dayPart(l.end_date)),
    overtime: groupPendingOvertimeByShift(sources.overtime, employeeMineNo).get(dateStr) ?? [],
  };
}

function daysBetweenInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000) + 1;
}

/** Overtime hours and leave days awaiting approval across the month — the "excluded" footnote. */
export function pendingMonthTotals(sources: AutoPopulateSources, employeeMineNo: string, year: number, month: number): { otHours: number; leaveDays: number } {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthStart = `${prefix}-01`;
  const monthEnd = `${prefix}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  let otHours = 0;
  for (const [shift, entries] of groupPendingOvertimeByShift(sources.overtime, employeeMineNo)) {
    if (!shift.startsWith(prefix)) continue;
    if (zimHolidayName(shift)) continue; // holiday overtime would not count even once approved
    for (const ot of entries) otHours = roundHours2(otHours + calcOtHours(ot));
  }
  let leaveDays = 0;
  for (const l of sources.leaves) {
    if (l.status !== 'pending' || !sameEmployee(l.employee_id, employeeMineNo)) continue;
    const from = dayPart(l.start_date) < monthStart ? monthStart : dayPart(l.start_date);
    const to = dayPart(l.end_date) > monthEnd ? monthEnd : dayPart(l.end_date);
    if (from <= to) leaveDays += daysBetweenInclusive(from, to);
  }
  return { otHours, leaveDays };
}

/** One line for a day's pending items: "Annual + 2.50h overtime". */
export function pendingSummaryText(pending: PendingDayItems): string {
  const parts = pending.leaves.map(l => typeOf(l.leave_type).shortName);
  const hrs = roundHours2(pending.overtime.reduce((n, ot) => n + calcOtHours(ot), 0));
  if (hrs > 0) parts.push(`${hrs.toFixed(2)}h overtime`);
  else if (pending.overtime.length > 0) parts.push('overtime');
  return parts.join(' + ');
}

/** The totals footnote: "Excludes 2.50h overtime and 1 leave day awaiting approval — counted once approved." */
export function pendingFootnoteText({ otHours, leaveDays }: { otHours: number; leaveDays: number }): string {
  const parts: string[] = [];
  if (otHours > 0) parts.push(`${otHours.toFixed(2)}h overtime`);
  if (leaveDays > 0) parts.push(`${leaveDays} leave ${leaveDays === 1 ? 'day' : 'days'}`);
  return parts.length ? `Excludes ${parts.join(' and ')} awaiting approval — counted once approved.` : '';
}
