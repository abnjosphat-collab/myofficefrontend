// app/employees/import/ImporterDialog.tsx — the Mining Excel import: upload,
// map the columns, check the server's dry-run, commit, result — plus the past
// imports with Undo beside each. The browser parses the workbook and suggests
// the mapping; the server re-validates everything and decides every row, so
// checking saves nothing and committing is the only write.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, DataTable, Dialog, Field, Icon, LoadingPulse, MetricGrid, MetricTile, Notice, Select, Segmented, StatusBadge, cn, useConfirm, type Column } from '@/components/ui-system';
import { api } from '@/lib/apiClient';
import { fileProblem } from '@/lib/files';
import { exportFilename } from '@/lib/exportUtils';
import {
  MAX_IMPORT_ROWS, PERSON_TARGETS, dataRows, detectHeaderRow, headerLabels,
  parseWorkbookData, suggestMapping, toServerMapping,
  type ColumnMapping, type MappingValue, type ParsedWorkbook,
} from './parseWorkbook';
import {
  commitImport, downloadTextFile, importHistory, previewImport, undoImport,
  type ImportHistoryRow, type ImportPayload, type ImportPerson, type ImportPpeEntry, type ImportPlan,
} from './importerApi';

const IMPORT_RULES = { maxBytes: 10 * 1024 * 1024, extensions: ['xlsx', 'xls', 'csv'] };
const STEPS = ['Upload', 'Check and match', 'Result'];
const PREVIEW_LIMIT = 100;
const TEMPLATE_CSV = 'Mine No,Full Name,Job Title,Section,Hard hat,Hard hat size,Date Engaged,Phone\nM0001,MOYO Farai,Fitter,Mining,10/03/2024,10,2021-06-01,0712345678\n';

const NONE = '__none__';
const encodeTarget = (v: MappingValue): string => (typeof v === 'string' ? v : `json:${JSON.stringify(v)}`);
const decodeTarget = (s: string): MappingValue => {
  if (!s.startsWith('json:')) return s as MappingValue;
  try {
    const o = JSON.parse(s.slice(5)) as { target: string; label?: string };
    return typeof o.target === 'string' ? o : 'ignore';
  } catch { return 'ignore'; }
};

const PERSON_LABEL: Record<string, string> = Object.fromEntries(PERSON_TARGETS.map(t => [t.value, t.label]));

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

const PERSON_META: Record<ImportPerson['action'], { label: string; tone: 'success' | 'info' | 'neutral' | 'danger' }> = {
  create: { label: 'New — will be added', tone: 'success' },
  fill: { label: 'Already there — blanks filled', tone: 'info' },
  unchanged: { label: 'Already there — skipped', tone: 'neutral' },
  refused: { label: 'Cannot import', tone: 'danger' },
};

const PPE_META: Record<ImportPpeEntry['action'], { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  add: { label: 'Will be issued', tone: 'success' },
  duplicate_skipped: { label: 'Already issued — skipped', tone: 'warning' },
  refused: { label: 'Cannot import', tone: 'danger' },
};

const cellText = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

function personDetail(p: ImportPerson): string {
  if (p.action === 'refused') return p.refuse_reason || p.reason || 'Refused.';
  if (p.action === 'fill' && p.fill) {
    const bits = Object.entries(p.fill).filter(([, v]) => v).map(([k, v]) => `${PERSON_LABEL[k] ?? k}: ${v}`);
    return bits.length > 0 ? `Fills ${bits.join('; ')}.` : 'Nothing new.';
  }
  if (p.action === 'unchanged' && p.diffs && p.diffs.length > 0) return `Differs: ${p.diffs.map(d => `${d.field} is ${d.was}`).join('; ')}.`;
  if (p.action === 'create') return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'New person.';
  return '';
}

function ppeDetail(e: ImportPpeEntry): string {
  if (e.action === 'refused') return e.reason || 'Refused.';
  if (e.unknown_item) return 'Not a known PPE type — kept as written.';
  if (e.action === 'add' && e.expiry_date) return `Expires ${e.expiry_date}.`;
  return '';
}

async function matrixTypes(): Promise<{ code: string }[]> {
  const data = await api.get<unknown>('/api/ppe/matrix');
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.keys(data as Record<string, number>).map(code => ({ code }));
}

export function ImporterDialog({ open, onOpenChange, onImported }: {
  open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void;
}) {
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [wb, setWb] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [layout, setLayout] = useState<'wide' | 'long'>('wide');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingTouched, setMappingTouched] = useState(false);
  const [types, setTypes] = useState<{ code: string }[]>([]);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; filled: number; ppe: number; skipped: number } | null>(null);
  const [history, setHistory] = useState<ImportHistoryRow[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  const step = !wb ? 0 : result ? 2 : 1;
  const sheet = wb?.sheets.find(s => s.name === sheetName) ?? wb?.sheets[0] ?? null;
  const rows = useMemo(() => sheet?.rows ?? [], [sheet]);
  const width = useMemo(() => Math.max(0, ...rows.map(r => r.length)), [rows]);
  const headers = useMemo((): string[] => (sheet ? headerLabels(rows, headerRow ?? detectHeaderRow(rows)) : []), [sheet, rows, headerRow]);
  const sentRows = useMemo(() => (sheet ? dataRows(rows, headerRow ?? detectHeaderRow(rows)) : [] as unknown[][]), [sheet, rows, headerRow]);
  const knownTypes = useMemo(() => types.map(t => ({ code: t.code, label: t.code })), [types]);

  useEffect(() => {
    if (!open) return;
    setDragging(false); setParsing(false); setParseError(null); setFileName('');
    setWb(null); setSheetName(''); setHeaderRow(null); setLayout('wide'); setMapping({}); setMappingTouched(false);
    setPlan(null); setChecking(false); setCheckError(null);
    setImporting(false); setImportError(null); setResult(null);
    setUndoId(null);
    setHistory(null); setHistoryError(null);
    let cancelled = false;
    matrixTypes().then(t => { if (!cancelled) setTypes(t); }).catch(() => { if (!cancelled) setTypes([]); });
    importHistory().then(h => { if (!cancelled) setHistory(h); }).catch(e => { if (!cancelled) setHistoryError((e as Error).message); });
    return () => { cancelled = true; };
  }, [open ]);

  const resetFile = () => {
    setWb(null); setSheetName(''); setHeaderRow(null); setMapping({}); setMappingTouched(false);
    setPlan(null); setCheckError(null); setResult(null); setImportError(null); setParseError(null); setFileName('');
  };

  const handleFile = async (file: File) => {
    resetFile(); setFileName(file.name);
    const problem = fileProblem(file, IMPORT_RULES);
    if (problem) { setParseError(problem); setFileName(''); return; }
    setParsing(true);
    try {
      const parsed = parseWorkbookData(await file.arrayBuffer(), file.name);
      setWb(parsed);
      const first = parsed.sheets[0];
      setSheetName(first.name);
      const header = detectHeaderRow(first.rows);
      setHeaderRow(header);
      setMapping(suggestMapping(headerLabels(first.rows, header), 'wide', []));
    } catch (e) { setParseError((e as Error).message); setFileName(''); }
    finally { setParsing(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const pickSheet = (name: string) => {
    setSheetName(name); setPlan(null); setCheckError(null); setResult(null);
    const next = wb?.sheets.find(s => s.name === name);
    if (!next) return;
    const header = detectHeaderRow(next.rows);
    setHeaderRow(header);
    setMapping(suggestMapping(headerLabels(next.rows, header), layout, knownTypes));
    setMappingTouched(false);
  };

  const pickLayout = (next: 'wide' | 'long') => {
    setLayout(next); setPlan(null); setCheckError(null); setResult(null);
    if (sheet) { setMapping(suggestMapping(headers, next, knownTypes)); setMappingTouched(false); }
  };

  const setColumn = (index: string, encoded: string) => {
    const value = encoded === NONE ? 'ignore' : decodeTarget(encoded);
    setMapping(m => ({ ...m, [index]: value }));
    setMappingTouched(true);
    setPlan(null); setCheckError(null); setResult(null);
  };

  // The PPE type list arrives after the file: re-suggest once it lands, unless
  // the admin already corrected the mapping by hand.
  useEffect(() => {
    if (!open || mappingTouched || types.length === 0 || !sheet) return;
    setMapping(suggestMapping(headers, layout, knownTypes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const targetOptions = (header: string): { value: string; label: string }[] => {
    const opts = [{ value: NONE, label: 'Ignore this column' }, ...PERSON_TARGETS.map(t => ({ value: t.value, label: t.label }))];
    if (layout === 'long') {
      opts.push({ value: 'item_text', label: 'Item (what was issued)' }, { value: 'size', label: 'Size' }, { value: 'issue_date', label: 'Issue date (required)' });
    } else {
      for (const t of knownTypes) {
        opts.push({ value: encodeTarget({ target: `ppe:${t.code}`, label: header || t.code }), label: `${t.code} — issue dates` });
        opts.push({ value: encodeTarget({ target: `size:${t.code}` }), label: `${t.code} — sizes` });
      }
    }
    return opts;
  };

  const mappingProblems = useMemo((): string[] => {
    const vals = Object.values(mapping);
    const flat = vals.map(v => (typeof v === 'string' ? v : v.target));
    const out: string[] = [];
    if (flat.filter(v => v === 'mine_number').length !== 1) out.push('Map exactly one column to the mine number.');
    if (flat.includes('full_name') && (flat.includes('first_name') || flat.includes('last_name'))) out.push('Use the full name or the first and last names, not both.');
    if (layout === 'long') {
      if (flat.filter(v => v === 'item_text').length !== 1) out.push('A long file needs exactly one item column.');
      if (flat.filter(v => v === 'issue_date').length !== 1) out.push('A long file needs exactly one issue-date column.');
    } else {
      const sizes = flat.filter(v => v.startsWith('size:'));
      for (const s of sizes) {
        const code = s.slice('size:'.length);
        if (!flat.includes(`ppe:${code}`)) out.push(`A ${code} size column needs its ${code} issue-dates column.`);
      }
    }
    return out;
  }, [mapping, layout]);

  const payload = (): ImportPayload => ({
    file_name: fileName, layout, department: 'Mining', rows: sentRows, mapping: toServerMapping(mapping),
  });

  const checkMatches = async () => {
    if (mappingProblems.length > 0 || sentRows.length === 0) return;
    if (sentRows.length > MAX_IMPORT_ROWS) { setCheckError(`That sheet holds ${sentRows.length} rows — at most ${MAX_IMPORT_ROWS} go in one import. Split the file and try again.`); return; }
    setChecking(true); setCheckError(null);
    try { setPlan(await previewImport(payload())); }
    catch (e) { setCheckError((e as Error).message); }
    finally { setChecking(false); }
  };

  const newPeople = plan?.counts.people_new ?? 0;
  const newPpe = plan?.counts.ppe_new ?? 0;

  const doImport = async () => {
    setImporting(true); setImportError(null);
    try {
      const done = await commitImport(payload());
      setResult({
        created: done.counts.people_created ?? 0,
        filled: done.counts.people_filled ?? 0,
        ppe: done.counts.ppe_created ?? 0,
        skipped: (done.counts.ppe_duplicates_skipped ?? 0) + (done.counts.people_unchanged ?? 0),
      });
      toast.success(`Mining register updated: ${done.counts.people_created ?? 0} new people, ${done.counts.ppe_created ?? 0} new issues.`);
      onImported();
      importHistory().then(setHistory).catch(() => {});
    } catch (e) { setImportError((e as Error).message); }
    finally { setImporting(false); }
  };

  const runImport = async () => {
    if (newPeople === 0 && newPpe === 0) return;
    const ok = await confirm({
      title: `Import ${fileName}?`,
      message: `${newPeople} ${newPeople === 1 ? 'new person' : 'new people'} and ${newPpe} ${newPpe === 1 ? 'new issue' : 'new issues'} join the Mining register. Rows already there are filled in or skipped, never duplicated. Refused rows stay out — fix the file and import again.`,
      confirmLabel: 'Import',
    });
    if (ok) await doImport();
  };

  const runUndo = async (row: ImportHistoryRow) => {
    const ok = await confirm({
      title: `Undo the ${row.file_name} import?`,
      message: `What that import created is deleted through Recently deleted, so each record can still be put back. People who have records from anywhere else since are kept and named.`,
      confirmLabel: 'Undo import', destructive: true,
    });
    if (!ok) return;
    setUndoId(row.id);
    try {
      const done = await undoImport(row.id);
      if (done.already_undone) { toast.success('Already undone.'); }
      else {
        const kept = done.kept_people.length;
        toast.success(`Undone: ${done.removed_people.length} ${done.removed_people.length === 1 ? 'person' : 'people'} and ${done.removed_ppe.length} issues removed${kept > 0 ? `, ${kept} kept (used elsewhere)` : ''}.`);
      }
      onImported();
      setHistory(await importHistory());
    } catch (e) { toast.error(`The import was not undone: ${(e as Error).message}`); }
    finally { setUndoId(null); }
  };

  const peopleColumns: Column<ImportPerson & { _i: number }>[] = useMemo(() => [
    { id: 'n', header: '#', cell: r => <span className="tabular text-ink-muted">{r.row ?? ''}</span> },
    { id: 'who', header: 'Person', cell: r => <div><p className="font-medium text-ink">{[r.first_name, r.last_name].filter(Boolean).join(' ') || <span className="text-ink-muted">No name</span>}</p><p className="font-mono text-caption text-ink-muted">{r.mine_number}</p></div> },
    { id: 'outcome', header: 'Outcome', cell: r => <StatusBadge tone={PERSON_META[r.action].tone}>{PERSON_META[r.action].label}</StatusBadge> },
    { id: 'detail', header: 'Detail', hideBelow: 'lg', cell: r => <span className="text-ink-muted">{personDetail(r)}</span> },
  ], []);
  const ppeColumns: Column<ImportPpeEntry & { _i: number }>[] = useMemo(() => [
    { id: 'who', header: 'Mine No', cell: r => <span className="font-mono">{r.mine_number}</span> },
    { id: 'item', header: 'Item', cell: r => <div><p className="font-medium text-ink">{r.item_name || r.ppe_type}</p>{r.unknown_item && <StatusBadge tone="warning">Unknown type — kept as written</StatusBadge>}</div> },
    { id: 'size', header: 'Size', hideBelow: 'md', cell: r => <span>{r.size ?? '—'}</span> },
    { id: 'issue', header: 'Issued', hideBelow: 'md', cell: r => <span className="tabular">{r.issue_iso ?? '—'}</span> },
    { id: 'outcome', header: 'Outcome', cell: r => <StatusBadge tone={PPE_META[r.action].tone}>{PPE_META[r.action].label}</StatusBadge> },
    { id: 'detail', header: 'Detail', hideBelow: 'lg', cell: r => <span className="text-ink-muted">{ppeDetail(r)}</span> },
  ], []);
  const historyColumns: Column<ImportHistoryRow>[] = useMemo(() => [
    { id: 'file', header: 'File', cell: r => <div><p className="font-medium text-ink">{r.file_name}</p><p className="text-caption text-ink-muted">{new Date(r.created_at).toLocaleString()}{r.created_by ? ` · ${r.created_by}` : ''}</p></div> },
    { id: 'counts', header: 'Imported', hideBelow: 'md', cell: r => <span className="tabular">{r.counts.people_created ?? 0} people · {r.counts.ppe_created ?? 0} issues</span> },
    { id: 'status', header: 'Status', cell: r => (r.undone_at ? <StatusBadge tone="neutral">Undone</StatusBadge> : <StatusBadge tone="success">Live</StatusBadge>) },
  ], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" title="Import the Mining register" description="An Excel file of Mining people and their PPE issues. Nothing is saved until the preview is committed.">
      <div className="flex flex-col gap-5">
        <Steps current={step} />

        {step === 0 && (
          <div className="flex flex-col gap-4">
            {parseError && <Notice tone="danger" title="The file could not be read">{parseError}</Notice>}
            <button
              type="button" disabled={parsing} aria-busy={parsing}
              aria-label="Upload a Mining register file. Drop a file here or press Enter to browse."
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn('focus-ring flex w-full cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-16 text-center transition-colors disabled:cursor-wait', dragging ? 'border-action bg-action-soft' : 'border-line-control bg-surface hover:bg-surface-subtle')}
            >
              {parsing ? (<LoadingPulse compact label={`Reading ${fileName || 'the file'}`} />) : (
                <>
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><Icon name="upload" size="xl" /></span>
                  <span className="block"><span className="block font-display text-title font-semibold text-ink">Drop your file here</span><span className="mt-1 block font-sans text-body-sm text-ink-muted">or choose one to browse. Excel (.xlsx, .xls) or CSV, up to 10 MB and 20,000 rows.</span></span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" aria-label="Mining register file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-section font-semibold text-ink">Start from the template</h2>
                <p className="font-sans text-body-sm text-ink-muted">One row per person; each PPE column holds the issue date, with a size column beside it. Title rows above the header are ignored.</p>
              </div>
              <Button icon="download" onClick={() => downloadTextFile(exportFilename('Mining_Import_Template'), TEMPLATE_CSV)}>Download template</Button>
            </div>
          </div>
        )}

        {step === 1 && sheet && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4">
              <Icon name="documents" size="lg" className="text-ink-muted" />
              <div className="min-w-0 flex-1"><p className="truncate font-sans text-label font-medium text-ink">{fileName}</p><p className="font-sans text-caption text-ink-muted">{sentRows.length} rows to check, {width} columns</p></div>
              <Button icon="close" onClick={resetFile}>Choose another file</Button>
            </div>

            <section aria-labelledby="imp-layout-h" className="flex flex-col gap-3">
              <div><h2 id="imp-layout-h" className="font-display text-section font-semibold text-ink">Layout and header</h2></div>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Sheet" className="min-w-44 flex-1">
                  <Select aria-label="Sheet" value={sheetName} onValueChange={pickSheet} options={wb?.sheets.map(s => ({ value: s.name, label: `${s.name} (${s.rows.length} rows)` })) ?? []} />
                </Field>
                <Field label="File layout" className="min-w-44 flex-1">
                  <Segmented label="File layout" value={layout} onValueChange={pickLayout} options={[{ value: 'wide', label: 'One row per person' }, { value: 'long', label: 'One row per issue' }]} />
                </Field>
                <Field label="Header row" className="min-w-36 flex-1" description="The title row above it is ignored.">
                  <Select aria-label="Header row" value={headerRow === null ? NONE : String(headerRow)} onValueChange={v => { const h = v === NONE ? detectHeaderRow(rows) : Number(v); setHeaderRow(v === NONE ? null : Number(v)); if (!mappingTouched) setMapping(suggestMapping(headerLabels(rows, h), layout, knownTypes)); setPlan(null); setCheckError(null); }} options={[{ value: NONE, label: 'First row' }, ...rows.slice(0, 10).map((r, i) => ({ value: String(i), label: `Row ${i + 1}: ${cellText(r[0]).slice(0, 30) || '—'}` }))]} />
                </Field>
              </div>
              <p className="font-sans text-caption text-ink-muted">
                {layout === 'wide' ? 'Wide: each row is a person; PPE columns hold issue dates, with a size column beside each.' : 'Long: each row is one issue — the person columns repeat, with an item column and an issue-date column.'}
                {' '}The header row itself is never imported.
              </p>
            </section>

            <section aria-labelledby="imp-map-h" className="flex flex-col gap-3">
              <div><h2 id="imp-map-h" className="font-display text-section font-semibold text-ink">Column mapping</h2><p className="font-sans text-body-sm text-ink-muted">What each column holds. Changing a column clears the matches below.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {headers.map((header, i) => {
                  const sample = sentRows.slice(0, 3).map(r => cellText(r[i])).filter(s => s !== '');
                  return (
                    <div key={i} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                      <Field label={header || `Column ${i + 1}`} description={sample.length > 0 ? `e.g. ${sample.slice(0, 2).join(' · ')}` : 'Empty column'}>
                        <Select aria-label={`${header || `Column ${i + 1}`} holds`} value={encodeTarget(mapping[String(i)] ?? 'ignore')} onValueChange={v => setColumn(String(i), v)} options={targetOptions(header)} />
                      </Field>
                    </div>
                  );
                })}
              </div>
              {mappingProblems.length > 0 && <Notice tone="warning" title="Finish the mapping">{mappingProblems.join(' ')}</Notice>}
            </section>

            <section aria-labelledby="imp-match-h" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1"><h2 id="imp-match-h" className="font-display text-section font-semibold text-ink">Matches</h2><p className="font-sans text-body-sm text-ink-muted">Every row against the Mining register. Nothing is saved by checking.</p></div>
                <Button icon="search" pending={checking} disabled={mappingProblems.length > 0 || sentRows.length === 0} onClick={checkMatches}>Check matches</Button>
              </div>
              {checkError && <Notice tone="danger" title="The matches could not be checked" action={<Button size="sm" icon="refresh" onClick={checkMatches}>Try again</Button>}>{checkError}</Notice>}
              {plan && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="success">{plan.counts.people_new ?? 0} new people</StatusBadge>
                    {(plan.counts.people_filled ?? 0) > 0 && <StatusBadge tone="info">{plan.counts.people_filled} filled in</StatusBadge>}
                    {(plan.counts.people_unchanged ?? 0) > 0 && <StatusBadge tone="neutral">{plan.counts.people_unchanged} already there</StatusBadge>}
                    {(plan.counts.people_refused ?? 0) > 0 && <StatusBadge tone="danger">{plan.counts.people_refused} refused</StatusBadge>}
                    <StatusBadge tone="success">{plan.counts.ppe_new ?? 0} new issues</StatusBadge>
                    {(plan.counts.ppe_duplicates_skipped ?? 0) > 0 && <StatusBadge tone="warning">{plan.counts.ppe_duplicates_skipped} already issued</StatusBadge>}
                    {(plan.counts.unknown_items ?? 0) > 0 && <StatusBadge tone="warning">{plan.counts.unknown_items} unknown items</StatusBadge>}
                  </div>
                  <DataTable caption="People import preview" rows={plan.people.slice(0, PREVIEW_LIMIT).map((p, i) => ({ ...p, _i: i }))} columns={peopleColumns} getRowId={r => `${r.mine_number}-${r._i}`} />
                  {plan.people.length > PREVIEW_LIMIT && <p className="font-sans text-caption text-ink-muted">Showing {PREVIEW_LIMIT} of {plan.people.length} people.</p>}
                  <DataTable caption="PPE import preview" rows={plan.ppe.slice(0, PREVIEW_LIMIT).map((e, i) => ({ ...e, _i: i }))} columns={ppeColumns} getRowId={r => `${r.mine_number}-${r._i}-${r.issue_iso ?? ''}`} />
                  {plan.ppe.length > PREVIEW_LIMIT && <p className="font-sans text-caption text-ink-muted">Showing {PREVIEW_LIMIT} of {plan.ppe.length} issues.</p>}
                  {plan.problems.length > 0 && (
                    <Notice tone="warning" title={`${plan.problems.length} ${plan.problems.length === 1 ? 'row needs' : 'rows need'} attention`}>
                      {plan.problems.slice(0, 10).map((p, i) => <p key={i}>{p.reason}</p>)}
                      {plan.problems.length > 10 && <p>And {plan.problems.length - 10} more.</p>}
                    </Notice>
                  )}
                </>
              )}
            </section>

            {importError && <Notice tone="danger" title="The import failed" action={<Button size="sm" icon="refresh" onClick={doImport}>Try again</Button>}>{importError} Nothing is shown as imported; check the register before trying again, because part of the file may have been saved.</Notice>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={resetFile}>Cancel</Button>
              <Button variant="primary" icon="upload" pending={importing} disabled={!plan || newPeople === 0 && newPpe === 0} onClick={runImport}>Import into Mining</Button>
            </div>
          </div>
        )}

        {step === 2 && result && (
          <div className="flex flex-col gap-4">
            <MetricGrid compact>
              <MetricTile compact label="People added" tone="success" value={result.created} />
              <MetricTile compact label="Blanks filled" value={result.filled} />
              <MetricTile compact label="Issues added" tone="success" value={result.ppe} />
              <MetricTile compact label="Skipped" value={result.skipped} />
            </MetricGrid>
            <div className="flex flex-wrap gap-2">
              <Button icon="refresh" onClick={resetFile}>Import another file</Button>
              <Button variant="primary" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}

        <section aria-labelledby="imp-history-h" className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="min-w-0 flex-1"><h2 id="imp-history-h" className="font-display text-section font-semibold text-ink">Past imports</h2><p className="font-sans text-body-sm text-ink-muted">Undo removes what an import created, through Recently deleted — people used anywhere since are kept and named.</p></div>
          {historyError && <Notice tone="danger" title="The past imports could not be loaded">{historyError}</Notice>}
          {history && history.length === 0 && <p className="font-sans text-body-sm text-ink-muted">No imports yet.</p>}
          {history && history.length > 0 && (
            <DataTable
              caption="Past Mining imports" rows={history} columns={historyColumns} getRowId={r => r.id}
              rowActions={r => (r.undone_at
                ? <span className="font-sans text-caption text-ink-muted">Undone</span>
                : <Button size="sm" variant="danger-quiet" icon="undo" pending={undoId === r.id} disabled={undoId !== null} onClick={() => runUndo(r)} aria-label={`Undo the ${r.file_name} import`}>Undo</Button>)}
            />
          )}
        </section>
      </div>
    </Dialog>
  );
}
