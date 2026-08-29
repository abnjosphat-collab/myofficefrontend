// app/timesheets/calcTotals.test.ts — calcTotals.ts is the original precedent for the
// "extract page-local business logic into a calcX.ts" standard (ENGINEERING_STANDARDS.md
// rule 1), cited by every later extraction — but had never itself had a test. Every real
// payroll bug found across this codebase's history (overtime hours double-counted into
// Actual, night allowance paying a flat 8h instead of real hours, holiday hours
// miscounted) lived in exactly this logic; these tests lock in the fixes already made.
import { describe, it, expect } from 'vitest';
import { apply208, calcEmployeeTotals, DOUBLE_TIME_STATUSES, LEAVE_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
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
    expect(t.total).toBe(8 + 2 + 0 + 4 + 8 + 4); // reg + ot15 + ot20 + night + standbyBonus + nightAllowanceBonus
  });

  it('reports excess and moves it into ot15 once reg exceeds 208 across the period', () => {
    const timesheets = Array.from({ length: 30 }, (_, i) => entry({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, regular_hours: 8 }));
    const t = calcEmployeeTotals('1', timesheets); // 30 * 8 = 240
    expect(t.reg).toBe(208);
    expect(t.excess).toBe(32);
    expect(t.ot15).toBe(32);
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
