// app/overtime/exportBudgetReport.ts — the Overtime Split Budget as an Excel
// workbook shaped exactly like the FY2027 split-budget template: one sheet per
// department (ENGINEERING, MINING, MTS, PROJECTS, SHARED SERVICES), the
// template's eleven columns, bold header row, no fills, no branding, no totals
// row. Withheld NEC averages stay blank (reasons in Comment), never zero.
import { exportFilename } from '@/lib/exportUtils';
import { BUDGET_SHEET_NAMES, type BudgetRow, type BudgetSheet } from './budgetReport';

export const BUDGET_SHEET_COLUMNS = [
  'Code',
  'FirstName',
  'Surname',
  'Occupation',
  'CostCentre',
  'Department',
  'OT @ 1.5 Shift',
  'OT @1.5 Adhoc',
  'OT @ 2.0 Shift',
  'OT @ 2.0 Adhoc',
  'Comment',
] as const;

const FONT = 'Calibri';
const TEMPLATE_WIDTHS = [8.14, 15.71, 19, 35.29, 27.29, 27.29, 12.71, 14.14, 13.43, 15, 18.57];

/**
 * Builds the workbook in memory so tests can inspect it without downloading.
 * `sheets` scopes the output — the download passes only ENGINEERING, since
 * that is the sheet this report fills; the template's other sheets stay
 * available by passing the full list.
 */
export async function buildSplitBudgetWorkbook(rows: BudgetRow[], sheets: BudgetSheet[] = [...BUDGET_SHEET_NAMES]) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.calcProperties.fullCalcOnLoad = true;

  if (rows.some(r => r.sheet === 'OTHER') && !sheets.includes('OTHER')) sheets = [...sheets, 'OTHER'];

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet);
    const members = rows.filter(r => r.sheet === sheet);
    const totalCols = BUDGET_SHEET_COLUMNS.length;

    const hdr = ws.getRow(1);
    hdr.values = [...BUDGET_SHEET_COLUMNS];
    hdr.height = 15;
    hdr.eachCell({ includeEmpty: true }, c => {
      c.font = { name: FONT, bold: true, size: 11 };
      c.fill = { type: 'pattern', pattern: 'none' };
    });

    members.forEach((r, i) => {
      const row = ws.getRow(2 + i);
      row.values = [
        r.employeeId, r.firstName, r.surname, r.occupation, r.costCentre, r.department,
        r.ot15Shift, r.ot15Adhoc, r.ot20Shift, null, r.comment,
      ];
      row.getCell(10).value = null; // OT @ 2.0 Adhoc: no source maps to it — blank, like the template
      row.eachCell({ includeEmpty: true }, c => {
        c.font = { name: FONT, size: 11 };
      });
      row.getCell(1).numFmt = '@';
      if (r.ot15Shift == null) row.getCell(7).value = null;
      else row.getCell(7).numFmt = '0.00';
      row.getCell(8).numFmt = '0.00';
      row.getCell(9).numFmt = '0.00';
    });

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: totalCols } };
    TEMPLATE_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  }

  return wb;
}

/** Builds the workbook and saves it as a .xlsx download (Engineering sheet only). */
export async function downloadSplitBudgetReport(rows: BudgetRow[]): Promise<void> {
  const wb = await buildSplitBudgetWorkbook(rows, ['ENGINEERING']);
  const { saveAs } = await import('file-saver');
  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${exportFilename('overtime-split-budget')}.xlsx`,
  );
}
