// app/documents/FileDialogs.tsx — the two small file forms: edit one file's name, comment and tags, and add or remove tags on many
// files at once. A refusal from the server (a name already in the folder, a stale copy) is shown inside the dialog.
'use client';

import { useState } from 'react';
import { Field, FormDialog, Input, Segmented, Textarea } from '@/components/ui-system';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import { TagField } from './TagField';
import type { DocumentFile } from './types';

export function EditFileDialog({ doc, suggestions, onOpenChange, onSave }: {
  doc: DocumentFile | null; suggestions: readonly string[]; onOpenChange: (open: boolean) => void;
  onSave: (doc: DocumentFile, patch: { name: string; description: string; tags: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(!!doc, doc?.id), () => { setTouched(false); setName(doc?.name ?? ''); setComment(doc?.description ?? ''); setTags(doc?.tags ?? []); });

  return (
    <FormDialog
      open={!!doc} onOpenChange={onOpenChange} size="md" title="Edit details" description={doc?.originalName} submitLabel="Save"
      onSubmit={async () => { setTouched(true); if (!doc || !name.trim()) return false; await onSave(doc, { name: name.trim(), description: comment.trim(), tags }); }}
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required error={touched && !name.trim() ? 'Enter a name for the file.' : undefined}><Input value={name} onChange={e => setName(e.target.value)} autoComplete="off" /></Field>
        <Field label="Tags" optional description="Words that help find it later: a site, a project, a person."><TagField value={tags} onChange={setTags} suggestions={suggestions} /></Field>
        <Field label="Comment" optional><Textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Notes about this document" /></Field>
      </div>
    </FormDialog>
  );
}

export type TagsSubject = { ids: string[]; count: number; present: string[] };

export function BulkTagsDialog({ subject, suggestions, onOpenChange, onApply }: {
  subject: TagsSubject | null; suggestions: readonly string[]; onOpenChange: (open: boolean) => void; onApply: (s: TagsSubject, mode: 'tag_add' | 'tag_remove', tags: string[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<'tag_add' | 'tag_remove'>('tag_add');
  const [tags, setTags] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(!!subject, subject?.ids.join(',')), () => { setMode('tag_add'); setTags([]); setTouched(false); });

  return (
    <FormDialog
      open={!!subject} onOpenChange={onOpenChange} size="sm" title="Tags" description={subject ? `${subject.count} ${subject.count === 1 ? 'file' : 'files'}` : undefined} submitLabel={mode === 'tag_add' ? 'Add tags' : 'Remove tags'}
      onSubmit={async () => { setTouched(true); if (!subject || tags.length === 0) return false; await onApply(subject, mode, tags); }}
    >
      <div className="flex flex-col gap-4">
        <Segmented label="What to do" value={mode} onValueChange={m => { setMode(m); setTags([]); }} options={[{ value: 'tag_add', label: 'Add tags' }, { value: 'tag_remove', label: 'Remove tags' }]} />
        <Field label="Tags" error={touched && tags.length === 0 ? 'Choose at least one tag.' : undefined}>
          <TagField value={tags} onChange={setTags} suggestions={mode === 'tag_remove' ? subject?.present ?? [] : suggestions} />
        </Field>
      </div>
    </FormDialog>
  );
}
