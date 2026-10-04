// app/safety_complaints/useSafetyComplaintsData.ts — the safety complaints register's
// data-fetching layer: the camelCase<->snake_case payload converter, record CRUD, and a
// list hook. Writes throw on failure so the form dialog can show the reason and keep the user's input;
// a failed load is reported (never an empty list) through useApiList.
'use client';

import { api as apiClient } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
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
  create: (d: Partial<Complaint>) => apiClient.post<Complaint>(BASE + '/', toSnake(d)),
  update: (id: string, d: Partial<Complaint>) => apiClient.patch<Complaint>(`${BASE}/${id}`, toSnake(d)),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`),
};

export function useSafetyComplaintsData() {
  const list = useApiList<Complaint>(`${BASE}/`, undefined, { paged: true });
  return { complaints: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
