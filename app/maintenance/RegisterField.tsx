// app/maintenance/RegisterField.tsx — one picker for every register a maintenance form reads (people, tools). Type to search, ↑ ↓ to move,
// Tab or Enter fills the highlighted match, and anything else typed is kept as free text. A line under the field says whether the value
// came from the register, and anyone who cannot be chosen (on leave) is greyed with the reason and dates. The value is the text, so a
// contractor or a visitor who is not on the register can still be entered.
'use client';

// ARIA combobox pattern: the keyboard is handled on the input (aria-activedescendant); the options are clicked, never tabbed to.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-to-interactive-role */

import { useId, useMemo, useState } from 'react';
import { cn, Icon, Input } from '@/components/ui-system';
import { findMatch, matchOptions, tabTarget, type RegisterOption } from './registers';

export interface RegisterFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when a register entry is chosen (clicked, Enter or Tab), with that entry, so the caller can keep its key. */
  onPick?: (option: RegisterOption) => void;
  options: RegisterOption[];
  /** The register in words, for the line under the field: "employees register". */
  registerName: string;
  placeholder?: string;
  disabled?: boolean;
  /** The register could not be read (the message), so the field says so instead of looking as if nothing matched. */
  loadError?: string | null;
  loading?: boolean;
  /** Said under the field when something that should be checked could not be (for example, leave). */
  note?: string | null;
  id?: string;
  'aria-label'?: string;
}

export function RegisterField({ value, onChange, onPick, options, registerName, placeholder, disabled, loadError, loading, note, id, ...aria }: RegisterFieldProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const list = useId();
  const matches = useMemo(() => matchOptions(options, value), [options, value]);
  const exact = findMatch(options, value);
  const showList = open && !disabled && matches.length > 0 && !(exact && matches.length === 1);
  const active = Math.min(highlight, Math.max(matches.length - 1, 0));

  const pick = (option: RegisterOption) => { if (option.blocked) return; onChange(option.value); onPick?.(option); setOpen(false); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { if (showList) { e.preventDefault(); e.stopPropagation(); setOpen(false); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!matches.length) return;
      e.preventDefault(); setOpen(true);
      setHighlight(h => (Math.min(h, matches.length - 1) + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
      return;
    }
    if (e.key === 'Enter' && showList) {
      const target = matches[active];
      if (target && !target.blocked) { e.preventDefault(); pick(target); }
      return;
    }
    // Tab fills the highlighted match and stays put, so the person sees what was filled; a second Tab moves on.
    if (e.key === 'Tab' && !e.shiftKey && value.trim() && !exact) {
      const target = tabTarget(matches, active);
      if (target) { e.preventDefault(); pick(target); }
    }
  };

  const marker = (() => {
    if (loadError) return { tone: 'danger' as const, text: `The ${registerName} could not be read, so typed text is kept as typed.` };
    if (loading) return { tone: 'muted' as const, text: `Loading the ${registerName}…` };
    if (exact?.blocked) return { tone: 'danger' as const, text: `${exact.blocked}. Choose someone else.` };
    if (exact) return { tone: 'ok' as const, text: `From the ${registerName}.${exact.warning ? ` ${exact.warning}.` : ''}` };
    if (value.trim() && !showList) return { tone: 'muted' as const, text: `Not on the ${registerName}. Kept as typed.` };
    return null;
  })();

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        {...(id ? { id } : {})} {...(aria['aria-label'] ? { 'aria-label': aria['aria-label'] } : {})}
        role="combobox" aria-expanded={showList} aria-controls={showList ? list : undefined} aria-autocomplete="list"
        aria-activedescendant={showList ? `${list}-${active}` : undefined}
        autoComplete="off" disabled={disabled} placeholder={placeholder} value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={list} role="listbox" className="max-h-56 overflow-auto rounded-card border border-line bg-surface p-1 shadow-popover">
          {matches.map((o, i) => (
            <li
              key={`${o.key ?? ''}|${o.value}`} id={`${list}-${i}`} role="option" aria-selected={i === active} aria-disabled={o.blocked ? true : undefined}
              onMouseDown={e => e.preventDefault()} onClick={() => pick(o)} onMouseEnter={() => setHighlight(i)}
              className={cn('flex min-h-9 cursor-pointer flex-col justify-center rounded-control px-2.5 py-1.5 font-sans pointer-coarse:min-h-11', i === active && 'bg-surface-muted', o.blocked && 'cursor-not-allowed')}
            >
              <span className={cn('truncate text-body', o.blocked ? 'text-ink-muted line-through decoration-ink-subtle' : 'text-ink')}>{o.value}</span>
              {o.blocked && <span className="text-caption text-danger">{o.blocked}</span>}
              {!o.blocked && o.description && <span className="truncate text-caption text-ink-muted">{o.description}</span>}
              {!o.blocked && o.warning && <span className="text-caption text-warning">{o.warning}</span>}
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className={cn('flex items-start gap-1 font-sans text-caption', marker?.tone === 'danger' ? 'text-danger' : marker?.tone === 'ok' ? 'text-ink-muted' : 'text-ink-muted', !marker && !note && 'sr-only')}>
        {marker?.tone === 'ok' && <Icon name="check" size="xs" className="mt-0.5 shrink-0" />}
        <span>{marker?.text}{note ? `${marker ? ' ' : ''}${note}` : ''}</span>
      </p>
    </div>
  );
}
