// app/timesheets/necDayBuckets.ts — one entry's slice of calcEmployeeTotals' per-entry loop, for the
// per-person day cards and quick-view table. This mirrors the loop line for line (double-time days take all
// three hour fields at 2.0×, other days split regular / module-OT / holiday-OT, night allowance from the same
// shift-time rule) so the per-day figures always agree with the period totals. Period-level rules — the 208
// cap and floor, excess over the cap, standby runs — live only in calcEmployeeTotals and are shown in the
// foot from its result, never re-derived here.
import { DOUBLE_TIME_STATUSES, entryForNightAllowanceCalc, rosterNightAllowanceHours } from './calcTotals';
import type { TimesheetEntry } from './types';

export interface NecDayBuckets {
  normal: number;
  ot15Module: number;
  ot20: number;
  nightAllowance: number;
  /** Stored nightshift_hours above the roster allowance (the `night` bucket in HourTotals). */
  nightExcess: number;
  standby: boolean;
}

export function necDayBuckets(
  e: TimesheetEntry,
  opts?: { moduleOt15ForDay?: number; earlyMorningModuleOt?: boolean },
): NecDayBuckets {
  let normal = 0;
  let ot15Module = 0;
  let ot20 = 0;
  if (DOUBLE_TIME_STATUSES.has(e.status)) {
    ot20 = (e.regular_hours || 0) + (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
  } else {
    normal = e.regular_hours || 0;
    ot15Module = e.overtime_hours || 0;
    ot20 = e.holiday_overtime_hours || 0;
  }
  const nh = e.nightshift_hours || 0;
  const forNight = entryForNightAllowanceCalc(e, opts?.moduleOt15ForDay ?? 0);
  const nightAllowance = rosterNightAllowanceHours(forNight, { earlyMorningModuleOt: opts?.earlyMorningModuleOt });
  return { normal, ot15Module, ot20, nightAllowance, nightExcess: nh > nightAllowance ? nh - nightAllowance : 0, standby: !!e.standby_allowance };
}
