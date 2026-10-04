// app/spares/stock.ts — pure rules for the spares register and the requisition builder: how well stocked a part is, the filters and
// sort, the headline numbers and category breakdown, and the requisition's totals, saved form and copy-to-clipboard text.
import type { Tone } from '@/components/ui-system';
import type { ReqHeader, ReqLine, SavedRequisition, Spare } from './types';

export type StockKey = 'out' | 'low' | 'adequate' | 'in';
export const STOCK: Record<StockKey, { label: string; tone: Tone }> = {
  out: { label: 'Out of stock', tone: 'danger' }, low: { label: 'Low stock', tone: 'warning' }, adequate: { label: 'Adequate', tone: 'info' }, in: { label: 'In stock', tone: 'success' },
};
/** Out at zero, low at or below the minimum, adequate up to 1.5 times it, in stock above that. */
export function stockKey(current: number, min: number): StockKey {
  if (current <= 0) return 'out';
  if (current <= min) return 'low';
  return current <= min * 1.5 ? 'adequate' : 'in';
}
export const stockOf = (s: Pick<Spare, 'current_quantity' | 'min_quantity'>) => { const key = stockKey(s.current_quantity, s.min_quantity); return { key, ...STOCK[key] }; };

export const PRIORITY: Record<Spare['priority'], { label: string; tone: Tone; rank: number }> = {
  critical: { label: 'Critical', tone: 'danger', rank: 0 }, high: { label: 'High', tone: 'warning', rank: 1 }, medium: { label: 'Medium', tone: 'info', rank: 2 }, low: { label: 'Low', tone: 'neutral', rank: 3 },
};
export const priorityMeta = (p: string) => PRIORITY[p as Spare['priority']] ?? PRIORITY.medium;

/** A spare as the server sends it, with the numbers made numbers (some arrive as text or null). */
export function normalizeSpare(raw: Spare): Spare {
  return { ...raw, current_quantity: Number(raw.current_quantity ?? 0), min_quantity: Number(raw.min_quantity ?? 1), max_quantity: Number(raw.max_quantity ?? 5), unit_price: Number(raw.unit_price ?? 0), categories: raw.categories ?? [] };
}
export const categoriesOf = (s: Pick<Spare, 'category' | 'categories'>): string[] => (s.categories && s.categories.length > 0 ? s.categories : s.category ? [s.category] : []);
export const lineValue = (qty: number, price: number) => Math.round(qty * price * 100) / 100;

export type StockFilter = 'all' | StockKey | 'safety';
export interface SpareFilters { search: string; stock: StockFilter; category: string; priority: string; favouritesOnly: boolean }
export const NO_FILTERS: SpareFilters = { search: '', stock: 'all', category: 'all', priority: 'all', favouritesOnly: false };
export const isFiltered = (f: SpareFilters) => f.search.trim() !== '' || f.stock !== 'all' || f.category !== 'all' || f.priority !== 'all' || f.favouritesOnly;

export function filterSpares(spares: Spare[], f: SpareFilters, favourites: ReadonlySet<number>): Spare[] {
  const q = f.search.trim().toLowerCase();
  return spares.filter(s => {
    if (f.favouritesOnly && !favourites.has(s.id)) return false;
    if (f.category !== 'all' && !categoriesOf(s).includes(f.category)) return false;
    if (f.priority !== 'all' && s.priority !== f.priority) return false;
    if (f.stock === 'safety' ? !s.safety_stock : f.stock !== 'all' && stockOf(s).key !== f.stock) return false;
    return !q || [s.stock_code, s.description, categoriesOf(s).join(' '), s.supplier, s.notes, s.machine_type, s.storage_location].some(v => (v || '').toLowerCase().includes(q));
  });
}

export type SortKey = 'stock_code' | 'description' | 'current_quantity' | 'unit_price' | 'status' | 'priority';
/** Sorted by the chosen column; favourites float to the top when there are any, keeping that order within each half. */
export function sortSpares(spares: Spare[], key: SortKey, dir: 'asc' | 'desc', favourites: ReadonlySet<number>): Spare[] {
  const value = (s: Spare): string | number => (key === 'status' ? stockOf(s).key : key === 'priority' ? priorityMeta(s.priority).rank : key === 'description' || key === 'stock_code' ? String(s[key] ?? '').toLowerCase() : Number(s[key] ?? 0));
  const sign = dir === 'asc' ? 1 : -1;
  const out = [...spares].sort((a, b) => { const x = value(a), y = value(b); return x === y ? 0 : (x > y ? 1 : -1) * sign; });
  return favourites.size > 0 ? out.sort((a, b) => Number(favourites.has(b.id)) - Number(favourites.has(a.id))) : out;
}

export function summarise(spares: Spare[]) {
  const cats = new Set<string>();
  let value = 0, out = 0, low = 0, safety = 0;
  for (const s of spares) {
    categoriesOf(s).forEach(c => cats.add(c));
    value += lineValue(s.current_quantity, s.unit_price);
    const k = stockOf(s).key; if (k === 'out') out += 1; else if (k === 'low') low += 1;
    if (s.safety_stock) safety += 1;
  }
  return { total: spares.length, out, low, safety, value, categories: cats.size };
}

export function categoryBreakdown(spares: Spare[]) {
  const map = new Map<string, { count: number; value: number; out: number; low: number }>();
  for (const s of spares) {
    const k = stockOf(s).key;
    for (const cat of categoriesOf(s).length ? categoriesOf(s) : ['Uncategorised']) {
      const d = map.get(cat) ?? { count: 0, value: 0, out: 0, low: 0 };
      d.count += 1; d.value += lineValue(s.current_quantity, s.unit_price);
      if (k === 'out') d.out += 1; else if (k === 'low') d.low += 1;
      map.set(cat, d);
    }
  }
  return [...map.entries()].map(([cat, d]) => ({ cat, ...d, pct: spares.length ? Math.round((d.count / spares.length) * 100) : 0 })).sort((a, b) => b.count - a.count || a.cat.localeCompare(b.cat));
}

// ── The requisition ──────────────────────────────────────────────────────────────────────────────────────
export const DEFAULT_HEADER: ReqHeader = { requester: '', reason: '', urgency: 'routine', priority: 'medium', required_for: '' };
export const filled = (lines: ReqLine[]) => lines.filter(l => l.spare && l.qty > 0);
export const requisitionTotal = (lines: ReqLine[]) => filled(lines).reduce((s, l) => s + lineValue(l.qty, l.spare!.unit_price), 0);

export function toSaved(name: string, header: ReqHeader, lines: ReqLine[]): SavedRequisition {
  return {
    id: '', name: name.trim(), saved_at: new Date().toISOString(), header,
    lines: filled(lines).map(l => ({ spare_id: l.spare!.id, stock_code: l.spare!.stock_code, description: l.spare!.description, unit_of_measure: l.spare!.unit_of_measure, unit_price: l.spare!.unit_price, qty: l.qty })),
    grand_total: requisitionTotal(lines),
  };
}

/** A saved requisition back as editable lines. A part no longer in the register is rebuilt from what was saved so nothing is lost. */
export function linesFromSaved(saved: SavedRequisition, spares: Spare[], newId: () => string): ReqLine[] {
  return saved.lines.map(l => ({
    id: newId(), qty: l.qty, searchValue: l.stock_code, dropdownOpen: false,
    spare: spares.find(s => s.id === l.spare_id) ?? { id: l.spare_id, stock_code: l.stock_code, description: l.description, unit_of_measure: l.unit_of_measure || 'UN', unit_price: l.unit_price, current_quantity: 0, min_quantity: 0, max_quantity: 0, priority: 'medium', safety_stock: false },
  }));
}

/** Tab-separated, ready to paste into a spreadsheet or an email. */
export function requisitionText(lines: ReqLine[], money: (n: number) => string): string {
  const rows = filled(lines).map(l => [l.spare!.stock_code, l.spare!.description, l.spare!.unit_of_measure || 'UN', l.qty, money(l.spare!.unit_price), money(lineValue(l.qty, l.spare!.unit_price))].join('\t')).join('\n');
  return `Stock Code\tDescription\tUoM\tQty\tUnit Price\tTotal\n${rows}\n\nGRAND TOTAL: ${money(requisitionTotal(lines))}`;
}
