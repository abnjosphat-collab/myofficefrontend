// app/safety_complaints/useSafetyComplaintsData.ts — the safety complaints register's
// data-fetching layer: the camelCase<->snake_case payload converter, record CRUD, and a
// hook owning the complaint list and its loading/refreshing flags. Split out of page.tsx
// as part of the standing "decompose on touch" convention. One resource, one load(quiet)
// cycle — same shape as sheq_inspection.
'use client';

import { useRef, useState } from 'react';
import { api as apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Complaint } from './types';

const BASE = '/api/safety-complaints';

function toSnake(d: Partial<Complaint>): Record<string, unknown> {
  return {
    date: d.date || null,
    raised_by: d.raisedBy || '',
    issue_raised: d.issueRaised || '',
    category: d.category || 'General',
    priority: d.priority || 'medium',
    section: d.section || 'General',
    location: d.location || '',
    action_plan: d.actionPlan || '',
    by_who: d.byWho || '',
    by_when: d.byWhen || null,
    supervisor_name: d.supervisorName || '',
    supervisor_signature: d.supervisorSignature || '',
    date_closed: d.dateClosed || null,
    status: d.status || 'open',
  };
}

export const api = {
  list: () => apiClient.get<Complaint[]>(BASE + '/'),
  create: (d: Partial<Complaint>) => apiClient.post<Complaint>(BASE + '/', toSnake(d)),
  update: (id: string, d: Partial<Complaint>) => apiClient.patch<Complaint>(`${BASE}/${id}`, toSnake(d)),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`),
};

export function useSafetyComplaintsData() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);

  const load = async (quiet = false) => {
    const requestId = ++requestRef.current;
    if (!quiet) setLoading(true); else setRefreshing(true);
    setLoadError('');
    try {
      const nextComplaints = await api.list();
      if (requestId !== requestRef.current) return;
      setComplaints(Array.isArray(nextComplaints) ? nextComplaints : []);
    }
    catch (error) {
      if (requestId !== requestRef.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load safety complaints.');
      toast.error('Failed to load complaints');
    }
    finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  return { complaints, setComplaints, loading, refreshing, loadError, load };
}
