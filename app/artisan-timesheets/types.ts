import type { DayStatusKey } from './dayStatus';

export interface ArtisanTimesheetDayRow {
  date: string;
  day: string;
  /** Off, leave types, absent, etc. Empty = normal work day. */
  day_status: DayStatusKey;
  normal_hrs: number;
  ot_15: number;
  ot_20: number;
  sb_15: number;
  sb_20: number;
  night_shift: number;
  /** Person is on standby roster this day (from Shift Roster module). */
  on_standby: boolean;
  sign_in_time: string;
  /** PNG data URL */
  sign_in_signature: string;
  sign_out_time: string;
  /** PNG data URL */
  sign_out_signature: string;
  comments: string;
  /** Filled from leave/overtime/holiday/standby — safe to overwrite on refresh. */
  _auto?: boolean;
}

export interface ArtisanTimesheetTotals {
  normal_hrs: number;
  ot_15: number;
  ot_20: number;
  sb_15: number;
  sb_20: number;
  night_shift: number;
}

export interface ArtisanTimesheetRecord {
  id: number;
  employee_id: string;
  employee_db_id?: number | null;
  employee_name: string;
  id_number?: string | null;
  year: number;
  month: number;
  shift_rate?: number | null;
  hourly_rate?: number | null;
  daily_rows: ArtisanTimesheetDayRow[];
  compiled_by?: string | null;
  compiled_by_signature?: string | null;
  approved_electrical_foreman?: string | null;
  approved_electrical_foreman_signature?: string | null;
  approved_mechanical_foreman?: string | null;
  approved_mechanical_foreman_signature?: string | null;
  authorized_by?: string | null;
  authorized_by_signature?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ArtisanTimesheetDraft {
  employee_id: string;
  employee_db_id?: number;
  employee_name: string;
  id_number: string;
  year: number;
  month: number;
  shift_rate: string;
  hourly_rate: string;
  daily_rows: ArtisanTimesheetDayRow[];
  compiled_by: string;
  compiled_by_signature: string;
  approved_electrical_foreman: string;
  approved_electrical_foreman_signature: string;
  approved_mechanical_foreman: string;
  approved_mechanical_foreman_signature: string;
  authorized_by: string;
  authorized_by_signature: string;
}

export interface ArtisanEmployeeOption {
  id: number;
  employee_id: string;
  name: string;
  id_number: string;
  designation: string;
}

export interface EmployeeRegisterOption {
  value: string;
  label: string;
}
