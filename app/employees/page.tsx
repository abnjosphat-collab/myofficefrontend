// app/employees/page.tsx — the personnel register: who works here, their role and section, and everything held about them. Cards
// grouped by section and trade, or a table; search and filters; organised exports; and a one-batch clean-up of designations,
// sections and phone numbers for managers.
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, MetricGrid, MetricTile, MoreMenu, PageHeader, Pagination, RecordCard, SearchField, Select, StatusBadge, Toolbar, ViewToggle, VIEW_CARDS_TABLE,
  deriveDataStatus, isTransientStatus, pageSlice, useConfirm, useViewPreference, type Column,
} from '@/components/ui-system';
import { exportFilename } from '@/lib/exportUtils';
import { useAuth } from '@/lib/auth-context';
import { ARTISAN_FILTER_VALUE, designationFilterOptions, normalizeDesignation } from '@/lib/employeeCatalog';
import { formatPhoneDisplay } from '@/lib/phone';
import { SECTION_ORDER, normalizeSection } from '@/lib/sections';
import { EmployeeDetail } from './EmployeeDetail';
import { EmployeeForm } from './EmployeeForm';
import { exportPersonnelRegistryExcel } from './exportPersonnelRegistry';
import { NormalizeRosterDialog } from './NormalizeRosterDialog';
import { RosterExportDialog } from './RosterExportDialog';
import { RosterGroups } from './RosterGroups';
import {
  CLASS_OPTIONS, CLASS_TONE, ETYPE_LABEL, ETYPE_TONE, NO_FILTERS, artisansOnly, filterEmployees, fullName, groupBySectionAndProfession, isFiltered, sortEmployees, summarise, tenure, type RosterFilters,
} from './roster';
import type { Employee, SortDir, SortField } from './types';
import { removeEmployee, saveEmployee, useRoster } from './useEmployeesData';

const ALL = 'all';
const SORTS: { value: SortField; label: string }[] = [
  { value: 'first_name', label: 'Name' }, { value: 'employee_id', label: 'Mine number' }, { value: 'designation', label: 'Designation' }, { value: 'section', label: 'Section' }, { value: 'date_of_engagement', label: 'Engagement date' },
];
const SHOW = [{ value: 'active', label: 'Active staff' }, { value: 'archived', label: 'Archived staff' }, { value: 'all', label: 'Everyone' }];
const ETYPES = [{ value: ALL, label: 'All types' }, { value: 'NEC', label: 'NEC' }, { value: 'SALARIED', label: 'Salaried' }];
const CLASSES = [{ value: ALL, label: 'All classes' }, ...CLASS_OPTIONS.map(c => ({ value: c as string, label: c }))];
const SECTIONS = [{ value: ALL, label: 'All sections' }, ...SECTION_ORDER.map(s => ({ value: s, label: s })), { value: 'Unassigned', label: 'Unassigned' }];
const PAGE_SIZE = 50;

/** A labelled filter inside the Filters popover. */
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="font-sans text-caption text-ink-muted">{label}</span>{children}</div>;
}

function EmployeesContent() {
  const confirm = useConfirm();
  const { isAtLeast } = useAuth();
  const canNormalise = isAtLeast('manager');
  const list = useRoster();
  const employees = list.items;
  const params = useSearchParams();
  const urlSearch = (params.get('highlight') || params.get('q') || '').trim();
  const [f, setF] = useState<RosterFilters>({ ...NO_FILTERS, search: urlSearch });
  const [seenUrl, setSeenUrl] = useState(urlSearch);
  if (urlSearch !== seenUrl) { setSeenUrl(urlSearch); if (urlSearch) setF(prev => ({ ...prev, search: urlSearch })); }
  const [view, setView] = useViewPreference('employees', VIEW_CARDS_TABLE);
  const [sortBy, setSortBy] = useState<SortField>('first_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [formFor, setFormFor] = useState<{ employee: Employee | null } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [normalising, setNormalising] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const set = (patch: Partial<RosterFilters>) => { setF(prev => ({ ...prev, ...patch })); setPage(1); };

  const active = useMemo(() => employees.filter(e => e.archived !== true), [employees]);
  const viewing = useMemo(() => employees.find(e => e.id === viewingId) ?? null, [employees, viewingId]);
  const matches = useMemo(() => sortEmployees(filterEmployees(employees, f), sortBy, sortDir), [employees, f, sortBy, sortDir]);
  const visible = pageSlice(matches, page, PAGE_SIZE);
  const stats = useMemo(() => summarise(employees), [employees]);
  const roleOptions = useMemo(() => designationFilterOptions([...new Set(active.map(e => (e.designation || '').trim()).filter(Boolean))]), [active]);
  const searching = f.search.trim() !== '';
  const groups = useMemo(() => (view === 'cards' && !searching ? groupBySectionAndProfession(matches) : []), [view, searching, matches]);
  const filtered = isFiltered(f);
  const moreActive = [f.etype !== ALL, f.cls !== ALL, f.show !== NO_FILTERS.show].filter(Boolean).length;
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });
  const tile = { loading: list.loading && !list.loaded, unavailable: !list.loaded && !list.loading };
  const clear = () => { setF(NO_FILTERS); setPage(1); };
  const allOpen = groups.every(g => !closed.has(g.section));
  const toggleGroup = (key: string) => setClosed(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const save = async (data: Parameters<typeof saveEmployee>[0], id?: number) => { await saveEmployee(data, id); await list.refetch(); };
  const remove = async (e: Employee) => {
    if (!await confirm({ title: `Delete ${fullName(e)}?`, message: `${e.employee_id}. This cannot be undone. To keep the record but hide the person, archive them instead.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await removeEmployee(e.id); setViewingId(null); toast.success(`${fullName(e)} deleted.`); await list.refetch(); }
    catch (err) { toast.error(`${fullName(e)} was not deleted: ${(err as Error).message}`); }
  };
  const downloadRegistry = async () => {
    setExporting(true);
    try { await exportPersonnelRegistryExcel(active, exportFilename('Personnel_Registry')); toast.success(`Registry exported, ${active.length} people.`); }
    catch (e) { toast.error(`The export failed: ${(e as Error).message}`); }
    finally { setExporting(false); }
  };

  const actionsOf = (e: Employee) => (
    <span className="inline-flex gap-1">
      <IconButton icon="edit" size="sm" variant="ghost" label={`Edit ${fullName(e)}`} onClick={() => setFormFor({ employee: e })} />
      <IconButton icon="delete" size="sm" variant="ghost" label={`Delete ${fullName(e)}`} onClick={() => remove(e)} />
    </span>
  );
  const badges = (e: Employee, withSection: boolean) => (
    <>
      {e.archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
      {withSection && e.section && <StatusBadge tone="info">{normalizeSection(e.section)}</StatusBadge>}
      {e.employment_type && <StatusBadge tone={ETYPE_TONE[e.employment_type] ?? 'neutral'}>{ETYPE_LABEL[e.employment_type] ?? e.employment_type}</StatusBadge>}
      {e.employee_class && <StatusBadge tone={CLASS_TONE[e.employee_class] ?? 'neutral'}>{e.employee_class}</StatusBadge>}
    </>
  );
  const card = (e: Employee, withSection: boolean) => (
    <RecordCard
      eyebrow={e.employee_id} title={fullName(e)} subtitle={normalizeDesignation(e.designation) || 'No designation'} openLabel={`Open ${fullName(e)}`} onOpen={() => setViewingId(e.id)}
      status={badges(e, withSection)}
      facts={[...(e.phone ? [{ label: 'Phone', value: formatPhoneDisplay(e.phone) }] : []), ...(tenure(e.date_of_engagement) ? [{ label: 'Time here', value: tenure(e.date_of_engagement) }] : []), ...(e.supervisor ? [{ label: 'Supervisor', value: e.supervisor }] : [])]}
      action={actionsOf(e)}
    />
  );
  const COLUMNS: Column<Employee>[] = [
    { id: 'name', header: 'Name', sticky: true, cell: e => <div className="min-w-0"><p className="font-medium text-ink">{fullName(e)}</p><p className="font-mono text-caption text-ink-muted">{e.employee_id}</p></div> },
    { id: 'designation', header: 'Designation', hideBelow: 'md', cell: e => normalizeDesignation(e.designation) || <span className="text-ink-muted">None</span> },
    { id: 'section', header: 'Section', hideBelow: 'md', cell: e => (e.section ? normalizeSection(e.section) : <span className="text-ink-muted">Unassigned</span>) },
    { id: 'type', header: 'Type', hideBelow: 'lg', cell: e => (e.employment_type ? <StatusBadge tone={ETYPE_TONE[e.employment_type] ?? 'neutral'}>{ETYPE_LABEL[e.employment_type] ?? e.employment_type}</StatusBadge> : <span className="text-ink-muted">Not set</span>) },
    { id: 'class', header: 'Class', cell: e => (e.employee_class ? <StatusBadge tone={CLASS_TONE[e.employee_class] ?? 'neutral'}>{e.employee_class}</StatusBadge> : <span className="text-ink-muted">Unclassified</span>) },
    { id: 'tenure', header: 'Time here', hideBelow: 'lg', cell: e => <span className="tabular">{tenure(e.date_of_engagement) || 'Not recorded'}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'Personnel' }]}
        title="Personnel register"
        description="Employee profiles, roles and the organisation's structure."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh personnel" variant="ghost" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            <MoreMenu pending={exporting} items={[
              { label: 'Registry (Excel)', icon: 'download', disabled: active.length === 0 || exporting, onSelect: downloadRegistry },
              { label: 'Organised roster', icon: 'export-roster', disabled: active.length === 0, onSelect: () => setRosterOpen(true) },
              ...(canNormalise ? [{ label: 'Normalise', icon: 'normalize' as const, disabled: active.length === 0, onSelect: () => setNormalising(true) }] : []),
            ]} />
            <Button variant="primary" icon="plus" disabled={!list.loaded} onClick={() => setFormFor({ employee: null })}>Add employee</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile label="Total staff" compact value={stats.total} selected={!filtered} onClick={clear} detail={stats.archived ? `${stats.archived} archived` : undefined} {...tile} />
        <MetricTile label="Artisans" compact value={stats.artisans} selected={artisansOnly(f)} onClick={() => set({ role: artisansOnly(f) ? ALL : ARTISAN_FILTER_VALUE })} {...tile} />
        <MetricTile label="NEC" compact value={stats.nec} selected={f.etype === 'NEC'} onClick={() => set({ etype: f.etype === 'NEC' ? ALL : 'NEC' })} {...tile} />
        <MetricTile label="Salaried" compact value={stats.salaried} selected={f.etype === 'SALARIED'} onClick={() => set({ etype: f.etype === 'SALARIED' ? ALL : 'SALARIED' })} {...tile} />
        <MetricTile label="Permanent" compact value={stats.permanent} selected={f.cls === 'Permanent'} onClick={() => set({ cls: f.cls === 'Permanent' ? ALL : 'Permanent' })} {...tile} />
      </MetricGrid>

      <Toolbar
        filtered={filtered} onClear={clear} activeCount={moreActive}
        trailing={(
          <>
            <Select aria-label="Sort by" className="w-36" value={sortBy} onValueChange={v => setSortBy(v as SortField)} options={SORTS} />
            <IconButton icon="sort" variant="ghost" label={sortDir === 'asc' ? 'Sorted ascending, reverse' : 'Sorted descending, reverse'} onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))} />
            <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
          </>
        )}
        moreFilters={(
          <>
            <FilterField label="Employment type"><Select aria-label="Employment type" value={f.etype} onValueChange={v => set({ etype: v })} options={ETYPES} /></FilterField>
            <FilterField label="Employee class"><Select aria-label="Employee class" value={f.cls} onValueChange={v => set({ cls: v })} options={CLASSES} /></FilterField>
            <FilterField label="Show"><Select aria-label="Show" value={f.show} onValueChange={v => set({ show: v as RosterFilters['show'] })} options={SHOW} /></FilterField>
          </>
        )}
      >
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search personnel" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select aria-label="Section" className="w-36" value={f.section} onValueChange={v => set({ section: v })} options={SECTIONS} />
        <Select aria-label="Designation" className="w-44" value={f.role} onValueChange={v => set({ role: v })} options={roleOptions} />
      </Toolbar>

      <DataRegion
        status={status} subject="personnel" skeletonRows={4} error={list.error} onRetry={() => list.refetch()}
        empty={filtered
          ? <EmptyState icon="search" title="No one matches" description="Try fewer filters or a different search." action={<Button onClick={clear}>Clear filters</Button>} />
          : <EmptyState icon="employees" title="No employees yet" description="Add the first one." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ employee: null })}>Add employee</Button>} />}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-caption text-ink-muted" role="status">
            {searching ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${f.search.trim()}”` : `${matches.length} ${matches.length === 1 ? 'person' : 'people'}${matches.length !== employees.length ? ` of ${employees.length}` : ''}`}
            {groups.length > 0 && `, ${groups.length} ${groups.length === 1 ? 'section' : 'sections'}`}
          </p>
          {groups.length > 1 && <Button size="sm" variant="ghost" icon={allOpen ? 'chevron-up' : 'chevron-down'} onClick={() => setClosed(allOpen ? new Set(groups.map(g => g.section)) : new Set())}>{allOpen ? 'Collapse all' : 'Expand all'}</Button>}
        </div>
        {view === 'cards' ? (
          searching || groups.length === 0
            ? <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Personnel">{visible.map(e => <li key={e.id} className="relative">{card(e, true)}</li>)}</ul>
            : <RosterGroups groups={groups} closed={closed} onToggle={toggleGroup} card={e => card(e, false)} />
        ) : (
          <DataTable caption="Personnel" rows={visible} columns={COLUMNS} getRowId={e => String(e.id)} onRowActivate={e => setViewingId(e.id)} rowActions={actionsOf} />
        )}
        {(view === 'table' || searching) && matches.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={matches.length} onPageChange={setPage} />}
      </DataRegion>

      <EmployeeDetail employee={viewing} onClose={() => setViewingId(null)} onEdit={e => { setViewingId(null); setFormFor({ employee: e }); }} onDelete={remove} />
      <EmployeeForm open={!!formFor} employee={formFor?.employee ?? null} all={employees} onOpenChange={o => { if (!o) setFormFor(null); }} onSave={save} />
      <RosterExportDialog open={rosterOpen} employees={active} onOpenChange={setRosterOpen} />
      <NormalizeRosterDialog open={normalising} employees={employees} onOpenChange={setNormalising} onComplete={() => list.refetch()} />
    </div>
  );
}

export default function EmployeesPage() {
  return <AppShell migrated><Suspense fallback={null}><EmployeesContent /></Suspense></AppShell>;
}
