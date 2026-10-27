// components/app-shell/useMyWorkAlerts.ts — "assigned to me": the signed-in
// person's own open work orders, whatever their role (unlike
// useOperationalAlerts, which is manager-only). The server matches
// allocated_to/artisan_name against the session (GET
// /api/maintenance/work-orders?mine=true); the client re-asserts the slice
// so a backend from before M8 answers honestly too. Merged into the bell
// first by useNotifications — your own jobs outrank every other queue.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import { UserCheck } from '@/components/ui-system';
import { fetchOrNull } from './fetchOrNull';
import { isTerminalWorkOrder } from './useOperationalAlerts';
import { timeAgo, type ActivityItem, type SourceResult } from './useDashboardData';

// The fields this hook reads from each row (all optional beyond the id: a partial row must not break the bell).
export interface MyWorkRow {
  id: number | string;
  work_order_number?: string | null;
  equipment_info?: string | null;
  status?: string | null;
  due_date?: string | null;
  allocated_to?: string | null;
  artisan_name?: string | null;
  date_raised?: string | null;
  created_at?: string | null;
}

export const MYWORK_SOURCE = 'mywork';
export const MYWORK_LABEL = 'Assigned to me';
const MYWORK_URL = `${API_BASE}/api/maintenance/work-orders?mine=true&limit=100`;

/** One space between words, lower-cased — the same normalization the server matches on. */
export function normPerson(value: string | null | undefined): string {
  return (value ?? '').split(/\s+/).filter(Boolean).join(' ').toLowerCase();
}

/** Who the caller is, as allocated_to/artisan_name spellings (name and full email, like the server). */
export function myIdentities(fullName: string | null | undefined, email: string | null | undefined): Set<string> {
  return new Set([normPerson(fullName), normPerson(email)].filter(s => s !== ''));
}

function isOverdueMine(row: MyWorkRow, now: number): boolean {
  return !isTerminalWorkOrder(row.status) && !!row.due_date && new Date(row.due_date).getTime() < now;
}

/** Pure — the bell items, backlog total and shown count from one answer. Exported for tests. */
export function buildMyWorkItems(raw: unknown, identities: Set<string>): { items: ActivityItem[]; total: number; shown: number } {
  const rows = Array.isArray(raw) ? (raw as MyWorkRow[]) : [];
  const now = Date.now();
  // Open jobs only, always (no identity needed for that). The name match
  // applies when the caller has one; without it the server's answer stands.
  const mine = rows.filter(r => !isTerminalWorkOrder(r.status) && (identities.size === 0 || identities.has(normPerson(r.allocated_to)) || identities.has(normPerson(r.artisan_name))));
  const items: ActivityItem[] = mine.slice(0, 5).map((w): ActivityItem => {
    const overdue = isOverdueMine(w, now);
    const iso = w.due_date || w.date_raised || w.created_at || null;
    return {
      id: `wo-mine-${w.id}`,
      action: `${overdue ? 'Your work order is overdue' : 'Work order assigned to you'} — ${w.work_order_number ? `#${w.work_order_number}` : `#${w.id}`}${w.equipment_info ? ` (${w.equipment_info})` : ''}`,
      module: 'Maintenance',
      icon: UserCheck,
      time: timeAgo(iso),
      timestamp: new Date(iso || 0).getTime(),
      status: overdue ? 'critical' : 'pending',
      href: `/maintenance?open=${w.id}`,
      group: 'mywork',
    };
  }).filter(i => i.timestamp > 0);
  return { items, total: mine.length, shown: items.length };
}

export function useMyWorkAlerts() {
  const { user, profile, loading: authLoading } = useAuth();
  const signedIn = !!user;
  const [loaded, setLoaded] = useState<{ items: ActivityItem[]; total: number; shown: number } | null>(null);
  const [failed, setFailed] = useState(false);
  /** Consecutive quiet failures; the bell warning waits for the second one. */
  const quietFails = useRef(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) quietFails.current = 0;
    const raw = await fetchOrNull<unknown>(MYWORK_URL);
    if (raw === null) {
      // A failed background refresh keeps the shown items and stays silent the
      // first time; from the second failure in a row the bell says so.
      if (!quiet || ++quietFails.current >= 2) {
        setFailed(true);
        if (!quiet) setLoaded({ items: [], total: 0, shown: 0 });
      }
      return;
    }
    quietFails.current = 0;
    setFailed(false);
    setLoaded(buildMyWorkItems(raw, myIdentities(profile?.full_name, user?.email)));
  }, [profile?.full_name, user?.email]);

  // The bell re-reads every 15 s (its own pace, not the 60 s list pace).
  const quietLoad = useCallback(() => load(true), [load]);
  useAutoRefresh(quietLoad, { every: 15_000, enabled: signedIn });

  useEffect(() => {
    if (authLoading || !signedIn) return;
    let cancelled = false;
    void (async () => {
      const raw = await fetchOrNull<unknown>(MYWORK_URL);
      if (cancelled) return;
      if (raw === null) { setFailed(true); setLoaded({ items: [], total: 0, shown: 0 }); return; }
      // The profile can lag the session by a render: fall back to the
      // session's own name/email so the first answer still matches.
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const name = profile?.full_name ?? (typeof meta.full_name === 'string' ? meta.full_name : null);
      setFailed(false);
      setLoaded(buildMyWorkItems(raw, myIdentities(name, user?.email)));
    })();
    return () => { cancelled = true; };
  }, [authLoading, signedIn, profile?.full_name, user]);

  if (!signedIn) return { alerts: [] as ActivityItem[], loading: false, failed: false, total: { total: 0, shown: 0 }, sources: [] as SourceResult[], reloadSource: load };
  const { items, total, shown } = loaded ?? { items: [] as ActivityItem[], total: 0, shown: 0 };
  const sources: SourceResult[] = loaded === null && !failed ? [] : [{ source: MYWORK_SOURCE, label: MYWORK_LABEL, ok: !failed }];
  return { alerts: items, loading: loaded === null && !failed, failed, total: { total, shown }, sources, reloadSource: load };
}
