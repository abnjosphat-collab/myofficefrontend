// lib/exportUtils.ts — shared constants/helpers for the app's internal-report
// PDF/Excel exports (branded navy #2A4D69). Previously this color and the header
// row styling it drives were redefined ad hoc in ~12 pages. Import from here
// instead so a brand-color change or styling tweak is a one-line edit.
//
// Not for quotations.tsx (a client-facing sales document with its own distinct
// brand identity, intentionally not unified with internal reports) or
// cv-builder.tsx (a demo/vertical app, out of scope for this app's own styling).
import type { Row } from 'exceljs';

/** ARGB hex — ExcelJS fill/font colors. */
export const EXPORT_BRAND_ARGB = 'FF2A4D69';

/** RGB tuple — jsPDF fill/text colors. */
export const EXPORT_BRAND_RGB: [number, number, number] = [42, 77, 105];

/** Bold white text on the brand navy fill — the standard Excel export header row. */
export function styleExcelHeaderRow(row: Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
  });
}

/** "Base_2026-07-26" — no extension; callers append .xlsx/.pdf themselves. */
export function exportFilename(base: string): string {
  return `${base}_${new Date().toISOString().slice(0, 10)}`;
}

/**
 * OT 1.5× Excel formula: hours above Reg (Normal) plus prefilled module OT at 1.5×.
 * HR can extend in the formula bar (e.g. …+6+2+1) — no separate Added OT column.
 */
export function excelOt15Formula(
  actualCol: string,
  regCol: string,
  row: number,
  moduleOt15 = 0,
): string {
  const extra = moduleOt15 === 0 ? '0' : String(Number(moduleOt15.toFixed(2)));
  return `MAX(0,${actualCol}${row}-${regCol}${row})+${extra}`;
}

/** 1-based column index → Excel column letter (1 = A, 27 = AA). */
export function excelColumnLetter(col: number): string {
  let n = col;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
