// app/maintenance/import/EmaintImportFlow.tsx — M7: one eMaint import flow
// (assets or PM schedules): upload, check the columns, match to the register,
// import, result. The server reads the file and decides every row; this page
// shows those decisions and sends the user's confirmation.
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, DataTable, Field, Icon, LoadingPulse, MetricGrid, MetricTile, Notice, PageHeader, Select, StatusBadge, cn, useConfirm, type Column } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { api } from '@/lib/apiClient';
import { fileProblem } from '@/lib/files';
import { exportFilename } from '@/lib/exportUtils';
import { IMPORT_CONFIGS, downloadTextFile, pluralize, templateCsv, type ImportKind, type ImportKindConfig } from './emaintImport';

// Mirrors emaint_import.py (25 MB, SPREADSHEET_EXTS).
const SPREADSHEET_RULES = { maxBytes: 25 * 1024 * 1024, extensions: ['csv', 'tsv', 'xls', 'xlsx'] };
const NONE = '__none__';
const STEPS = ['Upload', 'Check and match', 'Result'];
const PREVIEW_LIMIT = 30;

interface InferResult {
  inferred: Record<string, string | undefined>;
  confidence: Record<string, number>;
  all_columns: string[];
  raw_rows: Record<string, unknown>[];
  total_rows: number;
}

type PreviewStatus = 'new' | 'exists' | 'close' | 'invalid';
interface PreviewRow {
  row: number;
  ref: string;
  status: PreviewStatus;
  values: Record<string, unknown>;
  errors: string[];
  match: { id: number; name: string; equipment_id?: string } | null;
  note: string;
}
interface PreviewResult {
  rows: PreviewRow[];
  summary: Record<PreviewStatus, number>;
}

type CommitStatus = 'created' | 'exists' | 'close' | 'invalid' | 'error';
interface CommitRow {
  row: number;
  ref: string;
  status: CommitStatus;
  id: number | null;
  reasons: string[];
}
interface CommitResult {
  created: number;
  skipped: number;
  errors: number;
  total: number;
  rows: CommitRow[];
}

const STATUS_META: Record<PreviewStatus, { label: string; tone: 'success' | 'neutral' | 'warning' | 'danger' }> = {
  new: { label: 'Will import', tone: 'success' },
  exists: { label: 'Already there — skipped', tone: 'neutral' },
  close: { label: 'Near miss — held', tone: 'warning' },
  invalid: { label: 'Cannot import', tone: 'danger' },
};

function confidenceBadge(c: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (c >= 1) return { label: 'Exact heading', tone: 'success' };
  if (c >= 0.8) return { label: 'Known alias', tone: 'success' };
  return { label: 'Not found', tone: 'danger' };
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

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

function rowTitle(kind: ImportKind, values: Record<string, unknown>): string {
  return kind === 'assets' ? str(values.name) : str(values.title);
}

export function EmaintImportFlow({ kind }: { kind: ImportKind }) {
  const config: ImportKindConfig = IMPORT_CONFIGS[kind];
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [infer, setInfer] = useState<InferResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);

  const step = !infer ? 0 : result ? 2 : 1;
  const missingRequired = config.fields.filter(f => f.required && !mapping[f.key]);
  const newCount = preview?.summary.new ?? 0;

  const setMappingAndClear = useCallback((key: string, column: string) => {
    setMapping(m => ({ ...m, [key]: column }));
    setPreview(null); // a changed column means new matches: check again
    setMatchError(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name); setInfer(null); setResult(null); setUploadError(null);
    setPreview(null); setMatchError(null); setImportError(null);
    const problem = fileProblem(file, SPREADSHEET_RULES);
    if (problem) { setUploadError(problem); setFileName(''); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append('file', file);
      const data = await api.post<InferResult>(`${config.basePath}/infer`, body);
      setInfer(data);
      const next: Record<string, string> = {};
      for (const f of config.fields) next[f.key] = data.inferred[f.key] || '';
      setMapping(next);
    } catch (e) { setUploadError((e as Error).message); setFileName(''); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }, [config]);

  const reset = () => {
    setInfer(null); setFileName(''); setResult(null); setUploadError(null);
    setImportError(null); setPreview(null); setMatchError(null); setMapping({});
  };

  const checkMatches = async () => {
    if (!infer || missingRequired.length > 0) return;
    setMatching(true); setMatchError(null);
    try {
      const data = await api.post<PreviewResult>(`${config.basePath}/preview`, { rows: infer.raw_rows, mapping });
      setPreview(data);
    } catch (e) { setMatchError((e as Error).message); }
    finally { setMatching(false); }
  };

  const doImport = async () => {
    if (!infer) return;
    setImporting(true); setImportError(null);
    try {
      const data = await api.post<CommitResult>(`${config.basePath}/commit`, { rows: infer.raw_rows, mapping });
      setResult(data);
      toast.success(`${data.created} ${data.created === 1 ? config.unit[0] : config.unit[1]} imported.`);
    } catch (e) { setImportError((e as Error).message); }
    finally { setImporting(false); }
  };

  const runImport = async () => {
    if (newCount === 0) return;
    const ok = await confirm({
      title: `Import ${pluralize(newCount, config.unit)}?`,
      message: kind === 'assets'
        ? 'New machines are added to the register. Machines already there are left exactly as they are; near misses and invalid rows are not imported.'
        : 'New PM schedules are created for their register machines. PMs already scheduled, unknown machines and invalid rows are not imported.',
      confirmLabel: 'Import',
    });
    if (ok) await doImport();
  };

  const previewColumns: Column<PreviewRow>[] = useMemo(() => {
    const matchCell = (r: PreviewRow) => (r.match ? <span>{r.match.name}{r.match.equipment_id ? <span className="text-ink-muted"> ({r.match.equipment_id})</span> : null}</span> : <span className="text-ink-muted">None</span>);
    const statusCell = (r: PreviewRow) => {
      const meta = STATUS_META[r.status];
      return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
    };
    const detailCell = (r: PreviewRow) => {
      if (r.errors.length > 0) return <span>{r.errors.join(' ')}</span>;
      const held = (r.values.held ?? {}) as Record<string, string>;
      const heldKeys = Object.entries(held).filter(([, v]) => v).map(([k, v]) => `${k === 'manufacturer' ? 'Manufacturer' : 'Criticality'} ${v}`);
      return <span>{[r.note, heldKeys.length > 0 ? `Held for now: ${heldKeys.join('; ')}.` : ''].filter(Boolean).join(' ') || <span className="text-ink-muted">Ready</span>}</span>;
    };
    const base: Column<PreviewRow>[] = [
      { id: 'n', header: '#', width: '3rem', cell: r => <span className="tabular text-ink-muted">{r.row}</span> },
    ];
    if (kind === 'assets') {
      return [...base,
        { id: 'asset', header: 'Asset', cell: r => <div><p className="font-medium text-ink">{str(r.values.name) || <StatusBadge tone="danger" icon="warning">No name</StatusBadge>}</p><p className="font-mono text-caption text-ink-muted">{str(r.values.asset_id)}</p></div> },
        { id: 'match', header: 'Register match', hideBelow: 'md', cell: matchCell },
        { id: 'status', header: 'Outcome', cell: statusCell },
        { id: 'detail', header: 'Detail', hideBelow: 'lg', cell: detailCell },
      ];
    }
    return [...base,
      { id: 'pm', header: 'PM', cell: r => <div><p className="font-medium text-ink">{str(r.values.title) || <StatusBadge tone="danger" icon="warning">No title</StatusBadge>}</p><p className="font-mono text-caption text-ink-muted">{r.ref}</p></div> },
      { id: 'machine', header: 'Machine', cell: r => <span>{str(r.values.asset_name) || str(r.values.asset_id)}</span> },
      { id: 'rhythm', header: 'Rhythm', hideBelow: 'md', cell: r => <span>{str(r.values.frequency)}{str(r.values.next_due) ? ` · due ${str(r.values.next_due)}` : ''}</span> },
      { id: 'status', header: 'Outcome', cell: statusCell },
      { id: 'detail', header: 'Detail', hideBelow: 'lg', cell: detailCell },
    ];
  }, [kind]);
  const reportRows = useMemo(() => (result?.rows ?? []).filter(r => r.status !== 'created'), [result]);
  const reportData: Record<string, unknown>[] = useMemo(() => reportRows.map(r => {
    const previewRow = preview?.rows.find(p => p.row === r.row);
    return {
      row: r.row,
      ref: r.ref || '—',
      title: previewRow ? rowTitle(kind, previewRow.values) : '—',
      outcome: r.status === 'error' ? 'Failed to save' : r.status === 'exists' ? 'Already there' : r.status === 'close' ? 'Near miss' : 'Invalid',
      reason: r.reasons.join(' '),
    };
  }), [reportRows, preview, kind]);
  const REPORT_COLUMNS: DLColumn[] = [
    { key: 'row', label: 'Row', width: 8 },
    { key: 'ref', label: kind === 'assets' ? 'Asset ID' : 'PM ID', width: 14 },
    { key: 'title', label: kind === 'assets' ? 'Asset' : 'PM', width: 34 },
    { key: 'outcome', label: 'Outcome', width: 16 },
    { key: 'reason', label: 'Reason', width: 60 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Work orders', href: '/maintenance' }, { label: 'Import' }]}
        title={config.title}
        description={config.description}
      />
      <Steps current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          {uploadError && <Notice tone="danger" title="The file could not be read">{uploadError}</Notice>}
          <button
            type="button" disabled={uploading} aria-busy={uploading}
            aria-label={`Upload an eMaint ${kind === 'assets' ? 'asset' : 'PM'} file. Drop a file here or press Enter to browse.`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn('focus-ring flex w-full cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-16 text-center transition-colors disabled:cursor-wait', dragging ? 'border-action bg-action-soft' : 'border-line-control bg-surface hover:bg-surface-subtle')}
          >
            {uploading ? (<LoadingPulse compact label={`Reading ${fileName || 'the file'}`} />) : (
              <>
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><Icon name="upload" size="xl" /></span>
                <span className="block"><span className="block font-display text-title font-semibold text-ink">Drop your file here</span><span className="mt-1 block font-sans text-body-sm text-ink-muted">or choose one to browse. Excel (.xlsx, .xls), CSV or TSV, up to 25 MB.</span></span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv" aria-label={`eMaint ${kind} file`} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-section font-semibold text-ink">Start from the template</h2>
                <p className="font-sans text-body-sm text-ink-muted">{config.templateNote}</p>
              </div>
              <Button icon="download" onClick={() => downloadTextFile(config.templateName, templateCsv(config))}>Download template</Button>
            </div>
            <DataTable caption="Expected columns" rows={config.fields} columns={[
              { id: 'header', header: 'Column', cell: f => <span className="font-medium text-ink">{f.header}{f.required && <span className="text-danger" aria-hidden="true"> *</span>}</span> },
              { id: 'help', header: 'What it holds', cell: f => <span className="text-ink-muted">{f.help}</span> },
            ]} getRowId={f => f.key} />
          </div>
        </div>
      )}

      {step === 1 && infer && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4">
            <Icon name="documents" size="lg" className="text-ink-muted" />
            <div className="min-w-0 flex-1"><p className="truncate font-sans text-label font-medium text-ink">{fileName}</p><p className="font-sans text-caption text-ink-muted">{infer.total_rows} rows, {infer.all_columns.length} columns</p></div>
            <Button icon="close" onClick={reset}>Choose another file</Button>
          </div>

          <section aria-labelledby="map-h" className="flex flex-col gap-3">
            <div><h2 id="map-h" className="font-display text-section font-semibold text-ink">Column mapping</h2><p className="font-sans text-body-sm text-ink-muted">Correct any column that was picked wrongly. Changing a column clears the matches below.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.fields.map(f => {
                const conf = confidenceBadge(infer.confidence[f.key] ?? 0);
                return (
                  <div key={f.key} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                    <Field label={f.header} required={f.required} optional={!f.required} description={f.help}>
                      <Select aria-label={`${f.header} column`} value={mapping[f.key] || NONE} onValueChange={v => setMappingAndClear(f.key, v === NONE ? '' : v)}
                        options={[{ value: NONE, label: f.required ? 'Choose a column' : 'No column' }, ...infer.all_columns.map(c => ({ value: c, label: c }))]} />
                    </Field>
                    {mapping[f.key] && <div><StatusBadge tone={conf.tone}>{conf.label}</StatusBadge></div>}
                  </div>
                );
              })}
            </div>
            {missingRequired.length > 0 && <Notice tone="warning" title={`Choose the ${missingRequired.map(f => f.header).join(' and ')} column${missingRequired.length > 1 ? 's' : ''}`}>Nothing can be matched until {missingRequired.length > 1 ? 'they are' : 'it is'} chosen.</Notice>}
          </section>

          <section aria-labelledby="match-h" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1"><h2 id="match-h" className="font-display text-section font-semibold text-ink">Matches</h2><p className="font-sans text-body-sm text-ink-muted">Every row against the register. Nothing is saved by checking.</p></div>
              <Button variant="primary" icon="search" pending={matching} disabled={missingRequired.length > 0} onClick={checkMatches}>Check matches</Button>
            </div>
            {matchError && <Notice tone="danger" title="The matches could not be checked" action={<Button size="sm" icon="refresh" onClick={checkMatches}>Try again</Button>}>{matchError}</Notice>}
            {preview && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="success">{pluralize(preview.summary.new, config.unit)} to import</StatusBadge>
                  {preview.summary.exists > 0 && <StatusBadge tone="neutral">{preview.summary.exists} already there</StatusBadge>}
                  {preview.summary.close > 0 && <StatusBadge tone="warning">{preview.summary.close} near {preview.summary.close === 1 ? 'miss' : 'misses'}</StatusBadge>}
                  {preview.summary.invalid > 0 && <StatusBadge tone="danger">{preview.summary.invalid} cannot import</StatusBadge>}
                </div>
                <DataTable caption={`${config.tabLabel} import preview`} rows={preview.rows.slice(0, PREVIEW_LIMIT)} columns={previewColumns} getRowId={r => String(r.row)} />
                {preview.rows.length > PREVIEW_LIMIT && <p className="font-sans text-caption text-ink-muted">Showing {PREVIEW_LIMIT} of {preview.rows.length} rows. All {pluralize(newCount, config.unit)} are imported.</p>}
              </>
            )}
          </section>

          {importError && <Notice tone="danger" title="The import failed" action={<Button size="sm" icon="refresh" onClick={doImport}>Try again</Button>}>{importError} Nothing is shown as imported; check the register before trying again, because part of the file may have been saved.</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={reset}>Cancel</Button>
            <Button variant="primary" icon="upload" pending={importing} disabled={newCount === 0} onClick={runImport}>{`Import ${pluralize(newCount, config.unit)}`}</Button>
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="flex flex-col gap-4">
          <MetricGrid compact>
            <MetricTile compact label="Added" tone="success" value={result.created} />
            <MetricTile compact label="Skipped" value={result.skipped} />
            <MetricTile compact label="Errors" tone={result.errors ? 'danger' : 'default'} value={result.errors} />
            <MetricTile compact label="In the file" value={result.total} />
          </MetricGrid>
          {reportRows.length > 0 && (
            <section aria-labelledby="unmatched-h" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id="unmatched-h" className="font-display text-section font-semibold text-ink">What was not imported</h2>
                  <p className="font-sans text-body-sm text-ink-muted">Fix the file or the register, then import again — rows already added are skipped, never duplicated.</p>
                </div>
                <DownloadButton data={reportData} columns={REPORT_COLUMNS} filename={exportFilename(kind === 'assets' ? 'eMaint_Assets_Unmatched' : 'eMaint_PM_Unmatched')} title={kind === 'assets' ? 'eMaint assets not imported' : 'eMaint PMs not imported'} formats={['excel']} />
              </div>
              <DataTable caption="Rows not imported" rows={reportData} columns={REPORT_COLUMNS.map(c => ({ id: c.key, header: c.label, cell: (r: Record<string, unknown>) => <span>{str(r[c.key])}</span> }))} getRowId={r => String(r.row)} />
            </section>
          )}
          {result.errors > 0 && <Notice tone="warning" title={`${result.errors} ${result.errors === 1 ? 'row' : 'rows'} could not be saved`}>The rest were saved. Check the register for the missing rows, then import again.</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button icon="refresh" onClick={reset}>Import another file</Button>
            <Button asChild variant="primary"><Link href={config.doneHref}>{config.doneLabel}</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}
