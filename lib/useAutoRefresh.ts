// lib/useAutoRefresh.ts — one shared background-refresh driver. Every base data
// hook calls it, so lists and dashboards keep themselves fresh and pages need no
// refresh button. It refetches on a 60 s tick while the tab is visible, when the
// tab becomes visible again after 30 s or more away, and when the network comes
// back — never while its own refetch is still pending, while the hook reports a
// request in flight, or while a mutation is pending (the mutation's own refetch
// stays authoritative, so an optimistic change is never undone by a tick).
'use client';

import { useEffect, useRef } from 'react';
import { isMutationInFlight } from '@/lib/api';

export interface AutoRefreshOptions {
  /** False wires nothing (import/preview flows, static registers). Default true. */
  enabled?: boolean;
  /** Tick interval in ms. Default 60_000; the bell passes 15_000. */
  every?: number;
  /** How long the tab must have been hidden before coming back refetches. Default 30_000. */
  visibleAfterMs?: number;
  /** Skip a tick while true — the hook's own request in flight. */
  isLoading?: boolean | (() => boolean);
  /** Skip a tick while true. Defaults to the shared mutation counter. */
  isMutating?: () => boolean;
}

export const AUTO_REFRESH_EVERY_MS = 60_000;
export const AUTO_REFRESH_VISIBLE_AFTER_MS = 30_000;

export function useAutoRefresh(refetch: () => void | Promise<unknown>, options: AutoRefreshOptions = {}): void {
  const enabled = options.enabled ?? true;
  const every = options.every ?? AUTO_REFRESH_EVERY_MS;
  const latest = useRef({ refetch, enabled, visibleAfterMs: options.visibleAfterMs ?? AUTO_REFRESH_VISIBLE_AFTER_MS, isLoading: options.isLoading, isMutating: options.isMutating });
  useEffect(() => {
    latest.current = { refetch, enabled, visibleAfterMs: options.visibleAfterMs ?? AUTO_REFRESH_VISIBLE_AFTER_MS, isLoading: options.isLoading, isMutating: options.isMutating };
  });

  const selfPending = useRef(false);
  const hiddenAt = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return;
    const tryRefresh = () => {
      const o = latest.current;
      if (!o.enabled || selfPending.current) return;
      const loading = typeof o.isLoading === 'function' ? o.isLoading() : o.isLoading;
      if (loading) return;
      if (o.isMutating ? o.isMutating() : isMutationInFlight()) return;
      selfPending.current = true;
      try {
        const r = o.refetch() as Promise<unknown> | void;
        if (r && typeof r.finally === 'function') {
          r.finally(() => { selfPending.current = false; }).catch(() => {});
        } else {
          selfPending.current = false;
        }
      } catch {
        selfPending.current = false;
      }
    };
    const onTick = () => { if (!document.hidden) tryRefresh(); };
    const onVisibility = () => {
      if (document.hidden) { hiddenAt.current = Date.now(); return; }
      if (Date.now() - hiddenAt.current >= latest.current.visibleAfterMs) tryRefresh();
    };
    const onOnline = () => tryRefresh();
    const timer = setInterval(onTick, every);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, every]);
}
