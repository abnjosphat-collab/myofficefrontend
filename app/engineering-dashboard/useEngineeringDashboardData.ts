// app/engineering-dashboard/useEngineeringDashboardData.ts — the engineering
// dashboard's data-fetching layer: a 2-resource (open job cards + breakdowns)
// Promise.all load, each falling back to static demo data. Split out of page.tsx
// as part of the standing "decompose on touch" convention. No types.ts: shapes are
// implicit (`typeof demoArray`) over loosely-typed `any[]` API responses, same
// rationale as engineering_report.tsx.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

export const availabilityTrend = [
  { month: 'Jan', target: 85, actual: 82 }, { month: 'Feb', target: 85, actual: 84 },
  { month: 'Mar', target: 85, actual: 79 }, { month: 'Apr', target: 85, actual: 88 },
  { month: 'May', target: 85, actual: 86 }, { month: 'Jun', target: 85, actual: 83 },
];

export const breakdownTrend = [
  { month: 'Jan', count: 24 }, { month: 'Feb', count: 18 }, { month: 'Mar', count: 31 },
  { month: 'Apr', count: 15 }, { month: 'May', count: 19 }, { month: 'Jun', count: 22 },
];

export const statusDist = [
  { name: 'Running', value: 14, color: '#34d399' },
  { name: 'Degraded', value: 3, color: '#fbbf24' },
  { name: 'Down', value: 2, color: '#f87171' },
  { name: 'Planned', value: 1, color: '#86BBD8' },
];

export const topBreakdowns = [
  { equipment: 'Secondary Crusher', count: 8, hours: 24.5 },
  { equipment: 'Ball Mill 2', count: 6, hours: 18.2 },
  { equipment: 'Conveyor CV3', count: 5, hours: 12.0 },
  { equipment: 'Tailings Pump TP1', count: 4, hours: 9.5 },
  { equipment: 'Compressor C2', count: 3, hours: 7.0 },
];

export const openWorkOrders = [
  { id: 'JC-2024-0843', title: 'Belt splice failure – CV3', priority: 'critical', age: 1, assigned: 'T. Moyo' },
  { id: 'JC-2024-0842', title: 'Toggle plate replacement – Sec. Crusher', priority: 'high', age: 1, assigned: 'F. Ncube' },
  { id: 'JC-2024-0841', title: 'Bearing replacement – Ball Mill 2', priority: 'high', age: 2, assigned: 'P. Dube' },
  { id: 'JC-2024-0838', title: 'Impeller replacement – TP1', priority: 'medium', age: 3, assigned: 'S. Mutasa' },
  { id: 'JC-2024-0835', title: '500hr service – Compressor C2', priority: 'medium', age: 5, assigned: 'J. Nyoni' },
];

export function useEngineeringDashboardData() {
  const [openWOs, setOpenWOs] = useState<typeof openWorkOrders>([]);
  const [bdTrend, setBdTrend] = useState<typeof breakdownTrend>(breakdownTrend);
  const [topFails, setTopFails] = useState<typeof topBreakdowns>(topBreakdowns);
  const [avTrend, setAvTrend] = useState<typeof availabilityTrend>(availabilityTrend);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [jcRes, bdRes] = await Promise.all([
        api.get<any[]>('/api/job-cards?status=open').catch(() => null),
        api.get<any[]>('/api/breakdowns').catch(() => null),
      ]);

      if (jcRes) {
        const jcs = jcRes;
        setOpenWOs(jcs.slice(0, 10).map(j => ({
          id: j.job_no || `JC-${j.id}`,
          title: j.title,
          priority: j.priority || 'medium',
          age: j.scheduled_date ? Math.max(0, Math.round((Date.now() - new Date(j.scheduled_date).getTime()) / 86400000)) : 0,
          assigned: j.assigned_to || '—',
        })));
      }

      if (bdRes) {
        const bds = bdRes;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const monthlyCounts: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthlyCounts[months[d.getMonth()]] = 0;
        }
        for (const bd of bds) {
          const m = months[new Date(bd.breakdown_date || bd.date || bd.created_at).getMonth()];
          if (m in monthlyCounts) monthlyCounts[m]++;
        }
        setBdTrend(Object.entries(monthlyCounts).map(([month, count]) => ({ month, count })));

        const equipCount: Record<string, { equipment: string; count: number; hours: number }> = {};
        for (const bd of bds) {
          const eq = bd.equipment_name || bd.equipment || 'Unknown';
          if (!equipCount[eq]) equipCount[eq] = { equipment: eq, count: 0, hours: 0 };
          equipCount[eq].count++;
          equipCount[eq].hours += Number(bd.downtime_hours || bd.duration_hours || 0);
        }
        setTopFails(Object.values(equipCount).sort((a, b) => b.count - a.count).slice(0, 5).map(e => ({ ...e, hours: Math.round(e.hours * 10) / 10 })));
      }
    } catch { /* keep static fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { openWOs, bdTrend, topFails, avTrend, setAvTrend, loading, refresh };
}
