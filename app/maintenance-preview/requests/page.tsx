// app/maintenance-preview/requests/page.tsx — requests: waiting for approval first, approve with a signature, reject with a reason.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button, EmptyState, Field, FormDialog, Segmented, StatusBadge, Textarea, Input } from '@/components/ui-system';
import { MACHINES, PRIORITY_LABEL, type Priority, type Request } from '../fixtures';
import { ApprovalDialog } from '../ApprovalDialog';
import { PageFrame } from '../PageFrame';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

const TABS = [{ value: 'waiting', label: 'Waiting' }, { value: 'mine', label: 'Mine' }, { value: 'all', label: 'All' }] as const;
type Tab = (typeof TABS)[number]['value'];

export default function RequestsPage() {
  const { requests, reject, request } = usePreview();
  const [tab, setTab] = useState<Tab>('waiting');
  const [approving, setApproving] = useState<Request | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [machine, setMachine] = useState(''); const [title, setTitle] = useState(''); const [priority, setPriority] = useState<Priority>('medium');
  const rows = requests.filter(r => (tab === 'waiting' ? r.status === 'waiting' : tab === 'mine' ? r.by === 'You' || r.by === 'T. Dube' : true));
  const waiting = requests.filter(r => r.status === 'waiting').length;

  return (
    <PageFrame title="Requests" crumbs={[{ label: 'Requests' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New request</Button>}>
      <div role="group" aria-label="Show" className="flex gap-4">
        {TABS.map(t => <button key={t.value} type="button" aria-pressed={tab === t.value} onClick={() => setTab(t.value)} className="focus-ring border-b-2 border-transparent py-1 font-sans text-label text-ink-muted hover:text-ink aria-pressed:border-action aria-pressed:font-semibold aria-pressed:text-ink">{t.label}{t.value === 'waiting' && waiting > 0 ? ` (${waiting})` : ''}</button>)}
      </div>
      {rows.length === 0 ? <EmptyState icon="empty" title={tab === 'waiting' ? 'Nothing is waiting' : 'No requests'} description={tab === 'waiting' ? 'New requests appear here for approval.' : 'Raise one with New request.'} /> : (
        <ul>
          {rows.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line-subtle py-3 first:border-0">
              <div className="min-w-0">
                <p className="font-sans text-body font-medium text-ink [overflow-wrap:anywhere]">{r.machine}, {r.title}{(r.priority === 'high' || r.priority === 'urgent') && <span className="ml-2 text-caption font-semibold text-danger">{PRIORITY_LABEL[r.priority]}</span>}</p>
                <p className="font-sans text-caption text-ink-muted tabular">{r.number} · {r.by} · {r.when}</p>
                {r.status === 'rejected' && r.reason && <p className="font-sans text-body-sm text-ink-muted">Rejected: {r.reason}</p>}
              </div>
              {r.status === 'waiting' ? <div className="flex gap-2"><Button variant="primary" onClick={() => setApproving(r)}>Approve</Button><Button onClick={() => { setRejecting(r); setReason(''); }}>Reject</Button></div>
                : r.status === 'approved' ? <span className="font-sans text-body-sm text-ink-muted"><StatusBadge tone="success">Approved</StatusBadge> <Link className="focus-ring rounded-xs text-action hover:underline" href="/maintenance-preview/work-orders">{r.workOrder}</Link></span>
                : <StatusBadge tone="neutral">Rejected</StatusBadge>}
            </li>
          ))}
        </ul>
      )}
      <ApprovalDialog request={approving} onClose={() => setApproving(null)} />
      <FormDialog open={!!rejecting} onOpenChange={o => { if (!o) setRejecting(null); }} size="sm" title="Reject request" description={rejecting ? `${rejecting.machine}, ${rejecting.title}` : undefined} submitLabel="Reject"
        onSubmit={async () => { if (!reason.trim()) throw new Error('Say why, so the requester knows.'); if (rejecting) reject(rejecting.id, reason.trim()); toast.success('Request rejected.'); }}>
        <Field label="Reason" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this will not go ahead" /></Field>
      </FormDialog>
      <FormDialog open={creating} onOpenChange={setCreating} size="md" title="New request" description="Anyone can ask. A foreman approves it." submitLabel="Send request"
        onSubmit={async () => { if (!machine.trim() || !title.trim()) throw new Error('Choose the machine and say what is wrong.'); request({ machine: machine.trim(), title: title.trim(), priority }); toast.success('Request sent.'); setMachine(''); setTitle(''); }}>
        <div className="flex flex-col gap-4">
          <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
          <Field label="What is wrong" required><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Leaking gland, noise on start-up" /></Field>
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Priority</span><Segmented label="Priority" value={priority} onValueChange={setPriority} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} /></div>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
