// app/recently-deleted/calcDeletedSummary.ts — one human line per deleted record:
// what it was, who/what it names, and the date that identifies it.
import { formatDate } from '@/lib/format';

export interface DeletedEntry {
  id: string;
  deleted_at: string;
  table_name: string;
  record_id: string | null;
  snapshot: Record<string, unknown> | null;
  deleted_by_email: string;
  deleted_by_name: string | null;
  restored_at: string | null;
  restored_by: string | null;
}

const TABLE_LABELS: Record<string, string> = {
  artisan_timesheets: 'Artisan timesheet',
  breakdowns: 'Breakdown',
  drivers: 'Driver',
  employees: 'Employee',
  leaves: 'Leave',
  notices: 'Notice',
  overtime: 'Overtime request',
  ppe_records: 'PPE record',
  requisitions: 'Requisition',
  sheq_inspections: 'SHEQ inspection',
  stock_issues: 'Stock issue',
  timesheets: 'Timesheet',
  work_orders: 'Work order',
};

/** Pure — "Leave", "Work order"; unknown tables are prettified, never snake_case. */
export function tableLabel(table: string): string {
  const known = TABLE_LABELS[table];
  if (known) return known;
  const words = table.replace(/_/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : table;
}

const ID_FIELDS = ['employee_name', 'name', 'title', 'subject', 'work_order_number', 'code', 'item_name', 'register_number'];
const EXTRA_FIELDS = ['leave_type'];
const DATE_FIELDS = ['start_date', 'applied_date', 'date', 'issue_date', 'occurred_at', 'created_at'];

function text(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

function firstText(snapshot: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const found = text(snapshot[field]);
    if (found) return found;
  }
  return null;
}

/** Pure — "Ann Moyo · annual · 20 Oct 2026", "WO-118", or "Record #3" when the copy names nothing. */
export function deletedSummary(entry: Pick<DeletedEntry, 'table_name' | 'record_id' | 'snapshot'>): string {
  const snapshot = entry.snapshot && typeof entry.snapshot === 'object' ? entry.snapshot : {};
  const parts: string[] = [];
  const who = firstText(snapshot, ID_FIELDS);
  if (who) parts.push(who);
  const extra = firstText(snapshot, EXTRA_FIELDS);
  if (extra) parts.push(extra);
  const rawDate = firstText(snapshot, DATE_FIELDS);
  if (rawDate) {
    const formatted = formatDate(rawDate);
    if (formatted) parts.push(formatted);
  }
  if (parts.length > 0) return parts.join(' · ');
  return entry.record_id ? `Record #${entry.record_id}` : 'Record';
}
