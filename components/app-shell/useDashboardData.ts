// components/app-shell/useDashboardData.ts — live homepage stats + activity feed,
// derived from EXISTING backend endpoints (no mock data). Replaces the hardcoded
// KPI_DATA / RECENT_ACTIVITIES that used to live in app/page.tsx and modules.ts.
//
// Deliberately conservative about what counts as "real": every number here traces
// back to an actual API response. Metrics with no honest backing source (a safety
// "score", server/API/cache latency with no health-check endpoint) are NOT faked —
// see DASHBOARD_STATS in app/page.tsx for what's shown instead.
//
// This hook hits 4 endpoints directly and derives everything client-side. If/when
// a proper aggregation endpoint (e.g. GET /api/dashboard/stats) is deployed, swap
// the body of `load()` for a single fetch — the return shape here should stay the
// same so call sites don't need to change.
'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/config';
import {
  ClipboardPlus, AlertTriangle, type LucideIcon,
} from '@/components/shared/theme';

export interface DashboardStats {
  employeeCount: number | null;
  activeWorkOrders: number | null;
  equipmentAvailablePct: number | null;
  openBreakdowns: number | null;
}

export interface ActivityItem {
  id: string;
  action: string;
  module: string;
  icon: LucideIcon;
  time: string;
  timestamp: number;
  status: 'critical' | 'pending' | 'normal';
  user?: string;
}

const EMPTY_STATS: DashboardStats = {
  employeeCount: null, activeWorkOrders: null, equipmentAvailablePct: null, openBreakdowns: null,
};

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

async function safeJson(url: string): Promise<any> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [employees, woStats, equipment, breakdownOverview, workOrders, breakdowns] = await Promise.all([
        safeJson(`${API_BASE}/api/employees`),
        safeJson(`${API_BASE}/api/maintenance/work-orders/stats/summary`),
        safeJson(`${API_BASE}/api/equipment`),
        safeJson(`${API_BASE}/api/breakdowns/dashboard/overview`),
        safeJson(`${API_BASE}/api/maintenance/work-orders`),
        safeJson(`${API_BASE}/api/breakdowns/get-breakdowns?limit=6`),
      ]);
      if (cancelled) return;

      const employeeCount = Array.isArray(employees) ? employees.length : null;

      const activeWorkOrders = woStats
        ? (woStats.pending ?? 0) + (woStats.in_progress ?? 0)
        : null;

      // Equipment status vocabulary in the DB is inconsistent ("operational" is what's
      // actually seeded, though the API model default is "Available") — match either.
      let equipmentAvailablePct: number | null = null;
      if (Array.isArray(equipment) && equipment.length > 0) {
        const available = equipment.filter((e: any) => {
          const s = (e.status || '').toLowerCase();
          return s === 'available' || s === 'operational';
        }).length;
        equipmentAvailablePct = Math.round((available / equipment.length) * 100);
      }

      const openBreakdowns = breakdownOverview?.metrics?.open_breakdowns ?? null;

      setStats({ employeeCount, activeWorkOrders, equipmentAvailablePct, openBreakdowns });

      // Activity feed: merge the newest work orders + breakdowns into one timeline.
      const woItems: ActivityItem[] = Array.isArray(workOrders)
        ? workOrders.slice(0, 6).map((w: any) => ({
          id: `wo-${w.id}`,
          action: `Work order ${w.work_order_number ? `#${w.work_order_number}` : ''} — ${w.job_request_details || 'raised'}`.slice(0, 80),
          module: 'Maintenance',
          icon: ClipboardPlus,
          time: timeAgo(w.created_at || w.date_raised),
          timestamp: new Date(w.created_at || w.date_raised || 0).getTime(),
          status: w.status === 'pending' ? 'pending' : 'normal',
          user: w.requested_by,
        }))
        : [];

      const breakdownRecords = breakdowns?.data ?? (Array.isArray(breakdowns) ? breakdowns : []);
      const bdItems: ActivityItem[] = Array.isArray(breakdownRecords)
        ? breakdownRecords.slice(0, 6).map((b: any) => ({
          id: `bd-${b.id}`,
          action: `Breakdown reported — ${b.machine_name || b.machine_id || 'equipment'}`,
          module: 'Breakdowns',
          icon: AlertTriangle,
          time: timeAgo(b.created_at || b.breakdown_date),
          timestamp: new Date(b.created_at || b.breakdown_date || 0).getTime(),
          status: (b.priority === 'critical' || b.priority === 'high') ? 'critical' : 'normal',
          user: b.artisan_name,
        }))
        : [];

      const merged = [...woItems, ...bdItems]
        .filter(i => i.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8);

      setActivity(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { stats, activity, loading };
}
