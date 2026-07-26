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
