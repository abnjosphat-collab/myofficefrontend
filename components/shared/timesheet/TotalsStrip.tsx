// components/shared/timesheet/TotalsStrip.tsx — the period at a glance, shared by the artisan and NEC
// timesheets: an optional heading, one figure per bucket (one can stand out as the hero, zeroes can dim),
// an optional foot (a payable total, a progress bar), and an optional warning footnote. Read-only; every
// figure is computed by the caller. With `collapsible` the strip folds to one bar — the title plus a caller
// headline (the payable total) — and the buckets open on demand.
'use client';

import { useId, type ReactNode } from 'react';
import { Icon, cn } from '@/components/ui-system';

export interface TotalsFigure {
  value: string;
  label: string;
  note?: string;
  /** The headline figure: larger metric type. */
  hero?: boolean;
  /** Dim the value (a zero bucket the reader can skip). */
  dim?: boolean;
}

export function TotalsStrip({ label, title, figures, foot, footnote, collapsible }: {
  label: string;
  /** A visible heading above the figures (the artisan strip has none). */
  title?: string;
  figures: TotalsFigure[];
  foot?: ReactNode;
  footnote?: string;
  /** Fold the buckets behind a bar; the headline (payable total) stays visible. */
  collapsible?: { expanded: boolean; onToggle: () => void; headline: ReactNode };
}) {
  const panelId = useId();
  const body = (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {figures.map(f => (
          <div key={f.label}>
            <p className={cn('font-display tabular', f.dim ? 'text-ink-subtle' : 'text-ink', f.hero ? 'text-metric' : 'text-title font-semibold')}>{f.value}</p>
            <p className="mt-0.5 font-sans text-caption text-ink-muted">{f.label}{f.note && <span className="ml-2 text-ink-subtle">{f.note}</span>}</p>
          </div>
        ))}
      </div>
      {foot && <div className="mt-3 border-t border-line-subtle pt-3">{foot}</div>}
      {footnote && <p className="mt-3 font-sans text-body-sm text-warning">{footnote}</p>}
    </>
  );

  if (!collapsible) {
    return (
      <section aria-label={label} className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
        {title && <h2 className="mb-3 font-display text-title font-semibold text-ink">{title}</h2>}
        {body}
      </section>
    );
  }

  const heading = title ?? label;
  return (
    <section aria-label={label} className="rounded-card border border-line bg-surface px-4 py-3 shadow-card sm:px-5">
      <button
        type="button"
        onClick={collapsible.onToggle}
        aria-expanded={collapsible.expanded}
        aria-controls={panelId}
        aria-label={`${collapsible.expanded ? 'Hide' : 'Show'} ${heading}`}
        className="focus-ring flex w-full items-center justify-between gap-3 rounded-control text-left"
      >
        <span className="font-display text-title font-semibold text-ink">{heading}</span>
        <span className="flex min-w-0 items-center gap-2">
          {collapsible.headline}
          <Icon name="chevron-down" size="sm" className={cn('shrink-0 text-ink-muted transition-transform duration-[var(--mo-duration-base)]', collapsible.expanded && 'rotate-180')} />
        </span>
      </button>
      {collapsible.expanded && <div id={panelId} className="mt-3">{body}</div>}
    </section>
  );
}
