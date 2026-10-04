// app/documents/CategoryView.tsx — one clause: its folders (built-in and custom), and any files saved directly at its top level
// (an upload made here, rather than into a folder, lands there, so they must be listed or they would be invisible).
'use client';

import { Button, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, Notice, RecordCard } from '@/components/ui-system';
import type { ApiListState } from '@/lib/useApiList';
import { FileBrowser, type FileActions } from './FileBrowser';
import type { Category } from './categories';
import type { DocumentFile, Folder, FolderEntry } from './types';

export function CategoryView({ category, folders, entries, files, actions, onOpenFolder, onRenameFolder, onDeleteFolder }: {
  category: Category; folders: ApiListState<Folder>; entries: FolderEntry[]; files: ApiListState<DocumentFile>; actions: FileActions;
  onOpenFolder: (name: string) => void; onRenameFolder: (f: FolderEntry) => void; onDeleteFolder: (f: FolderEntry) => void;
}) {
  const foldersFailed = !!folders.error && !folders.loaded;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="folders-h" className="flex flex-col gap-3">
        <div><h2 id="folders-h" className="font-display text-section font-semibold text-ink">Folders</h2><p className="font-sans text-body-sm text-ink-muted">{category.description}</p></div>
        {foldersFailed && <Notice tone="danger" title="Custom folders could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => folders.refetch()}>Try again</Button>}>{folders.error} The built-in folders below still work.</Notice>}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Folders in ${category.name}`}>
          {entries.map(f => (
            <li key={f.name} className="relative">
              <RecordCard
                title={f.name} openLabel={`Open folder ${f.name}`} onOpen={() => onOpenFolder(f.name)}
                meta={f.builtIn ? 'Built-in folder' : 'Custom folder'}
                action={f.builtIn ? undefined : (
                  <Menu>
                    <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`Actions for folder ${f.name}`} /></MenuTrigger>
                    <MenuContent>
                      <MenuItem icon="edit" onSelect={() => onRenameFolder(f)}>Rename folder</MenuItem>
                      <MenuItem icon="delete" onSelect={() => onDeleteFolder(f)}>Delete folder</MenuItem>
                    </MenuContent>
                  </Menu>
                )}
              />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="top-h" className="flex flex-col gap-3">
        <h2 id="top-h" className="font-display text-section font-semibold text-ink">Files in {category.name}</h2>
        <FileBrowser list={files} subject={`${category.name} top level`} actions={actions} />
      </section>
    </div>
  );
}
