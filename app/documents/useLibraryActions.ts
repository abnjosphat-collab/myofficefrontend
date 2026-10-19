// app/documents/useLibraryActions.ts — everything a person can do to files and folders, with its confirmation, its message, and the
// refresh afterwards. A batch that partly fails says how many went through and why the others did not; deleting moves files to the
// trash with an Undo, and only the trash can delete for good.
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui-system';
import { saveFile } from './viewer/download';
import {
  bulkInBatches, createFolder, deleteDocumentForGood, deleteFolder, updateDocument, updateFolder, uploadDocument,
} from './useDocumentsData';
import type { BulkResult, DocFolder, DocumentFile } from './types';

const reason = (e: unknown) => (e instanceof Error ? e.message : 'something went wrong');
const files = (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`;

/** Say what a batch did. Returns true when everything went through. */
function report(result: BulkResult, done: string, notDone: string): boolean {
  if (result.done.length) toast.success(`${files(result.done.length)} ${done}.`);
  if (result.failed.length) {
    const first = result.failed[0];
    toast.error(`${files(result.failed.length)} ${notDone}. ${first.name ? `${first.name}: ` : ''}${first.error}`);
  }
  return result.failed.length === 0;
}

export function useLibraryActions(refresh: () => Promise<unknown>, onGone: (ids: string[]) => void) {
  const confirm = useConfirm();
  const names = (docs: readonly DocumentFile[]) => `${docs.slice(0, 3).map(d => d.name).join(', ')}${docs.length > 3 ? ` and ${docs.length - 3} more` : ''}`;

  const star = useCallback(async (d: DocumentFile) => {
    try { await updateDocument(d.id, { starred: !d.starred }); await refresh(); }
    catch (e) { toast.error(`The star was not saved: ${reason(e)}`); }
  }, [refresh]);

  const setStars = useCallback(async (docs: readonly DocumentFile[], action: 'star' | 'unstar') => {
    try { const r = await bulkInBatches(docs.map(d => d.id), action); report(r, action === 'star' ? 'starred' : 'unstarred', 'could not be changed'); }
    catch (e) { toast.error(reason(e)); }
    await refresh();
  }, [refresh]);

  const download = useCallback(async (docs: readonly DocumentFile[]) => {
    if (docs.length > 10) { toast.error('Download up to 10 files at a time. Open a file to download it on its own.'); return; }
    for (const d of docs) { try { await saveFile(d); } catch (e) { toast.error(`${d.name}: ${reason(e)}`); } }
  }, []);

  const saveDetails = useCallback(async (d: DocumentFile, patch: { name: string; description: string; tags: string[] }) => {
    await updateDocument(d.id, { ...patch, expected_updated_at: d.updatedAt });
    toast.success('Details saved.');
    await refresh();
  }, [refresh]);

  const moveFiles = useCallback(async (ids: string[], folderId: string | null) => {
    const r = await bulkInBatches(ids, 'move', { folder_id: folderId });
    if (r.done.length === 0 && r.failed.length > 0) throw new Error(r.failed[0].error); // nothing moved: say why inside the dialog
    report(r, 'moved', 'could not be moved');
    await refresh();
  }, [refresh]);

  const applyTags = useCallback(async (ids: string[], mode: 'tag_add' | 'tag_remove', tags: string[]) => {
    const r = await bulkInBatches(ids, mode, { tags });
    if (r.done.length === 0 && r.failed.length > 0) throw new Error(r.failed[0].error);
    report(r, mode === 'tag_add' ? 'tagged' : 'untagged', 'could not be changed');
    await refresh();
  }, [refresh]);

  const restore = useCallback(async (docs: readonly DocumentFile[]) => {
    try { report(await bulkInBatches(docs.map(d => d.id), 'restore'), 'restored', 'could not be restored'); }
    catch (e) { toast.error(reason(e)); }
    await refresh();
  }, [refresh]);

  const trash = useCallback(async (docs: readonly DocumentFile[]) => {
    const ok = await confirm({
      title: docs.length === 1 ? 'Delete this file?' : `Delete ${files(docs.length)}?`,
      message: `${names(docs)} will be moved to the trash. You can restore ${docs.length === 1 ? 'it' : 'them'} from there.`,
      confirmLabel: 'Delete', destructive: true,
    });
    if (!ok) return;
    try {
      const r = await bulkInBatches(docs.map(d => d.id), 'trash');
      if (r.done.length) {
        toast.success(`${files(r.done.length)} moved to the trash.`, { action: { label: 'Undo', onClick: () => { void bulkInBatches(r.done, 'restore').then(res => { report(res, 'restored', 'could not be restored'); return refresh(); }); } } });
        onGone(r.done);
      }
      if (r.failed.length) toast.error(`${files(r.failed.length)} could not be deleted. ${r.failed[0].error}`);
    } catch (e) { toast.error(`Nothing was deleted: ${reason(e)}`); }
    await refresh();
  }, [confirm, refresh, onGone]);

  const purge = useCallback(async (docs: readonly DocumentFile[]) => {
    const ok = await confirm({
      title: docs.length === 1 ? 'Delete this file for good?' : `Delete ${files(docs.length)} for good?`,
      message: `${names(docs)} will be removed from storage. This cannot be undone.`, confirmLabel: 'Delete for good', destructive: true,
    });
    if (!ok) return;
    try {
      const r = docs.length === 1 ? await deleteDocumentForGood(docs[0].id).then(() => ({ done: [docs[0].id], failed: [] } as BulkResult)) : await bulkInBatches(docs.map(d => d.id), 'purge');
      if (r.done.length) { toast.success(`${files(r.done.length)} deleted for good.`); onGone(r.done); }
      if (r.failed.length) toast.error(`${files(r.failed.length)} could not be deleted. ${r.failed[0].error}`);
    } catch (e) { toast.error(`Nothing was deleted: ${reason(e)}`); }
    await refresh();
  }, [confirm, refresh, onGone]);

  // ── folders ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const makeFolder = useCallback(async (parentId: string | null, name: string, description: string) => {
    const made = await createFolder(parentId, name, description);
    toast.success(`Folder ${name} created.`);
    await refresh();
    return made;
  }, [refresh]);

  const renameFolder = useCallback(async (f: DocFolder, name: string, description: string) => {
    await updateFolder(f.id, { name, description });
    toast.success(`Folder renamed to ${name}.`);
    await refresh();
  }, [refresh]);

  const moveFolder = useCallback(async (f: DocFolder, parentId: string | null) => {
    await updateFolder(f.id, { parent_id: parentId });
    toast.success(`${f.name} moved.`);
    await refresh();
  }, [refresh]);

  const removeFolder = useCallback(async (f: DocFolder) => {
    if (!await confirm({ title: 'Delete this folder?', message: `${f.name} is removed. Only an empty folder can be deleted; files are never deleted with it.`, confirmLabel: 'Delete folder', destructive: true })) return false;
    try { await deleteFolder(f.id); toast.success(`Folder ${f.name} deleted.`); await refresh(); return true; }
    catch (e) { toast.error(reason(e)); return false; }
  }, [confirm, refresh]);

  const upload = useCallback(async (file: File, name: string, folderId: string | null, tags: string[]) => {
    const form = new FormData();
    form.append('file', file); form.append('name', name); form.append('folder_id', folderId ?? ''); form.append('tags', tags.join(','));
    return uploadDocument(form);
  }, []);

  return { star, setStars, download, saveDetails, moveFiles, applyTags, restore, trash, purge, makeFolder, renameFolder, moveFolder, removeFolder, upload };
}
