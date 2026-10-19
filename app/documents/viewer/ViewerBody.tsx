// app/documents/viewer/ViewerBody.tsx — the file itself, drawn the way its kind allows: images (with zoom), PDFs, audio, video, text,
// Word files and spreadsheets in the page; older Office formats through Microsoft's viewer when the person asks for it. A kind with
// no preview says so and offers the download, never a blank box.
'use client';

import { useEffect, useState } from 'react';
import { Button, Icon, IconButton, Notice, Spinner } from '@/components/ui-system';
import { typeMeta, type PreviewKind } from '../documentLogic';
import type { DocumentFile } from '../types';
import { DocxView, SheetView, type PrintHandle } from './OfficeViewers';
import { printText } from './printing';
import { useFetchedFile } from './useFetchedFile';

const MAX_TEXT_CHARS = 300_000;

function TextView({ url, name, printRef }: { url: string; name: string; printRef: PrintHandle }) {
  const file = useFetchedFile(url, 'text');
  const text = file.data ?? '';
  useEffect(() => {
    printRef.current = file.status === 'ready' ? () => printText(text, name) : null;
    return () => { printRef.current = null; };
  }, [file.status, text, name, printRef]);
  if (file.status === 'loading') return <div role="status" className="flex items-center justify-center gap-2 p-8 font-sans text-body-sm text-ink-muted"><Spinner /> Opening the file…</div>;
  if (file.status === 'error') return <Notice tone="warning" title="The file could not be opened">{file.error}</Notice>;
  return (
    <div className="flex flex-col gap-2">
      {text.length > MAX_TEXT_CHARS && <Notice tone="info" title="Showing the start of this file">Only the first {MAX_TEXT_CHARS.toLocaleString()} characters are shown. Download it to read the rest.</Notice>}
      {/* A long file scrolls inside this box, so the box has to take keyboard focus for the keyboard to scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label={`${name}, text`} className="max-h-[66dvh] overflow-auto whitespace-pre-wrap rounded-control border border-line bg-surface-subtle p-3 font-mono text-body-sm text-ink [overflow-wrap:anywhere]">{text.slice(0, MAX_TEXT_CHARS) || 'This file is empty.'}</pre>
    </div>
  );
}

const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];

function ImageView({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === url) return <Notice tone="warning" title="The image could not be shown">It may be damaged. Download it to open it elsewhere.</Notice>;
  const step = (dir: 1 | -1) => setZoom(z => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + dir))]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-1" role="group" aria-label="Zoom">
        <IconButton icon="zoom-out" size="sm" variant="ghost" label="Zoom out" disabled={zoom === ZOOMS[0]} onClick={() => step(-1)} />
        <button type="button" className="focus-ring min-w-12 rounded-xs px-1 font-sans text-caption text-ink-muted tabular hover:text-ink" onClick={() => setZoom(1)} aria-label="Reset zoom to fit">{Math.round(zoom * 100)}%</button>
        <IconButton icon="zoom-in" size="sm" variant="ghost" label="Zoom in" disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)} />
      </div>
      <div className="max-h-[64dvh] overflow-auto rounded-control bg-surface-muted p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} onError={() => setFailed(url)} style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? '100%' : 'none' }} className="mx-auto block h-auto rounded-xs" />
      </div>
    </div>
  );
}

function OfficeOnly({ doc }: { doc: DocumentFile }) {
  const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.url)}`;
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <Icon name={typeMeta(doc.type).icon} size="xl" className="text-ink-muted" />
      <p className="max-w-md font-sans text-body-sm text-ink-muted">.{doc.ext} files cannot be drawn in this page. Download it, or open it in Microsoft&apos;s online viewer, which receives the file&apos;s web address to show it.</p>
      <Button icon="external" disabled={!doc.url} onClick={() => window.open(viewer, '_blank', 'noopener,noreferrer')}>Preview with Microsoft Office online</Button>
    </div>
  );
}

export function ViewerBody({ doc, kind, printRef }: { doc: DocumentFile; kind: PreviewKind; printRef: PrintHandle }) {
  if (!doc.url) return <Notice tone="warning" title="No stored link">There is no stored link for this file, so it cannot be previewed or downloaded.</Notice>;
  switch (kind) {
    case 'image': return <ImageView url={doc.url} name={doc.name} />;
    case 'pdf': return <iframe src={doc.url} title={`${doc.name}, PDF`} className="h-[68dvh] w-full rounded-control border border-line bg-surface-muted" />;
    // Recordings are uploaded by staff and come with no caption file, so there is no <track> to give.
    /* eslint-disable jsx-a11y/media-has-caption */
    case 'audio': return <div className="flex flex-col items-center gap-3 p-6"><Icon name="file-audio" size="xl" className="text-ink-muted" /><audio controls preload="metadata" src={doc.url} className="w-full max-w-lg" aria-label={doc.name} /></div>;
    case 'video': return <video controls preload="metadata" src={doc.url} className="max-h-[66dvh] w-full rounded-control bg-black" aria-label={doc.name} />;
    /* eslint-enable jsx-a11y/media-has-caption */
    case 'text': return <TextView url={doc.url} name={doc.name} printRef={printRef} />;
    case 'docx': return <DocxView url={doc.url} name={doc.name} printRef={printRef} />;
    case 'sheet': return <SheetView url={doc.url} name={doc.name} printRef={printRef} />;
    case 'office': return <OfficeOnly doc={doc} />;
    default:
      return (
        <div className="flex flex-col items-center gap-2 p-8 text-center">
          <Icon name={typeMeta(doc.type).icon} size="xl" className="text-ink-muted" />
          <p className="font-sans text-body-sm text-ink-muted">This kind of file (.{doc.ext || 'unknown'}) cannot be previewed in the page. Download it to open it.</p>
        </div>
      );
  }
}
