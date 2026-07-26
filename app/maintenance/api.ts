// frontend/app/maintenance/api.ts — work order + schedule API calls, shared
// between the maintenance page and its extracted modal components.
import { api } from '@/lib/apiClient';
import type { WorkOrder, MaintenanceSchedule } from './types';

// The database is the only source of truth. These calls used to fall back to
// localStorage and return { success: true } on failure, so a work order that
// never reached the server showed a success toast and lived on in one browser
// with a fake Date.now() id. They now throw, and callers report the failure.

const LEGACY_WO_KEY = 'maint_work_orders';
const LEGACY_UPLOAD_DONE = 'maint_local_fields_uploaded_v1';
// Fields that used to exist only in the browser, before work_orders had columns
// for them (supabase_migration_work_orders_classification.sql).
const LOCAL_FIELDS: (keyof WorkOrder)[] = ['classification', 'classification_custom', 'failure_mode', 'discipline', 'trade', 'spares_used'];

export async function getWorkOrders(): Promise<WorkOrder[]> {
  const data = await api.get<WorkOrder[]>('/api/maintenance/work-orders');
  return Array.isArray(data) ? data : [];
}

export async function createWorkOrder(data: Record<string, unknown>): Promise<WorkOrder> {
  const result = await api.post<Partial<WorkOrder>>('/api/maintenance/work-orders', data);
  return { ...data, ...result } as WorkOrder;
}

export async function updateWorkOrder(id: string, updates: Record<string, unknown>): Promise<void> {
  await api.patch(`/api/maintenance/work-orders/${id}`, { ...updates, updated_at: new Date().toISOString() });
}

export async function deleteWorkOrder(id: string): Promise<void> {
  await api.delete(`/api/maintenance/work-orders/${id}`);
}

/**
 * One-time rescue of classification data stranded in this browser.
 *
 * Before work_orders had these columns, the page kept them in localStorage
 * only — so a user's failure modes, disciplines and spares lived on their
 * machine and nowhere else. Now that the columns exist, push anything the
 * server is still missing before the local copy is discarded. Runs once per
 * browser; only fills blanks, never overwrites a server value.
 */
export async function uploadStrandedLocalFields(server: WorkOrder[]): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(LEGACY_UPLOAD_DONE)) return 0;

  let local: WorkOrder[] = [];
  try { local = JSON.parse(localStorage.getItem(LEGACY_WO_KEY) || '[]'); } catch { local = []; }
  if (!Array.isArray(local) || local.length === 0) {
    localStorage.setItem(LEGACY_UPLOAD_DONE, new Date().toISOString());
    return 0;
  }

  const localMap = new Map(local.map(w => [String(w.id), w]));
  let uploaded = 0;

  for (const wo of server) {
    const loc = localMap.get(String(wo.id));
    if (!loc) continue;
    const patch: Record<string, unknown> = {};
    for (const f of LOCAL_FIELDS) {
      const serverVal = wo[f];
      const localVal = loc[f];
      const serverBlank = serverVal === null || serverVal === undefined || serverVal === ''
        || (Array.isArray(serverVal) && serverVal.length === 0);
      const localHas = localVal !== null && localVal !== undefined && localVal !== ''
        && !(Array.isArray(localVal) && localVal.length === 0);
      if (serverBlank && localHas) patch[f] = localVal;
    }
    if (Object.keys(patch).length === 0) continue;
    try {
      await updateWorkOrder(String(wo.id), patch);
      uploaded++;
    } catch {
      // Leave the flag unset so the next load retries rather than dropping data.
      return uploaded;
    }
  }

  localStorage.setItem(LEGACY_UPLOAD_DONE, new Date().toISOString());
  localStorage.removeItem(LEGACY_WO_KEY);
  return uploaded;
}

// ==================== SCHEDULE API ====================
// Schedules are server-side. They used to live in localStorage, which meant a
// schedule you created was invisible to everyone else, and nothing could raise
// its work orders unless you happened to open this page.
const SCHED_KEY = 'maint_schedules';
const SCHED_UPLOAD_DONE = 'maint_schedules_uploaded_v1';

export async function fetchSchedules(): Promise<MaintenanceSchedule[]> {
  const data = await api.get<MaintenanceSchedule[]>('/api/schedules');
  return Array.isArray(data) ? data : [];
}
export async function createSchedule(s: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
  return api.post<MaintenanceSchedule>('/api/schedules', s);
}
export async function updateSchedule(id: string | number, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
  return api.patch<MaintenanceSchedule>(`/api/schedules/${id}`, updates);
}
export async function deleteSchedule(id: string | number): Promise<void> {
  await api.delete(`/api/schedules/${id}`);
}

/** One-time rescue of schedules stranded in this browser's localStorage. */
export async function uploadStrandedSchedules(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(SCHED_UPLOAD_DONE)) return 0;
  let local: MaintenanceSchedule[] = [];
  try { local = JSON.parse(localStorage.getItem(SCHED_KEY) || '[]'); } catch { local = []; }
  if (!Array.isArray(local) || local.length === 0) {
    localStorage.setItem(SCHED_UPLOAD_DONE, new Date().toISOString());
    return 0;
  }
  let uploaded = 0;
  for (const s of local) {
    try {
      // id/created_at are the browser's; the server assigns its own.
      const { id: _id, created_at: _c, last_generated: _lg, ...rest } = s;
      await createSchedule(rest);
      uploaded++;
    } catch {
      return uploaded; // retry on next load rather than lose the schedule
    }
  }
  localStorage.setItem(SCHED_UPLOAD_DONE, new Date().toISOString());
  localStorage.removeItem(SCHED_KEY);
  return uploaded;
}
