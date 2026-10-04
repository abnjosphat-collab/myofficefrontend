// app/shifts/page.tsx — shift assignments: who is on duty, off duty or on standby today, and the four-week schedule.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, MetricGrid, MetricTile, Notice, PageHeader, Progress, RecordCard, SearchField, Select, StatusBadge,
  Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, useConfirm, useViewPreference,
  type Column,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import { AssignDialog } from './AssignDialog';
import { EventDialog } from './EventDialog';
import { ScheduleGrid } from './ScheduleGrid';
import { ShiftDetail } from './ShiftDetail';
import { cycleProgress, d2s, daysUntilNextOn, todayStatus } from './calcShifts';
import { NO_ROSTER_FILTERS, findLeave, type RosterFilters } from './cellLogic';
import { DAY_STATUS, SHIFT_PATTERNS, STATUS_KEYS, patternOf } from './shiftMeta';
import type { ScheduleEvent, ShiftAssignment, ShiftType } from './types';
import { createAssignment, deleteAssignment, updateAssignment, useShiftsData } from './useShiftsData';

const ALL = 'all';
const SORTS = [{ value: 'created_at', label: 'Newest first' }, { value: 'name', label: 'Name A to Z' }, { value: 'shift_type', label: 'Pattern' }, { value: 'cycle_start_date', label: 'Start date' }];
const EXPORT: DLColumn[] = [
  { key: 'employee_name', label: 'Employee', width: 22 }, { key: 'employee_id', label: 'Employee ID', width: 14 }, { key: 'designation', label: 'Designation', width: 18 }, { key: 'department', label: 'Department', width: 18 },
  { key: 'section', label: 'Section', width: 16 }, { key: 'phone', label: 'Phone', width: 16 }, { key: 'shift_type', label: 'Pattern', width: 14 },
  { key: 'today', label: 'Today', width: 14, format: (_v, row) => todayStatus(row as unknown as ShiftAssignment) }, { key: 'cycle_start_date', label: 'Cycle start', width: 14, format: v => (v ? fmtDate(v as string) : '') },
];

const StatusTag = ({ a }: { a: ShiftAssignment }) => { const s = DAY_STATUS[todayStatus(a)]; return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; };
const PatternTag = ({ type }: { type: string }) => { const p = patternOf(type); return <StatusBadge tone={p.tone}>{p.label}</StatusBadge>; };

function ShiftsContent() {
  const confirm = useConfirm();
  const { assignments: list, leaves, refresh } = useShiftsData();
  const items = list.items;
  const [view, setView] = useViewPreference('shifts', VIEW_CARDS_TABLE);
  const [tab, setTab] = useState('assignments');
  const [f, setF] = useState<RosterFilters>(NO_ROSTER_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftAssignment | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [eventTarget, setEventTarget] = useState<{ assignment: ShiftAssignment; date: string } | null>(null);
  const set = (patch: Partial<RosterFilters>) => setF(p => ({ ...p, ...patch }));
  const viewing = useMemo(() => items.find(i => i.id === viewingId) ?? null, [items, viewingId]);

  const todayStr = d2s(new Date());
  const today = useMemo(() => {
    const active = items.filter(a => a.is_active);
    const by = (s: string) => active.filter(a => todayStatus(a) === s).length;
    return {
      active: active.length, on: by('on'), onStandby: by('on+standby'), off: by('off'), standby: by('standby'),
      onLeave: leaves.loaded ? active.filter(a => !!findLeave(leaves.items, a, todayStr)).length : null,
      soon: active.filter(a => { const n = daysUntilNextOn(a); return todayStatus(a) === 'off' && n !== null && n > 0 && n <= 3; }).length,
    };
  }, [items, leaves.items, leaves.loaded, todayStr]);
  const typeCounts = useMemo(() => Object.fromEntries((Object.keys(SHIFT_PATTERNS) as ShiftType[]).map(t => [t, items.filter(a => a.shift_type === t).length])), [items]);

  const filtered = useMemo(() => {
    const q = f.search.trim().toLowerCase();
    return items.filter(a =>
      (f.type === ALL || a.shift_type === f.type) && (f.status === ALL || todayStatus(a) === f.status)
      && (!q || [a.employee_name, a.employee_id, a.designation, a.department].some(s => s?.toLowerCase().includes(q))))
      .sort((a, b) => f.sort === 'name' ? a.employee_name.localeCompare(b.employee_name) : f.sort === 'shift_type' ? a.shift_type.localeCompare(b.shift_type) : f.sort === 'cycle_start_date' ? a.cycle_start_date.localeCompare(b.cycle_start_date) : (b.created_at || '').localeCompare(a.created_at || ''));
  }, [items, f]);

  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: filtered.length, transient: isTransientStatus(list.errorStatus) });
  const pending = list.loading && !list.loaded;
  const unavailable = !list.loaded && !list.loading;
  const tile = { loading: pending, unavailable };
  const hasFilters = f.type !== ALL || f.status !== ALL || !!f.search;
  const clear = () => setF(NO_ROSTER_FILTERS);
  const statusTile = (s: string) => ({ selected: f.status === s, onClick: () => set({ status: f.status === s ? ALL : s }) });

  const openForm = (a: ShiftAssignment | null) => { setViewingId(null); setEditing(a); setFormOpen(true); };
  const save = async (id: number | null, payload: Record<string, unknown>) => {
    try { if (id === null) await createAssignment(payload); else await updateAssignment(id, payload); }
    catch (e) { throw new Error(`The assignment was not saved: ${(e as Error).message}`); }
    await list.refetch();
  };
  const saveEvents = async (a: ShiftAssignment, events: ScheduleEvent[]) => {
    try { await updateAssignment(a.id, { day_overrides: events }); }
    catch (e) { throw new Error(`The events were not saved: ${(e as Error).message}`); }
    list.setItems(prev => prev.map(x => (x.id === a.id ? { ...x, day_overrides: events } : x)));
    setEventTarget(t => (t && t.assignment.id === a.id ? { ...t, assignment: { ...t.assignment, day_overrides: events } } : t));
  };
  const remove = async (a: ShiftAssignment) => {
    if (!await confirm({ title: `Remove ${a.employee_name}'s assignment?`, message: 'Their shift cycle, timing blocks and scheduled events are removed. This cannot be undone.', confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteAssignment(a.id); setViewingId(null); toast.success('Assignment removed.'); await list.refetch(); }
    catch (e) { toast.error(`The assignment was not removed: ${(e as Error).message}`); }
  };

  const COLUMNS: Column<ShiftAssignment>[] = [
    { id: 'employee_name', header: 'Employee', sticky: true, cell: a => <div><p className="font-medium text-ink">{a.employee_name}</p><p className="text-caption text-ink-muted">{a.employee_id}</p></div> },
    { id: 'shift_type', header: 'Pattern', cell: a => <PatternTag type={a.shift_type} /> },
    { id: 'today', header: 'Today', cell: a => <StatusTag a={a} /> },
    { id: 'cycle_start_date', header: 'Cycle start', hideBelow: 'md', cell: a => <span className="whitespace-nowrap tabular">{fmtDate(a.cycle_start_date)}</span> },
    { id: 'department', header: 'Department', hideBelow: 'lg', cell: a => a.department || <span className="text-ink-muted">None</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Time and attendance' }, { label: 'Shifts' }]}
        title="Shifts"
        description="Who is on duty, off duty or on standby, by shift cycle."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh shifts" variant="outline" pending={(list.loading && list.loaded) || (leaves.loading && leaves.loaded)} onClick={() => refresh()} />
            {filtered.length > 0 && <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={EXPORT} filename={exportFilename('Shifts')} title="Shifts" />}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openForm(null)}>Assign shift</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Assigned" icon="employees" value={items.length} detail={`${today.active} active`} selected={f.status === ALL} onClick={() => set({ status: ALL })} {...tile} />
        <MetricTile label="On duty" icon="active" tone="success" value={today.on} detail={today.onStandby ? `${today.onStandby} also on standby` : undefined} {...statusTile('on')} {...tile} />
        <MetricTile label="Off duty" icon="inactive" value={today.off} detail={today.soon ? `${today.soon} back within 3 days` : undefined} {...statusTile('off')} {...tile} />
        <MetricTile label="Standby" icon="clock" tone={today.standby ? 'warning' : 'default'} value={today.standby} {...statusTile('standby')} {...tile} />
        <MetricTile label="On leave today" icon="calendar" value={today.onLeave ?? undefined} unavailable={!leaves.loaded && !leaves.loading} loading={leaves.loading && !leaves.loaded} />
      </MetricGrid>
      {leaves.error && <Notice tone="warning" title="Leave records could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => leaves.refetch()}>Try again</Button>}>{leaves.error} The on-leave count and the leave marks in the schedule are incomplete.</Notice>}

      <Toolbar filtered={hasFilters} trailing={tab === 'assignments' ? <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} /> : undefined}>
        <SearchField value={f.search} onValueChange={v => set({ search: v })} placeholder="Search name, ID, designation or department" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Select className="w-48" aria-label="Filter by pattern" value={f.type} onValueChange={v => set({ type: v })} options={[{ value: ALL, label: 'All patterns' }, ...(Object.keys(SHIFT_PATTERNS) as ShiftType[]).map(t => ({ value: t, label: `${SHIFT_PATTERNS[t].label} (${typeCounts[t] ?? 0})` }))]} />
        <Select className="w-44" aria-label="Filter by today's status" value={f.status} onValueChange={v => set({ status: v })} options={[{ value: ALL, label: 'Any status today' }, ...STATUS_KEYS.map(s => ({ value: s, label: DAY_STATUS[s].label }))]} />
        <Select className="w-40" aria-label="Sort order" value={f.sort} onValueChange={v => set({ sort: v })} options={SORTS} />
        {hasFilters && <Button variant="ghost" icon="close" onClick={clear}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status} subject="shift assignments" error={list.error} onRetry={() => list.refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No assignments match" description="Try a different search or filter." action={<Button onClick={clear}>Clear filters</Button>} />
          : <EmptyState icon="clock" title="No shifts assigned yet" description="Assign the first shift cycle." action={<Button variant="primary" icon="plus" onClick={() => openForm(null)}>Assign shift</Button>} />}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Shift views">
            <TabsTrigger value="assignments" icon="employees">Assignments</TabsTrigger>
            <TabsTrigger value="schedule" icon="calendar">Four-week schedule</TabsTrigger>
          </TabsList>
          <TabsContent value="assignments" className="mt-4 flex flex-col gap-3">
            <p className="font-sans text-caption text-ink-muted">{filtered.length} of {items.length} assignments</p>
            {view === 'cards' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map(a => {
                  const st = todayStatus(a); const next = daysUntilNextOn(a); const hasCycle = (a.on_days || 0) + (a.off_days || 0) > 0;
                  return (
                    <RecordCard
                      key={a.id}
                      eyebrow={a.designation || a.department || a.employee_id}
                      title={a.employee_name}
                      status={<StatusTag a={a} />}
                      facts={[
                        { label: 'Pattern', value: <span className="inline-flex flex-wrap items-center gap-2"><PatternTag type={a.shift_type} />{a.shift_type !== 'standby' && <span className="text-ink-muted">{hasCycle ? `${a.on_days} on, ${a.off_days} off` : 'Cycle not set'}</span>}</span> },
                        ...(a.shift_type !== 'standby' && hasCycle ? [{ label: 'Cycle', value: <Progress value={cycleProgress(a)} label={`${a.employee_name} cycle position`} /> }] : []),
                        { label: 'From', value: fmtDate(a.cycle_start_date) },
                        ...(st === 'off' && next !== null ? [{ label: 'Next on duty', value: `in ${next} ${next === 1 ? 'day' : 'days'}` }] : []),
                      ]}
                      action={<span className="inline-flex gap-1"><IconButton icon="edit" size="sm" label={`Edit ${a.employee_name}'s assignment`} onClick={() => openForm(a)} /><IconButton icon="delete" variant="danger" size="sm" label={`Remove ${a.employee_name}'s assignment`} onClick={() => remove(a)} /></span>}
                      onOpen={() => setViewingId(a.id)} openLabel={`View ${a.employee_name}'s assignment`}
                    />
                  );
                })}
              </div>
            ) : (
              <DataTable
                caption="Shift assignments" rows={filtered} columns={COLUMNS} getRowId={a => String(a.id)} onRowActivate={a => setViewingId(a.id)}
                rowActions={a => <span className="inline-flex gap-1"><IconButton icon="edit" size="sm" label={`Edit ${a.employee_name}'s assignment`} onClick={() => openForm(a)} /><IconButton icon="delete" variant="danger" size="sm" label={`Remove ${a.employee_name}'s assignment`} onClick={() => remove(a)} /></span>}
              />
            )}
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleGrid assignments={filtered} leaves={leaves.items} onOpenEvent={(a, date) => setEventTarget({ assignment: a, date })} onView={a => setViewingId(a.id)} />
          </TabsContent>
        </Tabs>
      </DataRegion>

      <ShiftDetail assignment={viewing} onClose={() => setViewingId(null)} onEdit={openForm} onDelete={remove} />
      <AssignDialog open={formOpen} assignment={editing} onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }} onSave={save} />
      <EventDialog target={eventTarget} onClose={() => setEventTarget(null)} onSave={saveEvents} />
    </div>
  );
}

export default function ShiftsPage() {
  return <AppShell migrated><ShiftsContent /></AppShell>;
}
