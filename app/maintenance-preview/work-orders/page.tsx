// app/maintenance-preview/work-orders/page.tsx — Work orders, pattern R (register, docs/PAGE_PATTERNS.md): filter tiles, toolbar, cards or table.
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DataTable, Dialog, EmptyState, MetricGrid, MetricTile, Progress, RecordCard, SearchField, Select, Toolbar, ViewToggle, VIEW_CARDS_TABLE, useViewPreference, type Column } from '@/components/ui-system';
import { fmt, isOverdue, progressOf, type WorkOrder } from '../fixtures';
import { NewWorkOrderDialog } from '../NewWorkOrderDialog';
import { PageFrame, PriorityBadge, StatusBadges } from '../parts';
import { usePreview } from '../store';
import { WorkOrderRecord } from '../WorkOrderRecord';

const ALL = 'all';
type Filter = 'all' | 'pending' | 'in-progress' | 'awaiting-signoff' | 'overdue';
const SORTS = [{ value: 'due', label: 'Due soonest' }, { value: 'number', label: 'Newest first' }];

export default function WorkOrdersPage() {
  const { orders } = usePreview();
  const router = useRouter();
  const [view, setView] = useViewPreference('maintenance-preview-wo', VIEW_CARDS_TABLE);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('due');
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => ({ all: orders.length, pending: orders.filter(o => o.status === 'pending').length, 'in-progress': orders.filter(o => o.status === 'in-progress').length, 'awaiting-signoff': orders.filter(o => o.status === 'awaiting-signoff').length, overdue: orders.filter(isOverdue).length }), [orders]);
  const rows = useMemo(() => orders.filter(o => {
    if (filter === 'overdue' ? !isOverdue(o) : filter !== 'all' && o.status !== filter) return false;
    const t = q.trim().toLowerCase();
    return !t || [o.machine, o.title, o.number, ...o.assignees].some(s => s.toLowerCase().includes(t));
  }).sort((a, b) => (sort === 'due' ? a.due.localeCompare(b.due) : b.id - a.id)), [orders, filter, q, sort]);
  const filtered = filter !== 'all' || q !== '';
  const clear = () => { setFilter('all'); setQ(''); };
  const toggle = (f: Filter) => setFilter(cur => (cur === f ? 'all' : f));
  const current = orders.find(o => o.id === open) ?? null;
  const openRecord = (w: WorkOrder) => (typeof window !== 'undefined' && window.matchMedia('(min-width: 821px)').matches ? setOpen(w.id) : router.push(`/maintenance-preview/work-orders/${w.id}`));

  const COLUMNS: Column<WorkOrder>[] = [
    { id: 'wo', header: 'Work order', sticky: true, cell: w => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{w.machine}, {w.title}</p><p className="text-caption text-ink-muted tabular">{[`#${w.number}`, w.type, w.source].filter(Boolean).join(', ')}</p></div> },
    { id: 'status', header: 'Status', cell: w => <span className="flex flex-wrap gap-1"><StatusBadges w={w} /></span> },
    { id: 'priority', header: 'Priority', hideBelow: 'md', cell: w => <PriorityBadge p={w.priority} /> },
    { id: 'who', header: 'Assigned', hideBelow: 'md', cell: w => w.assignees.join(', ') || <span className="text-ink-muted">Unassigned</span> },
    { id: 'due', header: 'Due', hideBelow: 'md', cell: w => <span className={isOverdue(w) ? 'font-semibold text-danger tabular' : 'tabular'}>{fmt(w.due)}</span> },
    { id: 'progress', header: 'Progress', cell: w => <div className="min-w-32"><Progress value={progressOf(w)} label={`${w.machine} progress`} /></div> },
  ];

  return (
    <PageFrame crumb="Work orders" title="Work orders" description="Raise a job, assign it, follow it to sign-off." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <MetricGrid compact>
        <MetricTile compact label="Work orders" value={counts.all} selected={filter === 'all'} onClick={clear} />
        <MetricTile compact label="Pending" tone={counts.pending ? 'warning' : 'default'} value={counts.pending} selected={filter === 'pending'} onClick={() => toggle('pending')} />
        <MetricTile compact label="In progress" value={counts['in-progress']} selected={filter === 'in-progress'} onClick={() => toggle('in-progress')} />
        <MetricTile compact label="Awaiting sign-off" value={counts['awaiting-signoff']} selected={filter === 'awaiting-signoff'} onClick={() => toggle('awaiting-signoff')} />
        <MetricTile compact label="Overdue" tone={counts.overdue ? 'danger' : 'default'} value={counts.overdue} selected={filter === 'overdue'} onClick={() => toggle('overdue')} />
      </MetricGrid>

      <Toolbar filtered={filtered} onClear={clear} trailing={<><Select aria-label="Order" className="w-36" value={sort} onValueChange={setSort} options={SORTS} /><ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} /></>}>
        <SearchField value={q} onValueChange={setQ} placeholder="Search machine, person or WO number" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon="search" title="No work orders match" description="Try fewer filters or a different search." action={<Button onClick={clear}>Clear filters</Button>} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted">{rows.length} {rows.length === 1 ? 'work order' : 'work orders'}{rows.length !== orders.length ? ` of ${orders.length}` : ''}</p>
          {view === 'cards' ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Work orders">
              {rows.map(w => (
                <li key={w.id} className="relative">
                  <RecordCard eyebrow={`#${w.number}`} title={w.machine} subtitle={w.title} openLabel={`Open work order ${w.number}, ${w.machine}`} onOpen={() => openRecord(w)} status={<StatusBadges w={w} />}
                    facts={[{ label: 'Assigned', value: w.assignees.join(', ') || 'Unassigned' }, { label: 'Priority', value: <PriorityBadge p={w.priority} /> }, { label: 'Due', value: <span className={isOverdue(w) ? 'font-semibold text-danger' : ''}>{fmt(w.due)}</span> }, { label: 'Type', value: w.type }]}
                    meta={<div className="w-full min-w-40"><Progress value={progressOf(w)} label={`${w.machine} progress`} /></div>} />
                </li>
              ))}
            </ul>
          ) : <DataTable caption="Work orders" rows={rows} columns={COLUMNS} getRowId={w => String(w.id)} onRowActivate={openRecord} />}
        </>
      )}

      <Dialog open={!!current} onOpenChange={o => { if (!o) setOpen(null); }} size="xl" title={current ? `Work order ${current.number}` : 'Work order'} description={current ? `${current.machine}, ${current.title}` : undefined} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {current && <WorkOrderRecord order={current} compact />}
      </Dialog>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
    </PageFrame>
  );
}
