import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GET, bookPath } from './route';

const header = ['Code', 'Name', 'Surname', '13', '14', 'TOTAL HRS', 'T/M Hours', 'O/T 1.5', 'O/T  2.0'];

async function writeBook(dir: string, name: string, sheets: Record<string, (string | number | null)[][]>): Promise<string> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  for (const [sheet, grid] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(sheet);
    grid.forEach(cells => ws.addRow(cells.map(v => v)));
  }
  const file = path.join(dir, name);
  const buf = await wb.xlsx.writeBuffer();
  fs.writeFileSync(file, Buffer.from(buf as ArrayBuffer));
  return file;
}

describe('budget-shift-book route', () => {
  const saved = process.env.BUDGET_SHIFT_BOOK_PATH;
  afterEach(() => {
    if (saved === undefined) delete process.env.BUDGET_SHIFT_BOOK_PATH;
    else process.env.BUDGET_SHIFT_BOOK_PATH = saved;
  });

  it('serves monthly averages from the configured book', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'book-'));
    const file = await writeBook(dir, 'book.xlsx', {
      'NEC June 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 230, 208, 22, 0]],
      'NEC August 2026': [header, ['C1001', 'A', 'Moyo', 12, 12, 224, 208, 16, 0]],
    });
    process.env.BUDGET_SHIFT_BOOK_PATH = file;
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fileName: string; monthsUsed: string[]; averages: { code: string; value: number }[] };
    expect(body.fileName).toBe('book.xlsx');
    expect(body.monthsUsed).toEqual(['2026-06', '2026-08']);
    // (22 + 16) / 2 = 19.
    expect(body.averages).toEqual([{ code: 'C1001', value: 19 }]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('answers 404 when the book is not there', async () => {
    process.env.BUDGET_SHIFT_BOOK_PATH = path.join(os.tmpdir(), 'no-such-book.xlsx');
    const res = await GET();
    expect(res.status).toBe(404);
    expect(String((await res.json() as { error: string }).error)).toContain('Upload it');
  });

  it('defaults to the Music folder book', () => {
    delete process.env.BUDGET_SHIFT_BOOK_PATH;
    expect(bookPath()).toBe('C:\\Users\\Administrator\\Music\\Copy of August 2026 NEC Timesheet.xlsx');
  });
});
