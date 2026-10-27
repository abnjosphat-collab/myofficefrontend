// app/reliability/useReliabilityData.ts — loads breakdown records and derives every figure from them
// (see deriveReliability.ts). There is no demo/fallback data: a failed load is an error, and no
// records is an honest empty state.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import { getAllPages, unwrapRows } from '@/lib/paged';
import { deriveReliability, type BreakdownRecord } from '@/lib/reliability';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

export function useReliabilityData() {
  const [records, setRecords] = useState<BreakdownRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  /** True while a read is unsettled; ticks skip while it holds. */
  const busyRef = useRef(false);
  /** Consecutive quiet failures; the error surfaces from the second one. */
  const quietFails = useRef(0);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) { quietFails.current = 0; setLoading(true); }
    busyRef.current = true;
    try {
      // The list route is /get-breakdowns and wraps its rows; /api/breakdowns itself returns an info object.
      setRecords(await getAllPages<BreakdownRecord>('/api/breakdowns/get-breakdowns', { pick: unwrapRows, label: 'Breakdowns' }));
      setLoaded(true); setError(null); setErrorStatus(null);
      quietFails.current = 0;
    } catch (e) {
      // A failed background refresh keeps the figures and stays silent the
      // first time; from the second failure in a row the error shows.
      if (!quiet || ++quietFails.current >= 2) {
        setError(e instanceof Error ? e.message : 'Breakdown records could not be loaded.');
        setErrorStatus(e instanceof ApiError ? e.status : null);
      }
    } finally { busyRef.current = false; if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const quietRefresh = useCallback(() => { void refresh(true); }, [refresh]);
  useAutoRefresh(quietRefresh, { isLoading: () => busyRef.current });

  const derived = useMemo(() => deriveReliability(records), [records]);
  return { ...derived, recordCount: records.length, loading, loaded, error, errorStatus, refresh };
}
