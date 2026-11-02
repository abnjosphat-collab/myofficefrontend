// app/ppe/calcIssueLog.ts — the Issue Log is a filtered view of the PPE event log: newest movement first, narrowed by
// kind, effective-date range, item, cost centre at issue and free text. Imported opening observations (quantity
// unknown) are marked, never counted as issued quantities and never edited in place.
import { normalizeSection } from '@/lib/sections';
import type { PPEEvent } from './types';

export type IssueLogKind = 'issue' | 'return' | 'correction';

export interface IssueLogFilters {
  from: string; to: string;
  kinds: IssueLogKind[];
  item: string;
  costCentre: string;
  search: string;
  showOpening: boolean;
}

export const NO_ISSUE_LOG_FILTERS: IssueLogFilters = {
  from: '', to: '', kinds: [], item: 'all', costCentre: 'all', search: '', showOpening: true,
};

export const KIND_LABELS: Record<IssueLogKind, string> = { issue: 'Issue', return: 'Return', correction: 'Correction' };

/** An imported opening observation, not a signed issue: the source badge explains the unknown quantity. */
export const openingObservation = (e: PPEEvent): boolean =>
  (e.evidence as Record<string, unknown> | null)?.opening_observation === true;

const matchesText = (e: PPEEvent, search: string): boolean => {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return e.employee_id.toLowerCase().includes(q);
};

export function filterIssueLog(events: readonly PPEEvent[], f: IssueLogFilters): PPEEvent[] {
  const from = f.from || '0000-00-00';
  const to = f.to || '9999-99-99';
  return [...events]
    .filter(e => (f.kinds.length === 0 || f.kinds.includes(e.kind))
      && e.effective_date >= from && e.effective_date <= to
      && (f.item === 'all' || e.ppe_type === f.item)
      && (f.costCentre === 'all' || normalizeSection(e.section) === f.costCentre)
      && (f.showOpening || !openingObservation(e))
      && matchesText(e, f.search))
    .sort((a, b) => (a.effective_date < b.effective_date ? 1 : a.effective_date > b.effective_date ? -1 : b.id.localeCompare(a.id)));
}

/** Each cost centre that movements were recorded in, with counts — for the filter options. */
export function costCentreOptions(events: readonly PPEEvent[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const s = normalizeSection(e.section) || 'Unassigned';
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
