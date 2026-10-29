// app/documents/BulkBar.tsx — what can be done to the ticked files at once: move, tag, star, download, delete (to the trash), and in
// the trash restore or delete for good; in Quick print, Print sends the ticked papers to the printer one after another. "Select
// all" reaches every file the search found, not just the page on screen.
'use client';

import { Button, Menu, MenuContent, MenuItem, MenuTrigger, NumberTransition, Presence } from '@/components/ui-system';

export function BulkBar({ count, total, trash, isManager, onSelectAll, onClear, onMove, onTags, onStar, onUnstar, onDownload, onTrash, onRestore, onPurge, onPrint, printing = false }: {
  count: number; total: number; trash: boolean; isManager: boolean;
  onSelectAll: () => void; onClear: () => void; onMove: () => void; onTags: () => void; onStar: () => void; onUnstar: () => void;
  onDownload: () => void; onTrash: () => void; onRestore: () => void; onPurge: () => void;
  /** Quick print only. */
  onPrint?: () => void; printing?: boolean;
}) {
  return (
    <Presence visible={count > 0}>
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface-raised px-4 py-2.5 shadow-sm" role="region" aria-label="Actions for the selected files">
      <span className="font-sans text-label font-semibold text-ink" role="status"><span className="sr-only">{count} selected</span><span aria-hidden="true"><NumberTransition value={count} /> selected</span></span>
      {count < total && <Button size="sm" variant="ghost" onClick={onSelectAll}>Select all {total}</Button>}
      {trash ? (
        <>
          <Button size="sm" icon="undo" onClick={onRestore}>Restore</Button>
          {isManager && <Button size="sm" variant="danger" icon="delete" onClick={onPurge}>Delete for good</Button>}
        </>
      ) : (
        <>
          {onPrint && <Button size="sm" variant="primary" icon="print" pending={printing} disabled={printing} onClick={onPrint}>Print</Button>}
          <Button size="sm" icon="move" onClick={onMove}>Move</Button>
          <Button size="sm" icon="tag" onClick={onTags}>Tags</Button>
          <Menu>
            <MenuTrigger asChild><Button size="sm" icon="more">More</Button></MenuTrigger>
            <MenuContent align="start">
              <MenuItem icon="starred" onSelect={onStar}>Star</MenuItem>
              <MenuItem icon="starred" onSelect={onUnstar}>Remove star</MenuItem>
              <MenuItem icon="download" onSelect={onDownload}>Download</MenuItem>
            </MenuContent>
          </Menu>
          {isManager && <Button size="sm" variant="danger" icon="delete" onClick={onTrash}>Delete</Button>}
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onClear}>Clear selection</Button>
    </div>
    </Presence>
  );
}
