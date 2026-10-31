import { describe, it, expect } from 'vitest';
import {
  ADHOC_FROM, ADHOC_TO,
  adhocTotals, budgetComment, budgetTotals, buildEngineeringRoster, buildSplitBudgetRows, sheetForDepartment, toBudgetEmployees,
  type BudgetEmployee,
} from './budgetReport';
import type { OTRecord } from './types';

const emp = (over: Partial<BudgetEmployee> = {}): BudgetEmployee => {
  const base = {
    dbId: '7', employeeId: 'C1001', firstName: 'A', surname: 'Moyo', occupation: 'Fitter',
    costCentre: 'MECHANICAL', department: 'ENGINEERING',
    employmentType: 'NEC', archived: false, ...over,
  } as BudgetEmployee & { department: string };
  return { ...base, sheet: sheetForDepartment(base.department) };
};

const buckets = (shift20Total: number, adhoc15Total: number) => ({
  shift20: { total: shift20Total, count: 1 }, adhoc15: { total: adhoc15Total, count: 1 },
});

function otRec(over: Partial<Omit<OTRecord, 'overtime_type'>> & { overtime_type?: string } = {}): OTRecord {
  return {
    id: 1, employee_name: 'A Moyo', employee_id: 'C1001', position: 'Fitter',
    overtime_type: 'regular', date: '2026-08-10', start_time: '17:00', end_time: '20:00',
    status: 'approved', ...over,
  } as OTRecord;
}

describe('budget windows', () => {
  it('covers July to September 2026 for overtime-module hours', () => {
    expect(ADHOC_FROM).toBe('2026-07-01');
    expect(ADHOC_TO).toBe('2026-09-30');
  });
});

describe('engineering sheet roster', () => {
  const template = [
    { code: 'C1001', firstName: 'A', surname: 'Moyo', occupation: 'FITTER', costCentre: 'MECHANICAL' },
    { code: 'C9999', firstName: 'T', surname: 'Ghost', occupation: 'FITTER', costCentre: 'ELECTRICAL' },
  ];

  it('covers exactly the template people, enriched from the register', () => {
    const register = [
      emp(),
      emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', occupation: 'LASHER', costCentre: '', department: 'Mining' }),
    ];
    const roster = buildEngineeringRoster(register, template);
    expect(roster.map(r => r.employeeId)).toEqual(['C1001', 'C9999']);
    // Register details win where matched; template fills the gaps.
    expect(roster[0]).toMatchObject({ firstName: 'A', occupation: 'Fitter', department: 'ENGINEERING', sheet: 'ENGINEERING', employmentType: 'NEC' });
    expect(roster[1]).toMatchObject({ firstName: 'T', surname: 'Ghost', employmentType: '', costCentre: 'ELECTRICAL' });
  });
});

describe('cause comments', () => {
  it('names the top fuzzy-grouped cause with whole hours', () => {
    const employees = [emp()];
    const records = [
      otRec({ id: 1, date: '2026-07-05', reason: 'Winder daily checks', hours: 6 }),
      otRec({ id: 2, date: '2026-08-10', reason: 'winder daily check', hours: 6 }),
      otRec({ id: 3, date: '2026-09-02', reason: 'Rope change', hours: 7 }),
    ];
    const { byKey, causeByKey } = adhocTotals(records, employees);
    const cause = causeByKey.get('C1001');
    expect(cause?.label.toLowerCase()).toContain('winder daily check');
    expect(cause).toMatchObject({ hours: 12, total: 19 });
    const rows = buildSplitBudgetRows(employees, new Map(), byKey, causeByKey);
    expect(rows[0].comment).toBe('Winder daily checks');
  });

  it('combines the cause with rostered shift overtime in plain words, and stays blank with nothing to say', () => {
    expect(budgetComment(27, { label: 'Daily checks', hours: 12, total: 19 })).toBe(
      'Daily checks and shift overtime above 208hrs',
    );
    expect(budgetComment(27, null)).toBe('Shift overtime above 208hrs');
    expect(budgetComment(null, null)).toBe('');
    expect(budgetComment(0, null)).toBe('');
  });

  it('truncates very long reasons', () => {
    const long = 'x'.repeat(100);
    expect(budgetComment(null, { label: long, hours: 1, total: 1 }).length).toBeLessThan(90);
  });
});

describe('book-sourced OT @ 1.5 Shift', () => {
  it('takes the whole-number book average straight onto the row', () => {
    const rows = buildSplitBudgetRows([emp()], new Map([['C1001', 20]]), new Map());
    expect(rows[0].ot15Shift).toBe(20);
    expect(rows[0].status).toBe('OK');
    expect(rows[0].comment).toBe('Shift overtime above 208hrs');
  });

  it('leaves the shift cell blank when the employee has no book data', () => {
    const rows = buildSplitBudgetRows([emp()], new Map(), new Map());
    expect(rows[0].ot15Shift).toBeNull();
    expect(rows[0].status).toBe('Missing');
    expect(rows[0].comment).toBe('');
  });

  it('keeps OT @ 1.5 Shift NEC-only even when the books hold other rows', () => {
    const employees = [
      emp(),
      emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', employmentType: 'SALARIED' }),
      emp({ dbId: '9', employeeId: 'C1003', firstName: 'C', surname: 'Foo', employmentType: '' }),
    ];
    const rows = buildSplitBudgetRows(employees, new Map([['C1001', 20], ['C1002', 8], ['C1003', 8]]), new Map());
    expect(rows.find(r => r.employeeId === 'C1001')).toMatchObject({ ot15Shift: 20, status: 'OK' });
    expect(rows.find(r => r.employeeId === 'C1002')).toMatchObject({ ot15Shift: null, status: 'Non-NEC' });
    expect(rows.find(r => r.employeeId === 'C1003')).toMatchObject({ ot15Shift: null, status: 'Unclassified' });
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
    const rows = buildSplitBudgetRows(employees, new Map(), byKey);
    expect(rows[0].ot20Shift).toBe(2);
    expect(rows[0].ot15Adhoc).toBe(0);
  });

  it('puts all other module hours in OT @ 1.5 Adhoc, rounded whole', () => {
    const records = [
      otRec({ id: 1, overtime_type: 'regular', date: '2026-07-05', reason: 'Maintenance overtime' }),
      otRec({ id: 2, overtime_type: 'emergency', date: '2026-08-10' }),
      otRec({ id: 3, overtime_type: 'project', date: '2026-09-02' }),
      otRec({ id: 4, overtime_type: 'night', date: '2026-09-20', reason: 'Daily checks' }),
      otRec({ id: 5, overtime_type: 'mystery', date: '2026-09-25', hours: 4 }),
    ];
    // 3+3+3+3+4 = 16h over 3 months = 5.33 → 5.
    const { byKey } = adhocTotals(records, employees);
    const rows = buildSplitBudgetRows(employees, new Map(), byKey);
    expect(rows[0].ot15Adhoc).toBe(5);
    expect(rows[0].ot20Shift).toBe(0);
  });

  it('rounds halves up: 19.67 becomes 20', () => {
    const records = [otRec({ id: 1, date: '2026-08-10', hours: 59 })];
    const { byKey } = adhocTotals(records, employees);
    expect(buildSplitBudgetRows(employees, new Map(), byKey)[0].ot15Adhoc).toBe(20);
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
    const rows = buildSplitBudgetRows(employees, new Map(), adhocTotals([], employees).byKey);
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

  it('places one row per employee on their department sheet', () => {
    const employees = [
      emp(),
      emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', occupation: 'Lasher', costCentre: 'MINE PRODUCTION', department: 'Mining' }),
      emp({ dbId: '9', employeeId: 'C1003', firstName: 'C', surname: 'Foo', department: 'Mining' }),
    ];
    const rows = buildSplitBudgetRows(employees, new Map(), new Map());
    expect(rows.map(r => r.sheet)).toEqual(['ENGINEERING', 'MINING', 'MINING']);
  });

  it('keeps roster order within a sheet so pasted columns line up', () => {
    // Register values must never scramble the sheet order: scrambled input
    // sections and codes still come out in roster sequence.
    const employees = [
      emp({ dbId: '11', employeeId: 'C0106', firstName: 'W', surname: 'Chipangura', costCentre: 'ZZZ' }),
      emp({ dbId: '8', employeeId: 'C2216', firstName: 'T', surname: 'Chiwara', costCentre: 'AAA' }),
      emp({ dbId: '9', employeeId: 'C0226', firstName: 'V', surname: 'Zhou', costCentre: 'MMM' }),
    ];
    const rows = buildSplitBudgetRows(employees, new Map(), new Map());
    expect(rows.map(r => r.employeeId)).toEqual(['C0106', 'C2216', 'C0226']);
  });

  it('emits the template ENGINEERING sheet in its exact row order', async () => {
    const { ENGINEERING_TEMPLATE_ROSTER } = await import('./engineeringRoster');
    const roster = buildEngineeringRoster([], ENGINEERING_TEMPLATE_ROSTER);
    const rows = buildSplitBudgetRows(roster, new Map(), new Map());
    expect(rows.map(r => r.employeeId)).toEqual([
      'C0226', 'C0340', 'C0353', 'C0393', 'C0492', 'C0688', 'C0717', 'C1069',
      'C1096', 'C1121', 'C1161', 'C1189', 'C1190', 'C1342', 'C1420', 'C1911',
      'C2038', 'C2216', 'C0106', 'C0322', 'C0351', 'C0355', 'C0357', 'C0379',
      'C0394', 'C0819', 'C0928', 'C0929', 'C0984', 'C1160', 'C1165', 'C1184',
      'C1188', 'C1202', 'C1527', 'C1748', 'C1750', 'C1763', 'C1909', 'C1910',
      'C2217', 'C2218', 'C2290', 'C2291', 'PP058', 'PP288', 'PP291',
    ]);
  });

  it('totals are the sums of the rows’ rounded averages', () => {
    const employees = [emp(), emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', employmentType: 'SALARIED' })];
    const rows = buildSplitBudgetRows(
      employees,
      new Map([['C1001', 27]]),
      new Map([['C1001', buckets(9, 30)], ['C1002', buckets(6, 12)]]),
    );
    expect(budgetTotals(rows)).toEqual({ employees: 2, total15Shift: 27, total15Adhoc: 14, total20Shift: 5 });
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
