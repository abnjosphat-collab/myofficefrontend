// app/spares/import/extract.ts — turning the rows the server read from a spreadsheet into spare-part records, and
// into the payload the bulk endpoint receives. Pure, so the rules that decide what an import writes are tested.

export interface Mapping { stock_code: string; description: string; unit_price: string; }
export interface ExtractedRow {
  stock_code: string;
  description: string;
  /** null when the cell is empty or not a price: the import must then leave the stored price alone. */
  unit_price: number | null;
  category: string;
  valid: boolean;
}

/**
 * A price from a cell: currency symbols and spaces are ignored; "1,234.50" is 1234.5 and "12,50" is 12.5.
 * Anything that is not a non-negative number is null, never 0.
 */
export function parsePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  let s = String(raw).replace(/[$€£\s]/g, '');
  if (s === '') return null;
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); // a decimal comma
  else s = s.replace(/,/g, ''); // thousands separators
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function extractRows(rawRows: Record<string, unknown>[], mapping: Mapping): ExtractedRow[] {
  return rawRows.map(row => {
    const stock_code = String(row[mapping.stock_code] ?? '').trim();
    const description = String(row[mapping.description] ?? '').trim();
    return {
      stock_code,
      description,
      unit_price: mapping.unit_price ? parsePrice(row[mapping.unit_price]) : null,
      category: String(row['_category'] ?? '').trim(),
      valid: Boolean(stock_code && description),
    };
  });
}

/**
 * The record sent to the bulk endpoint. Only what the file says is included: the server fills the defaults for a
 * new part, and for an existing one (update mode) anything not sent is kept, so stock on hand, limits, priority
 * and supplier are never reset by an import that was meant to fix prices or categories.
 */
export function toBulkItem(row: ExtractedRow): Record<string, unknown> {
  return {
    stock_code: row.stock_code,
    description: row.description,
    ...(row.unit_price !== null ? { unit_price: row.unit_price } : {}),
    ...(row.category ? { category: row.category, categories: [row.category] } : {}),
  };
}

export function confidenceTone(c: number): { label: 'High' | 'Medium' | 'Low'; tone: 'success' | 'warning' | 'danger' } {
  if (c >= 0.7) return { label: 'High', tone: 'success' };
  if (c >= 0.4) return { label: 'Medium', tone: 'warning' };
  return { label: 'Low', tone: 'danger' };
}
