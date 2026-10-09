// app/documents/page.tsx — the AMS document hub: seven ISO 55001 categories, folders under each, files in the folders.
// Home searches everything; a category lists its folders and top-level files; a folder lists its files.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, IconButton, PageHeader, useConfirm } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { CATEGORIES, categoryById, categoryByName } from './categories';
import { CategoryView } from './CategoryView';
import { FileBrowser, type FileActions } from './FileBrowser';
import { HomeView } from './HomeView';
import { NameDialog, type NameTarget } from './NameDialog';
import { PreviewDialog } from './PreviewDialog';
import { UploadDialog } from './UploadDialog';
import { formatSize, mergeFolders } from './documentLogic';
import {
  countFolderFiles, createFolder, deleteDocument, deleteFolder, renameFolder, updateDocument, uploadDocument, useDocuments, useFolders,
} from './useDocumentsData';
import type { DocumentFile, FolderEntry } from './types';
import { useConfirmDelete } from '@/lib/useConfirmDelete';

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));
const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'name', label: 'Name', width: 30 }, { key: 'categoryName', label: 'Category', width: 20 }, { key: 'folder', label: 'Folder', width: 24 },
  { key: 'type', label: 'Type', width: 12 }, { key: 'size', label: 'Size', width: 12, format: v => formatSize(v as number) },
  { key: 'createdAt', label: 'Added', width: 16, format: v => (v ? formatDate(v as string) : '') }, { key: 'description', label: 'Comment', width: 30 },
];

function DocumentsContent() {
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const category = categoryId ? categoryById(categoryId) ?? null : null;
  const files = useDocuments(categoryId, folder);
  const folders = useFolders(categoryId);
  const entries = useMemo(() => mergeFolders(category?.folders ?? [], folders.items), [category, folders.items]);

  const [uploading, setUploading] = useState(false);
  const [naming, setNaming] = useState<NameTarget | null>(null);
  const [nameFor, setNameFor] = useState<{ kind: 'new-folder' } | { kind: 'folder'; entry: FolderEntry } | { kind: 'file'; doc: DocumentFile } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [seed, setSeed] = useState<DocumentFile | null>(null);
  const previewing = previewId ? files.items.find(d => d.id === previewId) ?? (seed?.id === previewId ? seed : null) : null;
  const where = category ? `${category.name}${folder ? ` / ${folder}` : ''}` : '';

  const go = (id: string | null, next: string | null = null) => { setCategoryId(id); setFolder(next); setPreviewId(null); };
  const locate = (d: DocumentFile) => {
    const c = categoryById(d.categoryId) ?? categoryByName(d.categoryName);
    if (!c) { toast.error('This document is not filed under a known category.'); return; }
    go(c.id, d.folder); setSeed(d); setPreviewId(d.id);
  };

  const download = (d: DocumentFile) => {
    if (!d.url) { toast.error(`${d.name} has no stored download link.`); return; }
    const a = document.createElement('a');
    a.href = d.url; a.download = d.name; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  };
  const star = async (d: DocumentFile) => {
    files.setItems(prev => prev.map(x => (x.id === d.id ? { ...x, starred: !d.starred } : x)));
    try { await updateDocument(d.id, { starred: !d.starred }); }
    catch (e) { files.setItems(prev => prev.map(x => (x.id === d.id ? { ...x, starred: d.starred } : x))); toast.error(`The star was not saved: ${reason(e)}`); }
  };
  const remove = async (d: DocumentFile) => {
    await confirmDelete({ title: 'Delete this file?', message: `${d.name} is removed from storage and cannot be recovered.`, what: `${d.name}`, run: async () => { await deleteDocument(d.id); setPreviewId(null); }, done: `${d.name} deleted.`, after: () => files.refetch() });
  };
  const removeMany = async (ds: DocumentFile[]) => {
    if (!await confirm({ title: `Delete ${ds.length} ${ds.length === 1 ? 'file' : 'files'}?`, message: `They are removed from storage and cannot be recovered. ${ds.slice(0, 3).map(d => d.name).join(', ')}${ds.length > 3 ? ` and ${ds.length - 3} more` : ''}.`, confirmLabel: `Delete ${ds.length}`, destructive: true })) return;
    let ok = 0; let firstFailure = '';
    for (const d of ds) { try { await deleteDocument(d.id); ok += 1; } catch (e) { firstFailure ||= reason(e); } }
    if (ok) toast.success(`${ok} ${ok === 1 ? 'file' : 'files'} deleted.`);
    if (ok < ds.length) toast.error(`${ds.length - ok} could not be deleted: ${firstFailure}`);
    await files.refetch();
  };

  const openName = (t: NameTarget, f: NonNullable<typeof nameFor>) => { setNaming(t); setNameFor(f); };
  const actions: FileActions = {
    onOpen: d => { setSeed(d); setPreviewId(d.id); }, onStar: star, onDownload: download, onDelete: remove, onBulkDelete: removeMany, onUpload: () => setUploading(true),
    onRename: d => openName({ key: `file-${d.id}`, title: 'Edit file details', description: d.originalName, label: 'Display name', name: d.name, comment: d.description, submitLabel: 'Save' }, { kind: 'file', doc: d }),
  };

  const saveName = async (name: string, comment: string) => {
    if (!category || !nameFor) return;
    if (nameFor.kind === 'file') {
      await updateDocument(nameFor.doc.id, { name, description: comment });
      files.setItems(prev => prev.map(x => (x.id === nameFor.doc.id ? { ...x, name, description: comment } : x)));
      toast.success('File details saved.');
      return;
    }
    const taken = entries.some(f => f.name.toLowerCase() === name.toLowerCase() && !(nameFor.kind === 'folder' && f.name === nameFor.entry.name));
    if (taken) throw new Error('A folder with this name already exists here.');
    if (nameFor.kind === 'new-folder') { await createFolder(category.id, category.name, name); toast.success(`Folder ${name} created.`); }
    else {
      await renameFolder(nameFor.entry.id!, name);
      if (folder === nameFor.entry.name) setFolder(name);
      toast.success(`Folder renamed to ${name}.`);
      await files.refetch();
    }
    await folders.refetch();
  };
  const deleteCustomFolder = async (f: FolderEntry) => {
    if (!category || !f.id) return;
    let count: number;
    try { count = await countFolderFiles(category.id, f.name); } catch (e) { toast.error(`The folder could not be checked: ${reason(e)}`); return; }
    if (count > 0) { toast.error(`${f.name} still holds ${count} ${count === 1 ? 'file' : 'files'}. Delete them first; deleting a folder does not delete its files.`); return; }
    if (!await confirm({ title: 'Delete this folder?', message: `${f.name} is empty. Only the folder is removed.`, confirmLabel: 'Delete folder', destructive: true })) return;
    try { await deleteFolder(f.id); toast.success(`Folder ${f.name} deleted.`); await folders.refetch(); }
    catch (e) { toast.error(`${f.name} was not deleted: ${reason(e)}`); }
  };

  const uploadOne = async (file: File, name: string, comment: string) => {
    if (!category) return;
    const form = new FormData();
    form.append('file', file); form.append('name', name); form.append('description', comment);
    form.append('category_id', category.id); form.append('category_name', category.name);
    form.append('folder_id', folder ?? ''); form.append('folder_path', folder ?? '');
    await uploadDocument(form);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'Documents' }]}
        title="Documents"
        description="ISO 55001 document management: find a document, or open a category and its folders."
        actions={category ? (
          <>
            <IconButton icon="refresh" label="Refresh documents" variant="shell" pending={(files.loading && files.loaded) || (folders.loading && folders.loaded)} onClick={() => { files.refetch(); folders.refetch(); }} />
            {files.items.length > 0 && <DownloadButton data={files.items as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('Documents')} title="Document Hub" formats={['excel']} />}
            {!folder && <Button icon="plus" onClick={() => openName({ key: 'new-folder', title: 'New folder', description: `In ${category.name}`, label: 'Folder name', name: '', submitLabel: 'Create folder' }, { kind: 'new-folder' })} disabled={!folders.loaded && !folders.error}>New folder</Button>}
            <Button variant="primary" icon="upload" onClick={() => setUploading(true)}>Upload</Button>
          </>
        ) : undefined}
      />

      {category && (
        <nav aria-label="Location" className="flex flex-wrap items-center gap-1.5 font-sans text-body-sm">
          <button type="button" className="focus-ring rounded-xs text-ink-muted hover:text-ink" onClick={() => go(null)}>All categories</button>
          <span aria-hidden className="text-ink-muted">/</span>
          {folder
            ? <button type="button" className="focus-ring rounded-xs text-ink-muted hover:text-ink" onClick={() => go(category.id)}>{category.name}</button>
            : <span aria-current="page" className="font-medium text-ink">{category.name}</span>}
          {folder && <><span aria-hidden className="text-ink-muted">/</span><span aria-current="page" className="font-medium text-ink">{folder}</span></>}
        </nav>
      )}

      {!category ? (
        <HomeView onOpenCategory={id => go(id)} onLocate={locate} />
      ) : folder ? (
        <section aria-labelledby="folder-h" className="flex flex-col gap-3">
          <h2 id="folder-h" className="font-display text-section font-semibold text-ink">{folder}</h2>
          <FileBrowser list={files} subject={where} actions={actions} />
        </section>
      ) : (
        <CategoryView
          category={category} folders={folders} entries={entries} files={files} actions={actions}
          onOpenFolder={name => go(category.id, name)}
          onRenameFolder={f => openName({ key: `folder-${f.id}`, title: 'Rename folder', description: 'Files in the folder move with it.', label: 'Folder name', name: f.name, submitLabel: 'Rename' }, { kind: 'folder', entry: f })}
          onDeleteFolder={deleteCustomFolder}
        />
      )}

      <UploadDialog open={uploading} where={where || CATEGORIES[0].name} onOpenChange={setUploading} onUpload={uploadOne} onUploaded={() => files.refetch()} />
      <NameDialog target={naming} onOpenChange={o => { if (!o) { setNaming(null); } }} onSave={saveName} />
      <PreviewDialog doc={previewing} where={where} onClose={() => setPreviewId(null)} onDownload={download} onRename={d => { setPreviewId(null); actions.onRename(d); }} onDelete={remove} />
    </div>
  );
}

export default function DocumentsPage() {
  return <AppShell migrated><DocumentsContent /></AppShell>;
}
