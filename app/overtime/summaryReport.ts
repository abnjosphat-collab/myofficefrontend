// app/overtime/summaryReport.ts — custom overtime summaries for any date range,
// covering everybody in Personnel. OT @ 1.5 Shift comes from live NEC
// timesheets (actual hours above the 208h monthly cap, pro-rated to the range);
// OT @ 2.0 Shift and OT @ 1.5 Adhoc come from the Overtime module. Monthly
// averages divide by the calendar months the range touches. Whole hours.
import { calcEmployeeTotals, NEC_REG_CAP } from '../timesheets/calcTotals';
import { countPeriodCompletion } from '../timesheets/completion';
import { normalizeTimesheetEmployeeCode } from '../timesheets/employeeCode';
import { LEAVE_TYPE_TO_STATUS, fmtDate as fmtTsDate, getDays, statusMeta } from '../timesheets/timesheetMeta';
import { mergeEffectiveTimesheets } from '../timesheets/mergeEffectiveTimesheets';
import { toLocalISODate } from '@/lib/dates';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord, TimesheetEntry } from '../timesheets/types';
import type { ShiftAssignment } from '../shifts/types';
import type { BudgetEmployee } from './budgetReport';

/** Distinct calendar months touched by an inclusive ISO date range. */
export function monthsInRange(from: string, to: string): number {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const months = new Set<string>();
  const [y, m] = a.split('-').map(Number);
  const cursor = new Date(y, m - 1, 1);
  const [ey, em] = b.split('-').map(Number);
  const end = new Date(ey, em - 1, 1);
  while (cursor <= end) {
    months.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return Math.max(1, months.size);
}

/** The 208h monthly NEC cap, pro-rated to the range length (30-day month). */
export function shiftCapForRange(dayCount: number): number {
  return Math.round((NEC_REG_CAP * Math.max(0, dayCount)) / 30);
}

/** Inclusive calendar-day count of an ISO date range. */
export function daysInRange(from: string, to: string): number {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const days = getDays({ start: new Date(`${a}T00:00:00`), end: new Date(`${b}T00:00:00`) });
  return Math.max(1, days.length);
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Short human label for a range, for Comment cells: Jul 2026 · Jul–Sep 2026 · Dec 2025–Jan 2026. */
export function rangeCommentLabel(from: string, to: string): string {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  if (y1 === y2 && m1 === m2) return `${SHORT_MONTHS[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${SHORT_MONTHS[m1 - 1]}–${SHORT_MONTHS[m2 - 1]} ${y1}`;
  return `${SHORT_MONTHS[m1 - 1]} ${y1}–${SHORT_MONTHS[m2 - 1]} ${y2}`;
}

/** The last three full calendar months before `now` — the default summary window. */
export function defaultSummaryRange(now: Date = new Date()): { from: string; to: string } {
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
  const start = new Date(endMonth.getFullYear(), endMonth.getMonth() - 2, 1);
  return { from: toLocalISODate(start), to: toLocalISODate(endMonth) };
}

/** Actual NEC hours per employee over an arbitrary range, via the standard merge + totals. */
export function rangeActuals(
  employees: BudgetEmployee[],
  timesheets: TimesheetEntry[],
  leaves: ApprovedLeaveRecord[],
  overtime: ApprovedOvertimeRecord[],
  shifts: ShiftAssignment[],
  from: string,
  to: string,
): Map<string, { actual: number; filled: number; workingDays: number }> {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const days = getDays({ start: new Date(`${a}T00:00:00`), end: new Date(`${b}T00:00:00`) });
  const dayStrs = days.map(fmtTsDate);
  const rosterIds = employees.map(e => e.dbId);
  const employeeIdByHuman = new Map<string, string>();
  employees.forEach(e => {
    if (e.employeeId) employeeIdByHuman.set(normalizeTimesheetEmployeeCode(e.employeeId), e.dbId);
  });
  const effective = mergeEffectiveTimesheets({
    timesheets,
    approvedLeaves: leaves,
    approvedOvertime: overtime,
    shiftAssignments: shifts,
    dayStrs,
    rosterIds,
    employeeIdByHuman,
    leaveTypeToStatus: LEAVE_TYPE_TO_STATUS,
    statusLabel: status => statusMeta(status).label,
  });
  const out = new Map<string, { actual: number; filled: number; workingDays: number }>();
  employees.forEach(emp => {
    const totals = calcEmployeeTotals(emp.dbId, effective, { periodDates: dayStrs });
    const { filled, possible } = countPeriodCompletion([emp.dbId], days, effective);
    out.set(emp.dbId, { actual: totals.actual, filled, workingDays: possible });
  });
  return out;
}
