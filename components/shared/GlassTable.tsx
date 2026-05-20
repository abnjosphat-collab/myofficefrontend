'use client';

import type { ReactNode } from 'react';

export interface GlassColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

interface GlassTableProps<T> {
  columns: GlassColumn<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Class applied to each <tr> */
  rowClassName?: (row: T) => string;
  /** Sticky header — wraps table in a scrollable container */
  stickyHeader?: boolean;
  /** Max height when stickyHeader is true (default '400px') */
  maxHeight?: string;
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
}: GlassTableProps<T>) {
  const alignMap = { left: 'text-left', center: 'text-center', right: 'text-right' };

  const table = (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b border-white/[0.07]">
          {columns.map(col => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 ${col.align ? alignMap[col.align] : 'text-left'} ${stickyHeader ? 'sticky top-0 bg-[#0e1e2e]/90 backdrop-blur-sm z-10' : ''}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-white/30 text-sm">
              Loading…
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-white/30 text-sm">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row, index) => (
            <tr
              key={String(row[keyField])}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-white/[0.04] transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-white/[0.05]' : ''
              } ${rowClassName ? rowClassName(row) : ''}`}
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
      <div
        className={`overflow-auto ${className}`}
        style={{ maxHeight }}
      >
        {table}
      </div>
    );
  }

  return (
    <div className={`relative overflow-x-auto ${className}`}>
      {/* Horizontal scroll hint — fades in on mobile when content overflows */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/20 to-transparent sm:hidden" aria-hidden />
      {table}
    </div>
  );
}
