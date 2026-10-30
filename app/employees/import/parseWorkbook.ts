// app/employees/import/parseWorkbook.ts — read an Excel workbook in the browser.
// The browser only parses and labels: every row still goes through the
// server, which re-validates everything and never trusts these labels.
// Dates stay as the sheet holds them (serials or text) — the server parses
// both — except real Date cells, which are flattened to yyyy-mm-dd so the
// JSON round-trip cannot reshape them.
import { read, utils } from 'xlsx';

export interface ParsedSheet {
  name: string;
  rows: unknown[][];
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[];
  fileName: string;
}

/** The most rows the server plans at once (backend MAX_ROWS). Refused early so a huge file never uploads. */
export const MAX_IMPORT_ROWS = 20000;

function normalizeCell(value: unknown): unknown {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return value;
}

export function parseWorkbookData(data: ArrayBuffer, fileName: string): ParsedWorkbook {
  const wb = read(data, { type: 'array' });
  if (wb.SheetNames.length === 0) throw new Error('That file has no sheets.');
  const sheets = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false }) as unknown[][];
    return { name, rows: raw.map(r => (Array.isArray(r) ? r : [r]).map(normalizeCell)) };
  });
  if (sheets.every(s => s.rows.every(r => r.every(c => !hasVisibleContent(c))))) throw new Error('That file has no readable rows.');
  return { sheets, fileName };
}

export function isBlankCell(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** A cell with something a person could have typed: xlsx reads binary garbage
 * as control-character strings, which count as nothing. */
function hasVisibleContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return /[^\s\u0000-\u001F]/.test(value);
  return true;
}

/** The header row: the first row with three or more filled cells, else the first row. */
export function detectHeaderRow(rows: unknown[][]): number {
  const found = rows.findIndex(r => r.filter(c => !isBlankCell(c)).length >= 3);
  return found === -1 ? 0 : found;
}

export function headerLabels(rows: unknown[][], headerRow: number): string[] {
  const row = rows[headerRow] ?? [];
  const width = Math.max(row.length, ...rows.map(r => r.length));
  return Array.from({ length: width }, (_, i) => {
    const cell = row[i];
    return typeof cell === 'string' ? cell.trim() : cell === null || cell === undefined ? '' : String(cell);
  });
}

export function dataRows(rows: unknown[][], headerRow: number | null): unknown[][] {
  // The header row never goes to the server: a header like "Mine number"
  // reads as a refused person, not an ignored title. Title rows above it are
  // the server's to ignore.
  return headerRow === null ? rows : rows.filter((_, i) => i !== headerRow);
}

// ─── column mapping ─────────────────────────────────────────────────────────

export type PersonTarget =
  | 'mine_number' | 'full_name' | 'first_name' | 'last_name' | 'job_title'
  | 'section' | 'date_engaged' | 'id_number' | 'phone';

export const PERSON_TARGETS: { value: PersonTarget; label: string }[] = [
  { value: 'mine_number', label: 'Mine number (required)' },
  { value: 'full_name', label: 'Full name' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'job_title', label: 'Job title' },
  { value: 'section', label: 'Section' },
  { value: 'date_engaged', label: 'Date engaged' },
  { value: 'id_number', label: 'ID number' },
  { value: 'phone', label: 'Phone' },
];

/** A mapping value the server accepts: a person field, a wide PPE/size column, a long-layout column, or ignore. */
export type MappingValue =
  | PersonTarget
  | 'item_text' | 'size' | 'issue_date' | 'ignore'
  | { target: string; label?: string };

/** The mapping the dialog edits: column index → chosen target. `ignore` sends nothing for that column. */
export type ColumnMapping = Record<string, MappingValue>;

export interface KnownType {
  code: string;
  label: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

const PERSON_HINTS: { target: PersonTarget; tests: RegExp[] }[] = [
  { target: 'mine_number', tests: [/mine.*(number|no)/, /employee.*(id|no|number)/, /payroll/] },
  { target: 'full_name', tests: [/^(full.?name|name|names|employee.?name)$/] },
  { target: 'first_name', tests: [/^first.?name$/] },
  { target: 'last_name', tests: [/^(last.?name|surname)$/] },
  { target: 'job_title', tests: [/job|designation|occupation|position|trade/] },
  { target: 'section', tests: [/^section$/] },
  { target: 'date_engaged', tests: [/engag/, /date.*(employ|hire|start)/, /start.*date/] },
  { target: 'phone', tests: [/phone|mobile|^cell$/] },
  { target: 'id_number', tests: [/id.*(number|no)/, /national.*id/] },
];

/** Suggest a mapping from header text: person fields by name, PPE columns by
 * type (label kept for the record's item name), size columns beside their
 * type. First match wins; each target is suggested once. */
export function suggestMapping(headers: string[], layout: 'wide' | 'long', knownTypes: KnownType[]): ColumnMapping {
  const out: ColumnMapping = {};
  const usedSingles = new Set<string>();
  const typeByNorm = new Map<string, KnownType>();
  for (const t of knownTypes) {
    typeByNorm.set(norm(t.code), t);
    typeByNorm.set(norm(t.label), t);
  }
  headers.forEach((header, i) => {
    const key = String(i);
    const h = header.trim().toLowerCase();
    if (!h) { out[key] = 'ignore'; return; }
    if (layout === 'long') {
      if (/item|description|^ppe$|type/.test(h) && !usedSingles.has('item_text')) { out[key] = 'item_text'; usedSingles.add('item_text'); return; }
      if (/^size$/.test(h) && !usedSingles.has('size')) { out[key] = 'size'; usedSingles.add('size'); return; }
      if (/issue.*date|date.*issue/.test(h) && !usedSingles.has('issue_date')) { out[key] = 'issue_date'; usedSingles.add('issue_date'); return; }
    } else {
      if (/^size\b/.test(h)) {
        const rest = h.replace(/^size\b/, '').trim();
        const t = rest ? typeByNorm.get(norm(rest)) : undefined;
        if (t && !usedSingles.has(`size:${t.code}`)) { out[key] = { target: `size:${t.code}` }; usedSingles.add(`size:${t.code}`); return; }
      }
      const t = typeByNorm.get(norm(h));
      if (t && !usedSingles.has(`ppe:${t.code}`)) { out[key] = { target: `ppe:${t.code}`, label: header.trim() }; usedSingles.add(`ppe:${t.code}`); return; }
    }
    for (const { target, tests } of PERSON_HINTS) {
      if (!usedSingles.has(target) && tests.some(t => t.test(h))) { out[key] = target; usedSingles.add(target); return; }
    }
    out[key] = 'ignore';
  });
  return out;
}

/** The mapping in the server's shape: {col_index: target}. Ignored columns are left out. */
export function toServerMapping(mapping: ColumnMapping): Record<string, string | { target: string; label?: string }> {
  const out: Record<string, string | { target: string; label?: string }> = {};
  for (const [key, value] of Object.entries(mapping)) {
    if (value === 'ignore') continue;
    out[key] = value;
  }
  return out;
}
