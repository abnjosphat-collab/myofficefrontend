// The registry export takes a title, so a filtered download (NEC only) says what it covers on its sheet and in its heading.
import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { saveAs } from 'file-saver';
import { exportPersonnelRegistryExcel } from './exportPersonnelRegistry';
import type { Employee } from './types';

const person = (n: number, type: 'NEC' | 'SALARIED') => ({ id: n, employee_id: `E${n}`, first_name: `First${n}`, last_name: `Last${n}`, designation: 'Fitter Class 2', section: 'Mechanical', employment_type: type, archived: false }) as unknown as Employee;

async function sheetOf() {
  const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await blob.arrayBuffer());
  return book.worksheets[0];
}

describe('exportPersonnelRegistryExcel', () => {
  it('titles the sheet and its heading with the name it is given, and lists exactly the people passed in', async () => {
    vi.mocked(saveAs).mockClear();
    await exportPersonnelRegistryExcel([person(1, 'NEC'), person(2, 'NEC')], 'NEC_Personnel_Registry', 'NEC Personnel Registry');
    const sheet = await sheetOf();
    expect(sheet.name).toBe('NEC Personnel Registry');
    const text = JSON.stringify(sheet.getSheetValues());
    expect(text).toContain('NEC Personnel Registry');
    expect(text).toContain('First1');
    expect(text).toContain('First2');
  });

  it('keeps the original title when none is given', async () => {
    vi.mocked(saveAs).mockClear();
    await exportPersonnelRegistryExcel([person(3, 'SALARIED')], 'Personnel_Registry');
    expect((await sheetOf()).name).toBe('Personnel Registry');
  });
});
