'use client';

import { Children, Fragment, isValidElement, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { Button } from '../primitives/Button';
import { CountBadge } from '../primitives/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '../overlays/Popover';

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
    <header className={cn('flex flex-col gap-2 pb-1', className)}>
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
 * Toolbar row beneath the header: search and common filters on the left, view and sort on the right, one row.
 *
 * - `children`: the search first, then the commonly used filters (shown inline from `md` up).
 * - `moreFilters`: the rest, behind one "Filters" popover that carries a count badge (`activeCount`). Below `md` the
 *   common filters move into the popover too, so a phone sees search, Filters and the trailing controls only.
 * - `onClear` (with `filtered`): a "Clear filters" link, shown only while a filter is active.
 *
 * Without `moreFilters` it behaves as before: from `sm` up everything sits in one wrapping row, and on a phone only
 * the first `inline` children stay visible with the rest behind a Filters button.
 */
export function Toolbar({ children, trailing, className, inline = 1, filtered = false, moreFilters, activeCount = 0, onClear }: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  /** How many leading children stay visible on a phone. */
  inline?: number;
  /** A filter (or search) is currently applied. */
  filtered?: boolean;
  /** Secondary filters, shown in a popover. */
  moreFilters?: ReactNode;
  /** Number of active filters inside `moreFilters`, shown as a badge on the Filters button. */
  activeCount?: number;
  /** Resets every filter. The "Clear filters" link appears only while `filtered`. */
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const items = flatten(children);
  const visible = items.slice(0, inline);
  const rest = items.slice(inline);
  const clear = filtered && onClear ? <Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button> : null;

  if (moreFilters) {
    return (
      <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-2', className)}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 max-md:contents">
          {visible}
          {rest.length > 0 && <div className="contents max-md:hidden">{rest}</div>}
          <Popover>
            <PopoverTrigger asChild>
              <Button icon="filter" aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}>
                Filters{activeCount > 0 && <CountBadge value={activeCount} tone="brand" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-80 flex-col gap-3 [&_button[role=combobox]]:w-full">
              {rest.length > 0 && <div className="flex flex-col gap-3 md:hidden">{rest}</div>}
              {moreFilters}
            </PopoverContent>
          </Popover>
          {clear}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-2 max-md:ml-auto">{trailing}</div>}
      </div>
    );
  }

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
        {clear}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
