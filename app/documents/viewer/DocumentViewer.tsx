// app/documents/viewer/DocumentViewer.tsx — one file in full, in the page: the file itself, then open, download and print, with the
// previous and next file of the list one key away (← →). Beside it: where the file is, who added it and when, its tags and comment,
// what has been done to it, and the actions on it. Nothing here needs a download first.
'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Fact, FactList, IconButton, StatusBadge, Tag } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { activityLabel, formatSize, neighbours, previewKind, printRoute, shortLocation, takesPrintCopy, typeMeta } from '../documentLogic';
import type { DocumentFile } from '../types';
import { useActivity } from '../useDocumentsData';
import { saveFile, openInNewTab } from './download';
import type { PrintHandle } from './OfficeViewers';
import { PrintCopyPanel } from './PrintCopyPanel';
import { printWithoutOpening } from './printing';
import { ViewerBody } from './ViewerBody';

export interface ViewerActions {
  onStar: (d: DocumentFile) => void;
  onEdit: (d: DocumentFile) => void;
  onMove: (d: DocumentFile) => void;
  onTrash: (d: DocumentFile) => void;
  onRestore: (d: DocumentFile) => void;
  onPurge: (d: DocumentFile) => void;
  onShowFolder: (d: DocumentFile) => void;
  onKeepPrintCopy: (d: DocumentFile, pdf: File) => Promise<unknown>;
  onDropPrintCopy: (d: DocumentFile) => Promise<unknown>;
}

const reason = (e: unknown) => (e instanceof Error ? e.message : 'something went wrong');

function History({ id }: { id: string }) {
  const history = useActivity(id);
  if (history.loading && !history.loaded) return <p className="font-sans text-body-sm text-ink-muted">Loading the history.</p>;
  if (history.error) return <p className="font-sans text-body-sm text-ink-muted">The history could not be loaded.</p>;
  if (history.items.length === 0) return <p className="font-sans text-body-sm text-ink-muted">No changes recorded yet.</p>;
  return (
    <ol className="flex flex-col divide-y divide-line-subtle" aria-label="History of this file">
      {history.items.map(e => (
        <li key={e.id} className="flex flex-col py-1.5 first:pt-0 last:pb-0">
          <span className="font-sans text-body-sm text-ink">{activityLabel(e)}{typeof e.details?.by === 'string' && e.details.by ? ` by ${e.details.by}` : ''}</span>
          <span className="font-sans text-caption text-ink-muted">{fmtDateTime(e.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}

export function DocumentViewer({ doc, list, onNavigate, onClose, actions, isManager }: {
  doc: DocumentFile | null; list: readonly DocumentFile[]; onNavigate: (id: string) => void; onClose: () => void; actions: ViewerActions; isManager: boolean;
}) {
  const printRef: PrintHandle = useRef(null);
  const [busy, setBusy] = useState<'print' | 'download' | null>(null);
  const near = doc ? neighbours(list, doc.id) : { previous: null, next: null, position: -1 };
  const kind = doc ? previewKind(doc.ext) : 'none';
  const meta = doc ? typeMeta(doc.type) : null;

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && near.previous) { e.preventDefault(); onNavigate(near.previous.id); }
      if (e.key === 'ArrowRight' && near.next) { e.preventDefault(); onNavigate(near.next.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, near.previous, near.next, onNavigate]);

  if (!doc || !meta) return <Dialog open={false} onOpenChange={() => {}} title="File" description="File preview">{null}</Dialog>;

  const route = printRoute(doc);
  const print = async () => {
    setBusy('print');
    try {
      // The print copy, a PDF or a picture print as they are; anything else prints the page's drawing of it.
      if (await printWithoutOpening(doc, route)) return;
      if (printRef.current) await printRef.current();
      else toast.info('The file is still opening. Try again in a moment.');
    } catch (e) {
      toast.error(`${doc.name} could not be printed: ${reason(e)}. Use Open to print it from its own tab.`);
    } finally { setBusy(null); }
  };
  const download = async () => {
    setBusy('download');
    try { await saveFile(doc); } catch (e) { toast.error(reason(e)); } finally { setBusy(null); }
  };

  const trashed = !!doc.deletedAt;
  const total = list.length;
  return (
    <Dialog
      open onOpenChange={o => { if (!o) onClose(); }} size="xl" zoomId={`documents:rec:${doc.id}`} title={doc.name}
      description={`${meta.label}, ${formatSize(doc.size)}${total > 1 && near.position >= 0 ? `. File ${near.position + 1} of ${total} in this list` : ''}`}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Move through the list">
            <IconButton icon="chevron-left" label="Previous file" variant="ghost" disabled={!near.previous} onClick={() => near.previous && onNavigate(near.previous.id)} />
            <IconButton icon="chevron-right" label="Next file" variant="ghost" disabled={!near.next} onClick={() => near.next && onNavigate(near.next.id)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon="external" disabled={!doc.url} onClick={() => openInNewTab(doc)}>Open</Button>
            <Button icon="print" disabled={!doc.url || route === 'none' || busy !== null} pending={busy === 'print'} title={route === 'none' ? 'This kind of file cannot be printed from the page. Use Open.' : undefined} onClick={print}>Print</Button>
            <Button variant="primary" icon="download" disabled={!doc.url || busy !== null} pending={busy === 'download'} onClick={download}>Download</Button>
          </div>
        </div>
      )}
    >
      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0"><ViewerBody key={doc.id} doc={doc} kind={kind} printRef={printRef} /></div>
        <aside className="flex min-w-0 flex-col gap-4" aria-label="Details">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            {trashed && <StatusBadge tone="danger">In the trash</StatusBadge>}
            {doc.foundInside && <StatusBadge tone="info">Found inside the file</StatusBadge>}
          </div>
          <FactList columns={1}>
            <Fact label="Location">
              {doc.folderId ? <button type="button" className="focus-ring rounded-xs text-left text-action underline-offset-2 hover:underline" onClick={() => actions.onShowFolder(doc)}>{shortLocation(doc.folderPath)}</button> : 'Unfiled'}
            </Fact>
            <Fact label="Original file">{doc.originalName}</Fact>
            <Fact label="Added">{fmtDateTime(doc.createdAt)}{doc.uploadedBy ? ` by ${doc.uploadedBy}` : ''}</Fact>
            {doc.updatedAt !== doc.createdAt && <Fact label="Changed">{fmtDateTime(doc.updatedAt)}</Fact>}
            {trashed && <Fact label="Deleted">{fmtDateTime(doc.deletedAt)}{doc.deletedBy ? ` by ${doc.deletedBy}` : ''}</Fact>}
            {doc.tags.length > 0 && <Fact label="Tags" wide><span className="flex flex-wrap gap-1">{doc.tags.map(t => <Tag key={t}>{t}</Tag>)}</span></Fact>}
            {doc.description && <Fact label="Comment" wide>{doc.description}</Fact>}
          </FactList>
          <div className="flex flex-wrap gap-2">
            {trashed ? (
              <>
                <Button size="sm" icon="undo" onClick={() => actions.onRestore(doc)}>Restore</Button>
                {isManager && <Button size="sm" variant="danger" icon="delete" onClick={() => actions.onPurge(doc)}>Delete for good</Button>}
              </>
            ) : (
              <>
                <Button size="sm" icon="starred" aria-pressed={doc.starred} onClick={() => actions.onStar(doc)}>{doc.starred ? 'Unstar' : 'Star'}</Button>
                <Button size="sm" icon="edit" onClick={() => actions.onEdit(doc)}>Edit details</Button>
                <Button size="sm" icon="move" onClick={() => actions.onMove(doc)}>Move</Button>
                {isManager && <Button size="sm" variant="danger" icon="delete" onClick={() => actions.onTrash(doc)}>Delete</Button>}
              </>
            )}
          </div>
          {!trashed && takesPrintCopy(doc) && <PrintCopyPanel doc={doc} onKeep={actions.onKeepPrintCopy} onDrop={actions.onDropPrintCopy} />}
          <div className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3">
            <p className="font-sans text-label font-medium text-ink">History</p>
            <History id={doc.id} />
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
