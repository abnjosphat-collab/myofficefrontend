// hooks/useLookups.ts — shared autocomplete/data-source hooks. `useEmployees`,
// `useEquipment`, `useSpares` were copy-pasted into 6+ pages (maintenance, near_miss,
// overtime, sheq_inspection, vfl, work_stoppage…), each with the same module-level
// cache + fetch. Consolidated here: one cached fetch per resource, shared across every
// page that needs the picker. On failure they retry on the next mount (they don't
// permanently disable themselves) and log a warning rather than failing silently.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { EquipmentBase } from '@/app/equipment/types';

// Field sets are the union of what the consuming pages (maintenance, near_miss,
// overtime, sheq_inspection, vfl, work_stoppage) actually read off these records —
// all optional so a partial API row never breaks a picker.
export interface EmployeeLookup {
  id: string | number;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  designation?: string;
  position?: string;
  department?: string;
  section?: string;
  email?: string;
  phone?: string;
  [k: string]: unknown;
}
// Equipment's shape lives in app/equipment/types.ts (mirrors the backend's
// EquipmentBase/EquipmentItem split) — re-exported here under the lookup-hook
// naming convention the other pickers use, rather than a second, looser
// definition drifting out of sync with it.
export type EquipmentLookup = EquipmentBase;
export interface SpareLookup {
  id: string | number;
  name?: string;
  stock_code?: string;
  part_number?: string;
  description?: string;
  quantity?: number;
  current_quantity?: number;
  unit_price?: number;
  unit_of_measure?: string;
  category?: string;
  [k: string]: unknown;
}

// Module-level caches shared across all component instances (a picker opened on many
// pages fetches once per session, not once per mount).
let _emp: EmployeeLookup[] | null = null;
let _eq: EquipmentLookup[] | null = null;
let _sp: SpareLookup[] | null = null;

// In-flight promises, keyed by label. Caching only the *result* meant every
// picker that mounted before the first fetch resolved fired its own duplicate
// request — a modal with three employee pickers made three (visible as 8
// parallel /api/employees calls when the create-work-order modal opened).
// Sharing the promise means one fetch, and every waiting instance gets the
// data the moment it lands.
const _inflight = new Map<string, Promise<unknown[]>>();

function useLookup<T>(cacheGet: () => T[] | null, cacheSet: (v: T[]) => void, load: () => Promise<T[]>, label: string): T[] {
  const [list, setList] = useState<T[]>(cacheGet() ?? []);
  useEffect(() => {
    if (cacheGet()) return; // already loaded this session
    let p = _inflight.get(label) as Promise<T[]> | undefined;
    if (!p) {
      p = load();
      _inflight.set(label, p as Promise<unknown[]>);
      // Clear on settle so a failure retries on the next mount instead of
      // every future mount awaiting a forever-rejected promise.
      p.finally(() => _inflight.delete(label)).catch(() => {});
    }
    let cancelled = false;
    p.then((items) => { cacheSet(items); if (!cancelled) setList(items); })
      .catch((e) => console.warn(`Failed to load ${label}:`, e)); // retries next mount
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return list;
}

export function useEmployees(): EmployeeLookup[] {
  return useLookup<EmployeeLookup>(
    () => _emp, (v) => { _emp = v; },
    async () => {
      const d = await api.get<unknown>('/api/employees');
      return Array.isArray(d) ? (d as EmployeeLookup[]) : [];
    },
    'employees',
  );
}

// This cache has no TTL — it's fetched once per browser session and never expires on
// its own. An edit on the Employees page (new hire, changed phone/section/etc.) would
// otherwise stay invisible to every other page's employee picker (leaves, overtime,
// maintenance, ...) until a full page reload. Called from useEmployeesData.ts's
// saveEmployee/removeEmployee right after a successful write.
export function invalidateEmployeesCache(): void {
  _emp = null;
}

export function useEquipment(): EquipmentLookup[] {
  return useLookup<EquipmentLookup>(
    () => _eq, (v) => { _eq = v; },
    async () => {
      const d = await api.get<unknown>('/api/equipment');
      return Array.isArray(d) ? (d as EquipmentLookup[]) : [];
    },
    'equipment',
  );
}

export function useSpares(): SpareLookup[] {
  return useLookup<SpareLookup>(
    () => _sp, (v) => { _sp = v; },
    async () => {
      const d = await api.get<unknown>('/api/spares?limit=500');
      if (Array.isArray(d)) return d as SpareLookup[];
      const results = (d as { results?: SpareLookup[] })?.results;
      return Array.isArray(results) ? results : [];
    },
    'spares',
  );
}

// Generic "pick from a growing list, or type a new value" backing hook — one cache
// per list name (backend/app/routers/lookup_lists.py, table lookup_lists), so any
// number of distinct lists (breakdown_location, breakdown_nature, and whatever
// comes next) share this one mechanism instead of each getting bespoke plumbing.
const _lookupLists = new Map<string, string[]>();

export function useLookupList(listName: string): string[] {
  return useLookup<string>(
    () => _lookupLists.get(listName) ?? null, (v) => { _lookupLists.set(listName, v); },
    async () => {
      const d = await api.get<unknown>(`/api/lookup-lists/${encodeURIComponent(listName)}`);
      return Array.isArray(d) ? (d as { value: string }[]).map(x => x.value) : [];
    },
    `lookup:${listName}`,
  );
}
