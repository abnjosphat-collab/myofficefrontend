import { describe, it, expect } from 'vitest';
import {
  defaultSummaryRange, monthsInRange, rangeActuals, shiftCapForRange,
} from './summaryReport';
import { getDays, fmtDate } from '../timesheets/timesheetMeta';
import type { TimesheetEntry } from '../timesheets/types';
import type { BudgetEmployee } from './budgetReport';

const emp = (over: Partial<BudgetEmployee> = {}): BudgetEmployee => ({
  dbId: '7', employeeId: 'C1001', firstName: 'A', surname: 'Moyo', occupation: 'Fitter',
  costCentre: 'MECHANICAL', department: 'ENGINEERING', sheet: 'ENGINEERING',
  employmentType: 'NEC', archived: false, ...over,
});

function weekdayEntries(dbId: number, start: Date, end: Date, total: number): TimesheetEntry[] {
  const days = getDays({ start, end }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  const per = total / days.length;
  return days.map(d => ({ employee_id: dbId, date: fmtDate(d), status: 'work', regular_hours: per }));
}

describe('summary range helpers', () => {
  it('counts distinct calendar months in the range', () => {
    expect(monthsInRange('2026-07-01', '2026-09-30')).toBe(3);
    expect(monthsInRange('2026-08-15', '2026-08-15')).toBe(1);
    expect(monthsInRange('2026-07-15', '2026-08-14')).toBe(2);
    expect(monthsInRange('2026-09-30', '2026-07-01')).toBe(3);
  });

  it('pro-rates the 208h monthly cap to the range length', () => {
    expect(shiftCapForRange(30)).toBe(208);
    expect(shiftCapForRange(91)).toBe(631);
    expect(shiftCapForRange(1)).toBe(7);
  });

  it('defaults to the last three full calendar months', () => {
    expect(defaultSummaryRange(new Date(2026, 9, 30))).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(defaultSummaryRange(new Date(2026, 0, 15))).toEqual({ from: '2025-10-01', to: '2025-12-31' });
  });

});

describe('rangeActuals (live NEC timesheets for any period)', () => {
  it('sums actual hours and counts filled working days', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 31);
    const out = rangeActuals([emp()], weekdayEntries(7, start, end, 230), [], [], [], '2026-07-01', '2026-07-31');
    expect(out.get('7')?.actual).toBeCloseTo(230, 1);
    expect(out.get('7')?.filled).toBeGreaterThan(0);
  });

  it('reports zero days when the employee has no entries', () => {
    const out = rangeActuals([emp()], [], [], [], [], '2026-07-01', '2026-07-31');
    expect(out.get('7')).toMatchObject({ actual: 0, filled: 0 });
  });
});
