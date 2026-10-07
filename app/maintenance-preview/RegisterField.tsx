// app/maintenance-preview/RegisterField.tsx — the one picker every register field uses in the preview: type to search, arrows to move,
// Tab or Enter to take the highlighted match, free text always allowed (last row), and a line saying whether the value is in the register.
// Rows can carry a note (a warning that still allows the pick) or a reason they cannot be picked (leave).
'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Field, Icon, Input, cn } from '@/components/ui-system';

export interface RegisterItem { key: string; label: string; meta?: string; note?: string; blockedReason?: string }

export function RegisterField({ label, register, items, value, onChange, placeholder, required, hint }: {
  label: string; register: string; items: RegisterItem[]; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const query = value.trim().toLowerCase();
  const matches = useMemo(() => items.filter(i => !query || i.label.toLowerCase().includes(query) || (i.meta ?? '').toLowerCase().includes(query)).slice(0, 6), [items, query]);
  const exact = items.find(i => i.label.toLowerCase() === query);
  const rows = [...matches, ...(query && !exact ? [{ key: '__free', label: value.trim(), meta: 'Use as typed' } as RegisterItem] : [])];
  // Escape closes the suggestion list first. A dialog around the field listens on the document, so intercept one level earlier (window, capture)
  // while the list is open; the next Escape then closes the dialog as usual.
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && document.activeElement === input.current) { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [open]);
  const pick = (item: RegisterItem | undefined) => { if (!item || item.blockedReason) return; onChange(item.label); setOpen(false); };
  const firstPickable = () => rows.findIndex(r => !r.blockedReason);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && rows[active]) { e.preventDefault(); pick(rows[active]); }
    else if (e.key === 'Tab' && open && query && rows.length) {
      const target = rows[active]?.blockedReason ? rows[firstPickable()] : rows[active];
      if (target && target.key !== '__free') pick(target);
    }
  };

  const state = !query ? null : exact ? 'matched' : 'free';
  return (
    <Field label={label} required={required} description={hint}>
      <div className="relative">
        <Input
          ref={input} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="off"
          value={value} placeholder={placeholder} onChange={e => { onChange(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown}
        />
        {open && rows.length > 0 && (
          <ul id={`${id}-list`} role="listbox" aria-label={`${label} matches`} className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-control border border-line bg-surface py-1 shadow-md">
            {rows.map((row, i) => (
              <li key={row.key} role="option" aria-selected={i === active} aria-disabled={!!row.blockedReason}
                onMouseDown={e => { e.preventDefault(); pick(row); }} onMouseEnter={() => setActive(i)}
                className={cn('flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1.5 font-sans text-body-sm', i === active && !row.blockedReason && 'bg-soft', row.blockedReason && 'cursor-not-allowed text-ink-muted')}>
                <span className="min-w-0"><span className={cn('text-ink', row.blockedReason && 'text-ink-muted')}>{row.label}</span>{row.meta && <span className="ml-2 text-caption text-ink-muted">{row.meta}</span>}</span>
                {(row.blockedReason || row.note) && <span className={cn('shrink-0 text-caption', row.blockedReason ? 'text-ink-muted' : 'text-warning')}>{row.blockedReason ?? row.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {state && (
        <p className="mt-1 flex items-center gap-1 font-sans text-caption text-ink-muted">
          <Icon name={state === 'matched' ? 'check' : 'info'} size="xs" />{state === 'matched' ? `In the ${register} register` : `Typed, not in the ${register} register`}
        </p>
      )}
    </Field>
  );
}

/** A register of people: those on leave are listed but cannot be picked, with the reason and dates. */
export const personItems = (people: { name: string; trade: string; leave?: { from: string; to: string; reason: string } }[], fmt: (s: string) => string): RegisterItem[] =>
  people.map(p => ({ key: p.name, label: p.name, meta: p.trade, blockedReason: p.leave ? `${p.leave.reason}, ${fmt(p.leave.from)} to ${fmt(p.leave.to)}` : undefined }));
