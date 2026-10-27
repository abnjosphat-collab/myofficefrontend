// components/app-shell/useOperationalAlerts.ts — real, actionable alerts pulled from
// the same backend the leaves/overtime/SHEQ/maintenance pages themselves use: pending
// leave and overtime applications, unresolved SHEQ inspections, overdue work
// orders (every open status, not just pending), jobs waiting for foreman
// sign-off, and recent feedback for admins. Merged into the bell dropdown alongside useDashboardData's work-order/
// breakdown activity feed (useNotifications does the merging; "assigned to me" is every user's own hook, useMyWorkAlerts).
//
// Manager+ only: these are approval/response-owner items a viewer can't act on, and
// leaves/overtime require a signed-in token anyway (GET /api/leaves and /api/overtime
// are auth-gated server-side — see app/routers/leaves.py, overtime.py).
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { fetchRemoteEvents, type EnrichedUsageEvent } from '@/lib/usage';
import { CalendarDays, Clock, Key, ShieldAlert, AlertTriangle, ListTodo, MessageSquare, PenLine, type LucideIcon } from '@/components/ui-system';
import { fetchOrNull } from './fetchOrNull';
import { timeAgo, type ActivityItem, type AlertGroup, type SourceResult } from './useDashboardData';

// The fields each alert source provides (all optional beyond the id: a partial row must not break the bell).
interface LeaveRow { id: number | string; employee_name?: string; leave_type?: string; total_days?: number; applied_date?: string | null }
interface OvertimeRow { id: number | string; employee_name?: string; date?: string; applied_date?: string | null }
interface SheqRow { id: number | string; status?: string | null; title?: string; date?: string | null }
interface WorkOrderRow { id: number | string; work_order_number?: string | null; due_date?: string | null; requested_by?: string; status?: string | null; foreman_sign?: string | null; completed_at?: string | null; artisan_date?: string | null; date_raised?: string | null; created_at?: string | null }
interface TaskEventRow { id: number | string; task_type?: string | null; title?: string; due_date?: string | null; responsible_people?: string[] | null }
interface PwRequestRow { id: number | string; identifier?: string; created_at?: string | null }
interface FeedbackBellRow { ts: number; page: string; text: string; userEmail: string | null }

/** The eight backlog sources this hook fetches (notices, assigned-to-me and the activity feed have their own producers). */
export type OpGroup = 'pw' | 'leave' | 'overtime' | 'sheq' | 'workorders' | 'signoff' | 'tasks' | 'feedback';
export const OP_GROUPS: readonly OpGroup[] = ['pw', 'leave', 'overtime', 'sheq', 'workorders', 'signoff', 'tasks', 'feedback'];
/** Bell-facing names, one per source: the failure warning reads these, so they match the group headers. */
export const OP_LABELS: Record<OpGroup, string> = {
  pw: 'Password resets', leave: 'Leave approvals', overtime: 'Overtime approvals',
  sheq: 'SHEQ follow-ups', workorders: 'Overdue work orders', signoff: 'Waiting for sign-off', tasks: 'Overdue tasks',
  feedback: 'Feedback',
};
/** What the bell shows per group: the backlog behind the slice, and what survived into the list. */
export interface GroupTotal { total: number; shown: number }
export type OpTotals = Record<OpGroup, GroupTotal>;
const EMPTY_TOTALS: OpTotals = {
  pw: { total: 0, shown: 0 }, leave: { total: 0, shown: 0 }, overtime: { total: 0, shown: 0 },
  sheq: { total: 0, shown: 0 }, workorders: { total: 0, shown: 0 }, signoff: { total: 0, shown: 0 }, tasks: { total: 0, shown: 0 },
  feedback: { total: 0, shown: 0 },
};

/** Terminal work-order statuses (WORK_ORDERS.md): never overdue, never in a backlog. */
export function isTerminalWorkOrder(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'not-done';
}

function toItem(id: string, action: string, module: string, icon: LucideIcon, iso: string | null | undefined, status: ActivityItem['status'], href: string, group: AlertGroup, user?: string, actionLabel?: string): ActivityItem {
  return { id, action, module, icon, time: timeAgo(iso), timestamp: new Date(iso || 0).getTime(), status, user, href, actionLabel, group };
}

const OP_URLS: Record<OpGroup, string> = {
  pw: `${API_BASE}/api/admin/password-reset-requests?status=pending`,
  leave: `${API_BASE}/api/leaves?status=pending`,
  overtime: `${API_BASE}/api/overtime?status=pending`,
  sheq: `${API_BASE}/api/sheq?status=open`,
  workorders: `${API_BASE}/api/maintenance/work-orders?overdue=true&limit=250`,
  signoff: `${API_BASE}/api/maintenance/work-orders?awaiting_signoff=true&limit=100`,
  tasks: `${API_BASE}/api/tasks-events?status=pending`,
  feedback: `${API_BASE}/api/usage/events`,
};

/** One fetch per source, loosely typed at the boundary; buildOpAlerts re-asserts the row shape. */
type OpRaw = Record<OpGroup, unknown[] | null>;
const OP_FETCH: Record<OpGroup, () => Promise<unknown[] | null>> = {
  pw: () => fetchOrNull<PwRequestRow[]>(OP_URLS.pw),
  leave: () => fetchOrNull<LeaveRow[]>(OP_URLS.leave),
  overtime: () => fetchOrNull<OvertimeRow[]>(OP_URLS.overtime),
  sheq: () => fetchOrNull<SheqRow[]>(OP_URLS.sheq),
  workorders: () => fetchOrNull<WorkOrderRow[]>(OP_URLS.workorders),
  signoff: () => fetchOrNull<WorkOrderRow[]>(OP_URLS.signoff),
  tasks: () => fetchOrNull<TaskEventRow[]>(OP_URLS.tasks),
  feedback: async () => {
    // Last-30-days feedback for the admin bell (the analyzer keeps the full view).
    // New-vs-read comes from the bell's own seen-list, like every other source.
    try {
      const events = await fetchRemoteEvents(30);
      return events
        .filter((e): e is Extract<EnrichedUsageEvent, { type: 'feedback' }> => e.type === 'feedback')
        .sort((a, b) => b.ts - a.ts)
        .map((e): FeedbackBellRow => ({ ts: e.ts, page: e.page, text: e.text, userEmail: e.userEmail }));
    } catch { return null; }
  },
};

/** Pure — the asked sources and whether each answered; unasked (role-gated) sources are absent, never errors. */
export function opSources(raw: OpRaw, askAdmin: boolean): SourceResult[] {
  return OP_GROUPS
    .filter(g => (g !== 'pw' && g !== 'feedback') || askAdmin)
    .map(group => ({ source: group, label: OP_LABELS[group], ok: raw[group] !== null }));
}

/** Pure — alerts + totals from one answer per source. Shared by the initial load and per-source retries. */
export function buildOpAlerts(raw: OpRaw): { alerts: ActivityItem[]; failed: boolean; totals: OpTotals } {
  const pwRequests = raw.pw as PwRequestRow[] | null;
  const leaves = raw.leave as LeaveRow[] | null;
  const overtime = raw.overtime as OvertimeRow[] | null;
  const sheq = raw.sheq as SheqRow[] | null;
  const workOrders = raw.workorders as WorkOrderRow[] | null;
  const signoffRows = raw.signoff as WorkOrderRow[] | null;
  const tasksEvents = raw.tasks as TaskEventRow[] | null;
  const feedbackRows = raw.feedback as FeedbackBellRow[] | null;
  // fetchOrNull returns null when a request fails; an empty list is a real answer.
  const failed = [leaves, overtime, sheq, workOrders, signoffRows, tasksEvents, pwRequests, feedbackRows].some(r => r === null);

  const now = Date.now();
  // The backlog behind each bell slice: filtered (open/overdue only) but
  // unsliced, so the bell can say "showing 5 of 12" honestly. A failed
  // source reads as an empty backlog here; it is named in `sources`.
  const backlog = {
    pw: Array.isArray(pwRequests) ? pwRequests : [],
    leave: Array.isArray(leaves) ? leaves : [],
    overtime: Array.isArray(overtime) ? overtime : [],
    sheq: Array.isArray(sheq) ? sheq.filter(s => s.status && s.status !== 'closed') : [],
    // The server already sliced these (M8 filters), but a backend from before M8 answers the same URLs with
    // unfiltered rows — so the client re-asserts the slice. That keeps the bell honest on a preview build too.
    workorders: Array.isArray(workOrders) ? workOrders.filter(w => !isTerminalWorkOrder(w.status) && w.due_date && new Date(w.due_date).getTime() < now) : [],
    signoff: Array.isArray(signoffRows) ? signoffRows.filter(w => w.status === 'completed' && !(w.foreman_sign || '').trim()) : [],
    tasks: Array.isArray(tasksEvents) ? tasksEvents.filter(te => te.due_date && new Date(te.due_date).getTime() < now) : [],
    feedback: Array.isArray(feedbackRows) ? feedbackRows : [],
  };

  const pwItems: ActivityItem[] = backlog.pw.slice(0, 5).map(p => toItem(
    `pw-${p.id}`, `Password reset requested — ${p.identifier ?? 'an account'}`,
    'Users', Key, p.created_at, 'pending', '/admin', 'pw', p.identifier,
  ));

  const leaveItems: ActivityItem[] = backlog.leave.slice(0, 5).map(l => toItem(
    `leave-${l.id}`, `Leave pending approval — ${l.employee_name} (${l.leave_type}, ${l.total_days}d)`,
    'Leaves', CalendarDays, l.applied_date, 'pending', `/leaves?open=${l.id}&sign=approve`, 'leave', l.employee_name, 'Review and sign',
  ));

  const otItems: ActivityItem[] = backlog.overtime.slice(0, 5).map(o => toItem(
    `ot-${o.id}`, `Overtime pending approval — ${o.employee_name} (${o.date})`,
    'Overtime', Clock, o.applied_date, 'pending', `/overtime?open=${o.id}&sign=approve`, 'overtime', o.employee_name, 'Review and sign',
  ));

  const sheqItems: ActivityItem[] = backlog.sheq.slice(0, 5).map(s => toItem(
    `sheq-${s.id}`, `SHEQ inspection unresolved — ${s.title}`,
    'SHEQ', ShieldAlert, s.date, 'critical', `/sheq_inspection?open=${s.id}`, 'sheq',
  ));

  const signoffItems: ActivityItem[] = backlog.signoff.slice(0, 5).map(w => toItem(
    `wo-signoff-${w.id}`, `Work order waiting for sign-off — ${w.work_order_number ? `#${w.work_order_number}` : `#${w.id}`}`,
    'Maintenance', PenLine, w.completed_at || w.artisan_date || w.date_raised || w.created_at, 'pending', `/maintenance?open=${w.id}`, 'signoff', w.requested_by,
  ));

  const overdueItems: ActivityItem[] = backlog.workorders.slice(0, 5).map(w => toItem(
    `wo-overdue-${w.id}`, `Work order overdue — ${w.work_order_number ? `#${w.work_order_number}` : `#${w.id}`}`,
    'Maintenance', AlertTriangle, w.due_date, 'critical', `/maintenance?open=${w.id}`, 'workorders', w.requested_by,
  ));

  const overdueTaskItems: ActivityItem[] = backlog.tasks.slice(0, 5).map(te => toItem(
    `te-overdue-${te.id}`, `${te.task_type || 'Task'} overdue — ${te.title}`,
    'Events & Tasks', ListTodo, te.due_date, 'critical', `/tasks-events?open=${te.id}`, 'tasks', (te.responsible_people || [])[0],
  ));

  const feedbackItems: ActivityItem[] = backlog.feedback.slice(0, 5).map((f, i) => {
    const snippet = f.text.length > 90 ? `${f.text.slice(0, 90).trimEnd()}…` : f.text;
    return toItem(
      `feedback-${f.ts}-${i}`, `Feedback on ${f.page || 'the app'}${snippet ? ` — ${snippet}` : ''}`,
      'Feedback', MessageSquare, new Date(f.ts).toISOString(), 'pending', '/usage-analyzer#feedback', 'feedback', f.userEmail ?? undefined,
    );
  });

  const merged = [...pwItems, ...leaveItems, ...otItems, ...sheqItems, ...overdueItems, ...signoffItems, ...overdueTaskItems, ...feedbackItems]
    .filter(i => i.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Shown counts what actually reaches the bell: an item without a date is
  // dropped by the merge filter above but still counted in its total.
  const alive = (items: ActivityItem[]) => items.filter(i => i.timestamp > 0).length;
  const totals: OpTotals = {
    pw: { total: backlog.pw.length, shown: alive(pwItems) },
    leave: { total: backlog.leave.length, shown: alive(leaveItems) },
    overtime: { total: backlog.overtime.length, shown: alive(otItems) },
    sheq: { total: backlog.sheq.length, shown: alive(sheqItems) },
    workorders: { total: backlog.workorders.length, shown: alive(overdueItems) },
    signoff: { total: backlog.signoff.length, shown: alive(signoffItems) },
    tasks: { total: backlog.tasks.length, shown: alive(overdueTaskItems) },
    feedback: { total: backlog.feedback.length, shown: alive(feedbackItems) },
  };

  return { alerts: merged, failed, totals };
}

export function useOperationalAlerts() {
  const { isAtLeast } = useAuth();
  const canView = isAtLeast('manager');
  const isAdmin = isAtLeast('admin');
  const [loaded, setLoaded] = useState<{ alerts: ActivityItem[]; failed: boolean; totals: OpTotals } | null>(null);
  const [sources, setSources] = useState<SourceResult[]>([]);
  // Last-good answers per source: a retry re-fetches ONE endpoint and rebuilds against the rest.
  const dataRef = useRef<OpRaw | null>(null);

  const applyRaw = useCallback((raw: OpRaw, askAdmin: boolean) => {
    dataRef.current = raw;
    setLoaded(buildOpAlerts(raw));
    setSources(opSources(raw, askAdmin));
  }, []);

  /** Re-fetch one source (a bell Retry); unasked stays unasked, other sources keep their answers. */
  const reloadSource = useCallback(async (group: OpGroup) => {
    const prev = dataRef.current;
    if (!canView || !prev) return;
    if ((group === 'pw' || group === 'feedback') && !isAdmin) return;
    const fresh = await OP_FETCH[group]();
    const next: OpRaw = { ...prev, [group]: fresh };
    applyRaw(next, isAdmin);
  }, [canView, isAdmin, applyRaw]);

  useEffect(() => {
    if (!canView) return; // nothing to fetch; the values below say "no alerts" without touching state
    let cancelled = false;

    async function load() {
      // Reset asks are admin-only server-side, and the feedback bell source is admin-only by decision
      // (managers read the same feedback in the analyzer instead). A manager asks for
      // nothing rather than a 403 that would read as failure.
      const [leave, overtime, sheq, workorders, signoff, tasks, pw, feedback] = await Promise.all([
        OP_FETCH.leave(), OP_FETCH.overtime(), OP_FETCH.sheq(), OP_FETCH.workorders(), OP_FETCH.signoff(), OP_FETCH.tasks(),
        isAdmin ? OP_FETCH.pw() : Promise.resolve<unknown[] | null>([]),
        isAdmin ? OP_FETCH.feedback() : Promise.resolve<unknown[] | null>([]),
      ]);
      if (cancelled) return;
      applyRaw({ leave, overtime, sheq, workorders, signoff, tasks, pw, feedback }, isAdmin);
    }

    load();
    return () => { cancelled = true; };
  }, [canView, isAdmin, applyRaw]);

  if (!canView) return { alerts: [] as ActivityItem[], loading: false, failed: false, totals: EMPTY_TOTALS, sources: [] as SourceResult[], reloadSource };
  const { alerts, failed, totals } = loaded ?? { alerts: [] as ActivityItem[], failed: false, totals: EMPTY_TOTALS };
  return { alerts, loading: loaded === null, failed, totals, sources, reloadSource };
}
