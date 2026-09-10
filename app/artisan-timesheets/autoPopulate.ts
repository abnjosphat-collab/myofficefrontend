import { zimHolidayName } from '@/lib/zimHolidays';
import { computeDayStatus } from '@/app/shifts/calcShifts';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
import { LEAVE_TYPE_TO_DAY_STATUS, dayStatusLabel } from './dayStatus';
import { LEAVE_NORMAL_HRS, ON_DUTY_NORMAL_HRS } from './hourAlloc';
import { roundHours2 } from './hourFormat';
import { groupOvertimeByShift, signTimesFromOvertime } from './shiftDay';
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

const HOLIDAY_HOURS = 8;
const STANDBY_HOLIDAY_SB_HOURS = 8;

export interface AutoPopulateSources {
  leaves: ApprovedLeaveRecord[];
  overtime: ApprovedOvertimeRecord[];
  standbyAssignments: ShiftAssignment[];
}

function calcOtHours(ot: ApprovedOvertimeRecord): number {
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
  return assignments.find(a =>
    a.is_active !== false &&
    (a.employee_id === employeeMineNo || a.employee_id?.trim() === employeeMineNo.trim()),
  );
}

function isOnStandby(assignment: ShiftAssignment | undefined, dateStr: string): boolean {
  if (!assignment) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const status = computeDayStatus(assignment, new Date(y, m - 1, d));
  return status === 'standby' || status === 'on+standby';
}

/**
 * Merge approved leave, overtime (07:00–07:00 shift window), standby roster,
 * and ZW public holidays onto month rows.
 */
export function autoPopulateMonthRows(
  rows: ArtisanTimesheetDayRow[],
  employeeMineNo: string,
  sources: AutoPopulateSources,
  opts: { overwrite?: boolean } = {},
): ArtisanTimesheetDayRow[] {
  const assignment = findStandbyAssignment(sources.standbyAssignments, employeeMineNo);
  const approvedLeaves = sources.leaves.filter(l => l.status === 'approved' && l.employee_id === employeeMineNo);
  const otByShift = groupOvertimeByShift(sources.overtime, employeeMineNo);

  return rows.map(row => {
    const isBlank = !row.day_status &&
      row.normal_hrs === 0 && row.ot_15 === 0 && row.ot_20 === 0 &&
      row.sb_15 === 0 && row.sb_20 === 0 && row.night_shift === 0;
    if (!opts.overwrite && row._auto !== true && !isBlank) return row;

    let next: ArtisanTimesheetDayRow = {
      ...row,
      _auto: true,
      on_standby: isOnStandby(assignment, row.date),
    };

    const leave = approvedLeaves.find(l => row.date >= l.start_date && row.date <= l.end_date);
    if (leave) {
      const dayStatus = LEAVE_TYPE_TO_DAY_STATUS[leave.leave_type] ?? 'leave';
      next.day_status = dayStatus;
      next.normal_hrs = LEAVE_NORMAL_HRS;
      next.comments = appendComment(
        next.comments,
        leave.reason?.trim() || dayStatusLabel(dayStatus),
      );
      return next;
    }

    const otEntries = otByShift.get(row.date) ?? [];
    for (const ot of otEntries) {
      const bucket = OT_TYPE_TO_BUCKET[ot.overtime_type] ?? 'ot_15';
      const hrs = calcOtHours(ot);
      if (hrs <= 0) continue;
      if (bucket === 'ot_20') next.ot_20 = roundHours2((next.ot_20 || 0) + hrs);
      else next.ot_15 = roundHours2((next.ot_15 || 0) + hrs);
      next.comments = appendComment(next.comments, ot.reason?.trim() || '');
    }

    const signTimes = signTimesFromOvertime(otEntries);
    if (signTimes) {
      next.sign_in_time = signTimes.signIn;
      next.sign_out_time = signTimes.signOut;
    }

    const holidayName = zimHolidayName(row.date);
    if (holidayName) {
      next.ot_20 = Math.max(next.ot_20 || 0, HOLIDAY_HOURS);
      if (next.on_standby) {
        next.sb_20 = Math.max(next.sb_20 || 0, STANDBY_HOLIDAY_SB_HOURS);
      }
      next.comments = appendComment(next.comments, holidayName);
    } else if (!next.day_status) {
      next.normal_hrs = ON_DUTY_NORMAL_HRS;
    }

    return next;
  });
}
