// app/documents/FolderTree.tsx — the left-hand navigation: the smart views (everything, recent, starred, unfiled, trash) and the
// folder tree with file counts. Every folder behaves the same; the tree opens on the folder you are in.
'use client';

import { useState } from 'react';
import { CountBadge, Icon, cn, type IconMeaning } from '@/components/ui-system';
import { folderTrail } from './documentLogic';
import type { FolderNode, LibraryCounts, Place } from './types';

const VIEWS: { place: Place; label: string; icon: IconMeaning; count?: keyof LibraryCounts }[] = [
  { place: { kind: 'home' }, label: 'All files', icon: 'documents', count: 'all' },
  { place: { kind: 'recent' }, label: 'Recent', icon: 'clock' },
  { place: { kind: 'starred' }, label: 'Starred', icon: 'starred', count: 'starred' },
  { place: { kind: 'unfiled' }, label: 'Unfiled', icon: 'attachment', count: 'unfiled' },
  { place: { kind: 'trash' }, label: 'Trash', icon: 'delete', count: 'trashed' },
];

const same = (a: Place, b: Place) => a.kind === b.kind && (a.kind !== 'folder' || (b.kind === 'folder' && a.id === b.id));
const row = 'focus-ring flex min-h-8 min-w-0 items-center gap-2 rounded-control px-2 py-1 text-left font-sans text-body-sm transition-colors hover:bg-surface-muted';

export function FolderTree({ tree, flat, place, counts, onSelect }: {
  tree: FolderNode[]; flat: FolderNode[]; place: Place; counts: LibraryCounts; onSelect: (place: Place) => void;
}) {
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const onPath = new Set(place.kind === 'folder' ? folderTrail(flat, place.id).map(f => f.id) : []);

  // A folder is open when the person opened it, or when it is the top of the tree, or the folder you are in is below it — unless they closed it.
  const isOpen = (n: FolderNode) => !closed.has(n.id) && (opened.has(n.id) || onPath.has(n.id) || n.depth === 0);
  const toggle = (n: FolderNode) => {
    const open = isOpen(n);
    setOpened(s => { const next = new Set(s); if (open) next.delete(n.id); else next.add(n.id); return next; });
    setClosed(s => { const next = new Set(s); if (open) next.add(n.id); else next.delete(n.id); return next; });
  };

  const renderNode = (n: FolderNode) => {
    const open = isOpen(n);
    const selected = place.kind === 'folder' && place.id === n.id;
    return (
      <li key={n.id}>
        <div className="flex items-center gap-0.5" style={{ paddingLeft: `${n.depth * 0.75}rem` }}>
          {n.children.length > 0 ? (
            <button type="button" className="focus-ring touch-target flex size-6 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:text-ink" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${n.name}`} onClick={() => toggle(n)}>
              <Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" />
            </button>
          ) : <span aria-hidden className="size-6 shrink-0" />}
          <button type="button" className={cn(row, 'flex-1', selected && 'bg-action-soft font-medium text-ink')} aria-current={selected ? 'page' : undefined} onClick={() => onSelect({ kind: 'folder', id: n.id })}>
            <Icon name={selected || open ? 'folder-open' : 'folder'} size="sm" className="shrink-0 text-ink-muted" />
            <span className="min-w-0 flex-1 truncate" title={n.name}>{n.name}</span>
            {n.totalCount > 0 && <span className="shrink-0 font-sans text-caption text-ink-muted tabular">{n.totalCount}</span>}
          </button>
        </div>
        {open && n.children.length > 0 && <ul className="flex flex-col gap-0.5">{n.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <nav aria-label="Folders" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-0.5" aria-label="Views">
        {VIEWS.map(v => {
          const selected = same(v.place, place);
          const count = v.count ? counts[v.count] : 0;
          return (
            <li key={v.label}>
              <button type="button" className={cn(row, 'w-full', selected && 'bg-action-soft font-medium text-ink')} aria-current={selected ? 'page' : undefined} onClick={() => onSelect(v.place)}>
                <Icon name={v.icon} size="sm" className="shrink-0 text-ink-muted" />
                <span className="flex-1">{v.label}</span>
                {count > 0 && <CountBadge value={count} />}
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <p className="px-2 pb-1 font-sans text-caption font-medium uppercase tracking-wide text-ink-muted">Folders</p>
        {tree.length === 0 ? <p className="px-2 font-sans text-body-sm text-ink-muted">No folders yet.</p> : <ul className="flex flex-col gap-0.5">{tree.map(renderNode)}</ul>}
      </div>
    </nav>
  );
}
