// app/ppe/ppeTypes.ts — the shared PPE-type lens: which kinds of equipment the Due list, the order basket and the choose
// picker show. One state (include/exclude + codes), matched loosely but displayed raw, remembered per browser. The page owns
// the state; DueItems, OrderListView and the basket helpers all read it.
import { PPE_TYPES, typeName } from './ppeMeta';

/** Which types show: the only ones (include) or all except these (exclude). No types chosen means everything. */
export interface TypeFilter { types: string[]; mode: 'include' | 'exclude' }
export const NO_TYPE_FILTER: TypeFilter = { types: [], mode: 'include' };

/** The browser remembers the lens (per device, not per person — there is no server surface for it). */
export const TYPE_FILTER_KEY = 'ppe_type_filter_v1';

/** Match types loosely (case and spacing); display stays raw, so 'Boots' still reads 'Boots'. */
export const normalizePpeType = (t?: string | null) => (t ?? '').trim().toLowerCase();

export function matchesTypeFilter(ppeType: string, f: TypeFilter): boolean {
  if (f.types.length === 0) return true;
  const hit = f.types.some(t => normalizePpeType(t) === normalizePpeType(ppeType));
  return f.mode === 'include' ? hit : !hit;
}

/** Read the remembered lens; anything missing, corrupt or misshapen reads as no filter. Storage is injected so tests hand a fake. */
export function loadTypeFilter(read: (key: string) => string | null): TypeFilter {
  try {
    const v: unknown = JSON.parse(read(TYPE_FILTER_KEY) ?? 'null');
    if (v && typeof v === 'object' && Array.isArray((v as { types?: unknown }).types)
      && (v as { types: unknown[] }).types.every(t => typeof t === 'string')
      && ((v as { mode?: unknown }).mode === 'include' || (v as { mode?: unknown }).mode === 'exclude')) {
      return { types: (v as { types: string[] }).types, mode: (v as { mode: 'include' | 'exclude' }).mode };
    }
  } catch { /* corrupt JSON reads as no filter */ }
  return NO_TYPE_FILTER;
}

/** Remember the lens; a storage failure keeps it until the page closes. */
export function saveTypeFilter(write: (key: string, value: string) => void, f: TypeFilter): void {
  try { write(TYPE_FILTER_KEY, JSON.stringify(f)); } catch { /* kept until the page closes */ }
}

export interface TypeOption { value: string; label: string; count?: number }

/** The lens choices: types in the given records (with counts) plus the rest of the vocabulary (shown, no count), by label.
 * Records merge loosely ('Cap_lamp_belt' joins 'cap_lamp_belt'); the first-seen code is the value. Counts count what is
 * passed in — the page passes active records. Unknown codes display raw. */
export function typeOptions(records: { ppe_type: string }[]): TypeOption[] {
  const seen = new Map<string, { raw: string; count: number }>();
  for (const r of records) {
    const key = normalizePpeType(r.ppe_type);
    if (!key) continue;
    const at = seen.get(key);
    if (at) at.count += 1; else seen.set(key, { raw: r.ppe_type, count: 1 });
  }
  const options: TypeOption[] = [...seen.values()].map(({ raw, count }) => ({ value: raw, label: typeName(raw), count }));
  for (const key of Object.keys(PPE_TYPES)) {
    if (!seen.has(normalizePpeType(key))) options.push({ value: key, label: typeName(key) });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
