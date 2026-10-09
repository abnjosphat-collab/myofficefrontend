// app/contractors/useContractorsData.ts — the contractor register's data-fetching
// layer: the snake_case→camelCase converter, record fetch/create, and a hook owning
// the contractor list and its load cycle. Split out of page.tsx as part of the
// standing "decompose on touch" convention.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { Contractor, CStatus } from './types';

/** A contractor as /api/contractors returns it (snake_case), with its jobs. */
export interface ContractorRow {
  id: number;
  company_name?: string | null; trade?: string | null; contact_name?: string | null; phone?: string | null;
  status?: string | null; performance_rating?: number | null; contract_end?: string | null; insurance_expiry?: string | null;
  jobs?: { job_title: string; equipment_name?: string | null; start_date?: string | null; status?: string | null }[] | null;
}

export const fromContAPI = (d: ContractorRow): Contractor => ({
  id: d.id, company: d.company_name || '', trade: d.trade || '',
  contact: d.contact_name || '', phone: d.phone || '',
  status: (d.status as CStatus) || 'active', rating: d.performance_rating || 3,
  contractExpiry: d.contract_end || '', insuranceExpiry: d.insurance_expiry || '',
  jobs: (d.jobs || []).map(j => ({ title: j.job_title, location: j.equipment_name || '', startDate: j.start_date || '', progress: j.status === 'completed' ? 100 : j.status === 'in_progress' ? 50 : 0 })),
});

export async function createContractor(body: Record<string, unknown>) {
  return api.post('/api/contractors', body);
}

export function useContractorsData() {
  const list = useApiList<ContractorRow, Contractor>('/api/contractors', fromContAPI);
  return { contractors: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, fetchContractors: list.refetch };
}
