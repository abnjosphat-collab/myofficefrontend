// app/reliability/useReliabilityData.ts — loads breakdown records and derives every figure from them
// (see deriveReliability.ts). There is no demo/fallback data: a failed load is an error, and no
// records is an honest empty state.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import { getAllPages, unwrapRows } from '@/lib/paged';
import { deriveReliability, type BreakdownRecord } from '@/lib/reliability';

export function useReliabilityData() {
  const [records, setRecords] = useState<BreakdownRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // The list route is /get-breakdowns and wraps its rows; /api/breakdowns itself returns an info object.
      setRecords(await getAllPages<BreakdownRecord>('/api/breakdowns/get-breakdowns', { pick: unwrapRows, label: 'Breakdowns' }));
      setLoaded(true); setError(null); setErrorStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Breakdown records could not be loaded.');
      setErrorStatus(e instanceof ApiError ? e.status : null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const derived = useMemo(() => deriveReliability(records), [records]);
  return { ...derived, recordCount: records.length, loading, loaded, error, errorStatus, refresh };
}
