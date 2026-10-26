// app/maintenance/useMaintenanceData.ts — the work-order register and the recurring schedules, each with honest load state (a failed
// load is an error with the rows already shown kept, never an empty list). Writes are in api.ts and throw, so a dialog can show why.
'use client';

import { useEffect, useState } from 'react';
import { useApiList } from '@/lib/useApiList';
import type { Breakdown } from '../breakdowns/types';
import { fetchMeasures, fetchWorkOrderBreakdown } from './api';
import type { MaintenanceSchedule, MeasuresPayload, WorkOrder } from './types';

export const useWorkOrders = () => useApiList<WorkOrder>('/api/maintenance/work-orders');
export const useSchedules = () => useApiList<MaintenanceSchedule>('/api/schedules');

/** The breakdown linked to one work order (null until one is recorded). A failed read is flagged, never an empty link. */
export function useLinkedBreakdown(workOrderId: string | number | null | undefined, enabled = true) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<{ key: string; breakdown: Breakdown | null; failed: boolean }>({ key: '', breakdown: null, failed: false });
  const key = enabled && workOrderId !== null && workOrderId !== undefined ? `${workOrderId}|${tick}` : '';
  useEffect(() => {
    if (key === '' || workOrderId === null || workOrderId === undefined) return;
    const id = workOrderId;
    const k = key;
    let current = true;
    fetchWorkOrderBreakdown(id).then(
      row => { if (current) setSettled({ key: k, breakdown: row, failed: false }); },
      () => { if (current) setSettled({ key: k, breakdown: null, failed: true }); },
    );
    return () => { current = false; };
  }, [key, workOrderId]);
  const mine = key !== '' && settled.key === key ? settled : null;
  return { breakdown: mine?.breakdown ?? null, loading: key !== '' && !mine, failed: mine?.failed ?? false, refetch: () => setTick(t => t + 1) };
}
/** The seven server-counted measures (M5). A failed read is flagged with a retry, never zeros. */
export function useMeasures(days = 90, weeks = 12) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<{ payload: MeasuresPayload | null; failed: boolean }>({ payload: null, failed: false });
  useEffect(() => {
    let current = true;
    fetchMeasures(days, weeks).then(
      payload => { if (current) setSettled({ payload, failed: false }); },
      () => { if (current) setSettled({ payload: null, failed: true }); },
    );
    return () => { current = false; };
  }, [days, weeks, tick]);
  const refetch = () => { setSettled({ payload: null, failed: false }); setTick(t => t + 1); };
  return { payload: settled.payload, loading: !settled.payload && !settled.failed, failed: settled.failed, refetch };
}
