import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
const { autoTableMock } = vi.hoisted(() => ({ autoTableMock: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => autoTableMock(...args) }));
vi.mock('jspdf', () => ({ jsPDF: class { setFontSize() {} text() {} save() {} } }));

import { saveAs } from 'file-saver';
import { exportTable } from './toolsExports';

const table = { title: 'Equipment register', headers: ['Register', 'Name'], rows: [['PP-01', 'Torque wrench']] };

describe('exportTable', () => {
  it('brands xlsx exports with the charcoal-green header, not violet', async () => {
    vi.mocked(saveAs).mockClear();
    await exportTable('xlsx', table);
    expect(saveAs).toHaveBeenCalledOnce();
    const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await blob.arrayBuffer());
    expect(book.creator).toBe('Dallaglio Portable Tools and Equipment');
    const header = book.worksheets[0].getRow(1);
    expect((header.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FF233B31');
  });

  it('brands pdf exports with the charcoal-green header, not violet', async () => {
    autoTableMock.mockClear();
    await exportTable('pdf', table);
    expect(autoTableMock).toHaveBeenCalledOnce();
    const options = autoTableMock.mock.calls[0][1] as { headStyles?: { fillColor?: number[] } };
    expect(options.headStyles?.fillColor).toEqual([35, 59, 49]);
  });

  it('produces a docx package', async () => {
    vi.mocked(saveAs).mockClear();
    await exportTable('docx', table);
    expect(saveAs).toHaveBeenCalledOnce();
    const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    expect((await blob.text()).slice(0, 2)).toBe('PK');
  });
});
