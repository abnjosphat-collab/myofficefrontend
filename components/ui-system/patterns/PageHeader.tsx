'use client';

import { Children, Fragment, isValidElement, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';
import { Icon } from '../foundations/Icon';
import { Button, IconButton } from '../primitives/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../overlays/Popover';
import { HelpHint } from '../overlays/Tooltip';

export type Crumb = { label: string; href?: string };

/**
 * The trail worth showing: from the first crumb that links somewhere to the current page. Group names with no
 * link only repeat the sidebar, and a final crumb that repeats the title says nothing new, so both are dropped.
 */
export function visibleCrumbs(breadcrumbs: Crumb[] | undefined, title: string): Crumb[] {
  if (!breadcrumbs?.length) return [];
  const first = breadcrumbs.findIndex(c => c.href);
  if (first < 0) return [];
  const trail = breadcrumbs.slice(first);
  const last = trail[trail.length - 1];
  return trail.length > 1 && !last.href && last.label.trim().toLowerCase() === title.trim().toLowerCase() ? trail.slice(0, -1) : trail;
}

/**
 * Page title block, kept to one quiet row like the Tools top bar: the single <h1>, a hint icon holding the page's
 * description (hidden with the "Helpful hints" preference), an optional small `meta` line for live facts, and the
 * actions. Actions follow one rule: one primary button with a verb ("Add employee"), every other action an
 * icon with a tooltip (refresh, download, more). A breadcrumb trail shows only when it links somewhere.
 */
export function PageHeader({ title, description, breadcrumbs, actions, meta, className }: {
  title: string;
  /** What the page is for. Shown behind the hint icon beside the title, not as a paragraph. */
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Small supporting line that stays visible: scope, period, last updated, record count. */
  meta?: ReactNode;
  className?: string;
}) {
  const crumbs = visibleCrumbs(breadcrumbs, title);
  if (process.env.NODE_ENV !== 'production' && actions) {
    const primaries = flatten(actions).filter(a => isValidElement<{ variant?: string }>(a) && a.props.variant === 'primary').length;
    if (primaries > 1) console.warn(`PageHeader "${title}": ${primaries} primary actions. Keep one; make the rest icons or move them into More.`);
  }
  return (
    <header className={cn('flex flex-col gap-1.5 pb-1', className)}>
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 font-sans text-caption text-ink-muted">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <Icon name="chevron-right" size="xs" />}
                {crumb.href
                  ? <Link href={crumb.href} className="focus-ring rounded-xs hover:text-ink">{crumb.label}</Link>
                  : <span>{crumb.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-1.5">
            <h1 className={type.pageTitle}>{title}</h1>
            {description && <HelpHint label={title}>{description}</HelpHint>}
          </div>
          {meta && <p className="mt-0.5 font-sans text-caption text-ink-muted">{meta}</p>}
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

/** A labelled control inside the Toolbar's Filters popover (`moreFilters`). */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="font-sans text-caption text-ink-muted">{label}</span>{children}</div>;
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
              <IconButton
                icon="filter"
                variant="outline"
                label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
                tooltip="Filters"
                badge={activeCount > 0 ? activeCount : undefined}
              />
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
          <IconButton
            className="sm:hidden"
            icon="filter"
            variant="outline"
            label={filtered ? 'Filters, applied' : 'Filters'}
            tooltip="Filters"
            badge={filtered ? '' : undefined}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(o => !o)}
          />
        )}
        <div id={panelId} className={cn(open ? 'max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:gap-2 max-sm:[&>*]:!w-full' : 'max-sm:hidden', 'sm:contents')}>{rest}</div>
        {clear}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
