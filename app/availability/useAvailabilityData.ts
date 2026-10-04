// app/availability/useAvailabilityData.ts — equipment availability: the equipment list and the summary stats, each
// loaded on its own. A failed load is reported as a failure; it is never replaced by demo equipment or default figures.
'use client';

import { useApiList } from '@/lib/useApiList';
import { useApiResource } from '@/lib/useApiResource';
import type { AvailabilityStats, Equipment } from './types';

export function useAvailabilityData() {
  const equipment = useApiList<Equipment>('/api/availabilities');
  const stats = useApiResource<AvailabilityStats>('/api/availabilities/stats');
  const refetch = async () => { await Promise.all([equipment.refetch(), stats.refetch()]); };
  return { equipment, stats, refetch };
}
