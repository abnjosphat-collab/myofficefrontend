// components/shared/TagField.tsx — a list of short text items (qualifications, awards, other positions): type one and press Enter or
// Add; each shows as a removable chip. For a field that holds several short values rather than one.
'use client';

import { useState } from 'react';
import { Button, Field, Icon, Input } from '@/components/ui-system';

export function TagField({ label, value, onChange, placeholder, description }: { label: string; value: string[]; onChange: (items: string[]) => void; placeholder?: string; description?: string }) {
  const [text, setText] = useState('');
  const add = () => { const t = text.trim(); if (t && !value.includes(t)) onChange([...value, t]); setText(''); };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Field label={label} optional description={description} className="flex-1">
          <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} />
        </Field>
        <Button icon="plus" disabled={!text.trim()} onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {value.map((item, i) => (
            <li key={`${item}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-line-subtle bg-surface-subtle py-0.5 pl-2 pr-1 font-sans text-caption text-ink">
              <span className="truncate">{item}</span>
              <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((_, n) => n !== i))} className="focus-ring inline-flex size-5 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted hover:text-ink"><Icon name="close" size="xs" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
