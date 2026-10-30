// app/tools/ToolsEmployeePicker.tsx — choosing who receives a tool. The people eligible for the chosen tool are always listed
// under the search box, each with their job title and number, so the choice can be made by looking; typing narrows the list, Enter or
// Tab takes the top match, the arrow keys move through it, and a click picks one. The list is a list, not a dropdown: nothing is hidden
// until you type, and with a few dozen people it scrolls.
'use client';

import { useEffect, useId, useState } from 'react';
import { Icon, controlClasses } from '@/components/ui-system';

export type PickerChoice = { label: string; detail?: string };


export function EmployeePicker({ label, required, choices, value, onChange, onSelect, hint, emptyMessage, error }: {
  label: string; required?: boolean; choices: PickerChoice[]; value: string; onChange: (value: string) => void; onSelect?: (value: string) => void; hint?: string; emptyMessage: string; error?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [active, setActive] = useState(0);
  const selected = choices.some(choice => choice.label === value);
  // Once someone is picked the whole list stays in view with that person ticked, instead of narrowing to one row.
  const query = selected ? '' : value.trim().toLowerCase();
  const matches = choices.filter(choice => `${choice.label} ${choice.detail || ''}`.toLowerCase().includes(query));
  const current = Math.min(active, Math.max(0, matches.length - 1));
  // When someone is already chosen (for example by the Issue button beside their name), bring their row into view.
  useEffect(() => { if (!selected) return; const index = choices.findIndex(choice => choice.label === value); document.getElementById(`${id}-option-${index}`)?.scrollIntoView?.({ block: 'nearest' }); }, [selected, value, choices, id]);
  const choose = (choice: PickerChoice) => { onChange(choice.label); onSelect?.(choice.label); setActive(0); };
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-sans text-label font-medium text-ink">{label}{required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}</label>
        {choices.length > 0 && <span className="font-sans text-caption text-ink-muted">{choices.length} eligible</span>}
      </div>
      <input
        id={id} role="combobox" aria-label={label} aria-expanded aria-controls={listId} aria-autocomplete="list" aria-activedescendant={matches[current] ? `${id}-option-${current}` : undefined} aria-invalid={error ? true : undefined} aria-required={required || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        autoComplete="off" spellCheck={false} value={value} placeholder="Search by name, number or job title"
        className={controlClasses + ' h-10'}
        onChange={event => { onChange(event.target.value); setActive(0); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(Math.min(matches.length - 1, current + 1)); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(0, current - 1)); }
          else if (event.key === 'Enter' && matches[current]) { event.preventDefault(); choose(matches[current]); }
          else if (event.key === 'Tab' && !selected && value.trim() && matches[current]) choose(matches[current]);
        }}
      />
      {/* WAI-ARIA combobox with a listbox popup: the options are not tab stops, the search box above drives them from the keyboard (arrows, Enter, Tab). */}
      <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="max-h-56 overflow-y-auto rounded-control border border-line-subtle bg-surface-raised">
        {matches.map((choice, index) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li key={choice.label} id={`${id}-option-${index}`} role="option" aria-selected={choice.label === value} data-active={index === current}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-subtle ${index === current ? 'bg-surface-subtle' : ''} ${choice.label === value ? 'bg-action-soft' : ''}`}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(choice)}>
            <span aria-hidden="true" className="text-ink-muted"><Icon name="user" size="sm" /></span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate font-sans text-body-sm font-medium text-ink">{choice.label.split(' · ')[0]}</strong>
              <small className="block truncate font-sans text-caption text-ink-muted">{[choice.label.split(' · ')[1], choice.detail].filter(Boolean).join(' · ')}</small>
            </span>
            {choice.label === value && <Icon name="success" size="sm" />}
          </li>
        ))}
        {!choices.length && <li role="presentation" className="px-3 py-3 font-sans text-body-sm text-ink-muted">{emptyMessage}</li>}
        {choices.length > 0 && !matches.length && <li role="presentation" className="px-3 py-3 font-sans text-body-sm text-ink-muted">No eligible person matches “{value.trim()}”.</li>}
      </ul>
      {hint && <p id={`${id}-hint`} className="font-sans text-caption text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 font-sans text-caption font-medium text-danger">
          <Icon name="warning" size="xs" weight="emphasis" className="mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
