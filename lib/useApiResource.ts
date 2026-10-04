// lib/useApiResource.ts — load one object endpoint (a summary, a stats block) with honest state, the single-record
// counterpart of useApiList: a failed request is reported with its message and status and never becomes a default
// value, and the data already loaded stays available through a failed refresh.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { isTransientError, retryDelay } from '@/lib/transientRetry';

export interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  errorStatus: number | null;
  refetch: () => Promise<void>;
}

export function useApiResource<T>(path: string): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const latest = useRef(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  useEffect(() => { loadedRef.current = loaded; });

  const refetch = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const request = ++latest.current;
    const attempt = async (n: number): Promise<void> => {
      setLoading(true);
      try {
        const result = await api.get<T>(path);
        if (request !== latest.current) return;
        if (result === null || typeof result !== 'object' || Array.isArray(result)) throw new Error('The server returned an unexpected response.');
        setData(result); setLoaded(true); setError(null); setErrorStatus(null);
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
        setError(message); setErrorStatus(status);
      }
      if (request === latest.current) setLoading(false);
    };
    await attempt(0);
  }, [path]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, loaded, error, errorStatus, refetch };
}
