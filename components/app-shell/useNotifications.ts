// components/app-shell/useNotifications.ts — thin layer over the live activity feed
// (useDashboardData's work-orders/breakdowns + useOperationalAlerts' pending leave/
// overtime approvals, unresolved SHEQ inspections, and overdue work orders) that adds
// read/unread state. Notifications themselves are real, backend-derived; this hook
// just remembers which ones the user has already seen (persisted in localStorage) so
// the bell badge can reflect a genuine unread count rather than "is anything urgent".
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardData, type ActivityItem } from './useDashboardData';
import { useOperationalAlerts } from './useOperationalAlerts';

const SEEN_KEY = 'oz_notifSeen';
const SEEN_EVENT = 'oz-notif-seen-changed';

function readSeen(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeSeen(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    // Cap so the seen-list can't grow unbounded as activity ids churn.
    const capped = ids.slice(-200);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(capped));
    window.dispatchEvent(new CustomEvent(SEEN_EVENT));
  } catch { /* storage unavailable — non-fatal */ }
}

export interface Notification extends ActivityItem {
  unread: boolean;
}

export function useNotifications() {
  const { activity, loading: activityLoading } = useDashboardData();
  const { alerts, loading: alertsLoading } = useOperationalAlerts();
  const loading = activityLoading || alertsLoading;
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    setSeen(readSeen());
    const onChange = () => setSeen(readSeen());
    window.addEventListener(SEEN_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(SEEN_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const seenSet = useMemo(() => new Set(seen), [seen]);

  // Alerts (pending approvals, unresolved SHEQ, overdue work orders) surface first —
  // they're the ones with an actual action attached, not just "here's what happened."
  const merged = useMemo(() => [...alerts, ...activity], [alerts, activity]);

  const notifications = useMemo<Notification[]>(
    () => merged.map(a => ({ ...a, unread: !seenSet.has(a.id) })),
    [merged, seenSet],
  );

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  const markAllRead = useCallback(() => {
    const ids = merged.map(a => a.id);
    const combined = Array.from(new Set([...readSeen(), ...ids]));
    writeSeen(combined);
    setSeen(combined);
  }, [merged]);

  return { notifications, unreadCount, loading, markAllRead };
}
