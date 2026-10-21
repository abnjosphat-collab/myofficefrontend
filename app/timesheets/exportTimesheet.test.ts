import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { excelActualSumFormula, excelColumnLetter, excelOt15Formula } from '@/lib/exportUtils';
import { makeExporters } from './exportTimesheet';
import { fmtDate, getDays, getNECPeriod } from './timesheetMeta';
import type { Employee, HourTotals, TimesheetEntry } from './types';

// The combined NEC workbook is built for real and read back, so what the file contains is what is asserted.
const period = getNECPeriod(new Date(2026, 10, 1)); // 13 Oct to 12 Nov 2026
const days = getDays(period);
const FIXED_COLS = 3;
const emp = (id: string, employeeId: string, name: string): Employee => ({ id, employeeId, name, position: 'Fitter', department: 'Maintenance', email: '', is_active: true, employmentType: 'NEC' });
const EMPLOYEES = [emp('1', 'C100', 'Ann Alpha'), emp('2', 'C200', 'Bob Beta')];
const TOTALS: HourTotals = { reg: 208, ot15: 12, ot20: 4, night: 0, standbyBonus: 0, nightAllowanceBonus: 0, actual: 220, total: 220 };
const ENTRY: TimesheetEntry = { employee_id: 1, date: fmtDate(days[2]), status: 'work', regular_hours: 10, start_time: '07:00', end_time: '17:00' };

let captured: Blob | null = null;
// The first import of ExcelJS is slow (seconds); do it once up front so no single test pays for it.
beforeAll(async () => { await import('exceljs'); }, 90_000);
beforeEach(() => {
  captured = null;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => { captured = b as Blob; return 'blob:test'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const readBack = async () => {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as ArrayBuffer); r.onerror = () => reject(r.error); r.readAsArrayBuffer(captured as Blob); });
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
  return wb.getWorksheet('Timesheet Summary')!;
};
const exportCombined = async () => {
  await makeExporters({ employees: EMPLOYEES, timesheets: [ENTRY], approvedOvertime: [], getHourTotals: () => TOTALS, period, scope: 'combined', empId: '' }).downloadExcel();
  return readBack();
};
const text = (v: unknown) => (typeof v === 'string' ? v : v && typeof v === 'object' && 'richText' in (v as object) ? (v as { richText: { text: string }[] }).richText.map(t => t.text).join('') : '');

describe('the combined NEC timesheet workbook', () => {
  it('has no explanatory note above the headers (the "Actual h = SUM(...)" line is gone)', async () => {
    const ws = await exportCombined();
    const everyCellText: string[] = [];
    ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, c => everyCellText.push(text(c.value))));
    const joined = everyCellText.join('\n');
    expect(joined).not.toMatch(/double-time pay/);
    expect(joined).not.toMatch(/Actual h =/);
    expect(joined).not.toMatch(/MAX\(0, Actual h/);
    expect(joined).not.toMatch(/incl\. 2\.0× days/);
  });

  it('puts the title in row 1 and the column headers straight under it in row 2', async () => {
    const ws = await exportCombined();
    expect(text(ws.getCell(1, 1).value)).toMatch(/^NEC Timesheet — /);
    const header = ws.getRow(2);
    expect([1, 2, 3].map(c => text(header.getCell(c).value))).toEqual(['Mine No', 'Employee', 'Position']);
    const sumStart = FIXED_COLS + days.length + 1;
    expect([0, 1, 2, 3, 4, 5].map(i => text(header.getCell(sumStart + i).value))).toEqual(['Actual h', 'Reg h', 'OT 1.5×', 'OT 2.0×', 'Standby h', 'Night Allow. h']);
    expect(ws.getRow(2).height).toBe(32); // the header's own height, not the removed note's
  });

  it('starts the employees in row 3 and freezes the panes under the header row', async () => {
    const ws = await exportCombined();
    expect(text(ws.getCell(3, 2).value)).toBe('Ann Alpha');
    expect(text(ws.getCell(4, 2).value)).toBe('Bob Beta');
    expect(ws.views[0]).toMatchObject({ state: 'frozen', xSplit: FIXED_COLS, ySplit: 2 });
  });

  it('keeps every formula pointing at its own row (the Actual sum and the 1.5× overtime)', async () => {
    const ws = await exportCombined();
    const sumStart = FIXED_COLS + days.length + 1;
    const first = excelColumnLetter(FIXED_COLS + 1); const last = excelColumnLetter(FIXED_COLS + days.length); const actualL = excelColumnLetter(sumStart);
    for (const [row, label] of [[3, 'Ann'], [4, 'Bob']] as const) {
      const actual = ws.getCell(row, sumStart).value as { formula: string };
      const ot15 = ws.getCell(row, sumStart + 2).value as { formula: string };
      expect(actual.formula, `${label} Actual`).toBe(excelActualSumFormula(first, last, row));
      expect(ot15.formula, `${label} OT 1.5×`).toBe(excelOt15Formula(actualL, row, [], 208));
    }
  });

  it('puts the totals row two rows under the last employee, summing exactly the employee rows', async () => {
    const ws = await exportCombined();
    const sumStart = FIXED_COLS + days.length + 1; const actualL = excelColumnLetter(sumStart); const ot15L = excelColumnLetter(sumStart + 2);
    expect(text(ws.getCell(6, 2).value)).toBe('TOTALS');
    expect((ws.getCell(6, sumStart).value as { formula: string }).formula).toBe(`SUM(${actualL}3:${actualL}4)`);
    expect((ws.getCell(6, sumStart + 2).value as { formula: string }).formula).toBe(`SUM(${ot15L}3:${ot15L}4)`);
  });

  it('still carries the day values and the signature lines', async () => {
    const ws = await exportCombined();
    expect(ws.getCell(3, FIXED_COLS + 3).value).toBe(10); // Ann's 10 h on the third day
    const all: string[] = []; ws.eachRow(r => r.eachCell(c => all.push(text(c.value))));
    expect(all.some(t => t.startsWith('Compiled by:'))).toBe(true);
    expect(all.some(t => t.startsWith('Approved by:'))).toBe(true);
  });
});
