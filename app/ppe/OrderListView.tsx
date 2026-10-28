// app/ppe/OrderListView.tsx — the order basket: overdue items join on their own; what someone flags by hand (early items, free
// lines) and what is shut out (exclusions) is shared on the server, so everyone who signs in sees the same list. The top shows it
// the way a purchase order needs it, one line per item and size with how many and for whom (downloadable); below, each line can be
// issued, edited, or removed, and shut-out lines can be restored.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, DataRegion, EmptyState, Icon, MoreMenu, MultiSelectFilter, Notice, SearchField, Select, StatusBadge, useConfirm, ZoomLink, type Column, type FilterOption } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import { filterOrderList, groupOrderList, isExpired, isExpiringSoon, sortOrderList, type OrderListEntry, type OrderListSortKey, type OrderListUrgency } from './calcPPE';
import { toOrderEntry } from './DueItems';
import { ChooseSoonDialog, FreeLineDialog, LineEditDialog } from './OrderLineDialogs';
import { type Basket, type BasketLine } from './orderBasket';
import { typeName } from './ppeMeta';
import { matchesTypeFilter, type TypeFilter } from './ppeTypes';
import type { FreeLineDraft, OrderLinePatch } from './useOrderList';
import type { PPERecord } from './types';

const ALL = 'all';
const COLUMNS_EXPORT: DLColumn[] = [{ key: 'item_name', label: 'Item', width: 22 }, { key: 'size', label: 'Size', width: 10 }, { key: 'count', label: 'Qty', width: 8 }, { key: 'people', label: 'For (Employees)', width: 44 }];
const SORTS: { value: OrderListSortKey; label: string }[] = [{ value: 'expiry', label: 'Expiry date' }, { value: 'employee', label: 'Employee' }, { value: 'type', label: 'PPE type' }, { value: 'item', label: 'Item name' }, { value: 'added', label: 'Date added' }];
const URGENCY = [{ value: 'all', label: 'Any urgency' }, { value: 'overdue', label: 'Overdue only' }, { value: 'soon', label: 'Expiring soon' }];
const normSize = (s?: string) => (s || '').trim() || 'Unspecified';

export interface BasketAddables {
  thisWeek: { from: string; to: string; records: PPERecord[] };
  nextWeek: { from: string; to: string; records: PPERecord[] };
  soon: PPERecord[];
}

export function OrderListView({ basket, addables, typeFilter, typeOptions, onTypeFilterChange, onIssue, onRemove, onRemoveMany, onExclude, onRestore, onUpdate, onKeepManual, onAddMany, onAddFree, onClearManual }: {
  basket: Basket; addables: BasketAddables; typeFilter: TypeFilter; typeOptions: FilterOption[]; onTypeFilterChange: (patch: Partial<TypeFilter>) => void;
  onIssue: (line: BasketLine) => void;
  onRemove: (id: string) => void; onRemoveMany: (ids: string[]) => void;
  onExclude: (line: BasketLine) => void; onRestore: (id: string) => void;
  onUpdate: (id: string, patch: OrderLinePatch) => void; onKeepManual: (ids: string[]) => void;
  onAddMany: (entries: OrderListEntry[]) => void; onAddFree: (draft: FreeLineDraft) => void; onClearManual: () => void;
}) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [size, setSize] = useState(ALL);
  const [urgency, setUrgency] = useState<OrderListUrgency>('all');
  const [sort, setSort] = useState<OrderListSortKey>('expiry');
  const [linesOpen, setLinesOpen] = useState(false); // the purchase order lines start closed; open them when a purchase order is being prepared
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [editing, setEditing] = useState<BasketLine | null>(null);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const { lines, counts, excluded, twins, notDueLegacy } = basket;
  const sizes = useMemo(() => [...new Set(lines.map(e => normSize(e.size)))].sort(), [lines]);
  const rows = useMemo(() => sortOrderList(filterOrderList(lines, { type: typeFilter, size, search, urgency }), sort), [lines, typeFilter, size, search, urgency, sort]);
  const visibleExcluded = useMemo(() => excluded.filter(e => matchesTypeFilter(e.ppe_type, typeFilter)), [excluded, typeFilter]);
  const groups = useMemo(() => groupOrderList(rows), [rows]);
  const poLines = useMemo(() => groupOrderList(lines), [lines]);
  const totalQty = useMemo(() => poLines.reduce((s, g) => s + g.count, 0), [poLines]);
  const localActive = size !== ALL || search !== '' || urgency !== 'all'; // Clear is for these; the shared lens has its own Reset
  const nothing = lines.length === 0 && excluded.length === 0;
  const manualCount = counts.manual + counts.free;

  const addWeek = async (which: 'thisWeek' | 'nextWeek') => {
    const w = addables[which];
    if (w.records.length === 0) return;
    if (which === 'nextWeek') {
      const names = w.records.slice(0, 4).map(r => `${r.item_name || typeName(r.ppe_type)} for ${r.employee_name}`);
      const ok = await confirm({ title: `Add ${w.records.length} ${w.records.length === 1 ? 'item' : 'items'} due next week?`, message: `${w.records.length === 1 ? 'It joins' : 'They join'} the order list now, before ${w.records.length === 1 ? 'it is' : 'they are'} due (${fmtDate(w.from)} – ${fmtDate(w.to)}): ${names.join('; ')}${w.records.length > 4 ? `, and ${w.records.length - 4} more` : ''}.`, confirmLabel: 'Add to the order list' });
      if (!ok) return;
    }
    onAddMany(w.records.map(toOrderEntry));
  };
  const clear = async () => { if (await confirm({ title: 'Remove the lines added by hand?', message: `${manualCount} ${manualCount === 1 ? 'line is' : 'lines are'} removed from this list. Overdue items that join on their own and exclusions stay. The PPE records themselves are not touched.`, confirmLabel: 'Remove', destructive: true })) onClearManual(); };

  const COLUMNS: Column<BasketLine>[] = [
    { id: 'who', header: 'For', sticky: true, cell: l => <div><p className="font-medium text-ink">{l.employee_name || 'Free line'}</p><p className="text-caption text-ink-muted">{l.employee_id}</p></div> },
    { id: 'item', header: 'Item', cell: l => <div className="[overflow-wrap:anywhere]"><p>{typeName(l.ppe_type)}{l.size && <span className="text-ink-muted">, size {l.size}</span>}{(l.qty ?? 1) > 1 && <span className="font-semibold text-ink"> × {l.qty}</span>}</p><p className="text-caption text-ink-muted">{l.item_name}</p>{l.note && <p className="text-caption text-ink-muted">{l.note}</p>}</div> },
    { id: 'state', header: 'State', cell: l => (isExpired(l.expiry_date) ? <StatusBadge tone="danger">Overdue</StatusBadge> : isExpiringSoon(l.expiry_date) ? <StatusBadge tone="warning">Expiring soon</StatusBadge> : <StatusBadge tone="info">{l.expiry_date ? 'In date' : 'No expiry'}</StatusBadge>) },
    { id: 'expires', header: 'Expires', hideBelow: 'md', cell: l => <span className="whitespace-nowrap tabular">{l.expiry_date ? fmtDate(l.expiry_date) : 'None'}</span> },
  ];
  const rowActions = (l: BasketLine) => (
    <span className="inline-flex gap-1">
      {l.origin !== 'free' && <ZoomLink zoomId="ppe:new" inline><Button size="sm" icon="plus" onClick={() => onIssue(l)}>Issue</Button></ZoomLink>}
      {l.origin === 'auto' && <Button size="sm" variant="ghost" onClick={() => onExclude(l)}>Exclude</Button>}
      {l.origin !== 'auto' && <Button size="sm" variant="ghost" onClick={() => setEditing(l)}>Edit</Button>}
      {l.origin !== 'auto' && <Button size="sm" variant="ghost" onClick={() => onRemove(l.record_id)}>Remove</Button>}
    </span>
  );

  const bits = [`${counts.auto} automatic`, `${counts.manual} flagged`];
  if (counts.free > 0) bits.push(`${counts.free} free`);

  return (
    <div className="flex flex-col gap-4">
      {nothing ? (
        typeFilter.types.length > 0 ? (
          <EmptyState icon="search" title="Nothing matches the type lens" description="No order lines of these types. Reset the lens to see the whole list." action={<Button variant="ghost" icon="close" onClick={() => onTypeFilterChange({ types: [], mode: 'include' })}>Reset</Button>} />
        ) : (
          <EmptyState icon="cart" title="The order list is empty" description="Overdue items join on their own. To order ahead of time, choose what to add." action={<Button icon="plus" onClick={() => setChooseOpen(true)}>Choose from due soon</Button>} />
        )
      ) : (
        <>
          {(twins.length > 0 || notDueLegacy.length > 0) && (
            <Notice tone="warning" title="Tidy the order list">
              {twins.length > 0 && (
                <span>{twins.length} {twins.length === 1 ? 'line is' : 'lines are'} already covered by the automatic list. <Button size="sm" className="ml-1" onClick={() => onRemoveMany(twins.map(t => t.record_id))}>Remove twins</Button></span>
              )}
              {twins.length > 0 && notDueLegacy.length > 0 && <br />}
              {notDueLegacy.length > 0 && (
                <span>{notDueLegacy.length} {notDueLegacy.length === 1 ? 'line is' : 'lines are'} not due yet. <Button size="sm" className="ml-1" onClick={() => onKeepManual(notDueLegacy.map(e => e.record_id))}>Keep as manual</Button> <Button size="sm" variant="ghost" onClick={() => onRemoveMany(notDueLegacy.map(e => e.record_id))}>Remove all</Button></span>
              )}
            </Notice>
          )}
          {lines.length > 0 && <Notice tone="info" title="Shared order list">{lines.length} {lines.length === 1 ? 'item' : 'items'} ({bits.join(', ')}), {poLines.length} purchase order {poLines.length === 1 ? 'line' : 'lines'}. Everyone who signs in sees this same list; overdue items join it on their own.</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            <SearchField value={search} onValueChange={setSearch} placeholder="Search the order list" wrapperClassName="min-w-48 max-w-sm flex-1" />
            <MultiSelectFilter label="PPE types" unit="types" allLabel="All types" options={typeOptions} value={typeFilter.types} onChange={types => onTypeFilterChange({ types })} mode={typeFilter.mode} onModeChange={mode => onTypeFilterChange({ mode })} />
            <Select aria-label="Size" className="w-32" value={size} onValueChange={setSize} options={[{ value: ALL, label: 'All sizes' }, ...sizes.map(s => ({ value: s, label: s }))]} />
            <Select aria-label="Urgency" className="w-40" value={urgency} onValueChange={v => setUrgency(v as OrderListUrgency)} options={URGENCY} />
            <Select aria-label="Sort by" className="w-36" value={sort} onValueChange={v => setSort(v as OrderListSortKey)} options={SORTS} />
            {localActive && <Button variant="ghost" icon="close" onClick={() => { setSearch(''); setSize(ALL); setUrgency('all'); }}>Clear filters</Button>}
            <MoreMenu label="Add items" iconOnly={false} items={[
              { label: `Due this week (Mon–Sun) (${addables.thisWeek.records.length})`, icon: 'cart', disabled: addables.thisWeek.records.length === 0, onSelect: () => { void addWeek('thisWeek'); } },
              { label: `Due next week (Mon–Sun) (${addables.nextWeek.records.length})`, icon: 'calendar', disabled: addables.nextWeek.records.length === 0, onSelect: () => { void addWeek('nextWeek'); } },
              { label: 'Choose from due soon…', icon: 'search', onSelect: () => setChooseOpen(true) },
              { label: 'Add a free line…', icon: 'plus', onSelect: () => setFreeOpen(true) },
            ]} />
            {manualCount > 0 && <Button variant="danger-quiet" icon="delete" className="ml-auto" onClick={clear}>Clear added lines</Button>}
          </div>

          {lines.length > 0 ? (
            <DataRegion status={rows.length ? 'ready' : 'empty'} subject="order list" empty={<EmptyState icon="search" title="Nothing matches" description="Try fewer filters." />}>
              <section aria-labelledby="po-h" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="po-h" className="font-display text-title font-semibold text-ink">
                    <button type="button" aria-expanded={linesOpen} aria-controls="po-lines" onClick={() => setLinesOpen(o => !o)} className="-m-1 inline-flex items-center gap-2 rounded-control p-1 text-left hover:bg-surface-muted focus-ring">
                      <Icon name={linesOpen ? 'chevron-up' : 'chevron-down'} size="md" />Purchase order lines<span className="font-sans text-body-sm font-normal text-ink-muted">{poLines.length} {poLines.length === 1 ? 'line' : 'lines'}</span>
                    </button>
                  </h2>
                  {linesOpen && <DownloadButton data={groups.map(g => ({ item_name: g.item_name, size: g.size, count: g.count, people: g.people.join(', ') })) as unknown as Record<string, unknown>[]} columns={COLUMNS_EXPORT} filename={exportFilename('PPE_Order_List')} title="PPE Order List" subtitle={`${totalQty} items`} />}
                </div>
                <ul id="po-lines" hidden={!linesOpen} className="flex flex-col divide-y divide-line-subtle" aria-label="Purchase order lines">
                  {groups.map(g => <li key={`${g.ppe_type}-${g.size}`} className="flex flex-wrap items-baseline gap-x-3 py-2 font-sans text-body-sm"><span className="font-semibold tabular text-ink">{g.count} ×</span><span className="font-medium text-ink">{typeName(g.ppe_type)}, size {g.size}</span>{g.people.length > 0 && <span className="min-w-0 flex-1 text-ink-muted [overflow-wrap:anywhere]">for {g.people.join(', ')}</span>}</li>)}
                </ul>
              </section>
              <DataTable caption="Items on the order list" rows={rows} columns={COLUMNS} getRowId={l => l.record_id} rowActions={rowActions} />
            </DataRegion>
          ) : (
            typeFilter.types.length > 0 ? <p className="font-sans text-body-sm text-ink-muted">No order lines of these types — reset the lens above to see everything.</p> : <p className="font-sans text-body-sm text-ink-muted">No order lines right now — everything due is shut out below, or nothing is due.</p>
          )}

          {visibleExcluded.length > 0 && (
            <section aria-labelledby="ex-h" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
              <h2 id="ex-h" className="font-display text-title font-semibold text-ink">
                <button type="button" aria-expanded={excludedOpen} aria-controls="ex-lines" onClick={() => setExcludedOpen(o => !o)} className="-m-1 inline-flex items-center gap-2 rounded-control p-1 text-left hover:bg-surface-muted focus-ring">
                  <Icon name={excludedOpen ? 'chevron-up' : 'chevron-down'} size="md" />Excluded<span className="font-sans text-body-sm font-normal text-ink-muted">{visibleExcluded.length} {visibleExcluded.length === 1 ? 'line' : 'lines'} shut out of the automatic list</span>
                </button>
              </h2>
              <ul id="ex-lines" hidden={!excludedOpen} className="flex flex-col divide-y divide-line-subtle" aria-label="Excluded from the automatic list">
                {visibleExcluded.map(e => <li key={e.record_id} className="flex flex-wrap items-center gap-x-3 py-2 font-sans text-body-sm"><span className="font-medium text-ink">{e.employee_name}</span><span className="text-ink [overflow-wrap:anywhere]">{e.item_name || typeName(e.ppe_type)}{e.size && <span className="text-ink-muted">, size {e.size}</span>}</span><span className="min-w-0 flex-1 text-ink-muted">{e.expiry_date ? `expired ${fmtDate(e.expiry_date)}` : 'no expiry'}</span><Button size="sm" variant="ghost" icon="undo" onClick={() => onRestore(e.record_id)}>Restore</Button></li>)}
              </ul>
            </section>
          )}
        </>
      )}
      <LineEditDialog line={editing} onClose={() => setEditing(null)} onSave={onUpdate} />
      <ChooseSoonDialog open={chooseOpen} records={addables.soon} onClose={() => setChooseOpen(false)} onAdd={ids => onAddMany(ids.map(id => toOrderEntry(addables.soon.find(r => String(r.id) === id)!)))} />
      <FreeLineDialog open={freeOpen} onClose={() => setFreeOpen(false)} onSave={onAddFree} />
    </div>
  );
}
