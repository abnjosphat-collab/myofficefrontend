// FILE: app/contractors/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, Input, MetricGrid, MetricTile, PageHeader, Progress, Rating,
  RecordCard, Segmented, Select, StatusBadge, Tag, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows,
  useViewPreference, type Column, type SortState,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { Contractor, CStatus, Job } from './types';
import { useContractorsData, createContractor } from './useContractorsData';

const TRADES = ['Mechanical', 'Electrical', 'Civil', 'OEM Specialist', 'Instrumentation', 'Scaffolding'];
const EMPTY_FORM = { company: '', trade: 'Mechanical', contact: '', phone: '', contractExpiry: '', insuranceExpiry: '' };
const STATUS_OPTIONS: { value: 'all' | CStatus; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Expiry date with a status badge once it is within 30 days (or past). Blank dates show a dash. */
function Expiry({ date }: { date: string }) {
  if (!date) return <span className="text-ink-muted">Not set</span>;
  const days = daysUntil(date);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="tabular">{date}</span>
      {days < 0 ? <StatusBadge tone="danger" icon="expired">Expired</StatusBadge> : days < 30 ? <StatusBadge tone="warning" icon="due-soon">Due in {plural(days, 'day')}</StatusBadge> : null}
    </span>
  );
}

const StatusTag = ({ status }: { status: CStatus }) => <StatusBadge tone={status === 'active' ? 'success' : 'neutral'} icon={status === 'active' ? 'active' : 'inactive'}>{status === 'active' ? 'Active' : 'Inactive'}</StatusBadge>;

function JobsList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return <p className="font-sans text-body-sm text-ink-muted">No active jobs.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {jobs.map((job, index) => (
        <li key={index} className="rounded-control border border-line-subtle bg-surface-subtle p-3">
          <p className="font-sans text-label font-medium text-ink">{job.title}</p>
          <p className="mb-2 font-sans text-caption text-ink-muted">{[job.location, job.startDate && `Started ${job.startDate}`].filter(Boolean).join(' · ')}</p>
          <Progress value={job.progress} label={`${job.title} progress`} />
        </li>
      ))}
    </ul>
  );
}

function ContractorDetails({ contractor, onClose }: { contractor: Contractor | null; onClose: () => void }) {
  return (
    <Dialog open={contractor !== null} onOpenChange={open => { if (!open) onClose(); }} title={contractor?.company ?? 'Contractor'} description={contractor ? [contractor.trade, contractor.contact].filter(Boolean).join(' · ') : undefined} size="md">
      {contractor && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 font-sans text-body sm:grid-cols-2">
            <div><dt className="text-caption text-ink-muted">Status</dt><dd className="mt-1"><StatusTag status={contractor.status} /></dd></div>
            <div><dt className="text-caption text-ink-muted">Rating</dt><dd className="mt-1 flex items-center gap-2"><Rating value={contractor.rating} /><span className="text-ink-muted">{contractor.rating} of 5</span></dd></div>
            <div><dt className="text-caption text-ink-muted">Phone</dt><dd className="mt-1 text-ink">{contractor.phone || 'Not set'}</dd></div>
            <div><dt className="text-caption text-ink-muted">Trade</dt><dd className="mt-1 text-ink">{contractor.trade || 'Unspecified'}</dd></div>
            <div><dt className="text-caption text-ink-muted">Contract expiry</dt><dd className="mt-1 text-ink"><Expiry date={contractor.contractExpiry} /></dd></div>
            <div><dt className="text-caption text-ink-muted">Insurance expiry</dt><dd className="mt-1 text-ink"><Expiry date={contractor.insuranceExpiry} /></dd></div>
          </dl>
          <section>
            <h3 className="mb-2 font-display text-title font-semibold text-ink">Active jobs</h3>
            <JobsList jobs={contractor.jobs} />
          </section>
        </div>
      )}
    </Dialog>
  );
}

function ContractorCard({ contractor, onOpen }: { contractor: Contractor; onOpen: () => void }) {
  return (
    <RecordCard
      eyebrow={contractor.trade || 'Unspecified trade'}
      title={contractor.company}
      subtitle={contractor.contact}
      status={<StatusTag status={contractor.status} />}
      facts={[
        { label: 'Rating', value: <Rating value={contractor.rating} /> },
        { label: 'Contract', value: <Expiry date={contractor.contractExpiry} /> },
        { label: 'Insurance', value: <Expiry date={contractor.insuranceExpiry} /> },
      ]}
      meta={plural(contractor.jobs.length, 'active job')}
      onOpen={onOpen}
      openLabel={`Open ${contractor.company}`}
    />
  );
}

const COLUMNS: Column<Contractor>[] = [
  { id: 'company', header: 'Company', sortable: true, sticky: true, cell: c => c.company },
  { id: 'trade', header: 'Trade', sortable: true, hideBelow: 'md', cell: c => (c.trade ? <Tag>{c.trade}</Tag> : <span className="text-ink-muted">Unspecified</span>) },
  { id: 'contact', header: 'Contact', hideBelow: 'lg', cell: c => <span>{c.contact}<span className="block text-caption text-ink-muted">{c.phone}</span></span> },
  { id: 'status', header: 'Status', sortable: true, cell: c => <StatusTag status={c.status} /> },
  { id: 'rating', header: 'Rating', sortable: true, hideBelow: 'md', cell: c => <Rating value={c.rating} /> },
  { id: 'contractExpiry', header: 'Contract expiry', sortable: true, hideBelow: 'lg', cell: c => <Expiry date={c.contractExpiry} /> },
  { id: 'jobs', header: 'Jobs', numeric: true, sortable: true, cell: c => c.jobs.length },
];

const sortValue = (c: Contractor, id: string): unknown => {
  switch (id) {
    case 'jobs': return c.jobs.length;
    case 'company': case 'trade': case 'status': return String(c[id as 'company' | 'trade' | 'status']).toLowerCase();
    default: return c[id as keyof Contractor];
  }
};

const exportColumns: DLColumn[] = [
  { key: 'company', label: 'Company', width: 24 },
  { key: 'trade', label: 'Trade', width: 18 },
  { key: 'contact', label: 'Contact', width: 20 },
  { key: 'phone', label: 'Phone', width: 16 },
  { key: 'status', label: 'Status', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'rating', label: 'Rating', width: 10 },
  { key: 'contractExpiry', label: 'Contract Expiry', width: 16 },
  { key: 'insuranceExpiry', label: 'Insurance Expiry', width: 16 },
  { key: 'jobs', label: 'Active Jobs', width: 12, format: v => String((v as unknown[])?.length ?? 0) },
];

function AddContractorDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [needsCompany, setNeedsCompany] = useState(false);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(current => ({ ...current, ...patch }));

  const submit = async () => {
    if (!form.company.trim()) { setNeedsCompany(true); return false; }
    await createContractor({
      company_name: form.company, trade: form.trade, contact_name: form.contact, phone: form.phone,
      contract_end: form.contractExpiry || null, insurance_expiry: form.insuranceExpiry || null, status: 'active', performance_rating: 3,
    });
    toast.success(`${form.company} was added.`);
    setForm(EMPTY_FORM);
    onCreated();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add contractor" description="New contractors start as active with a rating of 3." submitLabel="Save contractor" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={needsCompany ? 'Enter the company name.' : undefined}>
          <Input value={form.company} onChange={event => { set({ company: event.target.value }); setNeedsCompany(false); }} autoComplete="organization" />
        </Field>
        <Field label="Trade">
          <Select aria-label="Trade" value={form.trade} onValueChange={trade => set({ trade })} options={TRADES.map(trade => ({ value: trade, label: trade }))} />
        </Field>
        <Field label="Contact person"><Input value={form.contact} onChange={event => set({ contact: event.target.value })} autoComplete="name" /></Field>
        <Field label="Phone"><Input type="tel" value={form.phone} onChange={event => set({ phone: event.target.value })} autoComplete="tel" /></Field>
        <Field label="Contract expiry" optional><Input type="date" value={form.contractExpiry} onChange={event => set({ contractExpiry: event.target.value })} /></Field>
        <Field label="Insurance expiry" optional><Input type="date" value={form.insuranceExpiry} onChange={event => set({ insuranceExpiry: event.target.value })} /></Field>
      </div>
    </FormDialog>
  );
}

function ContractorsContent() {
  const { contractors, loading, loaded, error, errorStatus, fetchContractors } = useContractorsData();
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CStatus>('all');
  const [view, setView] = useViewPreference('contractors', VIEW_CARDS_TABLE);
  const [sort, setSort] = useState<SortState>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const displayed = useMemo(
    () => contractors.filter(c => tradeFilter === 'all' || c.trade === tradeFilter).filter(c => statusFilter === 'all' || c.status === statusFilter),
    [contractors, tradeFilter, statusFilter],
  );
  const tableRows = useMemo(() => sortRows(displayed, sort, sortValue), [displayed, sort]);

  // Grouped by trade for the card view: alphabetical, "Unspecified" last.
  const groups = useMemo(() => {
    const map = new Map<string, Contractor[]>();
    for (const c of displayed) {
      const key = c.trade || 'Unspecified';
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'Unspecified' ? 1 : b === 'Unspecified' ? -1 : a.localeCompare(b)));
  }, [displayed]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: displayed.length, transient: isTransientStatus(errorStatus) });
  const filtered = tradeFilter !== 'all' || statusFilter !== 'all';
  const stats = {
    total: contractors.length,
    active: contractors.filter(c => c.status === 'active').length,
    inactive: contractors.filter(c => c.status === 'inactive').length,
    jobs: contractors.reduce((sum, c) => sum + c.jobs.length, 0),
  };
  const open = contractors.find(c => c.id === openId) ?? null;
  const unavailable = !loaded;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Contractors' }]}
        title="Contractors"
        description="Third-party contractor register and job tracking."
        actions={(
          <>
            {displayed.length > 0 && (
              <DownloadButton
                data={displayed as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Contractors')}
                title="Contractors"
                statusColumn="status"
                statusColor={(_v, row) => (row.status === 'active' ? '34d399' : '94a3b8')}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add contractor</Button>
          </>
        )}
      />

      <MetricGrid columns={4}>
        <MetricTile label="Total contractors" icon="contractor" value={stats.total} loading={loading && !loaded} unavailable={unavailable && !loading} />
        <MetricTile label="Active" icon="active" value={stats.active} tone="success" loading={loading && !loaded} unavailable={unavailable && !loading} />
        <MetricTile label="Inactive" icon="inactive" value={stats.inactive} loading={loading && !loaded} unavailable={unavailable && !loading} />
        <MetricTile label="Current jobs" icon="task" value={stats.jobs} loading={loading && !loaded} unavailable={unavailable && !loading} />
      </MetricGrid>

      <Toolbar trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <Select className="w-52" aria-label="Filter by trade" value={tradeFilter} onValueChange={setTradeFilter} options={[{ value: 'all', label: 'All trades' }, ...TRADES.map(trade => ({ value: trade, label: trade }))]} />
        <Segmented label="Status" value={statusFilter} onValueChange={setStatusFilter} options={STATUS_OPTIONS} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="contractors"
        error={error}
        onRetry={fetchContractors}
        empty={filtered
          ? <EmptyState icon="search" title="No contractors match these filters" description="Try a different trade or status." action={<Button onClick={() => { setTradeFilter('all'); setStatusFilter('all'); }}>Clear filters</Button>} />
          : <EmptyState icon="contractor" title="No contractors yet" description="Add the first contractor to start the register." action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add contractor</Button>} />}
      >
        {view === 'cards' ? (
          <div className="flex flex-col gap-6">
            {groups.map(([trade, items]) => (
              <section key={trade} aria-labelledby={`trade-${trade}`}>
                <h2 id={`trade-${trade}`} className="mb-3 font-display text-section font-semibold text-ink">{trade}<span className="ml-2 font-sans text-label font-normal text-ink-muted">{plural(items.length, 'contractor')}</span></h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(contractor => <ContractorCard key={contractor.id} contractor={contractor} onOpen={() => setOpenId(contractor.id)} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <DataTable
            caption="Contractor register"
            rows={tableRows}
            columns={COLUMNS}
            getRowId={c => String(c.id)}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={c => setOpenId(c.id)}
            rowActions={c => <Button size="sm" variant="ghost" onClick={() => setOpenId(c.id)}>Details</Button>}
          />
        )}
      </DataRegion>

      <ContractorDetails contractor={open} onClose={() => setOpenId(null)} />
      <AddContractorDialog open={adding} onOpenChange={setAdding} onCreated={fetchContractors} />
    </div>
  );
}

export default function ContractorsPage() {
  return <AppShell migrated><ContractorsContent /></AppShell>;
}
