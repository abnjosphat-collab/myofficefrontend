// app/employees/exportRoster.ts — the roster as a workbook or a PDF, organised by section, by trade, or by section and then trade (the
// same grouping the register shows, because both come from roster.ts). Excel gets a sheet per group and a labelled row per trade; the
// PDF a page per group.
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB, exportFilename } from '@/lib/exportUtils';
import type { Row, Worksheet } from 'exceljs';
import { formatDate } from '@/lib/format';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { formatPhoneDisplay } from '@/lib/phone';
import { normalizeSection } from '@/lib/sections';
import { groupByProfession, groupBySectionAndProfession } from './roster';
import type { Employee } from './types';

export type ExportGroupBy = 'section' | 'profession' | 'section_profession';
export const EXPORT_GROUPS: { value: ExportGroupBy; label: string; hint: string }[] = [
  { value: 'section_profession', label: 'Section and trade', hint: 'A sheet per section, trades labelled within it' },
  { value: 'section', label: 'Section only', hint: 'One sheet per section' },
  { value: 'profession', label: 'Trade only', hint: 'One sheet per trade, whatever the section' },
];

const COLUMNS = [
  { header: 'Employee ID', key: 'employee_id', width: 14 }, { header: 'First Name', key: 'first_name', width: 18 }, { header: 'Last Name', key: 'last_name', width: 18 },
  { header: 'Designation', key: 'designation', width: 24 }, { header: 'Section', key: 'section', width: 18 }, { header: 'Phone', key: 'phone', width: 16 },
  { header: 'Employment Type', key: 'employment_type', width: 16 }, { header: 'Start Date', key: 'date_of_engagement', width: 14 },
];
const PDF_HEAD = COLUMNS.map(c => c.header);
const sectionText = (e: Employee) => (normalizeSection(e.section) === 'Unassigned' ? '' : normalizeSection(e.section));
const startText = (e: Employee) => (e.date_of_engagement ? formatDate(e.date_of_engagement) : '');
const pdfRow = (e: Employee) => [e.employee_id, e.first_name, e.last_name, normalizeDesignation(e.designation) || '', sectionText(e), formatPhoneDisplay(e.phone) || '', e.employment_type || '', startText(e)];
/** The Excel download leaves Start Date out; the PDF below keeps it. */
const EXCEL_COLUMNS = [
  { header: 'Employee ID', key: 'employee_id', width: 14 }, { header: 'First Name', key: 'first_name', width: 18 }, { header: 'Last Name', key: 'last_name', width: 18 },
  { header: 'Designation', key: 'designation', width: 24 }, { header: 'Section', key: 'section', width: 18 }, { header: 'Phone', key: 'phone', width: 18 },
  { header: 'Employment Type', key: 'employment_type', width: 16 },
];
const excelRow = (e: Employee) => ({ employee_id: e.employee_id, first_name: e.first_name, last_name: e.last_name, designation: normalizeDesignation(e.designation) || '', section: sectionText(e), phone: formatPhoneDisplay(e.phone) || '', employment_type: e.employment_type || '' });

/** Text columns — editorial left align; the type column stays centred. */
const EXCEL_LEFT_COLS = new Set([1, 2, 3, 4, 5, 6]);
const TRADE_FILL_ARGB = 'FFE8EEF3';
const STRIPE_FILL_ARGB = 'FFF7FAFC';
const ROSTER_INK_ARGB = 'FF1A2F44';

/** Header row in the Registry pairing: brand fill, white bold Calibri 11, airy height. */
function styleRosterHeaderRow(row: Row) {
  row.height = 24;
  row.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: EXCEL_LEFT_COLS.has(colNumber) ? 'left' : 'center', indent: EXCEL_LEFT_COLS.has(colNumber) ? 1 : 0 };
  });
}

/** Trade banner in the Registry pairing: shaded fill, brand Calibri, airy height. */
function styleTradeLabelRow(row: Row) {
  row.height = 24;
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 11, color: { argb: EXPORT_BRAND_ARGB }, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TRADE_FILL_ARGB } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

/** Data row in the Registry pairing: Calibri 10 on ink, subtle stripe, airy height. */
function styleRosterDataRow(row: Row, striped: boolean) {
  row.height = 21;
  row.eachCell((cell, colNumber) => {
    if (striped) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_FILL_ARGB } };
    cell.font = { size: 10, color: { argb: ROSTER_INK_ARGB }, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: EXCEL_LEFT_COLS.has(colNumber) ? 'left' : 'center', indent: colNumber === 1 ? 1 : 0 };
  });
}

export const exportStub = (g: ExportGroupBy) => `Personnel_By_${g === 'section_profession' ? 'Section_and_Profession' : g === 'section' ? 'Section' : 'Profession'}`;

/** The groups the chosen option produces, as a label and a count each (for the preview). */
export function previewGroups(employees: Employee[], by: ExportGroupBy): { label: string; count: number }[] {
  if (by === 'profession') return groupByProfession(employees).map(g => ({ label: g.designation, count: g.employees.length }));
  return groupBySectionAndProfession(employees).map(g => ({ label: g.section, count: g.employees.length }));
}

export async function exportRosterExcel(employees: Employee[], by: ExportGroupBy): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const { saveAs } = await import('file-saver');
  const wb = new ExcelJS.Workbook();
  let dataRowIndex = 0;
  const addSheet = (label: string) => {
    const ws: Worksheet = wb.addWorksheet(label.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] }); // Excel's sheet-name limit
    ws.columns = EXCEL_COLUMNS;
    styleRosterHeaderRow(ws.getRow(1));
    return ws;
  };
  const addEmployeeRow = (ws: Worksheet, e: Employee) => {
    const row = ws.addRow(excelRow(e));
    styleRosterDataRow(row, dataRowIndex % 2 === 1);
    dataRowIndex += 1;
  };
  if (by === 'section_profession') {
    for (const g of groupBySectionAndProfession(employees)) {
      const ws = addSheet(g.section);
      for (const sub of g.subgroups) {
        const label = ws.addRow([`${sub.designation} (${sub.employees.length})`]);
        ws.mergeCells(label.number, 1, label.number, EXCEL_COLUMNS.length);
        styleTradeLabelRow(label);
        sub.employees.forEach(e => addEmployeeRow(ws, e));
      }
    }
  } else {
    const groups = by === 'section' ? groupBySectionAndProfession(employees).map(g => ({ label: g.section, rows: g.employees })) : groupByProfession(employees).map(g => ({ label: g.designation, rows: g.employees }));
    for (const g of groups) {
      const ws = addSheet(g.label);
      g.rows.forEach(e => addEmployeeRow(ws, e));
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${exportFilename(exportStub(by))}.xlsx`);
}

export async function exportRosterPdf(employees: Employee[], by: ExportGroupBy): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const BRAND = EXPORT_BRAND_RGB;
  let first = true;
  const header = (title: string) => { doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 16, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(title, 10, 10); };
  const table = (startY: number, rows: Employee[]) => autoTable(doc, { startY, head: [PDF_HEAD], body: rows.map(pdfRow), styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248, 250, 252] } });
  const plural = (n: number) => `${n} employee${n === 1 ? '' : 's'}`;
  if (by === 'section_profession') {
    for (const g of groupBySectionAndProfession(employees)) {
      if (!first) doc.addPage();
      first = false;
      header(`${g.section}: ${plural(g.employees.length)}`);
      let y = 20;
      for (const sub of g.subgroups) {
        doc.setTextColor(...BRAND); doc.setFontSize(10); doc.text(`${sub.designation} (${sub.employees.length})`, 10, y);
        table(y + 2, sub.employees);
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }
    }
  } else {
    const groups = by === 'section' ? groupBySectionAndProfession(employees).map(g => ({ label: g.section, rows: g.employees })) : groupByProfession(employees).map(g => ({ label: g.designation, rows: g.employees }));
    for (const g of groups) {
      if (!first) doc.addPage();
      first = false;
      header(`${g.label}: ${plural(g.rows.length)}`);
      table(20, g.rows);
    }
  }
  doc.save(`${exportFilename(exportStub(by))}.pdf`);
}
