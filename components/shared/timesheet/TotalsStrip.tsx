// components/shared/timesheet/TotalsStrip.tsx — the period at a glance, shared by the artisan and NEC
// timesheets: an optional heading, one figure per bucket (one can stand out as the hero, zeroes can dim),
// an optional foot (a payable total, a progress bar), and an optional warning footnote. Read-only; every
// figure is computed by the caller.
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/components/ui-system';

export interface TotalsFigure {
  value: string;
  label: string;
  note?: string;
  /** The headline figure: larger metric type. */
  hero?: boolean;
  /** Dim the value (a zero bucket the reader can skip). */
  dim?: boolean;
}

export function TotalsStrip({ label, title, figures, foot, footnote }: {
  label: string;
  /** A visible heading above the figures (the artisan strip has none). */
  title?: string;
  figures: TotalsFigure[];
  foot?: ReactNode;
  footnote?: string;
}) {
  return (
    <section aria-label={label} className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      {title && <h2 className="mb-3 font-display text-title font-semibold text-ink">{title}</h2>}
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
    </section>
  );
}
