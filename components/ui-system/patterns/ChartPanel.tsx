import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';
import { Card } from '../primitives/Card';

/**
 * A titled panel for one chart. `summary` is the text alternative (required): state what the chart
 * shows and its key values so the information is available without sight or a pointer.
 *
 * The chart itself is hidden from assistive technology (the summary replaces it), so a chart placed here must not
 * be focusable either: give Recharts charts `accessibilityLayer={false}`. A hidden element that takes keyboard focus
 * is a WCAG failure (axe `aria-hidden-focus`); `inert` would also remove the mouse tooltips, so it is not used.
 */
export function ChartPanel({ title, description, summary, controls, children, className }: {
  title: string;
  description?: string;
  summary: string;
  /** Controls that change the chart (grouping, range). They sit outside the hidden chart so everyone can reach them. */
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card padding="lg" className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className={type.sectionTitle}>{title}</h2>
          {description && <p className="mt-0.5 font-sans text-body-sm text-ink-muted">{description}</p>}
        </div>
        {controls && <div className="shrink-0">{controls}</div>}
      </div>
      <figure className="m-0" aria-label={title}>
        <div aria-hidden="true">{children}</div>
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
    </Card>
  );
}
