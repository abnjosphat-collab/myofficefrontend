'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NumberTransition } from '../motion';
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
    'relative inline-flex items-baseline gap-2 rounded-control border px-3 py-1.5 font-sans text-body-sm',
    'transition-colors duration-[var(--mo-duration-base)]',
    selected ? 'border-action bg-action-soft/60' : 'border-line-subtle bg-transparent',
    (href || onClick) && 'focus-ring hover:border-action/35',
    className,
  );
  const line = (
    <>
      <span className="text-ink-muted">{label}</span>
      <span className={cn('font-display font-semibold tabular', toneValue[tone])}>
        {loading ? <Skeleton className="inline-block h-3.5 w-6 align-middle" /> : unavailable ? <span className="font-medium text-warning">Unavailable</span> : typeof value === 'number' ? <><span className="sr-only">{value}</span><span aria-hidden="true"><NumberTransition value={value} /></span></> : value}
      </span>
      {detail && !loading && <span className="text-caption text-ink-subtle">{detail}</span>}
    </>
  );
  if (href) return <Link href={href} className={quiet}>{line}</Link>;
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={selected} className={quiet}>{line}</button>;
  return <div className={quiet}>{line}</div>;
}

/** The row of quick-stat tiles: one wrapping strip on wide screens; on phones one snapping row (CSS scroll-snap, no transforms). `columns` and `compact` are accepted for older call sites. */
export function MetricGrid({ children, className, label = 'Summary metrics' }: { children: ReactNode; columns?: 2 | 3 | 4 | 5; compact?: boolean; className?: string; /** Accessible name of the strip when it scrolls. */ label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    let current = true;
    const measure = () => { if (current) setOverflowing(strip.scrollWidth > strip.clientWidth + 1); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(strip);
    // Children can grow while the container stays fixed (text scale, font load,
    // new figures). Observing only the container misses those changes.
    for (const child of strip.children) observer?.observe(child);
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    measure();
    return () => { current = false; observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [children]);
  return <div ref={ref} role={overflowing ? 'region' : undefined} aria-label={overflowing ? label : undefined} tabIndex={overflowing ? 0 : undefined} className={cn('focus-ring flex flex-wrap items-center gap-2 max-sm:min-w-0 max-sm:max-w-full max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-proximity [scrollbar-width:none] [&>*]:max-sm:shrink-0 [&>*]:max-sm:snap-start', className)}>{children}</div>;
}
