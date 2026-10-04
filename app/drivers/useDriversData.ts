// app/drivers/useDriversData.ts — the drivers registry's data-fetching layer:
// single-resource CRUD plus a hook owning the driver list and its loading/refreshing
// flags. Split out of page.tsx as part of the standing "decompose on touch" convention.
// One resource, one load(quiet) cycle — same shape as sheq_inspection.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { Driver } from './types';

export async function getDrivers(): Promise<Driver[]> {
  return api.get<Driver[]>('/api/drivers?limit=2000');
}
export async function createDriver(payload: object): Promise<Driver> {
  return api.post<Driver>('/api/drivers', payload);
}
export async function updateDriver(id: number, payload: object): Promise<Driver> {
  // PATCH, not PUT — the backend migrated to CrudRouter (app/crud_router.py), whose
  // update endpoint is a partial update (exclude_unset semantics), matching PATCH's
  // actual meaning better than the original hand-written router's PUT.
  return api.patch<Driver>(`/api/drivers/${id}`, payload);
}
export async function deleteDriver(id: number): Promise<void> {
  await api.delete(`/api/drivers/${id}`);
}

export function useDriversData() {
  const list = useApiList<Driver>('/api/drivers?limit=2000');
  return { drivers: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, loadData: list.refetch };
}
