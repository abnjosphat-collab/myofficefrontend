// app/documents/LocationHeader.tsx — where you are: the path as clickable steps, the name of the place, and (for a folder) what it
// holds and what can be done to it. The smart views (recent, starred, unfiled, trash) say what they show.
'use client';

import { Button, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui-system';
import { folderTrail } from './documentLogic';
import type { DocFolder, Place } from './types';

const VIEW_TEXT: Record<Exclude<Place['kind'], 'folder'>, { title: string; text: string }> = {
  home: { title: 'All files', text: 'Every document in the library, newest first. Open a folder, or search.' },
  recent: { title: 'Recent', text: 'Files added in the last 7 days.' },
  starred: { title: 'Starred', text: 'The files you and your colleagues starred.' },
  unfiled: { title: 'Unfiled', text: 'Files not in any folder yet. Move them into one so they are easy to find.' },
  trash: { title: 'Trash', text: 'Deleted files stay here until a manager deletes them for good. Restore any file you need.' },
};

export function LocationHeader({ place, folders, isManager, onGo, onNewSub, onRename, onMove, onDelete }: {
  place: Place; folders: readonly DocFolder[]; isManager: boolean; onGo: (p: Place) => void;
  onNewSub: (f: DocFolder) => void; onRename: (f: DocFolder) => void; onMove: (f: DocFolder) => void; onDelete: (f: DocFolder) => void;
}) {
  if (place.kind !== 'folder') {
    const v = VIEW_TEXT[place.kind];
    return <div><h2 className="font-display text-section font-semibold text-ink">{v.title}</h2><p className="font-sans text-body-sm text-ink-muted">{v.text}</p></div>;
  }
  const trail = folderTrail(folders, place.id);
  const here = trail[trail.length - 1];
  if (!here) return <div><h2 className="font-display text-section font-semibold text-ink">Folder not found</h2><p className="font-sans text-body-sm text-ink-muted">It may have been deleted or moved. Pick another from the list.</p></div>;
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Location" className="flex flex-wrap items-center gap-1.5 font-sans text-body-sm">
        <button type="button" className="focus-ring rounded-xs text-ink-muted hover:text-ink" onClick={() => onGo({ kind: 'home' })}>All files</button>
        {trail.map((f, i) => (
          <span key={f.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="text-ink-muted">/</span>
            {i === trail.length - 1
              ? <span aria-current="page" className="font-medium text-ink">{f.name}</span>
              : <button type="button" className="focus-ring rounded-xs text-ink-muted hover:text-ink" onClick={() => onGo({ kind: 'folder', id: f.id })}>{f.name}</button>}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-section font-semibold text-ink [overflow-wrap:anywhere]">{here.name}</h2>
          <p className="font-sans text-body-sm text-ink-muted">{here.description ? `${here.description} ` : ''}{here.totalCount} {here.totalCount === 1 ? 'file' : 'files'} in this folder and below.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" icon="folder-add" onClick={() => onNewSub(here)}>New subfolder</Button>
          <Menu>
            <MenuTrigger asChild><Button size="sm" icon="more" aria-label={`More for folder ${here.name}`}>Folder</Button></MenuTrigger>
            <MenuContent>
              <MenuItem icon="edit" onSelect={() => onRename(here)}>Rename</MenuItem>
              <MenuItem icon="move" onSelect={() => onMove(here)}>Move to…</MenuItem>
              {isManager && <><MenuSeparator /><MenuItem icon="delete" tone="danger" onSelect={() => onDelete(here)}>Delete folder</MenuItem></>}
            </MenuContent>
          </Menu>
        </div>
      </div>
    </div>
  );
}
