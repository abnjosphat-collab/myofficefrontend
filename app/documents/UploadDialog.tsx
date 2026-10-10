// app/documents/UploadDialog.tsx — choose or drop files, give each a display name and a comment, and upload them one by one into
// the open folder. A file the server refuses stays in the list with the reason so it can be fixed or removed; the files that
// did upload are taken out of the list so a retry never duplicates them.
'use client';

import { useRef, useState } from 'react';
import { Field, FormDialog, IconButton, Icon, Input, StatusBadge, Textarea, cn } from '@/components/ui-system';
import { fileTypeOf, formatSize, typeMeta } from './documentLogic';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

interface Pending { id: number; file: File; name: string; comment: string; problem?: string }
const MAX_BYTES = 100 * 1024 * 1024;
let nextId = 1;

export function UploadDialog({ open, where, onOpenChange, onUpload, onUploaded }: {
  open: boolean; where: string; onOpenChange: (open: boolean) => void;
  onUpload: (file: File, name: string, comment: string) => Promise<void>; onUploaded: () => void;
}) {
  const [files, setFiles] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useResetOnOpen(dialogKey(open, undefined), () => { setFiles([]); setDone(0); });

  const add = (list: FileList | null) => {
    const added = Array.from(list ?? []).map<Pending>(file => ({ id: nextId++, file, name: file.name, comment: '', problem: file.size > MAX_BYTES ? 'Larger than the 100 MB limit.' : undefined }));
    if (added.length) setFiles(prev => [...prev, ...added]);
  };
  const patch = (id: number, p: Partial<Pending>) => setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...p } : f)));

  const submit = async () => {
    const todo = files.filter(f => !f.problem);
    if (files.length === 0) throw new Error('Choose at least one file.');
    if (todo.length === 0) throw new Error('None of the chosen files can be uploaded. Remove them or choose others.');
    setBusy(true); setDone(0);
    let uploaded = 0;
    const failed: Pending[] = [];
    for (const f of todo) {
      try { await onUpload(f.file, f.name.trim() || f.file.name, f.comment.trim()); uploaded += 1; setFiles(prev => prev.filter(p => p.id !== f.id)); }
      catch (e) { failed.push({ ...f, problem: e instanceof Error ? e.message : 'Upload failed.' }); patch(f.id, { problem: e instanceof Error ? e.message : 'Upload failed.' }); }
      setDone(d => d + 1);
    }
    setBusy(false);
    if (uploaded) onUploaded();
    if (failed.length) throw new Error(`${uploaded} of ${todo.length} uploaded. ${failed.length} could not be uploaded, see the reasons below.`);
    return undefined;
  };

  return (
    <FormDialog
      open={open} onOpenChange={o => { if (!busy) onOpenChange(o); }} size="lg" title="Upload files" description={`Into ${where}`}
      submitLabel={files.length > 1 ? `Upload ${files.length} files` : 'Upload'} onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <button
          type="button" aria-label="Choose files to upload" onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
          className={cn('focus-ring flex flex-col items-center gap-1 rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors', over ? 'border-action bg-action-soft' : 'border-line-control bg-surface-subtle hover:border-action')}
        >
          <Icon name="upload" size="xl" className="text-ink-muted" />
          <span className="font-sans text-label font-medium text-ink">Choose files or drop them here</span>
          <span className="font-sans text-caption text-ink-muted">Up to 100 MB each</span>
        </button>
        <input ref={input} type="file" multiple hidden aria-label="Files to upload" onChange={e => { add(e.target.files); e.target.value = ''; }} />

        {files.length > 0 && (
          <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1" aria-label="Files to upload">
            {files.map(f => {
              const m = typeMeta(fileTypeOf(f.file.name));
              return (
                <li key={f.id} className={cn('flex flex-col gap-2 rounded-control border bg-surface-subtle p-3', f.problem ? 'border-danger-line' : 'border-line')}>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={m.tone}>{m.label}</StatusBadge>
                    <span className="min-w-0 flex-1 truncate font-sans text-caption text-ink-muted">{f.file.name}, {formatSize(f.file.size)}</span>
                    <IconButton icon="close" size="sm" variant="ghost" label={`Remove ${f.file.name}`} disabled={busy} onClick={() => setFiles(prev => prev.filter(p => p.id !== f.id))} />
                  </div>
                  {f.problem && <p role="alert" className="font-sans text-caption text-danger">{f.problem}</p>}
                  <Field label="Display name" optional><Input value={f.name} onChange={e => patch(f.id, { name: e.target.value })} placeholder="Leave blank to use the file name" /></Field>
                  <Field label="Comment" optional><Textarea rows={2} value={f.comment} onChange={e => patch(f.id, { comment: e.target.value })} placeholder="Notes about this document" /></Field>
                </li>
              );
            })}
          </ul>
        )}
        {busy && <p role="status" className="font-sans text-body-sm text-ink-muted">Uploading, {done} of {files.length + done} done</p>}
      </div>
    </FormDialog>
  );
}
