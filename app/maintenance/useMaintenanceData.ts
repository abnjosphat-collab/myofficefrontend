// app/maintenance/useMaintenanceData.ts — the work-order register and the recurring schedules, each with honest load state (a failed
// load is an error with the rows already shown kept, never an empty list). Writes are in api.ts and throw, so a dialog can show why.
'use client';

import { useApiList } from '@/lib/useApiList';
import type { MaintenanceSchedule, WorkOrder } from './types';

export const useWorkOrders = () => useApiList<WorkOrder>('/api/maintenance/work-orders');
export const useSchedules = () => useApiList<MaintenanceSchedule>('/api/schedules');
