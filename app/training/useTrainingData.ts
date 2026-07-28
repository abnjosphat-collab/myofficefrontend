// app/training/useTrainingData.ts — the training register's data-fetching layer:
// record CRUD plus a hook wrapping the 3-resource (certs/compliance rate/due
// refreshers) load behind one Promise.all and a single loading/refreshing flag —
// ppe-shaped unified load cycle. Split out of page.tsx as part of the standing
// "decompose on touch" convention.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Certification, ComplianceReport, RefresherItem } from './types';

export async function createCertification(fd: FormData) {
  return api.post('/api/training', fd);
}
export async function updateCertification(id: string | number, fd: FormData) {
  return api.put(`/api/training/${id}`, fd);
}
export async function deleteCertification(id: string | number) {
  return api.delete(`/api/training/${id}`);
}

export function useTrainingData() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [refreshers, setRefreshers] = useState<RefresherItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceReport>({ compliance_rate: 0, total_tracked: 0, non_compliant: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [certsRes, rateRes, refreshRes] = await Promise.all([
        api.get<any>('/api/training').catch(() => null),
        api.get<any>('/api/training/reports/compliance_rate').catch(() => null),
        api.get<any>('/api/training/reports/due_refreshers').catch(() => null),
      ]);
      if (certsRes) setCerts(certsRes);
      if (rateRes) setCompliance(rateRes);
      if (refreshRes) setRefreshers(refreshRes);
    } catch (e) { setError(`Failed to load: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { certs, refreshers, compliance, loading, refreshing, error, setError, fetchAll };
}
