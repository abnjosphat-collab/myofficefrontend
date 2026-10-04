// app/ppe/OrderListView.tsx — the items someone has flagged to order. It lives in this browser only (it is a staging list for one purchase
// order, not a record), and says so. The top shows it the way a purchase order needs it, one line per item and size with how many and
// for whom (downloadable); below, each flagged item can be issued, which clears it from the list, or removed.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, DataRegion, EmptyState, Notice, SearchField, Select, StatusBadge, useConfirm, type Column } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import { filterOrderList, groupOrderList, isExpired, isExpiringSoon, sortOrderList, type OrderListEntry, type OrderListSortKey, type OrderListUrgency } from './calcPPE';
import { TYPE_OPTIONS, typeName } from './ppeMeta';

const ALL = 'all';
const COLUMNS_EXPORT: DLColumn[] = [{ key: 'item_name', label: 'Item', width: 22 }, { key: 'size', label: 'Size', width: 10 }, { key: 'count', label: 'Qty', width: 8 }, { key: 'people', label: 'For (Employees)', width: 44 }];
const SORTS: { value: OrderListSortKey; label: string }[] = [{ value: 'expiry', label: 'Expiry date' }, { value: 'employee', label: 'Employee' }, { value: 'type', label: 'PPE type' }, { value: 'item', label: 'Item name' }, { value: 'added', label: 'Date added' }];
const URGENCY = [{ value: 'all', label: 'Any urgency' }, { value: 'overdue', label: 'Overdue only' }, { value: 'soon', label: 'Expiring soon' }];
const normSize = (s?: string) => (s || '').trim() || 'Unspecified';

export function OrderListView({ entries, onRemove, onClear, onIssue }: { entries: OrderListEntry[]; onRemove: (id: string) => void; onClear: () => void; onIssue: (e: OrderListEntry) => void }) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL);
  const [size, setSize] = useState(ALL);
  const [urgency, setUrgency] = useState<OrderListUrgency>('all');
  const [sort, setSort] = useState<OrderListSortKey>('expiry');
  const sizes = useMemo(() => [...new Set(entries.map(e => normSize(e.size)))].sort(), [entries]);
  const rows = useMemo(() => sortOrderList(filterOrderList(entries, { type, size, search, urgency }), sort), [entries, type, size, search, urgency, sort]);
  const groups = useMemo(() => groupOrderList(rows), [rows]);
  const lines = useMemo(() => groupOrderList(entries).length, [entries]);
  const filtered = type !== ALL || size !== ALL || search !== '' || urgency !== 'all';
  const clear = async () => { if (await confirm({ title: 'Clear the order list?', message: `${entries.length} flagged ${entries.length === 1 ? 'item is' : 'items are'} removed from this list. The PPE records themselves are not touched.`, confirmLabel: 'Clear', destructive: true })) onClear(); };

  const COLUMNS: Column<OrderListEntry>[] = [
    { id: 'who', header: 'For', sticky: true, cell: e => <div><p className="font-medium text-ink">{e.employee_name}</p><p className="text-caption text-ink-muted">{e.employee_id}</p></div> },
    { id: 'item', header: 'Item', cell: e => <div className="[overflow-wrap:anywhere]"><p>{typeName(e.ppe_type)}{e.size && <span className="text-ink-muted">, size {e.size}</span>}</p><p className="text-caption text-ink-muted">{e.item_name}</p></div> },
    { id: 'state', header: 'State', cell: e => (isExpired(e.expiry_date) ? <StatusBadge tone="danger">Overdue</StatusBadge> : isExpiringSoon(e.expiry_date) ? <StatusBadge tone="warning">Expiring soon</StatusBadge> : <StatusBadge tone="info">{e.expiry_date ? 'In date' : 'No expiry'}</StatusBadge>) },
    { id: 'expires', header: 'Expires', hideBelow: 'md', cell: e => <span className="whitespace-nowrap tabular">{e.expiry_date ? fmtDate(e.expiry_date) : 'None'}</span> },
  ];

  if (entries.length === 0) return <EmptyState icon="cart" title="The order list is empty" description="On the Due items tab, select the items to order and choose Add to the order list." />;
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info" title="Kept in this browser">{entries.length} {entries.length === 1 ? 'item' : 'items'}, {lines} purchase order {lines === 1 ? 'line' : 'lines'}. Nobody else sees this list, and clearing the browser&apos;s data clears it.</Notice>
      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={search} onValueChange={setSearch} placeholder="Search the order list" wrapperClassName="min-w-48 max-w-sm flex-1" />
        <Select aria-label="PPE type" className="w-44" value={type} onValueChange={setType} options={[{ value: ALL, label: 'All types' }, ...TYPE_OPTIONS]} />
        <Select aria-label="Size" className="w-32" value={size} onValueChange={setSize} options={[{ value: ALL, label: 'All sizes' }, ...sizes.map(s => ({ value: s, label: s }))]} />
        <Select aria-label="Urgency" className="w-40" value={urgency} onValueChange={v => setUrgency(v as OrderListUrgency)} options={URGENCY} />
        <Select aria-label="Sort by" className="w-36" value={sort} onValueChange={v => setSort(v as OrderListSortKey)} options={SORTS} />
        {filtered && <Button variant="ghost" icon="close" onClick={() => { setSearch(''); setType(ALL); setSize(ALL); setUrgency('all'); }}>Clear filters</Button>}
        <Button variant="danger" icon="delete" className="ml-auto" onClick={clear}>Clear the list</Button>
      </div>

      <DataRegion status={rows.length ? 'ready' : 'empty'} subject="order list" empty={<EmptyState icon="search" title="Nothing matches" description="Try fewer filters." />}>
        <section aria-labelledby="po-h" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="po-h" className="font-display text-title font-semibold text-ink">Purchase order lines</h2>
            <DownloadButton data={groups.map(g => ({ item_name: g.item_name, size: g.size, count: g.count, people: g.people.join(', ') })) as unknown as Record<string, unknown>[]} columns={COLUMNS_EXPORT} filename={exportFilename('PPE_Order_List')} title="PPE Order List" subtitle={`${rows.length} items`} />
          </div>
          <ul className="flex flex-col divide-y divide-line-subtle" aria-label="Purchase order lines">
            {groups.map(g => <li key={`${g.ppe_type}-${g.size}`} className="flex flex-wrap items-baseline gap-x-3 py-2 font-sans text-body-sm"><span className="font-semibold tabular text-ink">{g.count} ×</span><span className="font-medium text-ink">{typeName(g.ppe_type)}, size {g.size}</span><span className="min-w-0 flex-1 text-ink-muted [overflow-wrap:anywhere]">for {g.people.join(', ')}</span></li>)}
          </ul>
        </section>
        <DataTable caption="Items on the order list" rows={rows} columns={COLUMNS} getRowId={e => e.record_id} rowActions={e => <span className="inline-flex gap-1"><Button size="sm" icon="plus" onClick={() => onIssue(e)}>Issue</Button><Button size="sm" variant="ghost" onClick={() => onRemove(e.record_id)}>Remove</Button></span>} />
      </DataRegion>
    </div>
  );
}
