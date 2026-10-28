'use client';

import { createContext, useCallback, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Dialog as SharedDialog, Icon, IconButton, MarkDirtyProvider, useDismissGuard } from '@/components/ui-system';
import { attachmentError, type Evidence } from './prototype';

export type FontChoice = 'inter' | 'manrope' | 'jakarta';
export type FontSizeChoice = number;
export const ToolsPreferences = createContext({ font: 'inter' as FontChoice, fontSize: 100 as FontSizeChoice, guidance: true });

/** The shared Dialog (focus trap, focus return, dismissal rules); a wide one for forms with many fields. Unsaved input asks before it closes, like FormDialog. */
export function ToolsDialog({ open, onClose, title, description, wide = false, dismissible = true, zoomId, children }: { open: boolean; onClose: () => void; title: string; description: string; wide?: boolean; dismissible?: boolean; zoomId?: string; children: ReactNode }) {
  // Dirtiness is recorded against the dialog it was typed into (open state + form kind): a reopen or a kind
  // switch derives pristine without any reset, so stale dirt can neither leak across forms nor race a reset.
  const dialogKey = `${open}:${title}`;
  const [guard, setGuard] = useState({ key: dialogKey, dirty: false });
  const autoDirty = guard.key === dialogKey && guard.dirty;
  const markDirty = useCallback(() => setGuard({ key: dialogKey, dirty: true }), [dialogKey]);
  const markIfData = (event: FormEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-combobox-search]')) return;
    if (target instanceof HTMLInputElement && target.type === 'search') return;
    markDirty();
  };
  const { guardClose } = useDismissGuard({ when: autoDirty, message: 'Entries in this form are not saved yet.' });
  // No busy concept here on purpose (unlike FormDialog): every Tools save is workspace-owned, so discarding mid-save still lands it with a toast.
  const close = () => guardClose(onClose);
  return <SharedDialog open={open} onOpenChange={value => { if (!value) close(); }} dismissible={dismissible} title={title} description={description} size={wide ? 'lg' : 'md'} focusTitle zoomId={zoomId}><div onChange={markIfData} className="contents"><MarkDirtyProvider value={markDirty}>{children}</MarkDirtyProvider></div></SharedDialog>;
}

export type AddEvidence = (files: File[]) => Evidence[];
export function EvidencePicker({ value, onChange, addFiles, toolPhoto = false }: { value: Evidence[]; onChange: (files: Evidence[]) => void; addFiles: AddEvidence; toolPhoto?: boolean }) {
  const inputId = useId();
  const [error, setError] = useState('');
  function receive(files: File[]) {
    if (value.length + files.length > 6) { setError('Keep up to 6 attachments per record.'); return; }
    const invalid = files.map(attachmentError).find(Boolean);
    if (invalid) { setError(invalid); return; }
    setError(''); onChange([...value, ...addFiles(files)]);
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-label font-medium text-ink">{toolPhoto ? 'Tool photograph & records' : 'Photos & documents'}</span>
        <span className="font-sans text-caption text-ink-muted">Optional</span>
      </div>
      <label htmlFor={inputId} className="focus-within:ring-2 focus-within:ring-focus flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line px-4 py-3 transition-colors hover:border-action hover:bg-surface-subtle">
        <Icon name={toolPhoto ? 'image' : 'upload'} size="md" />
        <span className="min-w-0 flex-1">
          <strong className="block font-sans text-body-sm font-medium text-ink">{toolPhoto ? 'Add a tool photograph or PDF' : 'Add photos or a PDF'}</strong>
          <small className="block font-sans text-caption text-ink-muted">{toolPhoto ? 'The first image becomes the register photo · ' : ''}Up to 6 files · original-quality photos</small>
        </span>
        <Icon name="plus" size="sm" />
        <input id={inputId} className="sr-only" aria-label="Attach photos or PDF" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
          onChange={e => { receive(Array.from(e.target.files || [])); e.target.value = ''; }} />
      </label>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map(file => (
            <li key={file.id} className="flex items-center gap-3 rounded-control border border-line-subtle px-3 py-1.5">
              <Icon name={file.type === 'application/pdf' ? 'pdf' : 'image'} size="sm" />
              <span className="min-w-0 flex-1"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{file.name}</strong><small className="font-sans text-caption text-ink-muted">{Math.max(1, Math.round(file.size / 1024))} KB</small></span>
              <IconButton icon="close" label={`Remove ${file.name}`} variant="ghost" onClick={() => onChange(value.filter(f => f.id !== file.id))} />
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

export function EvidenceGallery({ files }: { files: Evidence[] }) {
  const [preview, setPreview] = useState<Evidence | null>(null);
  const [zoom, setZoom] = useState(1);
  const changeZoom = (amount: number) => setZoom(current => Math.min(4, Math.max(1, Number((current + amount).toFixed(2)))));
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {files.map(file => file.type === 'application/pdf'
          ? <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.name} in a new tab`} className="focus-ring flex items-center gap-2 rounded-control border border-line-subtle px-3 py-2 font-sans text-caption text-ink hover:border-action"><Icon name="pdf" size="sm" /><span className="min-w-0 flex-1 truncate">{file.name}</span><Icon name="link" size="xs" /></a>
          : (
            <button key={file.id} type="button" aria-label={`View image ${file.name}`} onClick={() => { setPreview(file); setZoom(1); }} className="focus-ring group overflow-hidden rounded-control border border-line-subtle text-left hover:border-action">
              {/* Local object URLs are intentionally not passed to the remote image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block truncate px-2 py-1 font-sans text-caption text-ink-muted">{file.name}</span>
            </button>
          ))}
      </div>
      <SharedDialog open={!!preview} onOpenChange={open => { if (!open) { setPreview(null); setZoom(1); } }} title={preview?.name || 'Photograph'} description="Attached photograph preview" size="xl"
        footer={(
          <>
            <span className="mr-auto font-sans text-caption text-ink-muted">Scroll or double-click to zoom</span>
            <IconButton icon="zoom-out" label="Zoom out" variant="ghost" disabled={zoom <= 1} onClick={() => changeZoom(-0.25)} />
            <Button variant="ghost" aria-label="Reset image zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</Button>
            <IconButton icon="zoom-in" label="Zoom in" variant="ghost" disabled={zoom >= 4} onClick={() => changeZoom(0.25)} />
          </>
        )}>
        <div role="button" tabIndex={0} aria-label="Image zoom area. Double-click or press Enter to zoom." className="focus-ring max-h-[65vh] overflow-auto rounded-control bg-surface-subtle"
          onWheel={event => { changeZoom(event.deltaY < 0 ? 0.25 : -0.25); }} onDoubleClick={() => setZoom(current => (current === 1 ? 2 : 1))}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setZoom(current => (current === 1 ? 2 : 1)); } if (event.key === '+' || event.key === '=') changeZoom(0.25); if (event.key === '-') changeZoom(-0.25); if (event.key === '0') setZoom(1); }}>
          <div style={{ width: `${zoom * 100}%` }}>
            {preview && /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview.url} alt={`Full view of ${preview.name}`} className="h-auto w-full" />}
          </div>
        </div>
      </SharedDialog>
    </>
  );
}
