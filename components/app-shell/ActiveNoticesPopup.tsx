// components/app-shell/ActiveNoticesPopup.tsx — the "show me active notices when I
// open the system" popup. Mounted once in AppShell.tsx, alongside the PreferencesPanel/
// hasSeenPrefs first-run pattern it's structurally modeled on (check something on
// mount, conditionally show a global overlay) — except gated by session + per-notice
// seen state instead of a permanent first-run flag, since this is meant to recur every
// fresh session, not just once ever.
//
// Dismissing a card (or "Got it" for a requires_acknowledgment one — same action,
// honestly labeled: there's no backend acknowledgment-tracking to claim otherwise,
// see useNoticeAlerts.ts) marks it read via useNotifications' shared oz_notifSeen
// store, so it also clears from the bell's unread count — one seen-state, not two.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme, TYPE_WEIGHT, StatusBadge, X, Pin } from '@/components/shared/theme';
import { useNoticeAlerts } from './useNoticeAlerts';
import { useNotifications } from './useNotifications';
import type { Notice } from '@/app/noticeboard/types';

// AppShell isn't a persistent layout — every page wraps itself in <AppShell>
// individually, so it fully remounts on every client-side navigation. Without this,
// a plain "check on mount" would re-trigger the popup on every page click. Session-
// scoped (not localStorage) on purpose: a fresh tab/session should see it again.
const SESSION_KEY = 'oz_noticesPopupShown';
function hasShownThisSession(): boolean {
  if (typeof window === 'undefined') return true;
  try { return window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return true; }
}
function markShownThisSession() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable — non-fatal */ }
}

const PRIORITY_ACCENT: Record<string, string> = { Critical: '#f43f5e', High: '#f97316', Medium: '#60a5fa', Low: '#94a3b8' };

const truncate = (text: string, max = 90) => (text.length <= max ? text : `${text.slice(0, max)}…`);

export function ActiveNoticesPopup() {
  const t = useTheme();
  const router = useRouter();
  const { notices, loading: noticesLoading } = useNoticeAlerts();
  const { notifications, loading: notifLoading, markRead } = useNotifications();
  // null = this mount hasn't decided what to show yet; [] = decided, nothing (or
  // everything) has been dismissed since.
  const [shownIds, setShownIds] = useState<string[] | null>(null);

  const unreadNoticeIds = useMemo(
    () => new Set(notifications.filter(n => n.module === 'Noticeboard' && n.unread).map(n => n.id)),
    [notifications],
  );

  useEffect(() => {
    if (shownIds !== null) return; // already decided this mount
    if (noticesLoading || notifLoading) return;
    if (hasShownThisSession()) { setShownIds([]); return; }
    markShownThisSession();
    setShownIds(notices.filter(n => unreadNoticeIds.has(`notice-${n.id}`)).map(n => `notice-${n.id}`));
  }, [noticesLoading, notifLoading, shownIds, notices, unreadNoticeIds]);

  const displayed: Notice[] = shownIds ? notices.filter(n => shownIds.includes(`notice-${n.id}`)) : [];

  const dismiss = (id: string) => {
    markRead([`notice-${id}`]);
    setShownIds(prev => (prev ?? []).filter(x => x !== `notice-${id}`));
  };
  const dismissAll = () => {
    markRead(displayed.map(n => `notice-${n.id}`));
    setShownIds([]);
  };
  const openNotice = () => router.push('/noticeboard');

  if (displayed.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 w-80 max-h-[70vh] overflow-y-auto space-y-2" aria-live="polite">
      <div className="flex items-center justify-between px-1">
        <span className={`text-[11px] ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>
          {displayed.length} Active Notice{displayed.length !== 1 ? 's' : ''}
        </span>
        {displayed.length > 1 && (
          <button type="button" onClick={dismissAll} className={`text-[11px] ${t.textFaint} hover:text-rose-500 transition-colors`}>
            Dismiss all
          </button>
        )}
      </div>
      <AnimatePresence>
        {displayed.map((notice, i) => (
          <motion.div
            key={notice.id}
            layout
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320, delay: i * 0.08 }}
            className={`relative overflow-hidden rounded-xl ${t.glass} ${t.shadow} cursor-pointer`}
            onClick={openNotice}
          >
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: PRIORITY_ACCENT[notice.priority] ?? '#94a3b8' }} />
            <div className="pl-4 pr-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {notice.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                  <p className={`text-sm ${TYPE_WEIGHT.semibold} truncate ${t.textPrimary}`}>{notice.title}</p>
                </div>
                <button type="button" title="Dismiss" onClick={e => { e.stopPropagation(); dismiss(notice.id); }}
                  className={`shrink-0 h-5 w-5 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-colors`}>
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className={`text-xs mt-1 ${t.textMuted}`}>{truncate(notice.content)}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge color="#64748b" label={notice.category} />
                  <StatusBadge color={PRIORITY_ACCENT[notice.priority] ?? '#94a3b8'} label={notice.priority} />
                </div>
                {notice.requires_acknowledgment && (
                  <button type="button" onClick={e => { e.stopPropagation(); dismiss(notice.id); }}
                    className={`shrink-0 text-[11px] ${TYPE_WEIGHT.semibold} px-2.5 py-1 rounded-lg text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
                    Got it
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
