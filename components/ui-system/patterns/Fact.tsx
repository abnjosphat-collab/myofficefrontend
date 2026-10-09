import type { ReactNode } from 'react';
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

/** One label and its value. An empty value reads "Not recorded" rather than leaving a gap. */
export function Fact({ label, children, wide = false, className }: { label: ReactNode; children?: ReactNode; wide?: boolean; className?: string }) {
  const empty = children === null || children === undefined || children === '' || children === false;
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-full', className)}>
      <dt className={type.caption}>{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">
        {empty ? <span className="text-ink-muted">Not recorded</span> : children}
      </dd>
    </div>
  );
}
