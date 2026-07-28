// app/reliability/useReliabilityData.ts — the reliability page's data-fetching
// layer: derives the equipment reliability table and per-section MTTR from raw
// breakdown records, falling back to static demo data on failure — same
// mock-data-belongs-with-the-hook precedent as availability.tsx/
// engineering-dashboard.tsx. MTBF_TREND is never derived from live data (the
// original never updates it after mount either), kept here as static chart data.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { BreakdownRecord, EquipReliability } from './types';

export const MTBF_TREND = [
  { month: 'Jan', SAGMill: 18, BallMill: 24, JawCrusher: 12, Compressor: 45 },
  { month: 'Feb', SAGMill: 22, BallMill: 26, JawCrusher: 15, Compressor: 42 },
  { month: 'Mar', SAGMill: 19, BallMill: 21, JawCrusher: 10, Compressor: 50 },
  { month: 'Apr', SAGMill: 25, BallMill: 28, JawCrusher: 18, Compressor: 55 },
  { month: 'May', SAGMill: 23, BallMill: 30, JawCrusher: 14, Compressor: 48 },
  { month: 'Jun', SAGMill: 27, BallMill: 32, JawCrusher: 20, Compressor: 52 },
];

export const MTTR_BY_SECTION = [
  { section: 'Milling', mttr: 4.2 },
  { section: 'Crushing', mttr: 2.8 },
  { section: 'Dewatering', mttr: 1.5 },
  { section: 'Compressors', mttr: 0.8 },
  { section: 'Conveying', mttr: 1.2 },
];

export const EQUIPMENT_TABLE: EquipReliability[] = [
  { equipment: 'SAG Mill', section: 'Milling', mtbf: 27, mttr: 5.1, failures: 6, availability: 92.3, rpn: 108 },
  { equipment: 'Ball Mill 1', section: 'Milling', mtbf: 32, mttr: 3.8, failures: 4, availability: 94.7, rpn: 72 },
  { equipment: 'Ball Mill 2', section: 'Milling', mtbf: 29, mttr: 4.2, failures: 5, availability: 93.5, rpn: 80 },
  { equipment: 'Jaw Crusher', section: 'Crushing', mtbf: 20, mttr: 2.9, failures: 9, availability: 90.1, rpn: 126 },
  { equipment: 'Secondary Crusher', section: 'Crushing', mtbf: 35, mttr: 2.5, failures: 3, availability: 96.8, rpn: 45 },
  { equipment: 'Air Compressor #1', section: 'Compressors', mtbf: 52, mttr: 0.9, failures: 2, availability: 98.4, rpn: 24 },
  { equipment: 'Air Compressor #2', section: 'Compressors', mtbf: 48, mttr: 0.7, failures: 3, availability: 98.1, rpn: 18 },
  { equipment: 'Dewatering Pump 1', section: 'Dewatering', mtbf: 41, mttr: 1.4, failures: 2, availability: 97.7, rpn: 32 },
  { equipment: 'Dewatering Pump 2', section: 'Dewatering', mtbf: 38, mttr: 1.6, failures: 3, availability: 97.0, rpn: 36 },
  { equipment: 'Conveyor CV01', section: 'Conveying', mtbf: 45, mttr: 1.1, failures: 2, availability: 98.3, rpn: 28 },
];

export function useReliabilityData() {
  const [table, setTable] = useState<EquipReliability[]>(EQUIPMENT_TABLE);
  const [mttrSect, setMttrSect] = useState<typeof MTTR_BY_SECTION>(MTTR_BY_SECTION);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const bds = await api.get<BreakdownRecord[]>('/api/breakdowns');
      const equipMap: Record<string, { failures: number; totalDowntime: number; firstDate: Date; lastDate: Date; section: string }> = {};
      const now = new Date();
      for (const bd of bds) {
        const eq = bd.equipment_name || 'Unknown';
        if (!equipMap[eq]) equipMap[eq] = { failures: 0, totalDowntime: 0, firstDate: now, lastDate: new Date(0), section: bd.section || bd.location || '—' };
        equipMap[eq].failures++;
        equipMap[eq].totalDowntime += Number(bd.downtime_hours || bd.duration_hours || 0);
        const d = new Date(bd.breakdown_date || bd.date || bd.created_at || now);
        if (d < equipMap[eq].firstDate) equipMap[eq].firstDate = d;
        if (d > equipMap[eq].lastDate) equipMap[eq].lastDate = d;
      }
      const derived: EquipReliability[] = Object.entries(equipMap).map(([equipment, v]) => {
        const periodDays = Math.max(1, (now.getTime() - v.firstDate.getTime()) / 86400000);
        const mtbf = Math.round(periodDays / Math.max(1, v.failures));
        const mttr = v.failures > 0 ? Math.round((v.totalDowntime / v.failures) * 10) / 10 : 0;
        const availability = Math.round((1 - v.totalDowntime / (periodDays * 24)) * 1000) / 10;
        const rpn = Math.round((5 - Math.min(4, mtbf / 10)) * Math.max(1, mttr) * 3);
        return { equipment, section: v.section, mtbf, mttr, failures: v.failures, availability: Math.max(0, availability), rpn };
      }).sort((a, b) => b.rpn - a.rpn);

      if (derived.length) setTable(derived);

      const sectionMttr: Record<string, number[]> = {};
      for (const bd of bds) {
        const sec = bd.section || bd.location || 'Other';
        if (!sectionMttr[sec]) sectionMttr[sec] = [];
        sectionMttr[sec].push(Number(bd.downtime_hours || 0));
      }
      const secDerived = Object.entries(sectionMttr).map(([section, hrs]) => ({ section, mttr: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length * 10) / 10 }));
      if (secDerived.length) setMttrSect(secDerived);
    } catch { /* keep static fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { table, mttrSect, loading, refresh };
}
