import { describe, it, expect } from 'vitest';
import {
  BUDGET_SHEET_COLUMNS, buildSplitBudgetWorkbook,
} from './exportBudgetReport';
import { BUDGET_SHEET_NAMES, budgetTotals, buildSplitBudgetRows, sheetForDepartment, type BudgetEmployee } from './budgetReport';

const emp = (over: Partial<BudgetEmployee> = {}): BudgetEmployee => {
  const base = {
    dbId: '7', employeeId: 'C1001', firstName: 'A', surname: 'Moyo', occupation: 'Fitter',
    costCentre: 'MECHANICAL', department: 'ENGINEERING',
    employmentType: 'NEC', archived: false, ...over,
  } as BudgetEmployee & { department: string };
  return { ...base, sheet: sheetForDepartment(base.department) };
};

const full = (shift: number) => ({ actual: 208 + shift, filled: 22, workingDays: 22, shift });

function sampleRows() {
  const employees = [
    emp(),
    emp({ dbId: '8', employeeId: 'C1002', firstName: 'B', surname: 'Dube', occupation: 'Lasher', costCentre: 'MINE PRODUCTION', department: 'MINING', sheet: 'MINING', employmentType: 'SALARIED' }),
  ];
  return buildSplitBudgetRows(
    employees,
    new Map([['7', full(22)], ['8', full(40)]]),
    new Map([['7', full(32)], ['8', full(40)]]),
    new Map([
      ['C1001', { shift20: { total: 9, count: 3 }, adhoc15: { total: 30, count: 10 } }],
      ['C1002', { shift20: { total: 6, count: 2 }, adhoc15: { total: 12, count: 4 } }],
    ]),
  );
}

describe('split-budget workbook format', () => {
  it('uses the template sheets and the template columns', () => {
    expect([...BUDGET_SHEET_NAMES]).toEqual(['ENGINEERING', 'MINING', 'MTS', 'PROJECTS', 'SHARED SERVICES']);
    expect([...BUDGET_SHEET_COLUMNS]).toEqual([
      'Code', 'FirstName', 'Surname', 'Occupation', 'CostCentre', 'Department',
      'OT @ 1.5 Shift', 'OT @1.5 Adhoc', 'OT @ 2.0 Shift', 'OT @ 2.0 Adhoc', 'Comment',
    ]);
    const rows = sampleRows();
    expect(budgetTotals(rows)).toEqual({ employees: 2, total15Shift: 27, total15Adhoc: 14, total20Shift: 5 });
  });

  it('puts each employee on their department sheet with the sourced averages', async () => {
    const wb = await buildSplitBudgetWorkbook(sampleRows());
    expect(wb.worksheets.map(w => w.name)).toEqual(['ENGINEERING', 'MINING', 'MTS', 'PROJECTS', 'SHARED SERVICES']);
    const eng = wb.getWorksheet('ENGINEERING')!;
    // Header row 1, like the template.
    expect(eng.getRow(1).getCell(1).value).toBe('Code');
    expect(eng.getRow(1).getCell(7).value).toBe('OT @ 1.5 Shift');
    expect(eng.getRow(1).getCell(1).font.bold).toBe(true);
    // A Moyo: 27 | 10 | 3, no comment.
    const engRow = eng.getRow(2);
    expect([1, 2, 3, 4, 5, 6].map(c => engRow.getCell(c).value)).toEqual(['C1001', 'A', 'Moyo', 'Fitter', 'MECHANICAL', 'ENGINEERING']);
    expect([7, 8, 9].map(c => engRow.getCell(c).value)).toEqual([27, 10, 3]);
    expect(engRow.getCell(10).value).toBeNull();
    expect(engRow.getCell(11).value).toBe('');
    const min = wb.getWorksheet('MINING')!;
    // Salaried: blank 1.5 Shift with an explanatory comment, 4 Adhoc and 2 at 2.0.
    const minRow = min.getRow(2);
    expect([1, 2, 3, 4, 5, 6].map(c => minRow.getCell(c).value)).toEqual(['C1002', 'B', 'Dube', 'Lasher', 'MINE PRODUCTION', 'MINING']);
    expect(minRow.getCell(7).value).toBeNull();
    expect([8, 9].map(c => minRow.getCell(c).value)).toEqual([4, 2]);
    expect(minRow.getCell(10).value).toBeNull();
    expect(minRow.getCell(11).value).toBe('Salaried — no NEC shift forecast.');
    expect(min.getRow(2).getCell(9).numFmt).toBe('0.00');
  });

  it('leaves the OT @ 2.0 Adhoc column blank with no totals row, like the template', async () => {
    const wb = await buildSplitBudgetWorkbook(sampleRows());
    const eng = wb.getWorksheet('ENGINEERING')!;
    expect(eng.getRow(2).getCell(10).value).toBeNull();
    // Template has no totals row: data ends the sheet.
    expect(eng.rowCount).toBe(2);
  });

  it('scopes the download to the ENGINEERING sheet only', async () => {
    const wb = await buildSplitBudgetWorkbook(sampleRows(), ['ENGINEERING']);
    expect(wb.worksheets.map(w => w.name)).toEqual(['ENGINEERING']);
    expect(wb.getWorksheet('ENGINEERING')!.rowCount).toBe(2);
  });

  it('freezes the header row and enables filters on every sheet', async () => {
    const wb = await buildSplitBudgetWorkbook(sampleRows());
    for (const ws of wb.worksheets) {
      expect(ws.views).toEqual([{ state: 'frozen', ySplit: 1 }]);
      expect(ws.autoFilter).toBeDefined();
    }
  });

  it('uses no fills or brand colours — plain bold headers like the template', async () => {
    const wb = await buildSplitBudgetWorkbook(sampleRows());
    const headerFills = new Set<unknown>();
    const branded: string[] = [];
    wb.worksheets.forEach(ws => {
      ws.getRow(1).eachCell({ includeEmpty: true }, c => headerFills.add((c.fill as { pattern?: string }).pattern));
      ws.eachRow(row => row.eachCell({ includeEmpty: true }, c => {
        const argb = (c.fill as { fgColor?: { argb?: string } })?.fgColor?.argb;
        if (argb) branded.push(argb);
      }));
    });
    expect(headerFills).toEqual(new Set(['none']));
    expect(branded.filter(h => h.toUpperCase() === 'FF2A4D69')).toEqual([]);
  });

  it('writes a readable .xlsx buffer that re-opens with the same values', async () => {
    const buf = await (await buildSplitBudgetWorkbook(sampleRows())).xlsx.writeBuffer();
    expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(1000);
    const { default: ExcelJS } = await import('exceljs');
    const re = new ExcelJS.Workbook();
    await re.xlsx.load(buf as ArrayBuffer);
    expect(re.getWorksheet('MINING')!.getRow(2).getCell(1).value).toBe('C1002');
    expect(re.getWorksheet('ENGINEERING')!.getRow(2).getCell(7).value).toBe(27);
  });
});
