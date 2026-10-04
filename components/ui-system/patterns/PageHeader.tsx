'use client';

import { Children, Fragment, isValidElement, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { Button } from '../primitives/Button';

export type Crumb = { label: string; href?: string };

/**
 * Page title block: breadcrumbs, the single <h1>, an optional description and the
 * page's primary action(s). One primary action per view; secondary actions follow it.
 */
export function PageHeader({ title, description, breadcrumbs, actions, meta, className }: {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Small supporting line: scope, last updated, record count. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-3 border-b border-line pb-5', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 font-sans text-caption text-ink-muted">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <Icon name="chevron-right" size="xs" />}
                {crumb.href && index < breadcrumbs.length - 1
                  ? <Link href={crumb.href} className="focus-ring rounded-xs hover:text-ink">{crumb.label}</Link>
                  : <span aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <h1 className="font-display text-page font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 font-sans text-body text-ink-muted">{description}</p>}
          {meta && <p className="mt-1 font-sans text-caption text-ink-muted">{meta}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Children as a flat list, looking through fragments (a conditional group of filters is still its filters). */
function flatten(nodes: ReactNode): ReactNode[] {
  return Children.toArray(nodes).flatMap(n => (isValidElement<{ children?: ReactNode }>(n) && n.type === Fragment ? flatten(n.props.children) : [n]));
}

/**
 * Toolbar row beneath the header: search and filters on the left, view and bulk actions on the right.
 *
 * On a phone every filter would otherwise take a full row and push the records off the first screen, so below the
 * `sm` breakpoint only the first `inline` children (the search, by convention) stay visible and the rest sit behind
 * a Filters button. Pass `filtered` when any filter is active so the button says so. From `sm` up all children are
 * laid out in one wrapping row exactly as before.
 */
export function Toolbar({ children, trailing, className, inline = 1, filtered = false }: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  /** How many leading children stay visible on a phone. */
  inline?: number;
  /** A filter is currently applied (shows a marker on the phone Filters button). */
  filtered?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const items = flatten(children);
  const visible = items.slice(0, inline);
  const rest = items.slice(inline);
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {visible}
        {rest.length > 0 && (
          <Button className="sm:hidden" icon="filter" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>
            Filters{filtered && <span aria-label="applied" className="ml-0.5 size-1.5 rounded-full bg-action" />}
          </Button>
        )}
        <div id={panelId} className={cn(open ? 'max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:gap-2 max-sm:[&>*]:!w-full' : 'max-sm:hidden', 'sm:contents')}>{rest}</div>
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
