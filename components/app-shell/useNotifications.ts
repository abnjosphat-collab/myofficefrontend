// components/app-shell/useNotifications.ts — thin layer over the live activity feed
// (useDashboardData's work-orders/breakdowns + useMyWorkAlerts' assigned-to-me + useOperationalAlerts' pending leave/
// overtime approvals, unresolved SHEQ inspections, and overdue work orders) that adds
// read/unread state. Notifications themselves are real, backend-derived; this hook
// just remembers which ones the user has already seen (persisted in localStorage) so
// the bell badge can reflect a genuine unread count rather than "is anything urgent".
'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useDashboardData, type ActivityItem, type DashActivitySource, type SourceResult } from './useDashboardData';
import { OP_GROUPS, useOperationalAlerts, type GroupTotal, type OpGroup } from './useOperationalAlerts';
import { useMyWorkAlerts } from './useMyWorkAlerts';
import { useNoticeAlerts } from './useNoticeAlerts';

const SEEN_KEY = 'oz_notifSeen';
const SEEN_EVENT = 'oz-notif-seen-changed';

/** The stored list exactly as written: a string, so React can compare snapshots by value. */
function readSeenRaw(): string {
  try { return window.localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; }
}

function parseSeen(raw: string): string[] {
  try {
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function readSeen(): string[] {
  if (typeof window === 'undefined') return [];
  return parseSeen(readSeenRaw());
}

// Another tab (storage) or another component on this page (SEEN_EVENT) changed the list.
function subscribeSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function writeSeen(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    // Cap so the seen-list can't grow unbounded as activity ids churn.
    const capped = ids.slice(-200);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(capped));
    // Defer so a caller inside another component's setState batch (e.g. the bell
    // toggle) doesn't synchronously setState in every useNotifications subscriber.
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(SEEN_EVENT)));
  } catch { /* storage unavailable — non-fatal */ }
}

export interface Notification extends ActivityItem {
  unread: boolean;
}

/** The bell groups with backlog counts: the approval/follow-up sources plus assigned-to-me and notices. The activity feed has none. */
export type BellGroup = OpGroup | 'mywork' | 'notices';
export type BellTotals = Record<BellGroup, GroupTotal>;

export function useNotifications() {
  const { activity, loading: activityLoading, activityFailed, sources: dashSources, reloadSource: reloadDash } = useDashboardData();
  const { alerts, loading: alertsLoading, failed: alertsFailed, totals: opTotals, sources: opSources, reloadSource: reloadOp } = useOperationalAlerts();
  const { alerts: noticeAlerts, loading: noticeLoading, failed: noticeFailed, sources: noticeSources, reload: reloadNotices } = useNoticeAlerts();
  const { alerts: myWorkAlerts, loading: myWorkLoading, failed: myWorkFailed, total: myWorkTotal, sources: myWorkSources, reloadSource: reloadMyWork } = useMyWorkAlerts();
  /** True when any source could not be loaded, so an empty list is not mistaken for "nothing to report". */
  const failed = activityFailed || alertsFailed || noticeFailed || myWorkFailed;
  const loading = activityLoading || alertsLoading || noticeLoading || myWorkLoading;
  // Read straight from the store: the server render (and hydration) sees nothing marked read, then the browser's list.
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeenRaw, () => '');
  const seenSet = useMemo(() => new Set(parseSeen(seenRaw)), [seenRaw]);

  // Your own jobs surface first — then the alerts (pending approvals, unresolved SHEQ, overdue work orders),
  // they're the ones with an actual action attached, not just "here's what happened."
  // Notices come next — still worth seeing promptly, but not a personal approval queue.
  const merged = useMemo(() => [...myWorkAlerts, ...alerts, ...noticeAlerts, ...activity], [myWorkAlerts, alerts, noticeAlerts, activity]);

  const notifications = useMemo<Notification[]>(
    () => merged.map(a => ({ ...a, unread: !seenSet.has(a.id) })),
    [merged, seenSet],
  );

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  // Notices are never sliced, so their total is what arrived; the backlog
  // sources report the count behind their slice from useOperationalAlerts.
  const totals = useMemo<BellTotals>(() => ({
    ...opTotals,
    mywork: myWorkTotal,
    notices: { total: noticeAlerts.length, shown: noticeAlerts.length },
  }), [opTotals, noticeAlerts, myWorkTotal]);

  const markRead = useCallback((ids: string[]) => {
    const combined = Array.from(new Set([...readSeen(), ...ids]));
    writeSeen(combined); // announces the change, which re-reads the store in every subscriber, this one included
  }, []);

  const markAllRead = useCallback(() => {
    markRead(merged.map(a => a.id));
  }, [merged, markRead]);

  /** Every asked source that did not answer, in feed order: the bell warning names these. */
  const failedSources = useMemo<SourceResult[]>(
    () => [...myWorkSources, ...opSources, ...noticeSources, ...dashSources].filter(s => !s.ok),
    [myWorkSources, opSources, noticeSources, dashSources],
  );

  /** Route a bell Retry to the hook that owns the source; unknown keys are ignored. */
  const retry = useCallback((source: string) => {
    if (source === 'notices') { reloadNotices(); return; }
    if (source === 'mywork') { void reloadMyWork(); return; }
    if (source === 'activity-workorders' || source === 'activity-breakdowns') {
      reloadDash(source as DashActivitySource);
      return;
    }
    if ((OP_GROUPS as readonly string[]).includes(source)) reloadOp(source as OpGroup);
  }, [reloadOp, reloadDash, reloadNotices, reloadMyWork]);

  return { notifications, unreadCount, loading, failed, markAllRead, markRead, totals, failedSources, retry };
}
