// app/documents/NameDialog.tsx — one small form for naming things: a new folder, a renamed folder, or a file's name and comment.
// A refused save (a name already taken, a failed request) is shown inside the dialog and keeps what was typed.
'use client';

import { useState } from 'react';
import { Field, FormDialog, Input, Textarea } from '@/components/ui-system';

export interface NameTarget { key: string; title: string; description?: string; label: string; name: string; comment?: string; submitLabel: string }

export function NameDialog({ target, onOpenChange, onSave }: {
  target: NameTarget | null; onOpenChange: (open: boolean) => void; onSave: (name: string, comment: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = target?.key ?? null;
  if (key !== loadedFor) { setLoadedFor(key); if (target) { setName(target.name); setComment(target.comment ?? ''); setTouched(false); } }

  const submit = async () => {
    setTouched(true);
    if (!name.trim()) return false;
    await onSave(name.trim(), comment.trim());
  };
  return (
    <FormDialog open={!!target} onOpenChange={onOpenChange} size="sm" title={target?.title ?? ''} description={target?.description} submitLabel={target?.submitLabel ?? 'Save'} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label={target?.label ?? 'Name'} required error={touched && !name.trim() ? 'Enter a name.' : undefined}><Input value={name} onChange={e => setName(e.target.value)} autoComplete="off" /></Field>
        {target?.comment !== undefined && <Field label="Comment" optional><Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Notes about this document" /></Field>}
      </div>
    </FormDialog>
  );
}
