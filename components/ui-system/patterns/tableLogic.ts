/** Pure selection / sorting / paging logic shared by every table, card list and register. */

export type SortDirection = 'asc' | 'desc';
export type SortState = { id: string; direction: SortDirection } | null;

/** Cycle asc → desc → none when the same column is activated; a new column starts ascending. */
export function nextSort(current: SortState, columnId: string): SortState {
  if (!current || current.id !== columnId) return { id: columnId, direction: 'asc' };
  if (current.direction === 'asc') return { id: columnId, direction: 'desc' };
  return null;
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** Null/undefined/'' always sort last regardless of direction; numbers compare numerically, text naturally ("WO-9" < "WO-10"). */
export function compareValues(a: unknown, b: unknown): number {
  const blank = (v: unknown) => v === null || v === undefined || v === '';
  if (blank(a) && blank(b)) return 0;
  if (blank(a)) return 1;
  if (blank(b)) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return collator.compare(String(a), String(b));
}

/** Stable sort; never mutates the input. */
export function sortRows<T>(rows: readonly T[], sort: SortState, accessor: (row: T, columnId: string) => unknown): T[] {
  if (!sort) return [...rows];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: accessor(row, sort.id) }))
    .sort((x, y) => {
      const blankX = x.value === null || x.value === undefined || x.value === '';
      const blankY = y.value === null || y.value === undefined || y.value === '';
      if (blankX !== blankY) return blankX ? 1 : -1; // blanks last in both directions
      return sign * compareValues(x.value, y.value) || x.index - y.index;
    })
    .map(entry => entry.row);
}

export type SelectionState = 'none' | 'some' | 'all';

export function selectionState(visibleIds: readonly string[], selected: ReadonlySet<string>): SelectionState {
  if (visibleIds.length === 0) return 'none';
  const count = visibleIds.filter(id => selected.has(id)).length;
  return count === 0 ? 'none' : count === visibleIds.length ? 'all' : 'some';
}

/** Header checkbox: all visible → clear them; otherwise select them all. Selections outside the visible set are kept. */
export function toggleAllVisible(visibleIds: readonly string[], selected: ReadonlySet<string>): Set<string> {
  const next = new Set(selected);
  if (selectionState(visibleIds, selected) === 'all') visibleIds.forEach(id => next.delete(id));
  else visibleIds.forEach(id => next.add(id));
  return next;
}

export function toggleOne(id: string, selected: ReadonlySet<string>): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

/** Drop selected ids that no longer exist (e.g. after a filter or refresh), so bulk actions never act on invisible rows. */
export function pruneSelection(selected: ReadonlySet<string>, existingIds: readonly string[]): Set<string> {
  const exist = new Set(existingIds);
  return new Set([...selected].filter(id => exist.has(id)));
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), pageCount(total, pageSize));
}

export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const p = clampPage(page, rows.length, pageSize);
  return rows.slice((p - 1) * pageSize, p * pageSize);
}

/** "1–25 of 312" label for the visible window. */
export function pageRangeLabel(page: number, total: number, pageSize: number): string {
  if (total === 0) return '0 of 0';
  const p = clampPage(page, total, pageSize);
  return `${(p - 1) * pageSize + 1}–${Math.min(p * pageSize, total)} of ${total}`;
}
