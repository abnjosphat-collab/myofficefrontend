'use client';

import { useId, useState, type ReactNode } from 'react';
import { Command } from 'cmdk';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { Spinner } from '../primitives/Button';
import { useFieldProps } from '../primitives/Field';
import { COLLISION_PADDING, floatingSurface, optionRow, triggerSurface } from './surfaces';

export type ComboboxOption = { value: string; label: string; description?: string; keywords?: string[]; disabled?: boolean };

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  /** Large datasets that load as you type: show a loading row and let the caller filter. */
  loading?: boolean;
  /** Set when the caller filters remotely; disables cmdk's own filtering. */
  shouldFilter?: boolean;
  onSearchChange?: (query: string) => void;
  /** Allow clearing back to '' with an explicit "None" row. */
  clearLabel?: string;
  /** Free text (G2): the typed query itself can be committed — Enter on the "Use …" row, or Tab to complete and move on. */
  allowCustomValue?: boolean;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable single-choice picker for large datasets (employees, equipment,
 * spares…). Popover for positioning/focus return, cmdk for the keyboard model
 * (↑/↓, Home/End, Enter, type-to-filter). Escape closes and returns focus.
 * With allowCustomValue the query itself is committable: a trailing "Use …" row
 * (Enter), or Tab to take the typed text and keep moving (the Tab-to-complete a
 * native datalist lacks, which is why Tools suggest-fields use this).
 */
export function Combobox({
  value, onValueChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyMessage = 'No matches.',
  loading = false, shouldFilter = true, onSearchChange, clearLabel, allowCustomValue = false, disabled, className, ...aria
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const field = useFieldProps();
  const selected = options.find(option => option.value === value);
  const shown = selected ? selected.label : (allowCustomValue && value ? value : placeholder);
  const trimmed = query.trim();
  const exact = trimmed !== '' && options.some(option => option.label.toLowerCase() === trimmed.toLowerCase() || option.value.toLowerCase() === trimmed.toLowerCase());
  const commit = (next: string) => { onValueChange(next); setQuery(''); setOpen(false); };
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery(''); }}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={field.id ? undefined : aria['aria-label']}
          {...field}
          disabled={disabled}
          data-placeholder={selected || (allowCustomValue && value) ? undefined : ''}
          className={cn(triggerSurface, className)}
        >
          <span className="truncate">{shown}</span>
          <Icon name="chevron-down" size="xs" className="shrink-0 text-ink-muted" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          collisionPadding={COLLISION_PADDING}
          className={cn(floatingSurface, 'w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[calc(100vw-1.5rem)] p-0')}
        >
          <Command shouldFilter={shouldFilter} loop>
            <div className="flex items-center gap-2 border-b border-line-subtle px-3">
              <Icon name="search" size="sm" className="shrink-0 text-ink-muted" />
              <Command.Input
                placeholder={searchPlaceholder}
                onValueChange={next => { setQuery(next); onSearchChange?.(next); }}
                onKeyDown={event => {
                  if (!allowCustomValue || trimmed === '' || exact) return;
                  // Tab-to-complete: take the typed text and let focus move on (no preventDefault).
                  if (event.key === 'Tab') { commit(trimmed); return; }
                  // Enter with no real option showing commits the typed text (the Use row is unscored,
                  // so cmdk's own Enter would do nothing). With options showing, Enter keeps cmdk's
                  // behaviour and picks the highlighted one. cmdk unmounts filtered-out items, so the
                  // live DOM count is exactly what the person sees.
                  if (event.key === 'Enter') {
                    const root = event.currentTarget.closest('[cmdk-root]');
                    const shown = root?.querySelectorAll('[cmdk-item]:not([data-custom-row])').length ?? 0;
                    if (shown === 0) {
                      event.preventDefault();
                      event.stopPropagation();
                      commit(trimmed);
                    }
                  }
                }}
                className="h-10 w-full bg-transparent font-sans text-body text-ink outline-none placeholder:text-ink-subtle"
              />
              {loading && <Spinner className="text-ink-muted" />}
            </div>
            <Command.List id={listId} className="max-h-72 overflow-y-auto p-1">
              {/* The Use row replaces the empty state: cmdk never scores it (its value changes per keystroke),
                  so its own Empty would show alongside it. */}
              {!loading && !(allowCustomValue && trimmed !== '' && !exact) && <Command.Empty className="px-3 py-6 text-center font-sans text-body-sm text-ink-muted">{emptyMessage}</Command.Empty>}
              {clearLabel && value !== '' && (
                <Command.Item value="__clear__" onSelect={() => commit('')} className={optionRow}>
                  <span className="text-ink-muted">{clearLabel}</span>
                </Command.Item>
              )}
              {options.map(option => (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  keywords={option.keywords}
                  disabled={option.disabled}
                  onSelect={() => commit(option.value)}
                  className={optionRow}
                  data-state={option.value === value ? 'checked' : 'unchecked'}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {/* Under the label, not beside it: beside it the description squeezed a short code to one letter. */}
                    {option.description && <span className="block truncate text-caption text-ink-muted">{option.description}</span>}
                  </span>
                  {option.value === value && <Icon name="check" size="sm" weight="emphasis" className="absolute right-2.5 text-action" />}
                </Command.Item>
              ))}
              {allowCustomValue && trimmed !== '' && !exact && (
                <Command.Item value={trimmed} data-custom-row onSelect={() => commit(trimmed)} className={optionRow}>
                  <span className="block truncate">Use &ldquo;{trimmed}&rdquo;</span>
                </Command.Item>
              )}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
