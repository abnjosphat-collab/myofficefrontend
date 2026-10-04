// FILE: app/compliance-register/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { SuggestField } from '@/components/shared/SuggestField';
import {
  Button, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, Segmented,
  StatusBadge, Tag, Toolbar, deriveDataStatus, isTransientStatus, sortRows, type Column, type SortState, type Tone,
} from '@/components/ui-system';
import { useModuleData } from '@/lib/useModuleData';
import { daysUntil } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { Status, ComplianceItem } from './types';

const STATUS_META: Record<Status, { label: string; tone: Tone; icon: 'valid' | 'due-soon' | 'overdue'; hex: string }> = {
  current: { label: 'Current', tone: 'success', icon: 'valid', hex: '#34d399' },
  due_soon: { label: 'Due soon', tone: 'warning', icon: 'due-soon', hex: '#fbbf24' },
  overdue: { label: 'Overdue', tone: 'danger', icon: 'overdue', hex: '#fb7185' },
};
const FILTERS: { value: Status | 'all'; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }, { value: 'due_soon', label: 'Due soon' }, { value: 'overdue', label: 'Overdue' }];
const EMPTY_FORM = { equipment_name: '', inspection_type: '', regulatory_body: '', certificate_no: '', expiry_date: '', responsible: '', notes: '' };

const exportColumns: DLColumn[] = [
  { key: 'equipment_name', label: 'Equipment', width: 24 },
  { key: 'inspection_type', label: 'Inspection Type', width: 20 },
  { key: 'regulatory_body', label: 'Regulatory Body', width: 20 },
  { key: 'certificate_no', label: 'Certificate No.', width: 18 },
  { key: 'expiry_date', label: 'Expiry', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'days', label: 'Days', width: 10, format: (_v, row) => (row.expiry_date ? String(daysUntil(row.expiry_date as string)) : '') },
  { key: 'status', label: 'Status', width: 14, format: v => STATUS_META[v as Status].label },
  { key: 'responsible', label: 'Responsible', width: 20 },
];

/** "12 days left", "Due today" or "3 days overdue": a text value, with colour only as reinforcement. */
function DaysLeft({ expiry }: { expiry: string }) {
  if (!expiry) return <span className="text-ink-muted">Not set</span>;
  const days = daysUntil(expiry);
  const tone = days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-success';
  const text = days < 0 ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue` : days === 0 ? 'Due today' : `${days} ${days === 1 ? 'day' : 'days'} left`;
  return <span className={`font-medium tabular ${tone}`}>{text}</span>;
}

const sortValue = (item: ComplianceItem, id: string): unknown => {
  switch (id) {
    case 'days': return item.expiry_date ? daysUntil(item.expiry_date) : null;
    case 'expiry_date': return item.expiry_date;
    default: return String(item[id as keyof ComplianceItem] ?? '').toLowerCase();
  }
};

const COLUMNS: Column<ComplianceItem>[] = [
  { id: 'equipment_name', header: 'Equipment', sortable: true, sticky: true, cell: i => i.equipment_name },
  { id: 'inspection_type', header: 'Inspection type', sortable: true, hideBelow: 'md', cell: i => i.inspection_type },
  { id: 'regulatory_body', header: 'Regulatory body', hideBelow: 'lg', cell: i => (i.regulatory_body ? <Tag>{i.regulatory_body}</Tag> : null) },
  { id: 'certificate_no', header: 'Certificate no.', hideBelow: 'lg', cell: i => <span className="font-mono text-caption text-ink-muted">{i.certificate_no}</span> },
  { id: 'expiry_date', header: 'Expiry', sortable: true, cell: i => <span className="tabular whitespace-nowrap">{i.expiry_date ? formatDate(i.expiry_date) : 'Not set'}</span> },
  { id: 'days', header: 'Time left', sortable: true, cell: i => <DaysLeft expiry={i.expiry_date} /> },
  { id: 'status', header: 'Status', sortable: true, cell: i => <StatusBadge tone={STATUS_META[i.status].tone} icon={STATUS_META[i.status].icon}>{STATUS_META[i.status].label}</StatusBadge> },
  { id: 'responsible', header: 'Responsible', sortable: true, hideBelow: 'md', cell: i => i.responsible },
];

function AddItemDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (form: typeof EMPTY_FORM) => Promise<void> }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(current => ({ ...current, ...patch }));

  const submit = async () => {
    setTouched(true);
    if (!form.equipment_name.trim() || !form.expiry_date) return false;
    await onCreate(form);
    setForm(EMPTY_FORM);
    setTouched(false);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add compliance item" description="Equipment name and expiry date are required." submitLabel="Add to register" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Equipment name" required error={touched && !form.equipment_name.trim() ? 'Enter the equipment name.' : undefined}>
          <Input value={form.equipment_name} onChange={event => set({ equipment_name: event.target.value })} />
        </Field>
        <Field label="Inspection type">
          <SuggestField historyKey="compliance_inspection_type" placeholder="For example, pressure vessel test" value={form.inspection_type} onChange={value => set({ inspection_type: value })} />
        </Field>
        <Field label="Regulatory body">
          <SuggestField historyKey="compliance_regulatory_body" placeholder="For example, DMRE" value={form.regulatory_body} onChange={value => set({ regulatory_body: value })} />
        </Field>
        <Field label="Certificate number"><Input value={form.certificate_no} onChange={event => set({ certificate_no: event.target.value })} /></Field>
        <Field label="Expiry date" required error={touched && !form.expiry_date ? 'Choose the expiry date.' : undefined}>
          <Input type="date" value={form.expiry_date} onChange={event => set({ expiry_date: event.target.value })} />
        </Field>
        <Field label="Responsible person"><Input value={form.responsible} onChange={event => set({ responsible: event.target.value })} autoComplete="name" /></Field>
      </div>
    </FormDialog>
  );
}

function ComplianceRegisterContent() {
  const { data: records, loading, error, create, refetch } = useModuleData<ComplianceItem>('compliance');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<SortState>(null);

  // useModuleData reports failures as "<HTTP status>: <body>"; recover the status so 401/403 and
  // transient failures are told apart. A failed request must never read as "nothing registered".
  const errorStatus = error ? Number(error.match(/^(\d{3})\b/)?.[1]) || null : null;
  const loaded = records.length > 0 || (!loading && !error);
  const displayed = useMemo(() => (filter === 'all' ? records : records.filter(i => i.status === filter)), [records, filter]);
  const rows = useMemo(() => sortRows(displayed, sort, sortValue), [displayed, sort]);
  const counts = { current: records.filter(i => i.status === 'current').length, due_soon: records.filter(i => i.status === 'due_soon').length, overdue: records.filter(i => i.status === 'overdue').length };
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: displayed.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;

  const createItem = async (form: typeof EMPTY_FORM) => {
    await create(form);
    toast.success(`${form.equipment_name} was added to the register.`);
    refetch();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Compliance register' }]}
        title="Statutory compliance register"
        description="Regulatory certificates and inspection tracking."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh register" variant="outline" pending={loading && loaded} onClick={() => refetch()} />
            {displayed.length > 0 && (
              <DownloadButton
                data={displayed as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Compliance_Register')}
                title="Statutory Compliance Register"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_META[row.status as Status]?.hex.replace('#', '')}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add item</Button>
          </>
        )}
      />

      <MetricGrid columns={3}>
        <MetricTile label="Current" icon="valid" tone="success" value={counts.current} loading={pending} unavailable={unavailable} selected={filter === 'current'} onClick={() => setFilter(filter === 'current' ? 'all' : 'current')} />
        <MetricTile label="Due soon" icon="due-soon" tone="warning" value={counts.due_soon} loading={pending} unavailable={unavailable} selected={filter === 'due_soon'} onClick={() => setFilter(filter === 'due_soon' ? 'all' : 'due_soon')} />
        <MetricTile label="Overdue" icon="overdue" tone="danger" value={counts.overdue} loading={pending} unavailable={unavailable} selected={filter === 'overdue'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} />
      </MetricGrid>

      <Toolbar>
        <Segmented label="Status" value={filter} onValueChange={setFilter} options={FILTERS} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="compliance items"
        error={error}
        onRetry={() => refetch()}
        empty={filter !== 'all'
          ? <EmptyState icon="search" title={`No ${STATUS_META[filter as Status].label.toLowerCase()} items`} description="Choose a different status to see other items." action={<Button onClick={() => setFilter('all')}>Show all</Button>} />
          : <EmptyState icon="compliance" title="Nothing registered yet" description="Add the first certificate or inspection to start tracking expiry dates." action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add item</Button>} />}
      >
        <DataTable caption="Statutory compliance items" rows={rows} columns={COLUMNS} getRowId={i => String(i.id)} sort={sort} onSortChange={setSort} />
      </DataRegion>

      <AddItemDialog open={adding} onOpenChange={setAdding} onCreate={createItem} />
    </div>
  );
}

export default function ComplianceRegisterPage() {
  return (
    <AppShell migrated>
      <ComplianceRegisterContent />
    </AppShell>
  );
}
