// lib/useApiList.ts — load a list endpoint with honest state. Unlike the hooks it replaces, a failed
// request is reported (message + HTTP status) and never becomes an empty list; rows that were already
// loaded stay available through a failed refresh. A failure that waiting can fix (the service waking up, a timeout, no connection) is
// retried with a growing delay while the list keeps loading; any other failure is reported at once. Pair with <DataRegion status={…}> from the UI system.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { getAllPages, type PagedOptions } from '@/lib/paged';
import { isTransientError, retryDelay } from '@/lib/transientRetry';

export interface ApiListState<T> {
  items: T[];
  /** A request is in flight (first load or refresh). */
  loading: boolean;
  /** At least one response has been received. */
  loaded: boolean;
  error: string | null;
  errorStatus: number | null;
  refetch: () => Promise<void>;
  /** Replace the items locally (optimistic edits); the next refetch is authoritative. */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * `paged`: the endpoint caps rows per request (see lib/paged.ts); fetch every page instead of just the first.
 * Use it for any list route that takes `limit`/`offset`, otherwise a long register is silently cut off.
 * `fetcher` replaces the request (for example to add a timeout and one retry); pass a stable reference.
 * `pick` unwraps a response such as `{ data: [...] }` (pass a stable reference, e.g. `unwrapRows`).
 */
export function useApiList<Raw = unknown, T = Raw>(path: string, map?: (raw: Raw) => T, options: { paged?: boolean; pick?: PagedOptions<Raw>['pick']; enabled?: boolean; fetcher?: (path: string) => Promise<Raw[]> } = {}): ApiListState<T> {
  const paged = options.paged ?? false;
  const enabled = options.enabled ?? true;
  const pick = options.pick;
  const fetcher = options.fetcher;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const mapRef = useRef(map);
  const latest = useRef(0);
  useEffect(() => { mapRef.current = map; });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  useEffect(() => { loadedRef.current = loaded; });

  const refetch = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const request = ++latest.current;
    if (!enabled) { setLoading(false); return; } // nothing is requested until the caller says so (for example, a folder is open)
    const attempt = async (n: number): Promise<void> => {
      setLoading(true);
      try {
        const data = fetcher ? await fetcher(path) : paged ? await getAllPages<Raw>(path, { pick }) : await api.get<Raw[]>(path);
        if (request !== latest.current) return; // a newer request superseded this one
        if (!Array.isArray(data)) throw new Error('The server returned an unexpected response.');
        setItems(mapRef.current ? data.map(mapRef.current) : (data as unknown as T[]));
        setLoaded(true); setError(null); setErrorStatus(null);
      } catch (e) {
        if (request !== latest.current) return;
        const message = e instanceof Error ? e.message : 'The data could not be loaded.';
        const status = e instanceof ApiError ? e.status : null;
        if (isTransientError(e)) {
          // The service is slow, waking up or unreachable: keep loading and try again. Rows already on screen stay quiet; a first load
          // records what the service last said so the page can show it under "still loading".
          if (!loadedRef.current) { setError(message); setErrorStatus(status); }
          timer.current = setTimeout(() => { void attempt(n + 1); }, retryDelay(n));
          return;
        }
        setError(message); setErrorStatus(status);
      }
      if (request === latest.current) setLoading(false);
    };
    await attempt(0);
  }, [path, paged, pick, enabled, fetcher]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // A new path (another folder, another query) starts from nothing, so rows of the previous one are never shown under the new one.
  const scope = `${path}|${enabled}`;
  const [seen, setSeen] = useState(scope);
  if (seen !== scope) { setSeen(scope); setItems([]); setLoaded(false); setError(null); setErrorStatus(null); setLoading(enabled); }
  useEffect(() => { refetch(); }, [refetch]);

  return { items, loading, loaded, error, errorStatus, refetch, setItems };
}
