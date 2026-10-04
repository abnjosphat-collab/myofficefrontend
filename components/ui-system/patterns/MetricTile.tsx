'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Skeleton } from '../primitives/Skeleton';

export interface MetricTileProps {
  label: string;
  /** The number or short value. `undefined` while loading; use `unavailable` when the source failed. */
  value?: ReactNode;
  icon?: IconMeaning;
  /** Context line: unit, period, comparison. */
  detail?: ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  loading?: boolean;
  /** The source could not be read. Shows an explicit "Unavailable" instead of a misleading zero. */
  unavailable?: boolean;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const toneIcon = {
  default: 'bg-surface-muted text-ink-muted',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
} as const;

/**
 * Metric / navigation tile — one anatomy for homepage launchers, dashboard KPIs and
 * filter shortcuts: icon well, label, value, optional detail, optional chevron.
 * Interactive tiles are real links/buttons with the shared focus ring and stay still.
 */
export function MetricTile({ label, value, icon, detail, tone = 'default', loading, unavailable, href, onClick, selected, className }: MetricTileProps) {
  const body = (
    <>
      {icon && <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-control sm:size-10', toneIcon[tone])}><Icon name={icon} size="lg" weight="navigation" /></span>}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block font-sans text-caption text-ink-muted [overflow-wrap:anywhere]">{label}</span>
        <span className="block font-display text-metric font-semibold text-ink tabular">
          {loading ? <Skeleton className="mt-1 h-7 w-14" /> : unavailable ? <span className="text-body font-medium text-warning">Unavailable</span> : value}
        </span>
        {detail && !loading && <span className="line-clamp-2 block font-sans text-caption text-ink-muted [overflow-wrap:anywhere]">{detail}</span>}
      </span>
      {(href || onClick) && <Icon name="chevron-right" size="md" className="shrink-0 text-ink-subtle" />}
    </>
  );
  const classes = cn(
    'flex w-full items-center gap-2.5 rounded-card border bg-surface p-3 shadow-card sm:gap-3 sm:p-3.5',
    selected ? 'border-action bg-action-soft/60' : 'border-line',
    (href || onClick) && 'focus-ring text-left transition-[border-color,box-shadow] duration-[var(--mo-duration-base)] hover:border-line-strong hover:shadow-card-hover',
    className,
  );
  if (href) return <Link href={href} className={classes}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>{body}</button>;
  return <div className={classes}>{body}</div>;
}

/**
 * Responsive row of tiles: one swipeable row on phones (so a register's records start on the first screen instead of
 * below three rows of tiles), a wrapping grid from `sm` up to `columns` on desktop.
 */
export function MetricGrid({ children, columns = 4, className }: { children: ReactNode; columns?: 2 | 3 | 4 | 5; className?: string }) {
  // Tablet width (768 and up) already gets its columns, so five tiles are not stacked in three rows at 820 px.
  const cols = { 2: 'lg:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 lg:grid-cols-5' } as const;
  return <div className={cn('gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3', 'max-sm:flex max-sm:snap-x max-sm:overflow-x-auto max-sm:pb-1 max-sm:[&>*]:w-[9.5rem] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start', cols[columns], className)}>{children}</div>;
}
