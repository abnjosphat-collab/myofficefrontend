// app/engineering_report/useEngineeringReportData.ts — the engineering monthly
// report's data-fetching layer: a 5-resource (breakdowns/job-cards/production/
// compliance/lubrication) Promise.allSettled load behind one loading flag —
// ppe/sheq-shaped unified cycle. Split out of page.tsx as part of the standing
// "decompose on touch" convention. No types.ts: every source is loosely typed
// `any[]` in the original (a cross-module read-only aggregate, not this page's
// own data model) — inventing interfaces for data this page doesn't own would be
// scope creep beyond a structural extraction.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

export function useEngineeringReportData() {
  const [loading, setLoading] = useState(true);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [lube, setLube] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bdR, jcR, prR, coR, luR] = await Promise.allSettled([
        api.get<any[]>('/api/breakdowns'),
        api.get<any[]>('/api/job-cards'),
        api.get<any[]>('/api/production'),
        api.get<any[]>('/api/compliance'),
        api.get<any[]>('/api/lubrication'),
      ]);
      if (bdR.status === 'fulfilled') setBreakdowns(bdR.value);
      if (jcR.status === 'fulfilled') setJobCards(jcR.value);
      if (prR.status === 'fulfilled') setProduction(prR.value);
      if (coR.status === 'fulfilled') setCompliance(coR.value);
      if (luR.status === 'fulfilled') setLube(luR.value);
    } catch { /* silently use empty fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { breakdowns, jobCards, production, compliance, lube, loading, load };
}
