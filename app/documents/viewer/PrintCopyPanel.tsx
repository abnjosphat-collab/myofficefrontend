// app/documents/viewer/PrintCopyPanel.tsx — a Word or Excel paper's print copy: the PDF it prints from, so the pages come out exactly
// as the author laid them out. Without one, Print draws the file in the browser, which can move page breaks, margins and fonts.
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui-system';
import { formatSize } from '../documentLogic';
import type { DocumentFile } from '../types';

export function PrintCopyPanel({ doc, onKeep, onDrop }: {
  doc: DocumentFile;
  onKeep: (d: DocumentFile, pdf: File) => Promise<unknown>;
  onDrop: (d: DocumentFile) => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => { setBusy(true); try { await work(); } finally { setBusy(false); } };
  const has = !!doc.printCopyUrl;
  return (
    <div className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3" aria-label="Print copy" role="group">
      <p className="font-sans text-label font-medium text-ink">Print copy</p>
      <p className="font-sans text-body-sm text-ink-muted">
        {has
          ? <>Prints from <span className="text-ink">{doc.printCopyName || 'its PDF'}</span>{doc.printCopySize ? ` (${formatSize(doc.printCopySize)})` : ''}: the exact pages.</>
          : 'None yet. Print draws this file in the browser, so pages can differ from Word or Excel. For the exact pages, save it as a PDF there (File, Save as, PDF) and add that here.'}
      </p>
      <input
        ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(() => onKeep(doc, f)); }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon="upload" pending={busy} disabled={busy} onClick={() => input.current?.click()}>{has ? 'Replace the PDF' : 'Add the PDF'}</Button>
        {has && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { void run(() => onDrop(doc)); }}>Remove</Button>}
      </div>
    </div>
  );
}
