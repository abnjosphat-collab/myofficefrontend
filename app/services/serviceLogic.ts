// app/services/serviceLogic.ts — pure rules for the services tracker: how far a job has got through its six approvals, the
// filters and sort the register offers, and how one stage's draft is written back into a record.
import { toLocalISODate } from '@/lib/dates';
import { STAGES, STAGE_COUNT, STATUS, type StageKey, type StatusKey } from './meta';
import type { PaymentStage, ServiceRecord, StageData, StoresStage } from './types';

export function isStageDone(r: ServiceRecord, key: StageKey): boolean {
  return key === 'payment' ? r.payment.done : r[key].signed;
}
export const stagesDone = (r: ServiceRecord) => STAGES.filter(s => isStageDone(r, s.key)).length;

export function statusOf(r: ServiceRecord): { key: StatusKey; label: string; tone: (typeof STATUS)[StatusKey]['tone']; done: number } {
  const done = stagesDone(r);
  const key: StatusKey = done === 0 ? 'not_started' : done === STAGE_COUNT ? 'completed' : 'in_progress';
  return { key, ...STATUS[key], done, label: key === 'in_progress' ? `Stage ${done + 1} of ${STAGE_COUNT}` : STATUS[key].label };
}

/** The first stage not yet complete, or null when all are. */
export const nextStage = (r: ServiceRecord) => STAGES.find(s => !isStageDone(r, s.key)) ?? null;

/** What the person filling in a stage edits. `extra` is the GRV number (stores) or the payment reference (payment). */
export interface StageDraft { done: boolean; by: string; date: string; comments: string; extra: string }

export function stageToDraft(r: ServiceRecord, key: StageKey): StageDraft {
  if (key === 'payment') { const p = r.payment; return { done: p.done, by: p.paid_by, date: p.payment_date, comments: p.comments, extra: p.payment_reference }; }
  const s: StageData | StoresStage = r[key];
  return { done: s.signed, by: s.signed_by, date: s.signed_date, comments: s.comments, extra: 'grv_number' in s ? s.grv_number : '' };
}

/** The record with one stage replaced by the draft. The other stages are untouched. */
export function withStage(r: ServiceRecord, key: StageKey, d: StageDraft): ServiceRecord {
  if (key === 'payment') {
    const payment: PaymentStage = { done: d.done, paid_by: d.by.trim(), payment_date: d.date, payment_reference: d.extra.trim(), comments: d.comments.trim() };
    return { ...r, payment };
  }
  const base: StageData = { signed: d.done, signed_by: d.by.trim(), signed_date: d.date, comments: d.comments.trim() };
  return { ...r, [key]: key === 'stores' ? { ...base, grv_number: d.extra.trim() } : base };
}

/** A completed stage needs to say who and when, or the record shows a tick nobody can account for. */
export function stageProblem(d: StageDraft): string | null {
  if (!d.done) return null;
  if (!d.by.trim()) return 'Enter who approved this stage.';
  if (!d.date) return 'Enter the date it was approved.';
  return null;
}

export interface ServiceFilters { search: string; category: string; status: '' | StatusKey; from: string; to: string }
export const NO_FILTERS: ServiceFilters = { search: '', category: '', status: '', from: '', to: '' };
export const isFiltered = (f: ServiceFilters) => f.search.trim() !== '' || f.category !== '' || f.status !== '' || f.from !== '' || f.to !== '';

export function filterRecords(records: ServiceRecord[], f: ServiceFilters): ServiceRecord[] {
  const q = f.search.trim().toLowerCase();
  return records.filter(r => {
    if (q && ![r.description, r.supplier, r.requisition_number, r.invoice_number, r.order_number, r.stores.grv_number, r.contact_person].some(v => v.toLowerCase().includes(q))) return false;
    if (f.from && r.date < f.from) return false;
    if (f.to && r.date > f.to) return false;
    if (f.category && r.category !== f.category) return false;
    if (f.status && statusOf(r).key !== f.status) return false;
    return true;
  });
}

export type SortKey = 'newest' | 'oldest' | 'date_desc' | 'date_asc' | 'supplier' | 'progress_desc';
export function sortRecords(records: ServiceRecord[], key: SortKey): ServiceRecord[] {
  const by: Record<SortKey, (a: ServiceRecord, b: ServiceRecord) => number> = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    oldest: (a, b) => a.created_at.localeCompare(b.created_at),
    date_desc: (a, b) => b.date.localeCompare(a.date),
    date_asc: (a, b) => a.date.localeCompare(b.date),
    supplier: (a, b) => a.supplier.localeCompare(b.supplier),
    progress_desc: (a, b) => stagesDone(b) - stagesDone(a),
  };
  return [...records].sort(by[key]);
}

export function summarise(records: ServiceRecord[], now = new Date()) {
  const month = toLocalISODate(now).slice(0, 7);
  const counts = { total: records.length, not_started: 0, in_progress: 0, completed: 0, thisMonth: 0 };
  for (const r of records) { counts[statusOf(r).key] += 1; if (r.date.slice(0, 7) === month) counts.thisMonth += 1; }
  return counts;
}

/** The requisition, order and invoice numbers a record carries, as short labelled strings. */
export function references(r: ServiceRecord): string[] {
  return [r.requisition_number && `REQ ${r.requisition_number}`, r.order_number && `PO ${r.order_number}`, r.invoice_number && `INV ${r.invoice_number}`].filter(Boolean) as string[];
}
