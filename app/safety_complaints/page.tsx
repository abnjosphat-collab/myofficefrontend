// app/safety_complaints/page.tsx — Safety Complaints Register
'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, ChartPanel, DataRegion, DataTable, Dialog, Distribution, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Progress, SearchField, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toolbar, chartColor, chartTheme, deriveDataStatus, isTransientStatus, sortRows, type Column, type IconMeaning, type SortState, type Tone, FilterField, Fact, FactList } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { SuggestField } from '@/components/shared/SuggestField';
import { useLookupList } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { Complaint } from './types';
import { api, useSafetyComplaintsData } from './useSafetyComplaintsData';
import { exportStatusColor, priorityTone, statusTone } from '@/lib/status';
import { useConfirmDelete } from '@/lib/useConfirmDelete';

const CATEGORIES = ['Safety', 'Health', 'Environment', 'Quality', 'General', 'Other'];
const SECTIONS = ['Mechanical', 'Electrical', 'General'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['open', 'in-progress', 'closed', 'overdue'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ALL = '__all__';

const PRIORITY_META: Record<string, { tone: Tone; icon: IconMeaning }> = {
  critical: { tone: priorityTone('critical'), icon: 'critical' }, high: { tone: priorityTone('high'), icon: 'warning' }, medium: { tone: priorityTone('medium'), icon: 'info' }, low: { tone: priorityTone('low'), icon: 'flag' },
};
const STATUS_META: Record<string, { tone: Tone; icon: IconMeaning; label: string }> = {
  open: { tone: statusTone('open'), icon: 'warning', label: 'Open' }, 'in-progress': { tone: statusTone('in-progress'), icon: 'pending', label: 'In progress' },
  closed: { tone: statusTone('closed'), icon: 'closed', label: 'Closed' }, overdue: { tone: statusTone('overdue'), icon: 'overdue', label: 'Overdue' },
};

const StatusTag = ({ status }: { status: string }) => { const m = STATUS_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{m?.label ?? status}</StatusBadge>; };
const PriorityTag = ({ priority }: { priority: string }) => { const m = PRIORITY_META[priority]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{cap(priority)}</StatusBadge>; };

type Form = { date: string; raisedBy: string; issueRaised: string; category: string; priority: string; section: string; location: string; actionPlan: string; byWho: string; byWhen: string; supervisorName: string; supervisorSignature: string; status: string; dateClosed: string };
const emptyForm = (): Form => ({
  date: new Date().toISOString().slice(0, 10), raisedBy: '', issueRaised: '', category: 'General', priority: 'medium', section: 'General', location: '',
  actionPlan: '', byWho: '', byWhen: '', supervisorName: '', supervisorSignature: '', status: 'open', dateClosed: '',
});

function ComplaintDialog({ complaint, open, onOpenChange, onSaved }: { complaint?: Complaint; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const locations = useLookupList('location');
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(complaint?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(complaint ? {
        date: complaint.date, raisedBy: complaint.raisedBy || '', issueRaised: complaint.issueRaised, category: complaint.category || 'General', priority: complaint.priority || 'medium',
        section: complaint.section || 'General', location: complaint.location || '', actionPlan: complaint.actionPlan || '', byWho: complaint.byWho || '', byWhen: complaint.byWhen || '',
        supervisorName: complaint.supervisorName || '', supervisorSignature: complaint.supervisorSignature || '', status: complaint.status || 'open', dateClosed: complaint.dateClosed || '',
      } : emptyForm());
    }
  }
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));
  const submit = async () => {
    setTouched(true);
    if (!form.issueRaised.trim() || !form.date) return false;
    if (complaint) await api.update(complaint.id, form); else await api.create(form);
    toast.success(complaint ? 'Complaint updated.' : 'Complaint submitted.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={complaint ? 'Edit complaint' : 'New safety complaint'} description="The date and the issue raised are required." submitLabel={complaint ? 'Save changes' : 'Submit complaint'} onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date" required error={touched && !form.date ? 'Enter the date.' : undefined}><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Raised by" optional description="Leave blank if raised anonymously."><Input value={form.raisedBy} onChange={e => set('raisedBy', e.target.value)} placeholder="Name of the person raising it" /></Field></div>
        <div className="sm:col-span-3"><Field label="Issue raised" required error={touched && !form.issueRaised.trim() ? 'Describe the issue raised.' : undefined}><Textarea rows={3} value={form.issueRaised} onChange={e => set('issueRaised', e.target.value)} placeholder="Describe the safety complaint in detail" /></Field></div>
        <Field label="Category"><Select aria-label="Category" value={form.category} onValueChange={v => set('category', v)} options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Field>
        <Field label="Section"><Select aria-label="Section" value={form.section} onValueChange={v => set('section', v)} options={SECTIONS.map(s => ({ value: s, label: s }))} /></Field>
        <Field label="Priority"><Select aria-label="Priority" value={form.priority} onValueChange={v => set('priority', v)} options={[...PRIORITIES].reverse().map(p => ({ value: p, label: cap(p) }))} /></Field>
        <div className="sm:col-span-3">
          <Field label="Location" optional description="Choose a known place or type a new one.">
            <Input list="sc-locations" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Where was the complaint raised?" />
            <datalist id="sc-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
          </Field>
        </div>
        <div className="sm:col-span-3"><Field label="Action plan" optional><Textarea rows={2} value={form.actionPlan} onChange={e => set('actionPlan', e.target.value)} placeholder="Describe the corrective action plan" /></Field></div>
        <div className="sm:col-span-2"><Field label="Action by" optional><Input value={form.byWho} onChange={e => set('byWho', e.target.value)} placeholder="Responsible person" /></Field></div>
        <Field label="Due date" optional><Input type="date" value={form.byWhen} onChange={e => set('byWhen', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Foreman or supervisor" optional><SuggestField historyKey="handover_supervisor" placeholder="Supervisor or foreman name" value={form.supervisorName} onChange={v => set('supervisorName', v)} /></Field></div>
        <Field label="Signature (initials)" optional><Input value={form.supervisorSignature} onChange={e => set('supervisorSignature', e.target.value)} placeholder="For example, J.D." /></Field>
        <div className="sm:col-span-2"><Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set('status', v)} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} /></Field></div>
        <Field label="Date closed" optional><Input type="date" value={form.dateClosed} onChange={e => set('dateClosed', e.target.value)} /></Field>
      </div>
    </FormDialog>
  );
}

function DetailDialog({ complaint, onClose, onEdit, onDelete }: { complaint: Complaint | null; onClose: () => void; onEdit: (c: Complaint) => void; onDelete: (c: Complaint) => void }) {
  return (
    <Dialog
      open={!!complaint}
      onOpenChange={open => { if (!open) onClose(); }}
      title="Safety complaint"
      description={complaint ? `${complaint.category}, ${formatDate(complaint.date)}` : undefined}
      size="lg"
      footer={complaint && (
        <>
          <Button variant="danger" icon="delete" onClick={() => onDelete(complaint)}>Delete</Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon="edit" onClick={() => onEdit(complaint)}>Edit</Button>
        </>
      )}
    >
      {complaint && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2"><StatusTag status={complaint.status} /><PriorityTag priority={complaint.priority} /></div>
          <FactList>
            <Fact label="Date">{formatDate(complaint.date)}</Fact>
            <Fact label="Raised by">{complaint.raisedBy || 'Anonymous'}</Fact>
            <Fact label="Category">{complaint.category}</Fact>
            <Fact label="Section">{complaint.section || 'Not set'}</Fact>
            <Fact label="Location">{complaint.location || 'Not set'}</Fact>
            <Fact label="Action by">{complaint.byWho || 'Not assigned'}</Fact>
            <Fact label="Due date">{complaint.byWhen ? formatDate(complaint.byWhen) : 'Not set'}</Fact>
            <Fact label="Supervisor">{complaint.supervisorName || 'Not set'}{complaint.supervisorSignature ? ` (${complaint.supervisorSignature})` : ''}</Fact>
            {complaint.dateClosed && <Fact label="Date closed">{formatDate(complaint.dateClosed)}</Fact>}
          </FactList>
          <div><h3 className="font-sans text-caption text-ink-muted">Issue raised</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{complaint.issueRaised}</p></div>
          {complaint.actionPlan && <div><h3 className="font-sans text-caption text-ink-muted">Action plan</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink">{complaint.actionPlan}</p></div>}
        </div>
      )}
    </Dialog>
  );
}

const countBy = (items: Complaint[], pick: (c: Complaint) => string | null | undefined) => {
  const m = new Map<string, number>();
  for (const c of items) { const k = pick(c); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

const summarise = (rows: { name: string; value: number }[]) => rows.map(r => `${r.name} ${r.value}`).join(', ') || 'no data';

function Analytics({ items, closureRate, overdue }: { items: Complaint[]; closureRate: number; overdue: number }) {
  const trend = useMemo(() => {
    const m = new Map<string, { month: string; total: number; closed: number }>();
    for (const c of items) {
      if (!c.date) continue;
      const k = c.date.slice(0, 7);
      const e = m.get(k) ?? { month: k, total: 0, closed: 0 };
      e.total += 1; if (c.status === 'closed') e.closed += 1;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [items]);
  const byCategory = countBy(items, c => c.category);
  const byPriority = PRIORITIES.map(p => ({ name: cap(p), value: items.filter(c => c.priority === p).length })).filter(r => r.value > 0);
  const bySupervisor = countBy(items, c => c.supervisorName).slice(0, 8);
  const bySection = countBy(items, c => c.section);
  const closed = items.filter(c => c.status === 'closed').length;

  return (
    <div className="flex flex-col gap-4">
      {overdue > 0 && <Notice tone="warning" title={`${overdue} overdue ${overdue === 1 ? 'complaint needs' : 'complaints need'} attention`}>Overdue items are counted from their status.</Notice>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Closure rate" description="Share of the filtered complaints that are closed" summary={`${closureRate}% closed: ${closed} of ${items.length} complaints.`}>
          <Progress value={closureRate} label="Closure rate" />
          <p className="mt-2 font-sans text-body-sm text-ink-muted">{closed} closed of {items.length}</p>
        </ChartPanel>
        <ChartPanel title="Monthly trend" description="Last six months with complaints" summary={`Complaints per month: ${trend.map(t => `${t.month} ${t.total} raised, ${t.closed} closed`).join('; ') || 'no data'}.`}>
          {trend.length === 0 ? <p className="py-4 font-sans text-body-sm text-ink-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...chartTheme.tooltip} />
                <Legend wrapperStyle={chartTheme.legend} />
                <Bar dataKey="total" name="Raised" fill={chartColor(1)} radius={[6, 6, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill={chartColor(2)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
        <ChartPanel title="By category" summary={`Complaints by category: ${summarise(byCategory)}.`}><Distribution rows={byCategory} /></ChartPanel>
        <ChartPanel title="By priority" summary={`Complaints by priority: ${summarise(byPriority)}.`}><Distribution rows={byPriority} /></ChartPanel>
        <ChartPanel title="By supervisor or foreman" summary={`Complaints by supervisor: ${summarise(bySupervisor)}.`}><Distribution rows={bySupervisor} /></ChartPanel>
        <ChartPanel title="By section" summary={`Complaints by section: ${summarise(bySection)}.`}><Distribution rows={bySection} /></ChartPanel>
      </div>
    </div>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'raisedBy', label: 'Raised By', width: 18, format: v => (v as string) || 'Anonymous' },
  { key: 'issueRaised', label: 'Issue', width: 30 },
  { key: 'category', label: 'Category', width: 16 },
  { key: 'section', label: 'Section', width: 14 },
  { key: 'location', label: 'Location', width: 18 },
  { key: 'priority', label: 'Priority', width: 12 },
  { key: 'supervisorName', label: 'Supervisor', width: 18 },
  { key: 'byWho', label: 'Action By', width: 16 },
  { key: 'byWhen', label: 'By When', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'status', label: 'Status', width: 14 },
  { key: 'dateClosed', label: 'Date Closed', width: 14, format: v => (v ? formatDate(v as string) : '') },
];

function SafetyComplaintsContent() {
  const confirmDelete = useConfirmDelete();
  const { complaints, loading, loaded, error, errorStatus, refetch } = useSafetyComplaintsData();
  const [tab, setTab] = useState('records');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState(ALL);
  const [sectionF, setSectionF] = useState(ALL);
  const [priorityF, setPriorityF] = useState(ALL);
  const [categoryF, setCategoryF] = useState(ALL);
  const [byWhoF, setByWhoF] = useState(ALL);
  const [locationF, setLocationF] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<Complaint | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Complaint | null>(null);

  const byWhoOptions = useMemo(() => [...new Set(complaints.map(c => c.byWho).filter(Boolean))].sort(), [complaints]);
  const locationOptions = useMemo(() => [...new Set(complaints.map(c => c.location).filter(Boolean))].sort(), [complaints]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return complaints.filter(c =>
      (statusF === ALL || c.status === statusF) && (sectionF === ALL || c.section === sectionF) && (priorityF === ALL || c.priority === priorityF)
      && (categoryF === ALL || c.category === categoryF) && (byWhoF === ALL || c.byWho === byWhoF) && (locationF === ALL || c.location === locationF)
      && (!dateFrom || c.date >= dateFrom) && (!dateTo || c.date <= dateTo)
      && (!s || [c.issueRaised, c.raisedBy, c.supervisorName, c.byWho, c.location, c.category].some(v => (v || '').toLowerCase().includes(s))));
  }, [complaints, search, statusF, sectionF, priorityF, categoryF, byWhoF, locationF, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (c, id) => (id === 'priority' ? String(PRIORITIES.indexOf(c.priority)) : String(c[id as keyof Complaint] ?? '').toLowerCase())), [filtered, sort]);
  // Analytics and the tiles read the filtered list, so a filter picked on Records is visible everywhere.
  const stats = useMemo(() => {
    const n = (s: string) => filtered.filter(c => c.status === s).length;
    const closed = n('closed');
    return { total: filtered.length, open: n('open'), inProgress: n('in-progress'), closed, overdue: n('overdue'), rate: filtered.length ? Math.round((closed / filtered.length) * 100) : 0 };
  }, [filtered]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || [statusF, sectionF, priorityF, categoryF, byWhoF, locationF].some(f => f !== ALL) || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setStatusF(ALL); setSectionF(ALL); setPriorityF(ALL); setCategoryF(ALL); setByWhoF(ALL); setLocationF(ALL); setDateFrom(''); setDateTo(''); };
  const tileFilter = (s: string) => ({ selected: statusF === s, onClick: () => setStatusF(statusF === s ? ALL : s) });

  const openEditor = (c?: Complaint) => { setViewing(null); setEditing(c); setDialogOpen(true); };
  const remove = async (c: Complaint) => {
    await confirmDelete({ title: 'Delete this complaint?', message: `${c.category}, ${formatDate(c.date)}. This cannot be undone.`, what: 'The complaint', run: async () => { await api.remove(c.id); setViewing(null); }, done: 'Complaint deleted.', after: () => refetch() });
  };

  const COLUMNS: Column<Complaint>[] = [
    { id: 'date', header: 'Date', sortable: true, sticky: true, cell: c => <span className="whitespace-nowrap tabular">{formatDate(c.date)}</span> },
    { id: 'issueRaised', header: 'Issue', cell: c => <span className="line-clamp-2 max-w-[22rem]">{c.issueRaised}</span> },
    { id: 'category', header: 'Category', sortable: true, hideBelow: 'md', cell: c => c.category },
    { id: 'priority', header: 'Priority', sortable: true, cell: c => <PriorityTag priority={c.priority} /> },
    { id: 'raisedBy', header: 'Raised by', sortable: true, hideBelow: 'lg', cell: c => c.raisedBy || <span className="text-ink-muted">Anonymous</span> },
    { id: 'supervisorName', header: 'Supervisor', sortable: true, hideBelow: 'lg', cell: c => c.supervisorName || <span className="text-ink-muted">Not set</span> },
    { id: 'byWhen', header: 'Due', sortable: true, hideBelow: 'md', cell: c => (c.byWhen ? <span className="whitespace-nowrap tabular">{formatDate(c.byWhen)}</span> : <span className="text-ink-muted">Not set</span>) },
    { id: 'status', header: 'Status', sortable: true, cell: c => <StatusTag status={c.status} /> },
  ];

  const filterSelect = (id: string, label: string, options: string[], value: string, set: (v: string) => void) => (options.length > 0
    ? <FilterField label={label.replace('Filter by ', '').replace(/^./, c => c.toUpperCase())}><Select aria-label={label} value={value} onValueChange={set} options={[{ value: ALL, label: `All ${id}` }, ...options.map(o => ({ value: o, label: o }))]} /></FilterField> : null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Safety complaints' }]}
        title="Safety complaints"
        description="Register, track and resolve safety complaints with full accountability."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh complaints" variant="shell" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Safety_Complaints')}
                title="Safety Complaints"
                statusColumn="status"
                statusColor={(_v, row) => exportStatusColor(String(row.status))}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>New complaint</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Open" tone="danger" value={stats.open} loading={pending} unavailable={unavailable} {...tileFilter('open')} />
        <MetricTile compact label="In progress" tone="warning" value={stats.inProgress} loading={pending} unavailable={unavailable} {...tileFilter('in-progress')} />
        <MetricTile compact label="Closed" tone="success" value={stats.closed} loading={pending} unavailable={unavailable} {...tileFilter('closed')} />
        <MetricTile compact label="Overdue" tone="danger" value={stats.overdue} loading={pending} unavailable={unavailable} {...tileFilter('overdue')} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters} onClear={clearFilters}
        activeCount={[sectionF, categoryF, byWhoF, locationF].filter(v => v !== ALL).length + [dateFrom, dateTo].filter(v => v !== '').length}
        moreFilters={(
          <>
            <FilterField label="Section"><Select aria-label="Filter by section" value={sectionF} onValueChange={setSectionF} options={[{ value: ALL, label: 'All sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} /></FilterField>
            <FilterField label="Category"><Select aria-label="Filter by category" value={categoryF} onValueChange={setCategoryF} options={[{ value: ALL, label: 'All categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} /></FilterField>
            {filterSelect('responsible', 'Filter by responsible person', byWhoOptions, byWhoF, setByWhoF)}
            {filterSelect('locations', 'Filter by location', locationOptions, locationF, setLocationF)}
            <FilterField label="From date"><Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></FilterField>
            <FilterField label="To date"><Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search issue, person or location" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))]} />
        <Select className="w-40" aria-label="Filter by priority" value={priorityF} onValueChange={setPriorityF} options={[{ value: ALL, label: 'All priorities' }, ...PRIORITIES.map(p => ({ value: p, label: cap(p) }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="safety complaints"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No complaints match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
          : <EmptyState icon="flag" title="No safety complaints yet" description="Log the first complaint to start the register." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>New complaint</Button>} />}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Safety complaint views">
            <TabsTrigger value="records" icon="flag">Complaints register</TabsTrigger>
            <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="records" className="mt-5 flex flex-col gap-3">
            <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'complaint' : 'complaints'}{filtered.length !== complaints.length ? ` of ${complaints.length}` : ''}</p>
            <DataTable
              caption="Safety complaints"
              rows={rows}
              columns={COLUMNS}
              getRowId={c => c.id}
              sort={sort}
              onSortChange={setSort}
              onRowActivate={setViewing}
              rowActions={c => (
                <span className="inline-flex gap-1">
                  <IconButton icon="edit" size="sm" label={`Edit complaint of ${formatDate(c.date)}`} onClick={() => openEditor(c)} />
                  <IconButton icon="delete" variant="danger" size="sm" label={`Delete complaint of ${formatDate(c.date)}`} onClick={() => remove(c)} />
                </span>
              )}
            />
          </TabsContent>
          <TabsContent value="analytics" className="mt-5"><Analytics items={filtered} closureRate={stats.rate} overdue={stats.overdue} /></TabsContent>
        </Tabs>
      </DataRegion>

      <DetailDialog complaint={viewing} onClose={() => setViewing(null)} onEdit={openEditor} onDelete={remove} />
      <ComplaintDialog complaint={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function SafetyComplaintsPage() {
  return <AppShell migrated><SafetyComplaintsContent /></AppShell>;
}
