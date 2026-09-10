import type { Employee } from './types';
import type { Borders } from 'exceljs';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { normalizeSection } from '@/lib/sections';
import { formatPhoneDisplay } from '@/lib/phone';
import { formatDate } from '@/lib/format';
import { EXPORT_BRAND_ARGB } from '@/lib/exportUtils';
import { toast } from 'sonner';

const COL_COUNT = 8;
const PHONE_COL = 6;

/** Text columns — editorial left align; dates/types stay centred. */
const LEFT_ALIGN_COLS = new Set([1, 2, 3, 4, 5, PHONE_COL]);

const RULE = 'FFD0DCE6';
const RULE_SOFT = 'FFE8EEF3';

const COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', width: 14 },
  { key: 'first_name', label: 'First Name', width: 18 },
  { key: 'last_name', label: 'Last Name', width: 18 },
  { key: 'designation', label: 'Designation', width: 26 },
  { key: 'section', label: 'Section', width: 20 },
  { key: 'phone', label: 'Phone', width: 20 },
  { key: 'employment_type', label: 'Employment Type', width: 16 },
  { key: 'date_of_engagement', label: 'Start Date', width: 14 },
] as const;

function hairBottom(): Partial<Borders> {
  return { bottom: { style: 'hair', color: { argb: RULE_SOFT } } };
}

function thinBottom(): Partial<Borders> {
  return { bottom: { style: 'thin', color: { argb: RULE } } };
}

function groupByDesignation(list: Employee[]): { designation: string; employees: Employee[] }[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) {
    const key = normalizeDesignation(e.designation) || 'Unclassified';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.keys()]
    .sort((a, b) => (a === 'Unclassified' ? 1 : b === 'Unclassified' ? -1 : a.localeCompare(b)))
    .map(designation => ({
      designation,
      employees: map.get(designation)!
        .slice()
        .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)),
    }));
}

function rowPayload(e: Employee): Record<string, string> {
  return {
    employee_id: e.employee_id || '',
    first_name: e.first_name || '',
    last_name: e.last_name || '',
    designation: normalizeDesignation(e.designation) || '',
    section: normalizeSection(e.section) === 'Unassigned' ? '' : normalizeSection(e.section),
    phone: formatPhoneDisplay(e.phone) || '',
    employment_type: e.employment_type || '',
    date_of_engagement: e.date_of_engagement ? formatDate(e.date_of_engagement) : '',
  };
}

function paintDataRow(
  exRow: import('exceljs').Row,
  stripe: 'even' | 'odd',
  isLastInGroup: boolean,
) {
  const bg = stripe === 'even' ? 'FFFFFFFF' : 'FFF7FAFC';
  const rowBorder = isLastInGroup ? thinBottom() : hairBottom();
  exRow.height = 21;

  exRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font = { color: { argb: 'FF1A2F44' }, size: 10, name: 'Calibri' };
    cell.alignment = {
      vertical: 'middle',
      horizontal: LEFT_ALIGN_COLS.has(colNumber) ? 'left' : 'center',
      indent: colNumber === 1 ? 1 : 0,
    };
    cell.border = rowBorder;

    if (colNumber === PHONE_COL) {
      cell.numFmt = '@';
      if (cell.value != null && cell.value !== '') {
        cell.value = String(cell.value);
      }
    }
  });
}

/** Whitespace between designation blocks — no grid lines. */
function addGroupSpacer(ws: import('exceljs').Worksheet) {
  const gap = ws.addRow(['']);
  gap.height = 14;
  ws.mergeCells(gap.number, 1, gap.number, COL_COUNT);
  gap.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
}

/** Single-sheet registry export — grouped by designation, formatted for print/handout. */
export async function exportPersonnelRegistryExcel(employees: Employee[], filename: string): Promise<void> {
  if (employees.length === 0) {
    toast.error('No employees to export');
    return;
  }

  try {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const groups = groupByDesignation(employees);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ozech MyOffice';
    wb.created = new Date();
    const ws = wb.addWorksheet('Personnel Registry', {
      views: [{ state: 'frozen', ySplit: 4, activeCell: 'A5' }],
    });

    ws.columns = COLUMNS.map(c => ({
      key: c.key,
      width: c.width,
      ...(c.key === 'phone' ? { style: { numFmt: '@' } } : {}),
    }));
    ws.getColumn(PHONE_COL).numFmt = '@';

    const titleRow = ws.addRow(['Personnel Registry']);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 18, color: { argb: EXPORT_BRAND_ARGB }, name: 'Calibri' };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.mergeCells(1, 1, 1, COL_COUNT);

    const generated = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const subRow = ws.addRow([
      `Grouped by designation · ${employees.length} employee${employees.length !== 1 ? 's' : ''} · ${generated}`,
    ]);
    subRow.height = 18;
    subRow.getCell(1).font = { size: 10, color: { argb: 'FF5C6B7A' }, italic: true, name: 'Calibri' };
    subRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.mergeCells(2, 1, 2, COL_COUNT);

    ws.addRow([]);

    const headerRowNum = 4;
    const hdr = ws.getRow(headerRowNum);
    hdr.height = 28;
    COLUMNS.forEach((c, i) => { hdr.getCell(i + 1).value = c.label; });
    hdr.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.alignment = {
        horizontal: LEFT_ALIGN_COLS.has(colNumber) ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
        indent: LEFT_ALIGN_COLS.has(colNumber) ? 1 : 0,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A3650' } },
        bottom: { style: 'medium', color: { argb: 'FF86BBD8' } },
      };
    });

    let dataRowIndex = 0;

    groups.forEach((group, groupIndex) => {
      const banner = ws.addRow(['']);
      banner.getCell(1).value = group.designation;
      banner.getCell(7).value = `${group.employees.length} staff`;
      banner.height = 26;
      ws.mergeCells(banner.number, 1, banner.number, 6);
      ws.mergeCells(banner.number, 7, banner.number, COL_COUNT);

      const bannerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8EEF3' } };
      banner.getCell(1).fill = bannerFill;
      banner.getCell(7).fill = bannerFill;
      banner.getCell(1).font = { bold: true, size: 11, color: { argb: EXPORT_BRAND_ARGB }, name: 'Calibri' };
      banner.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      banner.getCell(7).font = { size: 9, color: { argb: 'FF5C6B7A' }, name: 'Calibri' };
      banner.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      banner.getCell(1).border = {
        top: { style: 'thin', color: { argb: RULE } },
        bottom: { style: 'hair', color: { argb: RULE_SOFT } },
      };
      banner.getCell(7).border = banner.getCell(1).border;

      const lastIdx = group.employees.length - 1;
      group.employees.forEach((emp, empIndex) => {
        const exRow = ws.addRow(rowPayload(emp));
        paintDataRow(
          exRow,
          dataRowIndex % 2 === 0 ? 'even' : 'odd',
          empIndex === lastIdx,
        );
        dataRowIndex += 1;
      });

      if (groupIndex < groups.length - 1) {
        addGroupSpacer(ws);
      }
    });

    ws.addRow([]);
    const footer = ws.addRow(['Ozech MyOffice · Confidential personnel record']);
    footer.getCell(1).font = { size: 8, color: { argb: 'FF9BAAB8' }, italic: true, name: 'Calibri' };
    ws.mergeCells(footer.number, 1, footer.number, COL_COUNT);

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${filename}.xlsx`,
    );
    toast.success(`Personnel Registry exported — ${employees.length} employees, ${groups.length} designations`);
  } catch (err) {
    toast.error(`Export failed: ${(err as Error).message}`);
  }
}
