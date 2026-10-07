// app/maintenance/RequestInboxView.tsx — work order requests. A manager sees all of them, allocates a foreman and reviews each one:
// approving needs the approver's signature and turns the request into a work order in one step; rejecting needs a reason the requester
// can read. A requester sees only their own requests, with the linked work order once there is one, and can withdraw one that is open.
'use client';

import { useState } from 'react';
import { Button, DataRegion, DataTable, EmptyState, Field, FormDialog, Input, Notice, Segmented, StatusBadge, Textarea, type Column, type DataStatus } from '@/components/ui-system';
import { RegisterField, type RegisterLoad, type RegisterRef } from '@/components/shared/RegisterField';
import { fmtDate } from '@/components/shared/utils';
import { personOption } from './AssignmentPicker';
import { PRIORITY, priorityMeta, statusMeta } from './meta';
import { SignOffField } from './SignOffField';
import type { WorkOrderPriority } from './types';
import type { FlowRequest, Person, RequestStatus } from './workflowTypes';

export interface ApproveInput { priority: WorkOrderPriority; dueDate: string; assignee: RegisterRef; foreman: RegisterRef; signature: string }
const TONE: Record<RequestStatus, 'warning' | 'success' | 'danger' | 'neutral'> = { open: 'warning', approved: 'success', rejected: 'danger', cancelled: 'neutral' };
const LABEL: Record<RequestStatus, string> = { open: 'Open', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };

export function RequestInboxView({ items, status, error, onRetry, scope, filter, onFilterChange, onNew, onApprove, onReject, onCancel, peopleOn, load = 'ready' }: {
  items: FlowRequest[]; status: DataStatus; error: string | null; onRetry: () => void; scope: 'all' | 'mine'; filter: RequestStatus | 'all'; onFilterChange: (f: RequestStatus | 'all') => void;
  onNew: () => void; onApprove: (r: FlowRequest, input: ApproveInput) => Promise<void>; onReject: (r: FlowRequest, reason: string) => Promise<void>; onCancel: (r: FlowRequest) => Promise<void>;
  peopleOn: (day: string) => Person[]; load?: RegisterLoad;
}) {
  const [review, setReview] = useState<FlowRequest | null>(null);
  const manager = scope === 'all';
  const columns: Column<FlowRequest>[] = [
    { id: 'n', header: 'Request', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.machine.text}</p><p className="text-caption text-ink-muted tabular">{`#${r.number} · ${r.department}${r.section ? `, ${r.section}` : ''} · ${r.requester}`}</p></div> },
    { id: 'd', header: 'Problem', hideBelow: 'md', cell: r => <span className="line-clamp-2">{r.description}</span> },
    { id: 'p', header: 'Priority', cell: r => <StatusBadge tone={priorityMeta(r.priority).tone}>{priorityMeta(r.priority).label}</StatusBadge> },
    { id: 'f', header: 'Foreman', hideBelow: 'md', cell: r => r.foreman.text || <span className="text-ink-muted">Not allocated</span> },
    { id: 's', header: 'Status', cell: r => <div className="flex flex-col items-start gap-1"><StatusBadge tone={TONE[r.status]}>{LABEL[r.status]}</StatusBadge>{r.work_order && <span className="text-caption text-ink-muted tabular">{r.work_order.number} · {statusMeta(r.work_order.status).label}</span>}{r.status === 'rejected' && r.decision_note && <span className="text-caption text-ink-muted">{r.decision_note}</span>}</div> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Request status" value={filter} onValueChange={v => onFilterChange(v as RequestStatus | 'all')} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'cancelled', label: 'Cancelled' }]} />
        <Button className="ml-auto" variant="primary" icon="plus" onClick={onNew}>Request work</Button>
      </div>
      <DataRegion
        status={status} subject={scope === 'mine' ? 'your requests' : 'requests'} error={error} onRetry={onRetry}
        empty={filter !== 'all'
          ? <EmptyState icon="search" title="No requests match" action={<Button onClick={() => onFilterChange('all')}>Show all</Button>} />
          : scope === 'mine'
            ? <EmptyState icon="documents" title="You have not sent any requests" description="Ask engineering for work on a machine and follow it here." action={<Button variant="primary" icon="plus" onClick={onNew}>Request maintenance work</Button>} />
            : <EmptyState icon="check" title="No open requests" description="Nothing is waiting for a decision." />}
      >
        <DataTable caption="Requests" rows={items} columns={columns} getRowId={r => String(r.id)} onRowActivate={r => setReview(r)}
          rowActions={r => (r.status === 'open' ? <Button size="sm" onClick={() => setReview(r)}>{manager ? 'Review' : 'Open'}</Button> : null)} />
      </DataRegion>
      {review && <ReviewDialog key={review.id} request={review} manager={manager} onClose={() => setReview(null)} onApprove={onApprove} onReject={onReject} onCancel={onCancel} peopleOn={peopleOn} load={load} />}
    </div>
  );
}

function ReviewDialog({ request: r, manager, onClose, onApprove, onReject, onCancel, peopleOn, load }: {
  request: FlowRequest; manager: boolean; onClose: () => void; onApprove: (r: FlowRequest, i: ApproveInput) => Promise<void>; onReject: (r: FlowRequest, reason: string) => Promise<void>; onCancel: (r: FlowRequest) => Promise<void>;
  peopleOn: (day: string) => Person[]; load: RegisterLoad;
}) {
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [priority, setPriority] = useState<WorkOrderPriority>(r.priority);
  const [dueDate, setDueDate] = useState(r.needed_by);
  const [assignee, setAssignee] = useState<RegisterRef>({ text: '', id: null });
  const [foreman, setForeman] = useState<RegisterRef>(r.foreman);
  const [signature, setSignature] = useState('');
  const [reason, setReason] = useState('');
  const options = peopleOn(dueDate || new Date().toISOString().slice(0, 10)).map(personOption);
  const open = r.status === 'open';
  const submit = async () => {
    if (!open || !manager) return false;
    if (mode === 'reject') { if (!reason.trim()) return false; await onReject(r, reason.trim()); return; }
    if (!signature) return false;
    await onApprove(r, { priority, dueDate, assignee, foreman, signature });
  };
  return (
    <FormDialog
      open onOpenChange={o => { if (!o) onClose(); }} size="lg" title={`${manager && open ? 'Review ' : ''}${r.number}`} description={`${r.machine.text} · requested by ${r.requester}, ${r.department} · ${r.created}`}
      submitLabel={mode === 'approve' ? 'Approve and raise work order' : 'Reject request'} onSubmit={submit}
      secondaryAction={open ? <Button variant="ghost" onClick={() => void onCancel(r).then(onClose)}>{manager ? 'Cancel request' : 'Withdraw request'}</Button> : undefined}
    >
      <div className="flex flex-col gap-4">
        <blockquote className="rounded-control bg-surface-subtle p-3 font-sans text-body text-ink">{r.description}</blockquote>
        {!open && <Notice tone={r.status === 'approved' ? 'info' : 'warning'} title={`This request is ${LABEL[r.status].toLowerCase()}`}>{r.decision_note ?? (r.work_order ? `Work order ${r.work_order.number} is ${statusMeta(r.work_order.status).label.toLowerCase()}.` : '')}</Notice>}
        {open && manager && (
          <>
            <Segmented label="Decision" value={mode} onValueChange={v => setMode(v as 'approve' | 'reject')} options={[{ value: 'approve', label: 'Approve' }, { value: 'reject', label: 'Reject' }]} />
            {mode === 'reject'
              ? <Field label="Reason for rejecting" required description="The requester can read this."><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
              : (
                <>
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                    <Field label="Priority"><Segmented label="Priority" value={priority} onValueChange={v => setPriority(v as WorkOrderPriority)} options={(Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }))} /></Field>
                    <Field label="Due date"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
                    <Field label="Assign to" optional description="Availability is checked for the due date."><RegisterField noun="person" value={assignee} onChange={setAssignee} options={options} load={load} /></Field>
                    <Field label="Foreman" optional><RegisterField noun="person" value={foreman} onChange={setForeman} options={options} load={load} /></Field>
                  </div>
                  <Field label="Approver signature" required description="Approving is signed, and the work order records who approved it and when."><SignOffField label="Approver signature" signerName={foreman.text} value={signature} onChange={setSignature} /></Field>
                </>
              )}
          </>
        )}
      </div>
    </FormDialog>
  );
}
