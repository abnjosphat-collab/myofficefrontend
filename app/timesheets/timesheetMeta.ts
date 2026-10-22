// app/timesheets/timesheetMeta.ts — the fixed vocabulary and small helpers of the NEC timesheets: what each day status is called
// and how it is shown, how leave types map onto statuses, the NEC period, a role's normal shift, and the browser keys of
// the roster exceptions. Pure and tested; the rules that carry money (hours, overtime, the 208 cap) stay in calcTotals.
import type { IconMeaning, Tone } from '@/components/ui-system';
import { toLocalISODate } from '@/lib/dates';
import type { Employee, Period, StatusKey } from './types';
import { absenceTone } from '@/lib/status';
import { formatDate } from '@/lib/format';

export interface StatusMeta { label: string; short: string; abbr: string; tone: Tone; icon: IconMeaning }
export const STATUS_META: Record<StatusKey, StatusMeta> = {
  work: { label: 'Work', short: '', abbr: '', tone: 'neutral', icon: 'check' },
  leave: { label: 'Leave', short: 'Leave', abbr: 'Lv', tone: absenceTone('leave'), icon: 'calendar' },
  sick: { label: 'Sick', short: 'Sick', abbr: 'Sick', tone: absenceTone('sick'), icon: 'warning' },
  special_leave: { label: 'Special Leave', short: 'Special', abbr: 'SL', tone: absenceTone('special_leave'), icon: 'calendar' },
  // 'holiday' = worked ON the public holiday (2.0x, "PPH"). The not-worked case is 'holiday_paid'.
  holiday: { label: 'PPH (Worked Holiday)', short: 'PPH', abbr: 'PPH', tone: 'brand', icon: 'calendar' },
  holiday_paid: { label: 'Paid Holiday', short: 'PH', abbr: 'PH', tone: 'warning', icon: 'calendar' },
  training: { label: 'Training', short: 'Train', abbr: 'Trn', tone: absenceTone('training'), icon: 'calendar' },
  off: { label: 'Off', short: 'Off', abbr: 'Off', tone: 'neutral', icon: 'close' },
  absent: { label: 'Absent', short: 'Absent', abbr: 'Abs', tone: absenceTone('absent'), icon: 'warning' },
  weekend: { label: 'Weekend (2.0×)', short: '2.0×', abbr: 'Wkd', tone: 'warning', icon: 'calendar' },
  maternity: { label: 'Maternity', short: 'Mat', abbr: 'Mat', tone: absenceTone('maternity'), icon: 'calendar' },
  study: { label: 'Study Leave', short: 'Study', abbr: 'Study', tone: absenceTone('study'), icon: 'calendar' },
  lieu: { label: 'In Lieu of OT', short: 'Lieu', abbr: 'Lieu', tone: absenceTone('lieu'), icon: 'calendar' },
};
export const STATUS_KEYS = Object.keys(STATUS_META) as StatusKey[];
export const statusMeta = (s: string): StatusMeta => STATUS_META[s as StatusKey] ?? { label: s, short: s, abbr: s, tone: 'neutral', icon: 'info' };

/** The Leaves page's leave type as a timesheet status. 'annual' is the generic 'leave'; 'compassionate' is the Leaves page's special leave. */
export const LEAVE_TYPE_TO_STATUS: Record<string, StatusKey> = { annual: 'leave', sick: 'sick', compassionate: 'special_leave', emergency: 'special_leave', maternity: 'maternity', study: 'study', lieu: 'lieu' };

/** Local dates, never UTC: a local-midnight Date read as UTC rolls back a day for anyone ahead of it. */
export const fmtDate = (d: Date): string => toLocalISODate(d);
export function calcHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
  const s = sh + sm / 60; let e = eh + em / 60;
  if (e < s) e += 24;
  return Math.max(0, e - s);
}
export function getDays({ start, end }: Period): Date[] {
  const days: Date[] = []; const d = new Date(start);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}
export const fmtPeriod = ({ start, end }: Period): string => `${formatDate(start)} — ${formatDate(end)}`;

/** The NEC cycle: the 13th of the previous month to the 12th of this one. */
export const getNECPeriod = (month: Date): Period => { const y = month.getFullYear(), m = month.getMonth(); return { start: new Date(y, m - 1, 13), end: new Date(y, m, 12) }; };

/** Past this day of the month the page opens on the next cycle: the one that has just ended keeps its last days to be finished and signed. */
export const NEXT_PERIOD_AFTER_DAY = 16;
/**
 * The month whose cycle the page opens on, and what "Current period" returns to. Up to the 16th that is this month's cycle (13th of last
 * month to 12th of this one); from the 17th it is next month's (on 17 October: 13 October to 12 November).
 */
export const defaultPeriodMonth = (today: Date = new Date()): Date => new Date(today.getFullYear(), today.getMonth() + (today.getDate() > NEXT_PERIOD_AFTER_DAY ? 1 : 0), 1);

/** Each role's normal shift (10 hours, 8 for lamp room and compressor attendants): one rule, shared with the fill logic. */
export { normalShiftHours } from './fillEntry';
export function timeFromHours(startHHMM: string, hours: number): string {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const total = (sh * 60 + sm + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export const normalShiftEnd = (hours: number): string => timeFromHours('07:00', hours);

/** Keys of the retired per-browser roster exceptions (removed 2026-10-21): read once to clean up, then forgotten. */
export const RETIRED_ROSTER_KEYS = ['ts_nec_extra_ids', 'ts_nec_hidden_ids'] as const;
/** The roster is exactly the register: everyone on NEC employment who has not left. No exceptions, no hand-added people. */
export const necRosterIds = (all: Pick<Employee, 'id' | 'employmentType' | 'archived'>[]): string[] =>
  all.filter(e => e.employmentType === 'NEC' && e.archived !== true).map(e => e.id);
/** Active people with no employment type: on no roster until classified in Personnel. */
export const missingEmploymentType = (all: Pick<Employee, 'id' | 'name' | 'employmentType' | 'archived'>[]): Pick<Employee, 'id' | 'name'>[] =>
  all.filter(e => e.archived !== true && e.employmentType === '').map(e => ({ id: e.id, name: e.name }));
/** Suggest bulk entry on first sight of a mostly-empty period (more than half the working cells unfilled). */
export const shouldShowBulkHint = (filled: number, possible: number): boolean =>
  possible > 0 && (possible - filled) / possible > 0.5;
export const notesKeyFor = (period: Period): string => `ts_notes_nec_${fmtDate(period.start)}`;
