// app/tools/ToolsEmployeePicker.tsx — choosing who receives a tool. The people eligible for the chosen equipment are always listed
// under the search box, each with their job title and number, so the choice can be made by looking; typing narrows the list, Enter or
// Tab takes the top match, the arrow keys move through it, and a click picks one. The list is a list, not a dropdown: nothing is hidden
// until you type, and with a few dozen people it scrolls.
'use client';

import { useId, useState } from 'react';
import { ToolsIcon as Icon } from './ToolsIcon';
import s from './tools.module.css';

export type PickerChoice = { label: string; detail?: string };

const initials = (label: string) => label.split(' · ')[0].split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('');

export function EmployeePicker({ label, choices, value, onChange, onSelect, hint, emptyMessage }: {
  label: string; choices: PickerChoice[]; value: string; onChange: (value: string) => void; onSelect?: (value: string) => void; hint?: string; emptyMessage: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [active, setActive] = useState(0);
  const selected = choices.some(choice => choice.label === value);
  // Once someone is picked the whole list stays in view with that person ticked, instead of narrowing to one row.
  const query = selected ? '' : value.trim().toLowerCase();
  const matches = choices.filter(choice => `${choice.label} ${choice.detail || ''}`.toLowerCase().includes(query));
  const current = Math.min(active, Math.max(0, matches.length - 1));
  const choose = (choice: PickerChoice) => { onChange(choice.label); onSelect?.(choice.label); setActive(0); };
  return <div className={`${s.field} ${s.pickerField}`}>
    <div className={s.fieldHeading}><label htmlFor={id}>{label}</label>{choices.length > 0 && <span className={s.pickerCount}>{choices.length} eligible</span>}</div>
    <input
      id={id} role="combobox" aria-label={label} aria-expanded aria-controls={listId} aria-autocomplete="list" aria-activedescendant={matches[current] ? `${id}-option-${current}` : undefined}
      autoComplete="off" spellCheck={false} value={value} placeholder="Search by name, number or job title"
      onChange={event => { onChange(event.target.value); setActive(0); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(Math.min(matches.length - 1, current + 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(0, current - 1)); }
        else if (event.key === 'Enter' && matches[current]) { event.preventDefault(); choose(matches[current]); }
        else if (event.key === 'Tab' && !selected && value.trim() && matches[current]) choose(matches[current]);
      }}
    />
    {/* WAI-ARIA combobox with a listbox popup: the options are not tab stops, the search box above drives them from the keyboard (arrows, Enter, Tab). */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
    <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className={s.pickerList}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-to-interactive-role */}
      {matches.map((choice, index) => <li key={choice.label} id={`${id}-option-${index}`} role="option" aria-selected={choice.label === value} data-active={index === current} className={s.pickerOption} onMouseDown={event => event.preventDefault()} onClick={() => choose(choice)}>
        <span className={s.pickerAvatar} aria-hidden="true">{initials(choice.label)}</span>
        <span className={s.pickerText}><strong>{choice.label.split(' · ')[0]}</strong><small>{[choice.label.split(' · ')[1], choice.detail].filter(Boolean).join(' · ')}</small></span>
        {choice.label === value && <Icon name="check" size={16} />}
      </li>)}
      {!choices.length && <li role="presentation" className={s.pickerEmpty}>{emptyMessage}</li>}
      {choices.length > 0 && !matches.length && <li role="presentation" className={s.pickerEmpty}>No eligible person matches “{value.trim()}”.</li>}
    </ul>
    {hint && <p className={s.formHint}>{hint}</p>}
  </div>;
}
