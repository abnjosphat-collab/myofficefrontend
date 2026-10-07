// app/maintenance-preview/work-orders/page.tsx — work orders as cards grouped by urgency (what is late comes first); the table is one click away.
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DataTable, Dialog, EmptyState, FilterField, MoreMenu, SearchField, Segmented, Select, StatusBadge, Toolbar, cn, type Column } from '@/components/ui-system';
import { InfoCard, Meter, Person, Reveal, Section, WorkStatus } from '../cards';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE, dayOffset, fmt, isOverdue, progressOf, rel, type WorkOrder } from '../fixtures';
import { NewWorkOrderDialog } from '../NewWorkOrderDialog';
import { PageFrame } from '../PageFrame';
import { usePreview } from '../store';
import { WorkOrderRecord } from '../WorkOrderRecord';

const VIEWS = [{ value: 'all', label: 'All' }, { value: 'mine', label: 'Mine' }, { value: 'overdue', label: 'Overdue' }, { value: 'unassigned', label: 'Unassigned' }] as const;
type ViewId = (typeof VIEWS)[number]['value'];
const MODES = [{ value: 'cards', label: 'Cards' }, { value: 'table', label: 'Table' }] as const;

const weekEnd = dayOffset(7);
const groupOf = (w: WorkOrder) => (w.status === 'completed' ? 'Done' : isOverdue(w) ? 'Overdue' : w.due <= weekEnd ? 'This week' : 'Later');
const GROUPS = ['Overdue', 'This week', 'Later', 'Done'] as const;

export default function WorkOrdersPage() {
  const { orders } = usePreview();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [view, setView] = useState<ViewId>('all');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState<'cards' | 'table'>('cards');
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const rows = useMemo(() => orders.filter(o => {
    if (view === 'mine' && !o.assignees.includes('A. Moyo')) return false;
    if (view === 'overdue' && !isOverdue(o)) return false;
    if (view === 'unassigned' && (o.assignees.length > 0 || o.status === 'completed')) return false;
    if (status !== 'all' && o.status !== status) return false;
    const t = q.trim().toLowerCase();
    return !t || [o.machine, o.title, o.number, ...o.assignees].some(s => s.toLowerCase().includes(t));
  }), [orders, q, view, status]);
  const current = orders.find(o => o.id === open) ?? null;
  const filtered = view !== 'all' || status !== 'all' || q !== '';
  const clear = () => { setView('all'); setStatus('all'); setQ(''); };

  const COLUMNS: Column<WorkOrder>[] = [
    { id: 'wo', header: 'Work order', sticky: true, cell: w => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{w.machine}, {w.title}{(w.priority === 'high' || w.priority === 'urgent') && <span className="ml-2 text-caption font-semibold text-danger">{PRIORITY_LABEL[w.priority]}</span>}</p><p className="text-caption text-ink-muted tabular">{[w.number, w.type, w.source].filter(Boolean).join(' · ')}</p></div> },
    { id: 'status', header: 'Status', cell: w => <span className="flex flex-wrap gap-1"><StatusBadge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</span> },
    { id: 'who', header: 'Assigned', hideBelow: 'md', cell: w => (w.assignees.length ? w.assignees.join(', ') : <span className="text-ink-muted">Unassigned</span>) },
    { id: 'due', header: 'Due', hideBelow: 'md', cell: w => <span className={cn('tabular', isOverdue(w) && 'font-semibold text-danger')}>{fmt(w.due)}</span> },
  ];
  let n = 0;

  return (
    <PageFrame title="Work orders" crumbs={[{ label: 'Work orders' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <div className="flex flex-col gap-3">
        <Toolbar
          trailing={<><Segmented label="Layout" value={mode} onValueChange={setMode} options={MODES} className="hidden sm:inline-flex" /><MoreMenu label="" items={[{ label: 'Download', icon: 'upload', onSelect: () => undefined }, { label: 'Save this view', onSelect: () => undefined }]} /></>}
          moreFilters={<FilterField label="Status"><Select aria-label="Status" value={status} onValueChange={setStatus} options={[{ value: 'all', label: 'Any status' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]} /></FilterField>}
          activeCount={status === 'all' ? 0 : 1} filtered={status !== 'all' || q !== ''} onClear={() => { setStatus('all'); setQ(''); }}
        >
          <SearchField value={q} onValueChange={setQ} label="Search work orders" placeholder="Search machine, number or person" wrapperClassName="w-full sm:w-80" />
        </Toolbar>
        <Segmented label="View" value={view} onValueChange={setView} options={VIEWS} className="self-start" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="search" title="No work orders match" description={filtered ? 'Change the view or clear the filters.' : 'Raise the first one with New work order.'} action={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined} />
      ) : mode === 'table' ? (
        <DataTable caption="Work orders" rows={rows} columns={COLUMNS} getRowId={w => String(w.id)} onRowActivate={w => setOpen(w.id)} density="comfortable" />
      ) : (
        <div className="flex flex-col gap-8">
          {GROUPS.map(g => {
            const list = rows.filter(w => groupOf(w) === g);
            if (list.length === 0) return null;
            const collapsed = g === 'Done' && !showDone && view === 'all' && !q;
            return (
              <Section key={g} title={g} count={list.length} action={g === 'Done' ? <Button variant="ghost" size="sm" onClick={() => setShowDone(v => !v)}>{collapsed ? 'Show' : 'Hide'}</Button> : undefined}>
                {!collapsed && (
                  <ul aria-label={`${g} work orders`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {list.map(w => (
                      <li key={w.id}><Reveal index={n++}>
                        <InfoCard priority={w.priority} eyebrow={<WorkStatus status={w.status} overdue={g === 'Overdue'} />} aside={w.number} title={w.machine} subtitle={w.title} openLabel={`Open work order ${w.number}`}
                          onOpen={() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 821px)').matches ? setOpen(w.id) : router.push(`/maintenance-preview/work-orders/${w.id}`))}
                          facts={<>{w.assignees.length ? <Person name={w.assignees.join(', ')} size="sm" /> : <span className="font-sans text-body-sm text-ink-muted">Unassigned</span>}<span className={cn('font-sans text-body-sm', g === 'Overdue' ? 'font-semibold text-danger' : 'text-ink-muted')}>{g === 'Done' ? fmt(w.due) : rel(w.due)}</span></>}
                          meter={w.status !== 'completed' ? <Meter value={progressOf(w)} label={`${w.machine} progress`} /> : undefined} />
                      </Reveal></li>
                    ))}
                  </ul>
                )}
              </Section>
            );
          })}
        </div>
      )}

      <Dialog open={!!current} onOpenChange={o => { if (!o) setOpen(null); }} size="xl" title={current ? current.machine : ''} description={current ? `${current.title} · ${current.number}` : undefined} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {current && <WorkOrderRecord order={current} compact />}
      </Dialog>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
    </PageFrame>
  );
}
