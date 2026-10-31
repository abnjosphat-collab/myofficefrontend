// app/employees/import/importerApi.ts — the Mining Excel importer calls. The
// browser parses the workbook and sends normalised rows plus the column
// mapping; the server re-validates everything and answers in plain language
// (a 422's detail names the problem, so the dialog shows it verbatim).
import { api } from '@/lib/apiClient';

export interface ImportPerson {
  row?: number;
  mine_number: string;
  action: 'create' | 'fill' | 'unchanged' | 'refused';
  first_name?: string;
  last_name?: string;
  person_id?: number | string;
  fill?: Record<string, string>;
  diffs?: { field: string; was: string; filed: string }[];
  section?: string;
  reason?: string;
  refuse_reason?: string;
  [k: string]: unknown;
}

export interface ImportPpeEntry {
  row?: number;
  mine_number: string;
  action: 'add' | 'duplicate_skipped' | 'refused';
  ppe_type?: string;
  item_name?: string;
  size?: string | null;
  issue_iso?: string | null;
  expiry_date?: string | null;
  reason?: string;
  unknown_item?: boolean;
  [k: string]: unknown;
}

export interface ImportProblem {
  row?: number;
  number?: string;
  reason: string;
}

export interface ImportPlan {
  file_name: string;
  counts: Record<string, number>;
  people: ImportPerson[];
  ppe: ImportPpeEntry[];
  problems: ImportProblem[];
}

export interface ImportCommitResult {
  counts: Record<string, number>;
  created_employee_ids: unknown[];
  created_ppe_ids: unknown[];
  import_id: string;
}

export interface ImportUndoResult {
  removed_people: unknown[];
  removed_ppe: unknown[];
  kept_people: { mine_number: string; tables: string[] }[];
  already_undone?: boolean;
}

export interface ImportHistoryRow {
  id: string;
  department: string;
  file_name: string;
  created_by: string | null;
  created_at: string;
  counts: Record<string, number>;
  created_employee_ids: unknown[];
  created_ppe_ids: unknown[];
  undone_at: string | null;
}

export interface ImportPayload {
  file_name: string;
  layout: 'wide' | 'long';
  department: string;
  rows: unknown[][];
  mapping: Record<string, string | { target: string; label?: string }>;
}

const BASE = '/api/employees/import';

/** Save small text (a template) straight from the browser — no server round trip. */
export function downloadTextFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function previewImport(body: ImportPayload): Promise<ImportPlan> {
  return api.post<ImportPlan>(`${BASE}/preview`, body);
}

export async function commitImport(body: ImportPayload): Promise<ImportCommitResult> {
  return api.post<ImportCommitResult>(`${BASE}/commit`, body);
}

export async function undoImport(importId: string): Promise<ImportUndoResult> {
  return api.post<ImportUndoResult>(`${BASE}/${importId}/undo`, {});
}

/** The import log, newest first. */
export async function importHistory(): Promise<ImportHistoryRow[]> {
  const rows = await api.get<unknown>(`${BASE}/history`);
  if (!Array.isArray(rows)) throw new Error('The import history returned an unexpected response.');
  return rows as ImportHistoryRow[];
}
