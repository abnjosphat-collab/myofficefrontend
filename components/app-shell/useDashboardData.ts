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
import { fetchOrNull } from './fetchOrNull';
import {
  ClipboardPlus, AlertTriangle, type LucideIcon,
} from '@/components/ui-system';

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

export function timeAgo(iso?: string | null): string {
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

// The fields this hook reads from each endpoint (all optional: a partial row must not break the homepage).
interface WorkOrderStats { pending?: number; in_progress?: number }
interface EquipmentRow { status?: string | null }
interface BreakdownOverview { metrics?: { open_breakdowns?: number } }
interface WorkOrderRow { id: number | string; work_order_number?: string | null; job_request_details?: string | null; created_at?: string | null; date_raised?: string | null; status?: string | null; requested_by?: string }
interface BreakdownRow { id: number | string; machine_name?: string | null; machine_id?: string | null; created_at?: string | null; breakdown_date?: string | null; priority?: string | null; artisan_name?: string }

interface DashboardLoadResult { stats: DashboardStats; activity: ActivityItem[]; activityFailed: boolean }

// This hook has 5 independent call sites (app/page.tsx twice, BottomBar,
// SidebarNavigation, useNotifications) — the last three all live inside AppShell,
// which wraps every page, so EVERY page load used to fire this same 6-endpoint
// Promise.all batch 3 times over, simultaneously, tripling load on those endpoints
// on every navigation (confirmed live via network logging on /equipment: the same 6
// URLs firing 3x). `_inflight` dedupes any calls that overlap in time — same fix
// shape as hooks/useLookups.ts's in-flight-promise sharing — so 3 components
// mounting together in the same AppShell render share one fetch instead of firing
// their own. Deliberately NOT a persistent result cache like useLookups.ts's
// employee/equipment lists: dashboard KPIs (open breakdowns, active work orders)
// are time-sensitive, so `_inflight` clears the moment it settles and the next
// separate page visit fetches fresh data again — this only kills duplicate
// simultaneous requests, not staleness.
let _inflight: Promise<DashboardLoadResult> | null = null;

async function loadDashboardData(): Promise<DashboardLoadResult> {
  const [employees, woStats, equipment, breakdownOverview, workOrders, breakdowns] = await Promise.all([
    fetchOrNull<unknown[]>(`${API_BASE}/api/employees`),
    fetchOrNull<WorkOrderStats>(`${API_BASE}/api/maintenance/work-orders/stats/summary`),
    fetchOrNull<EquipmentRow[]>(`${API_BASE}/api/equipment`),
    fetchOrNull<BreakdownOverview>(`${API_BASE}/api/breakdowns/dashboard/overview`),
    // Only the newest 6 are ever shown (sliced below) — no reason to pull
    // the entire table over the wire on every page load.
    fetchOrNull<WorkOrderRow[]>(`${API_BASE}/api/maintenance/work-orders?limit=6`),
    fetchOrNull<BreakdownRow[] | { data?: BreakdownRow[] }>(`${API_BASE}/api/breakdowns/get-breakdowns?limit=6`),
  ]);

  const employeeCount = Array.isArray(employees) ? employees.length : null;

  const activeWorkOrders = woStats
    ? (woStats.pending ?? 0) + (woStats.in_progress ?? 0)
    : null;

  // Equipment status vocabulary in the DB is inconsistent ("operational" is what's
  // actually seeded, though the API model default is "Available") — match either.
  let equipmentAvailablePct: number | null = null;
  if (Array.isArray(equipment) && equipment.length > 0) {
    const available = equipment.filter(e => {
      const s = (e.status || '').toLowerCase();
      return s === 'available' || s === 'operational';
    }).length;
    equipmentAvailablePct = Math.round((available / equipment.length) * 100);
  }

  const openBreakdowns = breakdownOverview?.metrics?.open_breakdowns ?? null;

  // Activity feed: merge the newest work orders + breakdowns into one timeline.
  const woItems: ActivityItem[] = Array.isArray(workOrders)
    ? workOrders.slice(0, 6).map(w => ({
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

  const breakdownRecords: BreakdownRow[] = Array.isArray(breakdowns) ? breakdowns : (breakdowns?.data ?? []);
  const bdItems: ActivityItem[] = Array.isArray(breakdownRecords)
    ? breakdownRecords.slice(0, 6).map(b => ({
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

  const activity = [...woItems, ...bdItems]
    .filter(i => i.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return {
    stats: { employeeCount, activeWorkOrders, equipmentAvailablePct, openBreakdowns },
    activity,
    // A null response means the request failed (safeJson swallows it); an empty feed is a valid answer.
    activityFailed: workOrders === null || breakdowns === null,
  };
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFailed, setActivityFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    let p = _inflight;
    if (!p) {
      p = loadDashboardData();
      _inflight = p;
      // Clear once settled (success or failure) so the NEXT page visit gets fresh
      // data — this dedupes simultaneous mounts, it doesn't cache results.
      p.finally(() => { if (_inflight === p) _inflight = null; });
    }
    p.then((result) => {
      if (cancelled) return;
      setStats(result.stats);
      setActivity(result.activity);
      setActivityFailed(result.activityFailed);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { stats, activity, loading, activityFailed };
}
