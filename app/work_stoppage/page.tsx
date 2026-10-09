// app/work_stoppage/page.tsx — Work Stoppage register
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, Progress, RecordCard, SearchField,
  Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone, FilterField
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees } from '@/hooks/useLookups';
import { summarizeActions } from '@/lib/actionPlan';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { ActionStatus, CorrectiveAction, SectionType, WorkStoppageReport } from './types';
import { createReport, deleteReport, updateReport, useWorkStoppageData } from './useWorkStoppageData';
import { EXPORT_TONE_HEX, statusTone } from '@/lib/status';

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical', 'General'];
const ACTION_STATUSES: ActionStatus[] = ['Pending', 'In Progress', 'Completed'];
const SECTION_META: Record<SectionType, { tone: Tone; icon: IconMeaning }> = {
  Mechanical: { tone: 'info', icon: 'mechanical' }, Electrical: { tone: 'warning', icon: 'electrical' }, General: { tone: 'neutral', icon: 'general' },
};
const ACTION_META: Record<ActionStatus, { tone: Tone; icon: IconMeaning }> = {
  Pending: { tone: statusTone('Pending'), icon: 'pending' }, 'In Progress': { tone: statusTone('In Progress'), icon: 'clock' }, Completed: { tone: statusTone('Completed'), icon: 'closed' },
};
const ALL = '__all__';

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => (d ? formatDate(d) : '');
const newAction = (): CorrectiveAction => ({ id: uid(), finding: '', action: '', byWho: '', byWhen: '', status: 'Pending' });
const isOverdue = (a: CorrectiveAction) => a.status !== 'Completed' && !!a.byWhen && a.byWhen < today();
const overdueCount = (r: WorkStoppageReport) => (r.correctiveActions || []).filter(isOverdue).length;

// An unrecognised section (legacy or malformed data) must not crash the page.
const SectionBadge = ({ section }: { section: SectionType }) => {
  const m = SECTION_META[section];
  return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{section}</StatusBadge>;
};
const ActionBadge = ({ status }: { status: ActionStatus }) => {
  const m = ACTION_META[status];
  return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{status}</StatusBadge>;
};

type Form = Omit<WorkStoppageReport, 'id' | 'submittedAt'>;
const emptyForm = (): Form => ({
  date: today(), department: 'Engineering', section: 'General', description: '', investigationFindings: '', stoppageBy: '', stoppagePosition: '',
  acceptedBy: '', sheqCheckedBy: '', correctiveActions: [],
});

function ActionFields({ action, index, touched, onChange, onRemove }: { action: CorrectiveAction; index: number; touched: boolean; onChange: (id: string, patch: Partial<CorrectiveAction>) => void; onRemove: (id: string) => void }) {
  const n = index + 1;
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="px-1 font-sans text-label font-medium text-ink">Action {n}</legend>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Status">
            <Select aria-label={`Action ${n} status`} value={action.status} options={ACTION_STATUSES.map(s => ({ value: s, label: s }))}
              onValueChange={v => onChange(action.id, { status: v as ActionStatus, ...(v === 'Completed' && !action.completedDate ? { completedDate: today() } : {}) })} />
          </Field>
        </div>
        <IconButton icon="delete" variant="danger" label={`Remove action ${n}`} onClick={() => onRemove(action.id)} />
      </div>
      <Field label={`Finding or issue (action ${n})`} required error={err(!action.finding.trim(), 'Describe the finding.')}><Textarea rows={2} value={action.finding} onChange={e => onChange(action.id, { finding: e.target.value })} placeholder="Describe the finding or unsafe condition" /></Field>
      <Field label={`Corrective action (action ${n})`} required error={err(!action.action.trim(), 'Say what action is needed.')}><Textarea rows={2} value={action.action} onChange={e => onChange(action.id, { action: e.target.value })} placeholder="What action needs to be taken?" /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Assigned to (action ${n})`} required error={err(!action.byWho.trim(), 'Enter who is responsible.')}><Input value={action.byWho} onChange={e => onChange(action.id, { byWho: e.target.value })} placeholder="Person responsible" /></Field>
        <Field label={`Due date (action ${n})`} required error={err(!action.byWhen, 'Enter the due date.')}><Input type="date" value={action.byWhen} onChange={e => onChange(action.id, { byWhen: e.target.value })} /></Field>
        {action.status === 'Completed' && <Field label={`Completed date (action ${n})`} optional><Input type="date" value={action.completedDate || ''} onChange={e => onChange(action.id, { completedDate: e.target.value })} /></Field>}
      </div>
      <Field label={`Remarks (action ${n})`} optional><Textarea rows={2} value={action.remarks || ''} onChange={e => onChange(action.id, { remarks: e.target.value })} placeholder="Additional notes" /></Field>
    </fieldset>
  );
}

function ReportDialog({ report, open, onOpenChange, onSaved }: { report?: WorkStoppageReport; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(report?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(report ? { ...report, correctiveActions: report.correctiveActions || [] } : emptyForm());
    }
  }
  const set = (patch: Partial<Form>) => setForm(p => ({ ...p, ...patch }));
  const people = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), designation: e.designation, department: e.department })), [employees]);
  const setIssuer = (name: string) => {
    const m = people.find(p => p.name === name);
    setForm(p => ({ ...p, stoppageBy: name, stoppagePosition: m?.designation || p.stoppagePosition, department: m?.department && !p.department.trim() ? m.department : p.department }));
  };
  const updateAction = (id: string, patch: Partial<CorrectiveAction>) => set({ correctiveActions: form.correctiveActions.map(a => (a.id === id ? { ...a, ...patch } : a)) });
  const progress = summarizeActions(form.correctiveActions);

  const actionsValid = form.correctiveActions.every(a => a.finding.trim() && a.action.trim() && a.byWho.trim() && a.byWhen);
  const submit = async () => {
    setTouched(true);
    if (!form.department.trim() || !form.description.trim() || !form.stoppageBy.trim() || !form.date || !actionsValid) return false;
    if (report) await updateReport(report.id, form); else await createReport(form);
    toast.success(report ? 'Work stoppage updated.' : 'Work stoppage issued.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={report ? 'Edit work stoppage' : 'New work stoppage'} description="Date, department, description and who issued it are required." submitLabel={report ? 'Save changes' : 'Issue work stoppage'} onSubmit={submit} size="lg">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="ws-incident" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="ws-incident" className="font-display text-section font-semibold text-ink sm:col-span-2">Incident</h3>
          <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set({ section: v as SectionType })} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
          <div className="sm:col-span-2"><Field label="Department" required error={touched && !form.department.trim() ? 'Enter the department.' : undefined}><SuggestField historyKey="ws_department" placeholder="For example, Engineering" value={form.department} onChange={v => set({ department: v })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description of unsafe act or potential impact" required error={touched && !form.description.trim() ? 'Describe the unsafe act.' : undefined}><Textarea rows={4} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Describe the unsafe condition, what happened and what could have happened" /></Field></div>
          <div className="sm:col-span-2"><Field label="Investigation findings" optional><Textarea rows={3} value={form.investigationFindings} onChange={e => set({ investigationFindings: e.target.value })} placeholder="Initial findings from the investigation" /></Field></div>
        </section>

        <section aria-labelledby="ws-people" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="ws-people" className="font-display text-section font-semibold text-ink sm:col-span-2">Personnel</h3>
          <Field label="Stoppage issued by" required error={touched && !form.stoppageBy.trim() ? 'Enter who issued the stoppage.' : undefined}>
            <Input list="ws-people-list" value={form.stoppageBy} onChange={e => setIssuer(e.target.value)} autoComplete="off" placeholder="Select or type a name" />
          </Field>
          <Field label="Position" optional><SuggestField historyKey="ws_position" placeholder="For example, Safety Officer" value={form.stoppagePosition} onChange={v => set({ stoppagePosition: v })} /></Field>
          <Field label="Accepted by" optional><Input list="ws-people-list" value={form.acceptedBy} onChange={e => set({ acceptedBy: e.target.value })} autoComplete="off" placeholder="Select or type a name" /></Field>
          <Field label="SHEQ checked by" optional><Input list="ws-people-list" value={form.sheqCheckedBy} onChange={e => set({ sheqCheckedBy: e.target.value })} autoComplete="off" placeholder="Select or type a name" /></Field>
          <datalist id="ws-people-list">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
        </section>

        <section aria-labelledby="ws-actions" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="ws-actions" className="font-display text-section font-semibold text-ink">Corrective actions ({form.correctiveActions.length})</h3>
            <Button size="sm" icon="plus" onClick={() => set({ correctiveActions: [...form.correctiveActions, newAction()] })}>Add action</Button>
          </div>
          {form.correctiveActions.length === 0
            ? <p className="font-sans text-body-sm text-ink-muted">No corrective actions yet. Add one for each finding that needs follow-up.</p>
            : (
              <>
                <div>
                  <p className="mb-1 font-sans text-caption text-ink-muted">{progress.completed} of {progress.total} completed · {progress.inProgress} in progress · {progress.pending} pending</p>
                  <Progress value={progress.pct} label="Corrective action progress" />
                </div>
                {form.correctiveActions.map((a, i) => <ActionFields key={a.id} action={a} index={i} touched={touched} onChange={updateAction} onRemove={id => set({ correctiveActions: form.correctiveActions.filter(x => x.id !== id) })} />)}
              </>
            )}
        </section>
      </div>
    </FormDialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-sans text-body text-ink">{children}</dd></div>;
}

function DetailDialog({ report, onClose, onEdit, onDelete }: { report: WorkStoppageReport | null; onClose: () => void; onEdit: (r: WorkStoppageReport) => void; onDelete: (r: WorkStoppageReport) => void }) {
  const actions = report?.correctiveActions || [];
  const progress = summarizeActions(actions);
  return (
    <Dialog
      open={!!report}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Work stoppage report"
      description={report ? `${report.department}, ${fmtDate(report.date)}` : undefined}
      size="lg"
      footer={report && (
        <>
          <Button variant="danger" icon="delete" onClick={() => onDelete(report)}>Delete</Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="edit" onClick={() => onEdit(report)}>Edit</Button>
        </>
      )}
    >
      {report && (
        <div className="flex flex-col gap-5">
          {actions.length > 0 && (
            <div>
              <p className="mb-1 font-sans text-caption text-ink-muted">Corrective action progress: {progress.completed} of {progress.total} completed</p>
              <Progress value={progress.pct} label="Corrective action progress" />
            </div>
          )}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Department">{report.department}</Fact>
            <Fact label="Section"><SectionBadge section={report.section} /></Fact>
            <Fact label="Issued by">{report.stoppageBy}</Fact>
            <Fact label="Position">{report.stoppagePosition || 'Not specified'}</Fact>
            <Fact label="Accepted by">{report.acceptedBy || 'Not specified'}</Fact>
            <Fact label="SHEQ checked by">{report.sheqCheckedBy || 'Not specified'}</Fact>
          </dl>
          <div><h3 className="font-sans text-caption text-ink-muted">Description</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.description}</p></div>
          {report.investigationFindings && <div><h3 className="font-sans text-caption text-ink-muted">Investigation findings</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.investigationFindings}</p></div>}
          {actions.length > 0 && (
            <section aria-labelledby="ws-detail-actions">
              <h3 id="ws-detail-actions" className="mb-2 font-sans text-caption text-ink-muted">Corrective actions ({actions.length})</h3>
              <ol className="flex flex-col gap-2">
                {actions.map((a, i) => (
                  <li key={a.id} className="rounded-card border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-sans text-body font-medium text-ink">{i + 1}. {a.finding}</p>
                      <span className="inline-flex gap-1.5">{isOverdue(a) && <StatusBadge tone="danger" icon="overdue">Overdue</StatusBadge>}<ActionBadge status={a.status} /></span>
                    </div>
                    <p className="mt-1 font-sans text-body-sm text-ink-muted">{a.action}</p>
                    <p className="mt-1.5 font-sans text-caption text-ink-muted">By {a.byWho} · due {fmtDate(a.byWhen)}{a.completedDate ? ` · completed ${fmtDate(a.completedDate)}` : ''}</p>
                    {a.remarks && <p className="mt-1 font-sans text-caption italic text-ink-muted">“{a.remarks}”</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'date', label: 'Date', width: 14, format: v => (v ? fmtDate(v as string) : '') },
  { key: 'department', label: 'Department', width: 18 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'stoppageBy', label: 'Issued By', width: 18 },
  { key: 'stoppagePosition', label: 'Position', width: 18 },
  { key: 'description', label: 'Description', width: 30 },
  { key: 'investigationFindings', label: 'Investigation Findings', width: 30 },
  { key: 'acceptedBy', label: 'Accepted By', width: 18 },
  { key: 'sheqCheckedBy', label: 'SHEQ Checked By', width: 18 },
  {
    key: 'correctiveActions', label: 'Actions', width: 14,
    format: (_v, row) => {
      const actions = (row.correctiveActions as CorrectiveAction[]) ?? [];
      return `${actions.filter(a => a.status === 'Completed').length}/${actions.length} done`;
    },
  },
];

const STATUS_FILTERS = [
  { value: ALL, label: 'All statuses' }, { value: 'pending', label: 'Pending actions' }, { value: 'in-progress', label: 'Actions in progress' },
  { value: 'completed', label: 'All actions completed' }, { value: 'overdue', label: 'Overdue actions' },
];

function WorkStoppageContent() {
  const confirm = useConfirm();
  const { reports, loading, loaded, error, errorStatus, refetch } = useWorkStoppageData();
  const [view, setView] = useViewPreference('work-stoppage', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [sectionF, setSectionF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<WorkStoppageReport | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<WorkStoppageReport | null>(null);

  const stats = useMemo(() => {
    const all = reports.flatMap(r => r.correctiveActions || []);
    return {
      total: reports.length,
      pending: all.filter(a => a.status === 'Pending').length,
      inProgress: all.filter(a => a.status === 'In Progress').length,
      completed: all.filter(a => a.status === 'Completed').length,
      overdue: all.filter(isOverdue).length,
    };
  }, [reports]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return reports.filter(r => {
      if (s && !r.department?.toLowerCase().includes(s) && !r.description?.toLowerCase().includes(s) && !r.stoppageBy?.toLowerCase().includes(s)) return false;
      if (sectionF !== ALL && r.section !== sectionF) return false;
      const actions = r.correctiveActions || [];
      if (statusF === 'pending' && !actions.some(a => a.status === 'Pending')) return false;
      if (statusF === 'in-progress' && !actions.some(a => a.status === 'In Progress')) return false;
      if (statusF === 'completed' && !actions.every(a => a.status === 'Completed')) return false;
      if (statusF === 'overdue' && !actions.some(isOverdue)) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [reports, search, sectionF, statusF, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => (id === 'actions' ? String((r.correctiveActions || []).length).padStart(4, '0') : String(r[id as keyof WorkStoppageReport] ?? '').toLowerCase())), [filtered, sort]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || sectionF !== ALL || statusF !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSectionF(ALL); setStatusF(ALL); setDateFrom(''); setDateTo(''); };
  const tile = (s: string) => ({ selected: statusF === s, onClick: () => setStatusF(statusF === s ? ALL : s) });

  const openEditor = (r?: WorkStoppageReport) => { setViewing(null); setEditing(r); setDialogOpen(true); };
  const remove = async (r: WorkStoppageReport) => {
    if (!await confirm({ title: 'Delete this work stoppage report?', message: `${r.department}, ${fmtDate(r.date)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteReport(r.id); setViewing(null); toast.success('Report deleted.'); await refetch(); } catch (e) { toast.error((e as Error).message); }
  };

  const COLUMNS: Column<WorkStoppageReport>[] = [
    { id: 'date', header: 'Date', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{fmtDate(r.date)}</span> },
    { id: 'department', header: 'Department', sortable: true, cell: r => r.department },
    { id: 'section', header: 'Section', sortable: true, cell: r => <SectionBadge section={r.section} /> },
    { id: 'stoppageBy', header: 'Issued by', sortable: true, hideBelow: 'md', cell: r => r.stoppageBy },
    {
      id: 'actions', header: 'Actions', sortable: true, hideBelow: 'md',
      cell: r => { const p = summarizeActions(r.correctiveActions); const o = overdueCount(r); return <span className="inline-flex flex-wrap items-center gap-2">{p.total ? <span className="tabular">{p.completed} of {p.total} done</span> : <span className="text-ink-muted">None added</span>}{o > 0 && <StatusBadge tone="danger" icon="overdue">{o} overdue</StatusBadge>}</span>; },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Work stoppage' }]}
        title="Work stoppages"
        description="Document and track unsafe acts, unsafe practices and SHEQ compliance issues."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh work stoppages" variant="ghost" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Work_Stoppage_Reports')}
                title="Work Stoppages"
                statusColumn="section"
                statusColor={(_v, row) => EXPORT_TONE_HEX[SECTION_META[row.section as SectionType]?.tone ?? 'neutral']}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>Issue stoppage</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Reports" detail="issued" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Pending" detail="actions" tone="warning" value={stats.pending} loading={pending} unavailable={unavailable} {...tile('pending')} />
        <MetricTile compact label="In progress" detail="actions" value={stats.inProgress} loading={pending} unavailable={unavailable} {...tile('in-progress')} />
        <MetricTile compact label="Completed" detail="actions" tone="success" value={stats.completed} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Overdue" detail="actions" tone="danger" value={stats.overdue} loading={pending} unavailable={unavailable} {...tile('overdue')} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters}
        onClear={clearFilters}
        activeCount={[dateFrom, dateTo].filter(Boolean).length}
        trailing={(<>
          <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
        </>)}
        moreFilters={(
          <>
          <FilterField label="From date"><Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></FilterField>
          <FilterField label="To date"><Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search department, description or issuer" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
        <Select className="w-52" aria-label="Filter by action status" value={statusF} onValueChange={setStatusF} options={STATUS_FILTERS} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="work stoppages"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No reports match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="flag" title="No work stoppages issued" description="Issue a work stoppage to document an unsafe act or practice." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>Issue stoppage</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'report' : 'reports'}{filtered.length !== reports.length ? ` of ${reports.length}` : ''}</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => {
              const p = summarizeActions(r.correctiveActions);
              const o = overdueCount(r);
              return (
                <RecordCard
                  key={r.id}
                  eyebrow={fmtDate(r.date)}
                  title={r.department}
                  status={<span className="inline-flex flex-wrap gap-1.5"><SectionBadge section={r.section} />{o > 0 && <StatusBadge tone="danger" icon="overdue">{o} overdue</StatusBadge>}</span>}
                  facts={[
                    { label: 'Issued by', value: `${r.stoppageBy}${r.stoppagePosition ? `, ${r.stoppagePosition}` : ''}` },
                    { label: 'What happened', value: <span className="line-clamp-2">{r.description}</span> },
                    { label: 'Corrective actions', value: p.total ? <><span className="tabular">{p.completed} of {p.total} completed</span><Progress value={p.pct} label={`${r.department} corrective action progress`} className="mt-1" /></> : 'None added' },
                  ]}
                  action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete ${r.department} report of ${fmtDate(r.date)}`} onClick={() => remove(r)} />}
                  onOpen={() => setViewing(r)}
                  openLabel={`View ${r.department} report of ${fmtDate(r.date)}`}
                />
              );
            })}
          </div>
        ) : (
          <DataTable
            caption="Work stoppages"
            rows={rows}
            columns={COLUMNS}
            getRowId={r => r.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={setViewing}
            rowActions={r => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit ${r.department} report of ${fmtDate(r.date)}`} onClick={() => openEditor(r)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Delete ${r.department} report of ${fmtDate(r.date)}`} onClick={() => remove(r)} />
              </span>
            )}
          />
        )}
      </DataRegion>

      <DetailDialog report={viewing} onClose={() => setViewing(null)} onEdit={openEditor} onDelete={remove} />
      <ReportDialog report={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function WorkStoppagePage() {
  return <AppShell migrated><WorkStoppageContent /></AppShell>;
}
