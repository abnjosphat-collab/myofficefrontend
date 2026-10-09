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
import { useAuth } from '@/lib/auth-context';
import { CalendarDays, Clock, ShieldAlert, AlertTriangle, ListTodo, type LucideIcon } from '@/components/ui-system';
import { fetchOrNull } from './fetchOrNull';
import { timeAgo, type ActivityItem } from './useDashboardData';

// The fields each alert source provides (all optional beyond the id: a partial row must not break the bell).
interface LeaveRow { id: number | string; employee_name?: string; leave_type?: string; total_days?: number; applied_date?: string | null }
interface OvertimeRow { id: number | string; employee_name?: string; date?: string; applied_date?: string | null }
interface SheqRow { id: number | string; status?: string | null; title?: string; date?: string | null }
interface WorkOrderRow { id: number | string; work_order_number?: string | null; due_date?: string | null; requested_by?: string }
interface TaskEventRow { id: number | string; task_type?: string | null; title?: string; due_date?: string | null; responsible_people?: string[] | null }

function toItem(id: string, action: string, module: string, icon: LucideIcon, iso: string | null | undefined, status: ActivityItem['status'], user?: string): ActivityItem {
  return { id, action, module, icon, time: timeAgo(iso), timestamp: new Date(iso || 0).getTime(), status, user };
}

export function useOperationalAlerts() {
  const { isAtLeast } = useAuth();
  const canView = isAtLeast('manager');
  const [loaded, setLoaded] = useState<{ alerts: ActivityItem[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!canView) return; // nothing to fetch; the values below say "no alerts" without touching state
    let cancelled = false;

    async function load() {
      const [leaves, overtime, sheq, workOrders, tasksEvents] = await Promise.all([
        fetchOrNull<LeaveRow[]>(`${API_BASE}/api/leaves?status=pending`),
        fetchOrNull<OvertimeRow[]>(`${API_BASE}/api/overtime?status=pending`),
        fetchOrNull<SheqRow[]>(`${API_BASE}/api/sheq?status=open`),
        fetchOrNull<WorkOrderRow[]>(`${API_BASE}/api/maintenance/work-orders?status=pending&limit=50`),
        fetchOrNull<TaskEventRow[]>(`${API_BASE}/api/tasks-events?status=pending`),
      ]);
      if (cancelled) return;
      // fetchOrNull returns null when a request fails; an empty list is a real answer.
      const failed = [leaves, overtime, sheq, workOrders, tasksEvents].some(r => r === null);

      const leaveItems: ActivityItem[] = Array.isArray(leaves)
        ? leaves.slice(0, 5).map(l => toItem(
          `leave-${l.id}`, `Leave pending approval — ${l.employee_name} (${l.leave_type}, ${l.total_days}d)`,
          'Leaves', CalendarDays, l.applied_date, 'pending', l.employee_name,
        ))
        : [];

      const otItems: ActivityItem[] = Array.isArray(overtime)
        ? overtime.slice(0, 5).map(o => toItem(
          `ot-${o.id}`, `Overtime pending approval — ${o.employee_name} (${o.date})`,
          'Overtime', Clock, o.applied_date, 'pending', o.employee_name,
        ))
        : [];

      const sheqItems: ActivityItem[] = Array.isArray(sheq)
        ? sheq.filter(s => s.status && s.status !== 'closed').slice(0, 5).map(s => toItem(
          `sheq-${s.id}`, `SHEQ inspection unresolved — ${s.title}`,
          'SHEQ', ShieldAlert, s.date, 'critical',
        ))
        : [];

      const now = Date.now();
      const overdueItems: ActivityItem[] = Array.isArray(workOrders)
        ? workOrders
          .filter(w => w.due_date && new Date(w.due_date).getTime() < now)
          .slice(0, 5)
          .map(w => toItem(
            `wo-overdue-${w.id}`, `Work order overdue — ${w.work_order_number ? `#${w.work_order_number}` : `#${w.id}`}`,
            'Maintenance', AlertTriangle, w.due_date, 'critical', w.requested_by,
          ))
        : [];

      const overdueTaskItems: ActivityItem[] = Array.isArray(tasksEvents)
        ? tasksEvents
          .filter(te => te.due_date && new Date(te.due_date).getTime() < now)
          .slice(0, 5)
          .map(te => toItem(
            `te-overdue-${te.id}`, `${te.task_type || 'Task'} overdue — ${te.title}`,
            'Events & Tasks', ListTodo, te.due_date, 'critical', (te.responsible_people || [])[0],
          ))
        : [];

      const merged = [...leaveItems, ...otItems, ...sheqItems, ...overdueItems, ...overdueTaskItems]
        .filter(i => i.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp);

      setLoaded({ alerts: merged, failed });
    }

    load();
    return () => { cancelled = true; };
  }, [canView]);

  if (!canView) return { alerts: [] as ActivityItem[], loading: false, failed: false };
  return { alerts: loaded?.alerts ?? [], loading: loaded === null, failed: loaded?.failed ?? false };
}
