import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { calcArtisanTimesheetTotals, monthName } from './calcTotals';
import { dayStatusLabel, type DayStatusKey } from './dayStatus';
import type { ArtisanTimesheetRecord } from './types';

const FONT = 'Calibri';
const BORDER = { style: 'thin' as const, color: { argb: 'FF94A3B8' } };
const CELL_BORDER = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

function fmtHours(n: number): string {
  return (n || 0).toFixed(2);
}

function fileStub(record: ArtisanTimesheetRecord): string {
  const safeName = record.employee_name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  return `Artisan_Timesheet_${safeName}_${record.year}_${String(record.month).padStart(2, '0')}`;
}

export async function downloadArtisanTimesheetExcel(record: ArtisanTimesheetRecord): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const { saveAs } = await import('file-saver');
  const totals = calcArtisanTimesheetTotals(record.daily_rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ozech MyOffice';
  const ws = wb.addWorksheet('Timesheet', { views: [{ state: 'frozen', ySplit: 8, xSplit: 2 }] });

  const COLS = 16;
  ws.mergeCells(1, 1, 1, COLS);
  const title = ws.getCell(1, 1);
  title.value = 'ARTISAN DAILY TIMESHEET';
  title.font = { name: FONT, bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  const headerPairs: [string, string][] = [
    ['Mine No.', record.employee_id || '—'],
    ['Employee Name', record.employee_name],
    ['ID Number', record.id_number || '—'],
    ['Month', `${monthName(record.month)} ${record.year}`],
    ['Shift Rate', record.shift_rate != null ? String(record.shift_rate) : '—'],
    ['Hourly Rate', record.hourly_rate != null ? String(record.hourly_rate) : '—'],
  ];
  headerPairs.forEach(([label, value], i) => {
    const row = ws.getRow(3 + Math.floor(i / 2));
    const col = i % 2 === 0 ? 1 : 8;
    ws.mergeCells(row.number, col, row.number, col + 2);
    ws.mergeCells(row.number, col + 3, row.number, col + 5);
    const labelCell = ws.getCell(row.number, col);
    labelCell.value = label;
    labelCell.font = { name: FONT, bold: true, size: 9 };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF3' } };
    labelCell.border = CELL_BORDER;
    const valCell = ws.getCell(row.number, col + 3);
    valCell.value = value;
    valCell.font = { name: FONT, size: 9 };
    valCell.border = CELL_BORDER;
  });

  const hdrRowNum = 7;
  const hdr = ws.getRow(hdrRowNum);
  hdr.values = [
    'Date', 'Day', 'Status', 'Normal Hrs', 'O/T @ 1.5', 'O/T @ 2.0', 'SB @ 1.5', 'SB @ 2.0', 'Night Shift', 'Standby',
    'Sign In', 'Sign In Sig.', 'Sign Out', 'Sign Out Sig.', 'Comments',
  ];
  hdr.height = 28;
  hdr.eachCell({ includeEmpty: true }, c => {
    c.font = { name: FONT, bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = CELL_BORDER;
  });

  record.daily_rows.forEach((row, i) => {
    const dataRow = ws.getRow(hdrRowNum + 1 + i);
    dataRow.values = [
      formatDate(row.date),
      row.day,
      dayStatusLabel((row.day_status || '') as DayStatusKey),
      fmtHours(row.normal_hrs),
      fmtHours(row.ot_15),
      fmtHours(row.ot_20),
      fmtHours(row.sb_15),
      fmtHours(row.sb_20),
      fmtHours(row.night_shift),
      row.on_standby ? 'Yes' : '',
      row.sign_in_time || '',
      row.sign_in_signature ? 'Signed' : '',
      row.sign_out_time || '',
      row.sign_out_signature ? 'Signed' : '',
      row.comments || '',
    ];
    dataRow.height = 14;
    const stripe = i % 2 === 1;
    dataRow.eachCell({ includeEmpty: true }, c => {
      c.font = { name: FONT, size: 8 };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe ? 'FFF6F9FB' : 'FFFFFFFF' } };
      c.border = CELL_BORDER;
    });
    dataRow.getCell(15).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  });

  const totalsRowNum = hdrRowNum + 1 + record.daily_rows.length;
  const totalsRow = ws.getRow(totalsRowNum);
  totalsRow.values = [
    'TOTALS', '', '',
    fmtHours(totals.normal_hrs),
    fmtHours(totals.ot_15),
    fmtHours(totals.ot_20),
    fmtHours(totals.sb_15),
    fmtHours(totals.sb_20),
    fmtHours(totals.night_shift),
    '', '', '', '', '', '',
  ];
  totalsRow.eachCell({ includeEmpty: true }, c => {
    c.font = { name: FONT, bold: true, size: 8, color: { argb: EXPORT_BRAND_ARGB } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4EEF5' } };
    c.border = CELL_BORDER;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const footerStart = totalsRowNum + 2;
  const footerFields: [string, string | null | undefined, string | null | undefined][] = [
    ['Compiled By', record.compiled_by, record.compiled_by_signature],
    ['Approved By Electrical Foreman', record.approved_electrical_foreman, record.approved_electrical_foreman_signature],
    ['Approved By Mechanical Foreman', record.approved_mechanical_foreman, record.approved_mechanical_foreman_signature],
    ['Authorized By', record.authorized_by, record.authorized_by_signature],
  ];
  footerFields.forEach(([label, value, sig], i) => {
    const row = ws.getRow(footerStart + i);
    ws.mergeCells(row.number, 1, row.number, 3);
    ws.mergeCells(row.number, 4, row.number, 10);
    ws.mergeCells(row.number, 11, row.number, COLS);
    row.getCell(1).value = label;
    row.getCell(1).font = { name: FONT, bold: true, size: 9 };
    row.getCell(4).value = value || '';
    row.getCell(11).value = sig ? 'Signed' : '';
    row.getCell(1).border = CELL_BORDER;
    row.getCell(4).border = CELL_BORDER;
    row.getCell(11).border = CELL_BORDER;
    row.height = 18;
  });

  [9, 5, 12, 8, 8, 8, 8, 8, 8, 7, 8, 8, 8, 8, 22].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileStub(record)}.xlsx`,
  );
}

export async function downloadArtisanTimesheetPdf(record: ArtisanTimesheetRecord): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const totals = calcArtisanTimesheetTotals(record.daily_rows);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFillColor(...EXPORT_BRAND_RGB);
  doc.rect(0, 0, 297, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('ARTISAN DAILY TIMESHEET', 148, 9, { align: 'center' });

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  const headerLines = [
    `Mine No.: ${record.employee_id || '—'}    Employee: ${record.employee_name}    ID: ${record.id_number || '—'}`,
    `Month: ${monthName(record.month)} ${record.year}    Shift Rate: ${record.shift_rate ?? '—'}    Hourly Rate: ${record.hourly_rate ?? '—'}`,
  ];
  headerLines.forEach((line, i) => doc.text(line, 10, 20 + i * 5));

  autoTable(doc, {
    startY: 32,
    head: [[
      'Date', 'Day', 'Status', 'Normal', 'OT 1.5', 'OT 2.0', 'SB 1.5', 'SB 2.0', 'Night', 'SB',
      'In', 'In Sig', 'Out', 'Out Sig', 'Comments',
    ]],
    body: record.daily_rows.map(row => [
      formatDate(row.date),
      row.day,
      dayStatusLabel((row.day_status || '') as DayStatusKey),
      fmtHours(row.normal_hrs),
      fmtHours(row.ot_15),
      fmtHours(row.ot_20),
      fmtHours(row.sb_15),
      fmtHours(row.sb_20),
      fmtHours(row.night_shift),
      row.on_standby ? 'Yes' : '',
      row.sign_in_time || '',
      row.sign_in_signature ? 'Signed' : '',
      row.sign_out_time || '',
      row.sign_out_signature ? 'Signed' : '',
      row.comments || '',
    ]),
    foot: [[
      'TOTALS', '', '',
      fmtHours(totals.normal_hrs),
      fmtHours(totals.ot_15),
      fmtHours(totals.ot_20),
      fmtHours(totals.sb_15),
      fmtHours(totals.sb_20),
      fmtHours(totals.night_shift),
      '', '', '', '', '', '',
    ]],
    styles: { fontSize: 6.5, cellPadding: 1, lineColor: [148, 163, 184], lineWidth: 0.1 },
    headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [228, 238, 245], textColor: EXPORT_BRAND_RGB, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [246, 249, 251] },
    columnStyles: {
      14: { cellWidth: 36, halign: 'left' },
    },
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 32) + 8;
  const footerFields: [string, string | null | undefined, string | null | undefined][] = [
    ['Compiled By', record.compiled_by, record.compiled_by_signature],
    ['Approved By Electrical Foreman', record.approved_electrical_foreman, record.approved_electrical_foreman_signature],
    ['Approved By Mechanical Foreman', record.approved_mechanical_foreman, record.approved_mechanical_foreman_signature],
    ['Authorized By', record.authorized_by, record.authorized_by_signature],
  ];
  footerFields.forEach(([label, value, sig]) => {
    doc.setFontSize(8);
    doc.setTextColor(...EXPORT_BRAND_RGB);
    doc.text(`${label}:`, 10, y);
    doc.setTextColor(60, 60, 60);
    doc.text(`${value || '_________________________'}    ${sig ? '(Signed)' : ''}`, 70, y);
    y += 7;
  });

  doc.save(`${fileStub(record)}.pdf`);
}
