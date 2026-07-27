// app/spares/api.ts — spare-part and saved-requisition API calls. Split out of page.tsx
// as part of the standing "decompose on touch" convention. No hook here (unlike ppe/
// timesheets/employees/shifts) — this page has two independent load cycles (the spares
// list, and saved requisitions on their own once-only gate), not one unified cycle, so
// per the playbook it keeps its useState/useEffect orchestration in page.tsx and calls
// these plain functions directly, the same shape as app/maintenance/api.ts.
import { api } from '@/lib/apiClient';
import type { SavedRequisition, Spare, SpareFormData } from './types';

export async function apiFetchAll(): Promise<Spare[]> {
  const d = await api.get<any>('/api/spares');
  return Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
}
export async function apiCreate(data: Partial<SpareFormData>): Promise<Spare> {
  return api.post<Spare>('/api/spares', data);
}
export async function apiUpdate(id: number, data: Partial<SpareFormData>): Promise<Spare> {
  return api.put<Spare>(`/api/spares/${id}`, data);
}
export async function apiDelete(id: number): Promise<void> {
  await api.delete(`/api/spares/${id}`);
}

const dbRowToReq = (row: Record<string, unknown>): SavedRequisition => ({
  id: String(row.id), name: String(row.name),
  saved_at: String(row.saved_at || row.updated_at || new Date().toISOString()),
  updated_at: row.updated_at ? String(row.updated_at) : undefined,
  header: {
    requester: String(row.requester || ''), reason: String(row.reason || ''),
    urgency: (row.urgency as SavedRequisition['header']['urgency']) || 'routine', priority: (row.priority as SavedRequisition['header']['priority']) || 'medium',
    required_for: String(row.required_for || ''),
  },
  lines: Array.isArray(row.lines) ? row.lines as SavedRequisition['lines'] : [],
  grand_total: Number(row.grand_total) || 0,
});
const reqToDbPayload = (req: SavedRequisition) => ({
  name: req.name, requester: req.header.requester || null, reason: req.header.reason || null,
  urgency: req.header.urgency, priority: req.header.priority, required_for: req.header.required_for || null,
  lines: req.lines, grand_total: req.grand_total,
});

export const apiGetSavedReqs = async (): Promise<SavedRequisition[]> => {
  try { const data = await api.get<any[]>('/api/spares/saved-requisitions'); return (Array.isArray(data) ? data : []).map(dbRowToReq); } catch { return []; }
};
export const apiCreateSavedReq = async (req: SavedRequisition): Promise<SavedRequisition | null> => {
  try { return dbRowToReq(await api.post('/api/spares/saved-requisitions', reqToDbPayload(req))); } catch { return null; }
};
export const apiDeleteSavedReq = async (id: string): Promise<boolean> => { try { await api.delete(`/api/spares/saved-requisitions/${id}`); return true; } catch { return false; } };
