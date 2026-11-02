// app/ppe/IssueLogView.tsx — the Mining movements log: every atomic issue, return and correction, newest first.
// Filters narrow the view; the download carries exactly the filtered result. Imported opening observations wear a
// source badge and an unknown quantity — they are history, not signed issues, and are never edited in place.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox, DataTable, EmptyState, Field, Input, SearchField, Select, StatusBadge, type Column } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { KIND_LABELS, NO_ISSUE_LOG_FILTERS, costCentreOptions, filterIssueLog, openingObservation, type IssueLogFilters, type IssueLogKind } from './calcIssueLog';
import { typeName } from './ppeMeta';
import type { PPEEvent } from './types';

const ALL = 'all';

const qtyText = (e: PPEEvent): string => (e.quantity === null || e.quantity === undefined ? 'Unknown' : String(e.quantity));

const COLUMNS = (nameOf: (id: string) => string): Column<PPEEvent>[] => [
  { id: 'date', header: 'Date', cell: e => <span className="whitespace-nowrap tabular">{formatDate(e.effective_date)}</span> },
  {
    id: 'who', header: 'Employee', sticky: true,
    cell: e => <div className="min-w-0"><p className="font-medium text-ink">{nameOf(e.employee_id) || e.employee_id}</p><p className="text-caption text-ink-muted">{e.employee_id}</p></div>,
  },
  { id: 'section', header: 'Cost centre at issue', cell: e => e.section || 'Unassigned' },
  { id: 'item', header: 'Item', cell: e => typeName(e.ppe_type) },
  { id: 'qty', header: 'Qty', cell: e => <span className="tabular">{qtyText(e)}</span> },
  {
    id: 'movement', header: 'Movement',
    cell: e => <span className="inline-flex flex-wrap items-center gap-1">{KIND_LABELS[e.kind]}{openingObservation(e) && <StatusBadge tone="neutral">Opening record</StatusBadge>}</span>,
  },
  { id: 'actor', header: 'Recorded by', cell: e => <span className="min-w-0 [overflow-wrap:anywhere]">{e.actor}</span> },
];

const DOWNLOAD: DLColumn[] = [
  { key: 'effective_date', label: 'Date', width: 13, format: v => formatDate(String(v)) },
  { key: 'employee_id', label: 'Mine No.', width: 12 },
  { key: 'employee_name', label: 'Employee', width: 24 },
  { key: 'section', label: 'Cost Centre At Issue', width: 18 },
  { key: 'ppe_type', label: 'Item', width: 20, format: v => typeName(String(v)) },
  { key: 'quantity', label: 'Qty', width: 8, format: v => (v === null || v === undefined || v === '' ? 'Unknown' : String(v)) },
  { key: 'kind', label: 'Movement', width: 13, format: (v, row) => ((row.opening ? 'Opening record — ' : '') + (KIND_LABELS[String(v) as IssueLogKind] ?? String(v))) },
  { key: 'actor', label: 'Recorded By', width: 22 },
];

export function IssueLogView({ events, nameOf }: { events: PPEEvent[]; nameOf: (id: string) => string }) {
  const [f, setF] = useState<IssueLogFilters>(NO_ISSUE_LOG_FILTERS);
  const set = (patch: Partial<IssueLogFilters>) => setF(prev => ({ ...prev, ...patch }));
  const reset = () => setF(NO_ISSUE_LOG_FILTERS);

  const items = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.ppe_type, (counts.get(e.ppe_type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => typeName(a[0]).localeCompare(typeName(b[0])));
  }, [events]);
  const centres = useMemo(() => costCentreOptions(events), [events]);
  const rows = useMemo(() => filterIssueLog(events, f), [events, f]);
  const filtered = f.from !== '' || f.to !== '' || f.kinds.length > 0 || f.item !== ALL || f.costCentre !== ALL || f.search !== '' || !f.showOpening;
  const downloadable = useMemo(() => rows.map(e => ({
    effective_date: e.effective_date, employee_id: e.employee_id, employee_name: nameOf(e.employee_id) || e.employee_id,
    section: e.section || 'Unassigned', ppe_type: e.ppe_type, quantity: e.quantity ?? '',
    kind: e.kind, opening: openingObservation(e), actor: e.actor,
  })), [rows, nameOf]);
  const subtitle = `${rows.length} of ${events.length} movements${filtered ? ' (filtered)' : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search mine number" wrapperClassName="min-w-48 max-w-sm flex-1" />
        <Select aria-label="Movement" className="w-44" value={f.kinds[0] ?? ALL} onValueChange={v => set({ kinds: v === ALL ? [] : [v as IssueLogKind] })} options={[{ value: ALL, label: 'All movements' }, ...(Object.entries(KIND_LABELS) as [IssueLogKind, string][]).map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Item" className="w-44" value={f.item} onValueChange={v => set({ item: v })} options={[{ value: ALL, label: 'All items' }, ...items.map(([t, n]) => ({ value: t, label: `${typeName(t)} (${n})` }))]} />
        <Select aria-label="Cost centre at issue" className="w-52" value={f.costCentre} onValueChange={v => set({ costCentre: v })} options={[{ value: ALL, label: 'All cost centres' }, ...centres.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} />
        <Field label="From" className="w-40"><Input type="date" value={f.from} onChange={e => set({ from: e.target.value })} /></Field>
        <Field label="To" className="w-40"><Input type="date" value={f.to} onChange={e => set({ to: e.target.value })} /></Field>
        <Checkbox label="Show opening records" description="Imported starting points with unknown quantities." checked={f.showOpening} onChange={e => set({ showOpening: e.target.checked })} />
        {filtered && <button type="button" className="font-sans text-label font-semibold text-action" onClick={reset}>Clear filters</button>}
        <span className="ml-auto"><DownloadButton data={downloadable} columns={DOWNLOAD} filename={exportFilename('PPE_Issue_Log')} title="PPE Issue Log" subtitle={subtitle} /></span>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="ppe" title={filtered ? 'Nothing matches' : 'No movements recorded yet'} description={filtered ? 'Try fewer filters.' : 'Issue PPE and each movement will appear here with who recorded it.'} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted" role="status">{subtitle}</p>
          <DataTable caption="PPE movements" rows={rows} columns={COLUMNS(nameOf)} getRowId={r => r.id} stillKey={JSON.stringify(f)} />
        </>
      )}
    </div>
  );
}
