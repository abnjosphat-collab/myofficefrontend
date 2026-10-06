// app/maintenance-prototype/page.tsx — PROTOTYPE of the rebuilt Maintenance workflow (docs/plans/maintenance-workflow.md, Phase 1).
// Clickable, no backend: every row is synthetic and nothing is saved. The screens are the real components from app/maintenance/ fed by
// an in-memory source (./fakeServer.ts); in Phase 2 only the source changes. The switchers at the top force each data state, the role,
// a save conflict and register failures, so the loading, failure, empty and refusal states can be reviewed as real renderings.
// This route is not in the navigation and is never merged to main.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, Checkbox, Notice, PageHeader, Segmented, Select, Tabs, TabsContent, TabsList, TabsTrigger, deriveDataStatus, isTransientStatus, pageSlice } from '@/components/ui-system';
import type { RegisterOption, RegisterRef } from '@/components/shared/RegisterField';
import { AssignmentPicker, personOption, type AssignInput } from '../maintenance/AssignmentPicker';
import { QuickWorkOrderForm, type QuickInput } from '../maintenance/QuickWorkOrderForm';
import { RequestForm, type RequestInput } from '../maintenance/RequestForm';
import { RequestInboxView, type ApproveInput } from '../maintenance/RequestInboxView';
import { NO_FLOW_FILTERS, useSavedViews, type FlowFilters } from '../maintenance/savedViews';
import { ScheduleFlowForm, type ScheduleDraft } from '../maintenance/ScheduleFlowForm';
import { WorkOrderListView, isOverdueFlow, todayIso, type Counts } from '../maintenance/WorkOrderListView';
import { WorkOrderRecordView, type Role, type TransitionInput } from '../maintenance/WorkOrderRecordView';
import { priorityMeta } from '../maintenance/meta';
import type { FlowAssignment, FlowOrder, FlowRequest, RequestStatus } from '../maintenance/workflowTypes';
import { MACHINES, SECTIONS, allowedTransitions, checkAssignable, iso, noPermits, peopleOn, projectSchedule, seedOrders, seedRequests } from './fakeServer';

type Scenario = 'ready' | 'loading' | 'retrying' | 'error' | 'forbidden' | 'empty' | 'stale';
const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'ready', label: 'Ready' }, { value: 'loading', label: 'Loading' }, { value: 'retrying', label: 'Retrying (service slow, 503)' }, { value: 'error', label: 'Failed (400)' },
  { value: 'forbidden', label: 'Forbidden (403)' }, { value: 'empty', label: 'Empty' }, { value: 'stale', label: 'Failed refresh, rows kept' },
];
const ME: RegisterRef = { text: 'Alex Example', id: 1 };
const PAGE = 10;
const wait = (ms = 350) => new Promise(r => setTimeout(r, ms));
const stamp = () => `${iso(0)} ${new Date().toTimeString().slice(0, 5)}`;
const DEPARTMENTS: RegisterOption[] = ['Production', 'Safety', 'Stores', 'Engineering'].map((label, i) => ({ id: i + 1, label }));
const SECTION_OPTIONS: RegisterOption[] = SECTIONS.map((label, i) => ({ id: i + 1, label }));

function filterFlow(items: FlowOrder[], f: FlowFilters): FlowOrder[] {
  const q = f.search.trim().toLowerCase();
  const out = items.filter(o => {
    if (q && ![o.machine.text, o.number, o.assignee.text, o.description].some(v => v.toLowerCase().includes(q))) return false;
    if (f.status === 'overdue' ? !isOverdueFlow(o) : f.status === 'awaiting-signoff' ? !o.awaiting_signoff : f.status !== 'all' && o.status !== f.status) return false;
    if (f.priorities.length && !f.priorities.includes(o.priority)) return false;
    if (f.classification !== 'all' && o.classification !== f.classification) return false;
    if (f.assignee === 'me' && o.assignee.id !== ME.id) return false;
    if (f.assignee === 'unassigned' && o.assignee.text) return false;
    return true;
  });
  const key = f.sort;
  return [...out].sort((a, b) => (key === 'priority' ? priorityMeta(a.priority).rank - priorityMeta(b.priority).rank : key === 'number' ? b.number.localeCompare(a.number) : (a.due_date || '9').localeCompare(b.due_date || '9')));
}

function Prototype() {
  const [scenario, setScenario] = useState<Scenario>('ready');
  const [role, setRole] = useState<Role>('manager');
  const [conflictNext, setConflictNext] = useState(false);
  const [previewFails, setPreviewFails] = useState(false);
  const [registerFails, setRegisterFails] = useState(false);
  const [orders, setOrders] = useState<FlowOrder[]>(seedOrders);
  const [requests, setRequests] = useState<FlowRequest[]>(seedRequests);
  const [tab, setTab] = useState('orders');
  const [recordId, setRecordId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FlowFilters>(NO_FLOW_FILTERS);
  const [page, setPage] = useState(1);
  const [reqFilter, setReqFilter] = useState<RequestStatus | 'all'>('all');
  const [quick, setQuick] = useState<'quick' | 'breakdown' | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<FlowOrder[] | null>(null);
  const [conflict, setConflict] = useState<{ who: string; at: string } | null>(null);
  const [seen] = useState(() => new Map<string, number>());
  const saved = useSavedViews();
  const load = registerFails ? 'error' as const : 'ready' as const;

  const patchOrder = useCallback((id: number, fn: (o: FlowOrder) => FlowOrder) => setOrders(prev => prev.map(o => (o.id === id ? fn(o) : o))), []);
  const withEvent = (o: FlowOrder, what: string, extra: Partial<FlowOrder> = {}, signed?: boolean): FlowOrder => {
    const next = { ...o, ...extra, version: o.version + 1, events: [...o.events, { id: o.events.length + 1, at: stamp(), who: role === 'manager' ? 'Farai Example' : ME.text, what, signed }] };
    return { ...next, allowed_transitions: allowedTransitions(next.status, role) };
  };

  // --- the data state for the lists, forced by the switcher (the real hooks derive the same inputs from the request) ---
  const source = scenario === 'empty' ? [] : orders;
  const input = {
    loaded: !['loading', 'retrying', 'error', 'forbidden'].includes(scenario), loading: ['loading', 'retrying'].includes(scenario),
    error: scenario === 'retrying' ? 'The service is slow to respond (503).' : scenario === 'error' ? 'The server rejected the request (400).' : scenario === 'forbidden' ? 'Your role cannot read work orders.' : scenario === 'stale' ? 'The last refresh failed (500).' : null,
    errorStatus: ({ retrying: 503, error: 400, forbidden: 403, stale: 500 } as Record<string, number>)[scenario] ?? null,
  };
  const filteredAll = useMemo(() => filterFlow(source, filters), [source, filters]);
  const visible = pageSlice(filteredAll, page, PAGE);
  const status = deriveDataStatus({ ...input, count: filteredAll.length, transient: isTransientStatus(input.errorStatus) });
  const counts: Counts | null = input.loaded ? { all: source.length, open: source.filter(o => o.status === 'pending').length, inProgress: source.filter(o => o.status === 'in-progress').length, overdue: source.filter(isOverdueFlow).length, awaiting: source.filter(o => o.awaiting_signoff).length } : null;
  const reqSource = scenario === 'empty' ? [] : requests.filter(r => role === 'manager' || r.requester.startsWith('Example requester')).filter(r => reqFilter === 'all' || r.status === reqFilter);
  const reqStatus = deriveDataStatus({ ...input, count: reqSource.length, transient: isTransientStatus(input.errorStatus) });

  const machineOptions: RegisterOption[] = MACHINES.map(m => ({ id: m.id, label: m.name, description: `${m.code} · ${m.section} · ${m.status.replace('_', ' ')}` }));
  const peopleOptions = peopleOn(todayIso()).map(personOption);
  const record = orders.find(o => o.id === recordId) ?? null;

  const idem = (key: string) => { if (seen.has(key)) return seen.get(key) as number; return null; };

  const createQuick = async (i: QuickInput) => {
    await wait();
    if (idem(i.idempotencyKey) !== null) { toast.success('Already raised (same request replayed).'); return; }
    const id = Math.max(...orders.map(o => o.id)) + 1; seen.set(i.idempotencyKey, id);
    const base = seedOrders()[0];
    const o: FlowOrder = withEvent({ ...base, id, number: `WO-${String(300 + id).padStart(5, '0')}`, machine: i.machine, description: i.description, classification: i.classification, priority: i.priority, status: i.startNow ? 'in-progress' : 'pending', assignee: i.startNow ? ME : { text: '', id: null }, section: { text: '', id: null }, source: { kind: 'manual' }, progress: 0, assignments: [], comments: [], events: [], permits: noPermits(), version: 0, assignee_now_on_leave: false, needs_assignment: false, awaiting_signoff: false }, i.classification === 'breakdown' ? 'Raised as a breakdown work order' : 'Raised on the fly');
    setOrders(prev => [o, ...prev]); toast.success(`${o.number} raised.`);
  };
  const transition = async (o: FlowOrder, t: TransitionInput) => {
    await wait();
    if (!o.allowed_transitions.includes(t.to)) throw new Error(`That move is not allowed from ${o.status}.`);
    if (t.to === 'in-progress' && o.status === 'pending') {
      const missing = Object.entries(o.permits).filter(([, v]) => v.required && !v.reference.trim()).map(([k]) => k.replace(/_/g, ' '));
      if (missing.length) throw new Error(`The job cannot start: a reference is needed for ${missing.join(', ')}.`);
    }
    patchOrder(o.id, x => withEvent(x, `Status: ${x.status} to ${t.to}${t.reason ? `. Reason: ${t.reason}` : ''}`, { status: t.to, awaiting_signoff: t.to === 'completed', progress: t.to === 'completed' ? 100 : x.progress }, !!t.signature));
    toast.success('Done.');
  };
  const saveOrder = async (o: FlowOrder, patch: Partial<FlowOrder>) => {
    await wait();
    if (conflictNext) { setConflictNext(false); setConflict({ who: 'Farai Example', at: '10:42' }); throw new Error('Version conflict: this work order changed since you opened it.'); }
    setConflict(null); patchOrder(o.id, x => withEvent(x, 'Edited', patch)); toast.success('Saved.');
  };
  const assign = async (targets: FlowOrder[], i: AssignInput) => {
    await wait();
    const r = checkAssignable(i.person.id, i.person.text, i.day);
    if (!r.ok) throw new Error(r.message);
    for (const o of targets) {
      const a: FlowAssignment = { id: o.assignments.length + 1, person: i.person, role: i.role, day: i.day, hours: i.hours, status: 'planned' };
      patchOrder(o.id, x => withEvent(x, `Assigned ${i.person.text} for ${i.day}`, { assignments: [...x.assignments, a], assignee: i.role === 'lead' ? i.person : x.assignee, needs_assignment: false, assignee_now_on_leave: false }));
    }
    toast.success(`${i.person.text} assigned${targets.length > 1 ? ` to ${targets.length} work orders` : ''}.`);
  };
  const approve = async (r: FlowRequest, i: ApproveInput) => {
    await wait();
    const chk = checkAssignable(i.assignee.id, i.assignee.text, i.dueDate || todayIso());
    if (!chk.ok) throw new Error(chk.message);
    const id = Math.max(...orders.map(o => o.id)) + 1; const base = seedOrders()[0];
    const wo: FlowOrder = withEvent({ ...base, id, number: `WO-${String(300 + id).padStart(5, '0')}`, machine: r.machine, description: r.description, classification: r.classification, priority: i.priority, status: 'pending', assignee: i.assignee, foreman: i.foreman, due_date: i.dueDate, source: { kind: 'request', ref: r.number }, assignments: [], comments: [], events: [], permits: noPermits(), version: 0, needs_assignment: !i.assignee.text, assignee_now_on_leave: false, awaiting_signoff: false, progress: 0 }, `Created from request ${r.number}`, {}, true);
    setOrders(prev => [wo, ...prev]); setRequests(prev => prev.map(x => (x.id === r.id ? { ...x, status: 'approved', work_order: { number: wo.number, status: 'pending' } } : x))); toast.success(`${r.number} approved; ${wo.number} raised.`);
  };

  const hdr = recordId === null ? 'Work orders' : 'Work order';
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info" icon="info" title="Prototype: example data, nothing is saved">Every machine, person and record here is invented. Use the switchers to see each state. This page is for review only and is not part of the navigation.</Notice>
      <details open className="rounded-card border border-line-subtle bg-surface-subtle p-3">
        <summary className="cursor-pointer font-sans text-label font-semibold text-ink">Prototype controls (not part of the product)</summary>
      <div className="mt-3 flex flex-wrap items-end gap-3" role="group" aria-label="Prototype controls">
        <label className="flex flex-col gap-1 font-sans text-caption text-ink-muted">Data state<Select aria-label="Data state" className="w-64" value={scenario} onValueChange={v => { setScenario(v as Scenario); setPage(1); }} options={SCENARIOS} /></label>
        <div className="flex flex-col gap-1 font-sans text-caption text-ink-muted">Role<Segmented label="Role" value={role} onValueChange={v => setRole(v as Role)} options={[{ value: 'manager', label: 'Foreman' }, { value: 'user', label: 'Artisan or requester' }]} /></div>
        <Checkbox checked={conflictNext} onChange={e => setConflictNext(e.target.checked)} label="Next work order save conflicts" />
        <Checkbox checked={previewFails} onChange={e => setPreviewFails(e.target.checked)} label="Schedule preview fails" />
        <Checkbox checked={registerFails} onChange={e => setRegisterFails(e.target.checked)} label="Registers fail to load" />
      </div>
      </details>

      {record ? (
        <WorkOrderRecordView
          order={{ ...record, allowed_transitions: allowedTransitions(record.status, role) }} role={role} onBack={() => { setRecordId(null); setConflict(null); }}
          onTransition={t => transition(record, t)} onSave={p => saveOrder(record, p)} conflict={conflict} onReloadConflict={() => setConflict(null)}
          onSignoff={async sig => { await wait(); patchOrder(record.id, x => withEvent(x, 'Foreman sign-off', { awaiting_signoff: false }, !!sig)); toast.success('Signed off.'); }}
          onAssign={() => setAssignFor([record])} onRemoveAssignment={async a => { patchOrder(record.id, x => withEvent(x, `Removed assignment of ${a.person.text}`, { assignments: x.assignments.filter(y => y.id !== a.id) })); }}
          onComment={async body => { await wait(200); patchOrder(record.id, x => ({ ...x, comments: [...x.comments, { id: x.comments.length + 1, at: stamp(), who: ME.text, body }] })); }}
          machines={machineOptions} people={peopleOptions} sections={SECTION_OPTIONS}
        />
      ) : (
        <>
          <PageHeader breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: hdr }]} title="Work orders" description="Raise a job, follow it to completion, and plan the recurring ones."
            actions={(<>{tab === 'schedules' ? <Button variant="primary" icon="plus" onClick={() => setScheduleOpen(true)}>New schedule</Button> : tab === 'requests' ? <Button variant="primary" icon="plus" onClick={() => setRequestOpen(true)}>Request work</Button> : <><Button icon="breakdown" onClick={() => setQuick('breakdown')}>Breakdown</Button><Button variant="primary" icon="plus" onClick={() => setQuick('quick')}>New work order</Button></>}</>)} />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Maintenance sections">
              <TabsTrigger value="orders" icon="wrench">Work orders</TabsTrigger>
              <TabsTrigger value="requests" icon="documents">{role === 'manager' ? 'Requests' : 'My requests'}</TabsTrigger>
              <TabsTrigger value="schedules" icon="clock">Schedules</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
              <WorkOrderListView
                items={visible} total={filteredAll.length} counts={counts} status={status} error={input.error} onRetry={() => setScenario('ready')}
                filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} views={saved.views} onSaveView={n => saved.save(n, filters)} onDeleteView={saved.remove}
                page={page} pageSize={PAGE} onPageChange={setPage} onOpen={o => setRecordId(o.id)} onNew={() => setQuick('quick')} onBreakdown={() => setQuick('breakdown')}
                onAssign={t => setAssignFor(t)} canAssign={role === 'manager'}
              />
            </TabsContent>
            <TabsContent value="requests" className="mt-4">
              <RequestInboxView
                items={reqSource} status={reqStatus} error={input.error} onRetry={() => setScenario('ready')} scope={role === 'manager' ? 'all' : 'mine'} filter={reqFilter} onFilterChange={setReqFilter}
                onNew={() => setRequestOpen(true)} onApprove={approve} peopleOn={peopleOn} load={load}
                onReject={async (r, reason) => { await wait(); setRequests(prev => prev.map(x => (x.id === r.id ? { ...x, status: 'rejected', decision_note: reason } : x))); toast.success(`${r.number} rejected.`); }}
                onCancel={async r => { await wait(200); setRequests(prev => prev.map(x => (x.id === r.id ? { ...x, status: 'cancelled' } : x))); toast.success(`${r.number} cancelled.`); }}
              />
            </TabsContent>
            <TabsContent value="schedules" className="mt-4"><p className="font-sans text-body-sm text-ink-muted">Schedules are listed here once saved. Use New schedule to review the form and its preview; nothing is stored in the prototype.</p></TabsContent>
          </Tabs>
        </>
      )}

      <QuickWorkOrderForm open={quick !== null} onOpenChange={o => { if (!o) setQuick(null); }} preset={quick === 'breakdown' ? 'breakdown' : undefined} machines={machineOptions} machinesLoad={load} onRetryMachines={() => setRegisterFails(false)} onCreate={createQuick} />
      <RequestForm
        open={requestOpen} onOpenChange={setRequestOpen} me={{ text: 'Requester Example', id: null }} machines={machineOptions} people={peopleOptions} departments={DEPARTMENTS} sections={SECTION_OPTIONS} load={load} onRetry={() => setRegisterFails(false)}
        onCreate={async (i: RequestInput) => {
          await wait();
          if (idem(i.idempotencyKey) !== null) return; const id = Math.max(...requests.map(r => r.id)) + 1; seen.set(i.idempotencyKey, id);
          setRequests(prev => [{ id, number: `REQ-${String(18 + id).padStart(5, '0')}`, status: 'open', machine: i.machine, description: i.description, priority: i.priority, classification: 'breakdown', requester: 'Example requester', department: i.department.text, section: i.section.text, needed_by: i.neededBy, created: stamp(), foreman: { text: '', id: null } }, ...prev]);
          toast.success('Request sent.');
        }}
      />
      <ScheduleFlowForm
        open={scheduleOpen} onOpenChange={setScheduleOpen} machines={machineOptions} machinesLoad={load} peopleOn={peopleOn}
        project={async (d: ScheduleDraft) => { await wait(500); if (previewFails) throw new Error('The preview service did not answer (500).'); return projectSchedule({ assets: d.assets, kind: d.kind, leadDays: d.leadDays, suppressDays: d.suppressDays, person: d.person.text, count: 6 }); }}
        onSave={async () => { await wait(); toast.success('Schedule created (prototype: not stored).'); }}
      />
      <AssignmentPicker
        open={assignFor !== null} onOpenChange={o => { if (!o) setAssignFor(null); }} subject={assignFor ? (assignFor.length === 1 ? `${assignFor[0].number}, ${assignFor[0].machine.text}` : `${assignFor.length} work orders`) : ''}
        initialDay={iso(0)} peopleOn={peopleOn} load={load} onRetry={() => setRegisterFails(false)} onAssign={i => assign(assignFor ?? [], i)}
      />
    </div>
  );
}

export default function MaintenancePrototypePage() {
  return <AppShell migrated><Prototype /></AppShell>;
}
