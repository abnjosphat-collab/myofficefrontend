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
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable single-choice picker for large datasets (employees, equipment,
 * spares…). Popover for positioning/focus return, cmdk for the keyboard model
 * (↑/↓, Home/End, Enter, type-to-filter). Escape closes and returns focus.
 */
export function Combobox({
  value, onValueChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyMessage = 'No matches.',
  loading = false, shouldFilter = true, onSearchChange, clearLabel, disabled, className, ...aria
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const field = useFieldProps();
  const selected = options.find(option => option.value === value);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={field.id ? undefined : aria['aria-label']}
          {...field}
          disabled={disabled}
          data-placeholder={selected ? undefined : ''}
          className={cn(triggerSurface, className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
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
                onValueChange={onSearchChange}
                className="h-10 w-full bg-transparent font-sans text-body text-ink outline-none placeholder:text-ink-subtle"
              />
              {loading && <Spinner className="text-ink-muted" />}
            </div>
            <Command.List id={listId} className="max-h-72 overflow-y-auto p-1">
              {!loading && <Command.Empty className="px-3 py-6 text-center font-sans text-body-sm text-ink-muted">{emptyMessage}</Command.Empty>}
              {clearLabel && value !== '' && (
                <Command.Item value="__clear__" onSelect={() => { onValueChange(''); setOpen(false); }} className={optionRow}>
                  <span className="text-ink-muted">{clearLabel}</span>
                </Command.Item>
              )}
              {options.map(option => (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  keywords={option.keywords}
                  disabled={option.disabled}
                  onSelect={() => { onValueChange(option.value); setOpen(false); }}
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
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
