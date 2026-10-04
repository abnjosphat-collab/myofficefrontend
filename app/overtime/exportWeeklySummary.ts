// app/overtime/exportWeeklySummary.ts — the weekly summary as a styled Excel workbook: one numbered row per person (planned, unplanned,
// 1.5x, 2.0x and total hours), a grand total, then each person's main reason and every individual entry for the week.
// Hours are written as formatted text ("0.00") on purpose: Excel draws a numeric cell's decimal separator from the opening
// machine's regional settings, so a number could read "0,00" on one machine and "0.00" on another, while text reads the same everywhere.
import { EXPORT_BRAND_ARGB, exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { calcHours, cleanReasonText } from './calcOvertime';
import type { weeklyView } from './overtimeLogic';

type View = ReturnType<typeof weeklyView>;
const fmtDate = (v?: string) => (v ? formatDate(v) : '');

export async function downloadWeeklySummary(view: View, from: string, to: string): Promise<void> {
  const { rows, totals, people } = view;
  const grandTotalPlanned = totals.planned, grandTotalUnplanned = totals.unplanned, grandTotal15 = totals.r15, grandTotal20 = totals.r20, grandTotal = totals.all;
  const employeeMainCause = people;
  const employeeInstances = people;
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook(); wb.creator = 'Ozech MyOffice';
    const ws = wb.addWorksheet('OT Weekly Summary');
    // No per-day breakdown — each employee gets one numbered row: their week's
    // planned/unplanned split, 1.5x total, 2.0x total, and overall total.
    // [No., Mine No., Employee, Planned h, Unplanned h, 1.5x h, 2.0x h, Total h].
    // No separate "Unclassified h" column (removed 2026-08-30, per request) — an
    // unresolved legacy record's hours are folded into Unplanned h here so Planned +
    // Unplanned still sums to Total; see the on-screen grandTotalUnplanned comment
    // above for why Unplanned is the fold-in target, not Planned.
    const totalCols = 8;
    const NAME_COL = 3, TOTAL_COL = 8;
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }];
    const FONT = 'Calibri';

    // A single, softer brand blue across the whole header (the previous version's
    // near-black navy on the fixed/total columns read too dark for a document meant
    // to be shared outward) — one clean tone, white bold text, good contrast without
    // being harsh.
    const HEADER_FILL = EXPORT_BRAND_ARGB;
    const HEADER_BORDER = 'FF9FC4DE';
    const STRIPE_FILL = 'FFF6F9FB';

    ws.mergeCells(1, 1, 1, totalCols);
    const title = ws.getCell(1, 1);
    title.value = `Overtime Weekly Summary — ${fmtDate(from)} to ${fmtDate(to)}`;
    title.font = { name: FONT, bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;
    ws.addRow([]);

    const hdrRow = ws.getRow(3);
    hdrRow.values = ['No.', 'Mine No.', 'Employee', 'Planned h', 'Unplanned h', '1.5x h', '2.0x h', 'Total h'];
    hdrRow.height = 28;
    hdrRow.eachCell({ includeEmpty: true }, (c, col) => {
      const isNameCol = col === NAME_COL;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      c.alignment = { horizontal: isNameCol ? 'left' : 'center', vertical: 'middle', wrapText: !isNameCol };
      c.border = { bottom: { style: 'medium', color: { argb: HEADER_BORDER } } };
    });

    // Hour values are written as formatted TEXT ("0.00"), not native numbers with a
    // numFmt — Excel's decimal separator glyph for numeric cells is always rendered
    // using the OPENING machine's own OS/Excel regional settings, not anything
    // encoded in the file (a `[$-409]0.00` locale-prefixed numFmt was tried here
    // before and still showed "0,00" on comma-locale machines, since that prefix
    // only overrides locale-specific symbols like currency/month names, not the
    // decimal point itself). A plain string is never re-rendered — what's written
    // is exactly what displays, everywhere.
    const fmtHours = (n: number) => n.toFixed(2);

    rows.forEach((row, ei) => {
      const rowVals: (string | number)[] = [ei + 1, row.employee_id || '—', row.employee_name, fmtHours(row.plannedHours), fmtHours(row.unplannedHours + row.unclassifiedHours), fmtHours(row.total15), fmtHours(row.total20), fmtHours(row.total)];
      const dataRow = ws.getRow(4 + ei);
      dataRow.values = rowVals;
      dataRow.height = 17;
      const stripe = ei % 2 !== 0;
      dataRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isNameCol = col === NAME_COL;
        c.font = { name: FONT, size: 10 };
        c.alignment = { horizontal: isNameCol ? 'left' : 'center', vertical: 'middle' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe ? STRIPE_FILL : 'FFFFFFFF' } };
      });
    });

    const totalRow = ws.getRow(4 + rows.length + 1);
    totalRow.values = ['', '', 'Grand Total', fmtHours(grandTotalPlanned), fmtHours(grandTotalUnplanned), fmtHours(grandTotal15), fmtHours(grandTotal20), fmtHours(grandTotal)];
    totalRow.height = 22;
    totalRow.eachCell({ includeEmpty: true }, (c, col) => {
      const isTotalCol = col === TOTAL_COL;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: isTotalCol ? 'FFFFFFFF' : EXPORT_BRAND_ARGB } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotalCol ? EXPORT_BRAND_ARGB : 'FFE4EEF5' } };
      c.alignment = { horizontal: col === NAME_COL ? 'left' : 'center', vertical: 'middle' };
      c.border = { top: { style: 'medium', color: { argb: HEADER_BORDER } } };
    });

    // "Where it's coming from" — the same quick who/why breakdown shown on screen,
    // appended below the grand total so the Monday-morning download carries it too,
    // not just the live view.
    let cursor = 4 + rows.length + 1 + 2;

    // Main Reason — one compact line per person naming their single dominant cause for
    // the period, ahead of the full instance-by-instance detail below. Matches the
    // on-screen "Main Reason" panel; same employeeMainCause data.
    if (employeeMainCause.length > 0) {
      ws.mergeCells(cursor, 1, cursor, totalCols);
      const mrTitleCell = ws.getCell(cursor, 1);
      mrTitleCell.value = 'Main Reason (By Person)';
      mrTitleCell.font = { name: FONT, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      mrTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      mrTitleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(cursor).height = 20;
      cursor++;

      employeeMainCause.forEach((emp, i) => {
        ws.mergeCells(cursor, 2, cursor, totalCols);
        const mrCell = ws.getCell(cursor, 2);
        mrCell.value = emp.mainCause
          ? `${emp.employee_name} — "${emp.mainCause.label}" (${fmtHours(emp.mainCause.hours)}h across ${emp.mainCause.count} ${emp.mainCause.count === 1 ? 'entry' : 'entries'})`
          : `${emp.employee_name} — no reason given for this period's hours`;
        mrCell.font = { name: FONT, size: 9, italic: !emp.mainCause };
        mrCell.alignment = { horizontal: 'left', indent: 2 };
        mrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 !== 0 ? STRIPE_FILL : 'FFFFFFFF' } };
        cursor++;
      });
      cursor++; // blank row before the detailed section
    }

    // Every employee's actual instances listed — date, time, hours, and the reason
    // given — not just a total, matching the on-screen panel above.
    if (employeeInstances.length > 0) {
      ws.mergeCells(cursor, 1, cursor, totalCols);
      const teTitleCell = ws.getCell(cursor, 1);
      teTitleCell.value = 'Weekly Summary';
      teTitleCell.font = { name: FONT, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      teTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      teTitleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(cursor).height = 20;
      cursor++;

      employeeInstances.forEach(emp => {
        ws.mergeCells(cursor, 2, cursor, totalCols);
        const empCell = ws.getCell(cursor, 2);
        empCell.value = `${emp.employee_name}${emp.position ? ' · ' + emp.position : ''} — ${fmtHours(emp.total)}h`;
        empCell.font = { name: FONT, bold: true, size: 10, color: { argb: EXPORT_BRAND_ARGB } };
        empCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4EEF5' } };
        cursor++;

        if (emp.instances.length === 0) {
          ws.mergeCells(cursor, 2, cursor, totalCols);
          const noneCell = ws.getCell(cursor, 2);
          noneCell.value = "No individual instances logged for this week's hours.";
          noneCell.font = { name: FONT, italic: true, size: 9, color: { argb: 'FF8AA0B4' } };
          noneCell.alignment = { horizontal: 'left', indent: 2 };
          cursor++;
        } else {
          emp.instances.forEach((inst, i) => {
            ws.mergeCells(cursor, 2, cursor, totalCols);
            const instCell = ws.getCell(cursor, 2);
            const timeStr = inst.start_time && inst.end_time ? `${inst.start_time}–${inst.end_time}` : 'hours only';
            const hrs = inst.hours ?? calcHours(inst.start_time, inst.end_time);
            instCell.value = `${fmtDate(inst.date)}   ${timeStr} · ${fmtHours(hrs)}h   ${inst.reason ? `"${cleanReasonText(inst.reason)}"` : 'No reason given'}`;
            instCell.font = { name: FONT, size: 9 };
            instCell.alignment = { horizontal: 'left', indent: 2 };
            instCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 !== 0 ? STRIPE_FILL : 'FFFFFFFF' } };
            cursor++;
          });
        }
        cursor++; // blank spacer row between employees
      });
      cursor++; // blank row before the next section
    }

    // "Overtime by Work Description" (fuzzy-grouped similar reasons) pulled for now —
    // see the matching note above the on-screen JSX for this same section.

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 26;
    ws.getColumn(4).width = 11;
    ws.getColumn(5).width = 13;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 10;
    ws.getColumn(8).width = 10;
    ws.getColumn(9).width = 12;

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${exportFilename('OT_Weekly_Summary')}.xlsx`; a.click(); URL.revokeObjectURL(url);

}
