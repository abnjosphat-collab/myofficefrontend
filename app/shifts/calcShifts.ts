// app/shifts/calcShifts.ts — the shift-cycle day-position math behind the shifts page,
// split out of page.tsx per the "extract + test business logic" standard
// (app/timesheets/calcTotals.ts precedent). Previously inline in page.tsx with no test
// coverage at all.
//
// Also fixes a real bug found while extracting: page.tsx reimplemented Zimbabwe public
// holidays locally (its own easterSunday()/zwHolidays()) instead of reusing the already-
// tested lib/zimHolidays.ts. The local version hardcoded Heroes'/Defence Forces Day as
// Aug 11/12 every year — wrong in any year where the 2nd Monday of August isn't the
// 11th, which is most years, since those two holidays are legally defined as "2nd Monday
// of August" + "the day after," not a fixed date. It was also missing Feb 21 (Robert
// Gabriel Mugabe National Youth Day) entirely. lib/zimHolidays.ts computes both
// correctly; this now uses it instead of a second, buggier copy.
import { getZimHolidays } from '@/lib/zimHolidays';
import type { DayStatus, EventType, ScheduleEvent, ShiftAssignment } from './types';

// Only the one field computeDayStatus actually needs — the full label/color/icon set
// stays in page.tsx (presentation, not business logic). TypeScript's Record<EventType, ...>
// forces this to be updated too if a new EventType is ever added, same as EVENT_TYPES
// itself, so the two can't silently drift apart.
export const EVENT_DEFAULT_STATUS: Record<EventType, DayStatus | null> = {
  annual_leave: 'off', sick_leave: 'off', special_leave: 'off', public_holiday: 'off',
  work_off_day: 'on', defer_off: 'on', overtime: 'on',
  training: null, timing: null, custom: null,
};

export function stripTime(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function d2s(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export function findEvent(a: ShiftAssignment, ds: string): ScheduleEvent | undefined {
  return (a.day_overrides || []).find(e => {
    const from = (e as ScheduleEvent).from || (e as unknown as { date?: string }).date || '';
    const to = (e as ScheduleEvent).to || from;
    return ds >= from && ds <= to;
  }) as ScheduleEvent | undefined;
}

// A date's on/off status: an explicit override event wins first (an event's own
// `status`, else its type's default), then standby assignments are always 'standby'
// (or 'on+standby' during a standby period), then the on/off cycle itself — a
// contiguous on_days-then-off_days pattern repeating from cycle_start_date.
export function computeDayStatus(a: ShiftAssignment, date: Date): DayStatus {
  const ds = d2s(date);
  const ev = findEvent(a, ds);
  if (ev) {
    if (ev.status) return ev.status;
    const defaultStatus = EVENT_DEFAULT_STATUS[ev.type];
    if (defaultStatus) return defaultStatus;
  }
  if (a.shift_type === 'standby') return 'standby';
  const { on_days: onD, off_days: offD } = a;
  const cycleLen = onD + offD;
  const diff = Math.round((stripTime(date).getTime() - stripTime(new Date(a.cycle_start_date)).getTime()) / 86400000);
  const isOn = cycleLen <= 0 || (((diff % cycleLen) + cycleLen) % cycleLen) < onD;
  const inStandbyPeriod = (a.standby_periods || []).some(p => ds >= p.from && ds <= p.to);
  if (inStandbyPeriod) return isOn ? 'on+standby' : 'standby';
  return isOn ? 'on' : 'off';
}

export function todayStatus(a: ShiftAssignment): DayStatus { return computeDayStatus(a, new Date()); }

// Both % of the way through the current on/off cycle (0 = just started, near 100 =
// about to flip) — daysUntilNextOn and cycleProgress were identical duplicate
// implementations; kept as two names since call sites read more clearly with the name
// matching what they're displaying, but there's only one calculation now.
export function cycleProgress(a: ShiftAssignment): number {
  if (a.shift_type === 'standby') return 0;
  const cycleLen = a.on_days + a.off_days;
  if (cycleLen <= 0) return 100;
  const diff = Math.round((stripTime(new Date()).getTime() - stripTime(new Date(a.cycle_start_date)).getTime()) / 86400000);
  return Math.round(((((diff % cycleLen) + cycleLen) % cycleLen) / cycleLen) * 100);
}
export const daysUntilNextOn = cycleProgress;

export function buildHolidayMap(days: Date[]): Map<string, string> {
  const map = new Map<string, string>();
  const years = new Set(days.map(d => d.getFullYear()));
  years.forEach(y => getZimHolidays(y).forEach(h => map.set(h.date, h.name)));
  return map;
}
