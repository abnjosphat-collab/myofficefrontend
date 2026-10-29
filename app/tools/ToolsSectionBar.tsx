// app/tools/ToolsSectionBar.tsx — what sits above a list section (equipment, in use, employees, history): the status figures
// that double as the filter, then one toolbar with the result count, the other filters, the view switch and the actions.
'use client';

import { Button, ExportButton, FilterField, Input, MetricGrid, MetricTile, MoreMenu, SearchField, Select, Toolbar, ViewToggle, VIEW_GRID_LIST, ZoomLink, type MoreMenuItem } from '@/components/ui-system';
import { CATEGORIES, STATUS, type Status } from './prototype';
import type { ToolsWorkspace } from './useToolsWorkspace';

const FILTERS: Array<{ key: Status; label: string; tone: 'success' | 'default' | 'danger' | 'warning' }> = [
  { key: 'available', label: 'Ready to use', tone: 'success' },
  { key: 'issued', label: 'With an employee', tone: 'default' },
  { key: 'overdue', label: 'Return overdue', tone: 'danger' },
  { key: 'attention', label: 'Needs attention', tone: 'warning' },
];

export function ToolsSectionBar({ w }: { w: ToolsWorkspace }) {
  const { tab, counts, status, setStatus, tools, visibleTools, visibleActivity, employees, activeRefinements, search, view, sourceState } = w;
  const tools_ = tab === 'register' || tab === 'loans';
  const loaded = sourceState.tools.loaded;
  const total = tab === 'activity' ? visibleActivity.length : tab === 'employees' ? employees.length : visibleTools.length;
  const noun = tab === 'activity' ? (total === 1 ? 'history record' : 'history records') : tab === 'employees' ? (total === 1 ? 'employee' : 'employees') : (total === 1 ? 'item' : 'items');
  const items: MoreMenuItem[] = [
    ...(tab !== 'activity' && tab !== 'employees' ? [{ label: 'Record return', icon: 'back' as const, disabled: !counts.issued, onSelect: () => w.openAction('return') }] : []),
    { label: 'Import', icon: 'upload', onSelect: () => w.openManageModal({ kind: 'import' }) },
  ];
  const filtered = activeRefinements > 0 || !!search;
  return (
    <div className="flex flex-col gap-4">
      {tools_ && (
        <MetricGrid compact>
          <MetricTile compact label="Equipment" value={loaded ? counts.total : undefined} loading={!loaded && sourceState.tools.loading} selected={status === 'all'} onClick={() => setStatus('all')} />
          {FILTERS.map(f => (
            <MetricTile key={f.key} compact label={f.label} tone={f.key === 'issued' || (f.key === 'overdue' && !counts.overdue) || (f.key === 'attention' && !counts.attention) ? 'default' : f.tone}
              value={loaded ? (f.key === 'available' ? counts.available : f.key === 'issued' ? counts.issued - counts.overdue : f.key === 'overdue' ? counts.overdue : counts.attention) : undefined}
              loading={!loaded && sourceState.tools.loading} selected={status === f.key} onClick={() => setStatus(status === f.key ? 'all' : f.key)} />
          ))}
        </MetricGrid>
      )}
      <Toolbar
        filtered={filtered}
        activeCount={activeRefinements}
        onClear={w.resetRefinements}
        moreFilters={tools_ ? (
          <div className="flex flex-col gap-3">
            <FilterField label="Status">
              <Select aria-label="Status" value={status} onValueChange={value => setStatus(value as typeof status)}
                options={[{ value: 'all', label: 'All active tools' }, ...Object.entries(STATUS).map(([value, label]) => ({ value, label })), ...(tab !== 'loans' ? [{ value: 'archived', label: 'Archived' }] : [])]} />
            </FilterField>
            <FilterField label="Category">
              <Select aria-label="Category filter" value={w.category} onValueChange={w.setCategory}
                options={[{ value: 'all', label: 'All categories' }, ...[...new Set([...CATEGORIES, ...tools.map(tool => tool.category)])].map(value => ({ value, label: value }))]} />
            </FilterField>
            <FilterField label="Location">
              <Input aria-label="Filter by location" value={w.location === 'all' ? '' : w.location} onChange={event => w.setLocation(event.target.value || 'all')} placeholder="Type any location…" />
            </FilterField>
            <FilterField label="Sort">
              <Select aria-label="Sort tools" value={w.sort} onValueChange={w.setSort} options={[{ value: 'register', label: 'Register order' }, { value: 'name', label: 'Name A–Z' }, { value: 'status', label: 'Status' }]} />
            </FilterField>
          </div>
        ) : undefined}
        trailing={(
          <>
            <ExportButton label="Download" onPress={() => w.setModal({ kind: 'export' })} />
            {tools_ && <ViewToggle value={view} onValueChange={w.setView} options={VIEW_GRID_LIST} />}
            <MoreMenu items={items} label="Actions" />
            {tab === 'employees' && <ZoomLink zoomId="tools:new-employee" className="inline-block"><Button variant="primary" icon="plus" onClick={() => w.openManageModal({ kind: 'employee' })}>Add employee</Button></ZoomLink>}
            {tab === 'register' && <ZoomLink zoomId="tools:new-bulk-issue" className="inline-block"><Button variant="primary" onClick={() => w.openManageModal({ kind: 'bulk-issue' })} disabled={!counts.available}>Issue tools</Button></ZoomLink>}
            {tools_ && <ZoomLink zoomId="tools:new-equipment" className="inline-block"><Button variant="secondary" icon="plus" onClick={() => w.openManageModal({ kind: 'new' })}>Add equipment</Button></ZoomLink>}
          </>
        )}
      >
        <SearchField value={search} onValueChange={w.setSearch} placeholder={tab === 'employees' ? 'Search employees' : tab === 'activity' ? 'Search history' : 'Search equipment'} wrapperClassName="min-w-48 max-w-sm flex-1" />
        <span role="status" aria-live="polite" className="font-sans text-body-sm text-ink-muted">{total} {noun}</span>
      </Toolbar>
    </div>
  );
}
