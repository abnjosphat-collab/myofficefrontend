// hooks/useLookups.ts — shared autocomplete/data-source hooks. `useEmployees`,
// `useEquipment`, `useSpares` were copy-pasted into 6+ pages (maintenance, near_miss,
// overtime, sheq_inspection, vfl, work_stoppage…), each with the same module-level
// cache + fetch. Consolidated here: one cached fetch per resource, shared across every
// page that needs the picker. On failure they retry on the next mount (they don't
// permanently disable themselves) and log a warning rather than failing silently.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { withDepartment } from '@/lib/api';
import { retryTransient } from '@/lib/transientRetry';

/** A lookup read waits out a slow or waking service instead of leaving the picker empty. */
const read = <T,>(path: string) => retryTransient(() => api.get<T>(path));
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
// pages fetches once, not once per mount) — but they expire: a record added
// elsewhere appears without a reload (F-17). The window matches the server's
// 60 s response cache, so a refetch actually sees new rows.
const LOOKUP_TTL_MS = 60_000;
let _emp: EmployeeLookup[] | null = null;
let _eq: EquipmentLookup[] | null = null;
let _sp: SpareLookup[] | null = null;
let _empAt = 0;
let _eqAt = 0;
let _spAt = 0;
// Department registers (Mining) get their own cache entries: a Mining picker
// must never see Engineering rows a previous visit left behind, or vice versa.
const _empDept = new Map<string, EmployeeLookup[]>();
const _empDeptAt = new Map<string, number>();
// Bumped whenever the signed-in account changes: an in-flight fetch from the
// previous account must not land in the new account's cache (or pickers).
let _accountGen = 0;

// In-flight promises, keyed by label. Caching only the *result* meant every
// picker that mounted before the first fetch resolved fired its own duplicate
// request — a modal with three employee pickers made three (visible as 8
// parallel /api/employees calls when the create-work-order modal opened).
// Sharing the promise means one fetch, and every waiting instance gets the
// data the moment it lands.
const _inflight = new Map<string, Promise<unknown[]>>();

// A list whose cache was cleared (see invalidateSparesCache) is read again by every picker that is showing it.
const _listeners = new Map<string, Set<() => void>>();
const refreshLookup = (label: string) => _listeners.get(label)?.forEach(fn => fn());

function useLookup<T>(cacheGet: () => T[] | null, cacheSet: (v: T[]) => void, load: () => Promise<T[]>, label: string, stampGet: () => number, stampSet: (v: number) => void): T[] {
  const [list, setList] = useState<T[]>(cacheGet() ?? []);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    const set = _listeners.get(label) ?? new Set<() => void>();
    set.add(bump); _listeners.set(label, set);
    return () => { set.delete(bump); };
  }, [label]);
  // A stale cache keeps showing while the refetch lands (never a flash to empty).
  useEffect(() => {
    const cached = cacheGet();
    if (cached !== null && Date.now() - stampGet() < LOOKUP_TTL_MS) return; // fresh cache
    let p = _inflight.get(label) as Promise<T[]> | undefined;
    if (!p) {
      p = load();
      _inflight.set(label, p as Promise<unknown[]>);
      // Clear on settle so a failure retries on the next mount instead of
      // every future mount awaiting a forever-rejected promise.
      p.finally(() => _inflight.delete(label)).catch(() => {});
    }
    let cancelled = false;
    const gen = _accountGen;
    p.then((items) => { if (gen !== _accountGen) return; cacheSet(items); stampSet(Date.now()); if (!cancelled) setList(items); })
      .catch((e) => console.warn(`Failed to load ${label}:`, e)); // retries next mount
    return () => { cancelled = true; };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  // A colleague may have added records while this tab sat in the background.
  useEffect(() => {
    const onFocus = () => {
      if (cacheGet() === null || Date.now() - stampGet() >= LOOKUP_TTL_MS) setVersion(v => v + 1);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [label]); // eslint-disable-line react-hooks/exhaustive-deps
  return list;
}

/** Pass a department to read that register (Mining) instead of Engineering. */
export function useEmployees(department?: string | null): EmployeeLookup[] {
  const label = department ? `employees:dept:${department}` : 'employees';
  const all = useLookup<EmployeeLookup>(
    () => (department ? (_empDept.get(department) ?? null) : _emp),
    (v) => { if (department) _empDept.set(department, v); else _emp = v; },
    async () => {
      const d = await read<unknown>(withDepartment('/api/employees', department));
      return Array.isArray(d) ? (d as EmployeeLookup[]) : [];
    },
    label,
    () => (department ? (_empDeptAt.get(department) ?? 0) : _empAt),
    (v) => { if (department) _empDeptAt.set(department, v); else _empAt = v; },
  );
  return all.filter(e => e.archived !== true);
}

/**
 * The whole employee register, archived people included, and whether it has loaded. For checking that a
 * record belongs to someone on the register: an archived person is still on it, and nothing may be judged
 * "not on the register" while the register itself is unknown. Pass a department to check against that
 * register (Mining) instead of Engineering.
 */
export function useEmployeeRegister(department?: string | null): { employees: EmployeeLookup[]; loaded: boolean } {
  const label = department ? `employees:dept:${department}` : 'employees';
  const all = useLookup<EmployeeLookup>(
    () => (department ? (_empDept.get(department) ?? null) : _emp),
    (v) => { if (department) _empDept.set(department, v); else _emp = v; },
    async () => {
      const d = await read<unknown>(withDepartment('/api/employees', department));
      return Array.isArray(d) ? (d as EmployeeLookup[]) : [];
    },
    label,
    () => (department ? (_empDeptAt.get(department) ?? 0) : _empAt),
    (v) => { if (department) _empDeptAt.set(department, v); else _empAt = v; },
  );
  const cache = department ? _empDept.get(department) ?? null : _emp;
  return { employees: all, loaded: cache !== null };
}

// An edit on the Employees page (new hire, changed phone/section/etc.) clears the
// cache at once instead of waiting out the TTL. Called from
// useEmployeesData.ts's saveEmployee/removeEmployee right after a successful
// write. (A null cache refetches on next read regardless of its stamp.)
export function invalidateEmployeesCache(): void {
  _emp = null;
  const depts = [..._empDept.keys()];
  _empDept.clear();
  _empDeptAt.clear();
  for (const d of depts) { _inflight.delete(`employees:dept:${d}`); refreshLookup(`employees:dept:${d}`); }
}

// The signed-in account changed: cached rows belong to the previous account
// and may be a different section's slice — drop them so the next read
// refetches as the new account. Called from AuthProvider when the user id
// changes. (The shared lookup-lists catalogue is identical for every
// account, so it is deliberately left alone.)
export function invalidateAllLookupCaches(): void {
  _accountGen += 1;
  _inflight.clear();
  _emp = null; _eq = null; _sp = null;
  _empAt = 0; _eqAt = 0; _spAt = 0;
  _empDept.clear(); _empDeptAt.clear();
  refreshLookup('employees'); refreshLookup('equipment'); refreshLookup('spares');
}

/** Stock quantities changed (an issue was recorded or deleted): the next read of the spares lists gets the new quantities. */
export function invalidateSparesCache(): void {
  _sp = null;
  refreshLookup('spares');
}

export function useEquipment(): EquipmentLookup[] {
  return useLookup<EquipmentLookup>(
    () => _eq, (v) => { _eq = v; },
    async () => {
      const d = await read<unknown>('/api/equipment');
      return Array.isArray(d) ? (d as EquipmentLookup[]) : [];
    },
    'equipment',
    () => _eqAt, (v) => { _eqAt = v; },
  );
}

export function useSpares(): SpareLookup[] {
  return useLookup<SpareLookup>(
    () => _sp, (v) => { _sp = v; },
    async () => {
      const d = await read<unknown>('/api/spares?limit=500');
      if (Array.isArray(d)) return d as SpareLookup[];
      const results = (d as { results?: SpareLookup[] })?.results;
      return Array.isArray(results) ? results : [];
    },
    'spares',
    () => _spAt, (v) => { _spAt = v; },
  );
}

// Generic "pick from a growing list, or type a new value" backing hook — one cache
// per list name (backend/app/routers/lookup_lists.py, table lookup_lists), so any
// number of distinct lists (breakdown_location, breakdown_nature, and whatever
// comes next) share this one mechanism instead of each getting bespoke plumbing.
const _lookupLists = new Map<string, string[]>();
const _lookupListAt = new Map<string, number>();

export function useLookupList(listName: string): string[] {
  return useLookup<string>(
    () => _lookupLists.get(listName) ?? null, (v) => { _lookupLists.set(listName, v); },
    async () => {
      const d = await read<unknown>(`/api/lookup-lists/${encodeURIComponent(listName)}`);
      return Array.isArray(d) ? (d as { value: string }[]).map(x => x.value) : [];
    },
    `lookup:${listName}`,
    () => _lookupListAt.get(listName) ?? 0, (v) => { _lookupListAt.set(listName, v); },
  );
}
