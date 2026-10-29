// components/ui-system/patterns/OptionChecklist.tsx — tick values from a
// searchable list: the generic core shared by PeopleChecklist (inline panel)
// and MultiSelectFilter (in a popover). Search, counts, select-all-filtered,
// removable chips and the checkbox list live here once.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox } from '../primitives/Checkbox';
import { SearchField } from '../primitives/SearchField';
import { Tag } from '../primitives/Badge';
import { MotionList, MotionListItem } from '../motion/Presence';
import { NumberTransition } from '../motion/NumberTransition';
import type { ReactNode } from 'react';

export interface ChecklistOption {
  value: string;
  label: string;
  description?: string;
}

export function OptionChecklist({ label, options, value, onChange, searchPlaceholder, searchAside, emptyText, pickedWord = 'picked', noneText = 'Nobody picked yet.', showChips = true, chipsLabel, labelOf, search = true }: {
  /** What is being chosen ("Employees", "PPE types"); seeds the accessible names. */
  label: string;
  /** Already scoped by the caller (a section filter, a mode); search narrows further. */
  options: ChecklistOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  /** Rendered beside the search box (a section Select, a mode switch). */
  searchAside?: ReactNode;
  /** Shown when search matches nothing ("No employee matches."). */
  emptyText: string;
  /** Count-line wording: "1 picked." / "Nobody picked yet." */
  pickedWord?: string;
  noneText?: string;
  showChips?: boolean;
  chipsLabel?: string;
  /** Chip text for a value (defaults to its option label, else the raw value). Needed when a picked value is outside `options`. */
  labelOf?: (value: string) => string;
  /** Hide the search box (for short lists where it is noise). Shown by default. */
  search?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return options;
    return options.filter(o => o.label.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);
  const chosen = useMemo(() => new Set(value), [value]);
  const textOf = (v: string) => labelOf?.(v) ?? options.find(o => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(chosen.has(v) ? value.filter(x => x !== v) : [...value, v]);
  const unchosen = filtered.filter(o => !chosen.has(o.value));
  return (
    <div className="flex flex-col gap-2">
      {(search || searchAside) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {search && (
            <div className="min-w-0 flex-1">
              <SearchField label={`Search ${label}`} value={query} onValueChange={setQuery} placeholder={searchPlaceholder || 'Search'} />
            </div>
          )}
          {searchAside}
        </div>
      )}
      <p className="font-sans text-caption text-ink-muted" aria-live="polite">
        {value.length > 0 && (
          <span className="sr-only">
            {`${value.length} ${pickedWord}.`} {filtered.length} shown.
            {unchosen.length > 0 ? ` Select all ${unchosen.length}.` : ''}
          </span>
)}
        {/* When empty the line below is already a single text node, so no separate announcement is needed. */}
        <span aria-hidden="true">
          {value.length === 0 ? noneText : (<><NumberTransition value={value.length} /> {pickedWord}. </>)}
          <NumberTransition value={filtered.length} /> shown.
        </span>
        {unchosen.length > 0 && (
          <> <button type="button" className="font-medium text-action underline" onClick={() => onChange([...value, ...unchosen.map(o => o.value)])}>Select all {unchosen.length}</button></>
        )}
      </p>
      {showChips && value.length > 0 && (
        <MotionList as="ul" className="flex flex-wrap gap-1.5" aria-label={chipsLabel ?? `${label}, picked`}>
          {value.map(v => (
            <MotionListItem as="li" key={v}><Tag onRemove={() => onChange(value.filter(x => x !== v))}>{textOf(v)}</Tag></MotionListItem>
          ))}
        </MotionList>
      )}
      {filtered.length === 0 ? (
        <p className="font-sans text-body-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label={`${label}, choices`}>
          {filtered.map(o => (
            <li key={o.value}>
              <Checkbox
                label={o.label}
                description={o.description}
                checked={chosen.has(o.value)}
                onChange={() => toggle(o.value)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
