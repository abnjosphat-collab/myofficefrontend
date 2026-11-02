// app/ppe/RainsuitView.tsx — the Engineering rainsuit register: every size requirement with its source size beside
// the canonical size, derived fulfilment, and unmatched rows kept visible. The download carries the filtered result;
// totals reconcile to the displayed scope.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox, DataTable, EmptyState, SearchField, Select, StatusBadge, type Column } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { CANONICAL_SIZES, NO_RAINSUIT_FILTERS, filterRequirements, summarizeRequirements, type RainsuitFilters } from './calcRainsuit';
import type { PPERequirement } from './types';

const ALL = 'all';

const COLUMNS: Column<PPERequirement>[] = [
  {
    id: 'who', header: 'Employee', sticky: true,
    cell: r => <div className="min-w-0"><p className="font-medium text-ink">{r.employee_name || r.source_name}</p><p className="text-caption text-ink-muted">{r.employee_id || 'Not linked yet'}</p></div>,
  },
  { id: 'source', header: 'Source size', cell: r => r.size_source || 'Unknown' },
  { id: 'size', header: 'Size', cell: r => r.size_canonical || 'Unknown' },
  { id: 'qty', header: 'Qty', cell: r => <span className="tabular">{r.quantity}</span> },
  {
    id: 'fulfilled', header: 'Issued',
    cell: r => (r.fulfilled
      ? <StatusBadge tone="success">Fulfilled</StatusBadge>
      : <StatusBadge tone="neutral">{r.employee_id ? 'Outstanding' : 'Unmatched'}</StatusBadge>),
  },
  { id: 'notes', header: 'Notes', cell: r => <span className="min-w-0 [overflow-wrap:anywhere]">{r.notes}</span> },
];

const DOWNLOAD: DLColumn[] = [
  { key: 'employee_id', label: 'Mine No.', width: 12 },
  { key: 'employee_name', label: 'Employee', width: 24 },
  { key: 'size_source', label: 'Source Size', width: 13 },
  { key: 'size_canonical', label: 'Size', width: 9 },
  { key: 'quantity', label: 'Qty', width: 8 },
  { key: 'fulfilled', label: 'Issued', width: 13, format: v => (v ? 'Fulfilled' : 'Outstanding') },
  { key: 'notes', label: 'Notes', width: 40 },
];

export function RainsuitView({ rows }: { rows: PPERequirement[] }) {
  const [f, setF] = useState<RainsuitFilters>(NO_RAINSUIT_FILTERS);
  const set = (patch: Partial<RainsuitFilters>) => setF(prev => ({ ...prev, ...patch }));
  const reset = () => setF(NO_RAINSUIT_FILTERS);

  const filtered = useMemo(() => filterRequirements(rows, f), [rows, f]);
  const summary = useMemo(() => summarizeRequirements(filtered), [filtered]);
  const scopeFiltered = f.search !== '' || f.size !== ALL || f.fulfilment !== ALL || !f.showUnmatched;
  const subtitle = `${filtered.length} of ${rows.length} requirements${scopeFiltered ? ' (filtered)' : ''} · ${summary.total} rainsuits${summary.unknown > 0 ? ` · ${summary.unknown} unknown size` : ''}`;
  const downloadable = useMemo(() => filtered.map(r => ({
    employee_id: r.employee_id || '', employee_name: r.employee_name || r.source_name,
    size_source: r.size_source, size_canonical: r.size_canonical || 'Unknown',
    quantity: r.quantity, fulfilled: r.fulfilled, notes: r.notes,
  })), [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search name or mine number" wrapperClassName="min-w-48 max-w-sm flex-1" />
        <Select aria-label="Size" className="w-44" value={f.size} onValueChange={v => set({ size: v })} options={[{ value: ALL, label: 'All sizes' }, ...CANONICAL_SIZES.map(s => ({ value: s, label: `${s} (${summary.bySize(s)})` }))]} />
        <Select aria-label="Issue state" className="w-44" value={f.fulfilment} onValueChange={v => set({ fulfilment: v as RainsuitFilters['fulfilment'] })} options={[{ value: ALL, label: 'Fulfilled + outstanding' }, { value: 'fulfilled', label: 'Fulfilled' }, { value: 'outstanding', label: 'Outstanding' }]} />
        <Checkbox label="Show unmatched" description="Rows with no mine number yet." checked={f.showUnmatched} onChange={e => set({ showUnmatched: e.target.checked })} />
        {scopeFiltered && <button type="button" className="font-sans text-label font-semibold text-action" onClick={reset}>Clear filters</button>}
        <span className="ml-auto"><DownloadButton data={downloadable} columns={DOWNLOAD} filename={exportFilename('PPE_Rainsuit_Register')} title="Rainsuit Register" subtitle={subtitle} /></span>
      </div>
      <p className="font-sans text-body-sm text-ink" role="status">
        {CANONICAL_SIZES.map(s => `${s}: ${summary.bySize(s)}`).join(' · ')}{summary.unknown > 0 && ` · Unknown: ${summary.unknown}`}
      </p>
      {filtered.length === 0 ? (
        <EmptyState icon="ppe" title={scopeFiltered ? 'Nothing matches' : 'No rainsuit requirements yet'} description={scopeFiltered ? 'Try fewer filters.' : 'Imported size requirements will appear here with their fulfilment.'} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted" role="status">{subtitle}</p>
          <DataTable caption="Rainsuit requirements" rows={filtered} columns={COLUMNS} getRowId={r => r.id} stillKey={JSON.stringify(f)} />
        </>
      )}
    </div>
  );
}
