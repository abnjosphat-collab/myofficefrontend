// app/services/extract.ts — turning a file into service records: spreadsheet rows (mapped by header name) and the text fields the
// server's OCR reads out of a scan or PDF. Pure, so each rule is tested.
import { emptyRecord } from './useServicesData';
import type { ServiceRecord } from './types';

const EXCEL_MAP: Record<string, keyof ServiceRecord> = {
  date: 'date', 'service date': 'date',
  description: 'description', service: 'description', 'service description': 'description', 'task description': 'description',
  supplier: 'supplier', contractor: 'supplier', vendor: 'supplier', 'contractor name': 'supplier',
  contact: 'contact_person', 'contact person': 'contact_person',
  req: 'requisition_number', requisition: 'requisition_number', 'req #': 'requisition_number', 'req no': 'requisition_number', 'pr#': 'requisition_number', 'pr #': 'requisition_number',
  inv: 'invoice_number', invoice: 'invoice_number', 'inv #': 'invoice_number', 'invoice no': 'invoice_number', 'invoice #': 'invoice_number',
  po: 'order_number', order: 'order_number', 'purchase order': 'order_number', 'po #': 'order_number', 'po#': 'order_number',
  amount: 'amount', cost: 'amount', price: 'amount', value: 'amount', total: 'amount',
  category: 'category', type: 'category',
  comments: 'general_comments', comment: 'general_comments', notes: 'general_comments', note: 'general_comments', remarks: 'general_comments',
};
// The approval columns land on a nested stage (rec.planning.signed), so they cannot go through EXCEL_MAP.
const STAGE_COLUMNS: Record<string, 'planning' | 'engineering_manager' | 'finance' | 'gm' | 'stores'> = {
  planning: 'planning', 'engineering manager': 'engineering_manager', 'eng mgr': 'engineering_manager', 'eng. mgr': 'engineering_manager', 'eng. mgr.': 'engineering_manager',
  finance: 'finance', 'finance manager': 'finance', gm: 'gm', 'general manager': 'gm', stores: 'stores',
};
const GRV_HEADERS = new Set(['grv#', 'grv #', 'grv number', 'grv']);
const toBool = (v: unknown) => v === true || String(v ?? '').trim().toUpperCase() === 'TRUE';

/** A real spreadsheet date arrives as a Date built from UTC, so read its UTC fields (local ones can be a day out); text dates are day-first. */
export function parseExcelDate(v: unknown): string {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) { const [, dd, mm, yy] = m; return `${yy.length === 2 ? `20${yy}` : yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`; }
  return s;
}

const SPREADSHEET_EXTS = new Set(['.xlsx', '.xls', '.csv']);
/** Spreadsheets are read in the browser; PDFs and images go to the server's OCR. */
export function fileMode(name: string): 'spreadsheet' | 'document' {
  return SPREADSHEET_EXTS.has(`.${(name.split('.').pop() ?? '').toLowerCase()}`) ? 'spreadsheet' : 'document';
}

/** True when a column header is one the importer understands. */
export const isKnownHeader = (h: string) => { const k = h.toLowerCase().trim(); return k in EXCEL_MAP || k in STAGE_COLUMNS || GRV_HEADERS.has(k); };

/** One spreadsheet row as a new record. Unknown columns are ignored; a row with no description and no supplier is not a record. */
export function rowToRecord(row: Record<string, unknown>): ServiceRecord | null {
  const rec = emptyRecord();
  for (const [col, val] of Object.entries(row)) {
    const key = col.toLowerCase().trim();
    const field = EXCEL_MAP[key];
    if (field) { (rec as unknown as Record<string, unknown>)[field] = field === 'date' ? parseExcelDate(val) : String(val ?? '').trim(); continue; }
    const stage = STAGE_COLUMNS[key];
    if (stage) { rec[stage].signed = toBool(val); continue; }
    if (GRV_HEADERS.has(key)) rec.stores.grv_number = String(val ?? '').trim();
  }
  return rec.description.trim() || rec.supplier.trim() ? rec : null;
}

export interface OcrFields { date?: string | null; description?: string | null; supplier?: string | null; contact_person?: string | null; requisition_number?: string | null; invoice_number?: string | null; order_number?: string | null; amount?: string | null; category?: string | null; general_comments?: string | null; grv_number?: string | null; payment_reference?: string | null }

/** What the scan found, as a partly filled record for the person to review. Fields it did not find stay empty. */
export function ocrToRecord(d: OcrFields): ServiceRecord {
  const rec = emptyRecord();
  const s = (v: string | null | undefined) => v ?? '';
  Object.assign(rec, {
    date: s(d.date), description: s(d.description), supplier: s(d.supplier), contact_person: s(d.contact_person),
    requisition_number: s(d.requisition_number), invoice_number: s(d.invoice_number), order_number: s(d.order_number),
    amount: s(d.amount), category: s(d.category), general_comments: s(d.general_comments),
  });
  if (d.grv_number) rec.stores.grv_number = d.grv_number;
  if (d.payment_reference) rec.payment.payment_reference = d.payment_reference;
  return rec;
}
