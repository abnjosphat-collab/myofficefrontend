'use client';

import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { IconButton, Spinner } from './Button';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name. Defaults to the placeholder. */
  label?: string;
  loading?: boolean;
  /** Shown while the field is empty and unfocused, e.g. "/" for a focus shortcut. */
  shortcutHint?: string;
  /**
   * Live result summary announced to assistive technology ("12 items", "No matches").
   * Local filters pass this; destination search announces through its result list instead.
   */
  status?: ReactNode;
  wrapperClassName?: string;
  /**
   * Fold to a search icon while empty (the Tools toolbar). It opens on click, takes focus, and folds again
   * when it loses focus with nothing typed. Use where the toolbar is crowded and search is not the main task.
   */
  collapsible?: boolean;
}

/**
 * The one search control — appearance, icon, clearing, focus, Escape-to-clear and
 * loading are identical wherever it appears. Use alone for LOCAL list/table
 * filtering; <DestinationSearch> wraps it for navigation-style results.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onValueChange, label, loading = false, shortcutHint, status, placeholder = 'Search…', className, wrapperClassName, onKeyDown, collapsible = false, onBlur, ...rest },
  ref,
) {
  const statusId = useId();
  const inner = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const setRefs = (node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  };
  useEffect(() => { if (open) inner.current?.focus(); }, [open]);
  if (collapsible && !open && !value) {
    return <IconButton icon="search" variant="outline" label={label ?? placeholder} tooltip="Search" onClick={() => setOpen(true)} />;
  }
  return (
    <div className={cn('relative w-full min-w-0', collapsible && 'animate-in fade-in-0 duration-[var(--mo-duration-fast)]', wrapperClassName)}>
      <Icon name="search" size="md" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        ref={setRefs}
        onBlur={event => { onBlur?.(event); if (collapsible && !event.currentTarget.value) setOpen(false); }}
        type="search"
        role={rest.role}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label={label ?? placeholder}
        aria-describedby={status ? statusId : undefined}
        placeholder={placeholder}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Escape' && value) { event.preventDefault(); onValueChange(''); }
        }}
        className={cn(
          'focus-ring h-9 w-full min-w-0 rounded-control border border-line-control bg-surface-raised pl-9 pr-9 font-sans text-body text-ink placeholder:text-ink-subtle',
          'transition-[border-color,box-shadow] duration-[var(--mo-duration-base)] ease-standard hover:border-line-strong focus-visible:border-focus pointer-coarse:h-11',
          '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
          className,
        )}
        {...rest}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <span className="inline-flex size-6 items-center justify-center text-ink-muted" role="status" aria-label="Searching"><Spinner /></span>
        ) : value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onValueChange('')}
            className="focus-ring inline-flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink pointer-coarse:size-9"
          >
            <Icon name="close" size="sm" />
          </button>
        ) : shortcutHint ? (
          <kbd className="mr-1.5 hidden rounded-xs border border-line px-1.5 font-sans text-caption text-ink-muted sm:inline">{shortcutHint}</kbd>
        ) : null}
      </div>
      {status && <span id={statusId} role="status" aria-live="polite" className="sr-only">{status}</span>}
    </div>
  );
});
