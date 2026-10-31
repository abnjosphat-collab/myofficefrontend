// The organised-roster Excel matches the Registry (Excel) pairing: no Start
// Date, Calibri throughout, brand header, shaded trade banners, airy rows.
import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
import { saveAs } from 'file-saver';
import { exportRosterExcel } from './exportRoster';
import type { Employee } from './types';

const person = (n: number, section: string, designation: string) => ({
  id: n, employee_id: `E${n}`, first_name: `First${n}`, last_name: `Last${n}`,
  designation, section, phone: '0712000000', employment_type: 'NEC', archived: false,
}) as unknown as Employee;

async function bookOf() {
  const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await blob.arrayBuffer());
  return book;
}

const crew = () => [
  person(1, 'Mechanical', 'Fitter Class 2'),
  person(2, 'Mechanical', 'Electrician'),
  person(3, 'Mining', 'Driver'),
];

describe('exportRosterExcel', () => {
  it('leaves Start Date out of every sheet', async () => {
    vi.mocked(saveAs).mockClear();
    await exportRosterExcel(crew(), 'section_profession');
    const book = await bookOf();
    expect(book.worksheets.length).toBe(2);
    for (const sheet of book.worksheets) {
      expect(JSON.stringify(sheet.getSheetValues())).not.toContain('Start Date');
      expect(sheet.getRow(1).cellCount).toBe(7);
    }
  });

  it('pairs the header like the Registry: brand fill, white bold Calibri 11', async () => {
    vi.mocked(saveAs).mockClear();
    await exportRosterExcel(crew(), 'section');
    const sheet = (await bookOf()).worksheets[0];
    const header = sheet.getRow(1);
    expect(header.height).toBe(24);
    const font = header.getCell(1).font;
    expect(font).toMatchObject({ bold: true, size: 11, name: 'Calibri' });
    expect(header.getCell(1).fill).toMatchObject({ fgColor: { argb: 'FF2A4D69' } });
  });

  it('shades trade banners and sets data rows in Calibri 10', async () => {
    vi.mocked(saveAs).mockClear();
    await exportRosterExcel(crew(), 'section_profession');
    const sheet = (await bookOf()).getWorksheet('Mechanical')!;
    const values = JSON.stringify(sheet.getSheetValues());
    expect(values).toContain('Fitter Class 2 (1)');
    let bannerRow = 0;
    let dataRow = 0;
    sheet.eachRow((row, n) => {
      if (String(row.getCell(1).value) === 'Fitter Class 2 (1)') bannerRow = n;
      if (String(row.getCell(2).value) === 'First1') dataRow = n;
    });
    expect(bannerRow).toBeGreaterThan(0);
    expect(dataRow).toBeGreaterThan(bannerRow);
    const banner = sheet.getRow(bannerRow);
    expect(banner.height).toBe(24);
    expect(banner.getCell(1).font).toMatchObject({ bold: true, size: 11, name: 'Calibri' });
    // ExcelJS drops `italic: false` as a default on write — assert it reads back non-italic.
    expect(banner.getCell(1).font.italic ?? false).toBe(false);
    expect(banner.getCell(1).fill).toMatchObject({ fgColor: { argb: 'FFE8EEF3' } });
    const data = sheet.getRow(dataRow);
    expect(data.height).toBe(21);
    expect(data.getCell(2).font).toMatchObject({ size: 10, name: 'Calibri' });
  });
});
