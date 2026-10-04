// app/ppe/SummaryView.tsx — the PPE in numbers: how much of each kind is in use, how many of each size (with how many to reorder), and the
// compliance rate, plus the two downloads: the full register, and the plain summary that is printed and pinned on a noticeboard so
// people can check their own status.
'use client';

import { useMemo } from 'react';
import { ChartPanel, Distribution, EmptyState, MetricGrid, MetricTile } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { computeComplianceRate, computeSizeBreakdown, isExpired, isExpiringSoon } from './calcPPE';
import { conditionMeta, statusMeta, typeName, typeShort } from './ppeMeta';
import type { PPERecord } from './types';

const day = (d?: string) => (d ? formatDate(d) : '');
const colour = (_v: string, row: Record<string, unknown>) => { const x = row.expiry_date as string | null | undefined; return !x ? '6B7280' : isExpired(x) ? 'F43F5E' : isExpiringSoon(x) ? 'F59E0B' : '10B981'; };
const REGISTER: DLColumn[] = [
  { key: 'employee_name', label: 'Employee Name', width: 26 }, { key: 'employee_id', label: 'Employee ID', width: 14 }, { key: 'position', label: 'Position', width: 22 },
  { key: 'ppe_type', label: 'PPE Type', width: 22, format: v => typeName(String(v)) }, { key: 'item_name', label: 'Item / Brand', width: 30 }, { key: 'size', label: 'Size', width: 10 },
  { key: 'issue_date', label: 'Issue Date', width: 14, format: v => day(v as string) }, { key: 'expiry_date', label: 'Expiry Date', width: 14, format: v => day(v as string) },
  { key: 'condition', label: 'Condition', width: 13, format: v => conditionMeta(String(v)).label }, { key: 'status', label: 'Status', width: 13, format: v => statusMeta(String(v)).label },
  { key: 'issued_by', label: 'Issued By', width: 22 }, { key: 'location', label: 'Location', width: 16 }, { key: 'mine_section', label: 'Mine Section', width: 16 },
];
const REGISTER_PDF: DLColumn[] = [
  { key: 'employee_name', label: 'Employee' }, { key: 'employee_id', label: 'ID' }, { key: 'position', label: 'Position' }, { key: 'ppe_type', label: 'PPE Type', format: v => typeShort(String(v)) },
  { key: 'item_name', label: 'Item / Brand' }, { key: 'size', label: 'Size' }, { key: 'issue_date', label: 'Issued', format: v => day(v as string) }, { key: 'expiry_date', label: 'Expires', format: v => day(v as string) },
  { key: 'condition', label: 'Condition', format: v => conditionMeta(String(v)).label }, { key: 'status', label: 'Status', format: v => statusMeta(String(v)).label },
];
const NOTICEBOARD: DLColumn[] = [
  { key: 'employee_name', label: 'Name', width: 26 }, { key: 'ppe_type', label: 'PPE Item', width: 22, format: v => typeName(String(v)) }, { key: 'size', label: 'Size', width: 10 },
  { key: 'issue_date', label: 'Last Issue Date', width: 18, format: v => day(v as string) }, { key: 'expiry_date', label: 'Next Issue Date', width: 18, format: v => day(v as string) },
];

export function SummaryView({ records, employeeCount }: { records: PPERecord[]; employeeCount: number }) {
  const active = useMemo(() => records.filter(r => r.status === 'active'), [records]);
  const compliance = useMemo(() => computeComplianceRate(records), [records]);
  const byType = useMemo(() => { const m = new Map<string, number>(); active.forEach(r => m.set(r.ppe_type, (m.get(r.ppe_type) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ name: typeName(t), value: n })); }, [active]);
  const sizes = useMemo(() => computeSizeBreakdown(records), [records]);
  const noticeboard = useMemo(() => [...active].sort((a, b) => (a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity) - (b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity)), [active]);
  if (records.length === 0) return <EmptyState icon="ppe" title="Nothing to summarise yet" description="Issue some PPE and its numbers will appear here." />;
  return (
    <div className="flex flex-col gap-5">
      <MetricGrid columns={3}>
        <MetricTile label="Compliance" icon="compliance" tone={compliance == null ? 'default' : compliance >= 80 ? 'success' : compliance >= 60 ? 'warning' : 'danger'} value={compliance == null ? 'No data' : `${compliance}%`} detail="Active items not past expiry" />
        <MetricTile label="Active items" icon="ppe" value={active.length} detail={`${employeeCount} ${employeeCount === 1 ? 'person' : 'people'}`} />
        <MetricTile label="To reorder" icon="cart" tone={sizes.some(([, s]) => s.some(([, b]) => b.reorder > 0)) ? 'warning' : 'default'} value={sizes.reduce((a, [, s]) => a + s.reduce((x, [, b]) => x + b.reorder, 0), 0)} detail="Past their expiry" />
      </MetricGrid>
      <section aria-label="Downloads" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card"><div className="min-w-0"><p className="font-sans text-label font-semibold text-ink">Full register</p><p className="font-sans text-caption text-ink-muted">Every record, with issue and expiry dates.</p></div>
          <DownloadButton data={records as unknown as Record<string, unknown>[]} columns={REGISTER} pdfColumns={REGISTER_PDF} filename={exportFilename('PPE_Register')} title="PPE Register" subtitle={`${employeeCount} employees`} statusColumn="expiry_date" statusColor={colour} /></div>
        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card"><div className="min-w-0"><p className="font-sans text-label font-semibold text-ink">Noticeboard summary</p><p className="font-sans text-caption text-ink-muted">To print and pin up: name, item, size, last and next issue, coloured red, amber or green.</p></div>
          <DownloadButton data={noticeboard as unknown as Record<string, unknown>[]} columns={NOTICEBOARD} filename={exportFilename('PPE_Summary')} title="PPE Summary" subtitle="Who has what, and when it is due" statusColumn="expiry_date" statusColor={colour} /></div>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="In use by type" description="Active items" summary={`Active PPE by type: ${byType.map(r => `${r.name} ${r.value}`).join('; ') || 'none'}.`}><Distribution rows={byType} empty="No active items." /></ChartPanel>
        <section aria-labelledby="sz-h" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
          <div><h2 id="sz-h" className="font-display text-title font-semibold text-ink">By size</h2><p className="font-sans text-body-sm text-ink-muted">In use, and how many of those are past expiry.</p></div>
          {sizes.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No active items.</p> : (
            <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto" aria-label="Sizes by type">
              {sizes.map(([type, list]) => <li key={type}><p className="font-sans text-label font-semibold text-ink">{typeName(type)}</p><p className="font-sans text-body-sm text-ink-muted tabular">{list.map(([size, b]) => `${size} × ${b.inUse}${b.reorder ? ` (${b.reorder} to reorder)` : ''}`).join(', ')}</p></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
