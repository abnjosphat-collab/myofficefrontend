import { useId, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';

const COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' } as const;

/**
 * The facts of one record in a detail view: label over value, in one to three columns. Every detail
 * dialog uses it, so a record reads the same way in every module. No boxes around each fact: the
 * spacing groups them.
 */
export function FactList({ columns = 2, children, className, 'aria-label': ariaLabel }: {
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  return <dl aria-label={ariaLabel} className={cn('grid gap-x-6 gap-y-4', COLUMNS[columns], className)}>{children}</dl>;
}

/**
 * One label and its value. An empty value reads "Not recorded" in quiet italic, so it cannot be
 * mistaken for real data. Keep values to a few words so every row stays one line; pass `wide` for
 * sentences, which then span the full row instead of stretching their neighbours. The one deliberate
 * exception to plain values is `emphasis="headline"`, for the single value a record is about.
 */
export function Fact({ label, emphasis, children, wide = false, className }: {
  label: ReactNode;
  /** The record's headline value (a leave duration, an amount): semibold, never larger. */
  emphasis?: 'headline';
  children?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const empty = children === null || children === undefined || children === '' || children === false;
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-full', className)}>
      <dt className={type.caption}>{label}</dt>
      <dd className={cn('mt-0.5 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]', emphasis === 'headline' && 'font-semibold')}>
        {empty ? <span className="italic text-ink-muted">Not recorded</span> : children}
      </dd>
    </div>
  );
}

/**
 * One headed group inside a detail view: Employee, Leave, Reason. Renders <section aria-labelledby>
 * with an h3 (h2 on a full page via `level`), an optional aside on the heading row, and a hairline
 * rule above every section but the first, so a long record scans without shouting. Headings stay
 * normal-case semibold labels; the rule and the spacing do the separating.
 */
export function FactSection({ title, aside, level = 3, card = false, children, className }: {
  title: ReactNode;
  /** A small note on the heading row, for example "Edit in roster" or a count. */
  aside?: ReactNode;
  /** Heading level: h3 inside dialogs, h2 for a section on a full page. */
  level?: 2 | 3;
  /** Draw the section as a bordered card instead of a ruled group (procedural sub-records). */
  card?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={id}
      className={cn(
        card
          ? 'flex flex-col gap-2 rounded-card border border-line p-3'
          : 'flex flex-col gap-2 border-t border-line-subtle pt-3 first:border-t-0 first:pt-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Heading id={id} className="font-sans text-label font-semibold text-ink">{title}</Heading>
        {aside && <div className="font-sans text-caption text-ink-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
