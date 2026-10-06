'use client';

import { useMemo, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { Checkbox } from '../primitives/Checkbox';
import { nextSort, selectionState, toggleAllVisible, toggleOne, type SortState } from './tableLogic';

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  sortable?: boolean;
  /** Fixed width (CSS length) for compact columns such as status or actions. */
  width?: string;
  /** Pin to the left while scrolling horizontally (first identifying column only). */
  sticky?: boolean;
  /** Hide below the md breakpoint to keep dense tables readable on tablets. */
  hideBelow?: 'md' | 'lg';
  className?: string;
};

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: ReadonlyArray<Column<T>>;
  getRowId: (row: T) => string;
  /** Required: screen-reader name for the table. */
  caption: string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  selected?: ReadonlySet<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  onRowActivate?: (row: T) => void;
  /** Trailing per-row actions (icon buttons / menu). */
  rowActions?: (row: T) => ReactNode;
  density?: 'comfortable' | 'compact';
  className?: string;
}

/**
 * Semantic, responsive data table. Header is sticky inside its scroll container,
 * numbers align right with tabular figures, selected rows get a fill AND a checked
 * box, and horizontal overflow is explicit (the wrapper scrolls, the page never does).
 * Sorting and selection logic live in tableLogic.ts (pure, tested).
 */
export function DataTable<T>({
  rows, columns, getRowId, caption, sort = null, onSortChange, selected, onSelectedChange, onRowActivate, rowActions, density = 'comfortable', className,
}: DataTableProps<T>) {
  const ids = useMemo(() => rows.map(getRowId), [rows, getRowId]);
  const selectable = Boolean(selected && onSelectedChange);
  const state = selected ? selectionState(ids, selected) : 'none';
  const pad = density === 'compact' ? 'px-3 py-1.5' : 'px-3.5 py-2.5';
  const hide = (c: Column<T>) => (c.hideBelow === 'md' ? 'hidden md:table-cell' : c.hideBelow === 'lg' ? 'hidden lg:table-cell' : '');

  return (
    // A scrollable region must be keyboard-focusable so keyboard users can scroll it (axe: scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={cn('max-w-full overflow-auto rounded-card border border-line-subtle bg-surface', className)} tabIndex={0} role="region" aria-label={`${caption} (scrollable)`}>
      <table className="w-full border-separate border-spacing-0 text-left font-sans text-body-sm text-ink">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="sticky top-0 z-[var(--mo-z-sticky)] w-11 border-b border-line bg-surface-subtle px-3.5 py-2">
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={state === 'all'}
                  ref={element => { if (element) element.indeterminate = state === 'some'; }}
                  onChange={() => selected && onSelectedChange?.(toggleAllVisible(ids, selected))}
                />
              </th>
            )}
            {columns.map(column => {
              const active = sort?.id === column.id;
              const label = <span className="truncate">{column.header}</span>;
              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : column.sortable ? 'none' : undefined}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'sticky top-0 z-[var(--mo-z-sticky)] whitespace-nowrap border-b border-line bg-surface-subtle px-3.5 py-2 font-sans text-label font-medium text-ink-muted',
                    column.numeric && 'text-right', column.sticky && 'left-0 z-[calc(var(--mo-z-sticky)+1)]', hide(column), column.className,
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(nextSort(sort, column.id))}
                      className={cn('focus-ring -mx-1.5 inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 hover:text-ink', active && 'text-ink', column.numeric && 'flex-row-reverse')}
                    >
                      {label}
                      <Icon name={active ? (sort?.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'sort'} size="xs" weight={active ? 'emphasis' : 'control'} />
                    </button>
                  ) : label}
                </th>
              );
            })}
            {rowActions && <th scope="col" className="sticky top-0 z-[var(--mo-z-sticky)] w-px border-b border-line bg-surface-subtle px-3.5 py-2"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = ids[index];
            const isSelected = selected?.has(id) ?? false;
            const cell = cn('border-b border-line-subtle', pad, isSelected ? 'bg-action-soft/60' : 'bg-surface group-hover:bg-surface-subtle');
            return (
              <tr
                key={id}
                data-selected={isSelected || undefined}
                onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                className={cn('group', onRowActivate && 'cursor-pointer')}
              >
                {selectable && (
                  <td className={cn(cell, 'w-11')} onClick={event => event.stopPropagation()}>
                    <Checkbox aria-label={`Select row ${index + 1}`} checked={isSelected} onChange={() => selected && onSelectedChange?.(toggleOne(id, selected))} />
                  </td>
                )}
                {columns.map(column => (
                  <td key={column.id} className={cn(cell, column.numeric && 'text-right tabular', column.sticky && 'sticky left-0 z-[var(--mo-z-sticky)] font-medium', hide(column), column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
                {rowActions && <td className={cn(cell, 'w-px whitespace-nowrap')} onClick={event => event.stopPropagation()}>{rowActions(row)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
