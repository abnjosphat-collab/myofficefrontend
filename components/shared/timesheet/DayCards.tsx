// components/shared/timesheet/DayCards.tsx — one person's days as cards, shared by the artisan and NEC
// timesheets: a totals strip leads, then one card per day (1/2/3 columns at every width, so there is no
// separate desktop grid to drift). The shell owns the card frame; the caller owns what a day shows and edits.
'use client';

import type { ReactNode } from 'react';

/** The shell around one day: title, an optional system-filled dot and OT headline, badges, then the day's body. */
export function DayCard({ titleId, title, auto, headline, badges, children }: {
  titleId: string;
  title: string;
  /** The blue dot: the system filled this day. */
  auto?: { title: string; srLabel: string };
  /** The day's headline figure (overtime), top right. */
  headline?: string;
  badges?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={titleId} className="font-display text-title font-semibold text-ink">
          {title}
          {auto && (
            <span className="ml-2 inline-block size-1.5 rounded-full bg-action align-middle" title={auto.title}>
              <span className="sr-only">{auto.srLabel}</span>
            </span>
          )}
        </h3>
        {headline && <span className="shrink-0 font-display text-title font-semibold tabular text-action">{headline}</span>}
      </div>

      {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}

      {children}
    </article>
  );
}

/** A day's hour lines (label/value), or the empty line when the day holds no hours. */
export function DayHoursList({ lines, emptyText }: { lines: { label: string; value: string }[]; emptyText: string }) {
  if (lines.length === 0) return <p className="font-sans text-body-sm text-ink-muted">{emptyText}</p>;
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
      {lines.map(l => (
        <div key={l.label} className="contents">
          <dt className="font-sans text-body-sm text-ink-muted">{l.label}</dt>
          <dd className="font-sans text-body-sm font-semibold tabular text-ink">{l.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Totals on top, the cards below in a responsive grid. */
export function DayCardsShell({ totals, children }: { totals: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      {totals}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </div>
  );
}
