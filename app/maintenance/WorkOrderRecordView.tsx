// app/maintenance/WorkOrderRecordView.tsx — one work order as a record: a header with status and the actions its status allows, a banner
// for anything the person must know (changed by someone else, assignee now on leave, waiting for sign-off), and tabs for Basic info,
// Feedback, Assignments, Permits, Comments and the Audit trail. The actions are exactly the server's `allowed_transitions`; the view keeps
// no copy of the rules. A refused action or save is shown in place and nothing typed is lost.
'use client';

import { useState } from 'react';
import {
  Button, DataTable, Dialog, EmptyState, Field, FormDialog, Input, MoreMenu, Notice, Progress, Segmented, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Checkbox,
  type Column,
} from '@/components/ui-system';
import { RegisterField, type RegisterLoad, type RegisterOption } from '@/components/shared/RegisterField';
import { fmtDate } from '@/components/shared/utils';
import { CLASSIFICATIONS, FAILURE_MODES, PRIORITY, classificationLabel, priorityMeta, statusMeta } from './meta';
import { SignOffField } from './SignOffField';
import type { WOClassification, WorkOrderPriority, WorkOrderStatus } from './types';
import type { FlowAssignment, FlowOrder, PermitKey } from './workflowTypes';

export type Role = 'manager' | 'user';
export interface TransitionInput { to: WorkOrderStatus; reason?: string; signature?: string }

const PERMITS: { key: PermitKey; label: string }[] = [
  { key: 'permit_to_work', label: 'Permit to work' }, { key: 'hot_work', label: 'Hot work' }, { key: 'hazardous_work', label: 'Hazardous work' }, { key: 'confined_space', label: 'Confined space' },
  { key: 'high_voltage_switching', label: 'High-voltage switching' }, { key: 'land_disturbance', label: 'Land disturbance and vegetation clearance' }, { key: 'other', label: 'Other' },
];
const NEEDS_REASON: WorkOrderStatus[] = ['on-hold', 'postponed', 'cancelled', 'not-done'];
/** The button label for a move, by where it starts: the same target reads differently as "Start", "Resume" or "Reopen". */
const actionLabel = (from: WorkOrderStatus, to: WorkOrderStatus): string => {
  if (to === 'in-progress') return from === 'pending' ? 'Start' : from === 'on-hold' ? 'Resume' : 'Reopen';
  if (to === 'completed') return 'Complete';
  if (to === 'pending') return 'Reinstate';
  return statusMeta(to).label === 'On hold' ? 'Put on hold' : to === 'not-done' ? 'Mark not done' : to === 'postponed' ? 'Postpone' : 'Cancel work order';
};

export function WorkOrderRecordView({ order, role, onBack, onTransition, onSave, onSignoff, onAssign, onRemoveAssignment, onComment, conflict, onReloadConflict, machines, people, sections }: {
  order: FlowOrder; role: Role; onBack: () => void;
  onTransition: (input: TransitionInput) => Promise<void>; onSave: (patch: Partial<FlowOrder>) => Promise<void>; onSignoff: (signature: string) => Promise<void>;
  onAssign: () => void; onRemoveAssignment: (a: FlowAssignment) => Promise<void>; onComment: (body: string) => Promise<void>;
  /** Set when a save found someone else's newer version: who and when. The typed values stay in the form. */
  conflict: { who: string; at: string } | null; onReloadConflict: () => void;
  machines: RegisterOption[]; people: RegisterOption[]; sections: RegisterOption[];
}) {
  const [tab, setTab] = useState('basic');
  const [acting, setActing] = useState<WorkOrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [sig, setSig] = useState('');
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffSig, setSignoffSig] = useState('');
  const status = statusMeta(order.status);
  const manager = role === 'manager';
  const source = order.source.kind === 'request' ? `From request ${order.source.ref}` : order.source.kind === 'schedule' ? `From schedule ${order.source.ref}` : order.source.kind === 'breakdown' ? `Breakdown ${order.source.ref}` : 'Raised directly';

  const run = async () => {
    if (!acting) return false;
    if (NEEDS_REASON.includes(acting) && !reason.trim()) return false;
    if (acting === 'completed' && !sig) return false;
    await onTransition({ to: acting, reason: reason.trim() || undefined, signature: sig || undefined });
    setActing(null); setReason(''); setSig('');
  };
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** A move that needs nothing from the person (start, resume, reinstate) runs at once; one that needs a reason or a signature opens its dialog. */
  const begin = async (to: WorkOrderStatus) => {
    setActionError(null);
    const needsInput = NEEDS_REASON.includes(to) || to === 'completed' || (to === 'in-progress' && order.status === 'completed');
    if (needsInput) { setReason(''); setSig(''); setActing(to); return; }
    setBusy(true);
    try { await onTransition({ to }); } catch (e) { setActionError(e instanceof Error ? e.message : 'The change was not made.'); } finally { setBusy(false); }
  };
  const direct: WorkOrderStatus[] = order.allowed_transitions.filter(t => t === 'in-progress' || t === 'completed');
  const more = order.allowed_transitions.filter(t => !direct.includes(t));

  return (
    <Dialog
      open onOpenChange={o => { if (!o) onBack(); }} size="xl" title={order.machine.text}
      description={[`#${order.number}`, order.section.text, source, order.due_date ? `Due ${fmtDate(order.due_date)}` : ''].filter(Boolean).join(' · ')}
      footer={<Button onClick={onBack}>Close</Button>}
    >
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <StatusBadge tone={priorityMeta(order.priority).tone}>{priorityMeta(order.priority).label}</StatusBadge>
        {classificationLabel(order) && <StatusBadge tone="info">{classificationLabel(order)}</StatusBadge>}
        <div className="w-24"><Progress value={order.progress} label={`Progress on ${order.machine.text}`} /></div>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {direct.map(t => <Button key={t} variant="primary" pending={busy} onClick={() => void begin(t)}>{actionLabel(order.status, t)}</Button>)}
          {manager && order.awaiting_signoff && <Button variant="primary" icon="check" onClick={() => { setSignoffSig(''); setSignoffOpen(true); }}>Sign off</Button>}
          <MoreMenu items={[...more.map(t => ({ label: actionLabel(order.status, t), onSelect: () => void begin(t) })), { label: 'Print', icon: 'print' as const, onSelect: () => window.print() }]} />
        </span>
      </div>

      {actionError && <Notice tone="danger" icon="warning" title="The change was not made">{actionError}</Notice>}
      {conflict && (
        <Notice tone="warning" icon="warning" title="Changed by someone else" action={<Button size="sm" onClick={onReloadConflict}>Show their version</Button>}>
          {conflict.who} saved this work order at {conflict.at}. Your changes are still in the form; review before saving again.
        </Notice>
      )}
      {order.assignee_now_on_leave && <Notice tone="warning" icon="calendar" title="The assigned person is now on leave">{order.assignee.text} has approved leave on the planned day. Assign someone else.</Notice>}
      {order.awaiting_signoff && !manager && <Notice tone="info" icon="check" title="Completed, awaiting foreman sign-off">A foreman has to sign it off.</Notice>}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Work order sections">
          <TabsTrigger value="basic" icon="documents">Basic info</TabsTrigger>
          <TabsTrigger value="feedback" icon="wrench">Feedback</TabsTrigger>
          <TabsTrigger value="assign" icon="user">Assignments{order.assignments.length ? ` (${order.assignments.length})` : ''}</TabsTrigger>
          <TabsTrigger value="permits" icon="shield">Permits</TabsTrigger>
          <TabsTrigger value="comments" icon="chat">Comments{order.comments.length ? ` (${order.comments.length})` : ''}</TabsTrigger>
          <TabsTrigger value="audit" icon="history">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="mt-4"><BasicTab key={`${order.id}-${order.version}`} order={order} manager={manager} onSave={onSave} machines={machines} people={people} sections={sections} /></TabsContent>
        <TabsContent value="feedback" className="mt-4"><FeedbackTab key={`f-${order.id}-${order.version}`} order={order} onSave={onSave} /></TabsContent>
        <TabsContent value="assign" className="mt-4"><AssignmentsTab order={order} manager={manager} onAssign={onAssign} onRemove={onRemoveAssignment} /></TabsContent>
        <TabsContent value="permits" className="mt-4"><PermitsTab key={`p-${order.id}-${order.version}`} order={order} onSave={onSave} /></TabsContent>
        <TabsContent value="comments" className="mt-4"><CommentsTab order={order} onComment={onComment} /></TabsContent>
        <TabsContent value="audit" className="mt-4">
          {order.events.length === 0
            ? <EmptyState icon="history" title="Created before the audit trail began" description="Changes from now on are recorded here." />
            : <DataTable caption="Audit trail" rows={order.events} getRowId={e => String(e.id)} columns={[
              { id: 'at', header: 'When', cell: e => <span className="tabular">{e.at}</span> }, { id: 'who', header: 'Who', cell: e => e.who },
              { id: 'what', header: 'What', cell: e => <span>{e.what}{e.signed && <StatusBadge tone="success" icon="check">Signed</StatusBadge>}</span> },
            ] as Column<FlowOrder['events'][number]>[]} />}
        </TabsContent>
      </Tabs>

      <FormDialog open={acting !== null} onOpenChange={o => { if (!o) setActing(null); }} size="md" title={acting ? actionLabel(order.status, acting) : ''} description={`${order.number}, ${order.machine.text}`} submitLabel={acting ? actionLabel(order.status, acting) : 'Save'} onSubmit={run}>
        <div className="flex flex-col gap-4">
          {acting && NEEDS_REASON.includes(acting) && <Field label="Reason" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why?" /></Field>}
          {acting === 'in-progress' && order.status === 'completed' && <Field label="Reason for reopening" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
          {acting === 'completed' && <Field label="Artisan signature" required description="The job is signed as complete by the person who did it."><SignOffField label="Artisan signature" signerName={order.assignee.text} value={sig} onChange={setSig} /></Field>}
          {acting === 'pending' && <Field label="Reason" optional><Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
        </div>
      </FormDialog>
      <FormDialog open={signoffOpen} onOpenChange={setSignoffOpen} size="md" title="Foreman sign-off" description={`${order.number}, ${order.machine.text}`} submitLabel="Sign off" onSubmit={async () => { if (!signoffSig) return false; await onSignoff(signoffSig); }}>
        <Field label="Foreman signature" required><SignOffField label="Foreman signature" signerName={order.foreman.text} value={signoffSig} onChange={setSignoffSig} /></Field>
      </FormDialog>
    </div>
    </Dialog>
  );
}

function BasicTab({ order, manager, onSave, machines, people, sections }: { order: FlowOrder; manager: boolean; onSave: (p: Partial<FlowOrder>) => Promise<void>; machines: RegisterOption[]; people: RegisterOption[]; sections: RegisterOption[] }) {
  const [f, setF] = useState({ machine: order.machine, section: order.section, foreman: order.foreman, classification: order.classification, priority: order.priority, scheduled_date: order.scheduled_date, due_date: order.due_date, est_hours: String(order.est_hours), description: order.description });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (p: Partial<typeof f>) => setF(prev => ({ ...prev, ...p }));
  const save = async () => {
    setPending(true); setError(null);
    try { await onSave({ machine: f.machine, section: f.section, foreman: f.foreman, classification: f.classification, priority: f.priority, scheduled_date: f.scheduled_date, due_date: f.due_date, est_hours: Number(f.est_hours) || 0, description: f.description }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Not saved.'); } finally { setPending(false); }
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Machine" required><RegisterField noun="machine" value={f.machine} onChange={v => set({ machine: v })} options={machines} disabled={!manager} /></Field>
        <Field label="Section"><RegisterField noun="section" value={f.section} onChange={v => set({ section: v })} options={sections} disabled={!manager} /></Field>
        <Field label="Type"><Segmented label="Type" value={f.classification} onValueChange={v => set({ classification: v as WOClassification })} options={CLASSIFICATIONS.map(c => ({ value: c.value as string, label: c.value === 'planned_maintenance' ? 'Preventive' : c.label }))} /></Field>
        <Field label="Priority"><Segmented label="Priority" value={f.priority} onValueChange={v => set({ priority: v as WorkOrderPriority })} options={(Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }))} /></Field>
        <Field label="Scheduled for"><Input type="date" value={f.scheduled_date} onChange={e => set({ scheduled_date: e.target.value })} disabled={!manager} /></Field>
        <Field label="Due date"><Input type="date" min={f.scheduled_date} value={f.due_date} onChange={e => set({ due_date: e.target.value })} disabled={!manager} /></Field>
        <Field label="Estimated hours"><Input type="number" min={0.5} step={0.5} value={f.est_hours} onChange={e => set({ est_hours: e.target.value })} disabled={!manager} /></Field>
        <Field label="Foreman"><RegisterField noun="person" value={f.foreman} onChange={v => set({ foreman: v })} options={people} disabled={!manager} /></Field>
      </div>
      <Field label="What to do" required><Textarea rows={3} value={f.description} onChange={e => set({ description: e.target.value })} /></Field>
      {error && <Notice tone="danger" title="Not saved">{error}</Notice>}
      <div className="sticky bottom-0 z-10 flex justify-end border-t border-line-subtle bg-surface py-3"><Button variant="primary" icon="check" pending={pending} onClick={save}>Save changes</Button></div>
    </div>
  );
}

function FeedbackTab({ order, onSave }: { order: FlowOrder; onSave: (p: Partial<FlowOrder>) => Promise<void> }) {
  const [start, setStart] = useState('07:30'); const [finish, setFinish] = useState('11:10'); const [done, setDone] = useState(''); const [mode, setMode] = useState(''); const [fb, setFb] = useState('');
  const hours = (() => { const [a, b] = [start, finish].map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }); return b > a ? ((b - a) / 60).toFixed(1) : ''; })();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Start time"><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></Field>
        <Field label="Finish time"><Input type="time" value={finish} onChange={e => setFinish(e.target.value)} /></Field>
        <Field label="Repair hours" description="Worked out from the times; can be overridden."><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular" aria-live="polite">{hours ? `${hours} h` : 'Not set'}</p></Field>
      </div>
      <Field label="Work done"><Textarea rows={3} value={done} onChange={e => setDone(e.target.value)} /></Field>
      <Field label="Cause of failure" description="From the failure modes list."><select className="h-9 w-full rounded-control border border-line-control bg-surface px-3 font-sans text-body text-ink" value={mode} onChange={e => setMode(e.target.value)} aria-label="Cause of failure"><option value="">Not set</option>{FAILURE_MODES.map(m => <option key={m}>{m}</option>)}</select></Field>
      <Field label="Requester feedback" description={order.status === 'completed' ? 'Visible to the requester after completion.' : 'Can be added once the work order is completed.'}><Textarea rows={2} value={fb} onChange={e => setFb(e.target.value)} disabled={order.status !== 'completed'} /></Field>
      <div className="flex justify-end"><Button variant="primary" icon="check" onClick={() => onSave({ progress: order.progress })}>Save report</Button></div>
    </div>
  );
}

function AssignmentsTab({ order, manager, onAssign, onRemove }: { order: FlowOrder; manager: boolean; onAssign: () => void; onRemove: (a: FlowAssignment) => Promise<void> }) {
  return (
    <div className="flex flex-col gap-3">
      {manager && <div><Button icon="plus" onClick={onAssign}>Assign someone</Button></div>}
      {order.assignments.length === 0
        ? <EmptyState icon="user" title="Nobody assigned yet" description={order.needs_assignment ? 'This job was raised by a schedule and still needs a person.' : undefined} action={manager ? <Button variant="primary" icon="plus" onClick={onAssign}>Assign someone</Button> : undefined} />
        : <DataTable caption="Assignments" rows={order.assignments} getRowId={a => String(a.id)} columns={[
          { id: 'p', header: 'Person', cell: a => <span>{a.person.text}{a.person.id === null && <span className="block text-caption text-ink-muted">Free text, not on the register</span>}</span> },
          { id: 'r', header: 'Role', cell: a => (a.role === 'lead' ? 'Lead' : 'Assistant') }, { id: 'd', header: 'Day', cell: a => <span className="tabular">{fmtDate(a.day)}</span> },
          { id: 'h', header: 'Hours', numeric: true, cell: a => (a.hours ?? '') }, { id: 's', header: 'Status', cell: a => <StatusBadge tone={a.status === 'published' ? 'success' : 'neutral'}>{a.status === 'published' ? 'Published' : 'Planned'}</StatusBadge> },
        ] as Column<FlowAssignment>[]} rowActions={manager ? (a => <Button size="sm" variant="ghost" icon="delete" onClick={() => void onRemove(a)}>Remove</Button>) : undefined} />}
    </div>
  );
}

function PermitsTab({ order, onSave }: { order: FlowOrder; onSave: (p: Partial<FlowOrder>) => Promise<void> }) {
  const [p, setP] = useState(order.permits);
  const missing = PERMITS.filter(x => p[x.key].required && !p[x.key].reference.trim());
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {PERMITS.map(x => (
          <li key={x.key} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,18rem)_1fr]">
            <Checkbox checked={p[x.key].required} onChange={e => setP(prev => ({ ...prev, [x.key]: { ...prev[x.key], required: e.target.checked } }))} label={x.label} />
            {p[x.key].required && (
              <Field label="Reference" error={!p[x.key].reference.trim() ? 'Reference needed before the job can start.' : undefined}>
                <Input value={p[x.key].reference} onChange={e => setP(prev => ({ ...prev, [x.key]: { ...prev[x.key], reference: e.target.value } }))} />
              </Field>
            )}
          </li>
        ))}
      </ul>
      {missing.length > 0 && <Notice tone="warning" icon="lock" title="The job cannot start yet">Missing a reference for: {missing.map(m => m.label.toLowerCase()).join(', ')}.</Notice>}
      <div className="flex justify-end"><Button variant="primary" icon="check" onClick={() => onSave({ permits: p })}>Save permits</Button></div>
    </div>
  );
}

function CommentsTab({ order, onComment }: { order: FlowOrder; onComment: (b: string) => Promise<void> }) {
  const [body, setBody] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const send = async () => { if (!body.trim()) return; setPending(true); setError(null); try { await onComment(body.trim()); setBody(''); } catch (e) { setError(e instanceof Error ? e.message : 'Not sent.'); } finally { setPending(false); } };
  return (
    <div className="flex flex-col gap-4">
      {order.comments.length === 0
        ? <EmptyState icon="chat" title="No comments yet" />
        : <ul className="flex flex-col gap-3" aria-label="Comments">{order.comments.map(c => <li key={c.id} className="rounded-control bg-surface-subtle p-3"><p className="text-caption text-ink-muted tabular">{c.who} · {c.at}</p><p className="font-sans text-body text-ink">{c.body}</p></li>)}</ul>}
      <Field label="Add a comment"><Textarea rows={2} value={body} onChange={e => setBody(e.target.value)} /></Field>
      {error && <Notice tone="danger" title="Not sent">{error}</Notice>}
      <div className="flex justify-end"><Button variant="primary" icon="chat" pending={pending} disabled={!body.trim()} onClick={send}>Send</Button></div>
    </div>
  );
}
