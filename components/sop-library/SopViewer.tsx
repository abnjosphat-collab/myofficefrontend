// components/sop-library/SopViewer.tsx — read view of one SOP: header facts, every documented section in
// order, and the revision history (loaded when the viewer opens). The persisted record is the single
// source of truth; this view and the Word/PDF exports render the same data.
'use client';

import { useEffect, useState } from 'react';
import { Button, Drawer, Notice, Skeleton } from '@/components/ui-system';
import { SOP_SECTION_LABELS, type SopDocument, type SopRevision } from '@/lib/sops/types';
import { formatDate } from '@/lib/format';
import { SopBadges } from './SopCard';

export function SopViewer({ sop, onClose, loadRevisions, canEdit, archived, onEdit, onExportWord, onExportPdf }: {
  sop: SopDocument | null;
  onClose: () => void;
  /** Resolves the revisions, or null when they could not be loaded. */
  loadRevisions: (sopId: string) => Promise<SopRevision[] | null>;
  canEdit: boolean;
  archived: boolean;
  onEdit: (sop: SopDocument) => void;
  onExportWord: (sop: SopDocument) => void;
  onExportPdf: (sop: SopDocument) => void;
}) {
  const [revisions, setRevisions] = useState<{ sopId: string; items: SopRevision[] | null } | null>(null);
  const sopId = sop?.id ?? null;

  useEffect(() => {
    if (!sopId) return;
    let cancelled = false;
    loadRevisions(sopId).then(items => { if (!cancelled) setRevisions({ sopId, items }); });
    return () => { cancelled = true; };
  }, [sopId, loadRevisions]);

  const history = revisions && revisions.sopId === sopId ? revisions.items : undefined; // undefined = loading, null = failed
  const documented = sop ? SOP_SECTION_LABELS.filter(({ key }) => sop.sections[key]?.trim()) : [];
  const undocumented = sop ? SOP_SECTION_LABELS.filter(({ key }) => !sop.sections[key]?.trim()) : [];

  return (
    <Drawer
      open={sop !== null}
      onOpenChange={open => { if (!open) onClose(); }}
      title={sop ? `${sop.code}: ${sop.title}` : 'SOP'}
      description={sop ? `${sop.department} · owner ${sop.owner || 'unassigned'}` : undefined}
      footer={sop && (
        <>
          <Button icon="download" onClick={() => onExportWord(sop)}>Export Word</Button>
          <Button icon="pdf" onClick={() => onExportPdf(sop)}>Export PDF</Button>
          {canEdit && !archived && <Button variant="primary" icon="edit" onClick={() => onEdit(sop)}>Edit</Button>}
        </>
      )}
    >
      {sop && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-start"><SopBadges sop={sop} /></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-sans text-body-sm sm:grid-cols-3">
              {[['Approver', sop.approver], ['Effective', sop.effective_date ? formatDate(sop.effective_date) : null], ['Next review', sop.next_review_date ? formatDate(sop.next_review_date) : null], ['Updated', formatDate(sop.updated_at)], ['Supersedes', sop.supersedes], ['Tags', sop.tags?.length ? sop.tags.join(', ') : null]].map(([label, value]) => (
                <div key={label as string}><dt className="text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 text-ink">{value || 'Not set'}</dd></div>
              ))}
            </dl>
            {sop.summary && <p className="font-sans text-body text-ink-muted">{sop.summary}</p>}
          </div>

          {documented.map(({ key, label }) => (
            <section key={key} aria-labelledby={`sop-${key}`}>
              <h3 id={`sop-${key}`} className="mb-1.5 font-display text-title font-semibold text-ink">{label}</h3>
              <p className="whitespace-pre-wrap font-sans text-body leading-relaxed text-ink">{sop.sections[key]}</p>
            </section>
          ))}
          {undocumented.length > 0 && (
            <p className="font-sans text-body-sm text-ink-muted">Not yet documented: {undocumented.map(s => s.label).join(', ')}.</p>
          )}

          <section aria-labelledby="sop-history">
            <h3 id="sop-history" className="mb-2 font-display text-title font-semibold text-ink">Revision history</h3>
            {history === undefined ? (
              <div role="status" aria-label="Loading revision history" className="flex flex-col gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
            ) : history === null ? (
              <Notice tone="warning" title="Revision history could not be loaded">Close and reopen this SOP to try again.</Notice>
            ) : history.length === 0 ? (
              <p className="font-sans text-body-sm text-ink-muted">No revisions yet.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {history.map(rev => (
                  <li key={rev.id} className="border-l-2 border-line pl-3 font-sans text-body-sm">
                    <p className="text-ink"><strong className="font-semibold">Revision {rev.revision_number}</strong><span className="text-ink-muted"> · {new Date(rev.created_at).toLocaleString()} · {rev.author_email}</span></p>
                    <p className="mt-0.5 text-ink-muted">{rev.change_note}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
