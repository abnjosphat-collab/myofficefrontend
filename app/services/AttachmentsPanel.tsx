// app/services/AttachmentsPanel.tsx — the scanned hard copies and supporting documents for one job. The list is loaded when the tab
// opens; a failed load is an error with a retry (never "no attachments"), and a refused upload or removal shows the server's reason.
'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, DataRegion, EmptyState, Icon, IconButton, deriveDataStatus, isTransientStatus, useConfirm } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { formatFileSize } from '@/lib/format';
import { deleteAttachment, uploadAttachment, useAttachments } from './useServicesData';

export function AttachmentsPanel({ serviceId }: { serviceId: string }) {
  const confirm = useConfirm();
  const list = useAttachments(serviceId);
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: list.items.length, transient: isTransientStatus(list.errorStatus) });

  const upload = async (file: File) => {
    setUploading(true);
    try { await uploadAttachment(serviceId, file); toast.success(`${file.name} attached.`); await list.refetch(); }
    catch (e) { toast.error(`${file.name} was not attached: ${(e as Error).message}`); }
    finally { setUploading(false); }
  };
  const remove = async (id: string, name: string) => {
    if (!await confirm({ title: 'Remove this attachment?', message: `${name} is removed from storage and cannot be recovered.`, confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteAttachment(serviceId, id); toast.success(`${name} removed.`); await list.refetch(); }
    catch (e) { toast.error(`${name} was not removed: ${(e as Error).message}`); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-body-sm text-ink-muted">Completion certificates, invoices, GRVs and other supporting documents.</p>
        <Button icon="upload" pending={uploading} onClick={() => input.current?.click()}>Attach a file</Button>
        <input ref={input} type="file" hidden aria-label="File to attach" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>
      <DataRegion status={status} subject="attachments" error={list.error} onRetry={() => list.refetch()} empty={<EmptyState icon="attachment" title="No attachments yet" description="Attach the first file for this job." />}>
        <ul className="flex flex-col gap-2" aria-label="Attachments">
          {list.items.map(a => (
            <li key={a.id} className="flex items-center gap-3 rounded-control border border-line bg-surface-subtle px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-label font-medium text-ink">{a.filename}</p>
                <p className="font-sans text-caption text-ink-muted">{formatFileSize(a.file_size)}, {fmtDate(a.created_at)}</p>
              </div>
              {a.file_url
                ? <Button asChild size="sm" variant="ghost"><a href={a.file_url} target="_blank" rel="noopener noreferrer" aria-label={`Download ${a.filename}`}><Icon name="download" size="sm" />Download</a></Button>
                : <span className="font-sans text-caption text-ink-muted">Link unavailable</span>}
              <IconButton icon="delete" size="sm" variant="ghost" label={`Remove ${a.filename}`} onClick={() => remove(a.id, a.filename)} />
            </li>
          ))}
        </ul>
      </DataRegion>
    </div>
  );
}
