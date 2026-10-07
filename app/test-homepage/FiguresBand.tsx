// app/test-homepage/FiguresBand.tsx — the four live figures, evolved from the home
// Snapshot: same hairline-divided strip, each figure now carrying a context
// caption so the number means something. Same honesty contract: loading shows a
// placeholder, an unanswered figure shows "No data" — never zero.
'use client';

import Link from 'next/link';
import { Icon, Skeleton, cn, type IconMeaning } from '@/components/ui-system';
import { trackModuleUsage, type DashboardStats } from '@/components/app-shell';

interface Figure {
  label: string;
  icon: IconMeaning;
  href: string;
  value: string | null;
  caption: string;
  attention?: boolean;
}

export function FiguresBand({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  const figures: Figure[] = [
    { label: 'Team members', icon: 'employees', href: '/employees', value: stats.employeeCount === null ? null : String(stats.employeeCount), caption: 'on the register' },
    { label: 'Active work orders', icon: 'task', href: '/maintenance', value: stats.activeWorkOrders === null ? null : String(stats.activeWorkOrders), caption: 'pending and in progress' },
    { label: 'Equipment available', icon: 'equipment', href: '/equipment', value: stats.equipmentAvailablePct === null ? null : `${stats.equipmentAvailablePct}%`, caption: 'of the registered fleet' },
    {
      label: 'Open breakdowns', icon: 'breakdown', href: '/breakdowns',
      value: stats.openBreakdowns === null ? null : String(stats.openBreakdowns),
      caption: stats.openBreakdowns === 0 ? 'none open' : 'open right now',
      attention: (stats.openBreakdowns ?? 0) > 0,
    },
  ];
  return (
    <section aria-label="Key figures">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card lg:grid-cols-4">
        {figures.map(f => (
          <li key={f.label} className="bg-surface">
            <Link
              href={f.href}
              onClick={() => trackModuleUsage(f.href)}
              className="focus-ring group/fig flex h-full flex-col gap-2 p-4 transition-colors duration-[var(--mo-duration-base)] hover:bg-surface-subtle sm:p-5"
            >
              <span className="flex items-center gap-2 font-sans text-label font-medium text-ink-muted">
                <Icon name={f.icon} size="sm" className="text-action" />{f.label}
              </span>
              {loading ? (
                <Skeleton className="h-9 w-16" aria-label={`Loading ${f.label}`} />
              ) : f.value === null ? (
                <span className="font-sans text-body font-medium text-warning">No data</span>
              ) : (
                <span className={cn('font-display text-metric tabular', f.attention ? 'text-warning' : 'text-ink')}>{f.value}</span>
              )}
              <span className="flex items-center justify-between gap-2 font-sans text-caption text-ink-muted">
                <span>{f.caption}</span>
                <Icon name="chevron-right" size="xs" className="shrink-0 opacity-0 transition-opacity group-hover/fig:opacity-100 group-focus-visible/fig:opacity-100" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
