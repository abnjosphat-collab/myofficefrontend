// lib/spareSearch.ts — the one rule for "does this spare match typed text": the stock code, description,
// categories, supplier, notes, machine type and storage location, case-insensitive. Shared by the spares
// register filter, the issue form's picker and the issue page's part lookup, so all three find the same parts.
export interface SearchableSpare {
  stock_code?: string | null;
  description?: string | null;
  category?: string | null;
  categories?: string[] | null;
  supplier?: string | null;
  notes?: string | null;
  machine_type?: string | null;
  storage_location?: string | null;
}

/** An empty query matches everything — callers show the catalogue until the person types. */
export function matchSpare(s: SearchableSpare, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Mirrors categoriesOf in spares/stock (lib cannot import from app): the list wins, else the single value.
  const cats = (s.categories && s.categories.length > 0 ? s.categories : s.category ? [s.category] : []).join(' ');
  return [s.stock_code, s.description, cats, s.supplier, s.notes, s.machine_type, s.storage_location]
    .some(v => (v || '').toLowerCase().includes(q));
}

export const SPARE_SEARCH_LIMIT = 40;

/** The matches for a query, capped so a catalogue of thousands stays fast. `total` is the uncapped count,
 *  so the caller can say "first 40 of 312 — type to narrow" instead of pretending 40 is all there is. */
export function searchSpares<T extends SearchableSpare>(spares: readonly T[], query: string, limit = SPARE_SEARCH_LIMIT): { hits: T[]; total: number } {
  const matches = spares.filter(s => matchSpare(s, query));
  return { hits: matches.slice(0, limit), total: matches.length };
}
