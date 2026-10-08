// app/artisan-timesheets/page.tsx — the formal monthly timesheet for salaried artisans. Choose an artisan and a
// month and open it: a saved one comes back as it was saved, a new one is filled from approved leave, overtime, standby and public
// holidays. Review the system-filled days, set standby, sign, save, and download it as Excel or PDF. Unsaved changes are never discarded without asking.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Combobox, DataRegion, DataTable, EmptyState, Field, IconButton, Notice, PageHeader, Select, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, deriveDataStatus, isTransientStatus, useConfirm, type Column, FilterField
} from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { ArtisanEditor } from './ArtisanEditor';
import { TimesheetLoading } from './TimesheetLoading';
import { artisanKey, artisansOf, draftToPayload, isDirty, openMonth, periodLabel, previousMonth, problems, refreshedRows, snapshot } from './artisanLogic';
import { monthName } from './calcTotals';
import { downloadArtisanTimesheetExcel, downloadArtisanTimesheetPdf } from './exportArtisanTimesheet';
import type { ArtisanTimesheetDraft, ArtisanTimesheetRecord, ArtisanTimesheetSummary } from './types';
import { createArtisanTimesheet, deleteArtisanTimesheet, fetchMonth, fetchTimesheet, updateArtisanTimesheet, useReference, useSavedTimesheets, useStaff } from './useArtisanTimesheetsData';
import { useAutosave } from './useAutosave';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }));
const YEARS = (() => { const y = new Date().getFullYear(); return Array.from({ length: 6 }, (_, i) => ({ value: String(y - 2 + i), label: String(y - 2 + i) })); })();
const ANY = 'all';

interface Open { draft: ArtisanTimesheetDraft; baseline: string; recordId: number | null }

function ArtisanContent() {
  const confirm = useConfirm();
  const staff = useStaff();
  const reference = useReference();
  const artisans = useMemo(() => artisansOf(staff.items), [staff.items]);
  const [listEmployee, setListEmployee] = useState(ANY);
  const [listYear, setListYear] = useState(ANY);
  const [listMonth, setListMonth] = useState(ANY);
  const saved = useSavedTimesheets({ employee_id: listEmployee === ANY ? undefined : listEmployee, year: listYear === ANY ? undefined : Number(listYear), month: listMonth === ANY ? undefined : Number(listMonth) });
  const [tab, setTab] = useState('editor');
  const [pick, setPick] = useState('');
  const openToken = useRef(0); // supersedes a slower open when the pick changes mid-flight
  const [year, setYear] = useState(() => String(previousMonth().year));
  const [month, setMonth] = useState(() => String(previousMonth().month));
  const [editor, setEditor] = useState<Open | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = isDirty(editor?.draft ?? null, editor?.baseline ?? '');

  // Closing the tab or reloading with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const artisanOptions = useMemo(() => artisans.map(a => ({ value: artisanKey(a), label: a.name, description: [a.employee_id, a.designation].filter(Boolean).join(' · ') })), [artisans]);
  const staffStatus = deriveDataStatus({ loaded: staff.loaded, loading: staff.loading, error: staff.error, errorStatus: staff.errorStatus, count: artisans.length, transient: isTransientStatus(staff.errorStatus) });
  const listStatus = deriveDataStatus({ loaded: saved.loaded, loading: saved.loading, error: saved.error, errorStatus: saved.errorStatus, count: saved.items.length, transient: isTransientStatus(saved.errorStatus) });

  const discardOk = async () => !dirty || confirm({ title: 'Discard the changes to this timesheet?', message: `${editor?.draft.employee_name}, ${periodLabel(editor!.draft.year, editor!.draft.month)} has changes that are not saved.`, confirmLabel: 'Discard changes', destructive: true });
  const reset = (next: Open | null) => { setEditor(next); setBlocked([]); setSaveError(null); };

  const openForKey = async (key: string, token: number) => {
    const emp = artisans.find(a => artisanKey(a) === key);
    if (!emp) return;
    setOpening(true);
    try {
      const existing = await fetchMonth(artisanKey(emp), Number(year), Number(month));
      if (token !== openToken.current) return; // a newer pick superseded this open
      const { draft, recordId } = openMonth(emp, Number(year), Number(month), existing, reference.sources);
      if (token !== openToken.current) return;
      reset({ draft, baseline: snapshot(draft), recordId }); setTab('editor');
    } catch (e) { toast.error(`The timesheet could not be opened: ${(e as Error).message}`); }
    finally { if (token === openToken.current) setOpening(false); }
  };
  const openSelection = async () => {
    if (!await discardOk()) return;
    await openForKey(pick, ++openToken.current);
  };
  // Selecting an artisan opens their month straight away; changing month or year still uses Open month.
  useEffect(() => {
    if (!pick || !reference.settled) return;
    if (editor && editor.draft.employee_id === pick && editor.draft.year === Number(year) && editor.draft.month === Number(month)) return;
    const revertTo = editor?.draft.employee_id ?? '';
    const token = ++openToken.current;
    void (async () => {
      if (!await discardOk()) { if (token === openToken.current) setPick(revertTo); return; }
      await openForKey(pick, token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, editor, reference.settled]);
  const openSaved = async (summary: ArtisanTimesheetSummary) => {
    if (!await discardOk()) return;
    try {
      const r = await fetchTimesheet(summary.id); // the list holds no days or signatures; this brings them
      const { draft, recordId } = openMonth({ id: r.employee_db_id ?? 0, employee_id: r.employee_id, name: r.employee_name, id_number: r.id_number || '', designation: '' }, r.year, r.month, [r], reference.sources);
      setPick(r.employee_id); setYear(String(r.year)); setMonth(String(r.month));
      reset({ draft, baseline: snapshot(draft), recordId }); setTab('editor');
    } catch (e) { toast.error(`The timesheet could not be opened: ${(e as Error).message}`); }
  };
  const refreshFromSystem = () => {
    if (!editor) return;
    if (reference.failed.length) { toast.error(`Could not refresh: ${reference.failed.join(', ')} could not be loaded.`); return; }
    setEditor({ ...editor, draft: { ...editor.draft, daily_rows: refreshedRows(editor.draft, reference.sources) } });
    toast.success('Updated from leave, overtime, standby and public holidays.');
  };
  const save = async (opts?: { silent?: boolean }) => {
    if (!editor) return;
    const p = problems(editor.draft, reference.sources);
    setBlocked(p); setSaveError(null);
    if (p.length) return;
    setSaving(true);
    try {
      const payload = draftToPayload(editor.draft);
      let id = editor.recordId;
      if (id) await updateArtisanTimesheet(id, payload); else id = (await createArtisanTimesheet(payload)).id;
      setEditor({ ...editor, recordId: id, baseline: snapshot(editor.draft) });
      if (!opts?.silent) toast.success(editor.recordId ? 'Timesheet updated.' : 'Timesheet saved.');
      await saved.refetch();
    } catch (e) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };
  // A settled draft saves itself quietly; the Saved badge is the only feedback.
  useAutosave({ draft: editor?.draft ?? null, dirty, busy: saving || opening || exporting !== null, paused: saveError !== null || blocked.length > 0, onSave: () => { void save({ silent: true }); } });
  const remove = async (r: ArtisanTimesheetSummary) => {
    if (!await confirm({ title: 'Delete this saved timesheet?', message: `${r.employee_name}, ${periodLabel(r.year, r.month)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try {
      await deleteArtisanTimesheet(r.id);
      if (editor?.recordId === r.id) reset(null);
      toast.success('Timesheet deleted.'); await saved.refetch();
    } catch (e) { toast.error(`The timesheet was not deleted: ${(e as Error).message}`); }
  };
  const exportAs = async (format: 'excel' | 'pdf') => {
    if (!editor) return;
    setExporting(format);
    try {
      const record = { id: editor.recordId ?? 0, ...draftToPayload(editor.draft) } as ArtisanTimesheetRecord;
      if (format === 'excel') await downloadArtisanTimesheetExcel(record); else await downloadArtisanTimesheetPdf(record);
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded.`);
    } catch (e) { toast.error(`The ${format === 'excel' ? 'Excel file' : 'PDF'} could not be made: ${(e as Error).message}`); }
    finally { setExporting(null); }
  };

  const COLUMNS: Column<ArtisanTimesheetSummary>[] = [
    { id: 'emp', header: 'Employee', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.employee_name}</p><p className="font-mono text-caption text-ink-muted">{r.employee_id}</p></div> },
    { id: 'period', header: 'Period', cell: r => periodLabel(r.year, r.month) },
    { id: 'upd', header: 'Updated', hideBelow: 'md', cell: r => (r.updated_at ? fmtDate(r.updated_at.slice(0, 10)) : <span className="text-ink-muted">Not recorded</span>) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Artisan timesheets' }]}
        title="Artisan timesheets"
        description="Formal monthly daily timesheets for salaried artisans."
        actions={<IconButton icon="refresh" label="Refresh artisan timesheets" variant="ghost" pending={(staff.loading && staff.loaded) || (saved.loading && saved.loaded)} onClick={() => { void staff.refetch(); void saved.refetch(); reference.refetch(); }} />}
      />

      <DataRegion
        status={staffStatus} subject="artisans" error={staff.error} onRetry={() => staff.refetch()} loadingContent={<TimesheetLoading label="Loading artisans" detail={['Reading the employee register…', 'Finding the artisans…']} />}
        empty={<EmptyState icon="artisans" title="No artisan employees found" description="Only active salaried employees appear here. Set the employment type on the Personnel page first." />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Artisan" className="w-full sm:w-72"><Combobox aria-label="Artisan" value={pick} onValueChange={setPick} options={artisanOptions} placeholder="Search artisans" /></Field>
          <Field label="Month" className="w-40"><Select aria-label="Month" value={month} onValueChange={setMonth} options={MONTHS} /></Field>
          <Field label="Year" className="w-28"><Select aria-label="Year" value={year} onValueChange={setYear} options={YEARS} /></Field>
          <Button variant="primary" icon="calendar" pending={opening} disabled={!pick || !reference.settled} onClick={openSelection}>Open month</Button>
          {!reference.settled && <TimesheetLoading compact label="Loading leave, overtime and standby" detail={['Gathering leave…', 'Tallying overtime…', 'Checking the standby roster…']} />}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Artisan timesheet views">
            <TabsTrigger value="editor" icon="edit">Timesheet</TabsTrigger>
            <TabsTrigger value="saved" icon="archive">Saved timesheets</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            {editor
              ? <ArtisanEditor draft={editor.draft} onChange={draft => { setSaveError(null); setBlocked([]); setEditor({ ...editor, draft }); }} saved={editor.recordId !== null} dirty={dirty} blocked={blocked} sourcesFailed={reference.failed} saveError={saveError} saving={saving} exporting={exporting} sources={reference.sources} onRefresh={refreshFromSystem} onSave={save} onExport={exportAs} />
              : <EmptyState icon="calendar" title="Open a month to begin" description="Choose an artisan to open their month. A saved timesheet opens as it was saved; a new one is filled from leave, overtime, standby and public holidays. Change the month or year, then Open month to reopen." />}
          </TabsContent>

          <TabsContent value="saved" className="mt-4 flex flex-col gap-4">
            <Toolbar
              filtered={listEmployee !== ANY || listYear !== ANY || listMonth !== ANY}
              onClear={() => { setListEmployee(ANY); setListYear(ANY); setListMonth(ANY); }}
              activeCount={listMonth !== ANY ? 1 : 0}
              moreFilters={(
                <>
                <FilterField label="Month"><Select aria-label="Filter by month" value={listMonth} onValueChange={setListMonth} options={[{ value: ANY, label: 'All months' }, ...MONTHS]} /></FilterField>
                </>
              )}
            >
              <Select aria-label="Filter by employee" className="w-64" value={listEmployee} onValueChange={setListEmployee} options={[{ value: ANY, label: 'All artisans' }, ...artisanOptions.map(o => ({ value: o.value, label: o.label }))]} />
              <Select aria-label="Filter by year" className="w-36" value={listYear} onValueChange={setListYear} options={[{ value: ANY, label: 'All years' }, ...YEARS]} />
            </Toolbar>
            <DataRegion status={listStatus} subject="saved timesheets" error={saved.error} onRetry={() => saved.refetch()} loadingContent={<TimesheetLoading label="Loading saved timesheets" detail={['Opening the filing cabinet…', 'Dusting the archive…']} />} empty={<EmptyState icon="archive" title="No saved timesheets match" description="Open a month and save it, or clear the filters." />}>
              <DataTable caption="Saved artisan timesheets" rows={saved.items} columns={COLUMNS} getRowId={r => String(r.id)} onRowActivate={r => { void openSaved(r); }}
                rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { void openSaved(r); }}>Open</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Delete the timesheet of ${r.employee_name} for ${periodLabel(r.year, r.month)}`} onClick={() => remove(r)} /></span>} />
            </DataRegion>
          </TabsContent>
        </Tabs>
        {dirty && <Notice tone="warning" title="This timesheet has changes that are not saved">Save it before opening another month or leaving the page.</Notice>}
      </DataRegion>
    </div>
  );
}

export default function ArtisanTimesheetsPage() {
  return <AppShell migrated><ArtisanContent /></AppShell>;
}
