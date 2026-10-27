import { useRef } from 'react';
import { cn } from '../foundations/cn';
import { SlidingIndicator, useSlidingIndicator } from '../motion';
import { useMarkDirty } from './Field';

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * Single-choice filter with visible text labels (status filters, scope switches).
 * Native buttons with aria-pressed, so keyboard and screen readers behave as a
 * toggle-button group. Use ViewToggle for icon-only view switching and Tabs for
 * switching between panels of different content. The selected fill is a pill
 * that slides between options on the smooth spring (instant under reduced
 * motion); before it can measure, the pressed option carries its own fill.
 */
export function Segmented<T extends string>({ value, onValueChange, options, label, className }: {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Accessible name of the group, e.g. "Status". */
  label: string;
  className?: string;
}) {
  const markDirty = useMarkDirty();
  const containerRef = useRef<HTMLDivElement>(null);
  const pill = useSlidingIndicator(containerRef, { selector: '[aria-pressed="true"]', activeKey: value });
  return (
    <div ref={containerRef} role="group" aria-label={label} className={cn('relative inline-flex max-w-full flex-wrap gap-0.5 rounded-control bg-surface-muted p-0.5', className)}>
      <SlidingIndicator rect={pill} variant="pill" className="bg-action" />
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => { markDirty(); onValueChange(option.value); }}
          className={cn(
            // Static fill until the sliding pill can position itself (and if it never can).
            pill ? 'aria-pressed:bg-transparent' : 'aria-pressed:bg-action',
            'focus-ring touch-target relative inline-flex h-8 items-center rounded-sm px-3 font-sans text-label font-medium text-ink-muted transition-colors duration-[var(--mo-duration-base)] aria-[pressed=false]:hover:bg-surface-interactive aria-[pressed=false]:hover:text-ink aria-pressed:text-action-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
