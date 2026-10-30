// app/overtime/parseShiftBook.ts — OT @ 1.5 Shift from the monthly NEC timesheet
// books (the "Copy of August 2026 NEC Timesheet" layout): each "NEC <Month>
// <Year>" sheet holds one row per employee with day hours and tail columns
// TOTAL HRS (=SUM of the days) and T/M Hours (the 208 cap). Monthly shift
// overtime is TOTAL HRS minus T/M Hours, baked as a value; the report averages
// every monthly sheet the employee is actually present in.
import { normalizeTimesheetEmployeeCode } from '../timesheets/employeeCode';

const MONTH_NUMBERS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/** "NEC June 2026" → "2026-06", anything else → null. */
export function bookMonthKey(sheetName: string): string | null {
  const m = /NEC\s+([A-Za-z]+)\s+(\d{4})/.exec((sheetName || '').trim());
  if (!m) return null;
  const mm = MONTH_NUMBERS[m[1].toLowerCase()];
  return mm ? `${m[2]}-${mm}` : null;
}

function numericCell(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (value != null && typeof value === 'object') {
    const r = (value as { result?: unknown }).result;
    if (typeof r === 'number' && Number.isFinite(r)) return r;
    if (typeof r === 'string') {
      const t = r.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

const normHeader = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

export interface ParsedShiftBook {
  /** Budget months found in the upload, in window order. */
  monthsUsed: string[];
  /** Monthly shift overtime (TOTAL HRS minus T/M Hours, floored at 0) by normalised employee number. */
  monthlyOt: Map<string, Map<string, number>>;
}

/** Reads every monthly NEC sheet out of an uploaded .xlsx book. */
export async function parseShiftBook(data: ArrayBuffer): Promise<ParsedShiftBook> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const monthlyOt = new Map<string, Map<string, number>>();
  const found = new Set<string>();

  for (const ws of wb.worksheets) {
    const key = bookMonthKey(ws.name);
    if (!key) continue;
    found.add(key);
    // Header row: the one carrying Code … TOTAL HRS (day columns sit between).
    let headerRow = 0;
    let codeCol = 0;
    let totalCol = 0;
    let tmCol = 0;
    for (let r = 1; r <= Math.min(ws.rowCount, 8); r++) {
      const row = ws.getRow(r);
      let code = 0;
      let total = 0;
      let tm = 0;
      for (let c = 1; c <= ws.columnCount; c++) {
        const h = normHeader(row.getCell(c).value);
        if (h === 'CODE') code = c;
        else if (h === 'TOTAL HRS') total = c;
        else if (h === 'T/M HOURS') tm = c;
      }
      if (code > 0 && total > 0) { headerRow = r; codeCol = code; totalCol = total; tmCol = tm; break; }
    }
    if (headerRow === 0) continue;
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const code = normalizeTimesheetEmployeeCode(String(row.getCell(codeCol).value ?? ''));
      if (!code) continue;
      const total = numericCell(row.getCell(totalCol).value);
      if (total == null) continue; // no info for this person this month — month not counted
      const tmRaw = tmCol > 0 ? numericCell(row.getCell(tmCol).value) : null;
      const tm = tmRaw ?? (total > 208 ? 208 : total);
      const ot = Math.max(0, total - tm);
      if (!monthlyOt.has(code)) monthlyOt.set(code, new Map());
      // First row wins if a code appears twice in one sheet.
      if (!monthlyOt.get(code)!.has(key)) monthlyOt.get(code)!.set(key, ot);
    }
  }

  return { monthsUsed: [...found].sort(), monthlyOt };
}

/** Whole-number monthly average over the months each employee is present in. Null when nowhere. */
export function bookShiftAverages(parsed: ParsedShiftBook): Map<string, number> {
  const out = new Map<string, number>();
  for (const [code, byMonth] of parsed.monthlyOt) {
    const months = [...byMonth.keys()];
    if (months.length === 0) continue;
    const sum = months.reduce((s, m) => s + byMonth.get(m)!, 0);
    out.set(code, Math.round(sum / months.length));
  }
  return out;
}
