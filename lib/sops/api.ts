// lib/sops/api.ts — SOP Library data-fetching layer, routed through the shared
// api client (lib/apiClient.ts) like every other module — never raw fetch/authFetch.
import { api } from '@/lib/apiClient';
import type { SopDocument, SopRevision, SopFormValues, SopRiskTier } from './types';

/** The write-payload shape — SopFormValues with risk_tier converted from its
 *  form-string placeholder to the real numeric-or-absent API type. */
export type SopWritePayload = Omit<SopFormValues, 'risk_tier'> & { risk_tier?: SopRiskTier };

export interface SopListFilters {
  search?: string;
  department?: string;
  status?: string;
  owner?: string;
}

function toQuery(filters: SopListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.department) params.set('department', filters.department);
  if (filters.status) params.set('status', filters.status);
  if (filters.owner) params.set('owner', filters.owner);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchSops(filters: SopListFilters = {}): Promise<SopDocument[]> {
  return api.get<SopDocument[]>(`/api/sops${toQuery(filters)}`);
}

export async function fetchArchivedSops(): Promise<SopDocument[]> {
  return api.get<SopDocument[]>('/api/sops/archived');
}

export async function fetchSop(id: string): Promise<{ sop: SopDocument; revisions: SopRevision[] }> {
  return api.get(`/api/sops/${id}`);
}

/** create/update both send the full write-payload shape — the backend accepts
 *  a superset per-endpoint (create requires code, update ignores it if sent). */
export async function createSop(payload: SopWritePayload): Promise<SopDocument> {
  return api.post<SopDocument>('/api/sops', payload);
}

export async function updateSop(id: string, payload: Partial<SopWritePayload>): Promise<SopDocument> {
  return api.patch<SopDocument>(`/api/sops/${id}`, payload);
}

export async function archiveSop(id: string): Promise<SopDocument> {
  return api.post<SopDocument>(`/api/sops/${id}/archive`);
}

export async function restoreSop(id: string): Promise<SopDocument> {
  return api.post<SopDocument>(`/api/sops/${id}/restore`);
}
