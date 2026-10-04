// app/vfl/page.tsx — Visible Felt Leadership observations
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, Progress, RecordCard, SearchField,
  Segmented, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees } from '@/hooks/useLookups';
import { summarizeActions } from '@/lib/actionPlan';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { ActionItem, ActionStatus, BehaviourCategory, CoachingTechnique, ObservationType, SectionType, VFLReport, VFLStatus } from './types';
import { createVFLReport, deleteVFLReport, updateVFLReport, useVFLData } from './useVFLData';

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOURS: BehaviourCategory[] = ['Safe Behaviour', 'Unsafe Behaviour'];
const OBSERVATIONS: ObservationType[] = ['Safe Behaviour', 'Safe Condition', 'At Risk Behaviour', 'At Risk Condition'];
const TECHNIQUES: CoachingTechnique[] = ['SBR', 'CC'];
const COACHING_DESC: Record<CoachingTechnique, string> = { SBR: 'Situation, Behaviour, Result', CC: 'Coaching Conversation' };
const STATUSES: VFLStatus[] = ['draft', 'submitted', 'reviewed', 'closed'];
const ACTION_STATUSES: ActionStatus[] = ['Pending', 'In Progress', 'Completed'];
const ALL = '__all__';

const SECTION_META: Record<SectionType, { tone: Tone; icon: IconMeaning }> = { Mechanical: { tone: 'info', icon: 'mechanical' }, Electrical: { tone: 'warning', icon: 'electrical' } };
const BEHAVIOUR_META: Record<BehaviourCategory, { tone: Tone; icon: IconMeaning }> = { 'Safe Behaviour': { tone: 'success', icon: 'safe' }, 'Unsafe Behaviour': { tone: 'danger', icon: 'unsafe' } };
const OBSERVATION_META: Record<ObservationType, Tone> = { 'Safe Behaviour': 'success', 'Safe Condition': 'success', 'At Risk Behaviour': 'warning', 'At Risk Condition': 'danger' };
const STATUS_META: Record<VFLStatus, { tone: Tone; icon: IconMeaning; label: string }> = {
  draft: { tone: 'neutral', icon: 'draft', label: 'Draft' }, submitted: { tone: 'info', icon: 'submitted', label: 'Submitted' },
  reviewed: { tone: 'brand', icon: 'reviewed', label: 'Reviewed' }, closed: { tone: 'success', icon: 'closed', label: 'Closed' },
};
const ACTION_META: Record<ActionStatus, { tone: Tone; icon: IconMeaning }> = { Pending: { tone: 'warning', icon: 'pending' }, 'In Progress': { tone: 'info', icon: 'clock' }, Completed: { tone: 'success', icon: 'closed' } };
const STATUS_HEX: Record<VFLStatus, string> = { draft: '#94a3b8', submitted: '#3b82f6', reviewed: '#a78bfa', closed: '#10b981' };

const fmtDate = (s: string) => (s ? formatDate(s) : '');
// A malformed but non-empty time is a valid Date object that renders as "Invalid Date" rather than throwing.
const fmtTime = (s: string) => {
  if (!s) return '';
  const d = new Date(`2000-01-01T${s}`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const newId = () => Math.random().toString(36).slice(2, 11);
// A missing or unrecognised technique used to render "undefined — undefined".
const coachingLabel = (t: CoachingTechnique | null | undefined) => (!t ? 'Not specified' : `${t} · ${COACHING_DESC[t] ?? 'Unknown technique'}`);

const SectionBadge = ({ section }: { section: SectionType }) => { const m = SECTION_META[section]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{section}</StatusBadge>; };
const BehaviourBadge = ({ value }: { value: BehaviourCategory }) => { const m = BEHAVIOUR_META[value]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{value}</StatusBadge>; };
const StatusTag = ({ status }: { status: VFLStatus }) => { const m = STATUS_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };
const ActionBadge = ({ status }: { status: ActionStatus }) => { const m = ACTION_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{status}</StatusBadge>; };

type Form = Pick<VFLReport, 'observerName' | 'designation' | 'sectionChoice' | 'departmentSection' | 'date' | 'time' | 'behaviourCategory' | 'observationType' | 'description' | 'coachingTechnique' | 'actions' | 'status'>;
const emptyForm = (): Form => ({
  observerName: '', designation: '', sectionChoice: 'Mechanical', departmentSection: 'Engineering', date: new Date().toISOString().slice(0, 10),
  time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), behaviourCategory: 'Safe Behaviour', observationType: 'Safe Behaviour',
  description: '', coachingTechnique: 'SBR', actions: [], status: 'draft',
});

function ActionFields({ item, index, touched, onChange, onRemove }: { item: ActionItem; index: number; touched: boolean; onChange: (id: string, patch: Partial<ActionItem>) => void; onRemove: (id: string) => void }) {
  const n = index + 1;
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="px-1 font-sans text-label font-medium text-ink">Action {n}</legend>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Status"><Select aria-label={`Action ${n} status`} value={item.status} options={ACTION_STATUSES.map(s => ({ value: s, label: s }))} onValueChange={v => onChange(item.id, { status: v as ActionStatus })} /></Field>
        </div>
        <IconButton icon="delete" variant="danger" label={`Remove action ${n}`} onClick={() => onRemove(item.id)} />
      </div>
      <Field label={`Action description (action ${n})`} required error={err(!item.action.trim(), 'Describe the action.')}><Input value={item.action} onChange={e => onChange(item.id, { action: e.target.value })} placeholder="Describe the action" /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Responsible person (action ${n})`} required error={err(!item.responsible.trim(), 'Enter who is responsible.')}><Input value={item.responsible} onChange={e => onChange(item.id, { responsible: e.target.value })} placeholder="Full name" /></Field>
        <Field label={`Target date (action ${n})`} required error={err(!item.targetDate, 'Enter the target date.')}><Input type="date" value={item.targetDate} onChange={e => onChange(item.id, { targetDate: e.target.value })} /></Field>
        {item.status === 'Completed' && <Field label={`Completed date (action ${n})`} optional><Input type="date" value={item.completedDate || ''} onChange={e => onChange(item.id, { completedDate: e.target.value })} /></Field>}
      </div>
      <Field label={`Remarks (action ${n})`} optional><Textarea rows={2} value={item.remarks || ''} onChange={e => onChange(item.id, { remarks: e.target.value })} placeholder="Additional notes" /></Field>
    </fieldset>
  );
}

function ReportDialog({ report, open, onOpenChange, onSaved }: { report?: VFLReport; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(report?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(report ? { ...emptyForm(), ...report, actions: report.actions || [] } : emptyForm());
    }
  }
  const set = (patch: Partial<Form>) => setForm(p => ({ ...p, ...patch }));
  const people = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), designation: e.designation, department: e.department })), [employees]);
  const setObserver = (name: string) => {
    const m = people.find(p => p.name === name);
    setForm(p => ({ ...p, observerName: name, designation: m?.designation || p.designation, departmentSection: m?.department || p.departmentSection }));
  };
  const updateAction = (id: string, patch: Partial<ActionItem>) => set({ actions: form.actions.map(a => (a.id === id ? { ...a, ...patch } : a)) });

  const actionsValid = form.actions.every(a => a.action.trim() && a.responsible.trim() && a.targetDate);
  const submit = async () => {
    setTouched(true);
    if (!form.observerName.trim() || !form.date || !form.time || !form.description.trim() || !actionsValid) return false;
    if (report) await updateVFLReport(report.id, { ...form, updated_at: new Date().toISOString() });
    // A new observation is always recorded as submitted.
    else await createVFLReport({ ...form, status: 'submitted', submitted_at: new Date().toISOString() });
    toast.success(report ? 'VFL observation updated.' : 'VFL observation recorded.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={report ? 'Edit VFL observation' : 'New VFL observation'} description="Observer, date, time and a description are required." submitLabel={report ? 'Save changes' : 'Save observation'} onSubmit={submit} size="lg">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="vfl-observer" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="vfl-observer" className="font-display text-section font-semibold text-ink sm:col-span-2">Observer</h3>
          <div className="sm:col-span-2">
            <Field label="Observer's name" required error={touched && !form.observerName.trim() ? 'Enter the observer’s name.' : undefined}>
              <Input list="vfl-people" value={form.observerName} onChange={e => setObserver(e.target.value)} autoComplete="off" placeholder="Select or type the observer's name" />
              <datalist id="vfl-people">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
            </Field>
          </div>
          <Field label="Designation" optional><SuggestField historyKey="vfl_designation" placeholder="Job title" value={form.designation} onChange={v => set({ designation: v })} /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.sectionChoice} onValueChange={v => set({ sectionChoice: v as SectionType })} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
          <div className="sm:col-span-2"><Field label="Department or section" optional><SuggestField historyKey="vfl_department" placeholder="For example, Engineering" value={form.departmentSection} onChange={v => set({ departmentSection: v })} /></Field></div>
          <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Time" required error={touched && !form.time ? 'Enter the time.' : undefined}><Input type="time" value={form.time} onChange={e => set({ time: e.target.value })} /></Field>
          {report && <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v as VFLStatus })} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field>}
        </section>

        <section aria-labelledby="vfl-observation" className="flex flex-col gap-4">
          <h3 id="vfl-observation" className="font-display text-section font-semibold text-ink">Observation</h3>
          <div><p className="mb-1.5 font-sans text-label font-medium text-ink">Behaviour category</p><Segmented label="Behaviour category" value={form.behaviourCategory} onValueChange={v => set({ behaviourCategory: v })} options={BEHAVIOURS.map(b => ({ value: b, label: b }))} /></div>
          <div><p className="mb-1.5 font-sans text-label font-medium text-ink">Observation type</p><Segmented label="Observation type" value={form.observationType} onValueChange={v => set({ observationType: v })} options={OBSERVATIONS.map(o => ({ value: o, label: o }))} /></div>
          <Field label="Description" required error={touched && !form.description.trim() ? 'Describe the observation.' : undefined}><Textarea rows={4} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Relate the details of the observation" /></Field>
          <div><p className="mb-1.5 font-sans text-label font-medium text-ink">Coaching technique used</p><Segmented label="Coaching technique" value={form.coachingTechnique} onValueChange={v => set({ coachingTechnique: v })} options={TECHNIQUES.map(t => ({ value: t, label: `${t} (${COACHING_DESC[t]})` }))} /></div>
        </section>

        <section aria-labelledby="vfl-actions" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div><h3 id="vfl-actions" className="font-display text-section font-semibold text-ink">Actions to rectify or reinforce ({form.actions.length})</h3><p className="font-sans text-caption text-ink-muted">Define actions to address or reinforce behaviours.</p></div>
            <Button size="sm" icon="plus" onClick={() => set({ actions: [...form.actions, { id: newId(), action: '', responsible: '', targetDate: '', status: 'Pending' }] })}>Add action</Button>
          </div>
          {form.actions.length === 0
            ? <p className="font-sans text-body-sm text-ink-muted">No actions yet.</p>
            : form.actions.map((a, i) => <ActionFields key={a.id} item={a} index={i} touched={touched} onChange={updateAction} onRemove={id => set({ actions: form.actions.filter(x => x.id !== id) })} />)}
          <p className="text-right font-sans text-caption italic text-ink-muted">Observer signature is required on the printout.</p>
        </section>
      </div>
    </FormDialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-sans text-body text-ink">{children}</dd></div>;
}

function DetailDialog({ report, onClose, onEdit, onDelete, onStatusChange }: { report: VFLReport | null; onClose: () => void; onEdit: (r: VFLReport) => void; onDelete: (r: VFLReport) => void; onStatusChange: (id: string, status: VFLStatus) => void }) {
  const progress = summarizeActions(report?.actions);
  return (
    <Dialog
      open={!!report}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Visible felt leadership observation"
      description={report ? `${report.observerName}, ${fmtDate(report.date)}` : undefined}
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2"><SectionBadge section={report.sectionChoice} /><BehaviourBadge value={report.behaviourCategory} /><StatusTag status={report.status} /></div>
            <div className="w-44"><Field label="Change status"><Select aria-label="Change status" value={report.status} onValueChange={v => onStatusChange(report.id, v as VFLStatus)} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field></div>
          </div>
          {progress.total > 0 && (
            <div>
              <p className="mb-1 font-sans text-caption text-ink-muted">Action progress: {progress.completed} of {progress.total} completed · {progress.inProgress} in progress · {progress.pending} pending</p>
              <Progress value={progress.pct} label="Action progress" />
            </div>
          )}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Observer">{report.observerName}</Fact>
            <Fact label="Designation">{report.designation || 'Not specified'}</Fact>
            <Fact label="Date">{fmtDate(report.date)}</Fact>
            <Fact label="Time">{fmtTime(report.time) || 'Not recorded'}</Fact>
            <Fact label="Department or section">{report.departmentSection || 'Not specified'}</Fact>
            <Fact label="Coaching technique">{coachingLabel(report.coachingTechnique)}</Fact>
          </dl>
          <div>
            <h3 className="font-sans text-caption text-ink-muted">Observation</h3>
            <p className="mt-1.5"><StatusBadge tone={OBSERVATION_META[report.observationType] ?? 'neutral'}>{report.observationType}</StatusBadge></p>
            <p className="mt-2 whitespace-pre-wrap font-sans text-body text-ink">{report.description || 'No description recorded.'}</p>
          </div>
          {report.actions?.length > 0 && (
            <section aria-labelledby="vfl-detail-actions">
              <h3 id="vfl-detail-actions" className="mb-2 font-sans text-caption text-ink-muted">Action plan ({report.actions.length})</h3>
              <ol className="flex flex-col gap-2">
                {report.actions.map((a, i) => (
                  <li key={a.id} className="rounded-card border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-sans text-body font-medium text-ink">{i + 1}. {a.action}</p><ActionBadge status={a.status} /></div>
                    <p className="mt-1.5 font-sans text-caption text-ink-muted">By {a.responsible} · target {fmtDate(a.targetDate)}{a.completedDate ? ` · completed ${fmtDate(a.completedDate)}` : ''}</p>
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
  { key: 'observerName', label: 'Observer', width: 18 },
  { key: 'designation', label: 'Designation', width: 18 },
  { key: 'sectionChoice', label: 'Section', width: 14 },
  { key: 'behaviourCategory', label: 'Behaviour', width: 16 },
  { key: 'coachingTechnique', label: 'Coaching', width: 12 },
  { key: 'status', label: 'Status', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'departmentSection', label: 'Dept/Section', width: 18 },
  { key: 'description', label: 'Description', width: 30 },
];

function VFLContent() {
  const confirm = useConfirm();
  const { reports, setReports, loading, loaded, error, errorStatus, refetch } = useVFLData();
  const [view, setView] = useViewPreference('vfl', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [sectionF, setSectionF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [behaviourF, setBehaviourF] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<VFLReport | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // Derived from the list so an optimistic status change shows in the open dialog.
  const viewing = useMemo(() => reports.find(r => r.id === viewingId) ?? null, [reports, viewingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (q && ![r.observerName, r.designation, r.description, r.departmentSection].some(s => s?.toLowerCase().includes(q)) && !r.actions?.some(a => a.action?.toLowerCase().includes(q))) return false;
      return (sectionF === ALL || r.sectionChoice === sectionF) && (statusF === ALL || r.status === statusF) && (behaviourF === ALL || r.behaviourCategory === behaviourF)
        && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo);
    });
  }, [reports, search, sectionF, statusF, behaviourF, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => String(r[id as keyof VFLReport] ?? '').toLowerCase()), [filtered, sort]);
  const count = (s: VFLStatus) => reports.filter(r => r.status === s).length;
  const totalActions = reports.reduce((n, r) => n + (r.actions?.length || 0), 0);
  const safe = reports.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const unsafe = reports.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length;

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || sectionF !== ALL || statusF !== ALL || behaviourF !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSectionF(ALL); setStatusF(ALL); setBehaviourF(ALL); setDateFrom(''); setDateTo(''); };
  const tile = (s: string) => ({ selected: statusF === s, onClick: () => setStatusF(statusF === s ? ALL : s) });

  const openEditor = (r?: VFLReport) => { setViewingId(null); setEditing(r); setDialogOpen(true); };
  const remove = async (r: VFLReport) => {
    if (!await confirm({ title: 'Delete this VFL observation?', message: `${r.observerName}, ${fmtDate(r.date)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteVFLReport(r.id); setViewingId(null); toast.success('VFL observation deleted.'); await refetch(); } catch (e) { toast.error((e as Error).message); }
  };
  const changeStatus = async (id: string, next: VFLStatus) => {
    const before = reports.find(r => r.id === id);
    if (!before) return;
    setReports(ps => ps.map(r => (r.id === id ? { ...r, status: next } : r)));
    try { await updateVFLReport(id, { status: next }); toast.success(`Status changed to ${STATUS_META[next].label.toLowerCase()}.`); }
    catch (e) { setReports(ps => ps.map(r => (r.id === id ? before : r))); toast.error(`Status was not changed: ${(e as Error).message}`); }
  };

  const COLUMNS: Column<VFLReport>[] = [
    { id: 'date', header: 'Date', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{fmtDate(r.date)}</span> },
    { id: 'observerName', header: 'Observer', sortable: true, cell: r => r.observerName },
    { id: 'designation', header: 'Designation', sortable: true, hideBelow: 'lg', cell: r => r.designation || <span className="text-ink-muted">Not specified</span> },
    { id: 'sectionChoice', header: 'Section', sortable: true, hideBelow: 'md', cell: r => <SectionBadge section={r.sectionChoice} /> },
    { id: 'behaviourCategory', header: 'Behaviour', sortable: true, cell: r => <BehaviourBadge value={r.behaviourCategory} /> },
    { id: 'coachingTechnique', header: 'Coaching', hideBelow: 'lg', cell: r => r.coachingTechnique || <span className="text-ink-muted">Not specified</span> },
    { id: 'status', header: 'Status', sortable: true, cell: r => <StatusTag status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Visible felt leadership' }]}
        title="Visible felt leadership"
        description="Safety observations and coaching tracking."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh observations" variant="outline" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('VFL_Observations')}
                title="Visible Felt Leadership"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_HEX[row.status as VFLStatus]?.replace('#', '')}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>New observation</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Total" icon="eye" value={reports.length} loading={pending} unavailable={unavailable} />
        <MetricTile label="Draft" icon="draft" value={count('draft')} loading={pending} unavailable={unavailable} {...tile('draft')} />
        <MetricTile label="Submitted" icon="submitted" value={count('submitted')} loading={pending} unavailable={unavailable} {...tile('submitted')} />
        <MetricTile label="Reviewed" icon="reviewed" value={count('reviewed')} loading={pending} unavailable={unavailable} {...tile('reviewed')} />
        <MetricTile label="Closed" icon="closed" tone="success" value={count('closed')} loading={pending} unavailable={unavailable} {...tile('closed')} />
      </MetricGrid>

      <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search observer, description or actions" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Select className="w-40" aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
        <Segmented label="Behaviour" value={behaviourF} onValueChange={setBehaviourF} options={[{ value: ALL, label: 'All' }, { value: 'Safe Behaviour', label: `Safe (${safe})` }, { value: 'Unsafe Behaviour', label: `Unsafe (${unsafe})` }]} />
        <Input type="date" aria-label="From date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" aria-label="To date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {hasFilters && <Button variant="ghost" icon="close" onClick={clearFilters}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status}
        subject="VFL observations"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No observations match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="eye" title="No VFL observations yet" description="Record the first observation to start the register." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New observation</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'observation' : 'observations'}{filtered.length !== reports.length ? ` of ${reports.length}` : ''} · {totalActions} {totalActions === 1 ? 'action' : 'actions'} across all observations</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => {
              const p = summarizeActions(r.actions);
              return (
                <RecordCard
                  key={r.id}
                  eyebrow={`${fmtDate(r.date)}${fmtTime(r.time) ? ` · ${fmtTime(r.time)}` : ''}`}
                  title={r.observerName}
                  subtitle={r.designation || undefined}
                  status={<StatusTag status={r.status} />}
                  facts={[
                    { label: 'Section', value: <SectionBadge section={r.sectionChoice} /> },
                    { label: 'Behaviour', value: <BehaviourBadge value={r.behaviourCategory} /> },
                    { label: 'Observation', value: r.observationType },
                    { label: 'What was seen', value: <span className="line-clamp-2">{r.description || 'No description recorded.'}</span> },
                    { label: 'Coaching', value: coachingLabel(r.coachingTechnique) },
                    ...(p.total ? [{ label: 'Actions', value: <><span className="tabular">{p.completed} of {p.total} completed</span><Progress value={p.pct} label={`${r.observerName} action progress`} className="mt-1" /></> }] : []),
                  ]}
                  action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete VFL observation for ${r.observerName}`} onClick={() => remove(r)} />}
                  onOpen={() => setViewingId(r.id)}
                  openLabel={`View VFL observation for ${r.observerName}, ${fmtDate(r.date)}`}
                />
              );
            })}
          </div>
        ) : (
          <DataTable
            caption="VFL observations"
            rows={rows}
            columns={COLUMNS}
            getRowId={r => r.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={r => setViewingId(r.id)}
            rowActions={r => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit VFL observation for ${r.observerName}`} onClick={() => openEditor(r)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Delete VFL observation for ${r.observerName}`} onClick={() => remove(r)} />
              </span>
            )}
          />
        )}
      </DataRegion>

      <DetailDialog report={viewing} onClose={() => setViewingId(null)} onEdit={openEditor} onDelete={remove} onStatusChange={changeStatus} />
      <ReportDialog report={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function VFLObservationPage() {
  return <AppShell migrated><VFLContent /></AppShell>;
}
