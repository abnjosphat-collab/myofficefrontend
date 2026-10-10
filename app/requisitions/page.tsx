// app/requisitions/page.tsx — Purchase requisitions
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, ChartPanel, DataRegion, DataTable, Dialog, Distribution, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, SearchField, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toolbar, deriveDataStatus, isTransientStatus, sortRows, type Column, type IconMeaning, type SortState, type Tone, FilterField, Fact, FactList, DetailActions, RowActions } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useEmployees } from '@/hooks/useLookups';
import { useApiList } from '@/lib/useApiList';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { formatCurrency } from '@/components/shared/utils';
import type { Requisition, RequisitionItem } from './types';
import { apiCreate, apiDelete, apiUpdate, useRequisitionsData } from './useRequisitionsData';
import { itemTotal } from './calcRequisitions';
import { exportStatusColor, priorityTone, statusTone } from '@/lib/status';
import { useConfirmDelete } from '@/lib/useConfirmDelete';
import { SectionBadge } from '@/components/shared/SectionBadge';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const STATUSES: Requisition['status'][] = ['Draft', 'Pending', 'Approved', 'Rejected', 'Processing', 'Completed'];
const PRIORITIES: Requisition['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
const SECTIONS: Requisition['section'][] = ['Electrical', 'Mechanical'];
const ALL = '__all__';

const STATUS_META: Record<Requisition['status'], { tone: Tone; icon: IconMeaning }> = {
  Draft: { tone: statusTone('Draft'), icon: 'draft' }, Pending: { tone: statusTone('Pending'), icon: 'pending' }, Approved: { tone: statusTone('Approved'), icon: 'check' },
  Rejected: { tone: statusTone('Rejected'), icon: 'cancel' }, Processing: { tone: statusTone('Processing'), icon: 'clock' }, Completed: { tone: statusTone('Completed'), icon: 'closed' },
};
const PRIORITY_META: Record<Requisition['priority'], { tone: Tone; icon: IconMeaning }> = {
  Critical: { tone: priorityTone('Critical'), icon: 'critical' }, High: { tone: priorityTone('High'), icon: 'warning' }, Medium: { tone: priorityTone('Medium'), icon: 'info' }, Low: { tone: priorityTone('Low'), icon: 'flag' },
};

// An unrecognised status or priority (legacy or malformed data) must not crash the page.
const StatusTag = ({ status }: { status: Requisition['status'] }) => { const m = STATUS_META[status] ?? STATUS_META.Draft; return <StatusBadge tone={m.tone} icon={m.icon}>{status}</StatusBadge>; };
const PriorityTag = ({ priority }: { priority: Requisition['priority'] }) => { const m = PRIORITY_META[priority]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{priority}</StatusBadge>; };

const newItem = (): RequisitionItem => ({ description: '', costPerUnit: 0, quantity: 1, reason: '' });
type Form = { date: string; requester: string; section: Requisition['section']; required_for: string; priority: Requisition['priority']; status: Requisition['status']; requisitionNumber: string; items: RequisitionItem[]; notes: string };
const emptyForm = (): Form => ({
  date: new Date().toISOString().slice(0, 10), requester: '', section: 'Mechanical', required_for: '', priority: 'Medium', status: 'Draft',
  requisitionNumber: `REQ-${Date.now().toString().slice(-6)}`, items: [newItem()], notes: '',
});

function ItemFields({ item, index, count, touched, onChange, onRemove }: { item: RequisitionItem; index: number; count: number; touched: boolean; onChange: (i: number, p: Partial<RequisitionItem>) => void; onRemove: (i: number) => void }) {
  const n = index + 1;
  return (
    <fieldset className="grid grid-cols-1 gap-3 rounded-card border border-line p-4 sm:grid-cols-6">
      <legend className="px-1 font-sans text-label font-medium text-ink">Item {n}</legend>
      <div className="sm:col-span-6"><Field label={`Description (item ${n})`} required error={touched && !item.description.trim() ? 'Describe the item.' : undefined}><SuggestField historyKey="item_description" placeholder="Item description" value={item.description} onChange={v => onChange(index, { description: v })} /></Field></div>
      <div className="sm:col-span-2"><Field label={`Unit cost (item ${n})`} optional><Input type="number" min="0" step="0.01" inputMode="decimal" value={item.costPerUnit} onChange={e => onChange(index, { costPerUnit: parseFloat(e.target.value) || 0 })} /></Field></div>
      <div className="sm:col-span-1"><Field label={`Qty (item ${n})`} optional><Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={e => onChange(index, { quantity: parseInt(e.target.value, 10) || 1 })} /></Field></div>
      <div className="sm:col-span-2"><Field label={`Reason (item ${n})`} optional><SuggestField historyKey="requisition_item_reason" placeholder="Optional" value={item.reason} onChange={v => onChange(index, { reason: v })} /></Field></div>
      <div className="flex items-end justify-between gap-2 sm:col-span-1 sm:justify-end">
        <span className="font-sans text-caption tabular text-ink-muted sm:hidden">{formatCurrency(item.costPerUnit * item.quantity)}</span>
        <IconButton icon="delete" variant="danger" label={`Remove item ${n}`} disabled={count <= 1} onClick={() => onRemove(index)} />
      </div>
    </fieldset>
  );
}

function ReqDialog({ req, open, onOpenChange, onSaved }: { req?: Requisition; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const employees = useEmployees();
  const equipment = useApiList<{ id?: number | string; name?: string; location?: string; department?: string; category?: string }>('/api/equipment');
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, req?.id), () => {
    setTouched(false);
    setForm(req ? { date: req.date, requester: req.requester, section: req.section, required_for: req.required_for, priority: req.priority, status: req.status, requisitionNumber: req.requisitionNumber, items: req.items.length ? req.items : [newItem()], notes: req.notes ?? '' } : emptyForm());
  });
  const set = (p: Partial<Form>) => setForm(f => ({ ...f, ...p }));
  const people = useMemo(() => employees.map(e => ({ name: `${e.first_name} ${e.last_name}`.trim(), section: e.department })), [employees]);
  const assets = useMemo(() => equipment.items.filter(e => e.name).map(e => ({ name: String(e.name), section: String(e.location ?? e.department ?? e.category ?? '') })), [equipment.items]);
  const setRequester = (name: string) => { const m = people.find(p => p.name === name); set({ requester: name, ...(m && SECTIONS.includes(m.section as Requisition['section']) ? { section: m.section as Requisition['section'] } : {}) }); };
  const setRequiredFor = (value: string) => { const a = assets.find(x => x.name === value); set({ required_for: value, ...(a && SECTIONS.includes(a.section as Requisition['section']) ? { section: a.section as Requisition['section'] } : {}) }); };
  const setItem = (i: number, p: Partial<RequisitionItem>) => set({ items: form.items.map((it, idx) => (idx === i ? { ...it, ...p } : it)) });
  const total = itemTotal(form.items);

  const submit = async () => {
    setTouched(true);
    if (!form.requester.trim() || !form.date || form.items.some(i => !i.description.trim())) return false;
    const payload = {
      date: form.date, requester: form.requester, section: form.section, required_for: form.required_for, priority: form.priority, status: form.status,
      requisition_number: form.requisitionNumber, notes: form.notes,
      items: form.items.map(it => ({ description: it.description, cost_per_unit: it.costPerUnit, quantity: it.quantity, reason: it.reason })),
    };
    if (req) await apiUpdate(req.id, payload); else await apiCreate(payload);
    toast.success(req ? 'Requisition updated.' : 'Requisition created.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={req ? `Edit ${req.requisitionNumber}` : 'New purchase requisition'} description="Requester, date and at least one described item are required." submitLabel={req ? 'Save changes' : 'Create requisition'} onSubmit={submit} size="xl">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="rq-basic" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <h3 id="rq-basic" className="font-display text-section font-semibold text-ink sm:col-span-3">Requisition</h3>
          <div className="sm:col-span-2">
            <Field label="Requester" required error={touched && !form.requester.trim() ? 'Enter the requester.' : undefined}>
              <Input list="rq-people" value={form.requester} onChange={e => setRequester(e.target.value)} autoComplete="off" placeholder="Type a name to search employees" />
              <datalist id="rq-people">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
            </Field>
          </div>
          <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set({ section: v as Requisition['section'] })} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
          <Field label="Priority"><Select aria-label="Priority" value={form.priority} onValueChange={v => set({ priority: v as Requisition['priority'] })} options={PRIORITIES.map(p => ({ value: p, label: p }))} /></Field>
          <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v as Requisition['status'] })} options={STATUSES.map(s => ({ value: s, label: s }))} /></Field>
          <div className="sm:col-span-2">
            <Field label="Required for" optional description={equipment.error ? 'The equipment list could not be loaded; type the asset, project or work order instead.' : 'Pick equipment or type a project, work order or other reason.'}>
              <Input list="rq-assets" value={form.required_for} onChange={e => setRequiredFor(e.target.value)} autoComplete="off" placeholder="Equipment, project or work order" />
              <datalist id="rq-assets">{assets.map(a => <option key={a.name} value={a.name} label={a.section || undefined} />)}</datalist>
            </Field>
          </div>
          <Field label="Requisition number"><Input value={form.requisitionNumber} onChange={e => set({ requisitionNumber: e.target.value })} placeholder="For example, REQ-001" /></Field>
        </section>

        <section aria-labelledby="rq-items" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="rq-items" className="font-display text-section font-semibold text-ink">Line items ({form.items.length})</h3>
            <Button size="sm" icon="plus" onClick={() => set({ items: [...form.items, newItem()] })}>Add item</Button>
          </div>
          {form.items.map((it, i) => <ItemFields key={i} item={it} index={i} count={form.items.length} touched={touched} onChange={setItem} onRemove={idx => set({ items: form.items.filter((_, j) => j !== idx) })} />)}
          <p className="text-right font-sans text-body text-ink">Total: <span className="font-semibold tabular">{formatCurrency(total)}</span></p>
        </section>

        <Field label="Notes" optional><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Any additional notes" /></Field>
      </div>
    </FormDialog>
  );
}

function DetailDialog({ req, onClose, onEdit, onDelete }: { req: Requisition | null; onClose: () => void; onEdit: (r: Requisition) => void; onDelete: (r: Requisition) => void }) {
  const total = req ? itemTotal(req.items) : 0;
  const itemColumns: Column<RequisitionItem & { id: string }>[] = [
    { id: 'description', header: 'Description', cell: i => i.description },
    { id: 'reason', header: 'Reason', hideBelow: 'md', cell: i => i.reason || <span className="text-ink-muted">None</span> },
    { id: 'cost', header: 'Unit cost', numeric: true, cell: i => formatCurrency(i.costPerUnit) },
    { id: 'qty', header: 'Qty', numeric: true, cell: i => i.quantity },
    { id: 'total', header: 'Total', numeric: true, cell: i => formatCurrency(i.costPerUnit * i.quantity) },
  ];
  return (
    <Dialog
      open={!!req}
      onOpenChange={open => { if (!open) onClose(); }}
      title={req ? `Requisition ${req.requisitionNumber}` : 'Requisition'}
      description={req ? `${req.requester}, ${formatDate(req.date)}` : undefined}
      size="lg"
      footer={req && (
        <DetailActions onDelete={() => onDelete(req)} onClose={onClose} onEdit={() => onEdit(req)} />
      )}
    >
      {req && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2"><StatusTag status={req.status} /><PriorityTag priority={req.priority} /><SectionBadge section={req.section} /><StatusBadge tone="success">{formatCurrency(total)}</StatusBadge></div>
          <FactList>
            <Fact label="Requester">{req.requester}</Fact>
            <Fact label="Date">{formatDate(req.date)}</Fact>
            <Fact label="Required for">{req.required_for || 'Not specified'}</Fact>
            <Fact label="Reference">#{req.lineNumber}</Fact>
          </FactList>
          <DataTable caption="Requisition items" rows={req.items.map((i, n) => ({ ...i, id: String(n) }))} columns={itemColumns} getRowId={i => i.id} density="compact" />
          <p className="text-right font-sans text-body text-ink">Total: <span className="font-semibold tabular">{formatCurrency(total)}</span></p>
          {req.notes && <div><h3 className="font-sans text-caption text-ink-muted">Notes</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{req.notes}</p></div>}
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'requisitionNumber', label: 'Req #', width: 14 },
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'requester', label: 'Requester', width: 18 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'priority', label: 'Priority', width: 12 },
  { key: 'status', label: 'Status', width: 14 },
  { key: 'required_for', label: 'Required For', width: 22 },
  { key: 'items', label: 'Cost', width: 14, format: (_v, row) => formatCurrency(itemTotal((row.items as RequisitionItem[]) ?? [])) },
  { key: 'notes', label: 'Notes', width: 26 },
];

function RequisitionsContent() {
  const confirmDelete = useConfirmDelete();
  const { reqs, loading, loaded, error, errorStatus, refetch } = useRequisitionsData();
  const [tab, setTab] = useState('records');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState(ALL);
  const [priorityF, setPriorityF] = useState(ALL);
  const [sectionF, setSectionF] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<Requisition | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Requisition | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reqs.filter(r =>
      (statusF === ALL || r.status === statusF) && (priorityF === ALL || r.priority === priorityF) && (sectionF === ALL || r.section === sectionF)
      && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)
      && (!q || r.requester.toLowerCase().includes(q) || r.requisitionNumber.toLowerCase().includes(q) || r.required_for.toLowerCase().includes(q) || r.items.some(i => i.description.toLowerCase().includes(q))));
  }, [reqs, statusF, priorityF, sectionF, dateFrom, dateTo, search]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => (id === 'cost' ? String(Math.round(itemTotal(r.items) * 100)).padStart(14, '0') : String(r[id as keyof Requisition] ?? '').toLowerCase())), [filtered, sort]);
  const sum = (list: Requisition[]) => list.reduce((s, r) => s + itemTotal(r.items), 0);
  const stats = useMemo(() => ({ total: filtered.length, value: sum(filtered), pending: filtered.filter(r => r.status === 'Pending').length, approved: filtered.filter(r => r.status === 'Approved').length, critical: filtered.filter(r => r.priority === 'Critical').length }), [filtered]);
  const byStatus = STATUSES.map(s => { const l = filtered.filter(r => r.status === s); return { id: s, status: s, count: l.length, value: sum(l) }; }).filter(r => r.count > 0);
  const byPriority = PRIORITIES.map(p => ({ name: p, value: filtered.filter(r => r.priority === p).length })).filter(r => r.value > 0);
  const bySection = SECTIONS.map(s => { const l = filtered.filter(r => r.section === s); return { name: s, value: l.length, cost: sum(l) }; });

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || statusF !== ALL || priorityF !== ALL || sectionF !== ALL || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setStatusF(ALL); setPriorityF(ALL); setSectionF(ALL); setDateFrom(''); setDateTo(''); };

  const openEditor = (r?: Requisition) => { setViewing(null); setEditing(r); setDialogOpen(true); };
  const remove = async (r: Requisition) => {
    await confirmDelete({ title: `Delete requisition ${r.requisitionNumber}?`, message: 'This cannot be undone. Only managers can delete requisitions.', what: 'The requisition', run: async () => { await apiDelete(r.id); setViewing(null); }, done: 'Requisition deleted.', after: () => refetch() });
  };

  const COLUMNS: Column<Requisition>[] = [
    { id: 'requisitionNumber', header: 'Req #', sortable: true, sticky: true, cell: r => <span className="whitespace-nowrap tabular">{r.requisitionNumber}<span className="ml-2 text-ink-muted">#{r.lineNumber}</span></span> },
    { id: 'date', header: 'Date', sortable: true, hideBelow: 'md', cell: r => <span className="whitespace-nowrap tabular">{formatDate(r.date)}</span> },
    { id: 'requester', header: 'Requester', sortable: true, cell: r => r.requester },
    { id: 'section', header: 'Section', sortable: true, hideBelow: 'lg', cell: r => <SectionBadge section={r.section} /> },
    { id: 'priority', header: 'Priority', sortable: true, hideBelow: 'md', cell: r => <PriorityTag priority={r.priority} /> },
    { id: 'status', header: 'Status', sortable: true, cell: r => <StatusTag status={r.status} /> },
    { id: 'cost', header: 'Cost', sortable: true, numeric: true, cell: r => formatCurrency(itemTotal(r.items)) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Requisitions' }]}
        title="Requisitions"
        description="Raise, track and approve purchase requests."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh requisitions" variant="shell" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Purchase_Requisitions')}
                title="Purchase Requisitions"
                statusColumn="status"
                statusColor={(_v, row) => exportStatusColor(String(row.status))}
              />
            )}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openEditor()}>New requisition</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Pending" tone="warning" value={stats.pending} loading={pending} unavailable={unavailable} selected={statusF === 'Pending'} onClick={() => setStatusF(statusF === 'Pending' ? ALL : 'Pending')} />
        <MetricTile compact label="Approved" tone="success" value={stats.approved} loading={pending} unavailable={unavailable} selected={statusF === 'Approved'} onClick={() => setStatusF(statusF === 'Approved' ? ALL : 'Approved')} />
        <MetricTile compact label="Critical" tone="danger" value={stats.critical} loading={pending} unavailable={unavailable} selected={priorityF === 'Critical'} onClick={() => setPriorityF(priorityF === 'Critical' ? ALL : 'Critical')} />
        <MetricTile compact label="Total value" value={formatCurrency(stats.value)} loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters} onClear={clearFilters}
        activeCount={[sectionF !== ALL, dateFrom !== '', dateTo !== ''].filter(Boolean).length}
        moreFilters={(
          <>
            <FilterField label="Section"><Select aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} /></FilterField>
            <FilterField label="From date"><Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></FilterField>
            <FilterField label="To date"><Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search requester, number, asset or item" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
        <Select className="w-40" aria-label="Filter by priority" value={priorityF} onValueChange={setPriorityF} options={[{ value: ALL, label: 'All priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="requisitions"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No requisitions match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="requisition" title="No requisitions yet" description="Create the first purchase requisition." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New requisition</Button>} />}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Requisition views">
            <TabsTrigger value="records" icon="requisition">Requisitions</TabsTrigger>
            <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="records" className="mt-5 flex flex-col gap-3">
            <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'requisition' : 'requisitions'}{filtered.length !== reqs.length ? ` of ${reqs.length}` : ''}</p>
            <DataTable
              caption="Purchase requisitions"
              rows={rows}
              columns={COLUMNS}
              getRowId={r => r.id}
              sort={sort}
              onSortChange={setSort}
              onRowActivate={setViewing}
              rowActions={r => (
                <RowActions subject={`requisition ${r.requisitionNumber}`} onEdit={() => openEditor(r)} onDelete={() => remove(r)} />
              )}
            />
          </TabsContent>
          <TabsContent value="analytics" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="By status" description="Count and value of the filtered requisitions" summary={`By status: ${byStatus.map(r => `${r.status} ${r.count} worth ${formatCurrency(r.value)}`).join('; ') || 'no data'}.`}>
              {byStatus.length === 0 ? <p className="py-4 font-sans text-body-sm text-ink-muted">No data</p> : (
                <ul className="flex flex-col gap-2">{byStatus.map(r => <li key={r.id} className="flex items-center justify-between gap-3"><StatusTag status={r.status} /><span className="font-sans text-body-sm tabular text-ink">{r.count} · {formatCurrency(r.value)}</span></li>)}</ul>
              )}
            </ChartPanel>
            <ChartPanel title="By priority" summary={`By priority: ${byPriority.map(r => `${r.name} ${r.value}`).join(', ') || 'no data'}.`}><Distribution rows={byPriority} /></ChartPanel>
            <ChartPanel title="Section split" summary={`By section: ${bySection.map(r => `${r.name} ${r.value} worth ${formatCurrency(r.cost)}`).join('; ')}.`}>
              <ul className="flex flex-col gap-2">{bySection.map(r => <li key={r.name} className="flex items-center justify-between gap-3"><SectionBadge section={r.name} /><span className="font-sans text-body-sm tabular text-ink">{r.value} · {formatCurrency(r.cost)}</span></li>)}</ul>
            </ChartPanel>
            <ChartPanel title="Value summary" summary={`Total ${formatCurrency(stats.value)}, average ${formatCurrency(stats.total ? stats.value / stats.total : 0)}, pending ${formatCurrency(sum(filtered.filter(r => r.status === 'Pending')))}, approved ${formatCurrency(sum(filtered.filter(r => r.status === 'Approved')))}.`}>
              <dl className="flex flex-col gap-2 font-sans text-body-sm">
                {[['Total filtered value', stats.value], ['Average per requisition', stats.total ? stats.value / stats.total : 0], ['Pending value', sum(filtered.filter(r => r.status === 'Pending'))], ['Approved value', sum(filtered.filter(r => r.status === 'Approved'))]].map(([label, v]) => (
                  <div key={label as string} className="flex justify-between gap-3"><dt className="text-ink-muted">{label as string}</dt><dd className="tabular text-ink">{formatCurrency(v as number)}</dd></div>
                ))}
              </dl>
            </ChartPanel>
          </TabsContent>
        </Tabs>
      </DataRegion>

      <DetailDialog req={viewing} onClose={() => setViewing(null)} onEdit={openEditor} onDelete={remove} />
      <ReqDialog req={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function RequisitionsPage() {
  return <AppShell migrated><RequisitionsContent /></AppShell>;
}
