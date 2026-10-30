import { describe, it, expect } from 'vitest';
import {
  ADHOC_FROM, ADHOC_TO, BUDGET_OCT_PERIOD, BUDGET_SEP_PERIOD, NEC_SHIFT_CAP,
  adhocTotals, budgetTotals, buildSplitBudgetRows, periodActuals, sheetForDepartment, toBudgetEmployees,
  type BudgetEmployee,
} from './budgetReport';
import { getDays, fmtDate } from '../timesheets/timesheetMeta';
import type { TimesheetEntry } from '../timesheets/types';
import type { OTRecord } from './types';

const emp = (over: Partial<BudgetEmployee> = {}): BudgetEmployee => {
  const base = {
    dbId: '7', employeeId: 'C1001', firstName: 'A', surname: 'Moyo', occupation: 'Fitter',
    costCentre: 'MECHANICAL', department: 'ENGINEERING',
    employmentType: 'NEC', archived: false, ...over,
  } as BudgetEmployee & { department: string };
  return { ...base, sheet: sheetForDepartment(base.department) };
};

const full = (actual: number, shift: number, workingDays = 22) => ({ actual, filled: workingDays, workingDays, shift });

function otRec(over: Partial<Omit<OTRecord, 'overtime_type'>> & { overtime_type?: string } = {}): OTRecord {
  return {
    id: 1, employee_name: 'A Moyo', employee_id: 'C1001', position: 'Fitter',
    overtime_type: 'regular', date: '2026-08-10', start_time: '17:00', end_time: '20:00',
    status: 'approved', ...over,
  } as OTRecord;
}

/** One 'work' entry per weekday of the period, totalling `target` normal hours. */
function weekdayEntries(dbId: number, period: { start: Date; end: Date }, target: number): TimesheetEntry[] {
  const days = getDays(period).filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  const per = target / days.length;
  return days.map(d => ({ employee_id: dbId, date: fmtDate(d), status: 'work', regular_hours: per }));
}

describe('budget pay periods', () => {
  it('uses the two NEC pay periods ending 12 Sep and 12 Oct 2026', () => {
    expect(fmtDate(BUDGET_SEP_PERIOD.start)).toBe('2026-08-13');
    expect(fmtDate(BUDGET_SEP_PERIOD.end)).toBe('2026-09-12');
    expect(fmtDate(BUDGET_OCT_PERIOD.start)).toBe('2026-09-13');
    expect(fmtDate(BUDGET_OCT_PERIOD.end)).toBe('2026-10-12');
    expect(NEC_SHIFT_CAP).toBe(208);
  });

  it('covers July to September 2026 for overtime-module hours', () => {
    expect(ADHOC_FROM).toBe('2026-07-01');
    expect(ADHOC_TO).toBe('2026-09-30');
  });
});

describe('periodActuals (OT @ 1.5 Shift, from NEC timesheets only)', () => {
  const employees = [emp()];

  it('applies the 208 cap separately per period: 230h and 240h average to 27h', () => {
    const sep = periodActuals(employees, weekdayEntries(7, BUDGET_SEP_PERIOD, 230), [], [], [], BUDGET_SEP_PERIOD);
    const oct = periodActuals(employees, weekdayEntries(7, BUDGET_OCT_PERIOD, 240), [], [], [], BUDGET_OCT_PERIOD);
    const rows = buildSplitBudgetRows(employees, sep, oct, new Map());
    expect(rows[0].ot15Shift).toBeCloseTo(27, 1);
  });

  it('yields zero shift overtime at or below the cap', () => {
    const sep = periodActuals(employees, weekdayEntries(7, BUDGET_SEP_PERIOD, 208), [], [], [], BUDGET_SEP_PERIOD);
    const oct = periodActuals(employees, weekdayEntries(7, BUDGET_OCT_PERIOD, 150), [], [], [], BUDGET_OCT_PERIOD);
    const rows = buildSplitBudgetRows(employees, sep, oct, new Map());
    expect(rows[0].ot15Shift).toBe(0);
  });

  it('never counts overtime-module hours as shift overtime', () => {
    const moduleOt = [{ id: 9, employee_id: 'C1001', overtime_type: 'night', date: '2026-08-20', start_time: '18:00', end_time: '22:00', status: 'approved' }];
    const sep = periodActuals(employees, weekdayEntries(7, BUDGET_SEP_PERIOD, 230), [], moduleOt, [], BUDGET_SEP_PERIOD);
    expect(sep.get('7')?.actual).toBeCloseTo(230, 1);
  });

  it('withholds the average when a pay period is missing or incomplete', () => {
    const missing = buildSplitBudgetRows(employees, periodActuals(employees, [], [], [], [], BUDGET_SEP_PERIOD), periodActuals(employees, weekdayEntries(7, BUDGET_OCT_PERIOD, 240), [], [], [], BUDGET_OCT_PERIOD), new Map());
    expect(missing[0].ot15Shift).toBeNull();
    expect(missing[0].status).toBe('Missing');
    const few = weekdayEntries(7, BUDGET_SEP_PERIOD, 230).slice(0, 5);
    const partial = buildSplitBudgetRows(employees, periodActuals(employees, few, [], [], [], BUDGET_SEP_PERIOD), periodActuals(employees, weekdayEntries(7, BUDGET_OCT_PERIOD, 240), [], [], [], BUDGET_OCT_PERIOD), new Map());
    expect(partial[0].ot15Shift).toBeNull();
    expect(partial[0].status).toBe('Incomplete');
  });

  it('computes shift overtime only for NEC employees', () => {
    const employees = [emp(), emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', employmentType: 'SALARIED' })];
    const sep = new Map([['7', full(230, 22)], ['8', full(230, 22)]]);
    const oct = new Map([['7', full(240, 32)], ['8', full(240, 32)]]);
    const rows = buildSplitBudgetRows(employees, sep, oct, new Map());
    expect(rows.find(r => r.employeeId === 'C1001')?.ot15Shift).toBeCloseTo(27, 5);
    const salaried = rows.find(r => r.employeeId === 'C1002');
    expect(salaried?.ot15Shift).toBeNull();
    expect(salaried?.status).toBe('Non-NEC');
  });
});

describe('adhoc split (overtime module: 2.0 Shift vs 1.5 Adhoc)', () => {
  const employees = [emp()];

  it('puts weekend and holiday hours in OT @ 2.0 Shift', () => {
    const records = [
      otRec({ id: 1, overtime_type: 'weekend', date: '2026-07-12' }),
      otRec({ id: 2, overtime_type: 'holiday', date: '2026-08-11', reason: 'Worked public holiday' }),
    ];
    const { byKey } = adhocTotals(records, employees);
    const rows = buildSplitBudgetRows(employees, new Map(), new Map(), byKey);
    expect(rows[0].ot20Shift).toBeCloseTo(2, 5);
    expect(rows[0].ot15Adhoc).toBe(0);
  });

  it('puts all other module hours in OT @ 1.5 Adhoc', () => {
    const records = [
      otRec({ id: 1, overtime_type: 'regular', date: '2026-07-05', reason: 'Maintenance overtime' }),
      otRec({ id: 2, overtime_type: 'emergency', date: '2026-08-10' }),
      otRec({ id: 3, overtime_type: 'project', date: '2026-09-02' }),
      otRec({ id: 4, overtime_type: 'night', date: '2026-09-20', reason: 'Daily checks' }),
      otRec({ id: 5, overtime_type: 'mystery', date: '2026-09-25', hours: 4 }),
    ];
    const { byKey } = adhocTotals(records, employees);
    const rows = buildSplitBudgetRows(employees, new Map(), new Map(), byKey);
    // 3+3+3+3+4 = 16h of 1.5 Adhoc over 3 months.
    expect(rows[0].ot15Adhoc).toBe(5.33);
    expect(rows[0].ot20Shift).toBe(0);
  });

  it('averages each bucket over the 3-month window', () => {
    const records = [otRec({ id: 1, overtime_type: 'holiday', date: '2026-08-11', hours: 9 })];
    const { byKey } = adhocTotals(records, employees);
    expect(buildSplitBudgetRows(employees, new Map(), new Map(), byKey)[0].ot20Shift).toBe(3);
  });

  it('excludes rejected and cancelled records, ignores out-of-window dates, dedupes by id', () => {
    const records = [
      otRec({ id: 1, overtime_type: 'weekend', status: 'rejected' }),
      otRec({ id: 2, overtime_type: 'weekend', status: 'cancelled' }),
      otRec({ id: 3, overtime_type: 'weekend', date: '2026-06-30' }),
      otRec({ id: 4, overtime_type: 'weekend', date: '2026-10-01' }),
      otRec({ id: 5, overtime_type: 'weekend', date: '2026-08-10' }),
      { ...otRec({ id: 5, overtime_type: 'weekend', date: '2026-08-10' }) },
    ];
    const { byKey } = adhocTotals(records, employees);
    const entry = byKey.get('C1001');
    expect(entry?.shift20.count).toBe(1);
    expect(entry?.shift20.total).toBeCloseTo(3, 5);
  });

  it('matches people by employee number and flags register orphans', () => {
    const records = [otRec({ id: 1, employee_id: 'C1001', employee_name: 'Wrong Name' }), otRec({ id: 2, employee_id: 'C9999', employee_name: 'A Moyo' })];
    const { byKey, orphanCount } = adhocTotals(records, employees);
    expect(byKey.get('C1001')?.adhoc15.count).toBe(1);
    expect(orphanCount).toBe(1);
  });

  it('reports reliable zeros for employees with no overtime', () => {
    const rows = buildSplitBudgetRows(employees, new Map(), new Map(), adhocTotals([], employees).byKey);
    expect(rows[0].ot15Adhoc).toBe(0);
    expect(rows[0].ot20Shift).toBe(0);
  });
});

describe('department sheets', () => {
  it('maps register departments onto the template sheets', () => {
    expect(sheetForDepartment('Engineering')).toBe('ENGINEERING');
    expect(sheetForDepartment('Mining')).toBe('MINING');
    expect(sheetForDepartment('Mining Technical Services (MTS)')).toBe('MTS');
    expect(sheetForDepartment('Projects')).toBe('PROJECTS');
    expect(sheetForDepartment('Shared Services')).toBe('SHARED SERVICES');
    expect(sheetForDepartment('Stores')).toBe('SHARED SERVICES');
    expect(sheetForDepartment('Human Resources')).toBe('SHARED SERVICES');
    expect(sheetForDepartment('Something New')).toBe('OTHER');
    expect(sheetForDepartment('')).toBe('OTHER');
  });

  it('places one row per employee on their department sheet, sorted by name', () => {
    const employees = [
      emp(),
      emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', occupation: 'Lasher', costCentre: 'MINE PRODUCTION', department: 'Mining' }),
      emp({ dbId: '9', employeeId: 'C1003', firstName: 'C', surname: 'Foo', department: 'Mining' }),
    ];
    const rows = buildSplitBudgetRows(employees, new Map(), new Map(), new Map());
    expect(rows.map(r => r.sheet)).toEqual(['ENGINEERING', 'MINING', 'MINING']);
    expect(rows.filter(r => r.sheet === 'MINING').map(r => r.employeeId)).toEqual(['C1002', 'C1003']);
  });

  it('totals are the sums of the rows’ averages', () => {
    const employees = [emp(), emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', employmentType: 'SALARIED' })];
    const sep = new Map([['7', full(230, 22)], ['8', full(300, 92)]]);
    const oct = new Map([['7', full(240, 32)], ['8', full(300, 92)]]);
    const rows = buildSplitBudgetRows(employees, sep, oct, new Map([
      ['C1001', { shift20: { total: 9, count: 3 }, adhoc15: { total: 30, count: 10 } }],
      ['C1002', { shift20: { total: 0, count: 0 }, adhoc15: { total: 12, count: 4 } }],
    ]));
    expect(budgetTotals(rows)).toEqual({ employees: 2, total15Shift: 27, total15Adhoc: 14, total20Shift: 3 });
  });
});

describe('toBudgetEmployees', () => {
  it('keeps identity, occupation, section and department; drops archived and identifier-less rows', () => {
    const rows = toBudgetEmployees([
      { id: 1, employee_id: 'C1001', first_name: 'A', last_name: 'Moyo', designation: 'Fitter', section: 'Mechanical', department: 'Engineering', employment_type: 'NEC' },
      { id: 2, employee_id: 'C1002', first_name: 'B', last_name: 'Dube', archived: true },
      { id: 3, employee_id: '' },
    ]);
    expect(rows.map(r => r.employeeId)).toEqual(['C1001']);
    expect(rows[0]).toMatchObject({
      dbId: '1', employeeId: 'C1001', firstName: 'A', surname: 'Moyo',
      occupation: 'Fitter', costCentre: 'MECHANICAL', department: 'ENGINEERING', sheet: 'ENGINEERING',
    });
  });

  it('marks unknown employment types for classification instead of guessing', () => {
    expect(toBudgetEmployees([{ id: 5, employee_id: 'C1005', first_name: 'E', last_name: 'Foo' }])[0].employmentType).toBe('');
  });
});
