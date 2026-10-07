// app/maintenance-preview/requests/page.tsx — Requests, pattern R: filter tiles, toolbar, cards or table. Approve opens the signature dialog.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button, DataTable, Dialog, EmptyState, Field, FormDialog, Input, MetricGrid, MetricTile, RecordCard, SearchField, Segmented, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, useViewPreference, type Column } from '@/components/ui-system';
import { MACHINES, PRIORITY_LABEL, type Priority, type Request } from '../fixtures';
import { ApprovalDialog } from '../ApprovalDialog';
import { PageFrame, PriorityBadge } from '../parts';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

type Filter = 'all' | 'waiting' | 'approved' | 'rejected';
const STATUS: Record<Request['status'], { label: string; tone: 'warning' | 'success' | 'neutral' }> = { waiting: { label: 'Waiting', tone: 'warning' }, approved: { label: 'Approved', tone: 'success' }, rejected: { label: 'Rejected', tone: 'neutral' } };
const PRIORITIES = [{ value: 'all', label: 'Any priority' }, ...Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))];

export default function RequestsPage() {
  const { requests, reject, request } = usePreview();
  const [view, setView] = useViewPreference('maintenance-preview-req', VIEW_CARDS_TABLE);
  const [filter, setFilter] = useState<Filter>('all');
  const [priority, setPriority] = useState('all');
  const [q, setQ] = useState('');
  const [reading, setReading] = useState<number | null>(null);
  const [approving, setApproving] = useState<Request | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [machine, setMachine] = useState(''); const [title, setTitle] = useState(''); const [newPriority, setNewPriority] = useState<Priority>('medium');

  const counts = useMemo(() => ({ all: requests.length, waiting: requests.filter(r => r.status === 'waiting').length, approved: requests.filter(r => r.status === 'approved').length, rejected: requests.filter(r => r.status === 'rejected').length }), [requests]);
  const rows = useMemo(() => requests.filter(r => (filter === 'all' || r.status === filter) && (priority === 'all' || r.priority === priority) && (!q.trim() || [r.machine, r.title, r.number, r.by].some(s => s.toLowerCase().includes(q.trim().toLowerCase())))), [requests, filter, priority, q]);
  const filtered = filter !== 'all' || priority !== 'all' || q !== '';
  const clear = () => { setFilter('all'); setPriority('all'); setQ(''); };
  const toggle = (f: Filter) => setFilter(cur => (cur === f ? 'all' : f));
  const current = requests.find(r => r.id === reading) ?? null;
  const actionsOf = (r: Request) => (r.status === 'waiting' ? <><Button size="sm" variant="primary" onClick={() => setApproving(r)}>Approve</Button><Button size="sm" onClick={() => { setRejecting(r); setReason(''); }}>Reject</Button></> : null);

  const COLUMNS: Column<Request>[] = [
    { id: 'req', header: 'Request', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.machine}, {r.title}</p><p className="text-caption text-ink-muted tabular">#{r.number}</p></div> },
    { id: 'status', header: 'Status', cell: r => <StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge> },
    { id: 'priority', header: 'Priority', hideBelow: 'md', cell: r => <PriorityBadge p={r.priority} /> },
    { id: 'by', header: 'Requested by', hideBelow: 'md', cell: r => r.by },
    { id: 'when', header: 'When', hideBelow: 'md', cell: r => r.when },
  ];

  return (
    <PageFrame crumb="Requests" title="Work order requests" description="Anyone can ask for work. A foreman approves it with a signature and it becomes a work order." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New request</Button>}>
      <MetricGrid compact>
        <MetricTile compact label="Requests" value={counts.all} selected={filter === 'all'} onClick={clear} />
        <MetricTile compact label="Waiting" tone={counts.waiting ? 'warning' : 'default'} value={counts.waiting} detail="For approval" selected={filter === 'waiting'} onClick={() => toggle('waiting')} />
        <MetricTile compact label="Approved" tone="success" value={counts.approved} selected={filter === 'approved'} onClick={() => toggle('approved')} />
        <MetricTile compact label="Rejected" value={counts.rejected} selected={filter === 'rejected'} onClick={() => toggle('rejected')} />
      </MetricGrid>

      <Toolbar filtered={filtered} onClear={clear} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={q} onValueChange={setQ} placeholder="Search machine, person or request number" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select aria-label="Priority" className="w-40" value={priority} onValueChange={setPriority} options={PRIORITIES} />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon="search" title={filtered ? 'No requests match' : 'No requests yet'} description={filtered ? 'Try fewer filters or a different search.' : 'Raise the first one.'} action={filtered ? <Button onClick={clear}>Clear filters</Button> : <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New request</Button>} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted">{rows.length} {rows.length === 1 ? 'request' : 'requests'}{rows.length !== requests.length ? ` of ${requests.length}` : ''}</p>
          {view === 'cards' ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Requests">
              {rows.map(r => (
                <li key={r.id} className="relative">
                  <RecordCard eyebrow={`#${r.number}`} title={r.machine} subtitle={r.title} openLabel={`Open request ${r.number}`} onOpen={() => setReading(r.id)}
                    status={<><StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge><PriorityBadge p={r.priority} /></>}
                    facts={[{ label: 'Requested by', value: r.by }, { label: 'When', value: r.when }, ...(r.workOrder ? [{ label: 'Work order', value: r.workOrder }] : [])]} action={actionsOf(r)} />
                </li>
              ))}
            </ul>
          ) : <DataTable caption="Requests" rows={rows} columns={COLUMNS} getRowId={r => String(r.id)} onRowActivate={r => setReading(r.id)} rowActions={actionsOf} />}
        </>
      )}

      <Dialog open={!!current} onOpenChange={o => { if (!o) setReading(null); }} size="md" title={current ? `Request ${current.number}` : 'Request'} description={current ? `${current.machine}, ${current.title}` : undefined}
        footer={current && <>{current.status === 'waiting' && <><Button onClick={() => { setRejecting(current); setReading(null); setReason(''); }}>Reject</Button><Button variant="primary" onClick={() => { setApproving(current); setReading(null); }}>Approve</Button></>}<Button onClick={() => setReading(null)}>Close</Button></>}>
        {current && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[['Status', <StatusBadge key="s" tone={STATUS[current.status].tone}>{STATUS[current.status].label}</StatusBadge>], ['Priority', <PriorityBadge key="p" p={current.priority} />], ['Requested by', current.by], ['When', current.when]].map(([k, v]) => <div key={String(k)} className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">{k}</dt><dd className="font-sans text-body text-ink">{v}</dd></div>)}
            <div className="rounded-control bg-surface-subtle p-3 sm:col-span-2"><dt className="font-sans text-caption text-ink-muted">Details</dt><dd className="font-sans text-body text-ink [overflow-wrap:anywhere]">{current.details || 'Not recorded'}</dd></div>
            {current.status === 'rejected' && <div className="rounded-control bg-surface-subtle p-3 sm:col-span-2"><dt className="font-sans text-caption text-ink-muted">Reason for rejecting</dt><dd className="font-sans text-body text-ink">{current.reason}</dd></div>}
            {current.workOrder && <div className="rounded-control bg-surface-subtle p-3 sm:col-span-2"><dt className="font-sans text-caption text-ink-muted">Work order</dt><dd className="font-sans text-body"><Link className="focus-ring rounded-xs text-action hover:underline" href="/maintenance-preview/work-orders">{current.workOrder}</Link></dd></div>}
          </dl>
        )}
      </Dialog>
      <ApprovalDialog request={approving} onClose={() => setApproving(null)} />
      <FormDialog open={!!rejecting} onOpenChange={o => { if (!o) setRejecting(null); }} size="sm" title="Reject request" description={rejecting ? `${rejecting.machine}, ${rejecting.title}` : undefined} submitLabel="Reject"
        onSubmit={async () => { if (!reason.trim()) throw new Error('Say why, so the requester knows.'); if (rejecting) reject(rejecting.id, reason.trim()); toast.success('Request rejected.'); }}>
        <Field label="Reason" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this will not go ahead" /></Field>
      </FormDialog>
      <FormDialog open={creating} onOpenChange={setCreating} size="md" title="New request" description="Anyone can ask. A foreman approves it." submitLabel="Send request"
        onSubmit={async () => { if (!machine.trim() || !title.trim()) throw new Error('Choose the machine and say what is wrong.'); request({ machine: machine.trim(), title: title.trim(), priority: newPriority }); toast.success('Request sent.'); setMachine(''); setTitle(''); }}>
        <div className="flex flex-col gap-4">
          <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
          <Field label="What is wrong" required><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Leaking gland, noise on start-up" /></Field>
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Priority</span><Segmented label="Priority" value={newPriority} onValueChange={setNewPriority} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} /></div>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
