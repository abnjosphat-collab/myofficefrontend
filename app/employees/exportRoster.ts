// app/employees/exportRoster.ts — the roster as a workbook or a PDF, organised by section, by trade, or by section and then trade (the
// same grouping the register shows, because both come from roster.ts). Excel gets a sheet per group and a labelled row per trade; the
// PDF a page per group.
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB, styleExcelHeaderRow } from '@/lib/exportUtils';
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
const excelRow = (e: Employee) => ({ ...e, designation: normalizeDesignation(e.designation) || '', section: sectionText(e), phone: formatPhoneDisplay(e.phone) || '', date_of_engagement: startText(e) });

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
  if (by === 'section_profession') {
    for (const g of groupBySectionAndProfession(employees)) {
      const ws = wb.addWorksheet(g.section.slice(0, 31)); // Excel's sheet-name limit
      ws.columns = COLUMNS;
      styleExcelHeaderRow(ws.getRow(1));
      for (const sub of g.subgroups) {
        const label = ws.addRow([`${sub.designation} (${sub.employees.length})`]);
        ws.mergeCells(label.number, 1, label.number, COLUMNS.length);
        label.getCell(1).font = { bold: true, italic: true, size: 10, color: { argb: EXPORT_BRAND_ARGB } };
        label.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF3' } };
        sub.employees.forEach(e => ws.addRow(excelRow(e)));
      }
    }
  } else {
    const groups = by === 'section' ? groupBySectionAndProfession(employees).map(g => ({ label: g.section, rows: g.employees })) : groupByProfession(employees).map(g => ({ label: g.designation, rows: g.employees }));
    for (const g of groups) {
      const ws = wb.addWorksheet(g.label.slice(0, 31));
      ws.columns = COLUMNS;
      styleExcelHeaderRow(ws.getRow(1));
      g.rows.forEach(e => ws.addRow(excelRow(e)));
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${exportStub(by)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  doc.save(`${exportStub(by)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
