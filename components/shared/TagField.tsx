// components/shared/TagField.tsx — a list of short text items (qualifications, awards, other positions): type one and press Enter or
// Add; each shows as a removable chip. For a field that holds several short values rather than one.
'use client';

import { useState } from 'react';
import { Button, Field, Input, Tag } from '@/components/ui-system';

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
            <li key={`${item}-${i}`}><Tag onRemove={() => onChange(value.filter((_, n) => n !== i))}>{item}</Tag></li>
          ))}
        </ul>
      )}
    </div>
  );
}
