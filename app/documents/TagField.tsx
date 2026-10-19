// app/documents/TagField.tsx — type tags and press Enter or a comma to add each one; click a suggestion to reuse a tag that is
// already in the library (so "safety" is never also "Safety" and "safe ty"). Tags are saved lower case, one space between words.
'use client';

import { useState } from 'react';
import { Input, Tag } from '@/components/ui-system';

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const cleanTag = (raw: string): string => raw.split(/\s+/).filter(Boolean).join(' ').toLowerCase().replace(/^,+|,+$/g, '').slice(0, MAX_TAG_LENGTH);

export function TagField({ value, onChange, suggestions = [], label = 'Tags' }: {
  value: readonly string[]; onChange: (tags: string[]) => void; suggestions?: readonly string[]; label?: string;
}) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map(cleanTag).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts])].slice(0, MAX_TAGS));
    setText('');
  };
  const offered = suggestions.filter(s => !value.includes(s) && s.includes(cleanTag(text))).slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} added`}>
          {value.map(t => <li key={t}><Tag onRemove={() => onChange(value.filter(v => v !== t))}>{t}</Tag></li>)}
        </ul>
      )}
      <Input
        aria-label={label} value={text} placeholder={value.length >= MAX_TAGS ? `At most ${MAX_TAGS} tags` : 'Type a tag, then Enter'} disabled={value.length >= MAX_TAGS}
        onChange={e => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }}
        onBlur={() => add(text)}
      />
      {offered.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tags already in use">
          <span className="font-sans text-caption text-ink-muted">In use:</span>
          {offered.map(s => (
            <button key={s} type="button" onClick={() => add(s)} className="focus-ring touch-target rounded-full border border-line-control bg-surface px-2 py-0.5 font-sans text-caption text-ink-muted hover:text-ink">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
