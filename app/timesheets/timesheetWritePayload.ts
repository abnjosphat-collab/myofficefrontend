import { syncRosterNightFields } from './calcTotals';
import type { TimesheetEntry } from './types';

/** Fields the API accepts — strip grid-only `_auto` and accidental `id` on create. */
export function timesheetWritePayload(
  entry: Omit<TimesheetEntry, 'id'> & { id?: number; _auto?: TimesheetEntry['_auto'] },
): Omit<TimesheetEntry, 'id'> {
  const synced = syncRosterNightFields(entry as TimesheetEntry);
  const {
    id: _id,
    _auto: _autoFlag,
    ...rest
  } = synced as TimesheetEntry;
  return {
    ...rest,
    overtime_periods: rest.overtime_periods ?? [],
    callout_overtime_hours: rest.callout_overtime_hours ?? 0,
    callout_count: rest.callout_count ?? 0,
  };
}

/** Saved row wins for `id`; effective row supplies merged module OT when both exist. */
export function resolveFillTargetEntry(
  empId: string,
  date: string,
  saved: TimesheetEntry[],
  effective: TimesheetEntry[],
): TimesheetEntry | undefined {
  const sid = String(empId);
  const persisted = saved.find(ts => String(ts.employee_id) === sid && ts.date === date);
  const merged = effective.find(ts => String(ts.employee_id) === sid && ts.date === date);
  if (persisted) {
    return { ...merged, ...persisted, id: persisted.id };
  }
  if (merged?.id != null) return merged;
  if (merged && merged._auto) return { ...merged, id: undefined };
  return merged;
}
