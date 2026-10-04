// components/app-shell/ActiveNoticesPopup.tsx — the "show me active notices when I
// open the system" popup. Mounted once in AppShell.tsx, alongside the settings dialog/
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
import { Button, IconButton, Icon, StatusBadge, type Tone } from '@/components/ui-system';
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

const PRIORITY: Record<string, { tone: Tone; accent: string }> = {
  Critical: { tone: 'danger', accent: 'border-l-danger' }, High: { tone: 'warning', accent: 'border-l-warning' },
  Medium: { tone: 'info', accent: 'border-l-info' }, Low: { tone: 'neutral', accent: 'border-l-line-strong' },
};

const truncate = (text: string, max = 90) => (text.length <= max ? text : `${text.slice(0, max)}…`);

export function ActiveNoticesPopup() {
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

  // Bottom of the screen, not the top: the top-right holds the page header's own actions, and on a phone it sits
  // under the top bar and over the page title.
  return (
    <div className="fixed inset-x-4 bottom-[calc(1rem+var(--mo-safe-bottom))] z-40 flex max-h-[40dvh] flex-col sm:max-h-[60dvh] gap-2 overflow-y-auto sm:inset-x-auto sm:right-4 sm:w-80" aria-live="polite">
      <div className="flex items-center justify-between rounded-control border border-line bg-surface-raised px-3 py-1 shadow-popover">
        <span className="font-sans text-caption font-medium uppercase tracking-wide text-ink-muted">
          {displayed.length} Active Notice{displayed.length !== 1 ? 's' : ''}
        </span>
        {displayed.length > 1 && <Button variant="ghost" size="sm" onClick={dismissAll}>Dismiss all</Button>}
      </div>
      <AnimatePresence>
        {displayed.map((notice, i) => {
          const p = PRIORITY[notice.priority];
          return (
            <motion.div
              key={notice.id}
              layout
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320, delay: i * 0.08 }}
              className={`relative cursor-pointer overflow-hidden rounded-card border border-l-4 border-line bg-surface-raised shadow-popover ${p?.accent ?? 'border-l-line-strong'}`}
              onClick={openNotice}
            >
              <div className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {notice.is_pinned && <Icon name="pinned" size="sm" className="shrink-0 text-warning" />}
                    <p className="truncate font-sans text-body font-semibold text-ink">{notice.title}</p>
                  </div>
                  <IconButton icon="close" size="sm" label={`Dismiss ${notice.title}`} onClick={e => { e.stopPropagation(); dismiss(notice.id); }} />
                </div>
                <p className="mt-1 font-sans text-body-sm text-ink-muted">{truncate(notice.content)}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone="neutral">{notice.category}</StatusBadge>
                    <StatusBadge tone={p?.tone ?? 'neutral'}>{notice.priority}</StatusBadge>
                  </div>
                  {notice.requires_acknowledgment && <Button variant="primary" size="sm" className="shrink-0" onClick={e => { e.stopPropagation(); dismiss(notice.id); }}>Got it</Button>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
