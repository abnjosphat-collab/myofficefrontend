// lib/useRecordDeepLink.ts — one shared receiver for `?open=<id>` record links
// (bell notifications land here). Finds the id in the page's loaded list, else
// fetches just that record; opens the page's existing detail, or reports the
// miss. Consumes the params either way so refresh never reopens or re-notices.
// Callers must render under <Suspense> (Next requires it for useSearchParams).
'use client';

import { useEffect, useRef } from 'react';
import { useDeepLink } from './useDeepLink';

export type DeepLinkMiss = 'gone' | 'error';

export function useRecordDeepLink<T>(opts: {
  records: T[];
  /** The list finished trying (loaded, or failed and showing its own error). */
  ready: boolean;
  /** The list failed, so a record missing from it proves nothing. */
  listFailed?: boolean;
  getId: (r: T) => string | number;
  /** One-record fetch; null = the server has no such record (404). */
  fetchById?: (id: string) => Promise<T | null>;
  /** Fold a fetched record into the list (pages whose detail looks it up by id). */
  merge?: (row: T) => void;
  onOpen: (record: T, flags: Record<string, string | null>) => void;
  onMissing?: (id: string, reason: DeepLinkMiss) => void;
  flags?: string[];
}) {
  const { records, ready, flags = [] } = opts;
  const link = useDeepLink({ flags });
  // Page callbacks and getId are inline arrows with fresh identities each
  // render; the resolver below must not refire for those. They ride a ref
  // synced in an effect (declared first, so it runs first each commit) —
  // never read or written during render (react-hooks/refs).
  const live = useRef({ opts, flags: link.flags, consume: link.consume });
  useEffect(() => {
    live.current = { opts, flags: link.flags, consume: link.consume };
  });

  const { value } = link;
  useEffect(() => {
    if (!value || !ready) return;
    const id = value;
    const { opts: o, flags: f, consume } = live.current;
    const found = records.find(r => String(o.getId(r)) === id) ?? null;
    if (found) {
      o.onOpen(found, f);
      consume();
      return;
    }
    if (!o.fetchById) {
      o.onMissing?.(id, o.listFailed ? 'error' : 'gone');
      consume();
      return;
    }
    let cancelled = false;
    const fetchById = o.fetchById;
    (async () => {
      try {
        const row = await fetchById(id);
        if (cancelled) return;
        if (row) {
          o.merge?.(row);
          o.onOpen(row, f);
        } else {
          o.onMissing?.(id, 'gone');
        }
      } catch {
        if (!cancelled) o.onMissing?.(id, 'error');
      } finally {
        if (!cancelled) consume();
      }
    })();
    return () => { cancelled = true; };
  }, [value, ready, records]);
}
