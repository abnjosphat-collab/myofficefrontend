import { describe, expect, it } from 'vitest';
import { clampPage, compareValues, nextSort, pageRangeLabel, pageSlice, pruneSelection, selectionState, sortRows, toggleAllVisible, toggleOne } from './tableLogic';

describe('nextSort', () => {
  it('cycles asc, desc, none on the same column and restarts on a new one', () => {
    const a = nextSort(null, 'name');
    expect(a).toEqual({ id: 'name', direction: 'asc' });
    const b = nextSort(a, 'name');
    expect(b).toEqual({ id: 'name', direction: 'desc' });
    expect(nextSort(b, 'name')).toBeNull();
    expect(nextSort(b, 'date')).toEqual({ id: 'date', direction: 'asc' });
  });
});

describe('sortRows', () => {
  const rows = [
    { id: 'WO-10', hours: 4 }, { id: 'WO-9', hours: null }, { id: 'WO-2', hours: 12 }, { id: 'WO-1', hours: 0 },
  ];
  const get = (row: (typeof rows)[number], column: string) => (row as Record<string, unknown>)[column];
  it('sorts natural text so WO-9 comes before WO-10', () => {
    expect(sortRows(rows, { id: 'id', direction: 'asc' }, get).map(r => r.id)).toEqual(['WO-1', 'WO-2', 'WO-9', 'WO-10']);
  });
  it('sorts numbers numerically (not as text) and keeps blanks last in both directions', () => {
    expect(sortRows(rows, { id: 'hours', direction: 'asc' }, get).map(r => r.hours)).toEqual([0, 4, 12, null]);
    expect(sortRows(rows, { id: 'hours', direction: 'desc' }, get).map(r => r.hours)).toEqual([12, 4, 0, null]);
  });
  it('treats zero as a real value, not blank', () => {
    expect(compareValues(0, null)).toBeLessThan(0);
  });
  it('is stable and never mutates its input', () => {
    const input = [{ k: 'a', n: 1 }, { k: 'b', n: 1 }, { k: 'c', n: 1 }];
    const copy = [...input];
    const out = sortRows(input, { id: 'n', direction: 'desc' }, (r, c) => (r as Record<string, unknown>)[c]);
    expect(out.map(r => r.k)).toEqual(['a', 'b', 'c']);
    expect(input).toEqual(copy);
  });
  it('returns a copy in original order when there is no sort', () => {
    const out = sortRows(rows, null, get);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });
});

describe('selection', () => {
  const ids = ['a', 'b', 'c'];
  it('reports none / some / all over the visible rows only', () => {
    expect(selectionState(ids, new Set())).toBe('none');
    expect(selectionState(ids, new Set(['a']))).toBe('some');
    expect(selectionState(ids, new Set(ids))).toBe('all');
    expect(selectionState(ids, new Set(['x']))).toBe('none');
    expect(selectionState([], new Set(['a']))).toBe('none');
  });
  it('header toggle selects all visible, then clears only the visible ones', () => {
    const afterAll = toggleAllVisible(ids, new Set(['z']));
    expect([...afterAll].sort()).toEqual(['a', 'b', 'c', 'z']);
    const cleared = toggleAllVisible(ids, afterAll);
    expect([...cleared]).toEqual(['z']); // off-page selection survives
  });
  it('partial selection then header toggle completes the selection', () => {
    expect(selectionState(ids, toggleAllVisible(ids, new Set(['a'])))).toBe('all');
  });
  it('toggles a single row without mutating the original set', () => {
    const original = new Set(['a']);
    const next = toggleOne('b', original);
    expect([...original]).toEqual(['a']);
    expect([...next].sort()).toEqual(['a', 'b']);
    expect([...toggleOne('a', next)]).toEqual(['b']);
  });
  it('prunes selections that no longer exist after a filter or refresh', () => {
    expect([...pruneSelection(new Set(['a', 'gone']), ['a', 'b'])]).toEqual(['a']);
  });
});

describe('paging', () => {
  const rows = Array.from({ length: 53 }, (_, i) => i + 1);
  it('slices pages and clamps out-of-range requests', () => {
    expect(pageSlice(rows, 1, 25)).toHaveLength(25);
    expect(pageSlice(rows, 3, 25)).toEqual([51, 52, 53]);
    expect(pageSlice(rows, 99, 25)).toEqual([51, 52, 53]);
    expect(pageSlice(rows, 0, 25)[0]).toBe(1);
    expect(clampPage(Number.NaN, 53, 25)).toBe(1);
  });
  it('labels the visible window', () => {
    expect(pageRangeLabel(1, 53, 25)).toBe('1–25 of 53');
    expect(pageRangeLabel(3, 53, 25)).toBe('51–53 of 53');
    expect(pageRangeLabel(1, 0, 25)).toBe('0 of 0');
  });
});
