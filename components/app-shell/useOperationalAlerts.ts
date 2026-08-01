// components/app-shell/useOperationalAlerts.ts — real, actionable alerts pulled from
// the same backend the leaves/overtime/SHEQ/maintenance pages themselves use: pending
// leave and overtime applications, unresolved SHEQ inspections, and overdue work
// orders. Merged into the bell dropdown alongside useDashboardData's work-order/
// breakdown activity feed (useNotifications does the merging).
//
// Manager+ only: these are approval/response-owner items a viewer can't act on, and
// leaves/overtime require a signed-in token anyway (GET /api/leaves and /api/overtime
// are auth-gated server-side — see app/routers/leaves.py, overtime.py).
'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CalendarDays, Clock, ShieldAlert, AlertTriangle, ListTodo, type LucideIcon } from '@/components/shared/theme';
import { timeAgo, type ActivityItem } from './useDashboardData';

async function safeJson(url: string, needsAuth = false): Promise<any> {
  try {
    const r = needsAuth ? await authFetch(url) : await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function toItem(id: string, action: string, module: string, icon: LucideIcon, iso: string | null | undefined, status: ActivityItem['status'], user?: string): ActivityItem {
  return { id, action, module, icon, time: timeAgo(iso), timestamp: new Date(iso || 0).getTime(), status, user };
}

export function useOperationalAlerts() {
  const { isAtLeast } = useAuth();
  const canView = isAtLeast('manager');
  const [alerts, setAlerts] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(canView);

  useEffect(() => {
    if (!canView) { setAlerts([]); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const [leaves, overtime, sheq, workOrders, tasksEvents] = await Promise.all([
        safeJson(`${API_BASE}/api/leaves?status=pending`, true),
        safeJson(`${API_BASE}/api/overtime?status=pending`, true),
        safeJson(`${API_BASE}/api/sheq?status=open`, true),
        safeJson(`${API_BASE}/api/maintenance/work-orders?status=pending&limit=50`, true),
        safeJson(`${API_BASE}/api/tasks-events?status=pending`, true),
      ]);
      if (cancelled) return;

      const leaveItems: ActivityItem[] = Array.isArray(leaves)
        ? leaves.slice(0, 5).map((l: any) => toItem(
          `leave-${l.id}`, `Leave pending approval — ${l.employee_name} (${l.leave_type}, ${l.total_days}d)`,
          'Leaves', CalendarDays, l.applied_date, 'pending', l.employee_name,
        ))
        : [];

      const otItems: ActivityItem[] = Array.isArray(overtime)
        ? overtime.slice(0, 5).map((o: any) => toItem(
          `ot-${o.id}`, `Overtime pending approval — ${o.employee_name} (${o.date})`,
          'Overtime', Clock, o.applied_date, 'pending', o.employee_name,
        ))
        : [];

      const sheqItems: ActivityItem[] = Array.isArray(sheq)
        ? sheq.filter((s: any) => s.status && s.status !== 'closed').slice(0, 5).map((s: any) => toItem(
          `sheq-${s.id}`, `SHEQ inspection unresolved — ${s.title}`,
          'SHEQ', ShieldAlert, s.date, 'critical',
        ))
        : [];

      const now = Date.now();
      const overdueItems: ActivityItem[] = Array.isArray(workOrders)
        ? workOrders
          .filter((w: any) => w.due_date && new Date(w.due_date).getTime() < now)
          .slice(0, 5)
          .map((w: any) => toItem(
            `wo-overdue-${w.id}`, `Work order overdue — ${w.work_order_number ? `#${w.work_order_number}` : `#${w.id}`}`,
            'Maintenance', AlertTriangle, w.due_date, 'critical', w.requested_by,
          ))
        : [];

      const overdueTaskItems: ActivityItem[] = Array.isArray(tasksEvents)
        ? tasksEvents
          .filter((te: any) => te.due_date && new Date(te.due_date).getTime() < now)
          .slice(0, 5)
          .map((te: any) => toItem(
            `te-overdue-${te.id}`, `${te.task_type || 'Task'} overdue — ${te.title}`,
            'Events & Tasks', ListTodo, te.due_date, 'critical', (te.responsible_people || [])[0],
          ))
        : [];

      const merged = [...leaveItems, ...otItems, ...sheqItems, ...overdueItems, ...overdueTaskItems]
        .filter(i => i.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp);

      setAlerts(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [canView]);

  return { alerts, loading };
}
