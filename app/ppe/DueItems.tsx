// app/ppe/DueItems.tsx — the PPE that is overdue or expiring within 30 days, oldest first. Narrow it by type, size, name or a date range,
// see how many of each size are needed, and act on a selection: add to the order list, or mark not required for the items the matrix
// flags that do not actually need replacing. Marking is reversible.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, EmptyState, Field, Input, Notice, SearchField, Segmented, Select, type Column } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { daysUntil } from '@/lib/dates';
import { thisWeekRange, type OrderListEntry } from './calcPPE';
import { ItemMenu, StandingBadge, type ItemActions } from './PPEItemViews';
import { NO_DUE_FILTERS, dueItems, sizeCounts, sizeOf, type DueFilters, type DueMode } from './ppeLogic';
import { TYPE_OPTIONS, typeName } from './ppeMeta';
import type { PPERecord } from './types';

const ALL = 'all';
export const toOrderEntry = (r: PPERecord): OrderListEntry => ({ record_id: String(r.id), employee_id: r.employee_id, employee_name: r.employee_name, ppe_type: r.ppe_type, item_name: r.item_name, size: r.size, expiry_date: r.expiry_date, added_at: new Date().toISOString() });

export function DueItems({ records, counts, actions, onBulkNotRequired, onAddToOrder, sectionActive }: {
  records: PPERecord[]; counts: { overdue: number; soon: number }; actions: ItemActions; onBulkNotRequired: (ids: string[]) => Promise<void>; onAddToOrder: (entries: OrderListEntry[]) => void; sectionActive: boolean;
}) {
  const [mode, setMode] = useState<DueMode>('overdue');
  const [f, setF] = useState<DueFilters>(NO_DUE_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<DueFilters>) => setF(prev => ({ ...prev, ...patch }));
  const reset = () => { setF(NO_DUE_FILTERS); setSelected(new Set()); };

  const typed = useMemo(() => dueItems(records, mode, f), [records, mode, f]);
  const sizes = useMemo(() => sizeCounts(typed), [typed]);
  const sizeChoice = sizes.some(([s]) => s === f.size) ? f.size : ALL; // a size that no longer applies is not applied
  const rows = useMemo(() => typed.filter(r => sizeChoice === ALL || sizeOf(r) === sizeChoice), [typed, sizeChoice]);
  const filtered = f.type !== ALL || sizeChoice !== ALL || f.search !== '' || f.from !== '' || f.to !== '';
  const chosen = rows.filter(r => selected.has(String(r.id)));

  const COLUMNS: Column<PPERecord>[] = [
    { id: 'who', header: 'Employee', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink">{r.employee_name}</p><p className="text-caption text-ink-muted">{[r.employee_id, r.position].filter(Boolean).join(', ')}</p></div> },
    { id: 'item', header: 'Item', cell: r => <div className="min-w-0"><p className="[overflow-wrap:anywhere]">{typeName(r.ppe_type)}{r.size && <span className="text-ink-muted">, size {r.size}</span>}</p><p className="text-caption text-ink-muted">{r.item_name}</p></div> },
    { id: 'expiry', header: 'Expires', cell: r => { const d = r.expiry_date ? daysUntil(r.expiry_date) : null; return <div className="whitespace-nowrap"><p className="tabular">{r.expiry_date ? fmtDate(r.expiry_date) : 'None'}</p>{d !== null && <p className="text-caption text-ink-muted tabular">{d <= 0 ? `${Math.abs(d)} ${Math.abs(d) === 1 ? 'day' : 'days'} overdue` : `in ${d} ${d === 1 ? 'day' : 'days'}`}</p>}</div>; } },
    { id: 'standing', header: 'State', cell: r => <StandingBadge r={r} /> },
  ];
  const markNotRequired = async () => { setBusy(true); try { await onBulkNotRequired(chosen.map(r => String(r.id))); setSelected(new Set()); } finally { setBusy(false); } };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Which items" value={mode} onValueChange={v => { setMode(v as DueMode); reset(); }} options={[{ value: 'overdue', label: `Overdue (${counts.overdue})` }, { value: 'soon', label: `Expiring soon (${counts.soon})` }]} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search employee or item" wrapperClassName="min-w-48 max-w-sm flex-1" />
        <Select aria-label="PPE type" className="w-44" value={f.type} onValueChange={v => set({ type: v })} options={[{ value: ALL, label: 'All types' }, ...TYPE_OPTIONS]} />
        <Select aria-label="Size" className="w-36" value={sizeChoice} onValueChange={v => set({ size: v })} options={[{ value: ALL, label: 'All sizes' }, ...sizes.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} />
        <Field label="Expires from" className="w-40"><Input type="date" value={f.from} onChange={e => set({ from: e.target.value })} /></Field>
        <Field label="Expires to" className="w-40"><Input type="date" value={f.to} onChange={e => set({ to: e.target.value })} /></Field>
        <Button onClick={() => { const w = thisWeekRange(); set({ from: w.from, to: w.to }); }}>This week</Button>
        {filtered && <Button variant="ghost" icon="close" onClick={reset}>Clear filters</Button>}
      </div>
      {sizes.length > 0 && <p className="font-sans text-caption text-ink-muted" aria-label="Items needed per size">Needed by size: {sizes.map(([s, n]) => `${s} ${n}`).join(', ')}</p>}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
          <span className="font-sans text-label font-semibold text-ink">{chosen.length} selected</span>
          <Button size="sm" icon="cart" onClick={() => { onAddToOrder(chosen.map(toOrderEntry)); setSelected(new Set()); }}>Add to the order list</Button>
          <Button size="sm" icon="close" pending={busy} onClick={markNotRequired}>Mark not required</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}

      {rows.length === 0 ? (
        filtered
          ? <EmptyState icon="search" title="Nothing matches" description="Try fewer filters." action={<Button onClick={reset}>Clear filters</Button>} />
          : <EmptyState icon="success" title={`No ${mode === 'overdue' ? 'overdue' : 'expiring soon'} items${sectionActive ? ' in this section' : ''}`} description={sectionActive ? 'Choose All sections to see everything.' : 'All PPE is up to date.'} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted" role="status">{rows.length} {rows.length === 1 ? 'item' : 'items'}</p>
          <DataTable caption={mode === 'overdue' ? 'Overdue PPE' : 'PPE expiring soon'} rows={rows} columns={COLUMNS} getRowId={r => String(r.id)} selected={selected} onSelectedChange={setSelected} onRowActivate={actions.onView} rowActions={r => <ItemMenu r={r} a={actions} />} />
          <Notice tone="info" title="About the list">Items past their replacement interval are listed even when they do not need replacing. Mark those not required and they leave the counts; you can put them back.</Notice>
        </>
      )}
    </div>
  );
}

