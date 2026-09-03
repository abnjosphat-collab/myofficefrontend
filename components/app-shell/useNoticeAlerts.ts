// components/app-shell/useNoticeAlerts.ts — folds active Noticeboard notices into the
// bell notification system (useNotifications merges this alongside useDashboardData's
// activity feed and useOperationalAlerts' pending-approval alerts). Previously the
// Noticeboard module had zero presence in the notification system at all — posting a
// notice notified nobody outside the Noticeboard page itself.
//
// Unlike useOperationalAlerts, this is NOT manager-gated — notices are for all
// employees. The one real per-audience filter available is `target_audience ===
// 'Management Only'`, checked the same way useOperationalAlerts checks manager-ness;
// the other target_audience values (Department Specific, Remote Workers, New Hires)
// have no backing employee attribute anywhere in this app to filter by, so those are
// shown to everyone rather than faking targeting the data model can't support.
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, Pin, type LucideIcon } from '@/components/shared/theme';
import { timeAgo, type ActivityItem } from './useDashboardData';
import { getAllNotices } from '@/app/noticeboard/useNoticeboardData';
import type { Notice } from '@/app/noticeboard/types';

const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function noticeStatus(priority: string): ActivityItem['status'] {
  if (priority === 'Critical') return 'critical';
  if (priority === 'Low') return 'normal';
  return 'pending';
}

function toActivityItem(n: Notice): ActivityItem {
  const icon: LucideIcon = n.is_pinned ? Pin : Bell;
  return {
    id: `notice-${n.id}`,
    action: n.title,
    module: 'Noticeboard',
    icon,
    time: timeAgo(n.date),
    timestamp: new Date(n.date).getTime(),
    status: noticeStatus(n.priority),
    user: n.author ?? undefined,
  };
}

/** Pure — filters out expired and (for non-managers) Management-Only notices, sorts
 *  pinned-first then by priority then by date descending. Exported so this shaping
 *  logic is directly testable without mocking fetch/auth. */
export function buildNoticeAlerts(
  notices: Notice[],
  isManager: boolean,
  now: Date = new Date(),
): { notices: Notice[]; alerts: ActivityItem[] } {
  const eligible = notices.filter(n => {
    if (n.expires_at && new Date(n.expires_at) < now) return false;
    if (n.target_audience === 'Management Only' && !isManager) return false;
    return true;
  });

  const sorted = [...eligible].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const priorityDelta = (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return { notices: sorted, alerts: sorted.map(toActivityItem) };
}

export function useNoticeAlerts() {
  const { user, isAtLeast } = useAuth();
  const isManager = isAtLeast('manager');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [alerts, setAlerts] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) { setNotices([]); setAlerts([]); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const all = await getAllNotices({ status: 'Active' });
        if (cancelled) return;
        const built = buildNoticeAlerts(all, isManager);
        setNotices(built.notices);
        setAlerts(built.alerts);
      } catch {
        if (!cancelled) { setNotices([]); setAlerts([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, isManager]);

  return { notices, alerts, loading };
}
