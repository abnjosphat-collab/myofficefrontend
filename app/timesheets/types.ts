// app/timesheets/types.ts — the timesheets page's data model: employee/entry/period
// shapes and the leave/overtime records projected onto the grid. Split out of page.tsx
// as part of the standing "decompose on touch" convention. Component *prop* interfaces
// (BulkAssignDialogProps and the rest, mostly inline-destructured) stay in page.tsx —
// they're coupled to one component, not the page's data contract. EntryForm and RowData
// are included here (not prop types) since, like ppe's FormState, they mirror a
// create/display data shape rather than describing a component's own props.
import type { ElementType } from 'react';

export interface Employee {
  id: string; employeeId: string; name: string; position: string;
  department: string; email: string; is_active: boolean;
  employmentType: 'NEC' | 'SALARIED' | '';
}

export interface OvertimePeriodData {
  start_time: string; end_time: string; overtime_type: '1.5x' | '2.0x';
  overtime_hours?: number; nightshift_hours?: number; reason?: string;
}

export interface TimesheetEntry {
  id?: number; employee_id: number; date: string; start_time?: string; end_time?: string;
  regular_hours: number; overtime_hours?: number; holiday_overtime_hours?: number;
  nightshift_hours?: number; standby_allowance?: boolean; nightshift_allowance?: boolean; total_hours?: number;
  status: StatusKey; notes?: string; overtime_periods?: OvertimePeriodData[];
  callout_overtime_hours?: number; callout_count?: number;
  /** Client-side only — this cell was derived from approved leave/overtime (or, for
   *  'holiday', an un-touched Zimbabwe public holiday auto-credited 8h), not saved by a
   *  person. No `id`, so it isn't in the DB yet: clicking it opens the editor pre-filled,
   *  and saving turns it into a real entry. Never sent to the backend. */
  _auto?: 'leave' | 'overtime' | 'both' | 'holiday';
}

/** Minimal shape pulled from the Leaves page's records — only what's needed to project an
 *  approved leave onto the timesheet grid. */
export interface ApprovedLeaveRecord {
  employee_id: string; leave_type: string; start_date: string; end_date: string; status: string;
}

/** Minimal shape pulled from the Overtime page's records — only what's needed to add
 *  approved overtime hours onto the timesheet grid. */
export interface ApprovedOvertimeRecord {
  employee_id: string; overtime_type: string; date: string; start_time?: string; end_time?: string; status: string;
  /** Set when the overtime entry was logged via the "pressed for time" hours-only fast path. */
  hours?: number;
}

export interface Period { start: Date; end: Date; }
export interface EditCell { employee: Employee; date: Date; entry?: TimesheetEntry; }
export interface HourTotals {
  reg: number; ot15: number; ot20: number; night: number; standbyBonus: number;
  /** Flat +8h once per contiguous run of nightshift_allowance days — same mechanic as
   *  standbyBonus, but kept as its own column rather than folded into ot15. */
  nightAllowanceBonus: number;
  total: number; excess?: number;
}

/** 'holiday' = worked ON a public holiday (2.0x, "PPH"). 'holiday_paid' = the holiday
 *  passed with no entry, auto-credited 8 regular hours (see lib/zimHolidays.ts +
 *  effectiveTimesheets in page.tsx). */
export type StatusKey = 'work' | 'leave' | 'sick' | 'special_leave' | 'holiday' | 'holiday_paid' | 'training' | 'off' | 'absent' | 'weekend' | 'maternity' | 'study' | 'lieu';

export interface StatusConfig { label: string; hex: string; Icon: ElementType; }

/** TimesheetEntryDialog's local form state — mirrors the create/update payload shape. */
export interface EntryForm {
  start_time: string; end_time: string; regular_hours: number;
  nightshift_hours: number; status: StatusKey; standby_allowance: boolean; nightshift_allowance: boolean;
  notes: string; callout_overtime_hours: number; callout_count: number;
}

/** DownloadDialog's per-day display row, built from a TimesheetEntry for one employee. */
export interface RowData { day: string; date: string; status: string; start: string; end: string; reg: string; ot15: string; ot20: string; night: string; notes: string; }
