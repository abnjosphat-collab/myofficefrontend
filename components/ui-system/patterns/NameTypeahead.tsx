// components/ui-system/patterns/NameTypeahead.tsx — the one way to type a person's name. You type in the box itself; the
// rest of the best-matching name is written in faintly after the caret, and Tab takes it and moves on (Enter takes it and
// stays). The list under the box shows the other matches with their mine number and designation; ↑/↓ choose among them.
// The wrappers in PeoplePicker.tsx decide what a pick means (a register record, a chip, or just the name as text).
'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../foundations/cn';
import { controlClasses, useFieldProps, useMarkDirty } from '../primitives/Field';
import { COLLISION_PADDING, floatingSurface, optionRow } from '../overlays/surfaces';
import { inlineCompletion, lastListPart, rankNames, type NameSuggestion } from './nameMatch';

export interface NameTypeaheadProps {
  /** What the box shows. The caller owns it. */
  text: string;
  onTextChange: (text: string) => void;
  options: readonly NameSuggestion[];
  /** Values picked recently, most recent first: offered when the box is empty, and first among equal matches. */
  recent?: readonly string[];
  /** A suggestion was taken. `nextText` is what the box should now hold (the full name, or the list with it added). */
  onChoose: (suggestion: NameSuggestion, nextText: string) => void;
  onBlur?: () => void;
  /** A comma-separated list of names: suggestions complete the last one. */
  multiple?: boolean;
  /** Shown under the box when something is typed and nobody matches. Omit to show nothing (free-text fields). */
  emptyMessage?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Start with the caret in the box. The dialog leaves focus alone while this is set. */
  autoFocusSearch?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function NameTypeahead({
  text, onTextChange, options, recent, onChoose, onBlur, multiple = false, emptyMessage, placeholder, disabled, autoFocusSearch, className, ...aria
}: NameTypeaheadProps) {
  const field = useFieldProps();
  const markDirty = useMarkDirty();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  useEffect(() => { if (autoFocusSearch && !disabled) inputRef.current?.focus({ preventScroll: true }); }, [autoFocusSearch, disabled]);

  const { head, part } = multiple ? lastListPart(text) : { head: '', part: text };
  const matches = useMemo(() => rankNames(options, part, recent), [options, part, recent]);
  const current = matches[Math.min(highlight, matches.length - 1)];
  const completion = current && part ? inlineCompletion(current.label, part) : '';
  // A match found by surname or mine number cannot be written on after the caret: name it instead, so Tab is never a surprise.
  const elsewhere = current && part && !completion && current.label.toLowerCase() !== part.toLowerCase() ? current.label : '';
  const nothing = part.trim() !== '' && matches.length === 0 && emptyMessage !== undefined;
  const showPanel = open && !disabled && (matches.length > 0 || nothing);

  const choose = (s: NameSuggestion) => {
    markDirty();
    onChoose(s, multiple ? `${head}${s.label}, ` : s.label);
    setOpen(false);
    setHighlight(0);
  };
  const keepOpen = (target: EventTarget | null) => target instanceof Node && !!anchorRef.current?.contains(target);

  return (
    <PopoverPrimitive.Root open={showPanel} onOpenChange={next => { if (!next) setOpen(false); }}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={anchorRef} className={cn('relative w-full min-w-0', className)}>
          {(completion || elsewhere) && (
            // Drawn over the box (positioned, so it paints above the input) at the same padding and font: the completion sits right after the caret.
            <div aria-hidden="true" data-name-completion className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border border-transparent px-3 font-sans text-body">
              <span className="invisible">{text}</span>
              {completion
                ? <span className="text-ink-subtle">{completion}</span>
                : <span className="truncate text-ink-subtle">{'  → '}{elsewhere}</span>}
              <span className="ml-2 shrink-0 rounded-xs border border-line px-1 font-sans text-caption text-ink-muted">Tab</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="both"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            aria-activedescendant={showPanel && current ? `${listId}-${matches.indexOf(current)}` : undefined}
            aria-label={field.id ? undefined : aria['aria-label']}
            {...field}
            autoComplete="off"
            spellCheck={false}
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            data-autofocus-search={autoFocusSearch && !disabled ? '' : undefined}
            className={cn(controlClasses, 'h-9 touch-target')}
            onChange={e => { onTextChange(e.target.value); setOpen(true); setHighlight(0); }}
            // A name already in the box is selected on entry, so typing replaces it; a comma list keeps the caret at the end.
            onFocus={e => { setOpen(true); if (!multiple && e.currentTarget.value) e.currentTarget.select(); }}
            onBlur={() => { setOpen(false); onBlur?.(); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!open) { setOpen(true); setHighlight(0); return; }
                const last = Math.max(matches.length - 1, 0);
                setHighlight(h => (e.key === 'ArrowDown' ? (h >= last ? 0 : h + 1) : (h <= 0 ? last : h - 1)));
                return;
              }
              // Tab takes the highlighted name and lets focus move on; with nothing typed it only moves on.
              if (e.key === 'Tab' && !e.shiftKey && showPanel && current && part.trim() !== '') { choose(current); return; }
              if (e.key === 'Enter' && showPanel && current) { e.preventDefault(); choose(current); }
            }}
          />
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          collisionPadding={COLLISION_PADDING}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          onPointerDownOutside={e => { if (keepOpen(e.target)) e.preventDefault(); }}
          onFocusOutside={e => { if (keepOpen(e.target)) e.preventDefault(); }}
          className={cn(floatingSurface, 'w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[calc(100vw-1.5rem)] p-1')}
        >
          {nothing
            ? <p className="px-3 py-4 text-center font-sans text-body-sm text-ink-muted">{emptyMessage}</p>
            : (
              <ul id={listId} role="listbox" aria-label={aria['aria-label'] ?? 'Names'} className="max-h-72 overflow-y-auto">
                {matches.map((s, i) => (
                  <li
                    key={s.value}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={s === current}
                    data-selected={s === current ? 'true' : undefined}
                    className={optionRow}
                    // Taken on press, before the box loses focus; keys are the box's own (↑/↓, Enter, Tab), as for every combobox.
                    onMouseDown={e => { e.preventDefault(); choose(s); }}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{s.label}</span>
                      {s.description && <span className="block truncate text-caption text-ink-muted">{s.description}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
