'use client';

import { PageShell } from '@/components/PageShell';
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X,
  ArrowLeft, Loader2, RefreshCw, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface InferResult {
  inferred:        { stock_code?: string; description?: string; unit_price?: string };
  confidence:      { stock_code: number; description: number; unit_price: number };
  all_columns:     string[];
  raw_rows:        Record<string, any>[];
  total_rows:      number;
  has_categories?: boolean;
}

interface Mapping {
  stock_code:  string;
  description: string;
  unit_price:  string;
}

interface ExtractedRow {
  stock_code:  string;
  description: string;
  unit_price:  number;
  category:    string;
  _valid:      boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function confidenceLabel(c: number): { label: string; color: string; bg: string } {
  if (c >= 0.70) return { label: 'High',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
  if (c >= 0.40) return { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
  return              { label: 'Low',    color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
}

function extractRows(rawRows: Record<string, any>[], mapping: Mapping): ExtractedRow[] {
  return rawRows.map(row => {
    const stock_code  = String(row[mapping.stock_code]  ?? '').trim();
    const description = String(row[mapping.description] ?? '').trim();
    const rawPrice    = String(row[mapping.unit_price]   ?? '').replace(/[$,€£\s]/g, '');
    const unit_price  = parseFloat(rawPrice) || 0;
    const category    = String(row['_category'] ?? '').trim();
    return {
      stock_code,
      description,
      unit_price,
      category,
      _valid: Boolean(stock_code && description),
    };
  });
}

// ─── COLUMN SELECTOR ─────────────────────────────────────────────────────────

function ColumnSelector({
  label, field, value, columns, confidence, onChange,
}: {
  label: string; field: string; value: string;
  columns: string[]; confidence: number;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { label: confLabel, color, bg } = confidenceLabel(confidence);

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 relative"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wide font-semibold">{label}</span>
        {value && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: bg, color }}>
            {confLabel} confidence
          </span>
        )}
      </div>

      {/* Dropdown trigger */}
      <button type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderColor: open ? 'rgba(134,187,216,0.45)' : 'rgba(255,255,255,0.12)',
          color: value ? '#fff' : 'rgba(255,255,255,0.3)',
        }}>
        <span className="truncate">{value || 'Not mapped — select column'}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/30" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(4,12,24,0.97)', border: '1px solid rgba(255,255,255,0.14)' }}>
            {columns.map(col => (
              <button key={col} type="button"
                onClick={() => { onChange(col); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm transition-all border-b flex items-center justify-between gap-2"
                style={{
                  background: col === value ? 'rgba(134,187,216,0.12)' : undefined,
                  color: col === value ? '#86BBD8' : 'rgba(255,255,255,0.70)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}>
                {col}
                {col === value && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detected column name pill */}
      {value && (
        <div className="text-[11px] text-white/35 truncate">
          Excel column: <span className="text-white/55">{value}</span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SpareImportPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [fileName,    setFileName]    = useState('');
  const [inferResult, setInferResult] = useState<InferResult | null>(null);
  const [mapping,     setMapping]     = useState<Mapping>({ stock_code: '', description: '', unit_price: '' });
  const [importing,   setImporting]   = useState(false);
  const [result,      setResult]      = useState<{ created: number; updated: number; skipped: number; errors: number; total: number } | null>(null);
  // 'upsert'  → insert new + update existing (recommended when re-importing)
  // 'skip'    → insert new only, leave existing unchanged
  type ImportMode = 'upsert' | 'skip';
  const [importMode, setImportMode] = useState<ImportMode>('upsert');

  // When inference result arrives, initialise mapping from backend suggestion
  useEffect(() => {
    if (!inferResult) return;
    setMapping({
      stock_code:  inferResult.inferred.stock_code  || '',
      description: inferResult.inferred.description || '',
      unit_price:  inferResult.inferred.unit_price  || '',
    });
  }, [inferResult]);

  // Re-derive extracted rows whenever raw data or mapping changes
  const extracted = useMemo<ExtractedRow[]>(() => {
    if (!inferResult || !mapping.stock_code || !mapping.description) return [];
    return extractRows(inferResult.raw_rows, mapping);
  }, [inferResult, mapping]);

  const validRows   = useMemo(() => extracted.filter(r => r._valid),   [extracted]);
  const invalidRows = useMemo(() => extracted.filter(r => !r._valid),  [extracted]);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setInferResult(null);
    setResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/spares/infer`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || `HTTP ${res.status}`);
      }
      const data: InferResult = await res.json();
      setInferResult(data);
      toast.success(`Parsed ${data.total_rows} rows — columns mapped automatically`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      setFileName('');
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const items = validRows.map(r => ({
        stock_code:       r.stock_code,
        description:      r.description,
        unit_price:       r.unit_price,
        category:         r.category || null,
        categories:       r.category ? [r.category] : [],
        current_quantity: 0,
        min_quantity:     1,
        max_quantity:     5,
        priority:         'medium',
        safety_stock:     false,
        lead_time_days:   0,
      }));
      const res = await fetch(`${API_URL}/api/spares/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          skip_existing: importMode === 'skip',
          upsert:        importMode === 'upsert',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      toast.success(`${data.created} inserted, ${data.updated ?? 0} updated`);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setInferResult(null);
    setFileName('');
    setResult(null);
    setMapping({ stock_code: '', description: '', unit_price: '' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const setField = (field: keyof Mapping) => (v: string) =>
    setMapping(m => ({ ...m, [field]: v }));

  // ── Determine step ────────────────────────────────────────────────────────
  const step = !inferResult ? 'upload' : result ? 'done' : 'review';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="relative z-10 p-4 md:p-6 max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/spares')}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/12 text-white/60 hover:text-white transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Import Spares from Excel
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Backend reads the file with Polars, infers your columns automatically
            </p>
          </div>
        </div>

        {/* ── STEP: UPLOAD ─────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-5 py-20 px-8 select-none"
              style={{
                borderColor: dragging ? '#86BBD8' : 'rgba(255,255,255,0.14)',
                background:  dragging ? 'rgba(134,187,216,0.06)' : 'rgba(255,255,255,0.02)',
                cursor: uploading ? 'default' : 'pointer',
              }}>
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin" style={{ color: '#86BBD8' }} />
                  <div className="text-white/60 font-medium">Analysing columns&hellip;</div>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(134,187,216,0.12)' }}>
                    <FileSpreadsheet className="h-8 w-8" style={{ color: '#86BBD8' }} />
                  </div>
                  <div className="text-center">
                    <div className="text-white/80 font-semibold text-base">Drop your file here</div>
                    <div className="text-white/35 text-sm mt-1">or click to browse &mdash; .xlsx&nbsp;&nbsp;.csv</div>
                  </div>
                </>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
            </div>

            <div className="rounded-xl px-4 py-3 flex items-start gap-3 text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(251,191,36,0.5)' }} />
              <span className="text-white/40 leading-relaxed">
                The server will read your file using <span className="text-white/60">Polars</span> and
                automatically detect the <span className="text-white/60">Stock Code</span>,{' '}
                <span className="text-white/60">Description</span>, and{' '}
                <span className="text-white/60">Unit Price</span> columns by analysing both the header
                names and the actual data patterns in each column. You can correct any misidentified
                column before importing.
              </span>
            </div>
          </>
        )}

        {/* ── STEP: REVIEW ─────────────────────────────────────────────────── */}
        {step === 'review' && inferResult && (
          <div className="space-y-5">

            {/* File bar */}
            <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileSpreadsheet className="h-5 w-5 flex-shrink-0" style={{ color: '#86BBD8' }} />
                <span className="text-white/80 text-sm font-medium truncate">{fileName}</span>
                <span className="text-xs text-white/35 flex-shrink-0">
                  &mdash; {inferResult.total_rows} rows &bull; {inferResult.all_columns.length} columns
                  {inferResult.has_categories && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: 'rgba(134,187,216,0.15)', color: '#86BBD8' }}>
                      categories detected
                    </span>
                  )}
                </span>
              </div>
              <button onClick={reset}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all" title="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Column mapping cards */}
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-3 px-1">
                Column Mapping &mdash; adjust if any are wrong
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ColumnSelector
                  label="Stock Code"
                  field="stock_code"
                  value={mapping.stock_code}
                  columns={inferResult.all_columns}
                  confidence={inferResult.confidence.stock_code}
                  onChange={setField('stock_code')}
                />
                <ColumnSelector
                  label="Description"
                  field="description"
                  value={mapping.description}
                  columns={inferResult.all_columns}
                  confidence={inferResult.confidence.description}
                  onChange={setField('description')}
                />
                <ColumnSelector
                  label="Unit Price"
                  field="unit_price"
                  value={mapping.unit_price}
                  columns={inferResult.all_columns}
                  confidence={inferResult.confidence.unit_price}
                  onChange={setField('unit_price')}
                />
              </div>
            </div>

            {/* Row summary */}
            {extracted.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                  {validRows.length} ready to import
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                    style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                    {invalidRows.length} skipped (empty stock code or description)
                  </span>
                )}
              </div>
            )}

            {/* Import mode selector */}
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-3">
                If a stock code already exists in the database…
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  {
                    mode: 'upsert' as ImportMode,
                    title: 'Update existing records',
                    desc: 'Inserts new items AND updates existing ones with the latest data from this file. Use this when re-importing to fix categories or prices.',
                    recommended: true,
                  },
                  {
                    mode: 'skip' as ImportMode,
                    title: 'Skip existing records',
                    desc: 'Only inserts rows whose stock code is not already in the database. Existing records are left completely unchanged.',
                    recommended: false,
                  },
                ] as const).map(opt => (
                  <button key={opt.mode} type="button"
                    onClick={() => setImportMode(opt.mode)}
                    className="text-left p-3 rounded-xl border transition-all"
                    style={{
                      background:   importMode === opt.mode ? 'rgba(42,77,105,0.35)' : 'rgba(255,255,255,0.03)',
                      borderColor:  importMode === opt.mode ? 'rgba(134,187,216,0.45)' : 'rgba(255,255,255,0.09)',
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: importMode === opt.mode ? '#86BBD8' : 'rgba(255,255,255,0.25)' }}>
                        {importMode === opt.mode && (
                          <div className="h-1.5 w-1.5 rounded-full bg-[#86BBD8]" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-white/80">{opt.title}</span>
                      {opt.recommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#86BBD8]/15 text-[#86BBD8]">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed pl-5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview table */}
            {extracted.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <div className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-sm font-semibold text-white/70">
                    Preview{extracted.length > 30 ? ' (first 30 rows)' : ''}
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#f87171' }}>
                      <AlertTriangle className="h-3 w-3" />
                      Red rows are missing stock code or description
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        <th className="px-3 py-2 text-left text-white/30 font-medium w-10">#</th>
                        <th className="px-3 py-2 text-left text-white/40 font-medium">Stock Code</th>
                        <th className="px-3 py-2 text-left text-white/40 font-medium">Description</th>
                        <th className="px-3 py-2 text-right text-white/40 font-medium">Unit Price</th>
                        {inferResult.has_categories && (
                          <th className="px-3 py-2 text-left text-white/40 font-medium">Category</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {extracted.slice(0, 30).map((row, i) => (
                        <tr key={i} className="border-b transition-colors"
                          style={{
                            borderColor: 'rgba(255,255,255,0.04)',
                            background: !row._valid ? 'rgba(244,63,94,0.05)' : undefined,
                          }}>
                          <td className="px-3 py-1.5 text-white/25">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono"
                            style={{ color: row.stock_code ? '#86BBD8' : '#f87171' }}>
                            {row.stock_code || <span style={{ fontStyle: 'italic', color: '#f87171' }}>missing</span>}
                          </td>
                          <td className="px-3 py-1.5 max-w-[220px] truncate"
                            style={{ color: row.description ? 'rgba(255,255,255,0.70)' : '#f87171' }}>
                            {row.description || <span style={{ fontStyle: 'italic', color: '#f87171' }}>missing</span>}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums"
                            style={{ color: row.unit_price > 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }}>
                            {row.unit_price > 0 ? row.unit_price.toFixed(2) : '—'}
                          </td>
                          {inferResult.has_categories && (
                            <td className="px-3 py-1.5 max-w-[160px] truncate">
                              {row.category
                                ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#86BBD8]/[0.12] text-[#86BBD8]">
                                    {row.category}
                                  </span>
                                : <span className="text-white/20">—</span>}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {extracted.length > 30 && (
                    <div className="px-4 py-2.5 text-xs text-white/25 text-center border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      Showing 30 of {extracted.length} rows &mdash; all {validRows.length} valid rows will be imported
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={reset}
                className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
                Cancel
              </button>
              <button onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #2A4D69, #1e3a52)', border: '1px solid rgba(134,187,216,0.25)' }}>
                {importing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing&hellip;</>
                  : <><Upload className="h-4 w-4" /> Import {validRows.length} Records</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: DONE ───────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.18)' }}>
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: '#34d399' }} />
              <div className="text-3xl font-bold text-white mb-2">
                {result.created} inserted &nbsp;&bull;&nbsp; {result.updated ?? 0} updated
              </div>
              <div className="text-sm text-white/40">
                {result.skipped} skipped &bull; {result.errors} errors &bull; {result.total} total
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white/60 hover:text-white border border-white/12 hover:bg-white/[0.07] transition-all">
                <RefreshCw className="h-4 w-4" /> Import another file
              </button>
              <button onClick={() => router.push('/spares')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2A4D69, #1e3a52)', border: '1px solid rgba(134,187,216,0.25)' }}>
                View Spares
              </button>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}
