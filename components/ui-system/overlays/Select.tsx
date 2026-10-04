'use client';

import { forwardRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { useFieldProps } from '../primitives/Field';
import { COLLISION_PADDING, floatingSurface, optionRow, triggerSurface } from './surfaces';

export type SelectOption = { value: string; label: string; description?: string; disabled?: boolean };

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Accessible name when the select is not inside a <Field>. */
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  /** Shorter text for the closed trigger (e.g. department abbreviations); the list keeps full labels. */
  triggerLabel?: (option: SelectOption) => string;
}

/**
 * Single-choice picker for short lists (≈ up to 15 options). Radix gives the
 * keyboard model, typeahead, focus return, portalling and collision handling.
 * For large datasets use <Combobox>; for platform pickers use <NativeSelect>.
 *
 * Radix forbids an empty-string item value, so '' is transparently mapped to a
 * sentinel and back — callers can use '' to mean "no choice".
 */
const EMPTY = '__mo_empty__';
const toRadix = (value: string) => (value === '' ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? '' : value);

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, onValueChange, options, placeholder = 'Select…', disabled, className, triggerLabel, ...aria },
  ref,
) {
  const field = useFieldProps();
  const selected = options.find(option => option.value === value);
  return (
    <SelectPrimitive.Root value={toRadix(value)} onValueChange={next => onValueChange(fromRadix(next))} disabled={disabled}>
      <SelectPrimitive.Trigger ref={ref} {...field} aria-label={field.id ? undefined : aria['aria-label']} className={cn(triggerSurface, className)}>
        <span className="truncate" data-placeholder={selected ? undefined : ''}>
          {selected ? (triggerLabel ? triggerLabel(selected) : selected.label) : placeholder}
        </span>
        <Icon name="chevron-down" size="xs" className="shrink-0 text-ink-muted" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={COLLISION_PADDING}
          className={cn(floatingSurface, 'max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[var(--radix-select-trigger-width)] max-w-[min(24rem,calc(100vw-1.5rem))]')}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map(option => (
              <SelectPrimitive.Item key={option.value} value={toRadix(option.value)} disabled={option.disabled} className={optionRow}>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                {option.description && <span className="ml-auto truncate text-caption text-ink-muted">{option.description}</span>}
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
                  <Icon name="check" size="sm" weight="emphasis" className="text-action" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});
