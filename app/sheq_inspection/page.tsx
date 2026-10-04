// app/sheq_inspection/page.tsx — SHEQ Inspections register
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, RecordCard, SearchField,
  Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees, useLookupList } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { FindingStatus, InspectionFinding, InspectionStatus, PriorityType, SectionType, SHEQFormData } from './types';
import { createInspection, deleteInspection, updateInspection, useSheqInspectionData } from './useSheqInspectionData';

const SECTIONS: SectionType[] = ['mechanical', 'electrical'];
const SECTION_LABELS: Record<SectionType, string> = { mechanical: 'Mechanical', electrical: 'Electrical' };
const PRIORITIES: PriorityType[] = ['low', 'medium', 'high', 'critical'];
const FINDING_STATUSES: FindingStatus[] = ['open', 'in-progress', 'closed', 'overdue'];
const INSPECTION_STATUSES: InspectionStatus[] = ['draft', 'submitted', 'approved', 'rejected'];
const ALL = '__all__';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SECTION_META: Record<SectionType, { tone: Tone; icon: IconMeaning }> = { mechanical: { tone: 'info', icon: 'mechanical' }, electrical: { tone: 'warning', icon: 'electrical' } };
const PRIORITY_META: Record<PriorityType, { tone: Tone; icon: IconMeaning }> = {
  low: { tone: 'neutral', icon: 'flag' }, medium: { tone: 'info', icon: 'info' }, high: { tone: 'warning', icon: 'warning' }, critical: { tone: 'danger', icon: 'critical' },
};
const FINDING_META: Record<FindingStatus, { tone: Tone; icon: IconMeaning; label: string }> = {
  open: { tone: 'warning', icon: 'warning', label: 'Open' }, 'in-progress': { tone: 'info', icon: 'clock', label: 'In progress' },
  closed: { tone: 'success', icon: 'closed', label: 'Closed' }, overdue: { tone: 'danger', icon: 'overdue', label: 'Overdue' },
};
const INSPECTION_META: Record<InspectionStatus, { tone: Tone; icon: IconMeaning; label: string }> = {
  draft: { tone: 'neutral', icon: 'draft', label: 'Draft' }, submitted: { tone: 'info', icon: 'submitted', label: 'Submitted' },
  approved: { tone: 'success', icon: 'check', label: 'Approved' }, rejected: { tone: 'danger', icon: 'cancel', label: 'Rejected' },
};
const INSPECTION_HEX: Record<InspectionStatus, string> = { draft: '#94a3b8', submitted: '#3b82f6', approved: '#34d399', rejected: '#f43f5e' };

const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => (d ? formatDate(d) : '');
const newFinding = (section: SectionType): InspectionFinding => ({ id: uid(), finding: '', requiredAction: '', byWho: '', byWhen: '', status: 'open', priority: 'medium', section });

const SectionBadge = ({ section }: { section: SectionType }) => { const m = SECTION_META[section]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{SECTION_LABELS[section] ?? section}</StatusBadge>; };
const PriorityBadge = ({ priority }: { priority: PriorityType }) => { const m = PRIORITY_META[priority]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{cap(priority)}</StatusBadge>; };
const FindingBadge = ({ status }: { status: FindingStatus }) => { const m = FINDING_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };
const InspectionBadge = ({ status }: { status: InspectionStatus }) => { const m = INSPECTION_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };

type Form = Pick<SHEQFormData, 'inspectors' | 'title' | 'place' | 'date' | 'time' | 'department' | 'section' | 'findings' | 'hodName' | 'sheqOfficialName' | 'status' | 'before_photos' | 'after_photos'>;
const emptyForm = (): Form => ({
  inspectors: '', title: '', place: '', date: new Date().toISOString().slice(0, 10), time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  department: '', section: 'mechanical', findings: [], hodName: '', sheqOfficialName: '', status: 'draft', before_photos: [], after_photos: [],
});

function FindingFields({ finding, index, touched, onChange, onRemove }: { finding: InspectionFinding; index: number; touched: boolean; onChange: (id: string, patch: Partial<InspectionFinding>) => void; onRemove: (id: string) => void }) {
  const n = index + 1;
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="px-1 font-sans text-label font-medium text-ink">Finding {n}</legend>
      <div className="flex justify-end"><IconButton icon="delete" variant="danger" size="sm" label={`Remove finding ${n}`} onClick={() => onRemove(finding.id)} /></div>
      <Field label={`Finding description (finding ${n})`} required error={err(!finding.finding.trim(), 'Describe the finding.')}><Textarea rows={2} value={finding.finding} onChange={e => onChange(finding.id, { finding: e.target.value })} placeholder="Describe the issue or finding" /></Field>
      <Field label={`Required action (finding ${n})`} required error={err(!finding.requiredAction.trim(), 'Say what action is required.')}><Textarea rows={2} value={finding.requiredAction} onChange={e => onChange(finding.id, { requiredAction: e.target.value })} placeholder="What corrective action is required?" /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Assigned to (finding ${n})`} required error={err(!finding.byWho.trim(), 'Enter who is responsible.')}><Input value={finding.byWho} onChange={e => onChange(finding.id, { byWho: e.target.value })} placeholder="Person responsible" /></Field>
        <Field label={`Due date (finding ${n})`} required error={err(!finding.byWhen, 'Enter the due date.')}><Input type="date" value={finding.byWhen} onChange={e => onChange(finding.id, { byWhen: e.target.value })} /></Field>
        <Field label="Priority"><Select aria-label={`Finding ${n} priority`} value={finding.priority} options={PRIORITIES.map(p => ({ value: p, label: cap(p) }))} onValueChange={v => onChange(finding.id, { priority: v as PriorityType })} /></Field>
        <Field label="Status"><Select aria-label={`Finding ${n} status`} value={finding.status} options={FINDING_STATUSES.map(s => ({ value: s, label: FINDING_META[s].label }))} onValueChange={v => onChange(finding.id, { status: v as FindingStatus })} /></Field>
        <Field label="Section"><Select aria-label={`Finding ${n} section`} value={finding.section} options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))} onValueChange={v => onChange(finding.id, { section: v as SectionType })} /></Field>
        <Field label={`Completed date (finding ${n})`} optional description={finding.status === 'closed' ? undefined : 'Available once the finding is closed.'}><Input type="date" disabled={finding.status !== 'closed'} value={finding.completedDate || ''} onChange={e => onChange(finding.id, { completedDate: e.target.value })} /></Field>
      </div>
      <Field label={`Remarks (finding ${n})`} optional><Textarea rows={2} value={finding.remarks || ''} onChange={e => onChange(finding.id, { remarks: e.target.value })} placeholder="Additional remarks" /></Field>
    </fieldset>
  );
}

function InspectionDialog({ inspection, open, onOpenChange, onSaved }: { inspection?: SHEQFormData; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const locations = useLookupList('location');
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(inspection?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(inspection ? { ...emptyForm(), ...inspection, findings: inspection.findings || [], before_photos: inspection.before_photos || [], after_photos: inspection.after_photos || [] } : emptyForm());
    }
  }
  const set = (patch: Partial<Form>) => setForm(p => ({ ...p, ...patch }));
  const people = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), department: e.department })), [employees]);
  const setInspectors = (name: string) => {
    const m = people.find(p => p.name === name);
    setForm(p => ({ ...p, inspectors: name, department: m?.department || p.department }));
  };
  const updateFinding = (id: string, patch: Partial<InspectionFinding>) => set({ findings: form.findings.map(f => (f.id === id ? { ...f, ...patch } : f)) });

  const findingsValid = form.findings.every(f => f.finding.trim() && f.requiredAction.trim() && f.byWho.trim() && f.byWhen);
  const submit = async () => {
    setTouched(true);
    if (!form.title.trim() || !form.inspectors.trim() || !form.place.trim() || !form.date || !form.time || !findingsValid) return false;
    if (inspection) await updateInspection(inspection.id, form); else await createInspection(form);
    toast.success(inspection ? 'Inspection updated.' : 'Inspection created.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={inspection ? 'Edit inspection' : 'New inspection'} description="Title, inspector, location, date and time are required." submitLabel={inspection ? 'Save changes' : 'Create inspection'} onSubmit={submit} size="lg">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="si-basic" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="si-basic" className="font-display text-section font-semibold text-ink sm:col-span-2">Inspection</h3>
          <div className="sm:col-span-2"><Field label="Inspection title" required error={touched && !form.title.trim() ? 'Enter a title.' : undefined}><Input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="For example, Monthly safety audit" /></Field></div>
          <div className="sm:col-span-2">
            <Field label="Inspector(s)" required description="Separate several names with commas." error={touched && !form.inspectors.trim() ? 'Enter the inspector’s name.' : undefined}>
              <Input list="si-people" value={form.inspectors} onChange={e => setInspectors(e.target.value)} autoComplete="off" placeholder="Select or type inspector names" />
            </Field>
          </div>
          <Field label="Location" required error={touched && !form.place.trim() ? 'Enter the location.' : undefined}>
            <Input list="si-locations" value={form.place} onChange={e => set({ place: e.target.value })} placeholder="For example, 6 Level, Workshop" />
            <datalist id="si-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
          </Field>
          <Field label="Department" optional><SuggestField historyKey="sheq_department" placeholder="For example, Engineering" value={form.department} onChange={v => set({ department: v })} /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set({ section: v as SectionType })} options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))} /></Field>
          <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v as InspectionStatus })} options={INSPECTION_STATUSES.map(s => ({ value: s, label: INSPECTION_META[s].label }))} /></Field>
          <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Time" required error={touched && !form.time ? 'Enter the time.' : undefined}><Input type="time" value={form.time} onChange={e => set({ time: e.target.value })} /></Field>
          <datalist id="si-people">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
        </section>

        <section aria-labelledby="si-findings" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="si-findings" className="font-display text-section font-semibold text-ink">Findings ({form.findings.length})</h3>
            <Button size="sm" icon="plus" onClick={() => set({ findings: [...form.findings, newFinding(form.section)] })}>Add finding</Button>
          </div>
          {form.findings.length === 0
            ? <p className="font-sans text-body-sm text-ink-muted">No findings yet. Add one for each issue the inspection raised.</p>
            : form.findings.map((f, i) => <FindingFields key={f.id} finding={f} index={i} touched={touched} onChange={updateFinding} onRemove={id => set({ findings: form.findings.filter(x => x.id !== id) })} />)}
        </section>

        <section aria-labelledby="si-photos" className="flex flex-col gap-4">
          <h3 id="si-photos" className="font-display text-section font-semibold text-ink">Photos</h3>
          <PhotoUpload label="Before inspection" description="State of the area or equipment before work began" photos={form.before_photos} onChange={urls => set({ before_photos: urls })} folder="sheq/before" maxPhotos={10} />
          <PhotoUpload label="After inspection" description="Condition after inspection and corrective actions" photos={form.after_photos} onChange={urls => set({ after_photos: urls })} folder="sheq/after" maxPhotos={10} />
        </section>

        <section aria-labelledby="si-signoff" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="si-signoff" className="font-display text-section font-semibold text-ink sm:col-span-2">Sign-off</h3>
          <Field label="Head of department" optional><Input list="si-people" value={form.hodName} onChange={e => set({ hodName: e.target.value })} autoComplete="off" placeholder="Select or type a name" /></Field>
          <Field label="SHEQ official" optional><Input list="si-people" value={form.sheqOfficialName} onChange={e => set({ sheqOfficialName: e.target.value })} autoComplete="off" placeholder="Select or type a name" /></Field>
          <p className="font-sans text-caption text-ink-muted sm:col-span-2">Signatures are captured after submission or approval.</p>
        </section>
      </div>
    </FormDialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-sans text-body text-ink">{children}</dd></div>;
}

function DetailDialog({ inspection, onClose, onEdit, onDelete }: { inspection: SHEQFormData | null; onClose: () => void; onEdit: (i: SHEQFormData) => void; onDelete: (i: SHEQFormData) => void }) {
  return (
    <Dialog
      open={!!inspection}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Inspection report"
      description={inspection ? `${inspection.title}, ${fmtDate(inspection.date)}` : undefined}
      size="lg"
      footer={inspection && (
        <>
          <Button variant="danger" icon="delete" onClick={() => onDelete(inspection)}>Delete</Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="edit" onClick={() => onEdit(inspection)}>Edit</Button>
        </>
      )}
    >
      {inspection && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Inspectors">{inspection.inspectors}</Fact>
            <Fact label="Department">{inspection.department || 'Not specified'}</Fact>
            <Fact label="Location">{inspection.place}</Fact>
            <Fact label="Date and time">{fmtDate(inspection.date)}{inspection.time ? ` at ${inspection.time}` : ''}</Fact>
            <Fact label="Section"><SectionBadge section={inspection.section} /></Fact>
            <Fact label="Status"><InspectionBadge status={inspection.status} /></Fact>
          </dl>
          <section aria-labelledby="si-detail-findings">
            <h3 id="si-detail-findings" className="mb-2 font-sans text-caption text-ink-muted">Findings and actions ({inspection.findings?.length || 0})</h3>
            {inspection.findings?.length ? (
              <ol className="flex flex-col gap-2">
                {inspection.findings.map((f, i) => (
                  <li key={f.id} className="rounded-card border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-sans text-body font-medium text-ink">{i + 1}. {f.finding}</p>
                      <span className="inline-flex gap-1.5"><PriorityBadge priority={f.priority} /><FindingBadge status={f.status} /></span>
                    </div>
                    <p className="mt-1 font-sans text-body-sm text-ink-muted">{f.requiredAction}</p>
                    <p className="mt-1.5 font-sans text-caption text-ink-muted">By {f.byWho} · due {fmtDate(f.byWhen)}{f.completedDate ? ` · done ${fmtDate(f.completedDate)}` : ''}</p>
                    {f.remarks && <p className="mt-1 font-sans text-caption text-ink-muted">{f.remarks}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="font-sans text-body-sm text-ink-muted">No findings recorded for this inspection.</p>}
          </section>
          {(inspection.before_photos?.length || 0) + (inspection.after_photos?.length || 0) > 0 && (
            <section aria-labelledby="si-detail-photos" className="flex flex-col gap-3">
              <h3 id="si-detail-photos" className="font-sans text-caption text-ink-muted">Photos</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {inspection.before_photos?.length > 0 && <PhotoUpload label="Before inspection" photos={inspection.before_photos} onChange={() => {}} disabled />}
                {inspection.after_photos?.length > 0 && <PhotoUpload label="After inspection" photos={inspection.after_photos} onChange={() => {}} disabled />}
              </div>
            </section>
          )}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[{ label: 'Head of department', name: inspection.hodName, sig: inspection.hodSignature }, { label: 'SHEQ official', name: inspection.sheqOfficialName, sig: inspection.sheqSignature }].map(({ label, name, sig }) => (
              <Fact key={label} label={label}>
                {sig ? <img src={sig} alt={`${label} signature`} className="max-h-10" /> : <span className="text-ink-muted">{name ? `${name} (not yet signed)` : 'Not signed'}</span>}
              </Fact>
            ))}
          </dl>
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'title', label: 'Title', width: 26 },
  { key: 'inspectors', label: 'Inspector(s)', width: 22 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'place', label: 'Location', width: 18 },
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'status', label: 'Status', width: 14 },
  {
    key: 'findings', label: 'Findings', width: 16,
    format: (_v, row) => {
      const findings = (row.findings as InspectionFinding[]) ?? [];
      return `${findings.filter(f => f.status === 'closed').length}/${findings.length} closed`;
    },
  },
];

function InspectionContent() {
  const confirm = useConfirm();
  const { inspections, loading, loaded, error, errorStatus, refetch } = useSheqInspectionData();
  const [view, setView] = useViewPreference('sheq-inspection', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [sectionF, setSectionF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<SHEQFormData | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<SHEQFormData | null>(null);

  const stats = useMemo(() => {
    const all = inspections.flatMap(i => i.findings || []);
    const n = (s: FindingStatus) => all.filter(f => f.status === s).length;
    return { total: inspections.length, open: n('open'), inProgress: n('in-progress'), closed: n('closed'), overdue: n('overdue'), critical: all.filter(f => f.priority === 'critical').length };
  }, [inspections]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return inspections.filter(i =>
      (!s || i.title?.toLowerCase().includes(s) || i.inspectors?.toLowerCase().includes(s) || i.place?.toLowerCase().includes(s))
      && (sectionF === ALL || i.section === sectionF) && (statusF === ALL || i.status === statusF)
      && (!dateFrom || i.date >= dateFrom) && (!dateTo || i.date <= dateTo));
  }, [inspections, search, sectionF, statusF, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (i, id) => (id === 'findings' ? String(i.findings?.length || 0).padStart(4, '0') : String(i[id as keyof SHEQFormData] ?? '').toLowerCase())), [filtered, sort]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || sectionF !== ALL || statusF !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSectionF(ALL); setStatusF(ALL); setDateFrom(''); setDateTo(''); };

  const openEditor = (i?: SHEQFormData) => { setViewing(null); setEditing(i); setDialogOpen(true); };
  const remove = async (i: SHEQFormData) => {
    if (!await confirm({ title: 'Delete this inspection?', message: `${i.title}, ${fmtDate(i.date)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteInspection(i.id); setViewing(null); toast.success('Inspection deleted.'); await refetch(); } catch (e) { toast.error((e as Error).message); }
  };

  const COLUMNS: Column<SHEQFormData>[] = [
    { id: 'title', header: 'Title', sortable: true, sticky: true, cell: i => i.title },
    { id: 'inspectors', header: 'Inspector(s)', sortable: true, hideBelow: 'lg', cell: i => i.inspectors },
    { id: 'section', header: 'Section', sortable: true, hideBelow: 'md', cell: i => <SectionBadge section={i.section} /> },
    { id: 'place', header: 'Location', sortable: true, hideBelow: 'md', cell: i => i.place },
    { id: 'date', header: 'Date', sortable: true, cell: i => <span className="whitespace-nowrap tabular">{fmtDate(i.date)}</span> },
    { id: 'findings', header: 'Findings', sortable: true, hideBelow: 'md', cell: i => <span className="tabular">{i.findings?.length || 0} ({i.findings?.filter(f => f.status === 'closed').length || 0} closed)</span> },
    { id: 'status', header: 'Status', sortable: true, cell: i => <InspectionBadge status={i.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'SHEQ inspections' }]}
        title="SHEQ inspections"
        description="Safety, health, environment and quality compliance tracking."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh inspections" variant="outline" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('SHEQ_Inspections')}
                title="SHEQ Inspections"
                statusColumn="status"
                statusColor={(_v, row) => INSPECTION_HEX[row.status as InspectionStatus]?.replace('#', '')}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>New inspection</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Inspections" icon="compliance" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile label="Open" detail="findings" icon="warning" tone="warning" value={stats.open} loading={pending} unavailable={unavailable} />
        <MetricTile label="In progress" detail="findings" icon="clock" value={stats.inProgress} loading={pending} unavailable={unavailable} />
        <MetricTile label="Closed" detail="findings" icon="closed" tone="success" value={stats.closed} loading={pending} unavailable={unavailable} />
        <MetricTile label="Overdue" detail="findings" icon="overdue" tone="danger" value={stats.overdue} loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search title, inspector or location" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Select className="w-40" aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))]} />
        <Select className="w-40" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, ...INSPECTION_STATUSES.map(s => ({ value: s, label: INSPECTION_META[s].label }))]} />
        <Input type="date" aria-label="From date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" aria-label="To date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {hasFilters && <Button variant="ghost" icon="close" onClick={clearFilters}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status}
        subject="SHEQ inspections"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No inspections match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="compliance" title="No inspections yet" description="Create the first inspection to get started." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New inspection</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'inspection' : 'inspections'}{filtered.length !== inspections.length ? ` of ${inspections.length}` : ''} · {stats.critical} critical {stats.critical === 1 ? 'finding' : 'findings'} across all inspections</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(i => {
              const findings = i.findings || [];
              const closed = findings.filter(f => f.status === 'closed').length;
              const critical = findings.filter(f => f.priority === 'critical').length;
              const photos = (i.before_photos?.length || 0) + (i.after_photos?.length || 0);
              return (
                <RecordCard
                  key={i.id}
                  eyebrow={`${fmtDate(i.date)}${i.time ? ` at ${i.time}` : ''}`}
                  title={i.title}
                  status={<InspectionBadge status={i.status} />}
                  facts={[
                    { label: 'Section', value: <SectionBadge section={i.section} /> },
                    { label: 'Inspectors', value: i.inspectors },
                    { label: 'Location', value: i.place },
                    { label: 'Findings', value: findings.length ? `${findings.length} (${closed} closed${critical ? `, ${critical} critical` : ''})` : 'None recorded' },
                    ...(photos ? [{ label: 'Photos', value: String(photos) }] : []),
                  ]}
                  action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete inspection ${i.title}`} onClick={() => remove(i)} />}
                  onOpen={() => setViewing(i)}
                  openLabel={`View inspection ${i.title}`}
                />
              );
            })}
          </div>
        ) : (
          <DataTable
            caption="SHEQ inspections"
            rows={rows}
            columns={COLUMNS}
            getRowId={i => i.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={setViewing}
            rowActions={i => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit inspection ${i.title}`} onClick={() => openEditor(i)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Delete inspection ${i.title}`} onClick={() => remove(i)} />
              </span>
            )}
          />
        )}
      </DataRegion>

      <DetailDialog inspection={viewing} onClose={() => setViewing(null)} onEdit={openEditor} onDelete={remove} />
      <InspectionDialog inspection={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function SHEQInspectionPage() {
  return <AppShell migrated><InspectionContent /></AppShell>;
}
