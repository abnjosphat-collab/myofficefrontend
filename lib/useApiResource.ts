// lib/useApiResource.ts — load one object endpoint (a summary, a stats block) with honest state, the single-record
// counterpart of useApiList: a failed request is reported with its message and status and never becomes a default
// value, and the data already loaded stays available through a failed refresh. Like useApiList it also keeps
// itself fresh on a silent background tick (60 s while visible, visible-again after 30 s away, online); see
// lib/useAutoRefresh.ts. A background refresh never flips `loading` and only surfaces an error after two
// failures in a row.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { isTransientError, retryDelay } from '@/lib/transientRetry';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

export interface ApiResourceState<T> {
  data: T | null;
  /** A foreground request is in flight. Background ticks never set this. */
  loading: boolean;
  loaded: boolean;
  error: string | null;
  errorStatus: number | null;
  refetch: () => Promise<void>;
  /** When the data last arrived (foreground or background). Null until the first success. */
  updatedAt: Date | null;
}

export interface ApiResourceOptions {
  /** Background refresh (default: 60 s tick + visible-again + online). `false` wires nothing. */
  refresh?: false | { every?: number };
}

export function useApiResource<T>(path: string, options: ApiResourceOptions = {}): ApiResourceState<T> {
  const refreshOpt = options.refresh;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const latest = useRef(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  useEffect(() => { loadedRef.current = loaded; });
  /** True while any attempt chain (foreground or quiet) is unsettled; ticks skip while it holds. */
  const busyRef = useRef(false);
  /** Consecutive quiet failures; the error surfaces from the second one. */
  const quietFails = useRef(0);

  const doFetch = useCallback(async (quiet: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const request = ++latest.current;
    if (!quiet) quietFails.current = 0;
    busyRef.current = true;
    const attempt = async (n: number): Promise<void> => {
      if (!quiet) setLoading(true);
      try {
        const result = await api.get<T>(path);
        if (request !== latest.current) return;
        if (result === null || typeof result !== 'object' || Array.isArray(result)) throw new Error('The server returned an unexpected response.');
        setData(result); setLoaded(true); setError(null); setErrorStatus(null);
        quietFails.current = 0;
        setUpdatedAt(new Date());
      } catch (e) {
        if (request !== latest.current) return;
        const message = e instanceof Error ? e.message : 'The data could not be loaded.';
        const status = e instanceof ApiError ? e.status : null;
        if (isTransientError(e)) {
          // A slow, waking or unreachable service is waited out: keep loading and try again (see lib/transientRetry.ts).
          if (!loadedRef.current) { setError(message); setErrorStatus(status); }
          timer.current = setTimeout(() => { void attempt(n + 1); }, retryDelay(n));
          return;
        }
        // A failed background refresh keeps the data and stays silent the first
        // time; from the second failure in a row the "may be out of date" line shows.
        if (!quiet || ++quietFails.current >= 2) { setError(message); setErrorStatus(status); }
      }
      if (request === latest.current) { busyRef.current = false; if (!quiet) setLoading(false); }
    };
    await attempt(0);
  }, [path]);

  const refetch = useCallback(() => doFetch(false), [doFetch]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { refetch(); }, [refetch]);

  const quietRefetch = useCallback(() => { void doFetch(true); }, [doFetch]);
  useAutoRefresh(quietRefetch, {
    enabled: refreshOpt !== false,
    every: typeof refreshOpt === 'object' ? refreshOpt.every : undefined,
    isLoading: () => busyRef.current,
  });

  return { data, loading, loaded, error, errorStatus, refetch, updatedAt };
}
