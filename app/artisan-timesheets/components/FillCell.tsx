'use client';

import React from 'react';
import { FILL_COLUMN_LABELS, type FillColumn } from '../fillHours';

interface FillCellProps {
  rowIndex: number;
  column: FillColumn;
  active: boolean;
  preview: boolean;
  onStartFill: (rowIndex: number, column: FillColumn) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Wraps a grid cell with an Excel-style corner handle — drag down to copy that column only. */
export function FillCell({
  rowIndex,
  column,
  active,
  preview,
  onStartFill,
  children,
  className = '',
  style,
}: FillCellProps) {
  const label = FILL_COLUMN_LABELS[column];

  return (
    <td
      style={style}
      className={`group relative px-0.5 py-0.5 ${preview ? 'bg-brand-500/12' : ''} ${active ? 'ring-1 ring-inset ring-brand-400/45' : ''} ${className}`}
    >
      {children}
      <button
        type="button"
        title={`Drag to copy ${label} to rows below`}
        aria-label={`Copy ${label} down from row ${rowIndex + 1}`}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onStartFill(rowIndex, column);
        }}
        className={`absolute right-0 bottom-0 z-10 h-2.5 w-2.5 cursor-ns-resize border-r-2 border-b-2 rounded-br-sm transition-opacity
          ${active ? 'border-brand-500 opacity-90' : 'border-slate-400/45 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:border-brand-500/80'}`}
      />
    </td>
  );
}
