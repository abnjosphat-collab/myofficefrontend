// app/documents/PreviewDialog.tsx — one file in full: a preview where the browser can show one (images, PDFs), its details, and
// the actions on it. Where there is no stored link the dialog says so instead of offering a dead download.
'use client';

import { Button, Dialog, Fact, FactList, Icon, StatusBadge } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { formatSize, typeMeta } from './documentLogic';
import type { DocumentFile } from './types';

export function PreviewDialog({ doc, where, onClose, onDownload, onRename, onDelete }: {
  doc: DocumentFile | null; where: string; onClose: () => void; onDownload: (d: DocumentFile) => void; onRename: (d: DocumentFile) => void; onDelete: (d: DocumentFile) => void;
}) {
  const m = doc ? typeMeta(doc.type) : null;
  const facts = doc ? [
    { label: 'Display name', value: doc.name }, { label: 'Original file', value: doc.originalName }, { label: 'Size', value: formatSize(doc.size) },
    { label: 'Added', value: fmtDateTime(doc.createdAt) }, { label: 'Location', value: where },
  ] : [];
  return (
    <Dialog
      open={!!doc} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={doc?.name ?? 'File'} description="File preview"
      footer={doc && (<><Button variant="danger" icon="delete" onClick={() => onDelete(doc)}>Delete</Button><Button icon="edit" onClick={() => onRename(doc)}>Rename</Button><Button variant="primary" icon="download" disabled={!doc.url} onClick={() => onDownload(doc)}>Download</Button></>)}
    >
      {doc && m && (
        <div className="flex flex-col gap-4">
          <div className="flex min-h-48 items-center justify-center rounded-card bg-surface-subtle p-3">
            {doc.type === 'image' && doc.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.url} alt={doc.name} className="max-h-96 max-w-full rounded-control object-contain" />
            ) : doc.type === 'pdf' && doc.url ? (
              <iframe src={doc.url} title={`${doc.name} preview`} className="h-96 w-full rounded-control" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center"><Icon name={m.icon} size="xl" className="text-ink-muted" /><p className="font-sans text-body-sm text-ink-muted">{doc.url ? 'This type of file cannot be previewed here. Download it to open it.' : 'There is no stored link for this file, so it cannot be previewed or downloaded.'}</p></div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={m.tone}>{m.label}</StatusBadge>{doc.starred && <StatusBadge tone="warning">Starred</StatusBadge>}</div>
          <FactList>
            {facts.map(f => <Fact key={f.label} label={f.label}>{f.value}</Fact>)}
            {doc.description && <Fact label="Comment" wide>{doc.description}</Fact>}
          </FactList>
        </div>
      )}
    </Dialog>
  );
}
