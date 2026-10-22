// app/timesheets/page.tsx — the NEC timesheets: the Roster tab shows one row for each person on the NEC roster and one cell for
// each day of the NEC cycle, with leave and overtime from the other modules laid over what was entered; the Person tab opens one
// person's period as day cards or a quick-view table on the shared timesheet shells, like an artisan's month. Enter a day, fill
// across days, assign shifts in bulk (with undo), see each person's totals, and download the result as Excel or PDF. Period
// notes stay in this browser; the roster itself is exactly the register (NEC, not archived). The payroll rules (the 208 cap,
// overtime buckets, night allowance) are in
// calcTotals and are unchanged.
// Salaried artisans have their own module (artisan-timesheets); this page lists NEC employment types only.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Button, Combobox, EmptyState, Field, IconButton, Notice, PageHeader, SearchField, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toolbar, MoreMenu, LoadingPulse, asString, usePersistentState } from '@/components/ui-system';
import { BulkAssignDialog } from './BulkAssignDialog';
import { calcEmployeeTotals, buildEarlyMorningOtDatesForEmployee, buildModuleOt15ByDateForEmployee } from './calcTotals';
import { countPeriodCompletion } from './completion';
import { DownloadDialog } from './DownloadDialog';
import { normalizeTimesheetEmployeeCode } from './employeeCode';
import { EntryDialog } from './EntryDialog';
import { mergeEffectiveTimesheets } from './mergeEffectiveTimesheets';
import { NecPersonView } from './NecPersonView';
import { NecQuickView } from './NecQuickView';
import { NecScanImportPanel } from './necImport/NecScanImportPanel';
import { TimesheetGrid } from './TimesheetGrid';
import { LEAVE_TYPE_TO_STATUS, RETIRED_ROSTER_KEYS, fmtDate, defaultPeriodMonth, fmtPeriod, getDays, getNECPeriod, missingEmploymentType, necRosterIds, notesKeyFor, shouldShowBulkHint, statusMeta } from './timesheetMeta';
import type { EditCell, Employee, Period } from './types';
import { useTimesheetEditing } from './useTimesheetEditing';
import { useTimesheetsData } from './useTimesheetsData';

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
  const [currentMonth, setCurrentMonth] = useState(() => defaultPeriodMonth());
  const activePeriod: Period = useMemo(() => getNECPeriod(currentMonth), [currentMonth]);
  const days = useMemo(() => getDays(activePeriod), [activePeriod]);
  const periodDateStrs = useMemo(() => days.map(fmtDate), [days]);

  const { allEmployees, timesheets, setTimesheets, approvedLeaves, approvedOvertime, shiftAssignments, loading, refreshing, retrying, loadError, refresh: load } = useTimesheetsData(activePeriod);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dept'>('name');
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [showDownload, setShowDownload] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [bulkOpen, setBulkOpen] = useState<{ anchor: Employee; dates?: string[]; ids?: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<'roster' | 'person'>('roster');
  const [personId, setPersonId] = useState('');
  const [downloadPreset, setDownloadPreset] = useState<{ scope: 'combined' | 'individual'; empId: string } | null>(null);

  // The roster is the register, nothing else: NEC employment, not archived.
  const rosterIds = useMemo(() => necRosterIds(allEmployees), [allEmployees]);
  // One-time cleanup of the retired per-browser roster exceptions (2026-10-21): anyone who added or hid people by hand
  // had those choices silently dropped, so the keys go too instead of lingering.
  useEffect(() => { try { RETIRED_ROSTER_KEYS.forEach(k => window.localStorage.removeItem(k)); } catch { /* storage unavailable */ } }, []);
  const unclassified = useMemo(() => missingEmploymentType(allEmployees), [allEmployees]);
  const unclassifiedSignature = useMemo(() => unclassified.map(p => p.id).sort().join(','), [unclassified]);
  const [dismissedUnclassified, setDismissedUnclassified] = usePersistentState('ts_blank_type_dismissed_v1', '', asString);
  const [bulkHintDismissed, setBulkHintDismissed] = usePersistentState('ts_bulk_hint_dismissed_v1', '', asString);

  const rosterEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees.filter(e => rosterIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)))
      .sort((a, b) => (sortBy === 'dept' ? a.department.localeCompare(b.department) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [allEmployees, rosterIds, search, sortBy]);
  const personOptions = useMemo(() => rosterEmployees.map(e => ({ value: e.id, label: e.name, description: [e.employeeId, e.position].filter(Boolean).join(' · ') })), [rosterEmployees]);
  const selectedPerson = rosterEmployees.find(e => e.id === personId);
  const openDownload = (preset: { scope: 'combined' | 'individual'; empId: string } | null) => { setDownloadPreset(preset); setShowDownload(true); };

  // Leaves and overtime store the human employee number; timesheets use the database id. This is the join between them.
  const employeeIdByHuman = useMemo(() => { const m = new Map<string, string>(); allEmployees.forEach(e => { if (e.employeeId) m.set(normalizeTimesheetEmployeeCode(e.employeeId), e.id); }); return m; }, [allEmployees]);
  // The grid's data: real saved timesheets with approved leave and overtime laid over them. A real entry always wins; the overlay only fills gaps or adds on top.
  const effectiveTimesheets = useMemo(() => mergeEffectiveTimesheets({
    timesheets, approvedLeaves, approvedOvertime, shiftAssignments, dayStrs: periodDateStrs, rosterIds, employeeIdByHuman, leaveTypeToStatus: LEAVE_TYPE_TO_STATUS, statusLabel: status => statusMeta(status).label,
  }), [timesheets, approvedLeaves, approvedOvertime, shiftAssignments, employeeIdByHuman, rosterIds, periodDateStrs]);

  const getHourTotals = useCallback((empId: string) => {
    const emp = allEmployees.find(e => e.id === empId);
    return calcEmployeeTotals(empId, effectiveTimesheets, {
      periodDates: periodDateStrs, applyRegFloorWithoutAbsent: true,
      moduleOt15ByDate: emp?.employeeId ? buildModuleOt15ByDateForEmployee(emp.employeeId, approvedOvertime) : undefined,
      earlyMorningOtDates: emp?.employeeId ? buildEarlyMorningOtDatesForEmployee(emp.employeeId, approvedOvertime) : undefined,
    });
  }, [effectiveTimesheets, periodDateStrs, allEmployees, approvedOvertime]);

  const summary = useMemo(() => {
    const tot = rosterEmployees.reduce((a, e) => { const t = getHourTotals(e.id); return { actual: a.actual + t.actual, reg: a.reg + t.reg, ot15: a.ot15 + t.ot15, ot20: a.ot20 + t.ot20, night: a.night + t.nightAllowanceBonus, standby: a.standby + t.standbyBonus }; }, { actual: 0, reg: 0, ot15: 0, ot20: 0, night: 0, standby: 0 });
    return { ...tot, ...countPeriodCompletion(rosterIds, days, effectiveTimesheets) };
  }, [getHourTotals, rosterEmployees, rosterIds, days, effectiveTimesheets]);
  const selectedRoll = useMemo(() => {
    const sel = rosterEmployees.filter(e => selectedIds.has(e.id));
    if (sel.length === 0) return null;
    return { count: sel.length, ...sel.reduce((a, e) => { const t = getHourTotals(e.id); return { actual: a.actual + t.actual, reg: a.reg + t.reg, ot15: a.ot15 + t.ot15, ot20: a.ot20 + t.ot20 }; }, { actual: 0, reg: 0, ot15: 0, ot20: 0 }) };
  }, [rosterEmployees, selectedIds, getHourTotals]);

  const edit = useTimesheetEditing({ timesheets, setTimesheets, effectiveTimesheets });
  const showBulkHint = bulkHintDismissed !== '1' && shouldShowBulkHint(summary.filled, summary.possible);

  const toggleEmployee = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleAll = useCallback(() => setSelectedIds(prev => (rosterEmployees.length > 0 && rosterEmployees.every(e => prev.has(e.id)) ? new Set() : new Set(rosterEmployees.map(e => e.id)))), [rosterEmployees]);
  const openBulkForDay = (day: Date) => {
    if (rosterEmployees.length === 0) return;
    const ds = fmtDate(day);
    const missing = rosterEmployees.filter(emp => !effectiveTimesheets.some(ts => String(ts.employee_id) === String(emp.id) && ts.date === ds));
    setBulkOpen({ anchor: rosterEmployees[0], dates: [ds], ids: (missing.length > 0 ? missing : rosterEmployees).map(e => e.id) });
  };

  const initialUnavailable = Boolean(loadError) && allEmployees.length === 0;
  const unavailable = loading || initialUnavailable;
  const shiftMonth = (by: number) => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + by, 1));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'NEC timesheets' }]}
        title="NEC timesheets"
        description={`NEC roster, ${fmtPeriod(activePeriod)}.`}
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh timesheets" variant="shell" pending={loading || refreshing} disabled={loading || refreshing} onClick={() => { void load(true); }} />
            <MoreMenu items={[
              { label: 'Import scans', icon: 'documents' as const, disabled: unavailable, onSelect: () => setShowImport(true) },
              { label: 'Download', icon: 'download', disabled: unavailable, onSelect: () => openDownload(null) },
            ]} />
            <Button variant="primary" icon="calendar" title="Fill or clear shifts for many people and days at once" disabled={unavailable || rosterEmployees.length === 0} onClick={() => setBulkOpen({ anchor: rosterEmployees[0] })}>Bulk assign shifts</Button>
          </>
        )}
      />

      <section aria-label="Period" className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <IconButton icon="chevron-left" variant="outline" label="Previous period" onClick={() => shiftMonth(-1)} />
          <div className="text-center"><p className="font-sans text-label font-semibold text-ink">{fmtPeriod(activePeriod)}</p><p className="font-sans text-caption text-ink-muted">{days.length} days, 13th to the 12th (the NEC cycle)</p></div>
          <IconButton icon="chevron-right" variant="outline" label="Next period" onClick={() => shiftMonth(1)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCurrentMonth(defaultPeriodMonth())}>Current period</Button>
        </div>
      </section>

      {loading && <LoadingPulse label="Loading timesheets" />}
      {!loading && refreshing && retrying && <Notice tone="info" title="Waiting for the server">Retrying automatically.</Notice>}
      {!loading && loadError && <Notice tone="danger" title="Could not load timesheets" action={<Button size="sm" icon="refresh" disabled={refreshing} onClick={() => { void load(allEmployees.length > 0); }}>Try again</Button>}>{loadError}{allEmployees.length > 0 ? ' The figures shown may be out of date.' : ''}</Notice>}

      {!loading && initialUnavailable && <EmptyState icon="warning" title="The roster is unavailable" description="The people could not be loaded, so no grid is shown. Try again." action={<Button icon="refresh" onClick={() => { void load(); }}>Try again</Button>} />}

      {!loading && !initialUnavailable && unclassified.length > 0 && dismissedUnclassified !== unclassifiedSignature && (
        <Notice tone="warning" title={`${unclassified.length} ${unclassified.length === 1 ? 'person has' : 'people have'} no employment type`} action={<Button size="sm" variant="ghost" aria-label="Dismiss the employment-type notice" onClick={() => setDismissedUnclassified(unclassifiedSignature)}>Dismiss</Button>}>
          {unclassified.map(p => p.name).join(', ')} {unclassified.length === 1 ? 'is' : 'are'} on no timesheet roster until classified. Set it in Personnel.
        </Notice>
      )}

      {!loading && !initialUnavailable && (
        <Tabs value={view} onValueChange={v => setView(v === 'person' ? 'person' : 'roster')}>
          <TabsList aria-label="Timesheet views">
            <TabsTrigger value="roster" icon="table-view">Roster</TabsTrigger>
            <TabsTrigger value="person" icon="user">Person</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="mt-4 flex flex-col gap-4">
            <NecQuickView
              totals={{
                people: rosterEmployees.length, actual: summary.actual, reg: summary.reg, ot15: summary.ot15,
                ot20: summary.ot20, night: summary.night, standby: summary.standby,
                filled: summary.filled, possible: summary.possible,
              }}
              loading={loading}
            />

            <Toolbar filtered={search !== ''}>
              <SearchField value={search} onValueChange={setSearch} placeholder="Search name, position or department" wrapperClassName="min-w-48 max-w-md flex-1" />
              <Button icon="sort" onClick={() => setSortBy(s => (s === 'name' ? 'dept' : 'name'))}>{sortBy === 'name' ? 'Sorted by name' : 'Sorted by department'}</Button>
              {search !== '' && <Button variant="ghost" icon="close" onClick={() => setSearch('')}>Clear search</Button>}
              <Button icon="calendar" disabled={unavailable || rosterEmployees.length === 0} onClick={() => { const anchor = rosterEmployees[0]; if (anchor) setBulkOpen({ anchor }); }}>Assign shifts to many people / days</Button>
            </Toolbar>

      {!loading && !initialUnavailable && showBulkHint && (
        <Notice tone="info" title="Entering the same shift for many people?" action={<Button size="sm" variant="ghost" aria-label="Dismiss the bulk-entry suggestion" onClick={() => setBulkHintDismissed('1')}>Dismiss</Button>}>
          Fill or clear whole weeks at once instead of day by day.{' '}
          <button type="button" className="font-medium text-action underline" onClick={() => { const anchor = rosterEmployees[0]; if (anchor) setBulkOpen({ anchor }); }}>Open bulk assign</button>
        </Notice>
      )}

      {selectedIds.size > 0 && (
        <section aria-label="Selected employees" className="flex flex-col gap-2 rounded-control border border-line bg-action-soft px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-body-sm text-ink"><strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'employee' : 'employees'} selected</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon="calendar" onClick={() => { const ids = rosterEmployees.filter(e => selectedIds.has(e.id)).map(e => e.id); const anchor = rosterEmployees.find(e => e.id === ids[0]) ?? rosterEmployees[0]; if (anchor && ids.length > 0) setBulkOpen({ anchor, ids }); }}>Assign or clear shifts</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
            </div>
          </div>
          {selectedRoll && <p className="font-sans text-body-sm text-ink-muted tabular">Period totals for the selected: Actual <strong className="text-ink">{selectedRoll.actual.toFixed(1)}</strong>, Reg <strong className="text-ink">{selectedRoll.reg.toFixed(1)}</strong>, 1.5× <strong className="text-ink">{selectedRoll.ot15.toFixed(1)}</strong>, 2.0× <strong className="text-ink">{selectedRoll.ot20.toFixed(1)}</strong></p>}
        </section>
      )}

            <TimesheetGrid
              employees={rosterEmployees} timesheets={effectiveTimesheets} days={days} getHourTotals={getHourTotals}
              onCellClick={(emp, day, entry) => setEditCell({ employee: emp, date: day, entry })} onQuickAdd={edit.quickAdd} onQuickRemove={edit.quickRemove}
              onBulkAssign={emp => setBulkOpen({ anchor: emp, ids: [emp.id] })} onBulkDay={openBulkForDay} onFillDays={edit.fillDays}
              selectedEmployeeIds={selectedIds} onToggleEmployeeSelect={toggleEmployee} onToggleAllEmployeeSelect={toggleAll}
            />

            {rosterEmployees.length > 0 && <PeriodNotes key={notesKeyFor(activePeriod)} storageKey={notesKeyFor(activePeriod)} people={rosterEmployees} />}
          </TabsContent>

          <TabsContent value="person" className="mt-4 flex flex-col gap-4">
            <Field label="Person" className="w-full sm:w-72"><Combobox aria-label="Person" value={personId} onValueChange={setPersonId} options={personOptions} placeholder="Search the roster" /></Field>
            {selectedPerson
              ? <NecPersonView employee={selectedPerson} period={activePeriod} days={days} entries={effectiveTimesheets} approvedLeaves={approvedLeaves} approvedOvertime={approvedOvertime} totals={getHourTotals(selectedPerson.id)} onEditDay={(day, entry) => setEditCell({ employee: selectedPerson, date: day, entry })} onDownload={() => openDownload({ scope: 'individual', empId: selectedPerson.id })} />
              : <EmptyState icon="user" title="Choose a person to open their period" description="Search the roster above. Their days open as cards or a quick-view table with their own totals, like an artisan's month." />}
          </TabsContent>
        </Tabs>
      )}

      {editCell && (
        <EntryDialog
          key={`${editCell.employee.id}:${fmtDate(editCell.date)}`} employee={editCell.employee} date={editCell.date} entry={editCell.entry}
          onSave={data => edit.saveEntry(editCell.employee.id, editCell.date, data)} onDelete={editCell.entry?.id ? () => edit.deleteEntry(editCell.entry!.id!) : undefined} onClose={() => setEditCell(null)}
          onBulk={() => { const emp = editCell.employee; const ds = fmtDate(editCell.date); setEditCell(null); setBulkOpen({ anchor: emp, dates: [ds], ids: [emp.id] }); }}
        />
      )}
      {bulkOpen && (
        <BulkAssignDialog
          initialEmployee={bulkOpen.anchor} allEmployees={rosterEmployees} period={activePeriod} timesheets={effectiveTimesheets} prefillDates={bulkOpen.dates} initialSelectedEmployeeIds={bulkOpen.ids}
          onSave={entries => edit.bulkSave(entries)} onClear={edit.bulkClear} onClose={() => setBulkOpen(null)}
        />
      )}
      {showDownload && <DownloadDialog key={downloadPreset ? `preset-${downloadPreset.scope}-${downloadPreset.empId}` : 'default'} employees={rosterEmployees} timesheets={effectiveTimesheets} approvedOvertime={approvedOvertime} getHourTotals={getHourTotals} period={activePeriod} initialScope={downloadPreset?.scope} initialEmpId={downloadPreset?.empId} onClose={() => setShowDownload(false)} />}
      {showImport && <NecScanImportPanel open period={activePeriod} onClose={() => setShowImport(false)} onApplied={() => { void load(true); setShowImport(false); }} />}
    </div>
  );
}

export default function TimesheetsPage() {
  return <AppShell migrated><TimesheetsContent /></AppShell>;
}
