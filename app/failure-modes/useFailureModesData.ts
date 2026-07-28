// app/failure-modes/useFailureModesData.ts — the FMEA register's data-fetching
// layer: the snake_case->camelCase converter (which also derives the RPN score)
// plus a hook owning the failure-mode list and its load cycle. Split out of
// page.tsx as part of the standing "decompose on touch" convention
// (contractors.tsx-shaped).
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { FailureMode, FailureModeAPI } from './types';

export const fromFMAPI = (d: FailureModeAPI): FailureMode => ({
  id: d.id, equipType: d.equipment_type || '', component: d.component || '',
  failureMode: d.failure_mode || '', failureCause: d.failure_cause || '',
  severity: d.severity || 1, probability: d.probability || 1, detectability: d.detectability || 1,
  rpn: (d.severity || 1) * (d.probability || 1) * (d.detectability || 1),
  occurrences: d.occurrence_count || 0, lastOccurred: d.last_occurred || '—',
  corrective: d.corrective_action || '', preventive: d.preventive_action || '',
});

export function useFailureModesData() {
  const [modes, setModes] = useState<FailureMode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModes = useCallback(async () => {
    setLoading(true);
    try { setModes((await api.get<FailureModeAPI[]>('/api/failure-modes')).map(fromFMAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchModes(); }, [fetchModes]);

  return { modes, loading, fetchModes };
}
