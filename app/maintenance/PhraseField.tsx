// app/maintenance/PhraseField.tsx — a multi-line report field that offers to finish the word or phrase being typed (the words an artisan
// types most) as buttons under the field, and the entries this person used most before. Choosing one fills it in.
'use client';

import { Button, Field, Textarea } from '@/components/ui-system';
import { RecentChoices } from '@/components/shared/RecentChoices';
import { suggestCompletions } from './phrases';

export function PhraseField({ label, value, onChange, placeholder, rows = 3, historyKey }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; historyKey: string }) {
  const options = suggestCompletions(value);
  return (
    <div className="flex flex-col gap-1.5">
      <Field label={label} optional><Textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></Field>
      {options.length > 0 && (
        <div role="group" aria-label={`Complete ${label}`} className="flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-caption text-ink-muted">Finish with:</span>
          {options.map(o => <Button key={o.label} size="sm" variant="secondary" onClick={() => onChange(o.next)}>{o.label}</Button>)}
        </div>
      )}
      <RecentChoices historyKey={historyKey} onPick={onChange} />
    </div>
  );
}
