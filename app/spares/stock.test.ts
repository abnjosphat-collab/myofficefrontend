import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEADER, NO_FILTERS, categoriesOf, categoryBreakdown, filterSpares, isFiltered, linesFromSaved, normalizeSpare, requisitionText, requisitionTotal, sortSpares, stockKey, stockOf, summarise, toSaved,
} from './stock';
import type { ReqLine, Spare } from './types';

const spare = (o: Partial<Spare> = {}): Spare => ({ id: 1, stock_code: 'A1', description: 'Bearing', current_quantity: 10, min_quantity: 2, max_quantity: 20, unit_price: 5, priority: 'medium', safety_stock: false, categories: [], ...o });
const money = (n: number) => `$${n.toFixed(2)}`;

describe('stock status', () => {
  it('is out at zero, low at the minimum, adequate to 1.5 times it, in stock above', () => {
    expect(stockKey(0, 2)).toBe('out');
    expect(stockKey(2, 2)).toBe('low');
    expect(stockKey(3, 2)).toBe('adequate');
    expect(stockKey(4, 2)).toBe('in');
    expect(stockOf(spare({ current_quantity: 0 }))).toMatchObject({ key: 'out', label: 'Out of stock', tone: 'danger' });
  });
  it('makes numbers of text and fills missing fields', () => {
    const s = normalizeSpare({ ...spare(), current_quantity: '7' as unknown as number, unit_price: null as unknown as number, categories: undefined });
    expect(s).toMatchObject({ current_quantity: 7, unit_price: 0, categories: [] });
  });
  it('uses the categories list, falling back to the single legacy category', () => {
    expect(categoriesOf(spare({ categories: ['Pumps'], category: 'Old' }))).toEqual(['Pumps']);
    expect(categoriesOf(spare({ category: 'Old' }))).toEqual(['Old']);
    expect(categoriesOf(spare())).toEqual([]);
  });
});

describe('filter and sort', () => {
  const rows = [
    spare({ id: 1, stock_code: 'B1', description: 'Seal kit', current_quantity: 0, categories: ['Pumps'], priority: 'high', supplier: 'Acme' }),
    spare({ id: 2, stock_code: 'A2', description: 'Belt', current_quantity: 2, categories: ['Belts'], safety_stock: true }),
    spare({ id: 3, stock_code: 'C3', description: 'Gasket', current_quantity: 50, category: 'Pumps', priority: 'low' }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>, fav: number[] = []) => filterSpares(rows, { ...NO_FILTERS, ...f }, new Set(fav)).map(s => s.id);
  it('filters by stock level, safety stock, category, priority, search and favourites', () => {
    expect(ids({})).toEqual([1, 2, 3]);
    expect(ids({ stock: 'out' })).toEqual([1]);
    expect(ids({ stock: 'low' })).toEqual([2]);
    expect(ids({ stock: 'safety' })).toEqual([2]);
    expect(ids({ category: 'Pumps' })).toEqual([1, 3]);
    expect(ids({ priority: 'high' })).toEqual([1]);
    expect(ids({ search: 'acme' })).toEqual([1]);
    expect(ids({ favouritesOnly: true }, [3])).toEqual([3]);
    expect(isFiltered(NO_FILTERS)).toBe(false);
  });
  it('sorts by column either way, favourites first', () => {
    const none = new Set<number>();
    expect(sortSpares(rows, 'stock_code', 'asc', none).map(s => s.id)).toEqual([2, 1, 3]);
    expect(sortSpares(rows, 'current_quantity', 'desc', none).map(s => s.id)).toEqual([3, 2, 1]);
    expect(sortSpares(rows, 'priority', 'asc', none)[0].id).toBe(1);
    expect(sortSpares(rows, 'stock_code', 'asc', new Set([3])).map(s => s.id)).toEqual([3, 2, 1]);
  });
  it('summarises and breaks down by category', () => {
    expect(summarise(rows)).toMatchObject({ total: 3, out: 1, low: 1, safety: 1, categories: 2, value: 260 });
    const b = categoryBreakdown(rows);
    expect(b[0]).toMatchObject({ cat: 'Pumps', count: 2, out: 1, pct: 67 });
    expect(categoryBreakdown([spare()])[0].cat).toBe('Uncategorised');
  });
});

describe('the requisition', () => {
  const line = (id: string, s: Spare | null, qty: number): ReqLine => ({ id, spare: s, searchValue: '', qty, dropdownOpen: false });
  const lines = [line('a', spare({ id: 1, unit_price: 2.5 }), 4), line('b', null, 3), line('c', spare({ id: 2, stock_code: 'Z9', description: 'Hose', unit_price: 10 }), 0), line('d', spare({ id: 3, stock_code: 'Q7', description: 'Clamp', unit_price: 1.25, unit_of_measure: 'EA' }), 2)];
  it('totals only the lines that have a part and a quantity', () => { expect(requisitionTotal(lines)).toBe(12.5); });
  it('saves those lines with the header and total, and loads them back, rebuilding a part no longer in the register', () => {
    const saved = toSaved(' Monthly order ', { ...DEFAULT_HEADER, requester: 'Sam' }, lines);
    expect(saved).toMatchObject({ name: 'Monthly order', grand_total: 12.5, header: { requester: 'Sam' } });
    expect(saved.lines.map(l => l.stock_code)).toEqual(['A1', 'Q7']);
    const back = linesFromSaved(saved, [spare({ id: 1 })], () => 'new');
    expect(back).toHaveLength(2);
    expect(back[0].spare?.id).toBe(1);
    expect(back[1].spare).toMatchObject({ id: 3, stock_code: 'Q7', unit_price: 1.25, unit_of_measure: 'EA' });
  });
  it('renders paste-ready text', () => {
    const t = requisitionText(lines, money);
    expect(t.split('\n')[0]).toBe('Stock Code\tDescription\tUoM\tQty\tUnit Price\tTotal');
    expect(t).toContain('A1\tBearing\tUN\t4\t$2.50\t$10.00');
    expect(t.endsWith('GRAND TOTAL: $12.50')).toBe(true);
  });
});
