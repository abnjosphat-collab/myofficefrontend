// components/shared/timesheet/DayTable.tsx — one person's days as a scrollable table, shared by the artisan
// and NEC timesheets: a sticky date column, zebra rows, an expander column wherever a row carries a breakdown,
// and a totals foot. The shell owns the layout; the caller owns every cell, the breakdown content and the foot
// figures (NEC feet come from calcEmployeeTotals, never from summing the rows).
'use client';

import { useState, type ReactNode, type Ref } from 'react';
import { Icon, cn } from '@/components/ui-system';

export interface DayTableColumn {
  header: string;
  align?: 'left' | 'center';
  /** Tighter vertical padding for control cells (the standby toggle column). */
  compact?: boolean;
}

export interface DayTableRowDetail {
  id: string;
  /** "Show the breakdown for …" / "Hide the breakdown for …" is built from this. */
  label: string;
  content: ReactNode;
}

export interface DayTableRow {
  key: string;
  /** One cell per column; the first renders as the sticky row header. */
  cells: ReactNode[];
  cellClassNames?: (string | undefined)[];
  /** Rendered as data-row-index for drag-fill callers. */
  dataIndex?: number;
  /** Tints the row (standby days in the artisan sheet). */
  highlight?: boolean;
  detail?: DayTableRowDetail;
}

export interface DayTableFooterCell {
  content: ReactNode;
  colSpan?: number;
  title?: string;
}

/** A number that dims when it is zero, for day-table cells and feet. */
export function DayTableNum({ value, bold, decimals = 2 }: { value: number; bold?: boolean; decimals?: number }) {
  const zero = !value;
  return (
    <span className={cn('tabular', zero ? 'text-ink-subtle' : 'font-medium text-ink', bold && !zero && 'font-semibold text-action')}>
      {value.toFixed(decimals)}
    </span>
  );
}

export function DayTable({ caption, regionLabel, columns, rows, footerLabel, footerLabelSpan, footerCells, footerFiller, footnote, minWidth = 880, filling, scrollRef }: {
  caption: string;
  regionLabel: string;
  columns: DayTableColumn[];
  rows: DayTableRow[];
  footerLabel: string;
  footerLabelSpan: number;
  footerCells: DayTableFooterCell[];
  /** The foot cell under the expander column. */
  footerFiller?: ReactNode;
  footnote?: string;
  minWidth?: number;
  /** While a drag-fill runs: text selection is off. */
  filling?: boolean;
  /** The scroll region, for callers that auto-scroll during a drag-fill. */
  scrollRef?: Ref<HTMLDivElement>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const hasDetails = rows.some(r => r.detail);
  const colCount = columns.length + (hasDetails ? 1 : 0);
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className={cn('overflow-hidden rounded-card border border-line', filling && 'select-none')}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={scrollRef} tabIndex={0} role="region" aria-label={regionLabel} className="max-h-[min(70vh,720px)] overflow-auto overscroll-contain">
        <table className="w-full border-collapse font-sans text-body-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              {columns.map((c, i) => (
                <th
                  key={c.header || `col-${i}`}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-30 whitespace-nowrap bg-surface-muted px-2 py-2 font-sans text-caption font-semibold text-ink',
                    i === 0 && 'sticky left-0 z-50 text-left',
                    i > 0 && (c.align === 'center' ? 'text-center' : 'text-left'),
                  )}
                >
                  {c.header}
                </th>
              ))}
              {hasDetails && (
                <th scope="col" aria-label="Details" className="sticky top-0 z-30 whitespace-nowrap bg-surface-muted px-2 py-2 text-center font-sans text-caption font-semibold text-ink" />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const open = !!r.detail && expanded.has(r.detail.id);
              return ([
                <tr
                  key={r.key}
                  data-row-index={r.dataIndex}
                  className={cn('border-b border-line-subtle', i % 2 ? 'bg-surface-subtle' : 'bg-surface', r.highlight && '!bg-warning-soft/40')}
                >
                  {r.cells.map((cell, n) => (n === 0 ? (
                    <th key={n} scope="row" className={cn('sticky left-0 z-20 whitespace-nowrap px-2 py-1.5 text-left font-medium text-ink', i % 2 ? 'bg-surface-subtle' : 'bg-surface', r.highlight && '!bg-warning-soft/40', r.cellClassNames?.[n])}>
                      {cell}
                    </th>
                  ) : (
                    <td key={n} className={cn('px-2', columns[n]?.compact ? 'py-1' : 'py-1.5', columns[n]?.align === 'center' ? 'text-center' : 'text-left', r.cellClassNames?.[n])}>
                      {cell}
                    </td>
                  )))}
                  {hasDetails && (
                    <td className="px-1 py-1 text-center">
                      {r.detail && (
                        <button
                          type="button"
                          onClick={() => toggle(r.detail!.id)}
                          aria-expanded={open}
                          aria-controls={r.detail.id}
                          aria-label={`${open ? 'Hide' : 'Show'} the breakdown for ${r.detail.label}`}
                          className="focus-ring inline-grid size-8 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
                        >
                          <Icon name="chevron-right" size="sm" className={cn('transition-transform duration-[var(--mo-duration-base)]', open && 'rotate-90')} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>,
                open && r.detail && (
                  <tr key={`${r.key}-detail`} id={r.detail.id} className="border-b border-line bg-surface-subtle/60">
                    <td colSpan={colCount}>{r.detail.content}</td>
                  </tr>
                ),
              ]);
            })}
          </tbody>
          <tfoot>
            {footnote && (
              <tr className="border-t border-line bg-surface-muted">
                <td colSpan={colCount} className="px-2 py-1.5 font-sans text-body-sm text-warning">{footnote}</td>
              </tr>
            )}
            <tr className="border-t-2 border-line bg-surface-muted font-semibold">
              <th scope="row" colSpan={footerLabelSpan} className="sticky left-0 z-20 bg-surface-muted px-2 py-2 text-left font-sans text-body-sm text-ink">{footerLabel}</th>
              {footerCells.map((c, n) => (
                <td key={n} colSpan={c.colSpan} title={c.title} className="px-2 py-2 text-center font-sans text-body-sm tabular text-ink">{c.content}</td>
              ))}
              {hasDetails && <td>{footerFiller ?? <span className="sr-only">No total</span>}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
