import { cn } from '../foundations/cn';

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * Single-choice filter with visible text labels (status filters, scope switches).
 * Native buttons with aria-pressed, so keyboard and screen readers behave as a
 * toggle-button group. Use ViewToggle for icon-only view switching and Tabs for
 * switching between panels of different content.
 */
export function Segmented<T extends string>({ value, onValueChange, options, label, className }: {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Accessible name of the group, e.g. "Status". */
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex max-w-full flex-wrap rounded-control border border-line-control bg-surface-muted p-0.5', className)}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onValueChange(option.value)}
          className="focus-ring touch-target inline-flex h-8 items-center rounded-[5px] px-3 font-sans text-label font-medium text-ink-muted transition-colors duration-[var(--mo-duration-base)] hover:text-ink aria-pressed:bg-surface aria-pressed:text-action aria-pressed:shadow-xs"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
