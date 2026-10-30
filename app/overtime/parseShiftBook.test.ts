import { describe, it, expect } from 'vitest';
import { BUDGET_BOOK_MONTHS, bookShiftAverages, parseShiftBook } from './parseShiftBook';

/** Builds an in-memory monthly book in the layout of the "Copy of August" file. */
async function makeBook(sheets: Record<string, (string | number | null)[][]>): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  for (const [name, grid] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    grid.forEach(cells => ws.addRow(cells.map(v => v)));
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

const header = ['Code', 'Name', 'Surname', '13', '14', 'TOTAL HRS', 'T/M Hours', 'O/T 1.5', 'O/T  2.0'];

describe('parseShiftBook', () => {
  it('reads TOTAL minus TM per employee from the June, July and August sheets', async () => {
    const buf = await makeBook({
      'NEC June 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 230, 208, 22, 0]],
      'NEC July 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 240, 208, 32, 0]],
      'NEC August 2026': [header, ['C1001', 'A', 'Moyo', 10, 10, 200, 208, null, 0]],
    });
    const parsed = await parseShiftBook(buf);
    expect(parsed.monthsUsed).toEqual(['2026-06', '2026-07', '2026-08']);
    // (22 + 32 + 0) / 3 = 18.
    expect(bookShiftAverages(parsed).get('C1001')).toBe(18);
  });

  it('averages over the months present — one month is enough', async () => {
    const buf = await makeBook({
      'Cover': [['whatever']],
      'NEC April 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 300, 208, 92, 0]],
      'NEC August 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 227, 208, 19, 0]],
    });
    const parsed = await parseShiftBook(buf);
    // April is outside the budget window; only August counts.
    expect(parsed.monthsUsed).toEqual(['2026-08']);
    expect(bookShiftAverages(parsed).get('C1001')).toBe(19);
  });

  it('rounds the average to a whole number and never goes below zero', async () => {
    const buf = await makeBook({
      // 59 / 3 = 19.67 → 20.
      'NEC June 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 230, 208, 22, 0]],
      'NEC July 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 229, 208, 21, 0]],
      'NEC August 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 224, 208, 16, 0], ['C1002', 'B', 'Dube', 10, 10, 190, 208, null, 0]],
    });
    const avg = bookShiftAverages(await parseShiftBook(buf));
    expect(avg.get('C1001')).toBe(20);
    // TOTAL below TM is undertime, not negative overtime.
    expect(avg.get('C1002')).toBe(0);
  });

  it('matches people by employee number and skips rows without totals', async () => {
    const buf = await makeBook({
      'NEC June 2026': [header, ['c1001', 'A', 'Moyo', 12, 12, 230, 208, 22, 0], ['C1002', 'B', 'Dube', 12, 12, null, null, null, 0], ['', 'No', 'Code', 12, 12, 240, 208, 32, 0]],
    });
    const avg = bookShiftAverages(await parseShiftBook(buf));
    expect(avg.get('C1001')).toBe(22);
    expect(avg.has('C1002')).toBe(false);
  });
});
