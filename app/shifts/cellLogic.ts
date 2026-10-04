// app/shifts/cellLogic.ts — what one cell of the schedule says: for an employee on a date, an event they were given, a
// leave from the leave register, a public holiday, or their cycle's on, standby or off day, with its timing. Pure, so the
// priority between those is tested. Priority: own event, then synced leave, then public holiday, then the cycle.
import type { Tone } from '@/components/ui-system';
import { computeDayStatus, findEvent } from './calcShifts';
import { DAY_STATUS, EVENT_TYPES, TIMING_PRESETS, eventOf, leaveEventType } from './shiftMeta';
import type { DayStatus, LeaveRecord, ScheduleEvent, ShiftAssignment } from './types';

export interface Cell {
  kind: 'event' | 'leave' | 'holiday' | 'on' | 'standby' | 'off';
  abbr: string;
  /** What the cell means, in words, for the tooltip and the accessible name. */
  label: string;
  tone: Tone | null;
  hours: string;
  /** A leave that has not been decided yet. */
  pending: boolean;
}

/** The timing that applies to a date: an event's own, else the timing block covering it, else the assignment's default. */
export function timingFor(a: ShiftAssignment, ds: string): { label: string; abbr: string; hours: string } | null {
  const ev = findEvent(a, ds);
  const block = (a.shift_timing_periods || []).find(p => ds >= p.from && ds <= p.to);
  const key = (ev && (ev.label || ev.start_time) ? ev.label : undefined) ?? block?.label ?? a.shift_label ?? '';
  const preset = key ? TIMING_PRESETS[key] : undefined;
  const start = ev?.start_time ?? block?.start_time;
  const end = ev?.end_time ?? block?.end_time;
  const hours = start && end ? `${start}–${end}` : preset?.hours || (!ev && !block ? a.shift_hours || '' : '');
  if (!preset && !hours) return null;
  return { label: preset?.label ?? 'Custom', abbr: preset?.abbr ?? 'CX', hours };
}

export function findLeave(leaves: LeaveRecord[], a: ShiftAssignment, ds: string): LeaveRecord | undefined {
  const norm = (s: string) => (s || '').toLowerCase().trim();
  return leaves.find(l => (l.employee_id === a.employee_id || norm(l.employee_name) === norm(a.employee_name)) && ds >= l.start_date && ds <= l.end_date && l.status !== 'rejected');
}

export function cellFor(a: ShiftAssignment, date: Date, ds: string, leaves: LeaveRecord[], holidays: Map<string, string>): Cell {
  const ev: ScheduleEvent | undefined = findEvent(a, ds);
  if (ev) {
    const t = eventOf(ev.type);
    const timing = timingFor(a, ds);
    return { kind: 'event', abbr: t.abbr, label: `${t.label}${ev.note ? `: ${ev.note}` : ''}`, tone: t.tone, hours: ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : timing?.hours ?? '', pending: false };
  }
  const leave = findLeave(leaves, a, ds);
  if (leave) {
    const t = EVENT_TYPES[leaveEventType(leave.leave_type)];
    return { kind: 'leave', abbr: t.abbr, label: `${t.label}, ${leave.status}${leave.reason ? `: ${leave.reason}` : ''}`, tone: t.tone, hours: '', pending: leave.status === 'pending' };
  }
  const holiday = holidays.get(ds);
  if (holiday) return { kind: 'holiday', abbr: 'PH', label: `Public holiday: ${holiday}`, tone: 'danger', hours: '', pending: false };
  const status: DayStatus = computeDayStatus(a, date);
  const timing = timingFor(a, ds);
  const meta = DAY_STATUS[status];
  if (status === 'off') return { kind: 'off', abbr: meta.short, label: 'Off duty', tone: null, hours: '', pending: false };
  const standby = status === 'standby' || status === 'on+standby';
  return { kind: standby && status === 'standby' ? 'standby' : 'on', abbr: status === 'on' ? (timing?.abbr ?? meta.short) : meta.short, label: `${meta.label}${timing?.hours ? `, ${timing.hours}` : ''}`, tone: meta.tone, hours: timing?.hours ?? '', pending: false };
}

export interface RosterFilters { search: string; type: string; status: string; sort: string }
export const NO_ROSTER_FILTERS: RosterFilters = { search: '', type: 'all', status: 'all', sort: 'created_at' };
