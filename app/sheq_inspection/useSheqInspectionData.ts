// app/sheq_inspection/useSheqInspectionData.ts — the SHEQ inspection page's data-fetching
// layer: single-resource CRUD plus a hook that owns the inspection list and its
// loading/refreshing flags. Split out of page.tsx as part of the standing "decompose on
// touch" convention. One resource, one load cycle — closest precedent is employees.tsx.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { SHEQFormData } from './types';

// Throws on failure — a `catch { return [] }` here would make a server
// outage indistinguishable from "no inspections yet".
export async function getInspections(): Promise<SHEQFormData[]> {
  const data = await api.get<SHEQFormData[]>('/api/sheq/');
  return Array.isArray(data) ? data : [];
}
export async function createInspection(data: Partial<SHEQFormData>): Promise<SHEQFormData> {
  return api.post<SHEQFormData>('/api/sheq/', data);
}
export async function updateInspection(id: string, data: Partial<SHEQFormData>): Promise<SHEQFormData> {
  return api.patch<SHEQFormData>(`/api/sheq/${id}/`, data);
}
export async function deleteInspection(id: string): Promise<void> {
  await api.delete(`/api/sheq/${id}/`);
}

export function useSheqInspectionData() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inspections, setInspections] = useState<SHEQFormData[]>([]);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setInspections(await getInspections()); }
    catch { toast.error('Failed to load inspections'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  return { inspections, setInspections, loading, refreshing, load };
}
