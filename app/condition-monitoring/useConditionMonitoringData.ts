// app/condition-monitoring/useConditionMonitoringData.ts — the condition-monitoring
// page's data-fetching layer: the snake_case->camelCase converter, record
// fetch/create, and a hook owning the reading list and its load cycle. Split out of
// page.tsx as part of the standing "decompose on touch" convention
// (contractors.tsx-shaped).
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { CMReading, CMReadingAPI } from './types';

export const fromCMAPI = (d: CMReadingAPI): CMReading => ({
  id: d.id, equipment: d.equipment_name || '', component: d.component || '',
  type: (d.monitoring_type as CMReading['type']) || 'Vibration', date: d.sampled_date || '',
  value: String(d.value ?? ''), unit: d.unit || '', result: (d.result as CMReading['result']) || 'normal',
  technician: d.technician || '', notes: d.notes || '',
});

export async function createCMReading(body: Record<string, unknown>) {
  return api.post('/api/condition-monitoring', body);
}

export function useConditionMonitoringData() {
  const list = useApiList<CMReadingAPI, CMReading>('/api/condition-monitoring', fromCMAPI);
  return { readings: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, fetchReadings: list.refetch };
}
