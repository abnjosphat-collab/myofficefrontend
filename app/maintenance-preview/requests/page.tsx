// app/maintenance-preview/requests/page.tsx — requests as an inbox: the queue on the left, the decision on the right. A decided card
// collapses out of the waiting list.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, EmptyState, Field, FormDialog, Input, Segmented, Textarea } from '@/components/ui-system';
import { Avatar, InfoCard, Person, Reveal, StatusDot } from '../cards';
import { MACHINES, PRIORITY_LABEL, type Priority, type Request } from '../fixtures';
import { ApprovalDialog } from '../ApprovalDialog';
import { PageFrame } from '../PageFrame';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

const TABS = [{ value: 'waiting', label: 'Waiting' }, { value: 'decided', label: 'Decided' }, { value: 'all', label: 'All' }] as const;
type Tab = (typeof TABS)[number]['value'];
const hot = (p: Priority) => p === 'high' || p === 'urgent';

const Step = ({ done, label, detail }: { done: boolean; label: string; detail?: string }) => (
  <li className="flex items-start gap-3"><span aria-hidden className={`mt-1 size-2.5 shrink-0 rounded-full border ${done ? 'border-action bg-action' : 'border-line-strong bg-surface'}`} /><span className="font-sans text-body-sm text-ink"><span className={done ? 'font-medium' : 'text-ink-muted'}>{label}</span>{detail && <span className="ml-2 text-ink-muted">{detail}</span>}</span></li>
);

export default function RequestsPage() {
  const { requests, reject, request } = usePreview();
  const [tab, setTab] = useState<Tab>('waiting');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [approving, setApproving] = useState<Request | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [machine, setMachine] = useState(''); const [title, setTitle] = useState(''); const [priority, setPriority] = useState<Priority>('medium');
  // A request just decided stays in the Waiting list for one animation (it collapses out), then leaves.
  const [leaving, setLeaving] = useState<number[]>([]);
  const decided = (id: number) => { setLeaving(l => [...l, id]); setTimeout(() => setLeaving(l => l.filter(x => x !== id)), 280); };
  const rows = requests.filter(r => (tab === 'waiting' ? r.status === 'waiting' || leaving.includes(r.id) : tab === 'decided' ? r.status !== 'waiting' : true));
  const waiting = requests.filter(r => r.status === 'waiting').length;
  const selected = requests.find(r => r.id === selectedId) ?? null;
  // Keep a sensible selection: the first card in view, or nothing when the list is empty.
  useEffect(() => { if (!rows.some(r => r.id === selectedId)) setSelectedId(rows[0]?.id ?? null); }, [rows, selectedId]);

  const Detail = selected && (
    <div className="mp-rise flex flex-col gap-5" key={selected.id}>
      <div>
        <StatusDot tone={hot(selected.priority) ? 'warning' : 'neutral'}>{PRIORITY_LABEL[selected.priority]} priority</StatusDot>
        <h2 className="mt-2 font-display text-page text-ink">{selected.machine}</h2>
        <p className="font-sans text-body text-ink-muted">{selected.title}</p>
      </div>
      <dl className="flex flex-col gap-3">
        <div className="flex items-center gap-3"><Avatar name={selected.by} /><div><dt className="sr-only">Requested by</dt><dd className="font-sans text-body text-ink">{selected.by}</dd><p className="font-sans text-caption text-ink-muted">{selected.when}</p></div></div>
        {selected.details && <div className="rounded-card bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">Details</dt><dd className="font-sans text-body text-ink">{selected.details}</dd></div>}
      </dl>
      <ol className="flex flex-col gap-2.5" aria-label="Progress">
        <Step done label="Requested" detail={selected.when} />
        <Step done={selected.status !== 'waiting'} label={selected.status === 'rejected' ? 'Rejected' : 'Approved'} detail={selected.status === 'rejected' ? selected.reason : undefined} />
        <Step done={!!selected.workOrder} label="Work order" detail={selected.workOrder} />
      </ol>
      {selected.status === 'waiting' ? <div className="flex gap-2"><Button variant="primary" icon="check" onClick={() => setApproving(selected)}>Approve</Button><Button onClick={() => { setRejecting(selected); setReason(''); }}>Reject</Button></div>
        : selected.workOrder ? <Link className="focus-ring w-fit rounded-xs font-sans text-body-sm text-action hover:underline" href="/maintenance-preview/work-orders">Open {selected.workOrder}</Link> : null}
    </div>
  );

  return (
    <PageFrame title="Requests" crumbs={[{ label: 'Requests' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New request</Button>}>
      <Segmented label="Show" value={tab} onValueChange={setTab} options={TABS.map(t => ({ value: t.value, label: t.value === 'waiting' && waiting ? `Waiting ${waiting}` : t.label }))} className="self-start" />
      {rows.length === 0 ? <EmptyState icon="empty" title={tab === 'waiting' ? 'Nothing is waiting' : 'No requests'} description={tab === 'waiting' ? 'New requests appear here for approval.' : 'Raise one with New request.'} /> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <ul aria-label="Requests" className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <li key={r.id}><Reveal index={i}>
                <InfoCard priority={r.priority} selected={r.id === selectedId} leaving={leaving.includes(r.id)} eyebrow={<StatusDot tone={r.status === 'waiting' ? (hot(r.priority) ? 'warning' : 'neutral') : r.status === 'approved' ? 'success' : 'neutral'}>{r.status === 'waiting' ? `${PRIORITY_LABEL[r.priority]} priority` : r.status === 'approved' ? 'Approved' : 'Rejected'}</StatusDot>} aside={r.number} title={r.machine} subtitle={r.title} openLabel={`Open request ${r.number}`}
                  onOpen={() => { setSelectedId(r.id); if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) setSheet(true); }}
                  facts={<><Person name={r.by} size="sm" /><span className="font-sans text-body-sm text-ink-muted">{r.when.split(',')[0]}</span></>} />
              </Reveal></li>
            ))}
          </ul>
          <div className="mp-card hidden rounded-panel border border-line-subtle bg-surface p-6 lg:block">{Detail ?? <p className="font-sans text-body-sm text-ink-muted">Choose a request.</p>}</div>
        </div>
      )}
      {sheet && selected && <div role="dialog" aria-label="Request" className="fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] overflow-auto rounded-t-panel border border-line-subtle bg-surface p-5 shadow-dialog lg:hidden"><div className="mb-3 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setSheet(false)}>Close</Button></div>{Detail}</div>}
      <ApprovalDialog request={approving} onClose={() => setApproving(null)} onDecided={decided} />
      <FormDialog open={!!rejecting} onOpenChange={o => { if (!o) setRejecting(null); }} size="sm" title="Reject request" description={rejecting ? `${rejecting.machine}, ${rejecting.title}` : undefined} submitLabel="Reject"
        onSubmit={async () => { if (!reason.trim()) throw new Error('Say why, so the requester knows.'); if (rejecting) { reject(rejecting.id, reason.trim()); decided(rejecting.id); } toast.success('Request rejected.'); }}>
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
