'use client';

import { useRef } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { SlidingIndicator, useSlidingIndicator } from '../motion';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';

export type ViewOption<T extends string> = { value: T; label: string; icon: IconMeaning };

export const VIEW_GRID_LIST = [
  { value: 'grid', label: 'Grid view', icon: 'grid-view' },
  { value: 'list', label: 'List view', icon: 'list-view' },
] as const satisfies ReadonlyArray<ViewOption<string>>;

export const VIEW_CARDS_TABLE = [
  { value: 'cards', label: 'Card view', icon: 'grid-view' },
  { value: 'table', label: 'Table view', icon: 'table-view' },
] as const satisfies ReadonlyArray<ViewOption<string>>;

/**
 * Segmented control for switching how the same records are presented. The
 * selected fill is a pill that slides between options on the smooth spring
 * (instant under reduced motion); before it can measure, the pressed option
 * carries its own fill.
 */
export function ViewToggle<T extends string>({ value, onValueChange, options, className }: {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<ViewOption<T>>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pill = useSlidingIndicator(containerRef, { selector: '[aria-pressed="true"]', activeKey: value });
  return (
    <div ref={containerRef} role="group" aria-label="View" className={cn('relative inline-flex shrink-0 rounded-control border border-line bg-transparent p-0.5', className)}>
      <SlidingIndicator rect={pill} variant="pill" className="bg-action" />
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          title={option.label}
          aria-pressed={value === option.value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            // Static fill until the sliding pill can position itself (and if it never can).
            pill ? 'aria-pressed:bg-transparent' : 'aria-pressed:bg-action',
            'focus-ring touch-target relative inline-flex size-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-[var(--mo-duration-base)] aria-[pressed=false]:hover:text-ink aria-pressed:text-action-ink',
          )}
        >
          <Icon name={option.icon} size="md" weight={value === option.value ? 'emphasis' : 'control'} />
        </button>
      ))}
    </div>
  );
}

/** Persisted view preference per module: `const [view, setView] = useViewPreference('equipment', VIEW_GRID_LIST)`. */
export function useViewPreference<T extends string>(moduleKey: string, options: ReadonlyArray<ViewOption<T>>, fallback?: T) {
  const values = options.map(option => option.value);
  return usePersistentState<T>(`myoffice_view_${moduleKey}`, fallback ?? values[0], oneOf(values));
}
