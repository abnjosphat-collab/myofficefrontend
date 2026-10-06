// app/maintenance/WorkOrderListView.tsx — the work order list as it will be once the server pages and filters it: a stat strip that
// doubles as status filters, saved and built-in views, filters, a bulk bar, cards or a table, and paging. It shows what it is given
// (`items`, `total`, `status`), so loading, retrying, failure, forbidden and empty are decided by the data source and rendered by
// DataRegion; a failed load is never shown as an empty list.
'use client';

import { useState } from 'react';
import {
  Button, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Pagination, Progress, RecordCard, SearchField, Select, StatusBadge, Toolbar,
  ViewToggle, VIEW_CARDS_TABLE, useViewPreference, type Column, type DataStatus,
} from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { PRIORITY, classificationLabel, priorityMeta, statusMeta } from './meta';
import { NO_FLOW_FILTERS, type FlowFilters, type SavedView } from './savedViews';
import type { WorkOrderPriority } from './types';
import type { FlowOrder } from './workflowTypes';

const SORTS = [{ value: 'due', label: 'Due soonest' }, { value: 'priority', label: 'Priority' }, { value: 'number', label: 'Newest number' }];
const CLASSES = [{ value: 'all', label: 'Any type' }, { value: 'breakdown', label: 'Breakdown' }, { value: 'planned_maintenance', label: 'Preventive' }, { value: 'project', label: 'Project' }, { value: 'custom', label: 'Other' }];
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const isOverdueFlow = (o: FlowOrder) => !!o.due_date && o.due_date < todayIso() && !['completed', 'cancelled', 'not-done'].includes(o.status);

export interface Counts { all: number; open: number; inProgress: number; overdue: number; awaiting: number }

export function WorkOrderListView({ items, total, counts, status, error, onRetry, filters, onFiltersChange, views, onSaveView, onDeleteView, page, pageSize, onPageChange, onOpen, onNew, onBreakdown, onAssign, canAssign }: {
  items: FlowOrder[]; total: number; counts: Counts | null; status: DataStatus; error: string | null; onRetry: () => void;
  filters: FlowFilters; onFiltersChange: (f: FlowFilters) => void;
  views: SavedView[]; onSaveView: (name: string) => void; onDeleteView: (id: string) => void;
  page: number; pageSize: number; onPageChange: (p: number) => void; onOpen: (o: FlowOrder) => void; onNew: () => void; onBreakdown: () => void;
  onAssign: (orders: FlowOrder[]) => void; canAssign: boolean;
}) {
  const [view, setView] = useViewPreference('maintenance-flow', VIEW_CARDS_TABLE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const set = (patch: Partial<FlowFilters>) => onFiltersChange({ ...filters, ...patch });
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FLOW_FILTERS);
  const tile = { loading: counts === null && (status === 'loading' || status === 'retrying'), unavailable: counts === null && (status === 'error' || status === 'unauthorized') };
  const chosen = items.filter(o => selected.has(String(o.id)));
  const badges = (o: FlowOrder) => (
    <>
      <StatusBadge tone={statusMeta(o.status).tone}>{statusMeta(o.status).label}</StatusBadge>
      {isOverdueFlow(o) && <StatusBadge tone="danger">Overdue</StatusBadge>}
      {o.awaiting_signoff && <StatusBadge tone="info">Awaiting sign-off</StatusBadge>}
    </>
  );
  const assigneeText = (o: FlowOrder) => o.assignee.text
    ? <span>{o.assignee.text}{o.assignee_now_on_leave && <span className="block text-caption font-medium text-warning">Now on leave</span>}</span>
    : <span className="text-ink-muted">{o.needs_assignment ? 'Needs assignment' : 'Unassigned'}</span>;

  const columns: Column<FlowOrder>[] = [
    { id: 'wo', header: 'Work order', sticky: true, cell: o => (
      <div className="min-w-0">
        <p className="font-medium text-ink [overflow-wrap:anywhere]">{o.machine.text}</p>
        <p className="text-caption text-ink-muted tabular">{[`#${o.number}`, classificationLabel(o), o.section.text, o.source.kind === 'schedule' ? `Schedule: ${o.source.ref}` : o.source.kind === 'request' ? `Request ${o.source.ref}` : ''].filter(Boolean).join(' · ')}</p>
      </div>) },
    { id: 'status', header: 'Status', cell: o => <div className="flex flex-col items-start gap-1"><span className="flex flex-wrap gap-1">{badges(o)}</span><span className="text-caption text-ink-muted">{priorityMeta(o.priority).label} priority</span></div> },
    { id: 'who', header: 'Assigned', hideBelow: 'md', cell: assigneeText },
    { id: 'due', header: 'Due', hideBelow: 'md', cell: o => (o.due_date ? <span className={isOverdueFlow(o) ? 'font-semibold text-danger tabular' : 'tabular'}>{fmtDate(o.due_date)}{isOverdueFlow(o) && <span className="sr-only">, overdue</span>}</span> : <span className="text-ink-muted">No deadline</span>) },
    { id: 'progress', header: 'Progress', cell: o => <div className="min-w-32"><Progress value={o.progress} label={`${o.machine.text} progress`} /></div> },
  ];

  const stat = (label: string, key: FlowFilters['status'], value: number | undefined, tone: 'default' | 'warning' | 'danger' = 'default') => (
    <MetricTile compact label={label} value={value ?? 0} tone={tone} selected={filters.status === key} onClick={() => set({ status: filters.status === key ? 'all' : key })} {...tile} />
  );

  return (
    <div className="flex flex-col gap-4">
      <MetricGrid compact>
        {stat('Work orders', 'all', counts?.all)}
        {stat('In progress', 'in-progress', counts?.inProgress)}
        {stat('Pending', 'pending', counts?.open)}
        {stat('Overdue', 'overdue', counts?.overdue, counts?.overdue ? 'danger' : 'default')}
        {stat('Awaiting sign-off', 'awaiting-signoff', counts?.awaiting, counts?.awaiting ? 'warning' : 'default')}
      </MetricGrid>

      <div role="group" aria-label="Saved views" className="flex flex-wrap items-center gap-1.5">
        <span className="font-sans text-caption text-ink-muted">Views:</span>
        {views.map(v => {
          const on = JSON.stringify(v.filters) === JSON.stringify(filters);
          return (
            <span key={v.id} className="inline-flex items-center gap-0.5">
              <Button size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => onFiltersChange(on ? NO_FLOW_FILTERS : v.filters)}>{v.name}</Button>
              {!v.builtin && <IconButton icon="close" size="sm" variant="ghost" label={`Delete the view ${v.name}`} onClick={() => onDeleteView(v.id)} />}
            </span>
          );
        })}
        <Button size="sm" variant="ghost" icon="save" disabled={!filtered} onClick={() => { setName(''); setNaming(true); }}>Save view</Button>
      </div>

      <Toolbar
        filtered={filtered} onClear={() => onFiltersChange(NO_FLOW_FILTERS)}
        trailing={(<><Select aria-label="Order" className="w-36" value={filters.sort} onValueChange={v => set({ sort: v as FlowFilters['sort'] })} options={SORTS} /><ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} /></>)}
      >
        <SearchField value={filters.search} onValueChange={search => set({ search })} placeholder="Search machine, number or person" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select aria-label="Type" className="w-40" value={filters.classification} onValueChange={v => set({ classification: v as FlowFilters['classification'] })} options={CLASSES} />
        <Select aria-label="Assignee" className="w-40" value={filters.assignee} onValueChange={v => set({ assignee: v as FlowFilters['assignee'] })} options={[{ value: 'all', label: 'Anyone' }, { value: 'me', label: 'Assigned to me' }, { value: 'unassigned', label: 'Unassigned' }]} />
      </Toolbar>
      <div role="group" aria-label="Filter by priority" className="flex flex-wrap items-center gap-1.5">
        <span className="font-sans text-caption text-ink-muted">Priority:</span>
        {(Object.keys(PRIORITY) as WorkOrderPriority[]).map(p => { const on = filters.priorities.includes(p); return <Button key={p} size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => set({ priorities: on ? filters.priorities.filter(x => x !== p) : [...filters.priorities, p] })}>{PRIORITY[p].label}</Button>; })}
      </div>

      {view === 'table' && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
          <span className="font-sans text-label font-semibold text-ink">{selected.size} selected</span>
          {canAssign && <Button size="sm" icon="user" onClick={() => onAssign(chosen)}>Assign…</Button>}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}

      <DataRegion
        status={status} subject="work orders" error={error} onRetry={onRetry}
        empty={filtered
          ? <EmptyState icon="search" title="No work orders match" description="Try fewer filters or a different search." action={<Button onClick={() => onFiltersChange(NO_FLOW_FILTERS)}>Clear filters</Button>} />
          : <EmptyState icon="wrench" title="No work orders yet" description="Raise the first one." action={<Button variant="primary" icon="plus" onClick={onNew}>New work order</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{total} {total === 1 ? 'work order' : 'work orders'}</p>
        {view === 'cards' ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Work orders">
            {items.map(o => (
              <li key={o.id} className="relative">
                <RecordCard
                  eyebrow={`#${o.number}`} title={o.machine.text} subtitle={o.description} openLabel={`Open work order ${o.number}, ${o.machine.text}`} onOpen={() => onOpen(o)} status={badges(o)}
                  facts={[{ label: 'Assigned', value: o.assignee.text || (o.needs_assignment ? 'Needs assignment' : 'Unassigned') }, { label: 'Priority', value: priorityMeta(o.priority).label }, ...(o.due_date ? [{ label: 'Due', value: fmtDate(o.due_date) }] : [])]}
                  meta={<div className="w-full min-w-40"><Progress value={o.progress} label={`${o.machine.text} progress`} /></div>}
                />
              </li>
            ))}
          </ul>
        ) : (
          <DataTable caption="Work orders" rows={items} columns={columns} getRowId={o => String(o.id)} selected={selected} onSelectedChange={setSelected} onRowActivate={onOpen} />
        )}
        {total > pageSize && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
      </DataRegion>

      <div className="flex flex-wrap gap-2 md:hidden">
        <Button variant="primary" icon="plus" onClick={onNew}>Quick work order</Button>
        <Button icon="breakdown" onClick={onBreakdown}>Breakdown</Button>
      </div>

      <FormDialog open={naming} onOpenChange={setNaming} size="sm" title="Save this view" description="Saved in this browser only." submitLabel="Save view" onSubmit={async () => { if (!name.trim()) return false; onSaveView(name.trim()); }}>
        <Field label="Name" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Friday meeting" autoFocus /></Field>
      </FormDialog>
    </div>
  );
}
