import type { ApprovedOvertimeRecord } from './types';
import { moduleRecordIncluded } from './moduleApproval';

/** A pre-dawn callout alone is not evidence of an 18:00–06:00 roster. */
export function isNightRosterTail(ot: ApprovedOvertimeRecord): boolean {
  if (!moduleRecordIncluded(ot.status)) return false;
  const hour = Number(ot.start_time?.trim().split(':')[0]);
  if (!ot.start_time || !Number.isFinite(hour) || hour >= 6) return false;
  const reason = ot.reason ?? '';
  if (/call[ -]?out|breakdown/i.test(reason) || ot.overtime_type === 'emergency') return false;
  return ot.overtime_type === 'night' || /\bnight[ -]?shift\b|\bnight roster\b/i.test(reason);
}
