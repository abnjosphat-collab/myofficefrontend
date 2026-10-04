'use client';

import { useId, useState, type ElementType, type RefObject } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../foundations/cn';
import { Glyph, Icon, isIconMeaning } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { COLLISION_PADDING, floatingSurface } from '../overlays/surfaces';
import { SearchField } from '../primitives/SearchField';

export type DestinationResult = {
  id: string;
  /** Destination type shown as a label, e.g. "Equipment", "Employee", "Page", "Action". */
  kind: string;
  title: string;
  /** Context line: where it lives, why it matched. */
  subtitle?: string;
  /** A semantic meaning, or a glyph component for destinations that carry their own icon. */
  icon: IconMeaning | ElementType;
};

export interface DestinationSearchProps<T extends DestinationResult> {
  value: string;
  onValueChange: (value: string) => void;
  results: T[];
  /** Called when a result is activated (Enter or click). Navigation lives in the caller. */
  onChoose: (result: T) => void;
  placeholder?: string;
  label?: string;
  shortcutHint?: string;
  loading?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Footer explaining what is searched. */
  hint?: string;
  /** Shown when the field is focused and empty (e.g. recent searches). Chosen through onChoose like any result. */
  idleResults?: T[];
  idleHeading?: string;
  onClearIdle?: () => void;
  className?: string;
}

/**
 * Search that navigates: type, arrow through destinations, Enter to go. It is the
 * same SearchField as a local filter, plus an ARIA combobox result list that keeps
 * DOM focus in the input (aria-activedescendant) and is portalled with collision
 * handling like every other floating surface.
 */
export function DestinationSearch<T extends DestinationResult>({
  value, onValueChange, results: searchResults, onChoose, placeholder = 'Search…', label, shortcutHint, loading, inputRef, hint, className,
  idleResults, idleHeading = 'Recent', onClearIdle,
}: DestinationSearchProps<T>) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const idle = value.trim().length === 0;
  const results = idle ? (idleResults ?? []) : searchResults;
  const open = focused && (!idle || results.length > 0);
  const safeActive = Math.min(active, Math.max(results.length - 1, 0));

  const choose = (result: T) => {
    onChoose(result);
    setFocused(false);
    inputRef?.current?.blur();
  };

  return (
    <PopoverPrimitive.Root open={open}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn('w-full min-w-0', className)}>
          <SearchField
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && results[safeActive] ? `${listId}-${safeActive}` : undefined}
            value={value}
            label={label ?? placeholder}
            placeholder={placeholder}
            shortcutHint={shortcutHint}
            loading={loading}
            onValueChange={next => { setActive(0); onValueChange(next); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={event => {
              if (!open) return;
              if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setActive((safeActive + 1) % results.length); }
              else if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActive((safeActive + results.length - 1) % results.length); }
              else if (event.key === 'Home' && results.length) { event.preventDefault(); setActive(0); }
              else if (event.key === 'End' && results.length) { event.preventDefault(); setActive(results.length - 1); }
              else if (event.key === 'Enter' && results[safeActive]) { event.preventDefault(); choose(results[safeActive]); }
              else if (event.key === 'Escape') { event.preventDefault(); setFocused(false); }
            }}
          />
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={COLLISION_PADDING}
          // Focus must stay in the input; the list is driven by aria-activedescendant.
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => { if (inputRef?.current && event.target instanceof Node && inputRef.current.contains(event.target)) event.preventDefault(); }}
          className={cn(floatingSurface, 'w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[min(34rem,calc(100vw-1.5rem))] p-0')}
        >
          <div id={listId} role="listbox" aria-label="Search results" className="max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-y-auto p-1">
            {results.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-2.5 py-1.5 font-sans text-caption text-ink-muted">
                  <span>{idle ? idleHeading : 'Best matches'}</span>
                  {idle && onClearIdle
                    ? <button type="button" onMouseDown={event => event.preventDefault()} onClick={onClearIdle} className="focus-ring rounded-xs px-1 hover:text-danger">Clear</button>
                    : <span className="hidden sm:inline">↑ ↓ to move · Enter to open</span>}
                </div>
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    id={`${listId}-${index}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === safeActive}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                    onKeyDown={event => { if (event.key === 'Enter') choose(result); }}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 aria-selected:bg-surface-muted"
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-muted text-ink-muted">
                      {isIconMeaning(result.icon) ? <Icon name={result.icon} size="md" /> : <Glyph as={result.icon} size="md" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-body font-medium text-ink">{result.title}</span>
                      {result.subtitle && <span className="block truncate font-sans text-caption text-ink-muted">{result.subtitle}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 font-sans text-caption text-ink-muted">{result.kind}</span>
                  </div>
                ))}
              </>
            ) : (
              <div role="status" className="flex items-center gap-3 px-3 py-5 text-ink-muted">
                <Icon name="search" size="lg" />
                <span>
                  <span className="block font-sans text-body font-medium text-ink">No close match found</span>
                  <span className="block font-sans text-caption">Check the spelling or try a different word.</span>
                </span>
              </div>
            )}
          </div>
          {hint && <p className="border-t border-line-subtle px-3 py-2 font-sans text-caption text-ink-muted">{hint}</p>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
