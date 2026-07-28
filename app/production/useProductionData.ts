// app/production/useProductionData.ts — the production record's data-fetching
// layer: the snake_case->camelCase converter, record fetch/create, and a hook
// owning the record list and its load-once cycle. Split out of page.tsx as part of
// the standing "decompose on touch" convention (contractors.tsx-shaped).
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { ProductionRecord } from './types';

export const fromProdAPI = (d: any): ProductionRecord => ({
  id: d.id, date: d.prod_date || '', shift: d.shift || '',
  tonnesMilled: d.tonnes_milled || 0, feedRate: d.feed_rate_tph || 0, grade: d.grade_gpt || 0,
  recovery: d.recovery_pct || 0, goldOz: d.gold_produced_oz || 0, millAvail: d.mill_availability || 0,
  powerKwh: d.power_kwh || 0, downtimeHrs: d.downtime_hours || 0,
  downtimeReason: d.downtime_reason || '', comments: d.comments || '',
});

export async function createProductionRecord(body: Record<string, unknown>) {
  return api.post('/api/production', body);
}

export function useProductionData() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);

  const fetchRecords = useCallback(async () => {
    try { setRecords((await api.get<any[]>('/api/production')).map(fromProdAPI)); }
    catch { /* network */ }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return { records, fetchRecords };
}
