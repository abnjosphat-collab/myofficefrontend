// components/app-shell/useNotifications.ts — thin layer over the live activity feed
// (useDashboardData) that adds read/unread state. Notifications themselves are real
// (derived from backend work-orders + breakdowns); this hook just remembers which
// ones the user has already seen (persisted in localStorage) so the bell badge can
// reflect a genuine unread count rather than "is anything urgent".
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardData, type ActivityItem } from './useDashboardData';

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
  const { activity, loading } = useDashboardData();
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

  const notifications = useMemo<Notification[]>(
    () => activity.map(a => ({ ...a, unread: !seenSet.has(a.id) })),
    [activity, seenSet],
  );

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  const markAllRead = useCallback(() => {
    const ids = activity.map(a => a.id);
    const merged = Array.from(new Set([...readSeen(), ...ids]));
    writeSeen(merged);
    setSeen(merged);
  }, [activity]);

  return { notifications, unreadCount, loading, markAllRead };
}
