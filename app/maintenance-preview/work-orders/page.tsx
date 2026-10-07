// app/maintenance-preview/work-orders/page.tsx — the list: one search, three views as plain links, a table, nothing else until asked.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, Dialog, EmptyState, MoreMenu, Select, SearchField, StatusBadge, ViewToggle, VIEW_CARDS_TABLE, Toolbar, FilterField, RecordCard, cn, type Column } from '@/components/ui-system';
import { useRouter } from 'next/navigation';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE, fmt, isOverdue, type WorkOrder } from '../fixtures';
import { NewWorkOrderDialog } from '../NewWorkOrderDialog';
import { PageFrame } from '../PageFrame';
import { usePreview } from '../store';
import { WorkOrderRecord } from '../WorkOrderRecord';

const VIEWS = [{ id: 'all', label: 'All' }, { id: 'mine', label: 'Mine' }, { id: 'overdue', label: 'Overdue' }, { id: 'unassigned', label: 'Unassigned' }] as const;
type ViewId = (typeof VIEWS)[number]['id'];

export default function WorkOrdersPage() {
  const { orders } = usePreview();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [view, setView] = useState<ViewId>('all');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState<'cards' | 'table'>('table');
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => orders.filter(o => {
    if (view === 'mine' && !o.assignees.includes('A. Moyo')) return false;
    if (view === 'overdue' && !isOverdue(o)) return false;
    if (view === 'unassigned' && (o.assignees.length > 0 || o.status === 'completed')) return false;
    if (status !== 'all' && o.status !== status) return false;
    const t = q.trim().toLowerCase();
    return !t || [o.machine, o.title, o.number, ...o.assignees].some(s => s.toLowerCase().includes(t));
  }), [orders, q, view, status]);
  const current = orders.find(o => o.id === open) ?? null;
  const openCount = orders.filter(o => o.status !== 'completed').length;
  const overdueCount = orders.filter(isOverdue).length;

  const COLUMNS: Column<WorkOrder>[] = [
    { id: 'wo', header: 'Work order', sticky: true, cell: w => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{w.machine}, {w.title}{(w.priority === 'high' || w.priority === 'urgent') && <span className="ml-2 text-caption font-semibold text-danger">{PRIORITY_LABEL[w.priority]}</span>}</p><p className="text-caption text-ink-muted tabular">{[w.number, w.type, w.source].filter(Boolean).join(' · ')}</p></div> },
    { id: 'status', header: 'Status', cell: w => <span className="flex flex-wrap gap-1"><StatusBadge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</span> },
    { id: 'who', header: 'Assigned', hideBelow: 'md', cell: w => (w.assignees.length ? w.assignees.join(', ') : <span className="text-ink-muted">Unassigned</span>) },
    { id: 'due', header: 'Due', hideBelow: 'md', cell: w => <span className={cn('tabular', isOverdue(w) && 'font-semibold text-danger')}>{fmt(w.due)}</span> },
  ];

  return (
    <PageFrame title="Work orders" crumbs={[{ label: 'Work orders' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <div className="flex flex-col gap-3">
        <Toolbar
          inline={1}
          trailing={<><ViewToggle value={mode} onValueChange={setMode} options={VIEW_CARDS_TABLE} className="hidden sm:inline-flex" /><MoreMenu label="" items={[{ label: 'Download', icon: 'upload', onSelect: () => undefined }, { label: 'Select several', onSelect: () => undefined }, { label: 'Save this view', onSelect: () => undefined }]} /></>}
          moreFilters={<FilterField label="Status"><Select aria-label="Status" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'Any status' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]} /></FilterField>}
          activeCount={status === 'all' ? 0 : 1} filtered={status !== 'all' || q !== ''} onClear={() => { setStatus('all'); setQ(''); }}
        >
          <SearchField value={q} onValueChange={setQ} label="Search work orders" placeholder="Search machine, number or person" wrapperClassName="w-full sm:w-80" />
        </Toolbar>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div role="group" aria-label="View" className="flex gap-4">
            {VIEWS.map(v => <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} className="focus-ring border-b-2 border-transparent py-1 font-sans text-label text-ink-muted hover:text-ink aria-pressed:border-action aria-pressed:font-semibold aria-pressed:text-ink">{v.label}</button>)}
          </div>
          <p className="font-sans text-body-sm text-ink-muted" aria-live="polite">{openCount} open · {overdueCount} overdue · showing {rows.length}</p>
        </div>
      </div>

      {rows.length === 0 ? <EmptyState icon="search" title="No work orders match" description="Change the view or clear the filters." action={<Button onClick={() => { setView('all'); setStatus('all'); setQ(''); }}>Clear filters</Button>} /> : mode === 'table' ? (
        <div className="hidden sm:block"><DataTable caption="Work orders" rows={rows} columns={COLUMNS} getRowId={w => String(w.id)} onRowActivate={w => setOpen(w.id)} density="comfortable" /></div>
      ) : null}
      <ul aria-label="Work orders" className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', mode === 'table' && 'sm:hidden', rows.length === 0 && 'hidden')}>
        {rows.map(w => <li key={w.id}><RecordCard title={`${w.machine}, ${w.title}`} eyebrow={w.number} onOpen={() => router.push(`/maintenance-preview/work-orders/${w.id}`)} openLabel={`Open work order ${w.number}`} status={<><StatusBadge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</>} facts={[{ label: 'Assigned', value: w.assignees.join(', ') || 'Unassigned' }, { label: 'Due', value: fmt(w.due) }]} /></li>)}
      </ul>

      <Dialog open={!!current} onOpenChange={o => { if (!o) setOpen(null); }} size="xl" title={current ? `${current.machine}, ${current.title}` : ''} description={current ? `${current.number} · ${current.type}` : undefined} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {current && <WorkOrderRecord order={current} compact />}
      </Dialog>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
    </PageFrame>
  );
}
