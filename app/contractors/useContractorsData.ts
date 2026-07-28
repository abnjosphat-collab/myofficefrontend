// app/contractors/useContractorsData.ts — the contractor register's data-fetching
// layer: the snake_case→camelCase converter, record fetch/create, and a hook owning
// the contractor list and its load cycle. Split out of page.tsx as part of the
// standing "decompose on touch" convention.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Contractor, CStatus } from './types';

export const fromContAPI = (d: any): Contractor => ({
  id: d.id, company: d.company_name || '', trade: d.trade || '',
  contact: d.contact_name || '', phone: d.phone || '',
  status: (d.status as CStatus) || 'active', rating: d.performance_rating || 3,
  contractExpiry: d.contract_end || '', insuranceExpiry: d.insurance_expiry || '',
  jobs: (d.jobs || []).map((j: any) => ({ title: j.job_title, location: j.equipment_name || '', startDate: j.start_date || '', progress: j.status === 'completed' ? 100 : j.status === 'in_progress' ? 50 : 0 })),
});

export async function createContractor(body: Record<string, unknown>) {
  return api.post('/api/contractors', body);
}

export function useContractorsData() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try { setContractors((await api.get<any[]>('/api/contractors')).map(fromContAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContractors(); }, [fetchContractors]);

  return { contractors, loading, fetchContractors };
}
