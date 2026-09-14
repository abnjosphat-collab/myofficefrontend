'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, CheckCircle, AlertTriangle, RefreshCw } from '@/components/shared/theme';
import { CenterModal, useTheme, accentText, TYPE_WEIGHT } from '@/components/shared/theme';
import { toast } from 'sonner';
import type { Period } from '../types';
import * as necApi from './api';
import type { NecImportJob, NecImportPreview } from './types';

type Step = 'setup' | 'upload' | 'review' | 'done';

function payrollMonthFromPeriod(period: Period): { year: number; month: number } {
  return { year: period.end.getFullYear(), month: period.end.getMonth() + 1 };
}

export function NecScanImportPanel({
  period,
  open,
  onClose,
  onApplied,
}: {
  period: Period;
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const t = useTheme();
  const [step, setStep] = useState<Step>('setup');
  const [job, setJob] = useState<NecImportJob | null>(null);
  const [preview, setPreview] = useState<NecImportPreview | null>(null);
  const [configNote, setConfigNote] = useState('');
  const [busy, setBusy] = useState(false);
  const pm = useMemo(() => payrollMonthFromPeriod(period), [period]);

  useEffect(() => {
    if (!open) return;
    necApi.fetchImportConfig().then(c => {
      setConfigNote(
        c.requires_review_json_upload
          ? 'Upload scanned PDFs, then attach the validated review JSON for this period (same schema as NEC import preparation). Automated vision extraction can be enabled server-side via NEC_IMPORT_EXTRACTION_PROVIDER.'
          : `Extraction provider: ${c.extraction_provider}`,
      );
    }).catch(() => setConfigNote(''));
  }, [open]);

  const startJob = useCallback(async () => {
    setBusy(true);
    try {
      const j = await necApi.createImportJob(pm.year, pm.month);
      setJob(j);
      setStep('upload');
      toast.success('Import job created');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [pm.month, pm.year]);

  const onPdf = async (files: FileList | null) => {
    if (!job || !files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        await necApi.uploadPdf(job.id, f);
      }
      const refreshed = await necApi.getImportJob(job.id);
      setJob(refreshed);
      toast.success('PDF uploaded');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onReviewJson = async (files: FileList | null) => {
    if (!job || !files?.[0]) return;
    setBusy(true);
    try {
      await necApi.uploadReviewJson(job.id, files[0]);
      const refreshed = await necApi.getImportJob(job.id);
      setJob(refreshed);
      toast.success('Review JSON attached');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const loadPreview = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const res = await necApi.fetchPreview(job.id);
      setJob(res.job);
      setPreview(res.preview);
      setStep('review');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runApply = async (dryRun: boolean) => {
    if (!job) return;
    setBusy(true);
    try {
      const res = await necApi.applyImport(job.id, dryRun);
      toast.success(dryRun ? 'Dry-run complete' : 'Import applied');
      if (!dryRun) {
        setStep('done');
        onApplied?.();
      }
      return res.stats;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const exceptions = preview?.line_items.filter(x => x.kind === 'unresolved' || x.kind === 'exception') ?? [];

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title="Import scanned NEC timesheets"
      accent="indigo"
      width="max-w-4xl"
    >
      <p className={`text-xs mb-4 ${t.textMuted}`}>
        Period {period.start.toLocaleDateString('en-GB')} – {period.end.toLocaleDateString('en-GB')}. Payroll rules and grid totals are unchanged — import writes attendance rows only; Leaves and Overtime modules stay authoritative.
      </p>
      {configNote && <p className={`text-xs mb-3 ${accentText('amber', t.light)}`}>{configNote}</p>}

      {step === 'setup' && (
        <div className="space-y-4">
          <p className={`text-sm ${t.textPrimary}`}>Create an import job for this NEC cycle, then upload PDF scans and the validated review JSON.</p>
          <Button disabled={busy} onClick={startJob} className="bg-brand-600 hover:bg-brand-700 text-white">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Start import for this period
          </Button>
        </div>
      )}

      {step === 'upload' && job && (
        <div className="space-y-5">
          <div className={`text-xs ${t.textFaint}`}>Job {job.id.slice(0, 8)}… · status {job.status}</div>
          <label className={`flex flex-col gap-2 p-4 rounded-xl border border-dashed ${t.border} cursor-pointer ${t.hoverBg}`}>
            <span className={`flex items-center gap-2 text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}><Upload className="w-4 h-4" /> Upload PDF scan(s)</span>
            <input type="file" accept="application/pdf" multiple className="text-xs" onChange={e => { void onPdf(e.target.files); e.target.value = ''; }} />
          </label>
          <label className={`flex flex-col gap-2 p-4 rounded-xl border border-dashed ${t.border} cursor-pointer ${t.hoverBg}`}>
            <span className={`flex items-center gap-2 text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}><FileText className="w-4 h-4" /> Upload review JSON</span>
            <input type="file" accept=".json,application/json" className="text-xs" onChange={e => { void onReviewJson(e.target.files); e.target.value = ''; }} />
          </label>
          {job.documents.length > 0 && (
            <ul className={`text-xs ${t.textMuted} list-disc pl-5`}>
              {job.documents.map(d => <li key={d.id}>{d.filename}{d.duplicate_of_upload ? ' (duplicate)' : ''}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !job.review_json_path} onClick={() => void loadPreview()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Preview changes
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && preview && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {Object.entries(preview.stats).map(([k, v]) => (
              <div key={k} className={`rounded-lg p-2 ${t.chipBg}`}>
                <div className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{v}</div>
                <div className={t.textFaint}>{k}</div>
              </div>
            ))}
          </div>
          {preview.missing_sheets.length > 0 && (
            <div className={`rounded-lg p-3 ${accentText('amber', t.light)} bg-amber-500/10 text-xs`}>
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {preview.missing_sheets.length} NEC employee(s) with no matched sheet
            </div>
          )}
          {preview.duplicate_sheet_groups.length > 0 && (
            <div className={`rounded-lg p-3 text-xs ${t.textMuted}`}>
              Duplicate sheet groups — mark superseded in review JSON before apply:{' '}
              {preview.duplicate_sheet_groups.map(g => g.key).join(', ')}
            </div>
          )}
          <table className="w-full text-[11px]">
            <thead><tr className={t.textFaint}><th className="text-left py-1">Date</th><th className="text-left">Code</th><th className="text-left">Kind</th><th className="text-left">Reason</th></tr></thead>
            <tbody>
              {exceptions.slice(0, 80).map((row, i) => (
                <tr key={`${row.date}-${i}`} className="border-t border-white/5">
                  <td className="py-1">{row.date}</td>
                  <td>{row.human_code}</td>
                  <td>{row.kind}</td>
                  <td className={t.textMuted}>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {exceptions.length > 80 && <p className={`text-xs ${t.textFaint}`}>Showing 80 of {exceptions.length} exceptions</p>}
          <div className="flex flex-wrap gap-2 pt-2 sticky bottom-0 bg-inherit">
            <Button variant="outline" disabled={busy} onClick={() => void runApply(true)}>Dry-run apply</Button>
            <Button disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => void runApply(false)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Apply validated rows
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className={`text-sm ${t.textPrimary}`}>
          <CheckCircle className="w-5 h-5 text-emerald-400 inline mr-2" />
          Import batch saved. Reload the grid to reconcile with Leaves/Overtime overlays.
          <Button className="mt-4" variant="outline" onClick={onClose}>Close</Button>
        </div>
      )}
    </CenterModal>
  );
}
