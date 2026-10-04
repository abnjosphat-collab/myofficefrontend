// app/services/ImportDialog.tsx — bring jobs in from a file. A spreadsheet is read in the browser, previewed and imported row by
// row (a row the server refuses is listed with its reason and stays for a retry; rows that went in are not repeated). A PDF or an
// image is read by the server's OCR and opens the form pre-filled for review, because OCR is a guess and is never saved unchecked.
'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Icon, Notice, cn } from '@/components/ui-system';
import { fileMode, isKnownHeader, ocrToRecord, parseExcelDate, rowToRecord } from './extract';
import { createService, ocrExtract } from './useServicesData';
import type { ServiceRecord } from './types';

interface Parsed { records: ServiceRecord[]; skipped: number; headers: string[]; preview: string[][]; ignored: string[] }
const label = (r: ServiceRecord) => r.description || r.supplier || 'Row';

export function ImportDialog({ open, onOpenChange, onScanned, onImported }: {
  open: boolean; onOpenChange: (open: boolean) => void; onScanned: (r: ServiceRecord) => void; onImported: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'reading' | 'importing'>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [loadedFor, setLoadedFor] = useState(false);
  if (open !== loadedFor) { setLoadedFor(open); if (open) { setParsed(null); setError(null); setFailures([]); setBusy(null); } }

  const handleFile = async (file: File) => {
    setError(null); setFailures([]); setBusy('reading');
    try {
      if (fileMode(file.name) === 'document') {
        onScanned(ocrToRecord(await ocrExtract(file)));
        onOpenChange(false);
        return;
      }
      const XLSX = await import('xlsx');
      // cellDates: a genuine date cell otherwise arrives as a serial number (46020) instead of a date.
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!raw.length) throw new Error('No rows were found in the first sheet.');
      const headers = Object.keys(raw[0]);
      const records = raw.map(rowToRecord).filter((r): r is ServiceRecord => r !== null);
      if (!records.length) throw new Error('None of the rows has a description or a supplier, so there is nothing to import. Check the column headings.');
      setParsed({
        records, skipped: raw.length - records.length, headers, ignored: headers.filter(h => !isKnownHeader(h)),
        preview: raw.slice(0, 5).map(r => headers.map(h => { const v = r[h]; return v instanceof Date ? parseExcelDate(v) : String(v ?? ''); })),
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'The file could not be read.'); }
    finally { setBusy(null); }
  };

  const run = async () => {
    if (!parsed) return;
    setBusy('importing'); setFailures([]);
    const failed: ServiceRecord[] = []; const why: { name: string; reason: string }[] = [];
    let ok = 0;
    for (const r of parsed.records) {
      try { await createService(r); ok += 1; }
      catch (e) { failed.push(r); why.push({ name: label(r), reason: e instanceof Error ? e.message : 'Not saved.' }); }
    }
    setBusy(null);
    if (ok) onImported();
    if (failed.length === 0) { toast.success(`${ok} ${ok === 1 ? 'job' : 'jobs'} imported.`); onOpenChange(false); return; }
    toast.error(`${ok} imported, ${failed.length} not saved.`);
    setParsed({ ...parsed, records: failed, skipped: 0 });
    setFailures(why);
  };

  return (
    <Dialog
      open={open} onOpenChange={o => { if (!busy) onOpenChange(o); }} size="lg" title="Import or scan" description="A spreadsheet adds many jobs at once. A PDF or photo of a document pre-fills one job for you to check."
      footer={<><Button onClick={() => onOpenChange(false)} disabled={!!busy}>Cancel</Button>{parsed && <Button variant="primary" icon="upload" pending={busy === 'importing'} onClick={run}>{`Import ${parsed.records.length} ${parsed.records.length === 1 ? 'job' : 'jobs'}`}</Button>}</>}
    >
      <div className="flex flex-col gap-4">
        <button type="button" aria-label="Choose a file to import or scan" disabled={!!busy} onClick={() => input.current?.click()} className={cn('focus-ring flex flex-col items-center gap-1 rounded-card border-2 border-dashed border-line-control bg-surface-subtle px-4 py-8 text-center transition-colors hover:border-action', busy && 'opacity-60')}>
          <Icon name="upload" size="xl" className="text-ink-muted" />
          <span className="font-sans text-label font-medium text-ink">{busy === 'reading' ? 'Reading the file…' : parsed ? 'Choose a different file' : 'Choose a spreadsheet, PDF or image'}</span>
          <span className="font-sans text-caption text-ink-muted">.xlsx, .xls, .csv, .pdf, .jpg, .png, .tiff, .webp</span>
        </button>
        <input ref={input} type="file" hidden aria-label="File to import or scan" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {error && <Notice tone="danger" title="The file could not be used">{error}</Notice>}
        {parsed && (
          <div className="flex flex-col gap-3">
            <p className="font-sans text-body-sm text-ink" role="status">{parsed.records.length} {parsed.records.length === 1 ? 'job' : 'jobs'} ready to import{parsed.skipped > 0 ? `, ${parsed.skipped} skipped (no description or supplier)` : ''}.</p>
            {parsed.ignored.length > 0 && <Notice tone="warning" title="Some columns are not imported">{parsed.ignored.join(', ')}</Notice>}
            {failures.length > 0 && (
              <Notice tone="danger" title={`${failures.length} could not be saved`}>
                {failures.map((f, i) => <span key={i} className="mt-1 block">{f.name}: {f.reason}</span>)}
              </Notice>
            )}
            <div className="max-w-full overflow-auto rounded-control border border-line">
              <table className="w-full border-collapse font-sans text-caption text-ink">
                <caption className="sr-only">First rows of the file</caption>
                <thead><tr className="bg-surface-subtle">{parsed.headers.map(h => <th key={h} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{parsed.preview.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="max-w-[10rem] truncate whitespace-nowrap border-b border-line-subtle px-3 py-1.5 text-ink-muted">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
