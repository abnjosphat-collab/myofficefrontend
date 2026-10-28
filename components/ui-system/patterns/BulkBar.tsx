// components/ui-system/patterns/BulkBar.tsx — one bulk-action bar for every
// register: how many are selected (and how many of those the filters hide),
// "Select all shown (n)" and "Clear", plus the caller's actions. It floats
// at the bottom of the viewport on phones and sits inline above the list on
// desktop. It enters and leaves with the presence motion; the counts roll.
'use client';

import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { NumberTransition, Presence } from '../motion';
import { Button } from '../primitives/Button';

export interface BulkBarProps {
  /** Whether anything is selected. The bar enters/leaves with the presence motion. */
  visible: boolean;
  /** How many records are selected, across every page and filter. */
  selectedCount: number;
  /** Selected records the current filters hide. Shown only when above zero. */
  hiddenCount?: number;
  /** How many records the current filters show. Labels "Select all shown (n)". */
  shownCount: number;
  /** Select every shown record (all pages of the filtered list). */
  onSelectAllShown: () => void;
  /** Clear the whole selection. */
  onClear: () => void;
  /** The bulk actions themselves (Mark done, Delete, …) from the caller. */
  actions: ReactNode;
  className?: string;
}

/**
 * The one bulk-action bar. The caller owns the selection set and the actions;
 * the bar owns the count line ("3 selected (1 hidden by filters)"), the
 * select-all-shown and clear controls, and the sticky-mobile/inline-desktop
 * placement.
 */
export function BulkBar({
  visible, selectedCount, hiddenCount = 0, shownCount,
  onSelectAllShown, onClear, actions, className,
}: BulkBarProps) {
  return (
    <Presence visible={visible}>
      <div
        role="region"
        aria-label="Bulk actions"
        className={cn(
          'sticky bottom-4 z-sticky flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card',
          'min-[821px]:static min-[821px]:rounded-control min-[821px]:border-line min-[821px]:bg-action-soft/50 min-[821px]:shadow-none',
          className,
        )}
      >
        <span className="font-sans text-label font-semibold text-ink" role="status">
          <span className="sr-only">{selectedCount} selected{hiddenCount > 0 ? ` (${hiddenCount} hidden by filters)` : ''}</span>
          <span aria-hidden="true">
            <NumberTransition value={selectedCount} /> selected{hiddenCount > 0 ? <> (<NumberTransition value={hiddenCount} /> hidden by filters)</> : ''}
          </span>
        </span>
        <Button size="sm" variant="secondary" onClick={onSelectAllShown}>
          <span className="sr-only">Select all shown ({shownCount})</span>
          <span aria-hidden="true">Select all shown (<NumberTransition value={shownCount} />)</span>
        </Button>
        {actions}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
          Clear
        </Button>
      </div>
    </Presence>
  );
}
