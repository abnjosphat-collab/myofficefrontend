// app/maintenance-preview/WorkOrderRecord.tsx — one work order: five facts, then tabs. Used in the pop-up from the list and on the full page.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Dialog, EmptyState, MoreMenu, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui-system';
import { SignOffField } from '@/app/maintenance/SignOffField';
import { Person, WorkStatus } from './cards';
import { PEOPLE, PRIORITY_LABEL, TOOLS, fmt, fmtLong, isOverdue, STATUS_LABEL, type WorkOrder } from './fixtures';
import { RegisterField, personItems } from './RegisterField';
import { usePreview } from './store';

const NEXT: Partial<Record<WorkOrder['status'], { label: string; to: WorkOrder['status'] }>> = {
  pending: { label: 'Start', to: 'in-progress' }, 'in-progress': { label: 'Complete', to: 'awaiting-signoff' }, 'on-hold': { label: 'Resume', to: 'in-progress' },
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-line-subtle py-2.5 font-sans text-body last:border-0"><dt className="text-ink-muted">{label}</dt><dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{children || <span className="text-ink-muted">Not recorded</span>}</dd></div>
);

export function WorkOrderRecord({ order, compact }: { order: WorkOrder; compact?: boolean }) {
  const { update } = usePreview();
  const [signing, setSigning] = useState(false);
  const [signature, setSignature] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [person, setPerson] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ who: string; text: string }[]>([]);
  const next = NEXT[order.status];
  const overdue = isOverdue(order);
  const chosen = PEOPLE.find(p => p.name.toLowerCase() === person.trim().toLowerCase());

  const add = () => {
    if (chosen?.leave) { toast.error(`${chosen.name} is on leave (${fmt(chosen.leave.from)} to ${fmt(chosen.leave.to)}).`); return; }
    if (person.trim()) update(order.id, { assignees: [...order.assignees.filter(a => a !== person.trim()), person.trim()] });
    setPerson(''); setAssigning(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-body-sm text-ink-muted">
          <WorkStatus status={order.status} overdue={overdue} />
          <span>{PRIORITY_LABEL[order.priority]} priority · {order.type}</span>
        </p>
        <div className="flex items-center gap-2">
          {order.status === 'awaiting-signoff' && <Button variant="primary" icon="check" onClick={() => setSigning(true)}>Sign off</Button>}
          {next && <Button variant="primary" onClick={() => { update(order.id, { status: next.to }); toast.success(`${order.number}: ${STATUS_LABEL[next.to].toLowerCase()}.`); }}>{next.label}</Button>}
          <MoreMenu label="" items={[{ label: 'Put on hold', onSelect: () => update(order.id, { status: 'on-hold' }), disabled: order.status === 'completed' || order.status === 'on-hold' }, { label: 'Print', onSelect: () => toast.message('Printing is not part of the preview.') }]} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Assigned', order.assignees.length ? <Person key="a" name={order.assignees.join(', ')} size="sm" /> : 'Unassigned'], ['Due', <span key="d" className={overdue ? 'font-semibold text-danger' : undefined}>{fmtLong(order.due)}{overdue ? ', overdue' : ''}</span>], ['Section', order.section || 'Not set'], ['Raised', `${fmt(order.raised)} by ${order.raisedBy}`]].map(([k, v], i) => (
          <div key={String(k)} className="mp-rise flex flex-col gap-1 rounded-card bg-surface-subtle p-3" style={{ ['--mp-i' as string]: i }}><dt className="font-sans text-caption text-ink-muted">{k}</dt><dd className="font-sans text-body text-ink [overflow-wrap:anywhere]">{v}</dd></div>
        ))}
      </dl>
      {(order.source) && <p className="font-sans text-body-sm text-ink-muted">From <span className="text-ink">{order.source}</span>{compact && <> · <Link className="focus-ring rounded-xs text-action underline-offset-2 hover:underline" href={`/maintenance-preview/work-orders/${order.id}`}>Open as a page</Link></>}</p>}

      <Tabs defaultValue="details">
        <TabsList aria-label="Work order sections">
          <TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="assignments">Assignments</TabsTrigger><TabsTrigger value="tools">Tools and parts</TabsTrigger><TabsTrigger value="comments">Comments</TabsTrigger><TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-3"><dl><Row label="Machine">{order.machine}</Row><Row label="Job">{order.title}</Row><Row label="Description">{order.description}</Row><Row label="Type">{order.type}</Row></dl></TabsContent>
        <TabsContent value="assignments" className="mt-3 flex flex-col gap-3">
          {order.assignees.length ? <ul className="flex flex-col">{order.assignees.map(a => <li key={a} className="flex items-center justify-between border-b border-line-subtle py-2.5 font-sans text-body last:border-0">{a}<Button variant="ghost" size="sm" onClick={() => update(order.id, { assignees: order.assignees.filter(x => x !== a) })}>Remove</Button></li>)}</ul> : <EmptyState icon="user" title="Nobody assigned" description="Pick someone from the employee register. People on leave are shown but cannot be chosen." />}
          {assigning ? (
            <div className="flex flex-col gap-2"><RegisterField label="Assign to" register="employees" items={personItems(PEOPLE, fmt)} value={person} onChange={setPerson} placeholder="Type to search people" /><div className="flex gap-2"><Button variant="primary" onClick={add}>Assign</Button><Button variant="ghost" onClick={() => { setAssigning(false); setPerson(''); }}>Cancel</Button></div></div>
          ) : <div><Button icon="plus" onClick={() => setAssigning(true)}>Assign someone</Button></div>}
        </TabsContent>
        <TabsContent value="tools" className="mt-3">
          {order.tools.length ? <ul>{order.tools.map(t => { const tool = TOOLS.find(x => x.name === t); return <li key={t} className="flex items-baseline justify-between gap-3 border-b border-line-subtle py-2.5 font-sans text-body last:border-0"><span>{t}{tool && <span className="ml-2 text-caption text-ink-muted">{tool.code}</span>}</span>{tool && tool.state !== 'available' && <span className="text-caption text-warning">{tool.detail}</span>}</li>; })}</ul> : <EmptyState icon="wrench" title="No tools or parts listed" description="Add the tools from the Tools register and the parts from Spares when raising or editing the job." />}
        </TabsContent>
        <TabsContent value="comments" className="mt-3 flex flex-col gap-3">
          {comments.length ? <ul>{comments.map((c, i) => <li key={i} className="border-b border-line-subtle py-2.5 font-sans last:border-0"><p className="text-caption text-ink-muted">{c.who}, just now</p><p className="text-body text-ink">{c.text}</p></li>)}</ul> : <p className="font-sans text-body-sm text-ink-muted">No comments yet.</p>}
          <Textarea rows={2} aria-label="Add a comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment" />
          <div className="flex justify-end"><Button disabled={!comment.trim()} onClick={() => { setComments(c => [...c, { who: 'You', text: comment.trim() }]); setComment(''); }}>Add comment</Button></div>
        </TabsContent>
        <TabsContent value="history" className="mt-3"><ul><li className="border-b border-line-subtle py-2.5 font-sans text-body">Raised by {order.raisedBy}<span className="ml-2 text-caption text-ink-muted">{fmt(order.raised)}</span></li></ul></TabsContent>
      </Tabs>

      <Dialog open={signing} onOpenChange={setSigning} size="sm" title="Sign off" description={`${order.machine}, ${order.title}`}
        footer={<><Button onClick={() => setSigning(false)}>Cancel</Button><Button variant="primary" disabled={!signature} onClick={() => { update(order.id, { status: 'completed' }); setSigning(false); setSignature(''); toast.success(`${order.number} signed off.`); }}>Sign off and complete</Button></>}>
        <SignOffField label="Foreman signature" signerName="Foreman" value={signature} onChange={setSignature} />
      </Dialog>
    </div>
  );
}
