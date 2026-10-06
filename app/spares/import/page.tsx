// app/spares/import/page.tsx — import spares from a spreadsheet: upload, check the column mapping, import, result.
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataTable, Field, Icon, MetricGrid, MetricTile, Notice, PageHeader, Select, Spinner, StatusBadge, cn, useConfirm,
  type Column,
} from '@/components/ui-system';
import { api } from '@/lib/apiClient';
import { confidenceTone, extractRows, toBulkItem, type ExtractedRow, type Mapping } from './extract';

interface InferResult {
  inferred: { stock_code?: string; description?: string; unit_price?: string };
  confidence: { stock_code: number; description: number; unit_price: number };
  all_columns: string[];
  raw_rows: Record<string, unknown>[];
  total_rows: number;
  has_categories?: boolean;
}
interface ImportResult { created: number; updated?: number; skipped: number; errors: number; total: number }
type Mode = 'upsert' | 'skip';

const NONE = '__none__';
const FIELDS: { key: keyof Mapping; label: string; required: boolean }[] = [
  { key: 'stock_code', label: 'Stock code', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'unit_price', label: 'Unit price', required: false },
];
const STEPS = ['Upload', 'Check columns', 'Result'];
const MODES: { mode: Mode; title: string; text: string; recommended?: boolean }[] = [
  { mode: 'upsert', title: 'Update existing parts', recommended: true, text: 'New parts are added. Parts whose stock code already exists get the description, price and category from this file. Their stock on hand, limits, priority and supplier are kept.' },
  { mode: 'skip', title: 'Skip existing parts', text: 'Only parts whose stock code is not already in the register are added. Existing parts are left exactly as they are.' },
];

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-label" aria-label="Import steps">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined} className={cn('flex items-center gap-2', i === current ? 'font-semibold text-ink' : 'text-ink-muted')}>
          <span className={cn('inline-flex size-6 items-center justify-center rounded-full border text-caption', i < current ? 'border-success bg-success-soft text-success' : i === current ? 'border-action bg-action text-action-ink' : 'border-line-control')}>
            {i < current ? <Icon name="check" size="xs" weight="emphasis" /> : i + 1}
          </span>
          {s}{i < STEPS.length - 1 && <Icon name="chevron-right" size="xs" className="text-ink-subtle" />}
        </li>
      ))}
    </ol>
  );
}

function SpareImportContent() {
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [infer, setInfer] = useState<InferResult | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ stock_code: '', description: '', unit_price: '' });
  const [mode, setMode] = useState<Mode>('upsert');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const extracted = useMemo<ExtractedRow[]>(() => (infer && mapping.stock_code && mapping.description ? extractRows(infer.raw_rows, mapping) : []), [infer, mapping]);
  const valid = useMemo(() => extracted.filter(r => r.valid), [extracted]);
  const invalid = extracted.length - valid.length;
  const step = !infer ? 0 : result ? 2 : 1;

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name); setInfer(null); setResult(null); setUploadError(null); setUploading(true);
    try {
      const body = new FormData(); body.append('file', file);
      const data = await api.post<InferResult>('/api/spares/infer', body);
      setInfer(data);
      setMapping({ stock_code: data.inferred.stock_code || '', description: data.inferred.description || '', unit_price: data.inferred.unit_price || '' });
    } catch (e) { setUploadError((e as Error).message); setFileName(''); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }, []);

  const reset = () => { setInfer(null); setFileName(''); setResult(null); setUploadError(null); setImportError(null); setMapping({ stock_code: '', description: '', unit_price: '' }); };

  const doImport = async () => {
    setImporting(true); setImportError(null);
    try {
      const data = await api.post<ImportResult>('/api/spares/bulk', { items: valid.map(toBulkItem), skip_existing: mode === 'skip', upsert: mode === 'upsert' });
      setResult(data);
      toast.success(`${data.created} added, ${data.updated ?? 0} updated.`);
    } catch (e) { setImportError((e as Error).message); }
    finally { setImporting(false); }
  };
  const runImport = async () => {
    if (valid.length === 0) return;
    const ok = await confirm({
      title: `Import ${valid.length} ${valid.length === 1 ? 'part' : 'parts'}?`,
      message: mode === 'upsert' ? 'New parts are added and existing parts get this file’s description, price and category. Stock on hand and supplier are kept.' : 'Only parts that are not already in the register are added.',
      confirmLabel: 'Import',
    });
    if (ok) await doImport();
  };

  const columns: Column<ExtractedRow & { n: number }>[] = [
    { id: 'n', header: '#', width: '3rem', cell: r => <span className="tabular text-ink-muted">{r.n}</span> },
    { id: 'stock_code', header: 'Stock code', cell: r => (r.stock_code ? <span className="font-mono">{r.stock_code}</span> : <StatusBadge tone="danger" icon="warning">Missing</StatusBadge>) },
    { id: 'description', header: 'Description', cell: r => (r.description ? <span className="line-clamp-2">{r.description}</span> : <StatusBadge tone="danger" icon="warning">Missing</StatusBadge>) },
    { id: 'unit_price', header: 'Unit price', numeric: true, cell: r => (r.unit_price === null ? <span className="text-ink-muted">Kept as is</span> : <span className="tabular">{r.unit_price.toFixed(2)}</span>) },
    ...(infer?.has_categories ? [{ id: 'category', header: 'Category', hideBelow: 'md' as const, cell: (r: ExtractedRow) => r.category || <span className="text-ink-muted">None</span> }] : []),
  ];
  const preview = extracted.slice(0, 30).map((r, i) => ({ ...r, n: i + 1 }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Spares', href: '/spares' }, { label: 'Import' }]}
        title="Import spares from a spreadsheet"
        description="The server reads the file and works out which column is the stock code, description and price. You check the columns before anything is saved."
        actions={<Button asChild><Link href="/spares">Back to spares</Link></Button>}
      />
      <Steps current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          {uploadError && <Notice tone="danger" title="The file could not be read">{uploadError}</Notice>}
          <div
            role="button" tabIndex={0} aria-busy={uploading}
            aria-label="Upload a spares file. Drop a file here or press Enter to browse."
            onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => !uploading && fileRef.current?.click()}
            onKeyDown={e => { if (!uploading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileRef.current?.click(); } }}
            className={cn('focus-ring flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-16 text-center transition-colors', dragging ? 'border-action bg-action-soft' : 'border-line-control bg-surface hover:bg-surface-subtle')}
          >
            {uploading ? (<><Spinner className="size-8 text-action" /><p className="font-sans text-body font-medium text-ink">Reading {fileName || 'the file'}…</p></>) : (
              <>
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><Icon name="upload" size="xl" /></span>
                <div><p className="font-display text-title font-semibold text-ink">Drop your file here</p><p className="mt-1 font-sans text-body-sm text-ink-muted">or choose one to browse. Excel (.xlsx, .xls) or CSV, up to 25 MB.</p></div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" aria-label="Spares file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          <Notice tone="info" title="How the columns are found">The server looks at the column headings and at the values in each column. Bold rows in an Excel sheet are read as category headings. You can correct any column on the next step.</Notice>
        </div>
      )}

      {step === 1 && infer && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4">
            <Icon name="documents" size="lg" className="text-ink-muted" />
            <div className="min-w-0 flex-1"><p className="truncate font-sans text-label font-medium text-ink">{fileName}</p><p className="font-sans text-caption text-ink-muted">{infer.total_rows} rows, {infer.all_columns.length} columns{infer.has_categories ? ', categories found' : ''}</p></div>
            <Button icon="close" onClick={reset}>Choose another file</Button>
          </div>

          <section aria-labelledby="map-h" className="flex flex-col gap-3">
            <div><h2 id="map-h" className="font-display text-section font-semibold text-ink">Column mapping</h2><p className="font-sans text-body-sm text-ink-muted">Correct any column that was picked wrongly.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FIELDS.map(f => {
                const conf = confidenceTone(infer.confidence[f.key]);
                return (
                  <div key={f.key} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                    <Field label={f.label} required={f.required} optional={!f.required}>
                      <Select aria-label={`${f.label} column`} value={mapping[f.key] || NONE} onValueChange={v => setMapping(m => ({ ...m, [f.key]: v === NONE ? '' : v }))}
                        options={[{ value: NONE, label: f.required ? 'Choose a column' : 'No column (leave prices as they are)' }, ...infer.all_columns.map(c => ({ value: c, label: c }))]} />
                    </Field>
                    {mapping[f.key] && <div><StatusBadge tone={conf.tone}>{conf.label} confidence</StatusBadge></div>}
                  </div>
                );
              })}
            </div>
            {(!mapping.stock_code || !mapping.description) && <Notice tone="warning" title="Choose the stock code and description columns">Nothing can be imported until both are chosen.</Notice>}
          </section>

          <section aria-labelledby="mode-h" className="flex flex-col gap-3">
            <h2 id="mode-h" className="font-display text-section font-semibold text-ink">If a stock code is already in the register</h2>
            <div role="radiogroup" aria-labelledby="mode-h" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MODES.map(m => (
                <button key={m.mode} type="button" role="radio" aria-checked={mode === m.mode} onClick={() => setMode(m.mode)}
                  className={cn('focus-ring flex flex-col gap-1.5 rounded-card border p-4 text-left transition-colors', mode === m.mode ? 'border-action bg-action-soft/60' : 'border-line bg-surface hover:bg-surface-subtle')}>
                  <span className="flex flex-wrap items-center gap-2 font-sans text-label font-semibold text-ink"><Icon name={mode === m.mode ? 'success' : 'pending'} size="md" weight={mode === m.mode ? 'emphasis' : 'control'} className={mode === m.mode ? 'text-action' : 'text-ink-muted'} />{m.title}{m.recommended && <StatusBadge tone="brand">Recommended</StatusBadge>}</span>
                  <span className="font-sans text-body-sm text-ink-muted">{m.text}</span>
                </button>
              ))}
            </div>
          </section>

          {extracted.length > 0 && (
            <section aria-labelledby="prev-h" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="prev-h" className="font-display text-section font-semibold text-ink">Preview{extracted.length > 30 ? ' (first 30 rows)' : ''}</h2>
                <StatusBadge tone="success">{valid.length} ready to import</StatusBadge>
                {invalid > 0 && <StatusBadge tone="danger" icon="warning">{invalid} skipped: no stock code or description</StatusBadge>}
              </div>
              <DataTable caption="Spares import preview" rows={preview} columns={columns} getRowId={r => String(r.n)} />
              {extracted.length > 30 && <p className="font-sans text-caption text-ink-muted">Showing 30 of {extracted.length} rows. All {valid.length} valid rows are imported.</p>}
            </section>
          )}

          {importError && <Notice tone="danger" title="The import failed" action={<Button size="sm" icon="refresh" onClick={doImport}>Try again</Button>}>{importError} Nothing is shown as imported; check the register before trying again, because part of the file may have been saved.</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={reset}>Cancel</Button>
            <Button variant="primary" icon="upload" pending={importing} disabled={valid.length === 0} onClick={runImport}>{`Import ${valid.length} ${valid.length === 1 ? 'part' : 'parts'}`}</Button>
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="flex flex-col gap-4">
          <MetricGrid compact>
            <MetricTile compact label="Added" tone="success" value={result.created} />
            <MetricTile compact label="Updated" value={result.updated ?? 0} />
            <MetricTile compact label="Skipped" value={result.skipped} />
            <MetricTile compact label="Errors" tone={result.errors ? 'danger' : 'default'} value={result.errors} />
            <MetricTile compact label="In the file" value={result.total} />
          </MetricGrid>
          {result.errors > 0 && <Notice tone="warning" title={`${result.errors} ${result.errors === 1 ? 'row' : 'rows'} could not be saved`}>The rest were saved. Check the register for the missing parts, or ask for the server log to see which rows failed.</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button icon="refresh" onClick={reset}>Import another file</Button>
            <Button asChild variant="primary"><Link href="/spares">View spares</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpareImportPage() {
  return <AppShell migrated><SpareImportContent /></AppShell>;
}
