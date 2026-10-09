'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Skeleton } from '../primitives/Skeleton';

export interface MetricTileProps {
  label: string;
  /** The number or short value. `undefined` while loading; use `unavailable` when the source failed. */
  value?: ReactNode;
  /** No longer shown: the label says what the number is. */
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
  /** No longer changes anything: every tile is the one quiet design. */
  compact?: boolean;
  className?: string;
}

// The number carries the meaning; colour follows lib/status.ts (amber waiting, red needs action, green done).
const toneValue = {
  default: 'text-ink',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
} as const;

/**
 * The quick-stat tile: label, number, optional note, in one quiet line. It is the only design, so every summary
 * row in the app (page headers, analytics, weekly totals) reads the same way; `compact` and `icon` are accepted
 * for older call sites and no longer change anything. A clickable tile is a real button or link and shows
 * whether it is the active filter.
 */
export function MetricTile({ label, value, detail, tone = 'default', loading, unavailable, href, onClick, selected, className }: MetricTileProps) {
  const quiet = cn(
    'inline-flex items-baseline gap-2 rounded-control border px-3 py-1.5 font-sans text-body-sm',
    selected ? 'border-action bg-action-soft/60' : 'border-line-subtle bg-transparent',
    (href || onClick) && 'focus-ring transition-colors duration-[var(--mo-duration-base)] hover:border-action/35',
    className,
  );
  const line = (
    <>
      <span className="text-ink-muted">{label}</span>
      <span className={cn('font-display font-semibold tabular', toneValue[tone])}>
        {loading ? <Skeleton className="inline-block h-3.5 w-6 align-middle" /> : unavailable ? <span className="font-medium text-warning">Unavailable</span> : value}
      </span>
      {detail && !loading && <span className="text-caption text-ink-subtle">{detail}</span>}
    </>
  );
  if (href) return <Link href={href} className={quiet}>{line}</Link>;
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={selected} className={quiet}>{line}</button>;
  return <div className={quiet}>{line}</div>;
}

/** The row of quick-stat tiles: one wrapping strip everywhere. `columns` and `compact` are accepted for older call sites. */
export function MetricGrid({ children, className }: { children: ReactNode; columns?: 2 | 3 | 4 | 5; compact?: boolean; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
