// app/documents/viewer/OfficeViewers.tsx — Word (.docx) and spreadsheet files drawn inside the page. Word files are laid out as pages by
// docx-preview; spreadsheets are read by SheetJS and shown as tables, one tab per sheet. Both load their library only when a file of
// that kind is opened, so the Documents page itself stays light.
'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Notice, Segmented, Spinner } from '@/components/ui-system';
import { printHtml, printTable } from './printing';
import { useFetchedFile } from './useFetchedFile';

export type PrintHandle = MutableRefObject<(() => Promise<void>) | null>;

function Loading({ what }: { what: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 p-8 font-sans text-body-sm text-ink-muted"><Spinner /> Opening {what}…</div>;
}

export function DocxView({ url, name, printRef }: { url: string; name: string; printRef: PrintHandle }) {
  const file = useFetchedFile(url, 'buffer');
  const host = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<{ url: string; message: string } | null>(null);
  const [drawn, setDrawn] = useState<string | null>(null);

  useEffect(() => {
    const target = host.current;
    if (file.status !== 'ready' || !file.data || !target) return;
    let cancelled = false;
    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        target.innerHTML = '';
        await renderAsync(file.data!, target, target, { className: 'docx', inWrapper: true, breakPages: true, useBase64URL: true, ignoreLastRenderedPageBreak: true });
        if (cancelled) return;
        setDrawn(url);
        printRef.current = () => printHtml(target.innerHTML, name, '.docx-wrapper{background:white!important;padding:0!important}.docx-wrapper>section.docx{box-shadow:none!important;margin:0!important}');
      } catch {
        if (!cancelled) setProblem({ url, message: 'This Word file could not be drawn here. It may be damaged or password protected. Download it to open it in Word.' });
      }
    })();
    return () => { cancelled = true; printRef.current = null; target.innerHTML = ''; };
  }, [file.status, file.data, url, name, printRef]);

  if (file.status === 'error') return <Notice tone="warning" title="The file could not be opened">{file.error}</Notice>;
  if (problem?.url === url) return <Notice tone="warning" title="The file could not be drawn">{problem.message}</Notice>;
  return (
    <>
      {drawn !== url && <Loading what="the document" />}
      <div ref={host} className="max-h-[68dvh] min-h-0 overflow-auto rounded-control bg-surface-muted" aria-label={`${name}, as pages`} />
    </>
  );
}

const MAX_ROWS = 1000;
const MAX_COLUMNS = 40;
interface Sheet { name: string; rows: string[][]; cut: boolean }

async function readSheets(buffer: ArrayBuffer): Promise<Sheet[]> {
  const XLSX = await import('xlsx');
  const book = XLSX.read(buffer, { type: 'array', cellDates: true });
  return book.SheetNames.map(name => {
    const all = XLSX.utils.sheet_to_json<string[]>(book.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false });
    const wide = all.some(r => r.length > MAX_COLUMNS);
    return { name, rows: all.slice(0, MAX_ROWS).map(r => r.slice(0, MAX_COLUMNS).map(String)), cut: all.length > MAX_ROWS || wide };
  });
}

export function SheetView({ url, name, printRef }: { url: string; name: string; printRef: PrintHandle }) {
  const file = useFetchedFile(url, 'buffer');
  const [read, setRead] = useState<{ url: string; sheets?: Sheet[]; error?: string } | null>(null);
  const [chosen, setChosen] = useState(0);

  useEffect(() => {
    if (file.status !== 'ready' || !file.data) return;
    let cancelled = false;
    readSheets(file.data)
      .then(sheets => { if (!cancelled) { setRead({ url, sheets }); setChosen(0); } })
      .catch(() => { if (!cancelled) setRead({ url, error: 'This spreadsheet could not be read here. It may be damaged or password protected. Download it to open it in Excel.' }); });
    return () => { cancelled = true; };
  }, [file.status, file.data, url]);

  const mine = read?.url === url ? read : null;
  const sheet = mine?.sheets?.[chosen];
  useEffect(() => {
    printRef.current = sheet ? () => printTable(sheet.rows, `${name}: ${sheet.name}`) : null;
    return () => { printRef.current = null; };
  }, [sheet, name, printRef]);

  if (file.status === 'error') return <Notice tone="warning" title="The file could not be opened">{file.error}</Notice>;
  if (mine?.error) return <Notice tone="warning" title="The file could not be read">{mine.error}</Notice>;
  if (!mine?.sheets || !sheet) return <Loading what="the spreadsheet" />;
  const sheets = mine.sheets;
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {sheets.length > 1 && <Segmented label="Sheet" value={String(chosen)} onValueChange={v => setChosen(Number(v))} options={sheets.map((s, i) => ({ value: String(i), label: s.name }))} />}
      {sheet.cut && <Notice tone="info" title="Showing the first part of this sheet">Only the first {MAX_ROWS} rows and {MAX_COLUMNS} columns are drawn. Download the file to see all of it.</Notice>}
      <div className="max-h-[62dvh] overflow-auto rounded-control border border-line">
        <table className="min-w-full border-collapse font-sans text-body-sm" aria-label={`${name}, sheet ${sheet.name}`}>
          <tbody>
            {sheet.rows.length === 0 && <tr><td className="p-3 text-ink-muted">This sheet is empty.</td></tr>}
            {sheet.rows.map((row, r) => (
              <tr key={r} className={r === 0 ? 'bg-surface-muted font-medium' : 'odd:bg-surface even:bg-surface-subtle'}>
                {row.map((cell, c) => <td key={c} className="max-w-[24rem] border border-line-subtle px-2 py-1 align-top [overflow-wrap:anywhere]">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
