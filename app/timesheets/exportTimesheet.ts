// app/timesheets/exportTimesheet.ts — the timesheet as an Excel workbook or a PDF: one combined sheet for everyone on the roster (days across,
// the six totals at the end, with live formulas for Actual and the 1.5x overtime) or one sheet per person. Moved here unchanged from the old
// download dialog so the files are the same; the workbook is monochrome with signature lines for Compiled by, both foremen and Approved by.
import { EXPORT_BRAND_RGB, excelActualSumFormula, excelColumnLetter, excelOt15Formula } from '@/lib/exportUtils';
import { DOUBLE_TIME_STATUSES, LEAVE_STATUSES, NEC_REG_CAP, ZERO_HOUR_STATUSES, moduleOt15FormulaAddends } from './calcTotals';
import { STATUS_META, fmtDate, fmtPeriod, getDays } from './timesheetMeta';
import type { ApprovedOvertimeRecord, Employee, HourTotals, Period, RowData, StatusKey, TimesheetEntry } from './types';

/** Monochrome timesheet .xlsx styling; leave days use a soft green fill only. */
const EXCEL_BW = {
  black: 'FF000000',
  white: 'FFFFFFFF',
  headerBg: 'FFEBEBEB',
  stripe: 'FFF5F5F5',
  borderThin: 'FFB0B0B0',
  leaveBg: 'FFDCFCE7',
} as const;

function appendTimesheetExcelSignatures(
  ws: import('exceljs').Worksheet,
  mergeThroughCol: number,
  font = 'Calibri',
) {
  const DOTS = '........................................................';
  const addSigLine = (label: string) => {
    ws.addRow([]);
    const row = ws.addRow([`${label} ${DOTS}`]);
    ws.mergeCells(row.number, 1, row.number, mergeThroughCol);
    const cell = row.getCell(1);
    cell.font = { name: font, size: 11, color: { argb: EXCEL_BW.black } };
    cell.alignment = { vertical: 'bottom' };
  };
  ws.addRow([]);
  ws.addRow([]);
  addSigLine('Compiled by:');
  addSigLine('Approved by Electrical Foreman:');
  addSigLine('Approved by Mechanical Foreman:');
  addSigLine('Approved by:');
}


export interface ExportArgs {
  employees: Employee[]; timesheets: TimesheetEntry[]; approvedOvertime: ApprovedOvertimeRecord[]; getHourTotals: (empId: string) => HourTotals;
  period: Period; periodType: string; scope: 'combined' | 'individual'; empId: string;
}

/** The two downloads for one roster, period and scope. */
export function makeExporters({ employees, timesheets, approvedOvertime, getHourTotals, period, periodType, scope, empId }: ExportArgs) {
  const days = getDays(period);
  const tabLabel = periodType === 'nec' ? 'NEC' : 'Salaried';

  const getEntry = (eid: string, d: Date) => timesheets.find(ts => String(ts.employee_id) === String(eid) && ts.date === fmtDate(d));
  const periodDateStrs = days.map(d => fmtDate(d));

  /** Leave days credit 8 normal hours — Excel shows hours, not "Leave" / abbreviations. */
  const LEAVE_EXPORT_HOURS = 8;
  const excelLeaveHours = (e: TimesheetEntry) => (e.regular_hours > 0 ? e.regular_hours : LEAVE_EXPORT_HOURS);

  const excelDayCell = (e: TimesheetEntry | undefined, d: Date): string | number => {
    if (!e) return d.getDay() === 0 || d.getDay() === 6 ? '·' : '';
    if (ZERO_HOUR_STATUSES.has(e.status as StatusKey)) return statusAbbr(e.status);
    if (LEAVE_STATUSES.has(e.status as StatusKey)) return excelLeaveHours(e);
    if (DOUBLE_TIME_STATUSES.has(e.status as StatusKey)) {
      return (e.regular_hours || 0) + (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
    }
    return e.regular_hours || 0;
  };

  const excelStatusLabel = (e: TimesheetEntry | undefined) => {
    if (!e) return '—';
    if (LEAVE_STATUSES.has(e.status)) return `${excelLeaveHours(e)} hrs`;
    return STATUS_META[e.status as StatusKey]?.label || e.status;
  };

  const buildRows = (emp: Employee): RowData[] => days.map(day => {
    const e = getEntry(emp.id, day);
    return { day: day.toLocaleDateString('en-GB', { weekday: 'short' }), date: fmtDate(day), status: excelStatusLabel(e), start: e?.start_time || '—', end: e?.end_time || '—', reg: e?.regular_hours?.toFixed(2) || '0.00', ot15: e?.overtime_hours?.toFixed(2) || '0.00', ot20: e?.holiday_overtime_hours?.toFixed(2) || '0.00', night: e?.nightshift_hours?.toFixed(2) || '0.00', notes: e?.notes || '' };
  });

  const statusAbbr = (s: string) => ({ work: '', leave: 'Lv', sick: 'Sick', special_leave: 'SL', holiday: 'PPH', holiday_paid: 'PH', training: 'Trn', off: 'Off', absent: 'Abs' }[s] ?? s);
  const dayCell = (e: TimesheetEntry | undefined, d: Date): string | number => excelDayCell(e, d);

  const downloadExcel = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ozech MyOffice';
    wb.calcProperties.fullCalcOnLoad = true;
    const targets = scope === 'combined' ? employees : employees.filter(e => String(e.id) === String(empId));

    if (scope === 'combined') {
      const ws = wb.addWorksheet('Timesheet Summary');
      const FIXED_COLS = 3;
      const SUM_COLS = 6;
      const sumHdr = ['Actual h', 'Reg h', 'OT 1.5×', 'OT 2.0×', 'Standby h', 'Night Allow. h'] as const;
      const totalCols = FIXED_COLS + days.length + SUM_COLS;
      ws.views = [{ state: 'frozen', xSplit: FIXED_COLS, ySplit: 3 }];

      const FONT = 'Calibri';
      const thinBorder = {
        top: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
        bottom: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
        left: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
        right: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
      };

      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `${tabLabel} Timesheet — ${fmtPeriod(period)}`;
      titleCell.font = { name: FONT, bold: true, size: 14, color: { argb: EXCEL_BW.black } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 24;
      ws.mergeCells(2, 1, 2, totalCols);
      const legendCell = ws.getCell(2, 1);
      legendCell.value = `Actual h = SUM(all day columns, incl. 2.0× days). Use OT 2.0× for double-time pay. OT 1.5× = MAX(0, Actual h − ${NEC_REG_CAP}) + …`;
      legendCell.font = { name: FONT, size: 9, italic: true, color: { argb: EXCEL_BW.black } };
      legendCell.alignment = { wrapText: true, vertical: 'middle' };
      ws.getRow(2).height = 28;

      const hdrRow = ws.getRow(3);
      hdrRow.values = ['Mine No', 'Employee', 'Position', ...days.map(d => `${d.getDate()}\n${d.toLocaleDateString('en-GB', { weekday: 'short' })}`), ...sumHdr];
      hdrRow.height = 32;
      hdrRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isFixedCol = col <= FIXED_COLS;
        c.font = { name: FONT, bold: true, size: 8, color: { argb: EXCEL_BW.black } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_BW.headerBg } };
        c.alignment = { horizontal: isFixedCol ? 'left' : 'center', vertical: 'middle', wrapText: !isFixedCol };
        c.border = { ...thinBorder, bottom: { style: 'medium', color: { argb: EXCEL_BW.black } } };
      });
      const sumStartCol = FIXED_COLS + days.length + 1;
      const firstDayColL = excelColumnLetter(FIXED_COLS + 1);
      const lastDayColL = excelColumnLetter(FIXED_COLS + days.length);
      hdrRow.getCell(sumStartCol).note = `Formula: =SUM(${firstDayColL}:${lastDayColL}) — every period day column, including 2.0× days.`;
      hdrRow.getCell(sumStartCol + 2).note = `Formula: =MAX(0, Actual h − ${NEC_REG_CAP}) + one +term per 1.5× OT entry. Extend with +hours in the formula bar.`;

      targets.forEach((emp, ei) => {
        const totals = getHourTotals(emp.id);
        const empIdDisplay = emp.employeeId || '';
        const rowVals: (string | number)[] = [empIdDisplay || '—', emp.name, emp.position || ''];
        days.forEach(day => rowVals.push(dayCell(getEntry(emp.id, day), day)));
        const ot15Addends = moduleOt15FormulaAddends(emp.id, emp.employeeId || '', timesheets, approvedOvertime, periodDateStrs);
        rowVals.push(totals.actual, totals.reg, totals.ot15, totals.ot20, totals.standbyBonus, totals.nightAllowanceBonus);

        const dataRow = ws.getRow(4 + ei);
        dataRow.values = rowVals;
        const actualCol = FIXED_COLS + days.length + 1;
        const ot15Col = actualCol + 2;
        const actualL = excelColumnLetter(actualCol);
        const rowNum = dataRow.number;
        const dayHoursSum = days.reduce((s, day) => {
          const v = dayCell(getEntry(emp.id, day), day);
          return s + (typeof v === 'number' ? v : 0);
        }, 0);
        const actualCell = dataRow.getCell(actualCol);
        actualCell.value = {
          formula: excelActualSumFormula(firstDayColL, lastDayColL, rowNum),
          result: dayHoursSum,
        };
        const empIdCell = dataRow.getCell(1);
        empIdCell.value = empIdDisplay || '—';
        empIdCell.numFmt = '@';
        dataRow.height = 15;
        const stripe = ei % 2 !== 0;

        const rowBg = stripe ? EXCEL_BW.stripe : EXCEL_BW.white;
        dataRow.eachCell({ includeEmpty: true }, (c, col) => {
          c.font = { name: FONT, size: 8, color: { argb: EXCEL_BW.black } };
          c.alignment = { horizontal: col <= FIXED_COLS ? 'left' : 'center', vertical: 'middle' };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          c.border = thinBorder;
        });

        days.forEach((day, di) => {
          const e = getEntry(emp.id, day);
          const cell = dataRow.getCell(FIXED_COLS + 1 + di);
          const isWknd = day.getDay() === 0 || day.getDay() === 6;
          if (e && LEAVE_STATUSES.has(e.status as StatusKey)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_BW.leaveBg } };
          } else if (e && DOUBLE_TIME_STATUSES.has(e.status as StatusKey)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F0E6' } };
            cell.font = { name: FONT, size: 8, bold: true, color: { argb: EXCEL_BW.black } };
          } else if (ZERO_HOUR_STATUSES.has(e?.status as StatusKey)) {
            cell.font = { name: FONT, size: 7, italic: true, color: { argb: EXCEL_BW.black } };
          } else if (isWknd && !e) {
            cell.font = { name: FONT, size: 8, italic: true, color: { argb: EXCEL_BW.borderThin } };
          }
        });

        [0, 1, 2, 3, 4, 5].forEach(si => {
          const c = dataRow.getCell(FIXED_COLS + 1 + days.length + si);
          c.font = { name: FONT, size: 8, bold: si === 0, color: { argb: EXCEL_BW.black } };
          if (si !== 2) c.numFmt = '0.00';
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        const ot15Cell = dataRow.getCell(ot15Col);
        ot15Cell.value = {
          formula: excelOt15Formula(actualL, rowNum, ot15Addends, NEC_REG_CAP),
          result: totals.ot15,
        };
        ot15Cell.numFmt = '0.00';
      });

      const firstDataRow = 4;
      const lastDataRow = 4 + targets.length - 1;
      const actualCol = FIXED_COLS + days.length + 1;
      const ot15Col = actualCol + 2;
      const ot15L = excelColumnLetter(ot15Col);
      const actualL = excelColumnLetter(actualCol);

      const gtRow = ws.getRow(4 + targets.length + 1);
      gtRow.values = ['', 'TOTALS', `${targets.length} employees`, ...days.map(() => ''),
        null,
        targets.reduce((s, e) => s + getHourTotals(e.id).reg, 0),
        targets.reduce((s, e) => s + getHourTotals(e.id).ot15, 0),
        targets.reduce((s, e) => s + getHourTotals(e.id).ot20, 0),
        targets.reduce((s, e) => s + getHourTotals(e.id).standbyBonus, 0),
        targets.reduce((s, e) => s + getHourTotals(e.id).nightAllowanceBonus, 0)];
      gtRow.height = 20;
      gtRow.eachCell({ includeEmpty: true }, (c, col) => {
        c.font = { name: FONT, bold: true, size: 8, color: { argb: EXCEL_BW.black } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_BW.headerBg } };
        c.alignment = { horizontal: col <= FIXED_COLS ? 'left' : 'center', vertical: 'middle' };
        if (col > FIXED_COLS + days.length && col !== ot15Col) c.numFmt = '0.00';
        c.border = { ...thinBorder, top: { style: 'medium', color: { argb: EXCEL_BW.black } } };
      });
      const gtActual = gtRow.getCell(actualCol);
      gtActual.value = {
        formula: `SUM(${actualL}${firstDataRow}:${actualL}${lastDataRow})`,
        result: targets.reduce((s, e) => s + days.reduce((ds, day) => {
          const v = dayCell(getEntry(e.id, day), day);
          return ds + (typeof v === 'number' ? v : 0);
        }, 0), 0),
      };
      gtActual.numFmt = '0.00';
      const gtOt15 = gtRow.getCell(ot15Col);
      gtOt15.value = {
        formula: `SUM(${ot15L}${firstDataRow}:${ot15L}${lastDataRow})`,
        result: targets.reduce((s, e) => s + getHourTotals(e.id).ot15, 0),
      };
      gtOt15.numFmt = '0.00';

      appendTimesheetExcelSignatures(ws, totalCols, FONT);

      ws.getColumn(1).width = 11; ws.getColumn(2).width = 24; ws.getColumn(3).width = 16;
      for (let i = 0; i < days.length; i++) ws.getColumn(FIXED_COLS + 1 + i).width = 5.5;
      [10, 10, 11, 10, 11, 12].forEach((w, i) => { ws.getColumn(FIXED_COLS + 1 + days.length + i).width = w; });

    } else {
      targets.forEach(emp => {
        const ws = wb.addWorksheet(emp.name.slice(0, 31));
        const totals = getHourTotals(emp.id);
        const FONT = 'Calibri';
        const thinBorder = {
          top: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
          bottom: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
          left: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
          right: { style: 'thin' as const, color: { argb: EXCEL_BW.borderThin } },
        };
        ws.mergeCells('A1:L1'); ws.getCell('A1').value = `${tabLabel} Timesheet`;
        ws.getCell('A1').font = { name: FONT, bold: true, size: 14, color: { argb: EXCEL_BW.black } };
        ws.mergeCells('A2:L2'); ws.getCell('A2').value = `${emp.name} | ${fmtPeriod(period)}`;
        ws.getCell('A2').font = { name: FONT, bold: true, size: 11, color: { argb: EXCEL_BW.black } };
        ws.addRow([]);
        const hdr = ws.addRow(['Day', 'Date', 'Status', 'Start', 'End', 'Regular', 'OT 1.5×', 'OT 2.0×', 'Night', 'Standby', 'Actual', 'Notes']);
        hdr.eachCell(c => {
          c.font = { name: FONT, bold: true, color: { argb: EXCEL_BW.black } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_BW.headerBg } };
          c.alignment = { horizontal: 'center' };
          c.border = { ...thinBorder, bottom: { style: 'medium', color: { argb: EXCEL_BW.black } } };
        });
        buildRows(emp).forEach((row, i) => {
          const r = ws.addRow([row.day, row.date, row.status, row.start, row.end, +row.reg, +row.ot15, +row.ot20, +row.night, '', '', row.notes]);
          const e = getEntry(emp.id, days[i]);
          const isLeave = e && LEAVE_STATUSES.has(e.status as StatusKey);
          const bg = isLeave ? EXCEL_BW.leaveBg : (i % 2 === 1 ? EXCEL_BW.stripe : EXCEL_BW.white);
          r.eachCell(c => {
            c.font = { name: FONT, size: 9, color: { argb: EXCEL_BW.black } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            c.border = thinBorder;
          });
        });
        ws.addRow([]);
        const bonusNote = totals.nightAllowanceBonus > 0 ? ` (incl. ${totals.nightAllowanceBonus}h night allowance)` : '';
        const tr = ws.addRow(['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), totals.standbyBonus.toFixed(2), totals.actual.toFixed(2), `Grand: ${totals.total.toFixed(2)}h${bonusNote}`]);
        tr.eachCell(c => {
          c.font = { name: FONT, bold: true, color: { argb: EXCEL_BW.black } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_BW.headerBg } };
          c.border = { top: { style: 'medium', color: { argb: EXCEL_BW.black } } };
        });
        appendTimesheetExcelSignatures(ws, 12, FONT);
        ws.columns = [{ width: 6 }, { width: 13 }, { width: 15 }, { width: 8 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 35 }];
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `timesheet-${periodType}-${fmtDate(period.start)}.xlsx`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const targets = scope === 'combined' ? employees : employees.filter(e => String(e.id) === String(empId));
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const BRAND = EXPORT_BRAND_RGB;

    if (scope === 'combined') {
      doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 16, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11);
      doc.text(`${tabLabel} Timesheet — ${fmtPeriod(period)}`, 10, 10);
      doc.setFontSize(8); doc.text(`${targets.length} employees · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, 10, 14);

      const dayW = Math.min(5.5, (277 - 35 - 20 - 66) / days.length);
      const colStyles: Record<number, { cellWidth: number; halign?: 'center' | 'left' }> = {
        0: { cellWidth: 18, halign: 'left' },
        1: { cellWidth: 32, halign: 'left' },
        2: { cellWidth: 20, halign: 'left' },
      };
      days.forEach((_, i) => { colStyles[3 + i] = { cellWidth: dayW, halign: 'center' }; });
      [0, 1, 2, 3, 4, 5].forEach(si => { colStyles[3 + days.length + si] = { cellWidth: 11, halign: 'center' }; });

      const head = [['Mine No', 'Employee', 'Position', ...days.map(d => `${d.getDate()}`), 'Actual', 'Reg', 'OT\n1.5×', 'OT\n2.0×', 'Standby', 'Night\nAllow.']];
      const body = targets.map(emp => {
        const totals = getHourTotals(emp.id);
        return [emp.employeeId || '—', emp.name, emp.position || '', ...days.map(day => { const v = dayCell(getEntry(emp.id, day), day); return v === 0 ? '' : String(v); }), totals.actual.toFixed(1), totals.reg.toFixed(1), totals.ot15.toFixed(1), totals.ot20.toFixed(1), totals.standbyBonus.toFixed(1), totals.nightAllowanceBonus.toFixed(1)];
      });
      body.push(['', 'TOTALS', `${targets.length} emp`, ...days.map(() => ''),
        targets.reduce((s, e) => s + getHourTotals(e.id).actual, 0).toFixed(1), targets.reduce((s, e) => s + getHourTotals(e.id).reg, 0).toFixed(1),
        targets.reduce((s, e) => s + getHourTotals(e.id).ot15, 0).toFixed(1), targets.reduce((s, e) => s + getHourTotals(e.id).ot20, 0).toFixed(1),
        targets.reduce((s, e) => s + getHourTotals(e.id).standbyBonus, 0).toFixed(1), targets.reduce((s, e) => s + getHourTotals(e.id).nightAllowanceBonus, 0).toFixed(1)]);

      autoTable(doc, {
        startY: 20, head, body,
        styles: { fontSize: 6, cellPadding: 1, overflow: 'ellipsize' },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: colStyles,
        didParseCell: d => {
          if (d.section === 'body' && d.row.index === targets.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [208, 232, 245]; }
          const col = d.column.index;
          if (col >= 3 && col < 3 + days.length) {
            const day = days[col - 3];
            if (day && (day.getDay() === 0 || day.getDay() === 6) && d.section === 'body' && d.row.index < targets.length) d.cell.styles.fillColor = [236, 240, 243];
          }
        },
      });
    } else {
      targets.forEach((emp, ei) => {
        if (ei > 0) doc.addPage();
        const totals = getHourTotals(emp.id); const rows = buildRows(emp);
        const bonusNote = totals.nightAllowanceBonus > 0 ? ` (incl. ${totals.nightAllowanceBonus}h night allow.)` : '';
        doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 18, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`${tabLabel} Timesheet`, 10, 7);
        doc.setFontSize(9); doc.text(fmtPeriod(period), 10, 13);
        doc.setFontSize(11); doc.text(emp.name, 287, 10, { align: 'right' });
        autoTable(doc, {
          startY: 22,
          head: [['Day', 'Date', 'Status', 'Start', 'End', 'Reg', 'OT 1.5×', 'OT 2.0×', 'Night', 'Standby', 'Actual', 'Notes']],
          body: [...rows.map(r => [r.day, r.date, r.status, r.start, r.end, r.reg, r.ot15, r.ot20, r.night, '', '', r.notes]), ['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), totals.standbyBonus.toFixed(2), totals.actual.toFixed(2), `Total: ${totals.total.toFixed(2)}h${bonusNote}`]],
          styles: { fontSize: 7.5, cellPadding: 1.5 },
          headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 22 }, 2: { cellWidth: 20 }, 3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 16 }, 6: { cellWidth: 16 }, 7: { cellWidth: 16 }, 8: { cellWidth: 16 }, 9: { cellWidth: 16 }, 10: { cellWidth: 16 }, 11: { cellWidth: 'auto' } },
          didParseCell: d => { if (d.row.index === rows.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [230, 244, 234]; } },
        });
      });
    }
    doc.save(`timesheet-${periodType}-${fmtDate(period.start)}.pdf`);
  };

  return { downloadExcel, downloadPDF, dayCell };
}
