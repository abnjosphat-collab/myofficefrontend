// app/timesheets/page.tsx — the maintenance timesheets: for the salaried roster or the NEC roster, one row for each person and one cell for
// each day of the period, with leave and overtime from the other modules laid over what was entered. Enter a day, fill across days, assign
// shifts in bulk (with undo), see each person's totals, and download the result as Excel or PDF. Roster exceptions and period notes stay in
// this browser. The payroll rules (the 208 cap, overtime buckets, night allowance) are in calcTotals and are unchanged.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import {
  Button, EmptyState, Field, IconButton, MetricGrid, MetricTile, Notice, PageHeader, SearchField, Segmented, Skeleton, Textarea, Toolbar, useConfirm,
} from '@/components/ui-system';
import { AddEmployeesDialog } from './AddEmployeesDialog';
import { BulkAssignDialog } from './BulkAssignDialog';
import { calcEmployeeTotals, buildEarlyMorningOtDatesForEmployee, buildModuleOt15ByDateForEmployee } from './calcTotals';
import { countPeriodCompletion } from './completion';
import { DownloadDialog } from './DownloadDialog';
import { normalizeTimesheetEmployeeCode } from './employeeCode';
import { EntryDialog } from './EntryDialog';
import { mergeEffectiveTimesheets } from './mergeEffectiveTimesheets';
import { NecScanImportPanel } from './necImport/NecScanImportPanel';
import { TimesheetGrid } from './TimesheetGrid';
import { LEAVE_TYPE_TO_STATUS, ROSTER_KEYS, fmtDate, fmtPeriod, getDays, getNECPeriod, getSalariedPeriod, notesKeyFor, statusMeta } from './timesheetMeta';
import type { EditCell, Employee, Period } from './types';
import { useTimesheetEditing } from './useTimesheetEditing';
import { useTimesheetsData } from './useTimesheetsData';

type Tab = 'salaried' | 'nec';
const readList = (key: string): string[] => { try { const v = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };
const writeList = (key: string, val: string[]) => { try { window.localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable: the change lasts until the page is closed */ } };

/** Per-person notes for one period, kept in this browser. Mounted with the period as its key, so a new period starts from its own notes. */
function PeriodNotes({ storageKey, people }: { storageKey: string; people: Employee[] }) {
  const [notes, setNotes] = useState<Record<string, string>>(() => { try { const v = JSON.parse(window.localStorage.getItem(storageKey) || '{}'); return v && typeof v === 'object' ? v as Record<string, string> : {}; } catch { return {}; } });
  const update = (id: string, note: string) => { const next = { ...notes, [id]: note }; setNotes(next); try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* kept until the page closes */ } };
  return (
    <section aria-label="Period notes" className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface p-4">
      <div><h2 className="font-display text-title font-semibold text-ink">Period notes</h2><p className="font-sans text-body-sm text-ink-muted">Context for each person in this period. Kept in this browser only.</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map(p => <Field key={p.id} label={p.name} optional><Textarea rows={2} value={notes[p.id] || ''} onChange={e => update(p.id, e.target.value)} placeholder={`Notes for ${p.name.split(' ')[0]}`} /></Field>)}
      </div>
    </section>
  );
}

function TimesheetsContent() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('nec');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const salariedPeriod = useMemo(() => getSalariedPeriod(currentMonth), [currentMonth]);
  const necPeriod = useMemo(() => getNECPeriod(currentMonth), [currentMonth]);
  const activePeriod: Period = activeTab === 'salaried' ? salariedPeriod : necPeriod;
  const days = useMemo(() => getDays(activePeriod), [activePeriod]);
  const periodDateStrs = useMemo(() => days.map(fmtDate), [days]);

  const { allEmployees, timesheets, setTimesheets, approvedLeaves, approvedOvertime, shiftAssignments, loading, refreshing, retrying, loadError, refresh: load } = useTimesheetsData(activePeriod, activeTab === 'nec');

  const [salariedExtra, setSalariedExtra] = useState<string[]>(() => readList(ROSTER_KEYS.salariedExtra));
  const [necExtra, setNecExtra] = useState<string[]>(() => readList(ROSTER_KEYS.necExtra));
  const [salariedHidden, setSalariedHidden] = useState<string[]>(() => readList(ROSTER_KEYS.salariedHidden));
  const [necHidden, setNecHidden] = useState<string[]>(() => readList(ROSTER_KEYS.necHidden));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dept'>('name');
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [bulkOpen, setBulkOpen] = useState<{ anchor: Employee; dates?: string[]; ids?: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // The automatic roster: everyone whose employment type matches the tab (no one is left off by number), plus the people added by hand, less those hidden here.
  const autoIds = useMemo(() => allEmployees.filter(e => e.employmentType === (activeTab === 'salaried' ? 'SALARIED' : 'NEC')).map(e => e.id), [allEmployees, activeTab]);
  const extra = activeTab === 'salaried' ? salariedExtra : necExtra;
  const hidden = activeTab === 'salaried' ? salariedHidden : necHidden;
  const tabIds = useMemo(() => { const h = new Set(hidden); return [...new Set([...autoIds, ...extra])].filter(id => !h.has(id)); }, [autoIds, extra, hidden]);
  const keys = activeTab === 'salaried' ? { extra: ROSTER_KEYS.salariedExtra, hidden: ROSTER_KEYS.salariedHidden, setExtra: setSalariedExtra, setHidden: setSalariedHidden } : { extra: ROSTER_KEYS.necExtra, hidden: ROSTER_KEYS.necHidden, setExtra: setNecExtra, setHidden: setNecHidden };
  const addToTab = (ids: string[]) => {
    keys.setExtra(prev => { const next = [...new Set([...prev, ...ids])]; writeList(keys.extra, next); return next; });
    keys.setHidden(prev => { const next = prev.filter(id => !ids.includes(id)); writeList(keys.hidden, next); return next; }); // re-adding someone hidden shows them again
  };
  /** An automatic person is hidden (they would reappear on every load otherwise); a person added by hand is just dropped from the list. */
  const removeFromTab = (id: string) => {
    if (autoIds.includes(id)) keys.setHidden(prev => { const next = [...new Set([...prev, id])]; writeList(keys.hidden, next); return next; });
    else keys.setExtra(prev => { const next = prev.filter(x => x !== id); writeList(keys.extra, next); return next; });
  };

  const tabEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees.filter(e => tabIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)))
      .sort((a, b) => (sortBy === 'dept' ? a.department.localeCompare(b.department) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [allEmployees, tabIds, search, sortBy]);

  // Leaves and overtime store the human employee number; timesheets use the database id. This is the join between them.
  const employeeIdByHuman = useMemo(() => { const m = new Map<string, string>(); allEmployees.forEach(e => { if (e.employeeId) m.set(normalizeTimesheetEmployeeCode(e.employeeId), e.id); }); return m; }, [allEmployees]);
  // The grid's data: real saved timesheets with approved leave and overtime laid over them. A real entry always wins; the overlay only fills gaps or adds on top.
  const effectiveTimesheets = useMemo(() => mergeEffectiveTimesheets({
    timesheets, approvedLeaves, approvedOvertime, shiftAssignments, dayStrs: periodDateStrs, tabIds, employeeIdByHuman, leaveTypeToStatus: LEAVE_TYPE_TO_STATUS, statusLabel: status => statusMeta(status).label,
  }), [timesheets, approvedLeaves, approvedOvertime, shiftAssignments, employeeIdByHuman, tabIds, periodDateStrs]);

  const getHourTotals = useCallback((empId: string) => {
    const emp = allEmployees.find(e => e.id === empId);
    return calcEmployeeTotals(empId, effectiveTimesheets, {
      periodDates: periodDateStrs, applyRegFloorWithoutAbsent: activeTab === 'nec',
      moduleOt15ByDate: emp?.employeeId ? buildModuleOt15ByDateForEmployee(emp.employeeId, approvedOvertime) : undefined,
      earlyMorningOtDates: emp?.employeeId ? buildEarlyMorningOtDatesForEmployee(emp.employeeId, approvedOvertime) : undefined,
    });
  }, [effectiveTimesheets, periodDateStrs, activeTab, allEmployees, approvedOvertime]);

  const summary = useMemo(() => {
    const tot = tabEmployees.reduce((a, e) => { const t = getHourTotals(e.id); return { reg: a.reg + t.reg, ot15: a.ot15 + t.ot15, ot20: a.ot20 + t.ot20, night: a.night + t.nightAllowanceBonus, standby: a.standby + t.standbyBonus }; }, { reg: 0, ot15: 0, ot20: 0, night: 0, standby: 0 });
    return { ...tot, ...countPeriodCompletion(tabIds, days, effectiveTimesheets) };
  }, [getHourTotals, tabEmployees, tabIds, days, effectiveTimesheets]);
  const completion = summary.possible > 0 ? Math.round((summary.filled / summary.possible) * 100) : 0;
  const selectedRoll = useMemo(() => {
    const sel = tabEmployees.filter(e => selectedIds.has(e.id));
    if (sel.length === 0) return null;
    return { count: sel.length, ...sel.reduce((a, e) => { const t = getHourTotals(e.id); return { actual: a.actual + t.actual, reg: a.reg + t.reg, ot15: a.ot15 + t.ot15, ot20: a.ot20 + t.ot20 }; }, { actual: 0, reg: 0, ot15: 0, ot20: 0 }) };
  }, [tabEmployees, selectedIds, getHourTotals]);

  const edit = useTimesheetEditing({ timesheets, setTimesheets, effectiveTimesheets, tabEmployees, activeTab, currentMonth, activePeriod, confirm });

  const toggleEmployee = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleAll = useCallback(() => setSelectedIds(prev => (tabEmployees.length > 0 && tabEmployees.every(e => prev.has(e.id)) ? new Set() : new Set(tabEmployees.map(e => e.id)))), [tabEmployees]);
  const openBulkForDay = (day: Date) => {
    if (tabEmployees.length === 0) return;
    const ds = fmtDate(day);
    const missing = tabEmployees.filter(emp => !effectiveTimesheets.some(ts => String(ts.employee_id) === String(emp.id) && ts.date === ds));
    setBulkOpen({ anchor: tabEmployees[0], dates: [ds], ids: (missing.length > 0 ? missing : tabEmployees).map(e => e.id) });
  };

  const initialUnavailable = Boolean(loadError) && allEmployees.length === 0;
  const unavailable = loading || initialUnavailable;
  const tile = { loading, unavailable: initialUnavailable };
  const shiftMonth = (by: number) => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + by, 1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Timesheets' }]}
        title="Maintenance timesheets"
        description={`${activeTab === 'salaried' ? 'Salaried' : 'NEC'} roster, ${fmtPeriod(activePeriod)}.`}
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh timesheets" variant="outline" pending={loading || refreshing} disabled={loading || refreshing} onClick={() => { void load(true); }} />
            {activeTab === 'nec' && <Button icon="documents" disabled={unavailable} onClick={() => setShowImport(true)}>Import scans</Button>}
            <Button icon="download" disabled={unavailable} onClick={() => setShowDownload(true)}>Download</Button>
            <Button variant="primary" icon="calendar" disabled={unavailable || tabEmployees.length === 0} onClick={() => setBulkOpen({ anchor: tabEmployees[0] })}>Bulk entry</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="People" icon="employees" value={tabEmployees.length} detail={activeTab === 'salaried' ? 'Salaried roster' : 'NEC roster'} {...tile} />
        <MetricTile label="Regular hours" icon="clock" value={`${summary.reg.toFixed(0)}h`} detail={`Night allowance ${summary.night.toFixed(0)}h${summary.standby > 0 ? `, standby ${summary.standby}h` : ''}`} {...tile} />
        <MetricTile label="Overtime 1.5×" icon="activity" value={`${summary.ot15.toFixed(0)}h`} {...tile} />
        <MetricTile label="Overtime 2.0×" icon="activity" value={`${summary.ot20.toFixed(0)}h`} {...tile} />
        <MetricTile label="Filled" icon="calendar" value={`${completion}%`} tone={completion === 100 ? 'success' : 'default'} detail={`${summary.filled} of ${summary.possible} days`} {...tile} />
      </MetricGrid>

      <section aria-label="Period" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Roster" value={activeTab} onValueChange={v => { setActiveTab(v as Tab); setSelectedIds(new Set()); }} options={[{ value: 'nec', label: 'NEC' }, { value: 'salaried', label: 'Salaried' }]} />
          <div className="flex items-center gap-2">
            <IconButton icon="chevron-left" variant="outline" label="Previous period" onClick={() => shiftMonth(-1)} />
            <div className="text-center"><p className="font-sans text-label font-semibold text-ink">{fmtPeriod(activePeriod)}</p><p className="font-sans text-caption text-ink-muted">{days.length} days, {activeTab === 'salaried' ? '1st to the last day of the month' : '13th to the 12th (the NEC cycle)'}</p></div>
            <IconButton icon="chevron-right" variant="outline" label="Next period" onClick={() => shiftMonth(1)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCurrentMonth(new Date())}>Current period</Button>
          <Button icon="copy" disabled={unavailable || tabEmployees.length === 0} onClick={() => { void edit.copyPrevious(); }}>Copy previous period</Button>
          <Button icon="plus" disabled={unavailable} onClick={() => setShowAdd(true)}>Add employees</Button>
        </div>
      </section>

      <Toolbar filtered={search !== ''}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, position or department" wrapperClassName="min-w-48 max-w-md flex-1" />
        <Button icon="sort" onClick={() => setSortBy(s => (s === 'name' ? 'dept' : 'name'))}>{sortBy === 'name' ? 'Sorted by name' : 'Sorted by department'}</Button>
        {search !== '' && <Button variant="ghost" icon="close" onClick={() => setSearch('')}>Clear search</Button>}
      </Toolbar>

      {loading && <div className="flex flex-col gap-3" role="status" aria-busy="true"><Skeleton className="h-10 w-full" /><Skeleton className="h-72 w-full" /><p className="font-sans text-body-sm text-ink-muted">{retrying ? 'Waiting for the server… retrying automatically.' : 'Loading timesheets…'}</p></div>}
      {!loading && refreshing && retrying && <Notice tone="info" title="Waiting for the server">Retrying automatically.</Notice>}
      {!loading && loadError && <Notice tone="danger" title="Could not load timesheets" action={<Button size="sm" icon="refresh" disabled={refreshing} onClick={() => { void load(allEmployees.length > 0); }}>Try again</Button>}>{loadError}{allEmployees.length > 0 ? ' The figures shown may be out of date.' : ''}</Notice>}

      {selectedIds.size > 0 && !loading && (
        <section aria-label="Selected employees" className="flex flex-col gap-2 rounded-control border border-line bg-action-soft px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-body-sm text-ink"><strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'employee' : 'employees'} selected</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon="calendar" onClick={() => { const anchor = tabEmployees.find(e => selectedIds.has(e.id)) ?? tabEmployees[0]; if (anchor) setBulkOpen({ anchor, ids: [...selectedIds] }); }}>Same shift for the selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
            </div>
          </div>
          {selectedRoll && <p className="font-sans text-body-sm text-ink-muted tabular">Period totals for the selected: Actual <strong className="text-ink">{selectedRoll.actual.toFixed(1)}</strong>, Reg <strong className="text-ink">{selectedRoll.reg.toFixed(1)}</strong>, 1.5× <strong className="text-ink">{selectedRoll.ot15.toFixed(1)}</strong>, 2.0× <strong className="text-ink">{selectedRoll.ot20.toFixed(1)}</strong></p>}
        </section>
      )}

      {!loading && !initialUnavailable && (
        <TimesheetGrid
          includePendingModules={activeTab === 'nec'} employees={tabEmployees} timesheets={effectiveTimesheets} days={days} getHourTotals={getHourTotals}
          onCellClick={(emp, day, entry) => setEditCell({ employee: emp, date: day, entry })} onQuickAdd={edit.quickAdd} onQuickRemove={edit.quickRemove}
          onBulkAssign={emp => setBulkOpen({ anchor: emp, ids: [emp.id] })} onBulkDay={openBulkForDay} onRemoveEmployee={removeFromTab} onFillDays={edit.fillDays}
          selectedEmployeeIds={selectedIds} onToggleEmployeeSelect={toggleEmployee} onToggleAllEmployeeSelect={toggleAll}
        />
      )}
      {!loading && initialUnavailable && <EmptyState icon="warning" title="The roster is unavailable" description="The people could not be loaded, so no grid is shown. Try again." action={<Button icon="refresh" onClick={() => { void load(); }}>Try again</Button>} />}

      {!loading && tabEmployees.length > 0 && <PeriodNotes key={notesKeyFor(activeTab, activePeriod)} storageKey={notesKeyFor(activeTab, activePeriod)} people={tabEmployees} />}

      {editCell && (
        <EntryDialog
          key={`${editCell.employee.id}:${fmtDate(editCell.date)}`} employee={editCell.employee} date={editCell.date} entry={editCell.entry}
          onSave={data => edit.saveEntry(editCell.employee.id, editCell.date, data)} onDelete={editCell.entry?.id ? () => edit.deleteEntry(editCell.entry!.id!) : undefined} onClose={() => setEditCell(null)}
        />
      )}
      {bulkOpen && (
        <BulkAssignDialog
          initialEmployee={bulkOpen.anchor} allEmployees={tabEmployees} period={activePeriod} timesheets={effectiveTimesheets} prefillDates={bulkOpen.dates} initialSelectedEmployeeIds={bulkOpen.ids}
          onSave={entries => edit.bulkSave(entries)} onClear={edit.bulkClear} onClose={() => setBulkOpen(null)}
        />
      )}
      {showAdd && <AddEmployeesDialog allEmployees={allEmployees} currentIds={tabIds} loading={loading} onAdd={emps => addToTab(emps.map(e => e.id))} onClose={() => setShowAdd(false)} />}
      {showDownload && <DownloadDialog employees={tabEmployees} timesheets={effectiveTimesheets} approvedOvertime={approvedOvertime} getHourTotals={getHourTotals} period={activePeriod} periodType={activeTab} onClose={() => setShowDownload(false)} />}
      {showImport && activeTab === 'nec' && <NecScanImportPanel open period={activePeriod} onClose={() => setShowImport(false)} onApplied={() => { void load(true); setShowImport(false); }} />}
    </div>
  );
}

export default function TimesheetsPage() {
  return <AppShell migrated><TimesheetsContent /></AppShell>;
}

