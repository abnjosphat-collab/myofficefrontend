import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Card } from '../primitives/Card';

/**
 * A titled panel for one chart. `summary` is the text alternative (required): state what the chart
 * shows and its key values so the information is available without sight or a pointer.
 */
export function ChartPanel({ title, description, summary, children, className }: {
  title: string;
  description?: string;
  summary: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card padding="lg" className={cn('flex flex-col gap-4', className)}>
      <div>
        <h2 className="font-display text-title font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 font-sans text-body-sm text-ink-muted">{description}</p>}
      </div>
      <figure className="m-0" aria-label={title}>
        <div aria-hidden="true">{children}</div>
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
    </Card>
  );
}
