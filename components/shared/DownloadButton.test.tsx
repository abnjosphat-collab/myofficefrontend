// components/shared/DownloadButton.test.tsx — regression test for a real bug found
// 2026-09-03 while trimming the Employees page's export columns: whenever a `title`
// was passed, ExcelJS's `worksheet.columns = [...]` setter (which always writes each
// column's `header` into row 1, unconditionally — a hard ExcelJS convention) clobbered
// the title text already written there, and because that row was merged across every
// column (for the title), the header text collapsed to whichever column ExcelJS wrote
// last, repeated across every cell. The downloaded file's real header row was wrong —
// this wasn't visible from the UI, only from actually opening the generated .xlsx.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelJS from 'exceljs';
import { DownloadButton, type DLColumn } from './DownloadButton';

let savedBlob: Blob | null = null;
vi.mock('file-saver', () => ({ saveAs: (blob: Blob) => { savedBlob = blob; } }));

afterEach(() => { savedBlob = null; cleanup(); });

const columns: DLColumn[] = [
  { key: 'id', label: 'Employee ID' },
  { key: 'name', label: 'Name' },
  { key: 'dept', label: 'Department' },
];
const data = [{ id: 'C1', name: 'Jane Doe', dept: 'Engineering' }];

async function downloadAndParse(props: Partial<Parameters<typeof DownloadButton>[0]> = {}) {
  const user = userEvent.setup();
  render(<DownloadButton data={data} columns={columns} filename="test" formats={['excel']} {...props} />);
  await user.click(screen.getByRole('button', { name: /Download/ }));
  // The click handler's async ExcelJS work needs a tick to resolve before saveAs runs.
  await vi.waitFor(() => expect(savedBlob).not.toBeNull());
  const buf = await savedBlob!.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb.worksheets[0];
}

describe('DownloadButton Excel export', () => {
  it('writes the correct distinct header row with no title (headers at row 1)', async () => {
    const ws = await downloadAndParse();
    const headerRow = ws.getRow(1).values as unknown[];
    expect(headerRow.slice(1)).toEqual(['Employee ID', 'Name', 'Department']);
  });

  it('with a title: the title survives in row 1, and the real headers land correctly one row later — not clobbered into one repeated value', async () => {
    const ws = await downloadAndParse({ title: 'Personnel Registry' });

    const titleRow = ws.getRow(1).values as unknown[];
    expect(titleRow[1]).toBe('Personnel Registry');

    // The bug this guards against: row 2 (blank spacer) or row 3 (real headers)
    // showing "Department" (the last column) repeated three times instead of the
    // three distinct column labels.
    const headerRow = ws.getRow(3).values as unknown[];
    expect(headerRow.slice(1)).toEqual(['Employee ID', 'Name', 'Department']);
  });

  it('with a title and subtitle: headers still land at the correct row, distinct', async () => {
    const ws = await downloadAndParse({ title: 'Personnel Registry', subtitle: '1 employee' });

    expect((ws.getRow(1).values as unknown[])[1]).toBe('Personnel Registry');
    expect((ws.getRow(2).values as unknown[])[1]).toBe('1 employee');
    const headerRow = ws.getRow(4).values as unknown[];
    expect(headerRow.slice(1)).toEqual(['Employee ID', 'Name', 'Department']);
  });

  it('data rows still map to the right columns by key regardless of title', async () => {
    const ws = await downloadAndParse({ title: 'Personnel Registry' });
    const dataRow = ws.getRow(4).values as unknown[];
    expect(dataRow.slice(1)).toEqual(['C1', 'Jane Doe', 'Engineering']);
  });
});
