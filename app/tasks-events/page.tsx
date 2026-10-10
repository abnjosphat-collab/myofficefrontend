// app/tasks-events/page.tsx — manager-only Events & Tasks board: events and to-dos in one list, checked off when done,
// with a completion breakdown by type. Hidden from the nav (modules.ts `minRole`) and rejected server-side (the whole
// /api/tasks-events router is manager+ in main.py); the guard below is defence in depth for a direct visit, and the
// list is only requested once the caller is known to be a manager.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, DataRegion, DataTable, Distribution, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, Panel, Progress, SearchField, Select, StatusBadge, Toolbar, deriveDataStatus, isTransientStatus, sortRows, type Column, type SortState, FilterField, LoadingPulse, RowActions } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { useAuth } from '@/lib/auth-context';
import { exportFilename } from '@/lib/exportUtils';
import { ItemDetailsDialog, ItemFormDialog } from './dialogs';
import { PRIORITY_TONE, TYPE_TONE, isOverdue } from './meta';
import { PRIORITIES, TASK_TYPES, type TaskEvent, type TaskEventFormData } from './types';
import { completeTaskEvent, createTaskEvent, deleteTaskEvent, reopenTaskEvent, updateTaskEvent, useTasksEvents } from './useTasksEventsData';
import { useConfirmDelete } from '@/lib/useConfirmDelete';

const ALL = '__all__';
const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'title', label: 'Title' }, { key: 'task_type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' },
  { key: 'event_date', label: 'Date', format: v => (v ? fmtDate(v as string) : '') }, { key: 'due_date', label: 'Due date', format: v => (v ? fmtDate(v as string) : '') },
  { key: 'responsible_people', label: 'Responsible', format: v => (Array.isArray(v) ? v.join(', ') : '') }, { key: 'completed_by', label: 'Completed by' },
];

function Board({ completedBy }: { completedBy: string }) {
  const confirmDelete = useConfirmDelete();
  const { items, setItems, loading, loaded, error, errorStatus, refetch } = useTasksEvents();
  const [statusF, setStatusF] = useState(ALL);
  const [typeF, setTypeF] = useState(ALL);
  const [priorityF, setPriorityF] = useState(ALL);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<TaskEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const viewing = useMemo(() => items.find(i => i.id === viewingId) ?? null, [items, viewingId]);

  const pendingItems = items.filter(i => i.status === 'pending');
  const completedItems = items.filter(i => i.status === 'completed');
  const overdueCount = items.filter(isOverdue).length;
  const byType = useMemo(() => {
    const g = new Map<string, { total: number; done: number }>(); // a record with no type is grouped, not dropped
    for (const i of items) { const k = i.task_type || 'No type'; const x = g.get(k) ?? { total: 0, done: 0 }; x.total += 1; if (i.status === 'completed') x.done += 1; g.set(k, x); }
    return [...g.entries()].map(([type, x]) => ({ type, ...x, pct: x.total ? Math.round((x.done / x.total) * 100) : 0 }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => (statusF === ALL || i.status === statusF) && (typeF === ALL || i.task_type === typeF) && (priorityF === ALL || i.priority === priorityF)
      && (!overdueOnly || isOverdue(i)) && (!q || i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)));
  }, [items, statusF, typeF, priorityF, overdueOnly, search]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => String(r[id as keyof TaskEvent] ?? '').toLowerCase()), [filtered, sort]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || statusF !== ALL || typeF !== ALL || priorityF !== ALL || overdueOnly;
  const clearFilters = () => { setSearch(''); setStatusF(ALL); setTypeF(ALL); setPriorityF(ALL); setOverdueOnly(false); };

  const openForm = (item: TaskEvent | null) => { setViewingId(null); setEditing(item); setFormOpen(true); };
  const save = async (id: number | null, data: TaskEventFormData) => {
    try { if (id === null) await createTaskEvent(data); else await updateTaskEvent(id, data); }
    catch (e) { throw new Error(`Not saved: ${(e as Error).message}`); }
    await refetch();
  };
  // Optimistic, and put back with the reason if the server refuses.
  const toggle = async (item: TaskEvent) => {
    const completing = item.status !== 'completed';
    const next: TaskEvent = completing ? { ...item, status: 'completed', completed_by: completedBy, completed_at: new Date().toISOString() } : { ...item, status: 'pending', completed_by: null, completed_at: null };
    setItems(p => p.map(i => (i.id === item.id ? next : i)));
    try { if (completing) await completeTaskEvent(item.id, completedBy); else await reopenTaskEvent(item.id); }
    catch (e) { setItems(p => p.map(i => (i.id === item.id ? item : i))); toast.error(`"${item.title}" was not updated: ${(e as Error).message}`); }
  };
  const remove = async (item: TaskEvent) => {
    await confirmDelete({ title: `Delete "${item.title}"?`, message: 'This cannot be undone.', what: `"${item.title}"`, run: async () => { await deleteTaskEvent(item.id); setViewingId(null); }, done: 'Deleted.', after: () => refetch() });
  };

  const COLUMNS: Column<TaskEvent>[] = [
    { id: 'done', header: 'Done', width: '4.5rem', cell: i => <span role="presentation" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><IconButton icon={i.status === 'completed' ? 'success' : 'pending'} size="sm" variant={i.status === 'completed' ? 'outline' : 'ghost'} pressed={i.status === 'completed'} label={i.status === 'completed' ? `Mark "${i.title}" pending` : `Mark "${i.title}" complete`} onClick={() => toggle(i)} /></span> },
    { id: 'title', header: 'Title', sortable: true, sticky: true, cell: i => <div className="min-w-0"><p className={`font-medium [overflow-wrap:anywhere] ${i.status === 'completed' ? 'text-ink-muted line-through' : 'text-ink'}`}>{i.title}</p>{!!i.responsible_people?.length && <p className="truncate text-caption text-ink-muted">{i.responsible_people.join(', ')}</p>}</div> },
    { id: 'task_type', header: 'Type', sortable: true, hideBelow: 'md', cell: i => (i.task_type ? <StatusBadge tone={TYPE_TONE[i.task_type] ?? 'neutral'}>{i.task_type}</StatusBadge> : <span className="text-ink-muted">None</span>) },
    { id: 'priority', header: 'Priority', sortable: true, hideBelow: 'md', cell: i => (i.priority ? <StatusBadge tone={PRIORITY_TONE[i.priority] ?? 'neutral'}>{i.priority}</StatusBadge> : <span className="text-ink-muted">None</span>) },
    { id: 'due_date', header: 'Due', sortable: true, cell: i => (i.due_date ? <span className={`inline-flex items-center gap-1 whitespace-nowrap tabular ${isOverdue(i) ? 'font-medium text-danger' : ''}`}>{fmtDate(i.due_date)}{isOverdue(i) && <StatusBadge tone="danger" icon="warning">Overdue</StatusBadge>}</span> : <span className="text-ink-muted">None</span>) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Manager tools' }, { label: 'Events and tasks' }]}
        title="Events and tasks"
        description="Upcoming events and to-dos in one list, checked off when done."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh events and tasks" variant="shell" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('events_tasks')} title="Events & Tasks" />}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openForm(null)}>New</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total" value={items.length} loading={pending} unavailable={unavailable} selected={statusF === ALL && !overdueOnly} onClick={clearFilters} />
        <MetricTile compact label="Pending" value={pendingItems.length} loading={pending} unavailable={unavailable} selected={statusF === 'pending'} onClick={() => setStatusF(statusF === 'pending' ? ALL : 'pending')} />
        <MetricTile compact label="Completed" tone="success" value={completedItems.length} loading={pending} unavailable={unavailable} selected={statusF === 'completed'} onClick={() => setStatusF(statusF === 'completed' ? ALL : 'completed')} />
        <MetricTile compact label="Overdue" tone={overdueCount ? 'danger' : 'default'} value={overdueCount} loading={pending} unavailable={unavailable} selected={overdueOnly} onClick={() => setOverdueOnly(v => !v)} />
      </MetricGrid>

      {loaded && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Panel title="Progress by type" description="Share of each type that is completed.">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {byType.map(g => <div key={g.type} className="flex flex-col gap-1"><p className="font-sans text-body-sm text-ink">{g.type} <span className="text-ink-muted">· {g.done} of {g.total} done</span></p><Progress value={g.pct} label={`${g.type} completion`} /></div>)}
            </div>
          </Panel></div>
          <Panel title="Completion split"><Distribution rows={[{ name: 'Completed', value: completedItems.length }, { name: 'Pending', value: pendingItems.length }]} /></Panel>
        </div>
      )}

      <Toolbar
        filtered={hasFilters}
        onClear={clearFilters}
        activeCount={priorityF !== ALL ? 1 : 0}
        moreFilters={(
          <>
          <FilterField label="Priority"><Select aria-label="Filter by priority" value={priorityF} onValueChange={setPriorityF} options={[{ value: ALL, label: 'All priorities' }, ...PRIORITIES.map(v => ({ value: v, label: v }))]} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search title or description" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }]} />
        <Select className="w-40" aria-label="Filter by type" value={typeF} onValueChange={setTypeF} options={[{ value: ALL, label: 'All types' }, ...TASK_TYPES.map(v => ({ value: v, label: v }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="events and tasks"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="Nothing matches" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="task" title="Nothing on the board yet" description="Add the first event or task." action={<Button variant="primary" icon="plus" onClick={() => openForm(null)}>New</Button>} />}
      >
        <DataTable
          caption="Events and tasks"
          rows={rows}
          columns={COLUMNS}
          getRowId={i => String(i.id)}
          sort={sort}
          onSortChange={setSort}
          onRowActivate={i => setViewingId(i.id)}
          rowActions={i => (
            <RowActions subject={`"${i.title}"`} onEdit={() => openForm(i)} onDelete={() => remove(i)} />
          )}
        />
      </DataRegion>

      <ItemDetailsDialog item={viewing} author={completedBy} onClose={() => setViewingId(null)} onEdit={openForm} onDelete={remove} onToggle={i => { toggle(i); }} />
      <ItemFormDialog open={formOpen} item={editing} onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }} onSave={save} />
    </div>
  );
}

function TasksEventsContent() {
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && profile && !isAtLeast('manager')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  // "Still checking" and "checked, nobody is signed in" are different states: a signed-out visitor must not see a spinner forever.
  if (loading) return <LoadingPulse label="Checking your access" />;
  if (!profile) return <EmptyState icon="lock" title="Sign in required" description="Sign in with a manager account (top right) to view events and tasks." />;
  if (!isAtLeast('manager')) return null;
  return <Board completedBy={profile.email || profile.id} />;
}

export default function TasksEventsPage() {
  return <AppShell migrated><TasksEventsContent /></AppShell>;
}
