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

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
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

/** Which bell group an activity item belongs to. Producers tag it; the bell reads it; the dashboard page ignores it. */
export type AlertGroup = 'pw' | 'leave' | 'overtime' | 'sheq' | 'workorders' | 'signoff' | 'mywork' | 'tasks' | 'feedback' | 'notices' | 'activity';

/**
 * One bell-feeding fetch and whether it answered. Unasked (role-gated)
 * sources are absent from the list, never present with ok: false.
 */
export interface SourceResult { source: string; label: string; ok: boolean }

/** The two dashboard endpoints that feed the bell (the stats endpoints don't — a failed stat is not a bell warning). */
export type DashActivitySource = 'activity-workorders' | 'activity-breakdowns';

export interface ActivityItem {
  id: string;
  action: string;
  module: string;
  icon: LucideIcon;
  time: string;
  timestamp: number;
  status: 'critical' | 'pending' | 'normal';
  user?: string;
  /** Bell grouping key — set by the producer, read only by the bell. */
  group?: AlertGroup;
  /** Where the bell row goes — every alert lands on its record (U3.1 link map). */
  href: string;
  /** What the destination offers (e.g. "Review and sign"); shown only where the row names an action. */
  actionLabel?: string;
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
let _inflight: Promise<{ raw: DashRaw; result: DashboardLoadResult }> | null = null;

const DASH_URLS = {
  employees: `${API_BASE}/api/employees`,
  woStats: `${API_BASE}/api/maintenance/work-orders/stats/summary`,
  equipment: `${API_BASE}/api/equipment`,
  breakdownOverview: `${API_BASE}/api/breakdowns/dashboard/overview`,
  // Only the newest 6 are ever shown (sliced below) — no reason to pull
  // the entire table over the wire on every page load.
  workOrders: `${API_BASE}/api/maintenance/work-orders?limit=6`,
  breakdowns: `${API_BASE}/api/breakdowns/get-breakdowns?limit=6`,
};

/** One answer per endpoint, loosely typed at the boundary; buildDash re-asserts each shape. */
export interface DashRaw {
  employees: unknown;
  woStats: unknown;
  equipment: unknown;
  breakdownOverview: unknown;
  workOrders: unknown;
  breakdowns: unknown;
}

const DASH_FETCH = {
  employees: () => fetchOrNull<unknown[]>(DASH_URLS.employees),
  woStats: () => fetchOrNull<WorkOrderStats>(DASH_URLS.woStats),
  equipment: () => fetchOrNull<EquipmentRow[]>(DASH_URLS.equipment),
  breakdownOverview: () => fetchOrNull<BreakdownOverview>(DASH_URLS.breakdownOverview),
  workOrders: () => fetchOrNull<WorkOrderRow[]>(DASH_URLS.workOrders),
  breakdowns: () => fetchOrNull<BreakdownRow[] | { data?: BreakdownRow[] }>(DASH_URLS.breakdowns),
};

async function loadDashboardData(): Promise<{ raw: DashRaw; result: DashboardLoadResult }> {
  const [employees, woStats, equipment, breakdownOverview, workOrders, breakdowns] = await Promise.all([
    DASH_FETCH.employees(), DASH_FETCH.woStats(), DASH_FETCH.equipment(),
    DASH_FETCH.breakdownOverview(), DASH_FETCH.workOrders(), DASH_FETCH.breakdowns(),
  ]);
  const raw: DashRaw = { employees, woStats, equipment, breakdownOverview, workOrders, breakdowns };
  return { raw, result: buildDash(raw) };
}

/** Pure — whether each bell-feeding dashboard endpoint answered. */
export function dashActivitySources(raw: DashRaw): SourceResult[] {
  return [
    { source: 'activity-workorders', label: 'Work order activity', ok: raw.workOrders !== null },
    { source: 'activity-breakdowns', label: 'Breakdown activity', ok: raw.breakdowns !== null },
  ];
}

/** Pure — stats + activity from one answer per endpoint. Shared by the initial load and per-source retries. */
function buildDash(raw: DashRaw): DashboardLoadResult {
  const employees = raw.employees as unknown[] | null;
  const woStats = raw.woStats as WorkOrderStats | null;
  const equipment = raw.equipment as EquipmentRow[] | null;
  const breakdownOverview = raw.breakdownOverview as BreakdownOverview | null;
  const workOrders = raw.workOrders as WorkOrderRow[] | null;
  const breakdowns = raw.breakdowns as BreakdownRow[] | { data?: BreakdownRow[] } | null;

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
      href: `/maintenance?open=${w.id}`,
      group: 'activity',
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
      href: `/breakdowns?open=${b.id}`,
      group: 'activity',
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
  const [sources, setSources] = useState<SourceResult[]>([]);
  // Last-good answers per endpoint: a retry re-fetches ONE endpoint and rebuilds against the rest.
  const dataRef = useRef<DashRaw | null>(null);

  const applyRaw = useCallback((raw: DashRaw) => {
    dataRef.current = raw;
    const result = buildDash(raw);
    setStats(result.stats);
    setActivity(result.activity);
    setActivityFailed(result.activityFailed);
    setSources(dashActivitySources(raw));
    setLoading(false);
  }, []);

  /** Re-fetch one bell-feeding endpoint (a bell Retry); other endpoints keep their answers. */
  const reloadSource = useCallback(async (source: DashActivitySource) => {
    const prev = dataRef.current;
    if (!prev) return;
    if (source === 'activity-workorders') {
      applyRaw({ ...prev, workOrders: await DASH_FETCH.workOrders() });
    } else {
      applyRaw({ ...prev, breakdowns: await DASH_FETCH.breakdowns() });
    }
  }, [applyRaw]);

  /** Consecutive quiet failures per endpoint; a source is named from its second one. */
  const quietFails = useRef<Record<string, number>>({});

  /** Re-fetch every endpoint (a background tick): successes merge over the last
   *  good answers, failures keep them — until the second failure in a row, when
   *  the source is honestly named as failed. */
  const reloadAllQuiet = useCallback(async () => {
    const prev = dataRef.current;
    if (!prev) return;
    const { raw } = await loadDashboardData();
    const next: DashRaw = { ...prev };
    (Object.keys(raw) as (keyof DashRaw)[]).forEach(k => {
      if (raw[k] !== null && raw[k] !== undefined) {
        next[k] = raw[k];
        quietFails.current[k] = 0;
      } else {
        quietFails.current[k] = (quietFails.current[k] ?? 0) + 1;
        if (quietFails.current[k] >= 2) next[k] = null;
      }
    });
    applyRaw(next);
  }, [applyRaw]);

  // The bell re-reads every 15 s (its own pace, not the 60 s list pace). The
  // home stats ride the same hook, so they refresh at 15 s too.
  useAutoRefresh(reloadAllQuiet, { every: 15_000 });

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
    p.then(({ raw }) => {
      if (cancelled) return;
      applyRaw(raw);
    });

    return () => { cancelled = true; };
  }, [applyRaw]);

  return { stats, activity, loading, activityFailed, sources, reloadSource };
}
