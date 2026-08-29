// app/drivers/useDriversData.ts — the drivers registry's data-fetching layer:
// single-resource CRUD plus a hook owning the driver list and its loading/refreshing
// flags. Split out of page.tsx as part of the standing "decompose on touch" convention.
// One resource, one load(quiet) cycle — same shape as sheq_inspection.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fixed a duplicate-fetch bug while extracting: the original called
  // apiGetDrivers() twice per load (once for an Array.isArray check, again for
  // the value used), doubling every page load's network traffic. Call once.
  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try { const data = await getDrivers(); setDrivers(Array.isArray(data) ? data : []); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  return { drivers, setDrivers, loading, refreshing, loadData };
}
