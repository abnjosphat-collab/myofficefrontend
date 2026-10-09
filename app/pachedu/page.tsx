// app/pachedu/page.tsx — Pachedu care observations ("Be your brother's keeper")
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Checkbox, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, RecordCard, SearchField,
  Segmented, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone, FilterField
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared/utils';
import type { BehaviourType, PacheduReport, PacheduStatus, SectionType } from './types';
import { createPacheduReport, deletePacheduReport, updatePacheduReport, usePacheduData } from './usePacheduData';
import { EXPORT_TONE_HEX, statusTone } from '@/lib/status';

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOURS: BehaviourType[] = ['Intentional', 'Unintentional'];
const STATUSES: PacheduStatus[] = ['draft', 'submitted', 'reviewed', 'closed'];
const ALL = '__all__';

const SECTION_META: Record<SectionType, { tone: Tone; icon: IconMeaning }> = { Mechanical: { tone: 'info', icon: 'mechanical' }, Electrical: { tone: 'warning', icon: 'electrical' } };
const BEHAVIOUR_META: Record<BehaviourType, { tone: Tone; icon: IconMeaning }> = { Intentional: { tone: 'warning', icon: 'flag' }, Unintentional: { tone: 'info', icon: 'info' } };
const STATUS_META: Record<PacheduStatus, { tone: Tone; icon: IconMeaning; label: string }> = {
  draft: { tone: statusTone('draft'), icon: 'draft', label: 'Draft' }, submitted: { tone: statusTone('submitted'), icon: 'submitted', label: 'Submitted' },
  reviewed: { tone: statusTone('reviewed'), icon: 'reviewed', label: 'Reviewed' }, closed: { tone: statusTone('closed'), icon: 'closed', label: 'Closed' },
};

const IMPACT_OPTIONS = ['Minor injury', 'Serious injury', 'Fatality', 'Damage To Property/RTA', 'Increased Cost', 'Loss of Production', 'Environmental Impact', 'Health threat'];
const SERIOUS_IMPACTS = ['Serious injury', 'Fatality', 'Environmental Impact'];
const CHECKLIST_CATEGORIES = [
  { name: 'Personal behaviour', items: ['Competence', 'Operating speed', 'Operating authority', 'Explosives handling', 'Personal positioning', 'Checklist completion', 'Condoning unsafe behaviour', 'Communication/Horseplay', 'Working on unsafe equipment'] },
  { name: 'Tools and equipment', items: ['Machine condition', 'Water blast/blowpipe', 'Lockout system', 'Service pipes', 'Pinch bar/gaskets', 'Gas testers', 'Ladders/Platforms', 'Safety chains', 'Warning signs'] },
  { name: 'Working conditions', items: ['General housekeeping', 'Illumination', 'Ventilation/Dust', 'Ground support', 'Pools of water', 'Air/Water leaks', 'Oil leaks', 'Noxious atmosphere', 'Confined space', 'Fire hazards', 'Noise'] },
  { name: 'Human nature and task', items: ['Stress', 'Shortcuts', 'Attitude/Mindset', 'Complacency', 'Unclear responsibilities', 'High workload', 'Time pressure', 'Multi-tasking', 'Illness/Fatigue', 'Inexperienced'] },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const hasSeriousImpact = (r: PacheduReport) => SERIOUS_IMPACTS.some(i => r.impacts?.includes(i));
// An unrecognised section or behaviour (legacy or malformed data) must not crash the page.
const SectionBadge = ({ section }: { section: SectionType }) => { const m = SECTION_META[section]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{section}</StatusBadge>; };
const BehaviourBadge = ({ value }: { value: BehaviourType }) => { const m = BEHAVIOUR_META[value]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{value}</StatusBadge>; };
const StatusTag = ({ status }: { status: PacheduStatus }) => { const m = STATUS_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };
const RiskBadge = () => <StatusBadge tone="danger" icon="warning">High risk</StatusBadge>;

type Form = Pick<PacheduReport, 'location' | 'date' | 'activityObserved' | 'whatDidYouSee' | 'reasons' | 'behaviourType' | 'impacts' | 'whatDidYouDo' | 'observerName' | 'dept' | 'sdwt' | 'sectionChoice' | 'checklist' | 'status'>;
const emptyForm = (): Form => ({
  location: '', date: new Date().toISOString().slice(0, 10), activityObserved: '', whatDidYouSee: '', reasons: '', behaviourType: 'Unintentional', impacts: [],
  whatDidYouDo: '', observerName: '', dept: 'Engineering', sdwt: '', sectionChoice: 'Mechanical', checklist: [], status: 'draft',
});
const toggle = (list: string[] | undefined, item: string) => (list?.includes(item) ? list.filter(i => i !== item) : [...(list || []), item]);

function ReportDialog({ report, open, onOpenChange, onSaved }: { report?: PacheduReport; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(report?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(report ? { ...emptyForm(), location: report.location, date: report.date, activityObserved: report.activityObserved, whatDidYouSee: report.whatDidYouSee, reasons: report.reasons || '', behaviourType: report.behaviourType, impacts: report.impacts || [], whatDidYouDo: report.whatDidYouDo, observerName: report.observerName || '', dept: report.dept || '', sdwt: report.sdwt || '', sectionChoice: report.sectionChoice, checklist: report.checklist || [], status: report.status } : emptyForm());
    }
  }
  const set = (patch: Partial<Form>) => setForm(p => ({ ...p, ...patch }));
  const people = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), department: e.department })), [employees]);
  const setObserver = (name: string) => { const m = people.find(p => p.name === name); setForm(p => ({ ...p, observerName: name, dept: m?.department || p.dept })); };

  const missing = { location: !form.location.trim(), activity: !form.activityObserved.trim(), saw: !form.whatDidYouSee.trim(), did: !form.whatDidYouDo.trim(), date: !form.date };
  const submit = async () => {
    setTouched(true);
    if (Object.values(missing).some(Boolean)) return false;
    if (report) await updatePacheduReport(report.id, { ...form, updated_at: new Date().toISOString() });
    // A new observation is always recorded as submitted.
    else await createPacheduReport({ ...form, status: 'submitted', submitted_at: new Date().toISOString() });
    toast.success(report ? 'Care observation updated.' : 'Care observation saved. Thank you for making PPM a safe place to work.');
    onSaved();
  };
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={report ? 'Edit care observation' : 'New care observation'} description="Location, date, the activity, what you saw and what you did are required." submitLabel={report ? 'Save changes' : 'Submit care observation'} onSubmit={submit} size="xl">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="pa-basic" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <h3 id="pa-basic" className="font-display text-section font-semibold text-ink sm:col-span-3">Basic information</h3>
          <Field label="Location" required error={err(missing.location, 'Enter where it happened.')}><Input value={form.location} onChange={e => set({ location: e.target.value })} placeholder="Where did this occur?" /></Field>
          <Field label="Date" required error={err(missing.date, 'Enter the date.')}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.sectionChoice} onValueChange={v => set({ sectionChoice: v as SectionType })} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
          <div className="sm:col-span-3"><Field label="Activity observed" required error={err(missing.activity, 'Describe the activity.')}><Input value={form.activityObserved} onChange={e => set({ activityObserved: e.target.value })} placeholder="What activity was being performed?" /></Field></div>
        </section>

        <section aria-labelledby="pa-care" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h3 id="pa-care" className="font-display text-section font-semibold text-ink md:col-span-2">What happened</h3>
          <div className="flex flex-col gap-4">
            <Field label="What did you see?" required description="Waonei? / Uboneni?" error={err(missing.saw, 'Describe what you saw.')}><Textarea rows={5} value={form.whatDidYouSee} onChange={e => set({ whatDidYouSee: e.target.value })} placeholder="Describe what you observed" /></Field>
            <Field label="Reasons" optional description="Zvikonzero / Isizatho"><Textarea rows={2} value={form.reasons} onChange={e => set({ reasons: e.target.value })} placeholder="Why do you think this happened?" /></Field>
          </div>
          <Field label="What did you do to ensure you care?" required description="Waitei chinoratidza kuti unehanya neumwe wako?" error={err(missing.did, 'Describe what you did.')}><Textarea rows={9} value={form.whatDidYouDo} onChange={e => set({ whatDidYouDo: e.target.value })} placeholder="Describe the actions you took" /></Field>
        </section>

        <section aria-labelledby="pa-impacts" className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 id="pa-impacts" className="font-display text-section font-semibold text-ink">Could this result in?</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{IMPACT_OPTIONS.map(i => <Checkbox key={i} label={i} checked={form.impacts.includes(i)} onChange={() => set({ impacts: toggle(form.impacts, i) })} />)}</div>
          </div>
          <div className="flex flex-col gap-4">
            <div><p className="mb-1.5 font-sans text-label font-medium text-ink">Behaviour classification</p><Segmented label="Behaviour classification" value={form.behaviourType} onValueChange={v => set({ behaviourType: v })} options={BEHAVIOURS.map(b => ({ value: b, label: b }))} /></div>
            <Field label="Observer name" optional description="Leave blank to record anonymously.">
              <Input list="pa-people" value={form.observerName} onChange={e => setObserver(e.target.value)} autoComplete="off" placeholder="Select or type your name" />
              <datalist id="pa-people">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
            </Field>
            <Field label="Department" optional><SuggestField historyKey="pach_dept" placeholder="For example, Engineering" value={form.dept} onChange={v => set({ dept: v })} /></Field>
            <Field label="SDWT" optional><SuggestField historyKey="pach_sdwt" placeholder="SDWT number" value={form.sdwt} onChange={v => set({ sdwt: v })} /></Field>
            {report && <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v as PacheduStatus })} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field>}
          </div>
        </section>

        <section aria-labelledby="pa-checklist" className="flex flex-col gap-3">
          <h3 id="pa-checklist" className="font-display text-section font-semibold text-ink">Referral checklist</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKLIST_CATEGORIES.map(c => (
              <fieldset key={c.name} className="flex flex-col gap-2">
                <legend className="mb-1 font-sans text-label font-medium text-ink">{c.name}</legend>
                {c.items.map(item => <Checkbox key={item} label={item} checked={form.checklist.includes(item)} onChange={() => set({ checklist: toggle(form.checklist, item) })} />)}
              </fieldset>
            ))}
          </div>
          <p className="text-center font-sans text-caption italic text-ink-muted">“Tinokutendai nekuita kuti PPM ive inoshandika zvisina njodzi.”</p>
        </section>
      </div>
    </FormDialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-sans text-body text-ink">{children}</dd></div>;
}

function DetailDialog({ report, onClose, onEdit, onDelete, onStatusChange }: { report: PacheduReport | null; onClose: () => void; onEdit: (r: PacheduReport) => void; onDelete: (r: PacheduReport) => void; onStatusChange: (id: string, s: PacheduStatus) => void }) {
  return (
    <Dialog
      open={!!report}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Pachedu: be your brother's keeper"
      description={report ? `${report.observerName || 'Anonymous'}, ${formatDate(report.date)}` : undefined}
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
            <div className="flex flex-wrap gap-2"><SectionBadge section={report.sectionChoice} /><BehaviourBadge value={report.behaviourType} /><StatusTag status={report.status} />{hasSeriousImpact(report) && <RiskBadge />}</div>
            <div className="w-44"><Field label="Change status"><Select aria-label="Change status" value={report.status} onValueChange={v => onStatusChange(report.id, v as PacheduStatus)} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field></div>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Location">{report.location || 'Not specified'}</Fact>
            <Fact label="Date">{formatDate(report.date)}</Fact>
            <Fact label="Observer">{report.observerName || 'Anonymous'}</Fact>
            <Fact label="Department">{report.dept || 'Not specified'}</Fact>
            <Fact label="SDWT">{report.sdwt || 'Not specified'}</Fact>
            <Fact label="Activity observed">{report.activityObserved || 'Not specified'}</Fact>
          </dl>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><h3 className="font-sans text-caption text-ink-muted">What did you see? <span className="italic">(Waonei? / Uboneni?)</span></h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.whatDidYouSee || 'Not specified'}</p></div>
            <div><h3 className="font-sans text-caption text-ink-muted">Reasons <span className="italic">(Zvikonzero / Isizatho)</span></h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.reasons || 'Not specified'}</p></div>
          </div>
          <div><h3 className="font-sans text-caption text-ink-muted">What did you do to ensure you care?</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{report.whatDidYouDo || 'Not specified'}</p></div>
          {report.impacts?.length > 0 && <div><h3 className="font-sans text-caption text-ink-muted">Potential impacts</h3><p className="mt-1.5 flex flex-wrap gap-1.5">{report.impacts.map(i => <StatusBadge key={i} tone={SERIOUS_IMPACTS.includes(i) ? 'danger' : 'warning'}>{i}</StatusBadge>)}</p></div>}
          {report.checklist?.length > 0 && <div><h3 className="font-sans text-caption text-ink-muted">Referral checklist ({report.checklist.length})</h3><ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">{report.checklist.map(i => <li key={i} className="font-sans text-body-sm text-ink">{i}</li>)}</ul></div>}
          <p className="text-center font-sans text-caption text-ink-muted">Created {formatDateTime(report.created_at)}</p>
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'observerName', label: 'Observer', width: 18, format: v => (v as string) || 'Anonymous' },
  { key: 'location', label: 'Location', width: 18 },
  { key: 'activityObserved', label: 'Activity Observed', width: 26 },
  { key: 'sectionChoice', label: 'Section', width: 14 },
  { key: 'behaviourType', label: 'Behaviour', width: 14 },
  { key: 'status', label: 'Status', width: 14, format: v => STATUS_META[v as PacheduStatus]?.label ?? String(v) },
  { key: 'dept', label: 'Department', width: 16 },
  { key: 'whatDidYouSee', label: 'What Did You See', width: 30 },
  { key: 'whatDidYouDo', label: 'What Did You Do', width: 30 },
];

function PacheduContent() {
  const confirm = useConfirm();
  const { reports, setReports, loading, loaded, error, errorStatus, refetch } = usePacheduData();
  const [view, setView] = useViewPreference('pachedu', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [sectionF, setSectionF] = useState(ALL);
  const [deptF, setDeptF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [riskOnly, setRiskOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<PacheduReport | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = useMemo(() => reports.find(r => r.id === viewingId) ?? null, [reports, viewingId]);

  const departments = useMemo(() => [...new Set(reports.map(r => r.dept).filter(Boolean))].sort(), [reports]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r =>
      (!q || [r.observerName, r.location, r.activityObserved, r.whatDidYouSee, r.dept].some(s => s?.toLowerCase().includes(q)))
      && (sectionF === ALL || r.sectionChoice === sectionF) && (deptF === ALL || r.dept === deptF) && (statusF === ALL || r.status === statusF)
      && (!riskOnly || hasSeriousImpact(r)) && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo));
  }, [reports, search, sectionF, deptF, statusF, riskOnly, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => String(r[id as keyof PacheduReport] ?? '').toLowerCase()), [filtered, sort]);
  const count = (s: PacheduStatus) => reports.filter(r => r.status === s).length;
  const intentional = reports.filter(r => r.behaviourType === 'Intentional').length;
  const risky = reports.filter(hasSeriousImpact).length;
  const bySection = SECTIONS.map(s => `${reports.filter(r => r.sectionChoice === s).length} ${s.toLowerCase()}`).join(', ');

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || sectionF !== ALL || deptF !== ALL || statusF !== ALL || riskOnly || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSectionF(ALL); setDeptF(ALL); setStatusF(ALL); setRiskOnly(false); setDateFrom(''); setDateTo(''); };
  const tile = (s: string) => ({ selected: statusF === s, onClick: () => setStatusF(statusF === s ? ALL : s) });

  const openEditor = (r?: PacheduReport) => { setViewingId(null); setEditing(r); setDialogOpen(true); };
  const label = (r: PacheduReport) => `${r.observerName || 'Anonymous'}, ${formatDate(r.date)}`;
  const remove = async (r: PacheduReport) => {
    if (!await confirm({ title: 'Delete this care observation?', message: `${label(r)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deletePacheduReport(r.id); setViewingId(null); toast.success('Care observation deleted.'); await refetch(); } catch (e) { toast.error((e as Error).message); }
  };
  const changeStatus = async (id: string, next: PacheduStatus) => {
    const before = reports.find(r => r.id === id);
    if (!before) return;
    setReports(ps => ps.map(r => (r.id === id ? { ...r, status: next } : r)));
    try { await updatePacheduReport(id, { status: next }); toast.success(`Status changed to ${STATUS_META[next].label.toLowerCase()}.`); }
    catch (e) { setReports(ps => ps.map(r => (r.id === id ? before : r))); toast.error(`Status was not changed: ${(e as Error).message}`); }
  };

  const COLUMNS: Column<PacheduReport>[] = [
    { id: 'date', header: 'Date', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{formatDate(r.date)}</span> },
    { id: 'observerName', header: 'Observer', sortable: true, cell: r => r.observerName || <span className="text-ink-muted">Anonymous</span> },
    { id: 'location', header: 'Location', sortable: true, hideBelow: 'md', cell: r => r.location },
    { id: 'activityObserved', header: 'Activity', hideBelow: 'lg', cell: r => <span className="line-clamp-2 max-w-[18rem]">{r.activityObserved}</span> },
    { id: 'sectionChoice', header: 'Section', sortable: true, hideBelow: 'md', cell: r => <SectionBadge section={r.sectionChoice} /> },
    { id: 'behaviourType', header: 'Behaviour', sortable: true, hideBelow: 'lg', cell: r => <BehaviourBadge value={r.behaviourType} /> },
    { id: 'status', header: 'Status', sortable: true, cell: r => <StatusTag status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Pachedu' }]}
        title="Pachedu care observations"
        description="Be your brother's keeper: track care observations and supportive actions."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh Pachedu reports" variant="ghost" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Pachedu_Care_Observations')}
                title="Pachedu Care Observations"
                statusColumn="sectionChoice"
                statusColor={(_v, row) => EXPORT_TONE_HEX[SECTION_META[row.sectionChoice as SectionType]?.tone ?? 'neutral']}
              />
            )}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openEditor()}>New care observation</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total care" value={reports.length} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Draft" value={count('draft')} loading={pending} unavailable={unavailable} {...tile('draft')} />
        <MetricTile compact label="Submitted" value={count('submitted')} loading={pending} unavailable={unavailable} {...tile('submitted')} />
        <MetricTile compact label="Reviewed" value={count('reviewed')} loading={pending} unavailable={unavailable} {...tile('reviewed')} />
        <MetricTile compact label="Closed" tone="success" value={count('closed')} loading={pending} unavailable={unavailable} {...tile('closed')} />
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
        <SearchField value={search} onValueChange={setSearch} placeholder="Search observer, location or activity" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
        {departments.length > 0 && <Select className="w-44" aria-label="Filter by department" value={deptF} onValueChange={setDeptF} options={[{ value: ALL, label: 'All departments' }, ...departments.map(d => ({ value: d, label: d }))]} />}
        <Segmented label="Risk" value={riskOnly ? 'risk' : 'all'} onValueChange={v => setRiskOnly(v === 'risk')} options={[{ value: 'all', label: 'All' }, { value: 'risk', label: `High risk (${risky})` }]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="Pachedu reports"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No care observations match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="care" title="No care observations yet" description="Be the first to record a Pachedu observation." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New care observation</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'observation' : 'observations'}{filtered.length !== reports.length ? ` of ${reports.length}` : ''} · {bySection} · {intentional} intentional</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => (
              <RecordCard
                key={r.id}
                eyebrow={`${formatDate(r.date)}${r.location ? ` · ${r.location}` : ''}`}
                title={r.observerName || 'Anonymous'}
                status={<StatusTag status={r.status} />}
                facts={[
                  { label: 'Section', value: <SectionBadge section={r.sectionChoice} /> },
                  { label: 'Behaviour', value: <BehaviourBadge value={r.behaviourType} /> },
                  ...(hasSeriousImpact(r) ? [{ label: 'Risk', value: <RiskBadge /> }] : []),
                  { label: 'Activity', value: <span className="line-clamp-2">{r.activityObserved || 'Not specified'}</span> },
                  { label: 'Recorded', value: `${plural(r.impacts?.length || 0, 'impact')}, ${plural(r.checklist?.length || 0, 'checklist item')}` },
                  ...(r.dept ? [{ label: 'Department', value: r.dept }] : []),
                ]}
                action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete care observation by ${label(r)}`} onClick={() => remove(r)} />}
                onOpen={() => setViewingId(r.id)}
                openLabel={`View care observation by ${label(r)}`}
              />
            ))}
          </div>
        ) : (
          <DataTable
            caption="Pachedu care observations"
            rows={rows}
            columns={COLUMNS}
            getRowId={r => r.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={r => setViewingId(r.id)}
            rowActions={r => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit care observation by ${label(r)}`} onClick={() => openEditor(r)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Delete care observation by ${label(r)}`} onClick={() => remove(r)} />
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

export default function PacheduFormPage() {
  return <AppShell migrated><PacheduContent /></AppShell>;
}
