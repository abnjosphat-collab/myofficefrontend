// components/home/Snapshot.tsx — "Operations today": the four live figures that matter on arrival, in one panel rather than four cards.
// Each is a link into the module it comes from. A figure the service did not answer shows "No data" (never zero), and a figure still
// loading shows a placeholder. Nothing here is invented.
'use client';

import Link from 'next/link';
import { Icon, Skeleton, cn, type IconMeaning } from '@/components/ui-system';
import type { DashboardStats } from '@/components/app-shell';

interface Item { label: string; icon: IconMeaning; href: string; value: string | null; hint?: string; attention?: boolean }

export function Snapshot({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  const items: Item[] = [
    { label: 'Team members', icon: 'employees', href: '/employees', value: stats.employeeCount === null ? null : String(stats.employeeCount) },
    { label: 'Active work orders', icon: 'task', href: '/maintenance/work-orders', value: stats.activeWorkOrders === null ? null : String(stats.activeWorkOrders), hint: 'Pending and in progress' },
    { label: 'Equipment available', icon: 'equipment', href: '/equipment', value: stats.equipmentAvailablePct === null ? null : `${stats.equipmentAvailablePct}%` },
    { label: 'Open breakdowns', icon: 'breakdown', href: '/breakdowns', value: stats.openBreakdowns === null ? null : String(stats.openBreakdowns), attention: (stats.openBreakdowns ?? 0) > 0 },
  ];
  return (
    <section aria-labelledby="snapshot-heading" className="flex flex-col gap-3">
      <div><h2 id="snapshot-heading" className="font-display text-section font-semibold text-ink">Operations today</h2><p className="font-sans text-body-sm text-ink-muted">Live from the records. Choose a figure to open it.</p></div>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card lg:grid-cols-4">
        {items.map(i => (
          <li key={i.label} className="bg-surface">
            <Link href={i.href} className="focus-ring group/stat flex h-full flex-col gap-2 p-4 transition-colors duration-[var(--mo-duration-base)] hover:bg-surface-subtle sm:p-5">
              <span className="flex items-center gap-2 font-sans text-label font-medium text-ink-muted"><Icon name={i.icon} size="sm" className="text-action" />{i.label}</span>
              {loading ? <Skeleton className="h-9 w-16" /> : i.value === null
                ? <span className="font-sans text-body font-medium text-warning">No data</span>
                : <span className={cn('font-display text-metric tabular', i.attention ? 'text-warning' : 'text-ink')}>{i.value}</span>}
              <span className="flex items-center justify-between gap-2 font-sans text-caption text-ink-muted"><span>{i.hint ?? ' '}</span><Icon name="chevron-right" size="xs" className="shrink-0 opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
