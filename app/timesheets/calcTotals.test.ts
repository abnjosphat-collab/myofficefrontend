// app/timesheets/calcTotals.test.ts — calcTotals.ts is the original precedent for the
// "extract page-local business logic into a calcX.ts" standard (ENGINEERING_STANDARDS.md
// rule 1), cited by every later extraction — but had never itself had a test. Every real
// payroll bug found across this codebase's history (overtime hours double-counted into
// Actual, night allowance paying a flat 8h instead of real hours, holiday hours
// miscounted) lived in exactly this logic; these tests lock in the fixes already made.
import { describe, it, expect } from 'vitest';
import { apply208, calcEmployeeTotals, DOUBLE_TIME_STATUSES, LEAVE_STATUSES, moduleOt15FormulaAddends, ZERO_HOUR_STATUSES } from './calcTotals';
import type { ApprovedOvertimeRecord } from './types';
import type { TimesheetEntry } from './types';

function entry(over: Partial<TimesheetEntry> = {}): TimesheetEntry {
  return { employee_id: 1, date: '2026-08-10', regular_hours: 8, status: 'work', ...over };
}

describe('apply208 — the 208-hour monthly cap', () => {
  it('passes hours through unchanged at or under the cap', () => {
    expect(apply208(150, 10)).toEqual({ reg: 150, ot15: 10 });
    expect(apply208(208, 0)).toEqual({ reg: 208, ot15: 0 });
  });

  it('caps reg at 208 and moves the excess into ot15, not drops it', () => {
    expect(apply208(220, 5)).toEqual({ reg: 208, ot15: 17 }); // 5 + (220-208)
  });
});

describe('calcEmployeeTotals — filtering', () => {
  it('only sums entries for the requested employee', () => {
    const timesheets = [entry({ employee_id: 1, regular_hours: 8 }), entry({ employee_id: 2, regular_hours: 100 })];
    expect(calcEmployeeTotals('1', timesheets).actual).toBe(8);
  });

  it('matches employee_id across string/number representations', () => {
    const timesheets = [entry({ employee_id: 1, regular_hours: 8 })];
    expect(calcEmployeeTotals(1 as unknown as string, timesheets).actual).toBe(8);
  });
});

describe('calcEmployeeTotals — double-time statuses (holiday/weekend) do not double-count', () => {
  it('moves regular_hours into ot20 instead of leaving it in reg too (the double-counting bug)', () => {
    // A worked-holiday day: 8 regular_hours + 2 overtime_hours, status 'holiday'.
    // The bug this guards against: reg keeps the 8h AND ot20 also gets it, inflating
    // Actual. The fix subtracts regular_hours back out of reg when the status is
    // double-time, so it only ever appears once, in ot20.
    const t = calcEmployeeTotals('1', [entry({ regular_hours: 8, overtime_hours: 2, status: 'holiday' })]);
    expect(t.reg).toBe(0);
    expect(t.ot20).toBe(10); // 8 (regular_hours) + 2 (overtime_hours) + 0 (holiday_overtime_hours)
    expect(t.actual).toBe(0); // reg, post-208-cap
  });

  it('applies the same rule for weekend status', () => {
    const t = calcEmployeeTotals('1', [entry({ regular_hours: 8, status: 'weekend' })]);
    expect(t.reg).toBe(0);
    expect(t.ot20).toBe(8);
  });

  it('non-double-time statuses keep regular_hours in reg and route overtime to ot15/ot20 separately', () => {
    const t = calcEmployeeTotals('1', [entry({ regular_hours: 8, overtime_hours: 3, holiday_overtime_hours: 1, status: 'work' })]);
    expect(t.reg).toBe(8);
    expect(t.ot15).toBe(3);
    expect(t.ot20).toBe(1);
  });
});

describe('calcEmployeeTotals — standby allowance (flat 8h per contiguous run)', () => {
  it('earns 8h once for a single standby day', () => {
    const t = calcEmployeeTotals('1', [entry({ date: '2026-08-10', standby_allowance: true })]);
    expect(t.standbyBonus).toBe(8);
  });

  it('stays flat 8h across a multi-day contiguous run, not 8h per day', () => {
    const timesheets = [
      entry({ date: '2026-08-10', standby_allowance: true }),
      entry({ date: '2026-08-11', standby_allowance: true }),
      entry({ date: '2026-08-12', standby_allowance: true }),
    ];
    expect(calcEmployeeTotals('1', timesheets).standbyBonus).toBe(8);
  });

  it('earns a fresh 8h when a new run starts after a break', () => {
    const timesheets = [
      entry({ date: '2026-08-10', standby_allowance: true }),
      entry({ date: '2026-08-11', standby_allowance: false }),
      entry({ date: '2026-08-12', standby_allowance: true }),
    ];
    expect(calcEmployeeTotals('1', timesheets).standbyBonus).toBe(16);
  });
});

describe('calcEmployeeTotals — night shift allowance (actual hours, not a flat bonus)', () => {
  it('sums the real nightshift_hours on flagged days instead of a flat 8h (the reported bug)', () => {
    const t = calcEmployeeTotals('1', [entry({ nightshift_hours: 5.5, nightshift_allowance: true })]);
    expect(t.nightAllowanceBonus).toBe(5.5);
  });

  it('does not credit nightshift_hours when nightshift_allowance is not set (a callout entry)', () => {
    const t = calcEmployeeTotals('1', [entry({ nightshift_hours: 3, nightshift_allowance: false })]);
    expect(t.nightAllowanceBonus).toBe(0);
    expect(t.night).toBe(3); // still counted in the raw night total, just not the allowance bonus
  });
});

describe('calcEmployeeTotals — actual vs. total', () => {
  it('actual excludes overtime/night/bonuses; total includes everything', () => {
    const t = calcEmployeeTotals('1', [entry({
      regular_hours: 8, overtime_hours: 2, nightshift_hours: 4, nightshift_allowance: true, standby_allowance: true,
    })]);
    expect(t.actual).toBe(8); // reg only, post-cap
    expect(t.total).toBe(8 + 2 + 0 + 0 + 8 + 4); // reg + ot15 + ot20 + night + standbyBonus + nightAllowanceBonus (allowance not double-counted in night)
  });

  it('keeps actual uncapped while reg caps at 208 and excess flows to ot15', () => {
    const timesheets = Array.from({ length: 30 }, (_, i) => entry({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, regular_hours: 8 }));
    const t = calcEmployeeTotals('1', timesheets); // 30 * 8 = 240
    expect(t.actual).toBe(240);
    expect(t.reg).toBe(208);
    expect(t.excess).toBe(32);
    expect(t.ot15).toBe(32);
    expect(t.total).toBe(208 + 32); // excess is in ot15, not also in actual for payable total
  });

  it('at exactly 208 normal hours: reg equals actual, no excess', () => {
    const timesheets = Array.from({ length: 26 }, (_, i) => entry({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, regular_hours: 8 }));
    const t = calcEmployeeTotals('1', timesheets); // 208
    expect(t.actual).toBe(208);
    expect(t.reg).toBe(208);
    expect(t.excess).toBe(0);
    expect(t.ot15).toBe(0);
  });

  it('combines normal excess with module OT at 1.5× without double-counting (230 + 6 example)', () => {
    const timesheets = [
      ...Array.from({ length: 23 }, (_, i) => entry({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, regular_hours: 10 })),
      entry({ date: '2026-09-01', overtime_hours: 6, regular_hours: 0, status: 'work' }),
    ];
    const t = calcEmployeeTotals('1', timesheets);
    expect(t.actual).toBe(230);
    expect(t.reg).toBe(208);
    expect(t.excess).toBe(22);
    expect(t.ot15).toBe(28);
    expect(t.total).toBe(208 + 28);
  });

  it('keeps holiday/weekend hours in ot20 separate from actual and ot15', () => {
    const timesheets = [
      ...Array.from({ length: 23 }, (_, i) => entry({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, regular_hours: 10 })),
      entry({ date: '2026-09-02', status: 'weekend', regular_hours: 8 }),
    ];
    const t = calcEmployeeTotals('1', timesheets);
    expect(t.actual).toBe(230);
    expect(t.ot20).toBe(8);
    expect(t.total).toBe(208 + 22 + 8);
  });
});

describe('calcEmployeeTotals — NEC Reg floor (208 when short of hours, not Absent)', () => {
  const periodDates = Array.from({ length: 5 }, (_, i) => `2026-08-${String(i + 10).padStart(2, '0')}`);

  it('defaults Reg to 208 when Actual is below cap and the employee was not Absent', () => {
    const timesheets = periodDates.map(d => entry({ date: d, regular_hours: 40 }));
    const t = calcEmployeeTotals('1', timesheets, { periodDates, applyRegFloorWithoutAbsent: true });
    expect(t.actual).toBe(200);
    expect(t.reg).toBe(208);
    expect(t.ot15).toBe(0);
  });

  it('still applies Reg floor when Off rest days reduced Actual below 208', () => {
    const timesheets = [
      ...periodDates.slice(0, 4).map(d => entry({ date: d, regular_hours: 40 })),
      entry({ date: periodDates[4], status: 'off', regular_hours: 0 }),
    ];
    const t = calcEmployeeTotals('1', timesheets, { periodDates, applyRegFloorWithoutAbsent: true });
    expect(t.actual).toBe(160);
    expect(t.reg).toBe(208);
  });

  it('uses min(Actual, 208) when an Absent day exists (no floor)', () => {
    const timesheets = [
      ...periodDates.slice(0, 4).map(d => entry({ date: d, regular_hours: 40 })),
      entry({ date: periodDates[4], status: 'absent', regular_hours: 0 }),
    ];
    const t = calcEmployeeTotals('1', timesheets, { periodDates, applyRegFloorWithoutAbsent: true });
    expect(t.actual).toBe(160);
    expect(t.reg).toBe(160);
  });
});

describe('moduleOt15FormulaAddends — Excel OT 1.5× line items', () => {
  const periodDates = ['2026-09-10', '2026-09-11', '2026-09-12'];

  it('lists each approved 1.5× overtime record as its own addend', () => {
    const approved: ApprovedOvertimeRecord[] = [
      { id: 1, employee_id: 'C99', overtime_type: 'regular', date: '2026-09-10', status: 'approved', hours: 2 },
      { id: 2, employee_id: 'C99', overtime_type: 'emergency', date: '2026-09-11', status: 'approved', hours: 3 },
    ];
    const timesheets = [
      entry({ date: '2026-09-10', overtime_hours: 2 }),
      entry({ date: '2026-09-11', overtime_hours: 3 }),
    ];
    expect(moduleOt15FormulaAddends('1', 'C99', timesheets, approved, periodDates)).toEqual([2, 3]);
  });

  it('splits same-day row OT into approved lines plus remainder', () => {
    const approved: ApprovedOvertimeRecord[] = [
      { id: 1, employee_id: 'C99', overtime_type: 'regular', date: '2026-09-10', status: 'approved', hours: 2 },
      { id: 2, employee_id: 'C99', overtime_type: 'project', date: '2026-09-10', status: 'approved', hours: 1 },
    ];
    const timesheets = [entry({ date: '2026-09-10', overtime_hours: 4 })];
    expect(moduleOt15FormulaAddends('1', 'C99', timesheets, approved, periodDates)).toEqual([2, 1, 1]);
  });
});

describe('status classification sets', () => {
  it('DOUBLE_TIME_STATUSES is exactly holiday and weekend', () => {
    expect([...DOUBLE_TIME_STATUSES].sort()).toEqual(['holiday', 'weekend']);
  });
  it('ZERO_HOUR_STATUSES is exactly off and absent', () => {
    expect([...ZERO_HOUR_STATUSES].sort()).toEqual(['absent', 'off']);
  });
  it('holiday_paid is deliberately NOT a leave status — it is auto-credited as ordinary regular hours', () => {
    expect(LEAVE_STATUSES.has('holiday_paid' as never)).toBe(false);
  });
});
