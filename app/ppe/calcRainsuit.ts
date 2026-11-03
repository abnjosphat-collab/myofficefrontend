// app/ppe/calcRainsuit.ts — the rainsuit register is a filtered view of PPE size requirements: every row keeps its
// source size beside the canonical size, fulfilment is derived (an active rainsuit issue for the mine number), and
// unmatched rows stay visible with no mine number instead of being dropped or guessed.
import type { PPERequirement } from './types';
import { normalizeEmployeeId } from './calcPPE';

export const CANONICAL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
export type CanonicalSize = (typeof CANONICAL_SIZES)[number];

/** Source size label to canonical size. Unknown or blank stays null: never guessed. */
export function normalizeSize(raw: string | null | undefined): CanonicalSize | null {
  if (!raw) return null;
  const match = /\b(XXXL|XXL|XL|L|M|S)\b/i.exec(raw);
  return (match ? match[1].toUpperCase() : null) as CanonicalSize | null;
}

export interface RainsuitSummary {
  counts: Partial<Record<CanonicalSize, number>>;
  unknown: number;
  total: number;
  people: number;
  bySize: (size: string) => number;
}

export function summarizeRequirements(rows: readonly PPERequirement[]): RainsuitSummary {
  const counts: Partial<Record<CanonicalSize, number>> = {};
  let unknown = 0;
  let total = 0;
  for (const row of rows) {
    total += row.quantity;
    const size = row.size_canonical as CanonicalSize | null;
    if (size && (CANONICAL_SIZES as readonly string[]).includes(size)) {
      counts[size] = (counts[size] ?? 0) + row.quantity;
    } else {
      unknown += 1;
    }
  }
  return { counts, unknown, total, people: rows.length, bySize: size => counts[size as CanonicalSize] ?? 0 };
}

export interface DirectoryPerson { employee_id: string; employee_name: string; }

/**
 * The name a row shows: the live register full name wherever the row links by
 * mine number, else the requirement name it arrived with. A near match is
 * never coerced into someone else.
 */
export function resolveRainsuitName(
  row: Pick<PPERequirement, 'employee_id' | 'employee_name' | 'source_name'>,
  directory: readonly DirectoryPerson[],
): string {
  const id = normalizeEmployeeId(row.employee_id ?? '');
  if (id) {
    const found = directory.find(e => normalizeEmployeeId(e.employee_id) === id);
    if (found?.employee_name?.trim()) return found.employee_name;
  }
  return row.employee_name || row.source_name;
}

export interface RainsuitFilters {
  search: string;
  size: string;
  fulfilment: 'all' | 'fulfilled' | 'outstanding';
  showUnmatched: boolean;
}

export const NO_RAINSUIT_FILTERS: RainsuitFilters = { search: '', size: 'all', fulfilment: 'all', showUnmatched: true };

const matchesText = (row: PPERequirement, search: string): boolean => {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.source_name, row.employee_name, row.employee_id ?? ''].some(v => v.toLowerCase().includes(q));
};

export function filterRequirements(rows: readonly PPERequirement[], f: RainsuitFilters): PPERequirement[] {
  return [...rows]
    .filter(row => (f.size === 'all' || row.size_canonical === f.size)
      && (f.fulfilment === 'all'
        || (f.fulfilment === 'fulfilled' ? row.fulfilled : !row.fulfilled))
      && (f.showUnmatched || row.employee_id)
      && matchesText(row, f.search))
    .sort((a, b) => a.source_name.localeCompare(b.source_name));
}
