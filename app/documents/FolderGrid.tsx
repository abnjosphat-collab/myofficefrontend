// app/documents/FolderGrid.tsx — the folders inside the place you are in, as cards. Every folder has the same menu: open, add a
// subfolder, rename, move, delete (when empty). The count is every file in it and below.
'use client';

import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, RecordCard, Icon } from '@/components/ui-system';
import type { FolderNode } from './types';

export function FolderGrid({ folders, isManager, onOpen, onNewSub, onRename, onMove, onDelete }: {
  folders: readonly FolderNode[]; isManager: boolean; onOpen: (f: FolderNode) => void; onNewSub: (f: FolderNode) => void;
  onRename: (f: FolderNode) => void; onMove: (f: FolderNode) => void; onDelete: (f: FolderNode) => void;
}) {
  if (folders.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Folders here">
      {folders.map(f => (
        <li key={f.id} className="relative">
          <RecordCard
            title={<span className="inline-flex items-center gap-2"><Icon name="folder" size="md" className="shrink-0 text-ink-muted" />{f.name}</span>}
            openLabel={`Open folder ${f.name}`} onOpen={() => onOpen(f)} subtitle={f.description || undefined}
            meta={`${f.totalCount} ${f.totalCount === 1 ? 'file' : 'files'}${f.children.length ? `, ${f.children.length} ${f.children.length === 1 ? 'folder' : 'folders'}` : ''}`}
            action={(
              <Menu>
                <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`Actions for folder ${f.name}`} /></MenuTrigger>
                <MenuContent>
                  <MenuItem icon="folder-add" onSelect={() => onNewSub(f)}>New subfolder</MenuItem>
                  <MenuItem icon="edit" onSelect={() => onRename(f)}>Rename</MenuItem>
                  <MenuItem icon="move" onSelect={() => onMove(f)}>Move to…</MenuItem>
                  {isManager && <><MenuSeparator /><MenuItem icon="delete" tone="danger" onSelect={() => onDelete(f)}>Delete folder</MenuItem></>}
                </MenuContent>
              </Menu>
            )}
          />
        </li>
      ))}
    </ul>
  );
}
