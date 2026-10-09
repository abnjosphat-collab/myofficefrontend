// app/timesheets/necImport/NecScanImportPanel.tsx — import scanned NEC timesheets for one cycle in four steps: create the job, upload the PDF
// scans and the validated review JSON, preview what would change (with the exceptions listed), then apply. A dry run changes nothing.
// Payroll rules and the grid's totals are unchanged: an import writes attendance rows only, and Leaves and Overtime stay authoritative.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Field, Input, MetricGrid, MetricTile, Notice } from '@/components/ui-system';
import type { Period } from '../types';
import * as necApi from './api';
import type { NecImportJob, NecImportPreview } from './types';
import { formatDate } from '@/lib/format';

type Step = 'setup' | 'upload' | 'review' | 'done';
const payrollMonthFromPeriod = (period: Period) => ({ year: period.end.getFullYear(), month: period.end.getMonth() + 1 });
const say = (e: unknown) => (e instanceof Error ? e.message : 'It did not work.');

export function NecScanImportPanel({ period, open, onClose, onApplied }: { period: Period; open: boolean; onClose: () => void; onApplied?: () => void }) {
  const [step, setStep] = useState<Step>('setup');
  const [job, setJob] = useState<NecImportJob | null>(null);
  const [preview, setPreview] = useState<NecImportPreview | null>(null);
  const [configNote, setConfigNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const pm = useMemo(() => payrollMonthFromPeriod(period), [period]);

  useEffect(() => {
    if (!open) return;
    necApi.fetchImportConfig().then(c => setConfigNote(c.requires_review_json_upload
      ? 'Upload the scanned PDFs, then attach the validated review JSON for this period (the same schema as the NEC import preparation). Automatic extraction can be enabled on the server with NEC_IMPORT_EXTRACTION_PROVIDER.'
      : `Extraction provider: ${c.extraction_provider}`)).catch(() => setConfigNote(''));
  }, [open]);

  const run = useCallback(async (work: () => Promise<void>) => { setBusy(true); setError(null); setInfo(null); try { await work(); } catch (e) { setError(say(e)); } finally { setBusy(false); } }, []);
  const startJob = () => run(async () => { const j = await necApi.createImportJob(pm.year, pm.month); setJob(j); setStep('upload'); setInfo('Import job created.'); });
  const onPdf = (files: FileList | null) => run(async () => { if (!job || !files?.length) return; for (const f of Array.from(files)) await necApi.uploadPdf(job.id, f); setJob(await necApi.getImportJob(job.id)); setInfo('PDF uploaded.'); });
  const onReviewJson = (files: FileList | null) => run(async () => { if (!job || !files?.[0]) return; await necApi.uploadReviewJson(job.id, files[0]); setJob(await necApi.getImportJob(job.id)); setInfo('Review JSON attached.'); });
  const loadPreview = () => run(async () => { if (!job) return; const res = await necApi.fetchPreview(job.id); setJob(res.job); setPreview(res.preview); setStep('review'); });
  const apply = (dryRun: boolean) => run(async () => {
    if (!job) return;
    const res = await necApi.applyImport(job.id, dryRun);
    const stats = Object.entries(res.stats ?? {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ');
    if (dryRun) setInfo(`Dry run complete, nothing was changed.${stats ? ` ${stats}.` : ''}`);
    else { setStep('done'); onApplied?.(); }
  });

  const exceptions = preview?.line_items.filter(x => x.kind === 'unresolved' || x.kind === 'exception') ?? [];
  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose(); }} size="xl" title="Import scanned NEC timesheets" description={`Period ${formatDate(period.start)} to ${formatDate(period.end)}.`}>
      <div className="flex flex-col gap-4">
        <Notice tone="info" title="What an import changes">Payroll rules and the grid&apos;s totals are unchanged. An import writes attendance rows only; Leaves and Overtime stay authoritative.</Notice>
        {configNote && <p className="font-sans text-body-sm text-ink-muted">{configNote}</p>}
        {error && <Notice tone="danger" title="That did not work">{error}</Notice>}
        {info && <Notice tone="info" icon="success" title={info} />}

        {step === 'setup' && (
          <section aria-label="Start" className="flex flex-col gap-3">
            <p className="font-sans text-body text-ink">Create an import job for this NEC cycle, then upload the PDF scans and the validated review JSON.</p>
            <div><Button variant="primary" pending={busy} onClick={startJob}>Start import for this period</Button></div>
          </section>
        )}

        {step === 'upload' && job && (
          <section aria-label="Upload" className="flex flex-col gap-4">
            <p className="font-sans text-caption text-ink-muted">Job {job.id.slice(0, 8)}, status {job.status}</p>
            <Field label="PDF scans" description="One or more PDF files."><Input type="file" accept="application/pdf" multiple disabled={busy} onChange={e => { void onPdf(e.target.files); e.target.value = ''; }} /></Field>
            <Field label="Review JSON" description="The validated review file for this period."><Input type="file" accept=".json,application/json" disabled={busy} onChange={e => { void onReviewJson(e.target.files); e.target.value = ''; }} /></Field>
            {job.documents.length > 0 && <ul className="list-disc pl-5 font-sans text-body-sm text-ink-muted" aria-label="Uploaded files">{job.documents.map(d => <li key={d.id}>{d.filename}{d.duplicate_of_upload ? ' (duplicate)' : ''}</li>)}</ul>}
            <div><Button icon="refresh" pending={busy} disabled={busy || !job.review_json_path} onClick={loadPreview}>Preview changes</Button>{!job.review_json_path && <span className="ml-3 font-sans text-caption text-ink-muted">Attach the review JSON first.</span>}</div>
          </section>
        )}

        {step === 'review' && preview && (
          <section aria-label="Preview" className="flex flex-col gap-4">
            <MetricGrid columns={4}>{Object.entries(preview.stats).map(([k, v]) => <MetricTile key={k} label={k.replace(/_/g, ' ')} value={String(v)} />)}</MetricGrid>
            {preview.missing_sheets.length > 0 && <Notice tone="warning" title={`${preview.missing_sheets.length} NEC ${preview.missing_sheets.length === 1 ? 'employee has' : 'employees have'} no matched sheet`} />}
            {preview.duplicate_sheet_groups.length > 0 && <Notice tone="warning" title="Duplicate sheet groups">Mark the superseded ones in the review JSON before applying: {preview.duplicate_sheet_groups.map(g => g.key).join(', ')}.</Notice>}
            <div className="max-h-72 overflow-auto rounded-control border border-line">
              <table className="w-full border-collapse font-sans text-caption">
                <caption className="sr-only">Exceptions found in the import</caption>
                <thead className="sticky top-0 bg-surface-muted"><tr className="text-left text-ink-muted"><th scope="col" className="px-3 py-2">Date</th><th scope="col" className="px-3 py-2">Code</th><th scope="col" className="px-3 py-2">Kind</th><th scope="col" className="px-3 py-2">Reason</th></tr></thead>
                <tbody>
                  {exceptions.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-ink-muted">No exceptions.</td></tr>}
                  {exceptions.slice(0, 80).map((row, i) => <tr key={`${row.date}-${i}`} className="border-t border-line-subtle"><td className="px-3 py-1.5 tabular">{row.date}</td><td className="px-3 py-1.5">{row.human_code}</td><td className="px-3 py-1.5">{row.kind}</td><td className="px-3 py-1.5 text-ink-muted [overflow-wrap:anywhere]">{row.reason}</td></tr>)}
                </tbody>
              </table>
            </div>
            {exceptions.length > 80 && <p className="font-sans text-caption text-ink-muted">Showing 80 of {exceptions.length} exceptions.</p>}
            <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => apply(true)}>Dry-run apply</Button><Button variant="primary" icon="check" pending={busy} disabled={busy} onClick={() => apply(false)}>Apply validated rows</Button></div>
          </section>
        )}

        {step === 'done' && (
          <section aria-label="Done" className="flex flex-col gap-3">
            <Notice tone="info" icon="success" title="Import batch saved">Reload the grid to reconcile it with the Leaves and Overtime overlays.</Notice>
            <div><Button onClick={onClose}>Close</Button></div>
          </section>
        )}
      </div>
    </Dialog>
  );
}
