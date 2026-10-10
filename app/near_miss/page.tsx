// app/near_miss/page.tsx — Near Miss Reporting
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, SearchField, Select, StatusBadge, Textarea, Toolbar, deriveDataStatus, isTransientStatus, sortRows, type Column, type IconMeaning, type SortState, type Tone, FilterField, Fact, FactList, DetailActions, RowActions } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees, useLookupList } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate, formatTime } from '@/lib/format';
import type { NearMissReport } from './types';
import { createReport, deleteReport, updateReport, useNearMissData } from './useNearMissData';
import { useConfirmDelete } from '@/lib/useConfirmDelete';
import { SectionBadge } from '@/components/shared/SectionBadge';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

type Section = NearMissReport['section'];
const SECTIONS: { value: Section; label: string; tone: Tone; icon: IconMeaning }[] = [
  { value: 'Mechanical', label: 'Mechanical', tone: 'info', icon: 'mechanical' },
  { value: 'Electrical', label: 'Electrical', tone: 'warning', icon: 'electrical' },
  { value: 'General', label: 'General / other', tone: 'neutral', icon: 'general' },
];
const SECTION_META = Object.fromEntries(SECTIONS.map(s => [s.value, s])) as Record<Section, (typeof SECTIONS)[number]>;
const ALL = '__all__';

// `new Date('2000-01-01Tundefined')` is an invalid Date object that renders as "Invalid Date" rather than throwing.
const fmtTime = (s: string) => {
  if (!s) return '';
  const d = new Date(`2000-01-01T${s}`);
  return Number.isNaN(d.getTime()) ? '' : formatTime(d);
};


type Form = { department: string; section: Section; date: string; time: string; location: string; description: string; witnessDetails: string; reporterName: string };
const emptyForm = (): Form => ({
  department: 'Engineering', section: 'General', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5),
  location: '', description: '', witnessDetails: '', reporterName: '',
});

function ReportDialog({ report, open, onOpenChange, onSaved }: { report?: NearMissReport; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const locations = useLookupList('location');
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, report?.id), () => {
    setTouched(false);
    setForm(report ? {
      department: report.department, section: report.section, date: report.date, time: report.time, location: report.location,
      description: report.description, witnessDetails: report.witnessDetails || '', reporterName: report.reporterName || '',
    } : emptyForm());
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));
  const names = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), department: e.department })), [employees]);
  const setReporter = (name: string) => {
    const match = names.find(n => n.name === name);
    setForm(p => ({ ...p, reporterName: name, department: match?.department && !p.department.trim() ? match.department : p.department }));
  };

  const errors = {
    department: touched && !form.department.trim() ? 'Enter the department.' : undefined,
    location: touched && !form.location.trim() ? 'Enter where it happened.' : undefined,
    description: touched && !form.description.trim() ? 'Describe what happened.' : undefined,
  };
  const submit = async () => {
    setTouched(true);
    if (!form.department.trim() || !form.location.trim() || !form.description.trim()) return false;
    if (report) await updateReport(report.id, form); else await createReport(form);
    toast.success(report ? 'Report updated.' : 'Report submitted.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={report ? 'Edit near miss report' : 'New near miss report'} description="Department, location and a description are required." submitLabel={report ? 'Save changes' : 'Submit report'} onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Department" required error={errors.department}>
          <SuggestField historyKey="nm_department" placeholder="For example, Engineering" value={form.department} onChange={v => set('department', v)} />
        </Field>
        <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set('section', v as Section)} options={SECTIONS.map(s => ({ value: s.value, label: s.label }))} /></Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Time"><Input type="time" value={form.time} onChange={e => set('time', e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Location" required error={errors.location} description="Choose a known place or type a new one.">
            <Input list="nm-locations" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Specific location details" />
            <datalist id="nm-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description of incident" required error={errors.description}>
            <Textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe what happened, as it occurred" />
          </Field>
        </div>
        <Field label="Witness details" optional><SuggestField historyKey="nm_witness" placeholder="Names and contact details" value={form.witnessDetails} onChange={v => set('witnessDetails', v)} /></Field>
        <Field label="Reporter name" optional description="Leave blank to report anonymously.">
          <Input list="nm-reporters" value={form.reporterName} onChange={e => setReporter(e.target.value)} autoComplete="off" placeholder="Select or type a name" />
          <datalist id="nm-reporters">{names.map(n => <option key={n.name} value={n.name} />)}</datalist>
        </Field>
      </div>
    </FormDialog>
  );
}

function DetailDialog({ report, onClose, onEdit, onDelete }: { report: NearMissReport | null; onClose: () => void; onEdit: (r: NearMissReport) => void; onDelete: (r: NearMissReport) => void }) {
  return (
    <Dialog
      open={!!report}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Near miss report"
      description={report ? `${report.department}, ${formatDate(report.date)}` : undefined}
      size="lg"
      footer={report && (
        <DetailActions onDelete={() => onDelete(report)} onClose={onClose} onEdit={() => onEdit(report)} />
      )}
    >
      {report && (
        <div className="flex flex-col gap-4">
          <FactList>
            <Fact label="Department">{report.department}</Fact>
            <Fact label="Section"><SectionBadge section={report.section} label={SECTION_META[report.section]?.label} /></Fact>
            <Fact label="Date">{formatDate(report.date)}</Fact>
            <Fact label="Time">{fmtTime(report.time) || 'Not recorded'}</Fact>
            <Fact label="Location">{report.location}</Fact>
            <Fact label="Reporter">{report.reporterName || 'Anonymous'}</Fact>
          </FactList>
          <div><h3 className="font-sans text-caption text-ink-muted">Description of incident</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.description}</p></div>
          {report.witnessDetails && <div><h3 className="font-sans text-caption text-ink-muted">Witness details</h3><p className="mt-1 font-sans text-body text-ink">{report.witnessDetails}</p></div>}
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'time', label: 'Time', width: 10 },
  { key: 'department', label: 'Department', width: 18 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'location', label: 'Location', width: 20 },
  { key: 'reporterName', label: 'Reporter', width: 18, format: v => (v as string) || 'Anonymous' },
  { key: 'description', label: 'Description', width: 34 },
  { key: 'witnessDetails', label: 'Witness Details', width: 26 },
];

function NearMissContent() {
  const confirmDelete = useConfirmDelete();
  const { reports, loading, loaded, error, errorStatus, refetch } = useNearMissData();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<NearMissReport | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<NearMissReport | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return reports.filter(r =>
      (!s || r.department?.toLowerCase().includes(s) || (r.reporterName || '').toLowerCase().includes(s) || r.location?.toLowerCase().includes(s))
      && (section === ALL || r.section === section)
      && (!dateFrom || r.date >= dateFrom)
      && (!dateTo || r.date <= dateTo));
  }, [reports, search, section, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => String(r[id as keyof NearMissReport] ?? '').toLowerCase()), [filtered, sort]);
  const stats = useMemo(() => {
    const by = (s: Section) => reports.filter(r => r.section === s).length;
    return { total: reports.length, mechanical: by('Mechanical'), electrical: by('Electrical'), general: by('General'), reporters: new Set(reports.map(r => r.reporterName?.trim()).filter(Boolean)).size };
  }, [reports]);
  const byReporter = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) { const n = r.reporterName?.trim(); if (n) counts.set(n, (counts.get(n) ?? 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || section !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSection(ALL); setDateFrom(''); setDateTo(''); };

  const openEditor = (r?: NearMissReport) => { setViewing(null); setEditing(r); setDialogOpen(true); };
  const remove = async (r: NearMissReport) => {
    await confirmDelete({ title: 'Delete this report?', message: `${r.department}, ${formatDate(r.date)}. This cannot be undone.`, what: 'The report', run: async () => { await deleteReport(r.id); setViewing(null); }, done: 'Report deleted.', after: () => refetch() });
  };

  const COLUMNS: Column<NearMissReport>[] = [
    { id: 'date', header: 'Date and time', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{formatDate(r.date)}<span className="ml-2 text-ink-muted">{fmtTime(r.time)}</span></span> },
    { id: 'department', header: 'Department', sortable: true, cell: r => r.department },
    { id: 'section', header: 'Section', sortable: true, cell: r => <SectionBadge section={r.section} label={SECTION_META[r.section]?.label} /> },
    { id: 'location', header: 'Location', sortable: true, hideBelow: 'md', cell: r => r.location },
    { id: 'reporterName', header: 'Reporter', sortable: true, hideBelow: 'lg', cell: r => r.reporterName || <span className="text-ink-muted">Anonymous</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Near miss' }]}
        title="Near miss"
        description="Report dangerous occurrences. Every report helps prevent a future incident."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh reports" variant="shell" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Near_Miss_Reports')}
                title="Near Miss Reports"
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>New report</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total reports" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Mechanical" value={stats.mechanical} loading={pending} unavailable={unavailable} selected={section === 'Mechanical'} onClick={() => setSection(section === 'Mechanical' ? ALL : 'Mechanical')} />
        <MetricTile compact label="Electrical" value={stats.electrical} loading={pending} unavailable={unavailable} selected={section === 'Electrical'} onClick={() => setSection(section === 'Electrical' ? ALL : 'Electrical')} />
        <MetricTile compact label="General" value={stats.general} loading={pending} unavailable={unavailable} selected={section === 'General'} onClick={() => setSection(section === 'General' ? ALL : 'General')} />
        <MetricTile compact label="Unique reporters" value={stats.reporters} loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters}
        onClear={clearFilters}
        activeCount={[dateFrom, dateTo].filter(Boolean).length}
        moreFilters={(
          <>
          <FilterField label="From date"><Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></FilterField>
          <FilterField label="To date"><Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search department, reporter or location" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-44" aria-label="Filter by section" value={section} onValueChange={setSection} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s.value, label: s.label }))]} />
      </Toolbar>

      {byReporter.length > 0 && (
        <section aria-label="Reports by reporter" className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-caption text-ink-muted">By reporter</span>
          {byReporter.map(([name, count]) => <StatusBadge key={name} tone="neutral">{name} · {count}</StatusBadge>)}
        </section>
      )}

      <DataRegion
        status={status}
        subject="near miss reports"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No reports match" description="Try a different search, section or date range." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="warning" title="No near miss reports yet" description="Submit the first report to start the register." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New report</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'report' : 'reports'}{filtered.length !== reports.length ? ` of ${reports.length}` : ''}</p>
        <DataTable
          caption="Near miss reports"
          rows={rows}
          columns={COLUMNS}
          getRowId={r => r.id}
          sort={sort}
          onSortChange={setSort}
          onRowActivate={setViewing}
          rowActions={r => (
            <RowActions subject={`report from ${r.department}, ${formatDate(r.date)}`} onEdit={() => openEditor(r)} onDelete={() => remove(r)} />
          )}
        />
      </DataRegion>

      <DetailDialog report={viewing} onClose={() => setViewing(null)} onEdit={openEditor} onDelete={remove} />
      <ReportDialog report={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function NearMissPage() {
  return <AppShell migrated><NearMissContent /></AppShell>;
}
