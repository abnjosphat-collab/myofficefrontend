// app/documents/FolderDialogs.tsx — the two folder dialogs: make or rename a folder, and move files or a folder somewhere else.
// A refusal from the server (a name already in use, a loop, too deep) is shown inside the dialog and nothing typed is lost.
'use client';

import { useState } from 'react';
import { Field, FormDialog, Input, Textarea } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import { FolderPicker } from './FolderPicker';
import { descendantIds, pathLabel } from './documentLogic';
import type { DocFolder, FolderNode } from './types';

export type FolderTarget =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'rename'; folder: DocFolder };

/** Make a folder (inside another, or at the top) or rename one. */
export function FolderFormDialog({ target, flat, onOpenChange, onSave }: {
  target: FolderTarget | null; flat: FolderNode[]; onOpenChange: (open: boolean) => void;
  onSave: (t: FolderTarget, name: string, parentId: string | null, description: string) => Promise<void>;
}) {
  const { scope } = useAuth();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const key = target ? (target.mode === 'rename' ? `rename-${target.folder.id}` : `create-${target.parentId ?? 'top'}`) : null;
  useResetOnOpen(dialogKey(!!target, key), () => {
    setTouched(false);
    setName(target?.mode === 'rename' ? target.folder.name : '');
    setDescription(target?.mode === 'rename' ? target.folder.description : '');
    setParentId(target?.mode === 'create' ? target.parentId : null);
  });
  const creating = target?.mode === 'create';
  // A scoped account only ever sees its own subtree, so "top level" is only
  // offered to start the library: the first folder must be named for the scope.
  const rootExists = flat.some(f => f.parentId == null);
  const topLabel = !scope ? 'Top level (no parent folder)'
    : rootExists ? undefined
    : `Top level (name it ${scope} to start your library)`;

  return (
    <FormDialog
      open={!!target} onOpenChange={onOpenChange} size="md"
      title={creating ? 'New folder' : 'Rename folder'}
      description={creating ? (parentId ? `Inside ${pathLabel(flat, parentId)}` : scope && rootExists ? `Inside ${scope} — pick a folder below` : 'At the top level of the library') : target?.mode === 'rename' ? pathLabel(flat, target.folder.id) : undefined}
      submitLabel={creating ? 'Create folder' : 'Save'}
      onSubmit={async () => {
        setTouched(true);
        if (!name.trim() || !target) return false;
        await onSave(target, name.trim(), parentId, description.trim());
      }}
    >
      <div className="flex flex-col gap-4">
        <Field label="Folder name" required error={touched && !name.trim() ? 'Enter a name for the folder.' : undefined}>
          <Input value={name} onChange={e => setName(e.target.value)} autoComplete="off" maxLength={120} />
        </Field>
        {creating && (
          <Field label="Where" description="Pick the folder it goes inside, or none for the top level.">
            <FolderPicker flat={flat} value={parentId} onChange={setParentId} noneLabel={topLabel} label="Parent folder" />
          </Field>
        )}
        <Field label="Description" optional><Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What belongs in this folder" /></Field>
      </div>
    </FormDialog>
  );
}

export type MoveSubject =
  | { kind: 'files'; ids: string[]; names: string[]; currentFolder: string | null }
  | { kind: 'folder'; folder: DocFolder };

/** Choose where files, or a folder with everything in it, should go. */
export function MoveDialog({ subject, flat, onOpenChange, onMove }: {
  subject: MoveSubject | null; flat: FolderNode[]; onOpenChange: (open: boolean) => void; onMove: (s: MoveSubject, folderId: string | null) => Promise<void>;
}) {
  const { scope } = useAuth();
  const [target, setTarget] = useState<string | null>(null);
  const key = subject ? (subject.kind === 'folder' ? `folder-${subject.folder.id}` : `files-${subject.ids.join(',')}`) : null;
  useResetOnOpen(dialogKey(!!subject, key), () => {
    setTarget(subject?.kind === 'folder' ? subject.folder.parentId : subject?.currentFolder ?? null);
  });
  const blocked = subject?.kind === 'folder' ? descendantIds(flat, subject.folder.id) : [];
  const what = subject?.kind === 'folder' ? `“${subject.folder.name}” and everything in it` : subject ? (subject.names.length === 1 ? `“${subject.names[0]}”` : `${subject.names.length} files`) : '';
  const topLabel = subject?.kind === 'folder' ? 'Top level (no parent folder)' : 'Unfiled (not in any folder)';

  return (
    <FormDialog
      open={!!subject} onOpenChange={onOpenChange} size="md" title="Move to a folder" description={`Move ${what}`} submitLabel="Move here"
      onSubmit={async () => { if (subject) await onMove(subject, target); }}
    >
      <Field label="Destination">
        <FolderPicker flat={flat} value={target} onChange={setTarget} noneLabel={scope ? undefined : topLabel} disabledIds={blocked} label="Destination folder" />
      </Field>
    </FormDialog>
  );
}
