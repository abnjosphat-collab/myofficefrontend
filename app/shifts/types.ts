// app/shifts/types.ts — the shifts page's data model: assignment/event/leave/holiday
// shapes. Split out of page.tsx as part of the standing "decompose on touch" convention.
// Component *prop* interfaces stay in page.tsx (all inline-destructured here, so none
// needed extracting). FormState and EventForm are included (not prop types) since, like
// ppe's FormState and timesheets' EntryForm, they mirror a create/update payload shape
// rather than describing a component's own props.

export type ShiftType = '10-4' | '5-2' | 'standby' | 'custom';
export type DayStatus = 'on' | 'off' | 'standby' | 'on+standby';
export type ViewMode = 'grid' | 'table' | 'schedule';
export type SortKey = 'name' | 'shift_type' | 'cycle_start_date' | 'created_at';

export interface ShiftTimingPeriod { from: string; to: string; label: string; start_time: string; end_time: string; }

export type EventType = 'annual_leave' | 'sick_leave' | 'special_leave' | 'public_holiday' | 'work_off_day' | 'defer_off' | 'overtime' | 'training' | 'timing' | 'custom';
export interface ScheduleEvent { id: string; from: string; to: string; type: EventType; status?: DayStatus; label?: string; start_time?: string; end_time?: string; note?: string; }
export type DayOverride = ScheduleEvent;

export interface ShiftAssignment {
  id: number; employee_id: string; employee_name: string;
  designation?: string; department?: string; section?: string; phone?: string;
  shift_type: ShiftType; on_days: number; off_days: number; cycle_start_date: string;
  notes?: string; is_active: boolean; standby_periods?: { from: string; to: string }[];
  shift_label?: string; shift_hours?: string; shift_timing_periods?: ShiftTimingPeriod[];
  day_overrides?: DayOverride[]; created_at?: string;
}

export interface Employee { id: string; name: string; designation?: string; department?: string; section?: string; phone?: string; }

export interface LeaveRecord { id: number; employee_id: string; employee_name: string; leave_type: string; start_date: string; end_date: string; status: string; reason?: string; }

export interface PublicHoliday { date: string; name: string; }

export interface StandbyPeriod { from: string; to: string; }

/** ShiftAssignForm's local form state — mirrors the create/update payload shape. */
export interface FormState {
  employee_id: string; employee_name: string; designation: string; department: string; section: string; phone: string;
  shift_type: ShiftType; on_days: string; off_days: string; cycle_start_date: string; notes: string; is_active: boolean;
  standby_periods: StandbyPeriod[]; shift_label: string; shift_hours: string; shift_timing_periods: ShiftTimingPeriod[];
}

/** ScheduleEventModal's local form state — mirrors a ScheduleEvent's editable fields. */
export interface EventForm { id: string; from: string; to: string; type: EventType; status: DayStatus | ''; label: string; start_time: string; end_time: string; note: string; }
