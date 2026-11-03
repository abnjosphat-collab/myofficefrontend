// app/ppe/GapsView.tsx — TEMPORARY Mining data-cleanup view (2026-11).
//
// Highlights what the workbook did not carry (sizes, titles), implausible
// dates, people with no PPE, and the import quarantine/cross-listed lists.
// Delete this file, calcGaps.ts, and the Mining "gaps" tab wiring in page.tsx
// to remove the feature.
'use client';

import { useMemo, useState } from 'react';
import { DataTable, EmptyState, Notice, SearchField, type Column } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { calcGaps, type GapRow, type GapSection } from './calcGaps';
import type { EmployeeWithPPE } from './types';

const COLUMNS: Column<GapRow>[] = [
  { id: 'who', header: 'Employee', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink">{r.employeeName || r.employeeId}</p><p className="text-caption text-ink-muted">{r.employeeId}</p></div> },
  { id: 'item', header: 'Item', cell: r => r.item || '—' },
  { id: 'date', header: 'Date', cell: r => (r.date ? <span className="whitespace-nowrap tabular">{formatDate(r.date)}</span> : '—') },
  { id: 'detail', header: 'Gap', cell: r => <span className="min-w-0 [overflow-wrap:anywhere]">{r.detail}</span> },
];

const DOWNLOAD: DLColumn[] = [
  { key: 'employeeId', label: 'Mine No.', width: 12 },
  { key: 'employeeName', label: 'Employee', width: 24 },
  { key: 'item', label: 'Item', width: 20 },
  { key: 'date', label: 'Date', width: 13, format: v => (v ? formatDate(String(v)) : '') },
  { key: 'detail', label: 'Gap', width: 50 },
];

const DISPLAY_CAP = 200;

function Section({ section, query }: { section: GapSection; query: string }) {
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const filtered = q === '' ? section.rows : section.rows.filter(r =>
      r.employeeId.toLowerCase().includes(q) || r.employeeName.toLowerCase().includes(q) ||
      r.item.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q));
    return filtered;
  }, [section.rows, q]);
  const shown = rows.slice(0, DISPLAY_CAP);
  return (
    <section aria-label={section.title} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-sans text-label font-semibold text-ink">{section.title} ({section.rows.length})</h3>
        <span className="ml-auto"><DownloadButton data={rows.map(r => ({ employeeId: r.employeeId, employeeName: r.employeeName, item: r.item, date: r.date, detail: r.detail }))} columns={DOWNLOAD} filename={exportFilename(`PPE_Gaps_${section.id}`)} title={`PPE gaps — ${section.title}`} subtitle={`${rows.length} rows`} /></span>
      </div>
      <p className="font-sans text-caption text-ink-muted">{section.blurb}</p>
      {rows.length === 0 ? (
        <EmptyState icon="ppe" title={q === '' ? 'Nothing here' : 'Nothing matches'} description={q === '' ? 'This gap is clear.' : 'Try fewer search terms.'} />
      ) : (
        <>
          <DataTable caption={section.title} rows={shown} columns={COLUMNS} getRowId={r => r.key} stillKey={`${section.id}:${q}`} />
          {rows.length > DISPLAY_CAP && <p className="font-sans text-caption text-ink-muted" role="status">Showing {DISPLAY_CAP} of {rows.length} — download carries all rows.</p>}
        </>
      )}
    </section>
  );
}

export function GapsView({ holders }: { holders: EmployeeWithPPE[] }) {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => calcGaps(holders), [holders]);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="warning" title="Temporary cleanup view">
        These gaps come from the imported workbook, not from daily use. Work through them, then this tab goes away — deleting GapsView, calcGaps and the tab wiring removes it completely.
      </Notice>
      <SearchField value={query} onValueChange={setQuery} placeholder="Search mine number, name or item" wrapperClassName="min-w-48 max-w-sm flex-1" />
      <p className="font-sans text-caption text-ink-muted" role="status">{total} gap rows across {sections.length} lists.</p>
      {sections.map(s => <Section key={s.id} section={s} query={query} />)}
    </div>
  );
}
