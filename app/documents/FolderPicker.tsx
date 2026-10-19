// app/documents/FolderPicker.tsx — choose a folder from the whole tree: type to find it by name, or scroll the indented list.
// Used wherever a file or folder is put somewhere (upload, move, new folder).
'use client';

import { useState } from 'react';
import { Icon, SearchField, cn } from '@/components/ui-system';
import { matchFolders } from './documentLogic';
import type { DocFolder, FolderNode } from './types';

export function FolderPicker({ flat, value, onChange, noneLabel, disabledIds = [], label }: {
  /** Every folder, depth-first, as FolderNodes (so each carries its depth). */
  flat: FolderNode[]; value: string | null; onChange: (id: string | null) => void;
  /** When set, a choice of "no folder" is offered first (Unfiled, or the top level). */
  noneLabel?: string; disabledIds?: readonly string[]; label: string;
}) {
  const [text, setText] = useState('');
  const searching = text.trim() !== '';
  const hits = searching ? matchFolders(flat as DocFolder[], text) : [];
  const blocked = new Set(disabledIds);

  const item = (id: string | null, name: string, depth: number, hint?: string) => {
    const selected = value === id;
    const off = id !== null && blocked.has(id);
    return (
      <li key={id ?? 'none'} role="option" aria-selected={selected} aria-disabled={off || undefined}>
        <button
          type="button" disabled={off} onClick={() => onChange(id)} style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
          className={cn('focus-ring flex min-h-8 w-full items-center gap-2 rounded-control py-1 pr-2 text-left font-sans text-body-sm hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45', selected && 'bg-action-soft font-medium text-ink')}
        >
          <Icon name={id === null ? 'attachment' : selected ? 'folder-open' : 'folder'} size="sm" className="shrink-0 text-ink-muted" />
          <span className="min-w-0 flex-1 truncate">{name}</span>
          {hint && <span className="truncate text-caption text-ink-muted">{hint}</span>}
          {selected && <Icon name="check" size="sm" className="shrink-0 text-action" />}
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <SearchField value={text} onValueChange={setText} placeholder="Find a folder by name" label={`Find a folder: ${label}`} />
      <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto rounded-control border border-line bg-surface-subtle p-1">
        {noneLabel && !searching && item(null, noneLabel, 0)}
        {searching
          ? (hits.length === 0 ? <li className="px-2 py-3 font-sans text-body-sm text-ink-muted">No folder has that name.</li> : hits.map(h => item(h.folder.id, h.folder.name, 0, h.path === h.folder.name ? undefined : h.path)))
          : flat.map(n => item(n.id, n.name, n.depth))}
      </ul>
    </div>
  );
}
