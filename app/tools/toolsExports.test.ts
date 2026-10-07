import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
const { autoTableMock, pdfCalls } = vi.hoisted(() => ({ autoTableMock: vi.fn(), pdfCalls: [] as string[][] }));
vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => autoTableMock(...args) }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
    private log(name: string, ...args: unknown[]) { pdfCalls.push([name, ...args.map(String)]); }
    setFillColor(...a: unknown[]) { this.log('fill', ...a); } rect() {} setTextColor() {} setFontSize() {} setPage() {} getNumberOfPages() { return 2; }
    setFont(...a: unknown[]) { this.log('font', ...a); } text(...a: unknown[]) { this.log('text', a[0]); } save(name: string) { this.log('save', name); }
  },
}));

import { saveAs } from 'file-saver';
import { EXCEL_HEADER_ROW, exportTable } from './toolsExports';

const table = {
  title: 'Tools and equipment register', subtitle: 'Engineering · 3 items',
  headers: ['Register number', 'Name', 'Status'],
  rows: [['PP-01', 'Torque wrench', 'Ready to use'], ['PP-02', 'Angle grinder', 'Return overdue'], ['PP-03', 'Megger', 'Needs attention']],
};
const savedBlob = async () => {
  const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
  return blob;
};

describe('exportTable', () => {
  it('lays an Excel workbook out with a title band, a frozen header, stripes, coloured status and a filter', async () => {
    vi.mocked(saveAs).mockClear();
    await exportTable('xlsx', table);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await (await savedBlob()).arrayBuffer());
    expect(book.creator).toBe('Dallaglio Portable Tools and Equipment');
    const sheet = book.worksheets[0];
    expect(sheet.getCell(1, 1).value).toBe('Tools and equipment register');
    expect(sheet.getCell(1, 1).font?.name).toBe('Cambria');
    expect(String(sheet.getCell(2, 1).value)).toContain('Engineering · 3 items');
    const header = sheet.getRow(EXCEL_HEADER_ROW);
    expect(header.getCell(1).value).toBe('Register number');
    expect((header.getCell(1).fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FF233B31');
    expect(header.getCell(1).font?.name).toBe('Calibri');
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: EXCEL_HEADER_ROW, showGridLines: false });
    expect(sheet.getCell(EXCEL_HEADER_ROW + 2, 3).font?.color?.argb).toBe('FFA13F47'); // Return overdue
    expect((sheet.getCell(EXCEL_HEADER_ROW + 2, 1).fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FFF4F7F5'); // every second row
    expect(sheet.autoFilter).toBeTruthy();
    expect(sheet.pageSetup.fitToWidth).toBe(1);
  });

  it('draws the PDF with a serif title over a sans table, the same header green and a page count', async () => {
    autoTableMock.mockClear(); pdfCalls.length = 0;
    await exportTable('pdf', table);
    expect(autoTableMock).toHaveBeenCalledOnce();
    const options = autoTableMock.mock.calls[0][1] as { headStyles?: { fillColor?: number[] }; head: string[][]; body: string[][] };
    expect(options.headStyles?.fillColor).toEqual([35, 59, 49]);
    expect(options.head).toEqual([table.headers]);
    expect(options.body).toHaveLength(3);
    expect(pdfCalls).toContainEqual(['font', 'times', 'bold']);
    expect(pdfCalls).toContainEqual(['text', 'Page 2 of 2']);
    expect(pdfCalls).toContainEqual(['save', 'tools-and-equipment-register.pdf']);
  });

  it('writes a Word document with the title, the header row repeated on each page and a page number', async () => {
    vi.mocked(saveAs).mockClear();
    await exportTable('docx', table);
    const blob = await savedBlob();
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const body = await zip.file('word/document.xml')!.async('string');
    expect(body).toContain('Tools and equipment register');
    expect(body).toContain('Cambria');
    expect(body).toContain('w:tblHeader');
    expect(body).toContain('Torque wrench');
    const footer = Object.keys(zip.files).find(name => name.startsWith('word/footer'));
    expect(footer).toBeTruthy();
    expect(await zip.file(footer!)!.async('string')).toContain('PAGE');
  });

  it('turns a long table landscape and still names the file after the title', async () => {
    vi.mocked(saveAs).mockClear();
    const wide = { title: 'Wide', headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], rows: [['1', '2', '3', '4', '5', '6', '7']] };
    await exportTable('xlsx', wide);
    expect(vi.mocked(saveAs).mock.calls[0][1]).toBe('wide.xlsx');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await (await savedBlob()).arrayBuffer());
    expect(book.worksheets[0].pageSetup.orientation).toBe('landscape');
  });
});
