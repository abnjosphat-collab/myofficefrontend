// app/engineering-dashboard/useEngineeringDashboardData.ts — the dashboard's two real data sources:
// open job cards and breakdown records. There is no demo or fallback data, and each source reports its
// own loading / error state so one failing service never reads as "nothing to show".
'use client';

import { useMemo } from 'react';
import { unwrapRows } from '@/lib/paged';
import { useApiList } from '@/lib/useApiList';
import { deriveReliability, monthSummary, type BreakdownRecord } from '@/lib/reliability';
import { daysUntil } from '@/lib/dates';

export interface OpenJobCard { id: string; title: string; priority: string; assigned: string; scheduled: string | null; daysSinceScheduled: number | null; overdue: boolean }

type JobCardApi = { id: number | string; job_no?: string; title?: string; priority?: string; assigned_to?: string; scheduled_date?: string };

const toOpenJobCard = (j: JobCardApi): OpenJobCard => {
  const scheduled = j.scheduled_date && /^\d{4}-\d{2}-\d{2}/.test(j.scheduled_date) ? j.scheduled_date.slice(0, 10) : null;
  // Calendar days, not elapsed hours: daysUntil compares local midnights, so the answer does not change with the time of day.
  const days = scheduled ? -daysUntil(scheduled) : null;
  return { id: j.job_no || `JC-${j.id}`, title: j.title || 'Untitled job card', priority: j.priority || 'medium', assigned: j.assigned_to || 'Unassigned', scheduled, daysSinceScheduled: days, overdue: days !== null && days > 0 };
};

export function useEngineeringDashboardData() {
  const jobCards = useApiList<JobCardApi, OpenJobCard>('/api/job-cards?status=open', toOpenJobCard);
  // The list route is /get-breakdowns (it wraps its rows and caps each request); /api/breakdowns returns an info object.
  const breakdowns = useApiList<BreakdownRecord>('/api/breakdowns/get-breakdowns', undefined, { paged: true, pick: unwrapRows });
  const reliability = useMemo(() => deriveReliability(breakdowns.items), [breakdowns.items]);
  const month = useMemo(() => monthSummary(breakdowns.items), [breakdowns.items]);
  // Repeat failures over the six months shown in the trend chart, most failures first.
  const topFailures = useMemo(() => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 5, 1); cutoff.setHours(0, 0, 0, 0);
    const recent = breakdowns.items.filter(bd => new Date(bd.breakdown_date || bd.date || bd.created_at || 0) >= cutoff);
    return deriveReliability(recent).table.sort((a, b) => b.failures - a.failures || b.downtimeHours - a.downtimeHours).slice(0, 5);
  }, [breakdowns.items]);
  return { jobCards, breakdowns, monthly: reliability.monthly, month, topFailures };
}
