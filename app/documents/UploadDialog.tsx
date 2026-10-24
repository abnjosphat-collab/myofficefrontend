// app/documents/UploadDialog.tsx — choose, drop or paste files of any accepted kind (documents, images, audio, video, drawings, emails),
// pick the folder, add tags, and upload them one by one. A file the server refuses stays in the list with the reason; the files that
// went through leave the list, so a retry never duplicates them. A file already stored elsewhere is reported, not hidden.
'use client';

import { useRef, useState } from 'react';
import { Field, FormDialog, Icon, IconButton, Input, StatusBadge, cn } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import { FolderPicker } from './FolderPicker';
import { TagField } from './TagField';
import { UPLOAD_ACCEPT, MAX_UPLOAD_BYTES, formatSize, pathLabel, typeMeta, fileTypeOf, uploadProblem } from './documentLogic';
import type { FolderNode } from './types';

interface Pending { id: number; file: File; name: string; problem?: string; note?: string; uploaded?: boolean }
let nextId = 1;
const toPending = (file: File): Pending => ({ id: nextId++, file, name: file.name, problem: uploadProblem(file) ?? undefined });

export function UploadDialog({ open, flat, defaultFolderId, initialFiles, tagSuggestions, onOpenChange, onUpload, onUploaded }: {
  open: boolean; flat: FolderNode[]; defaultFolderId: string | null; initialFiles: File[]; tagSuggestions: readonly string[];
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, name: string, folderId: string | null, tags: string[]) => Promise<{ alsoIn: { name: string; folder_path: string }[] }>;
  onUploaded: () => void;
}) {
  const { scope } = useAuth();
  const [files, setFiles] = useState<Pending[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useResetOnOpen(dialogKey(open, defaultFolderId ?? 'unfiled'), () => {
    setFiles(initialFiles.map(toPending)); setFolderId(defaultFolderId); setTags([]); setDone(0);
  });

  const add = (list: FileList | File[] | null) => {
    const added = Array.from(list ?? []).map(toPending);
    if (added.length) setFiles(prev => [...prev, ...added]);
  };
  const patch = (id: number, p: Partial<Pending>) => setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...p } : f)));

  const submit = async () => {
    const todo = files.filter(f => !f.problem && !f.uploaded);
    if (files.length === 0) throw new Error('Choose at least one file.');
    if (todo.length === 0 && files.every(f => f.uploaded)) return undefined; // everything is stored; the notes were read
    if (todo.length === 0) throw new Error('None of the chosen files can be uploaded. Remove them or choose others.');
    setBusy(true); setDone(0);
    let uploaded = 0; let failed = 0; let noted = 0;
    for (const f of todo) {
      try {
        const saved = await onUpload(f.file, f.name.trim() || f.file.name, folderId, tags);
        uploaded += 1;
        if (saved.alsoIn.length) {
          noted += 1; // stored, but the same file is also elsewhere: it stays in the list with that said
          patch(f.id, { uploaded: true, note: `Uploaded. The same file is also stored in ${saved.alsoIn.map(a => a.folder_path || 'Unfiled').join('; ')}.` });
        } else setFiles(prev => prev.filter(p => p.id !== f.id));
      } catch (e) {
        failed += 1;
        patch(f.id, { problem: e instanceof Error ? e.message : 'Upload failed.' });
      }
      setDone(d => d + 1);
    }
    setBusy(false);
    if (uploaded) onUploaded();
    if (failed) throw new Error(`${uploaded} of ${todo.length} uploaded. ${failed} could not be uploaded, see the reasons below.`);
    return noted > 0 ? false : undefined;
  };

  return (
    <FormDialog
      open={open} onOpenChange={o => { if (!busy) onOpenChange(o); }} size="lg" title="Upload files" description={scope && !folderId ? `Into ${scope} — pick a folder below` : `Into ${pathLabel(flat, folderId)}`}
      submitLabel={files.length > 1 ? `Upload ${files.length} files` : 'Upload'} onSubmit={submit}
      dirty={files.some(f => !f.uploaded) || folderId !== defaultFolderId || tags.length > 0 || files.some(f => f.name !== f.file.name)}
    >
      <div className="flex flex-col gap-4">
        <button
          type="button" aria-label="Choose files to upload" onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
          className={cn('focus-ring flex flex-col items-center gap-1 rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors', over ? 'border-action bg-action-soft' : 'border-line-control bg-surface-subtle hover:border-action')}
        >
          <Icon name="upload" size="xl" className="text-ink-muted" />
          <span className="font-sans text-label font-medium text-ink">Choose files, drop them here, or paste a picture</span>
          <span className="font-sans text-caption text-ink-muted">Documents, spreadsheets, PDFs, images, audio, video, drawings and emails. Up to {formatSize(MAX_UPLOAD_BYTES)} each.</span>
        </button>
        <input ref={input} type="file" multiple hidden accept={UPLOAD_ACCEPT} aria-label="Files to upload" onChange={e => { add(e.target.files); e.target.value = ''; }} />

        {files.length > 0 && (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1" aria-label="Files to upload">
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
                  {f.note && <p role="status" className="font-sans text-caption text-ink-muted">{f.note}</p>}
                  <Field label="Name" optional><Input value={f.name} onChange={e => patch(f.id, { name: e.target.value })} placeholder="Leave blank to use the file name" /></Field>
                </li>
              );
            })}
          </ul>
        )}

        <Field label="Folder" description="Pick where they go. You can move them later.">
          <FolderPicker flat={flat} value={folderId} onChange={setFolderId} noneLabel={scope ? undefined : 'Unfiled (decide later)'} label="Upload folder" />
        </Field>
        <Field label="Tags" optional description="Added to every file in this upload."><TagField value={tags} onChange={setTags} suggestions={tagSuggestions} /></Field>
        {busy && <p role="status" className="font-sans text-body-sm text-ink-muted">Uploading, {done} of {files.length + done} done</p>}
      </div>
    </FormDialog>
  );
}

