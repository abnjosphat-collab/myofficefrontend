// app/ppe/budget/budgetDownloads.test.ts — the XLSX totals are real formulas that
// evaluate to exactly what the screen shows.
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildBudgetWorkbook, type BudgetDownloadMeta } from './budgetDownloads';
import { calculateBudget, type BudgetInput, type BudgetSettings } from './budgetCalc';

function input(): BudgetInput {
  const people = [
    { id: 'C1', name: 'Ann Alpha', department: 'Engineering', section: 'Mechanical', title: 'Fitter', active: true },
    { id: 'C2', name: 'Bob Beta', department: 'Engineering', section: 'Electrical', title: 'Electrician', active: true },
  ];
  const settings: BudgetSettings = {
    lines: [
      { key: 'dust_masks', item: 'Dust masks', rule: 'per_working_day', qty_per_person: 1, who: { kind: 'everyone', sections: [], text: '' }, unit_price: 2, buffer_pct: 0 },
      { key: 'card:worksuit', item: 'worksuit', rule: 'matrix', qty_per_person: 1, who: { kind: 'everyone', sections: [], text: '' }, unit_price: 25, buffer_pct: 0 },
    ],
    confirmed: { count: 1, start_month: 3, boilermakers: 0 },
    provisional: { count: 1, start_month: 6, boilermakers: 0 },
    starter_kit: ['worksuit'],
    add_gaps_in_january: false,
    show_provisional: true,
  };
  return {
    people,
    records: [{ employee_id: 'C1', employee_name: 'Ann Alpha', ppe_type: 'worksuit', size: 'L', issue_date: '2026-08-10', status: 'active' }],
    matrix: { worksuit: 6 },
    calendar: {
      year: 2027,
      months: [20, 20, 21, 22, 20, 22, 22, 20, 21, 21, 22, 22].map((working_days, i) => ({ month: i + 1, working_days, weeks: 4, holidays: [] })),
      total_working_days: 253,
      total_weeks: 52,
    },
    settings,
    dataDate: '2026-10-30',
  };
}

/** Evaluate a `SUM(...)` of single cells and single-column ranges over the sheet's own value cells. */
function evalSum(ws: ExcelJS.Worksheet, formula: string): number {
  const m = /^SUM\((.+)\)$/.exec(formula);
  expect(m, formula).not.toBeNull();
  let total = 0;
  for (const arg of m![1].split(',')) {
    const range = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(arg);
    if (range) {
      const [, colA, r1, colB, r2] = range;
      expect(colA).toBe(colB);
      for (let r = Number(r1); r <= Number(r2); r++) {
        const v = ws.getCell(`${colA}${r}`).value;
        expect(typeof v, `${colA}${r}`).toBe('number');
        total += v as number;
      }
    } else {
      const v = ws.getCell(arg).value;
      expect(typeof v, arg).toBe('number');
      total += v as number;
    }
  }
  return total;
}

describe('budget workbook', () => {
  it('summary and monthly-by-line formulas evaluate to the screen totals', async () => {
    const inp = input();
    const result = calculateBudget(inp);
    const meta: BudgetDownloadMeta = { year: 2027, people: 4, useProvisional: true };
    const wb = buildBudgetWorkbook(ExcelJS, result, inp.calendar, inp.settings, meta);
    expect(wb.worksheets.map(w => w.name)).toEqual(['Summary', 'Monthly by line', 'By section', 'Order by size', 'New starters', 'Gaps', 'Assumptions']);

    // Summary TOTAL row formulas cover exactly the 12 month rows.
    const summary = wb.getWorksheet('Summary')!;
    const totalRow = summary.rowCount;
    expect(summary.getCell(`A${totalRow}`).value).toBe('Total');
    const qtyFormula = summary.getCell(`B${totalRow}`).value as ExcelJS.CellFormulaValue;
    const costFormula = summary.getCell(`C${totalRow}`).value as ExcelJS.CellFormulaValue;
    expect(evalSum(summary, qtyFormula.formula)).toBe(result.monthlyQty.reduce((a, b) => a + b, 0));
    expect(evalSum(summary, costFormula.formula)).toBeCloseTo(result.monthlyCost.reduce((a, b) => a + b, 0), 6);

    // Monthly-by-line year totals match each line's year totals.
    const monthly = wb.getWorksheet('Monthly by line')!;
    const headRow = 4;
    monthly.eachRow((row, rowNumber) => {
      if (rowNumber <= headRow) return;
      const item = String(row.getCell(1).value);
      const line = result.lines.find(l => l.item === item)!;
      expect(line, item).toBeDefined();
      const yearQty = row.getCell(26).value as ExcelJS.CellFormulaValue;
      const yearCost = row.getCell(27).value as ExcelJS.CellFormulaValue;
      expect(evalSum(monthly, yearQty.formula)).toBe(line.yearQty);
      expect(evalSum(monthly, yearCost.formula)).toBeCloseTo(line.yearCost, 6);
    });
  });

  it('the base variant downloads without the provisional starters', async () => {
    const inp = input();
    const result = calculateBudget(inp);
    const meta: BudgetDownloadMeta = { year: 2027, people: 3, useProvisional: false };
    const wb = buildBudgetWorkbook(ExcelJS, result, inp.calendar, inp.settings, meta);
    const monthly = wb.getWorksheet('Monthly by line')!;
    monthly.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return;
      const line = result.lines.find(l => l.item === String(row.getCell(1).value))!;
      const yearQty = row.getCell(26).value as ExcelJS.CellFormulaValue;
      expect(evalSum(monthly, yearQty.formula)).toBe(line.yearQtyBase);
    });
  });
});
