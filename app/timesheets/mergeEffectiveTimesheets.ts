// Merges saved timesheet rows with approved leave, approved overtime (Overtime module),
// shift-roster standby flags, and ZW public-holiday gaps. Overtime hours use the same
// calc as the Overtime page; standby is a separate flat allowance (see calcTotals.ts).
import { calcHours as calcOvertimeHours } from '@/app/overtime/calcOvertime';
import { computeDayStatus } from '@/app/shifts/calcShifts';
import type { ShiftAssignment } from '@/app/shifts/types';
import { zimHolidayName } from '@/lib/zimHolidays';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord, StatusKey, TimesheetEntry } from './types';

export const OT_TYPE_TO_BUCKET: Record<string, 'ot15' | 'ot20'> = {
  weekend: 'ot20',
  holiday: 'ot20',
  regular: 'ot15',
  emergency: 'ot15',
  project: 'ot15',
  night: 'ot15',
};

/** Hours exactly as recorded in the Overtime module (prefer stored `hours`). */
export function approvedOvertimeHours(ot: ApprovedOvertimeRecord): number {
  if (ot.hours != null && !Number.isNaN(ot.hours)) return Math.max(0, ot.hours);
  return calcOvertimeHours(ot.start_time, ot.end_time);
}

function isOnStandbyRoster(assignment: ShiftAssignment | undefined, dateStr: string): boolean {
  if (!assignment || assignment.is_active === false) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const status = computeDayStatus(assignment, new Date(y, m - 1, d));
  return status === 'standby' || status === 'on+standby';
}

function findShiftAssignment(assignments: ShiftAssignment[], humanEmployeeId: string): ShiftAssignment | undefined {
  const key = humanEmployeeId.trim();
  return assignments.find(a =>
    a.is_active !== false &&
    (a.employee_id === key || a.employee_id?.trim() === key),
  );
}

export interface MergeEffectiveTimesheetsInput {
  timesheets: TimesheetEntry[];
  approvedLeaves: ApprovedLeaveRecord[];
  approvedOvertime: ApprovedOvertimeRecord[];
  shiftAssignments: ShiftAssignment[];
  dayStrs: string[];
  tabIds: string[];
  employeeIdByHuman: Map<string, string>;
  leaveTypeToStatus: Record<string, StatusKey>;
  statusLabel: (status: StatusKey) => string;
}

export function mergeEffectiveTimesheets(input: MergeEffectiveTimesheetsInput): TimesheetEntry[] {
  const {
    timesheets, approvedLeaves, approvedOvertime, shiftAssignments,
    dayStrs, tabIds, employeeIdByHuman, leaveTypeToStatus, statusLabel,
  } = input;

  const merged = new Map<string, TimesheetEntry>();
  timesheets.forEach(ts => merged.set(`${ts.employee_id}:${ts.date}`, ts));

  const dayStrSet = new Set(dayStrs);
  const tabIdSet = new Set(tabIds);

  approvedLeaves.forEach(lv => {
    const dbId = employeeIdByHuman.get(lv.employee_id);
    if (!dbId || !tabIdSet.has(dbId)) return;
    const status = leaveTypeToStatus[lv.leave_type];
    if (!status) return;
    dayStrs.forEach(ds => {
      if (ds < lv.start_date || ds > lv.end_date) return;
      const key = `${dbId}:${ds}`;
      const existing = merged.get(key);
      const tag = `Auto: ${statusLabel(status)} (leave module)`;
      merged.set(key, {
        employee_id: parseInt(dbId, 10),
        date: ds,
        status,
        regular_hours: 8,
        overtime_hours: existing?.overtime_hours ?? 0,
        holiday_overtime_hours: existing?.holiday_overtime_hours ?? 0,
        nightshift_hours: existing?.nightshift_hours ?? 0,
        nightshift_allowance: existing?.nightshift_allowance ?? false,
        standby_allowance: existing?.standby_allowance ?? false,
        total_hours: 8 + (existing?.overtime_hours ?? 0) + (existing?.holiday_overtime_hours ?? 0)
          + (existing?.nightshift_hours ?? 0) + (existing?.callout_overtime_hours ?? 0),
        start_time: existing?.start_time,
        end_time: existing?.end_time,
        notes: existing?.notes?.includes(tag) ? existing.notes : existing?.notes ? `${existing.notes}; ${tag}` : tag,
        id: existing?.id,
        _auto: existing?.id ? undefined : 'leave',
      });
    });
  });

  // Overtime module is authoritative per day — SET totals from approved records (deduped by id).
  // Do not add on top of saved row overtime_hours (that double-counts when rows already persisted module OT).
  type ModuleOtDay = { ot15: number; ot20: number; tags: string[] };
  const moduleOtByKey = new Map<string, ModuleOtDay>();
  const seenOvertimeIds = new Set<number>();
  approvedOvertime.forEach(ot => {
    if (ot.id != null) {
      if (seenOvertimeIds.has(ot.id)) return;
      seenOvertimeIds.add(ot.id);
    }
    const dbId = employeeIdByHuman.get(ot.employee_id);
    if (!dbId || !tabIdSet.has(dbId) || !dayStrSet.has(ot.date)) return;
    const bucket = OT_TYPE_TO_BUCKET[ot.overtime_type];
    if (!bucket) return;
    const hours = approvedOvertimeHours(ot);
    if (hours <= 0) return;
    const key = `${dbId}:${ot.date}`;
    const acc = moduleOtByKey.get(key) ?? { ot15: 0, ot20: 0, tags: [] };
    if (bucket === 'ot20') acc.ot20 += hours;
    else acc.ot15 += hours;
    if (ot.reason?.trim()) {
      const tag = `OT (${ot.overtime_type}): ${ot.reason.trim()}`;
      if (!acc.tags.some(t => t === tag)) acc.tags.push(tag);
    }
    moduleOtByKey.set(key, acc);
  });

  moduleOtByKey.forEach((totals, key) => {
    const [dbId, date] = key.split(':');
    const existing = merged.get(key);
    const base: TimesheetEntry = existing ?? {
      employee_id: parseInt(dbId, 10),
      date,
      status: 'work',
      regular_hours: 0,
      overtime_hours: 0,
      holiday_overtime_hours: 0,
      nightshift_hours: 0,
      total_hours: 0,
      standby_allowance: false,
    };
    let notes = base.notes ?? '';
    totals.tags.forEach(tag => {
      notes = notes.includes(tag) ? notes : notes ? `${notes}; ${tag}` : tag;
    });
    merged.set(key, {
      ...base,
      overtime_hours: totals.ot15,
      holiday_overtime_hours: totals.ot20,
      total_hours: (base.regular_hours || 0) + totals.ot15 + totals.ot20
        + (base.nightshift_hours || 0) + (base.callout_overtime_hours || 0),
      notes: notes || base.notes,
      _auto: base._auto === 'leave' ? 'both' : base.id ? base._auto : 'overtime',
    });
  });

  dayStrs.forEach(ds => {
    const holidayName = zimHolidayName(ds);
    if (!holidayName) return;
    tabIds.forEach(id => {
      const key = `${id}:${ds}`;
      if (merged.has(key)) return;
      merged.set(key, {
        employee_id: parseInt(id, 10),
        date: ds,
        status: 'holiday_paid',
        regular_hours: 8,
        overtime_hours: 0,
        holiday_overtime_hours: 0,
        nightshift_hours: 0,
        total_hours: 8,
        standby_allowance: false,
        notes: `Auto: Paid Public Holiday (${holidayName})`,
        _auto: 'holiday',
      });
    });
  });

  tabIds.forEach(dbId => {
    const humanId = [...employeeIdByHuman.entries()].find(([, v]) => v === dbId)?.[0];
    if (!humanId) return;
    const assignment = findShiftAssignment(shiftAssignments, humanId);
    dayStrs.forEach(ds => {
      if (!isOnStandbyRoster(assignment, ds)) return;
      const key = `${dbId}:${ds}`;
      const existing = merged.get(key);
      if (existing?.id) {
        if (!existing.standby_allowance) {
          merged.set(key, { ...existing, standby_allowance: true });
        }
        return;
      }
      const base: TimesheetEntry = existing ?? {
        employee_id: parseInt(dbId, 10),
        date: ds,
        status: 'work',
        regular_hours: 0,
        overtime_hours: 0,
        holiday_overtime_hours: 0,
        nightshift_hours: 0,
        total_hours: 0,
        standby_allowance: false,
      };
      merged.set(key, {
        ...base,
        standby_allowance: true,
        notes: base.notes?.includes('Standby roster') ? base.notes : base.notes ? `${base.notes}; Standby roster` : 'Auto: Standby roster',
      });
    });
  });

  return [...merged.values()];
}
