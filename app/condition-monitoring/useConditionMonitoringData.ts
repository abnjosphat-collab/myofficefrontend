// app/condition-monitoring/useConditionMonitoringData.ts — the condition-monitoring
// page's data-fetching layer: the snake_case->camelCase converter, record
// fetch/create, and a hook owning the reading list and its load cycle. Split out of
// page.tsx as part of the standing "decompose on touch" convention
// (contractors.tsx-shaped).
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
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
  const [readings, setReadings] = useState<CMReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try { setReadings((await api.get<CMReadingAPI[]>('/api/condition-monitoring')).map(fromCMAPI)); }
    catch { /* network error */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  return { readings, loading, fetchReadings };
}
