// app/artisan-timesheets/artisanLogic.ts — the rules behind the artisan timesheet page that need no screen: who counts as an artisan,
// turning a saved record into the draft being edited and back into the payload, starting a month (a saved one, or a blank one filled
// from approved leave, overtime and standby), whether the draft has unsaved changes, and what stops a save. Pure, so each is tested.
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
import { autoPopulateMonthRows } from './autoPopulate';
import { dayStatusLabel, isLeaveDayStatus } from './dayStatus';
import { LEAVE_NORMAL_HRS } from './hourAlloc';
import { dayPart, sameEmployee } from './shiftDay';
import { mergeMonthRows, monthName, parseNumericField } from './calcTotals';
import type { ArtisanEmployeeOption, ArtisanTimesheetDraft, ArtisanTimesheetRecord } from './types';

export interface Staff { id: number; employee_id: string; name: string; id_number: string; designation: string; employment_type: string; active: boolean }
/** Reads one personnel row defensively; a row with no usable name or number is kept (so it can still be listed) but flagged by an empty id. */
export function staffFrom(raw: unknown): Staff {
  const e = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const text = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  return {
    id: Number(e.id) || 0, employee_id: text(e.employee_id).trim(), name: `${text(e.first_name)} ${text(e.last_name)}`.trim() || 'Employee', id_number: text(e.id_number), designation: text(e.designation), employment_type: text(e.employment_type).trim().toUpperCase(),
    active: e.archived !== true && e.is_active !== false,
  };
}
/** Active salaried employees are the artisans, by name. */
export const artisansOf = (staff: Staff[]): ArtisanEmployeeOption[] => staff.filter(s => s.active && s.employment_type === 'SALARIED').map(s => ({ id: s.id, employee_id: s.employee_id, name: s.name, id_number: s.id_number, designation: s.designation })).sort((a, b) => a.name.localeCompare(b.name));
export const artisanKey = (a: Pick<ArtisanEmployeeOption, 'employee_id' | 'id'>): string => a.employee_id || String(a.id);

export function recordToDraft(record: ArtisanTimesheetRecord): ArtisanTimesheetDraft {
  return {
    employee_id: record.employee_id, employee_db_id: record.employee_db_id ?? undefined, employee_name: record.employee_name, id_number: record.id_number || '', year: record.year, month: record.month,
    shift_rate: record.shift_rate != null ? String(record.shift_rate) : '', hourly_rate: record.hourly_rate != null ? String(record.hourly_rate) : '', daily_rows: mergeMonthRows(record.year, record.month, record.daily_rows),
    compiled_by: record.compiled_by || '', compiled_by_signature: record.compiled_by_signature || '', approved_electrical_foreman: record.approved_electrical_foreman || '',
    approved_electrical_foreman_signature: record.approved_electrical_foreman_signature || '', approved_mechanical_foreman: record.approved_mechanical_foreman || '',
    approved_mechanical_foreman_signature: record.approved_mechanical_foreman_signature || '', authorized_by: record.authorized_by || '', authorized_by_signature: record.authorized_by_signature || '',
  };
}

export function draftToPayload(d: ArtisanTimesheetDraft) {
  return {
    employee_id: d.employee_id, employee_db_id: d.employee_db_id, employee_name: d.employee_name, id_number: d.id_number || null, year: d.year, month: d.month,
    shift_rate: parseNumericField(d.shift_rate), hourly_rate: parseNumericField(d.hourly_rate), daily_rows: d.daily_rows,
    compiled_by: d.compiled_by || null, compiled_by_signature: d.compiled_by_signature || null, approved_electrical_foreman: d.approved_electrical_foreman || null,
    approved_electrical_foreman_signature: d.approved_electrical_foreman_signature || null, approved_mechanical_foreman: d.approved_mechanical_foreman || null,
    approved_mechanical_foreman_signature: d.approved_mechanical_foreman_signature || null, authorized_by: d.authorized_by || null, authorized_by_signature: d.authorized_by_signature || null,
  };
}

export interface Sources { leaves: ApprovedLeaveRecord[]; overtime: ApprovedOvertimeRecord[]; standbyAssignments: ShiftAssignment[] }
/** The month to edit: the saved timesheet if there is one, otherwise a blank month filled from leave, overtime, standby and holidays. */
export function openMonth(emp: ArtisanEmployeeOption, year: number, month: number, saved: ArtisanTimesheetRecord[], sources: Sources): { draft: ArtisanTimesheetDraft; recordId: number | null } {
  const key = artisanKey(emp);
  const existing = saved.find(s => sameEmployee(s.employee_id, key) && s.year === year && s.month === month);
  if (existing) return { draft: recordToDraft(existing), recordId: existing.id };
  return {
    recordId: null,
    draft: {
      employee_id: key, employee_db_id: emp.id, employee_name: emp.name, id_number: emp.id_number, year, month, shift_rate: '', hourly_rate: '',
      daily_rows: autoPopulateMonthRows(mergeMonthRows(year, month, []), key, sources),
      compiled_by: '', compiled_by_signature: '', approved_electrical_foreman: '', approved_electrical_foreman_signature: '', approved_mechanical_foreman: '', approved_mechanical_foreman_signature: '', authorized_by: '', authorized_by_signature: '',
    },
  };
}
export const refreshedRows = (d: ArtisanTimesheetDraft, sources: Sources) => autoPopulateMonthRows(d.daily_rows, d.employee_id, sources, { overwrite: true });

/** True when the draft differs from what was last opened or saved. */
export const isDirty = (draft: ArtisanTimesheetDraft | null, baseline: string): boolean => !!draft && JSON.stringify(draft) !== baseline;
export const snapshot = (draft: ArtisanTimesheetDraft | null): string => (draft ? JSON.stringify(draft) : '');

const HOUR_FIELDS = ['normal_hrs', 'ot_15', 'ot_20', 'sb_15', 'sb_20'] as const;

/** What stops a save: a daily figure that cannot be right (negative, or more than 24 hours), and any work
 *  recorded on a leave day — by day status, or by approved leave covering the date even when the row was never
 *  marked (pass the reference sources for that check). Rates are kept from the saved record and no longer edited, so they cannot fail validation. */
export function problems(d: ArtisanTimesheetDraft, sources?: Sources): string[] {
  const out: string[] = [];
  if (!d.employee_id || !d.employee_name) out.push('The employee details are missing.');
  d.daily_rows.forEach(r => {
    HOUR_FIELDS.forEach(f => { const v = r[f]; if (!Number.isFinite(v) || v < 0 || v > 24) out.push(`${r.date}: ${v} is not a possible number of hours for one day.`); });
  });
  const onApprovedLeave = (date: string) =>
    sources?.leaves.some(l => l.status === 'approved' && sameEmployee(l.employee_id, d.employee_id) && date >= dayPart(l.start_date) && date <= dayPart(l.end_date)) ?? false;
  d.daily_rows.forEach(r => {
    const statusLeave = isLeaveDayStatus(r.day_status);
    if (!statusLeave && !onApprovedLeave(r.date)) return;
    const label = statusLeave ? dayStatusLabel(r.day_status) : 'approved leave';
    const worked: string[] = [];
    if (r.ot_15) worked.push(`${r.ot_15}h overtime at 1.5×`);
    if (r.ot_20) worked.push(`${r.ot_20}h overtime at 2.0×`);
    if (r.sb_15) worked.push(`${r.sb_15}h standby at 1.5×`);
    if (r.sb_20) worked.push(`${r.sb_20}h standby at 2.0×`);
    if (r.night_shift) worked.push(`${r.night_shift}h night shift`);
    if (worked.length) out.push(`${r.date} is ${label} but has ${worked.join(', ')} recorded — nobody works on a leave day.`);
    if (r.normal_hrs !== LEAVE_NORMAL_HRS) out.push(`${r.date} is ${label} but credits ${r.normal_hrs} normal hours instead of 8 — use Refresh from the system.`);
    if (r.on_standby) out.push(`${r.date} is ${label} but is marked on standby — nobody works on a leave day.`);
    if (r.sign_in_time || r.sign_out_time || r.sign_in_signature || r.sign_out_signature) out.push(`${r.date} is ${label} but has a sign-in/out record — nobody works on a leave day.`);
  });
  return out;
}
export const periodLabel = (year: number, month: number): string => `${monthName(month)} ${year}`;
/** The month before the reference date — timesheets are compiled for the month just ended. */
export function previousMonth(ref: Date = new Date()): { year: number; month: number } {
  const month = ref.getMonth() + 1;
  return month === 1 ? { year: ref.getFullYear() - 1, month: 12 } : { year: ref.getFullYear(), month: month - 1 };
}
