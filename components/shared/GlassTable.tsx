'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from '@/components/shared/theme';

export interface GlassColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
  /** Enable client-side sort on this column */
  sortable?: boolean;
  /** Custom sort comparator — receives the raw cell values */
  sortFn?: (a: unknown, b: unknown) => number;
}

interface GlassTableProps<T> {
  columns: GlassColumn<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: T) => string;
  stickyHeader?: boolean;
  maxHeight?: string;
  /** Animate rows in on first render */
  animateRows?: boolean;
}

type SortDir = 'asc' | 'desc';

function defaultCompare(a: unknown, b: unknown): number {
  const av = a == null ? '' : String(a);
  const bv = b == null ? '' : String(b);
  // Numeric-aware compare
  const an = parseFloat(av.replace(/[^0-9.-]/g, ''));
  const bn = parseFloat(bv.replace(/[^0-9.-]/g, ''));
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  return av.localeCompare(bv, undefined, { sensitivity: 'base' });
}

export function GlassTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  loading,
  emptyMessage = 'No records found.',
  className = '',
  rowClassName,
  stickyHeader = false,
  maxHeight = '400px',
  animateRows = true,
}: GlassTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const alignMap = { left: 'text-left', center: 'text-center', right: 'text-right' };

  function handleSort(col: GlassColumn<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const cmp = col.sortFn ? col.sortFn(av, bv) : defaultCompare(av, bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const table = (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b border-white/[0.07]">
          {columns.map(col => {
            const isActive = sortKey === col.key;
            const SortIcon = isActive
              ? (sortDir === 'asc' ? ChevronUp : ChevronDown)
              : ChevronsUpDown;

            return (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`px-4 py-2.5 ${col.align ? alignMap[col.align] : 'text-left'} ${
                  stickyHeader ? 'sticky top-0 bg-[#0e1e2e]/90 backdrop-blur-sm z-10' : ''
                }`}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider oz-sort-btn ${
                      isActive ? 'oz-sort-active' : 'text-white/40'
                    }`}
                  >
                    {col.header}
                    <SortIcon className={`h-3 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {col.header}
                  </span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-white/30 text-sm">
              Loading…
            </td>
          </tr>
        ) : sorted.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-white/30 text-sm">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          sorted.map((row, index) => (
            <tr
              key={String(row[keyField])}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-white/[0.04] transition-colors ${
                animateRows ? 'oz-table-row' : ''
              } ${onRowClick ? 'cursor-pointer hover:bg-white/[0.05]' : ''} ${
                rowClassName ? rowClassName(row) : ''
              }`}
              style={animateRows ? { animationDelay: `${Math.min(index * 28, 420)}ms` } : undefined}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-white/80 ${col.align ? alignMap[col.align] : 'text-left'}`}
                >
                  {col.render
                    ? col.render(row, index)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  if (stickyHeader) {
    return (
      <div className={`overflow-auto ${className}`} style={{ maxHeight }}>
        {table}
      </div>
    );
  }

  return (
    <div className={`relative overflow-x-auto ${className}`}>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/20 to-transparent sm:hidden"
        aria-hidden
      />
      {table}
    </div>
  );
}
