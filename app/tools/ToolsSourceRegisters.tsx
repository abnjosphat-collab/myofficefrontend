// app/tools/ToolsSourceRegisters.tsx — the original registers (PDF, spreadsheet, document, scan) kept permanently for reference
// while the live database is updated, and the form that uploads one.
'use client';

import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Field, Icon, Input, Notice, Select, Textarea } from '@/components/ui-system';
import { formatDateTime } from '@/lib/format';

export type SourceRegisterRecord = { id: string; department: string; notes?: string; original_name: string; content_type: string; size_bytes: number; uploaded_by: string; uploaded_at: string; url?: string };

const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function SourceRegisterForm({ departments, onSave, onCancel }: { departments: string[]; onSave: (file: File, department: string, notes: string) => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [department, setDepartment] = useState(departments[0] || 'Engineering');
  const [notes, setNotes] = useState('');
  function submit(event: FormEvent) { event.preventDefault(); if (file) onSave(file, department, notes.trim()); }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Notice title="Keep the original register">The source file is stored permanently and privately so it can be reviewed when updating the live register.</Notice>
      <Field label="Department"><Select aria-label="Source register department" value={department} onValueChange={setDepartment} options={departments.map(value => ({ value, label: value }))} /></Field>
      <Field label="Register file" description="PDF, Excel, CSV, Word, OpenDocument or a clear image. Maximum 50 MB.">
        <Input aria-label="Register file" type="file" accept=".pdf,.xlsx,.xlsm,.xls,.csv,.docx,.doc,.ods,.odt,.jpg,.jpeg,.png,.webp" onChange={event => setFile(event.target.files?.[0] || null)} />
      </Field>
      <Field label="Notes" optional><Textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="For example: Engineering opening register, received from the mechanical workshop." /></Field>
      <div className="flex justify-end gap-2 border-t border-line-subtle pt-4"><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" icon="upload" disabled={!file}>Upload register</Button></div>
    </form>
  );
}

export function ToolsSourceRegisters({ items, search, onUpload }: { items: SourceRegisterRecord[]; search: string; onUpload: () => void }) {
  const query = search.trim().toLowerCase();
  const visible = items.filter(item => !query || `${item.original_name} ${item.department} ${item.notes || ''} ${item.uploaded_by}`.toLowerCase().includes(query));
  return (
    <section className="flex flex-col gap-4" aria-label="Source registers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-body-sm text-ink-muted">Original documents kept for reference while the live database is updated.</p>
        <Button variant="primary" icon="upload" onClick={onUpload}>Upload register</Button>
      </div>
      {visible.length
        ? (
          <ul className="flex flex-col gap-3">
            {visible.map(item => (
              <li key={item.id} className="flex items-center gap-4 rounded-card border border-line-subtle bg-surface-raised p-4">
                <span className="text-ink-muted"><Icon name={item.content_type === 'application/pdf' ? 'pdf' : 'attachment'} size="lg" /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate font-sans text-body-sm font-medium text-ink">{item.original_name}</strong>
                  <p className="font-sans text-caption text-ink-muted">{item.department}{item.notes ? ` · ${item.notes}` : ''}</p>
                  <small className="font-sans text-caption text-ink-muted">{formatSize(item.size_bytes)} · Uploaded by {item.uploaded_by} · {formatDateTime(item.uploaded_at)}</small>
                </div>
                {item.url
                  ? <Button asChild icon="download"><a href={item.url} target="_blank" rel="noreferrer">Open file</a></Button>
                  : <span className="font-sans text-caption text-ink-muted">File link unavailable</span>}
              </li>
            ))}
          </ul>
        )
        : <EmptyState icon="upload" title={items.length ? 'No matching source registers' : 'No source registers yet'} description={items.length ? 'Try a different search.' : 'Upload the original PDF, spreadsheet, Word document or scan before updating the live register.'}
            action={items.length ? undefined : <Button variant="primary" onClick={onUpload}>Upload the first register</Button>} />}
    </section>
  );
}
