// app/pto/page.tsx — Planned Task Observation register
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Checkbox, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, Progress, RecordCard, SearchField,
  Segmented, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { summarizeActions } from '@/lib/actionPlan';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { ActionPlanItem, ActionStatus, ObservationType, PTOReport, Reasons, ReportStatus, RiskAssessment, SectionType, SuggestedRemedies, YesNoType } from './types';
import { createPTOReport, deletePTOReport, updatePTOReport, usePTOData } from './usePTOData';

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const STATUSES: ReportStatus[] = ['draft', 'submitted', 'reviewed', 'closed'];
const ACTION_STATUSES: ActionStatus[] = ['Pending', 'In Progress', 'Completed'];
const ALL = '__all__';
const YES_NO = [{ value: 'Yes' as YesNoType, label: 'Yes' }, { value: 'No' as YesNoType, label: 'No' }];

const SECTION_META: Record<SectionType, { tone: Tone; icon: IconMeaning }> = { Mechanical: { tone: 'info', icon: 'mechanical' }, Electrical: { tone: 'warning', icon: 'electrical' } };
const STATUS_META: Record<ReportStatus, { tone: Tone; icon: IconMeaning; label: string }> = {
  draft: { tone: 'neutral', icon: 'draft', label: 'Draft' }, submitted: { tone: 'info', icon: 'submitted', label: 'Submitted' },
  reviewed: { tone: 'brand', icon: 'reviewed', label: 'Reviewed' }, closed: { tone: 'success', icon: 'closed', label: 'Closed' },
};
const ACTION_META: Record<ActionStatus, { tone: Tone; icon: IconMeaning }> = { Pending: { tone: 'warning', icon: 'pending' }, 'In Progress': { tone: 'info', icon: 'clock' }, Completed: { tone: 'success', icon: 'closed' } };
const STATUS_HEX: Record<ReportStatus, string> = { draft: '#94a3b8', submitted: '#3b82f6', reviewed: '#a78bfa', closed: '#10b981' };

const REASON_LABELS: Record<keyof Reasons, string> = {
  monthly: 'Monthly observation', newEmployee: 'New employee', safetyAwareness: 'Safety awareness',
  incidentFollowUp: 'Incident follow-up', trainingFollowUp: 'Training follow-up', infrequentTask: 'Infrequently performed',
};
const REMEDY_LABELS: Record<keyof SuggestedRemedies, string> = {
  newProcedure: 'New procedure', reviseExisting: 'Revise existing', differentEquipment: 'Different equipment', engineeringControls: 'Engineering controls',
  retraining: 'Retraining', improvedPPE: 'Improved PPE', placementOfWorker: 'Placement of worker',
};

const fmtDate = (s: string) => (s ? formatDate(s) : '');
const newId = () => Math.random().toString(36).slice(2, 11);
// A legacy or malformed record without a risk assessment must not crash the page.
const hasRiskFlag = (ra: RiskAssessment | null | undefined) => ra?.made === 'No' || ra?.identified === 'No' || ra?.effective === 'No';
const overdueCount = (r: PTOReport) => (r.actionPlan || []).filter(a => a.status !== 'Completed' && a.byWhen && a.byWhen < new Date().toISOString().slice(0, 10)).length;

const SectionBadge = ({ section }: { section: SectionType }) => { const m = SECTION_META[section]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{section}</StatusBadge>; };
const StatusTag = ({ status }: { status: ReportStatus }) => { const m = STATUS_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };
const ActionBadge = ({ status }: { status: ActionStatus }) => { const m = ACTION_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{status}</StatusBadge>; };
const YesNoBadge = ({ value, goodWhen = 'Yes' }: { value?: string; goodWhen?: 'Yes' | 'No' }) => (value ? <StatusBadge tone={value === goodWhen ? 'success' : 'danger'}>{value}</StatusBadge> : <span className="text-ink-muted">Not specified</span>);
const RiskBadge = () => <StatusBadge tone="danger" icon="warning">Risk identified</StatusBadge>;

type Form = Omit<PTOReport, 'id' | 'created_at' | 'updated_at' | 'submitted_at'>;
const emptyForm = (): Form => ({
  date: new Date().toISOString().slice(0, 10), observerName: '', section: 'Mechanical', deptSectionContractor: '', workerName: '', occupation: '', jobTaskObserved: '', sheqRefNo: '',
  observationType: 'Initial', timeOnJob: { months: '', years: '' }, notification: { toldInAdvance: 'No' },
  reasons: { monthly: false, newEmployee: false, safetyAwareness: false, incidentFollowUp: false, trainingFollowUp: false, infrequentTask: false },
  procedures: { hasProcedure: 'No', familiarWithProcedure: 'No' }, riskAssessment: { made: 'No', identified: 'No', effective: 'No' },
  suggestedRemedies: { newProcedure: 'No', reviseExisting: 'No', differentEquipment: 'No', engineeringControls: 'No', retraining: 'No', improvedPPE: 'No', placementOfWorker: 'No' },
  observationScope: 'All', followUpNeeded: 'No', actionPlan: [], status: 'draft',
});
/** Fill any nested group a legacy record lacks, so the form never reads a property off undefined. */
const normalise = (r: PTOReport): Form => { const e = emptyForm(); return { ...e, ...r, timeOnJob: { ...e.timeOnJob, ...r.timeOnJob }, notification: { ...e.notification, ...r.notification }, reasons: { ...e.reasons, ...r.reasons }, procedures: { ...e.procedures, ...r.procedures }, riskAssessment: { ...e.riskAssessment, ...r.riskAssessment }, suggestedRemedies: { ...e.suggestedRemedies, ...r.suggestedRemedies }, actionPlan: r.actionPlan || [] }; };

function YesNo({ label, value, onChange }: { label: string; value: YesNoType; onChange: (v: YesNoType) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line px-3 py-2.5"><span className="font-sans text-body text-ink">{label}</span><Segmented label={label} value={value} onValueChange={onChange} options={YES_NO} /></div>;
}

function ActionFields({ item, index, touched, onChange, onRemove }: { item: ActionPlanItem; index: number; touched: boolean; onChange: (id: string, patch: Partial<ActionPlanItem>) => void; onRemove: (id: string) => void }) {
  const n = index + 1;
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="px-1 font-sans text-label font-medium text-ink">Action {n}</legend>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><Field label="Status"><Select aria-label={`Action ${n} status`} value={item.status} options={ACTION_STATUSES.map(s => ({ value: s, label: s }))} onValueChange={v => onChange(item.id, { status: v as ActionStatus })} /></Field></div>
        <IconButton icon="delete" variant="danger" label={`Remove action ${n}`} onClick={() => onRemove(item.id)} />
      </div>
      <Field label={`Required action (action ${n})`} required error={err(!item.action.trim(), 'Describe the required action.')}><SuggestField historyKey="pto_required_action" placeholder="Describe the required action" value={item.action} onChange={v => onChange(item.id, { action: v })} /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`By whom (action ${n})`} required error={err(!item.byWhom.trim(), 'Enter who is responsible.')}><SuggestField historyKey="handover_supervisor" placeholder="Responsible person" value={item.byWhom} onChange={v => onChange(item.id, { byWhom: v })} /></Field>
        <Field label={`By when (action ${n})`} required error={err(!item.byWhen, 'Enter the due date.')}><Input type="date" value={item.byWhen} onChange={e => onChange(item.id, { byWhen: e.target.value })} /></Field>
        {item.status === 'Completed' && <Field label={`Completed date (action ${n})`} optional><Input type="date" value={item.completedDate || ''} onChange={e => onChange(item.id, { completedDate: e.target.value })} /></Field>}
      </div>
      <Field label={`Remarks (action ${n})`} optional><Textarea rows={2} value={item.remarks || ''} onChange={e => onChange(item.id, { remarks: e.target.value })} placeholder="Additional notes" /></Field>
    </fieldset>
  );
}

function ReportDialog({ report, open, onOpenChange, onSaved }: { report?: PTOReport; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(report?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) { setTouched(false); setForm(report ? normalise(report) : emptyForm()); }
  }
  const set = (patch: Partial<Form>) => setForm(p => ({ ...p, ...patch }));
  const updateAction = (id: string, patch: Partial<ActionPlanItem>) => set({ actionPlan: form.actionPlan.map(a => (a.id === id ? { ...a, ...patch } : a)) });
  const progress = summarizeActions(form.actionPlan);

  const actionsValid = form.actionPlan.every(a => a.action.trim() && a.byWhom.trim() && a.byWhen);
  const submit = async () => {
    setTouched(true);
    if (!form.observerName.trim() || !form.workerName.trim() || !form.jobTaskObserved.trim() || !form.date || !actionsValid) return false;
    const payload = { ...form, actionPlan: form.actionPlan.map((a, i) => ({ ...a, no: i + 1 })) };
    if (report) await updatePTOReport(report.id, { ...payload, updated_at: new Date().toISOString() });
    // A new observation is always recorded as submitted.
    else await createPTOReport({ ...payload, status: 'submitted', submitted_at: new Date().toISOString() });
    toast.success(report ? 'PTO report updated.' : 'PTO report submitted.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={report ? 'Edit PTO report' : 'New planned task observation'} description="Date, observer, worker and the task observed are required." submitLabel={report ? 'Save changes' : 'Submit PTO'} onSubmit={submit} size="lg">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="pto-basic" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 id="pto-basic" className="font-display text-section font-semibold text-ink sm:col-span-2">Observation</h3>
          <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Observer name" required error={touched && !form.observerName.trim() ? 'Enter the observer’s name.' : undefined}><Input value={form.observerName} onChange={e => set({ observerName: e.target.value })} placeholder="Observer's full name" /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set({ section: v as SectionType })} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
          <Field label="Department or contractor" optional><Input value={form.deptSectionContractor} onChange={e => set({ deptSectionContractor: e.target.value })} placeholder="Department or contractor" /></Field>
          <Field label="Worker name" required error={touched && !form.workerName.trim() ? 'Enter the worker’s name.' : undefined}><Input value={form.workerName} onChange={e => set({ workerName: e.target.value })} placeholder="Worker's full name" /></Field>
          <Field label="Occupation" optional><Input value={form.occupation} onChange={e => set({ occupation: e.target.value })} placeholder="Job title or occupation" /></Field>
          <div className="sm:col-span-2"><Field label="Job or task observed" required error={touched && !form.jobTaskObserved.trim() ? 'Describe the task observed.' : undefined}><Input value={form.jobTaskObserved} onChange={e => set({ jobTaskObserved: e.target.value })} placeholder="Describe the task being observed" /></Field></div>
          <Field label="SHEQ reference no." optional><Input value={form.sheqRefNo} onChange={e => set({ sheqRefNo: e.target.value })} placeholder="For example, SHEQ-001" /></Field>
          <Field label="Observation type"><Select aria-label="Observation type" value={form.observationType} onValueChange={v => set({ observationType: v as ObservationType })} options={[{ value: 'Initial', label: 'Initial' }, { value: 'Follow up', label: 'Follow up' }]} /></Field>
          <Field label="Time on job (months)" optional><Input inputMode="numeric" value={form.timeOnJob.months} onChange={e => set({ timeOnJob: { ...form.timeOnJob, months: e.target.value } })} placeholder="0" /></Field>
          <Field label="Time on job (years)" optional><Input inputMode="numeric" value={form.timeOnJob.years} onChange={e => set({ timeOnJob: { ...form.timeOnJob, years: e.target.value } })} placeholder="0" /></Field>
          <div className="sm:col-span-2"><YesNo label="Was the worker told in advance?" value={form.notification.toldInAdvance} onChange={v => set({ notification: { toldInAdvance: v } })} /></div>
        </section>

        <section aria-labelledby="pto-reasons" className="flex flex-col gap-3">
          <h3 id="pto-reasons" className="font-display text-section font-semibold text-ink">Reasons for observation</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(REASON_LABELS) as (keyof Reasons)[]).map(k => <Checkbox key={k} label={REASON_LABELS[k]} checked={!!form.reasons[k]} onChange={e => set({ reasons: { ...form.reasons, [k]: e.target.checked } })} />)}
          </div>
        </section>

        <section aria-labelledby="pto-procedures" className="flex flex-col gap-2">
          <h3 id="pto-procedures" className="font-display text-section font-semibold text-ink">SHEQ work procedure</h3>
          <YesNo label="Is a SHEQ work procedure available?" value={form.procedures.hasProcedure} onChange={v => set({ procedures: { ...form.procedures, hasProcedure: v } })} />
          <YesNo label="Is the employee familiar with the procedure?" value={form.procedures.familiarWithProcedure} onChange={v => set({ procedures: { ...form.procedures, familiarWithProcedure: v } })} />
        </section>

        <section aria-labelledby="pto-risk" className="flex flex-col gap-2">
          <h3 id="pto-risk" className="font-display text-section font-semibold text-ink">Risk assessment</h3>
          <YesNo label="Has a risk assessment been made?" value={form.riskAssessment.made} onChange={v => set({ riskAssessment: { ...form.riskAssessment, made: v } })} />
          <YesNo label="Have hazards, risks and controls been identified?" value={form.riskAssessment.identified} onChange={v => set({ riskAssessment: { ...form.riskAssessment, identified: v } })} />
          <YesNo label="Are the controls effective?" value={form.riskAssessment.effective} onChange={v => set({ riskAssessment: { ...form.riskAssessment, effective: v } })} />
          <p className="font-sans text-caption text-ink-muted">Any “No” above flags the observation as high risk.</p>
        </section>

        <section aria-labelledby="pto-remedies" className="flex flex-col gap-3">
          <h3 id="pto-remedies" className="font-display text-section font-semibold text-ink">Suggested remedies</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(REMEDY_LABELS) as (keyof SuggestedRemedies)[]).map(k => <Checkbox key={k} label={REMEDY_LABELS[k]} checked={form.suggestedRemedies[k] === 'Yes'} onChange={e => set({ suggestedRemedies: { ...form.suggestedRemedies, [k]: e.target.checked ? 'Yes' : 'No' } })} />)}
          </div>
        </section>

        <section aria-labelledby="pto-scope" className="flex flex-col gap-2">
          <h3 id="pto-scope" className="font-display text-section font-semibold text-ink">Scope and follow-up</h3>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line px-3 py-2.5">
            <span className="font-sans text-body text-ink">Observation scope</span>
            <Segmented label="Observation scope" value={form.observationScope} onValueChange={v => set({ observationScope: v })} options={[{ value: 'All' as const, label: 'All' }, { value: 'Partial' as const, label: 'Partial' }]} />
          </div>
          <YesNo label="Is a follow-up observation needed?" value={form.followUpNeeded} onChange={v => set({ followUpNeeded: v })} />
          {report && <Field label="Report status"><Select aria-label="Report status" value={form.status} onValueChange={v => set({ status: v as ReportStatus })} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field>}
        </section>

        <section aria-labelledby="pto-actions" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div><h3 id="pto-actions" className="font-display text-section font-semibold text-ink">Action plan ({form.actionPlan.length})</h3><p className="font-sans text-caption text-ink-muted">Define corrective or improvement actions.</p></div>
            <Button size="sm" icon="plus" onClick={() => set({ actionPlan: [...form.actionPlan, { id: newId(), no: form.actionPlan.length + 1, action: '', byWhom: '', byWhen: '', status: 'Pending' }] })}>Add action</Button>
          </div>
          {form.actionPlan.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No actions defined yet.</p> : (
            <>
              <div><p className="mb-1 font-sans text-caption text-ink-muted">{progress.completed} of {progress.total} completed · {progress.inProgress} in progress · {progress.pending} pending</p><Progress value={progress.pct} label="Action plan progress" /></div>
              {form.actionPlan.map((a, i) => <ActionFields key={a.id} item={a} index={i} touched={touched} onChange={updateAction} onRemove={id => set({ actionPlan: form.actionPlan.filter(x => x.id !== id) })} />)}
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

function DetailDialog({ report, onClose, onEdit, onDelete, onStatusChange }: { report: PTOReport | null; onClose: () => void; onEdit: (r: PTOReport) => void; onDelete: (r: PTOReport) => void; onStatusChange: (id: string, s: ReportStatus) => void }) {
  const f = report ? normalise(report) : null;
  const progress = summarizeActions(f?.actionPlan);
  const reasons = f ? (Object.keys(f.reasons) as (keyof Reasons)[]).filter(k => f.reasons[k]).map(k => REASON_LABELS[k]) : [];
  const remedies = f ? (Object.keys(f.suggestedRemedies) as (keyof SuggestedRemedies)[]).filter(k => f.suggestedRemedies[k] === 'Yes').map(k => REMEDY_LABELS[k]) : [];
  return (
    <Dialog
      open={!!report}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Planned task observation report"
      description={report ? `${report.jobTaskObserved}, ${fmtDate(report.date)}` : undefined}
      size="lg"
      footer={report && (
        <>
          <Button variant="danger" icon="delete" onClick={() => onDelete(report)}>Delete</Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="edit" onClick={() => onEdit(report)}>Edit</Button>
        </>
      )}
    >
      {report && f && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2"><SectionBadge section={report.section} /><StatusBadge tone="neutral">{report.observationType}</StatusBadge><StatusTag status={report.status} />{hasRiskFlag(report.riskAssessment) && <RiskBadge />}</div>
            <div className="w-44"><Field label="Change status"><Select aria-label="Change status" value={report.status} onValueChange={v => onStatusChange(report.id, v as ReportStatus)} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field></div>
          </div>
          {progress.total > 0 && (
            <div><p className="mb-1 font-sans text-caption text-ink-muted">Action plan progress: {progress.completed} of {progress.total} completed · {progress.inProgress} in progress · {progress.pending} pending</p><Progress value={progress.pct} label="Action plan progress" /></div>
          )}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Observer">{report.observerName || 'Not specified'}</Fact>
            <Fact label="Worker">{report.workerName || 'Not specified'}</Fact>
            <Fact label="Occupation">{report.occupation || 'Not specified'}</Fact>
            <Fact label="Department or contractor">{report.deptSectionContractor || 'Not specified'}</Fact>
            <Fact label="SHEQ reference">{report.sheqRefNo || 'Not specified'}</Fact>
            <Fact label="Time on job">{f.timeOnJob.months || '0'} months, {f.timeOnJob.years || '0'} years</Fact>
            <Fact label="Told in advance"><YesNoBadge value={f.notification.toldInAdvance} /></Fact>
            <Fact label="Job or task observed">{report.jobTaskObserved}</Fact>
          </dl>
          {reasons.length > 0 && <div><h3 className="font-sans text-caption text-ink-muted">Reasons for observation</h3><p className="mt-1.5 flex flex-wrap gap-1.5">{reasons.map(r => <StatusBadge key={r} tone="neutral">{r}</StatusBadge>)}</p></div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section aria-labelledby="pto-d-proc" className="rounded-card border border-line p-3">
              <h3 id="pto-d-proc" className="mb-2 font-sans text-caption text-ink-muted">Procedures</h3>
              <dl className="flex flex-col gap-1.5"><div className="flex justify-between gap-2"><dt className="font-sans text-body-sm text-ink">Procedure available</dt><dd><YesNoBadge value={f.procedures.hasProcedure} /></dd></div><div className="flex justify-between gap-2"><dt className="font-sans text-body-sm text-ink">Employee familiar</dt><dd><YesNoBadge value={f.procedures.familiarWithProcedure} /></dd></div></dl>
            </section>
            <section aria-labelledby="pto-d-risk" className="rounded-card border border-line p-3">
              <h3 id="pto-d-risk" className="mb-2 font-sans text-caption text-ink-muted">Risk assessment</h3>
              <dl className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2"><dt className="font-sans text-body-sm text-ink">Assessment made</dt><dd><YesNoBadge value={report.riskAssessment?.made} /></dd></div>
                <div className="flex justify-between gap-2"><dt className="font-sans text-body-sm text-ink">Hazards identified</dt><dd><YesNoBadge value={report.riskAssessment?.identified} /></dd></div>
                <div className="flex justify-between gap-2"><dt className="font-sans text-body-sm text-ink">Controls effective</dt><dd><YesNoBadge value={report.riskAssessment?.effective} /></dd></div>
              </dl>
            </section>
          </div>
          {remedies.length > 0 && <div><h3 className="font-sans text-caption text-ink-muted">Suggested remedies</h3><p className="mt-1.5 flex flex-wrap gap-1.5">{remedies.map(r => <StatusBadge key={r} tone="info">{r}</StatusBadge>)}</p></div>}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Observation scope"><StatusBadge tone={report.observationScope === 'All' ? 'success' : 'warning'}>{report.observationScope}</StatusBadge></Fact>
            <Fact label="Follow-up needed"><StatusBadge tone={report.followUpNeeded === 'Yes' ? 'warning' : 'success'}>{report.followUpNeeded}</StatusBadge></Fact>
          </dl>
          {f.actionPlan.length > 0 && (
            <section aria-labelledby="pto-d-actions">
              <h3 id="pto-d-actions" className="mb-2 font-sans text-caption text-ink-muted">Action plan ({f.actionPlan.length})</h3>
              <ol className="flex flex-col gap-2">
                {f.actionPlan.map((a, i) => (
                  <li key={a.id} className="rounded-card border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-sans text-body font-medium text-ink">{i + 1}. {a.action}</p><ActionBadge status={a.status} /></div>
                    <p className="mt-1.5 font-sans text-caption text-ink-muted">By {a.byWhom} · due {fmtDate(a.byWhen)}{a.completedDate ? ` · completed ${fmtDate(a.completedDate)}` : ''}</p>
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
  { key: 'workerName', label: 'Worker', width: 18 },
  { key: 'jobTaskObserved', label: 'Task', width: 26 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'observationType', label: 'Observation Type', width: 16 },
  { key: 'status', label: 'Status', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'deptSectionContractor', label: 'Dept/Section/Contractor', width: 22 },
  { key: 'occupation', label: 'Occupation', width: 18 },
  { key: 'sheqRefNo', label: 'SHEQ Ref No.', width: 16 },
  { key: 'riskAssessment', label: 'High Risk', width: 10, format: (_v, row) => (hasRiskFlag(row.riskAssessment as RiskAssessment) ? 'Yes' : 'No') },
  {
    key: 'actionPlan', label: 'Actions', width: 14,
    format: (_v, row) => {
      const actions = (row.actionPlan as ActionPlanItem[]) ?? [];
      return `${actions.filter(a => a.status === 'Completed').length}/${actions.length} done`;
    },
  },
];

function PTOContent() {
  const confirm = useConfirm();
  const { reports, setReports, loading, loaded, error, errorStatus, refetch } = usePTOData();
  const [view, setView] = useViewPreference('pto', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [sectionF, setSectionF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [typeF, setTypeF] = useState(ALL);
  const [riskOnly, setRiskOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<PTOReport | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = useMemo(() => reports.find(r => r.id === viewingId) ?? null, [reports, viewingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (q && ![r.observerName, r.workerName, r.jobTaskObserved, r.occupation].some(s => s?.toLowerCase().includes(q)) && !r.actionPlan?.some(a => a.action?.toLowerCase().includes(q))) return false;
      return (sectionF === ALL || r.section === sectionF) && (statusF === ALL || r.status === statusF) && (typeF === ALL || r.observationType === typeF)
        && (!riskOnly || hasRiskFlag(r.riskAssessment)) && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo);
    });
  }, [reports, search, sectionF, statusF, typeF, riskOnly, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => (id === 'risk' ? (hasRiskFlag(r.riskAssessment) ? '1' : '0') : String(r[id as keyof PTOReport] ?? '').toLowerCase())), [filtered, sort]);
  const count = (s: ReportStatus) => reports.filter(r => r.status === s).length;
  const allActions = reports.flatMap(r => r.actionPlan || []);
  const highRisk = reports.filter(r => hasRiskFlag(r.riskAssessment)).length;

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || sectionF !== ALL || statusF !== ALL || typeF !== ALL || riskOnly || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setSectionF(ALL); setStatusF(ALL); setTypeF(ALL); setRiskOnly(false); setDateFrom(''); setDateTo(''); };
  const tile = (s: string) => ({ selected: statusF === s, onClick: () => setStatusF(statusF === s ? ALL : s) });

  const openEditor = (r?: PTOReport) => { setViewingId(null); setEditing(r); setDialogOpen(true); };
  const remove = async (r: PTOReport) => {
    if (!await confirm({ title: 'Delete this PTO report?', message: `${r.jobTaskObserved}, ${fmtDate(r.date)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deletePTOReport(r.id); setViewingId(null); toast.success('PTO report deleted.'); await refetch(); } catch (e) { toast.error((e as Error).message); }
  };
  const changeStatus = async (id: string, next: ReportStatus) => {
    const before = reports.find(r => r.id === id);
    if (!before) return;
    setReports(ps => ps.map(r => (r.id === id ? { ...r, status: next } : r)));
    try { await updatePTOReport(id, { status: next }); toast.success(`Status changed to ${STATUS_META[next].label.toLowerCase()}.`); }
    catch (e) { setReports(ps => ps.map(r => (r.id === id ? before : r))); toast.error(`Status was not changed: ${(e as Error).message}`); }
  };

  const COLUMNS: Column<PTOReport>[] = [
    { id: 'date', header: 'Date', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{fmtDate(r.date)}</span> },
    { id: 'observerName', header: 'Observer', sortable: true, hideBelow: 'lg', cell: r => r.observerName },
    { id: 'workerName', header: 'Worker', sortable: true, cell: r => r.workerName },
    { id: 'jobTaskObserved', header: 'Task', sortable: true, hideBelow: 'md', cell: r => <span className="line-clamp-2 max-w-[18rem]">{r.jobTaskObserved}</span> },
    { id: 'section', header: 'Section', sortable: true, hideBelow: 'md', cell: r => <SectionBadge section={r.section} /> },
    { id: 'status', header: 'Status', sortable: true, cell: r => <StatusTag status={r.status} /> },
    { id: 'risk', header: 'Risk', sortable: true, cell: r => (hasRiskFlag(r.riskAssessment) ? <RiskBadge /> : <span className="text-ink-muted">None flagged</span>) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Planned task observation' }]}
        title="Planned task observation"
        description="Complete PTO forms with risk assessment and action tracking."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh PTO reports" variant="outline" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('PTO_Reports')}
                title="Planned Task Observation"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_HEX[row.status as ReportStatus]?.replace('#', '')}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>New PTO</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Total" icon="task" value={reports.length} loading={pending} unavailable={unavailable} />
        <MetricTile label="Draft" icon="draft" value={count('draft')} loading={pending} unavailable={unavailable} {...tile('draft')} />
        <MetricTile label="Submitted" icon="submitted" value={count('submitted')} loading={pending} unavailable={unavailable} {...tile('submitted')} />
        <MetricTile label="Reviewed" icon="reviewed" value={count('reviewed')} loading={pending} unavailable={unavailable} {...tile('reviewed')} />
        <MetricTile label="Closed" icon="closed" tone="success" value={count('closed')} loading={pending} unavailable={unavailable} {...tile('closed')} />
      </MetricGrid>

      <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search observer, worker or task" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Select className="w-40" aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
        <Select className="w-40" aria-label="Filter by type" value={typeF} onValueChange={setTypeF} options={[{ value: ALL, label: 'All types' }, { value: 'Initial', label: 'Initial' }, { value: 'Follow up', label: 'Follow up' }]} />
        <Segmented label="Risk" value={riskOnly ? 'risk' : 'all'} onValueChange={v => setRiskOnly(v === 'risk')} options={[{ value: 'all', label: 'All' }, { value: 'risk', label: `High risk (${highRisk})` }]} />
        <Input type="date" aria-label="From date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" aria-label="To date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {hasFilters && <Button variant="ghost" icon="close" onClick={clearFilters}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status}
        subject="PTO reports"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No PTO reports match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="task" title="No PTO reports yet" description="Create the first planned task observation to start the register." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New PTO</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'report' : 'reports'}{filtered.length !== reports.length ? ` of ${reports.length}` : ''} · {allActions.filter(a => a.status === 'Completed').length} of {allActions.length} actions completed across all reports</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => {
              const p = summarizeActions(r.actionPlan);
              const o = overdueCount(r);
              return (
                <RecordCard
                  key={r.id}
                  eyebrow={fmtDate(r.date)}
                  title={r.jobTaskObserved}
                  status={<StatusTag status={r.status} />}
                  facts={[
                    { label: 'Section', value: <SectionBadge section={r.section} /> },
                    { label: 'Type', value: r.observationType },
                    { label: 'Observer', value: r.observerName || 'Not specified' },
                    { label: 'Worker', value: `${r.workerName || 'Not specified'}${r.occupation ? `, ${r.occupation}` : ''}` },
                    ...(hasRiskFlag(r.riskAssessment) ? [{ label: 'Risk', value: <RiskBadge /> }] : []),
                    ...(p.total ? [{ label: 'Actions', value: <><span className="tabular">{p.completed} of {p.total} completed{o ? `, ${o} overdue` : ''}</span><Progress value={p.pct} label={`${r.jobTaskObserved} action progress`} className="mt-1" /></> }] : []),
                  ]}
                  action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete PTO report ${r.jobTaskObserved}`} onClick={() => remove(r)} />}
                  onOpen={() => setViewingId(r.id)}
                  openLabel={`View PTO report ${r.jobTaskObserved}, ${fmtDate(r.date)}`}
                />
              );
            })}
          </div>
        ) : (
          <DataTable
            caption="PTO reports"
            rows={rows}
            columns={COLUMNS}
            getRowId={r => r.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={r => setViewingId(r.id)}
            rowActions={r => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit PTO report ${r.jobTaskObserved}`} onClick={() => openEditor(r)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Delete PTO report ${r.jobTaskObserved}`} onClick={() => remove(r)} />
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

export default function CompletePTOFormPage() {
  return <AppShell migrated><PTOContent /></AppShell>;
}
