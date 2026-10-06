// app/equipment/page.tsx — the equipment register: every asset with its status, location and details.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, Pagination, RecordCard, SearchField, Select, StatusBadge,
  Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference,
  type Column, type IconMeaning, type SortState, type Tone, FilterField,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { useLookupList } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { useApiList } from '@/lib/useApiList';
import { fmtDate } from '@/components/shared/utils';
import { EquipmentFormDialog } from './EquipmentFormDialog';
import { createEquipment, deleteEquipment, updateEquipment } from './api';
import { NO_EQUIPMENT_FILTERS, STATUSES, STATUS_LABELS, calcAge, countByStatus, filterEquipment, type EquipmentFilters } from './equipmentLogic';
import type { EquipmentItem } from './types';

const ALL = 'all';
const STATUS_META: Record<string, { tone: Tone; icon: IconMeaning }> = {
  operational: { tone: 'success', icon: 'active' }, maintenance: { tone: 'warning', icon: 'maintenance' }, out_of_service: { tone: 'danger', icon: 'breakdown' },
  reserved: { tone: 'info', icon: 'pending' }, retired: { tone: 'neutral', icon: 'inactive' },
};
const CRIT_TONE: Record<string, Tone> = { High: 'danger', Medium: 'warning', Low: 'neutral' };
const PAGE_SIZES = [12, 24, 48, 96].map(n => ({ value: String(n), label: `${n} per page` }));
const statusOf = (e: EquipmentItem) => (e.status || '').toLowerCase();
const StatusTag = ({ item }: { item: EquipmentItem }) => { const s = statusOf(item); const m = STATUS_META[s]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{STATUS_LABELS[s] ?? (item.status || 'Unknown')}</StatusBadge>; };
const dateText = (d?: string) => (d ? fmtDate(d) : '');

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'equipment_id', label: 'Equipment ID', width: 16 }, { key: 'name', label: 'Name', width: 28 }, { key: 'category', label: 'Category', width: 18 }, { key: 'status', label: 'Status', width: 16 },
  { key: 'location', label: 'Location', width: 18 }, { key: 'department', label: 'Department', width: 18 }, { key: 'model', label: 'Model', width: 20 }, { key: 'serial_number', label: 'Serial Number', width: 18 },
  { key: 'commission_date', label: 'Commission Date', width: 16, format: v => dateText(v as string) }, { key: 'purchase_cost', label: 'Purchase Cost', width: 16 }, { key: 'supplier', label: 'Supplier', width: 22 },
];
const EXPORT_PDF: DLColumn[] = [
  { key: 'equipment_id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }, { key: 'location', label: 'Location' },
  { key: 'department', label: 'Department' }, { key: 'model', label: 'Model' }, { key: 'serial_number', label: 'Serial No.' }, { key: 'commission_date', label: 'Commissioned', format: v => dateText(v as string) },
];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-sans text-body text-ink [overflow-wrap:anywhere]">{children || 'Not recorded'}</dd></div>;
}

function EquipmentContent() {
  const confirm = useConfirm();
  const list = useApiList<EquipmentItem>('/api/equipment');
  const items = list.items;
  const lookupLocations = useLookupList('location');
  const [view, setView] = useViewPreference('equipment', VIEW_CARDS_TABLE);
  const [f, setF] = useState<EquipmentFilters>(NO_EQUIPMENT_FILTERS);
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [viewingId, setViewingId] = useState<number | string | null>(null);
  const set = (patch: Partial<EquipmentFilters>) => { setF(p => ({ ...p, ...patch })); setPage(1); };

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean) as string[])].sort(), [items]);
  const locations = useMemo(() => [...new Set([...items.map(i => i.location).filter(Boolean) as string[], ...lookupLocations])].sort(), [items, lookupLocations]);
  const filtered = useMemo(() => filterEquipment(items, f), [items, f]);
  const ordered = useMemo(() => sortRows(filtered, sort ?? { id: 'name', direction: 'asc' }, (r, id) => String(r[id as keyof EquipmentItem] ?? '').toLowerCase()), [filtered, sort]);
  const pageRows = useMemo(() => ordered.slice((page - 1) * pageSize, page * pageSize), [ordered, page, pageSize]);
  const counts = useMemo(() => countByStatus(items), [items]);
  const viewing = useMemo(() => items.find(i => i.id === viewingId) ?? null, [items, viewingId]);
  const locationOptions = useMemo(() => locations, [locations]);

  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: filtered.length, transient: isTransientStatus(list.errorStatus) });
  const pending = list.loading && !list.loaded;
  const unavailable = !list.loaded && !list.loading;
  const tile = { loading: pending, unavailable };
  const hasFilters = JSON.stringify(f) !== JSON.stringify(NO_EQUIPMENT_FILTERS);
  const clear = () => { setF(NO_EQUIPMENT_FILTERS); setPage(1); };
  const statusTile = (s: string) => ({ selected: f.status === s, onClick: () => set({ status: f.status === s ? ALL : s }) });

  const openForm = (i: EquipmentItem | null) => { setViewingId(null); setEditing(i); setFormOpen(true); };
  const save = async (id: number | string | null, body: Record<string, unknown>) => {
    try { if (id === null) await createEquipment(body); else await updateEquipment(id, { id, ...body }); }
    catch (e) { throw new Error(`The equipment was not saved: ${(e as Error).message}`); }
    await list.refetch();
  };
  const remove = async (i: EquipmentItem) => {
    if (!await confirm({ title: `Delete ${i.name}?`, message: 'The asset is removed from the register. This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteEquipment(i.id); setViewingId(null); toast.success('Equipment deleted.'); await list.refetch(); }
    catch (e) { toast.error(`${i.name} was not deleted: ${(e as Error).message}`); }
  };

  const COLUMNS: Column<EquipmentItem>[] = [
    { id: 'name', header: 'Equipment', sortable: true, sticky: true, cell: i => <div><p className="font-medium text-ink">{i.name}</p><p className="font-mono text-caption text-ink-muted">{i.equipment_id}</p></div> },
    { id: 'category', header: 'Category', sortable: true, hideBelow: 'lg', cell: i => i.category || <span className="text-ink-muted">None</span> },
    { id: 'status', header: 'Status', sortable: true, cell: i => <StatusTag item={i} /> },
    { id: 'location', header: 'Location', sortable: true, hideBelow: 'md', cell: i => i.location || <span className="text-ink-muted">None</span> },
    { id: 'department', header: 'Department', sortable: true, hideBelow: 'lg', cell: i => i.department || <span className="text-ink-muted">None</span> },
    { id: 'model', header: 'Model', sortable: true, hideBelow: 'lg', cell: i => i.model || <span className="text-ink-muted">None</span> },
    { id: 'criticality', header: 'Criticality', hideBelow: 'md', cell: i => (i.criticality ? <StatusBadge tone={CRIT_TONE[i.criticality] ?? 'neutral'}>{i.criticality}</StatusBadge> : <span className="text-ink-muted">Not set</span>) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Equipment' }]}
        title="Equipment management"
        description="Every asset with its status, location and details."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh equipment" variant="ghost" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            {items.length > 0 && <DownloadButton data={items as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} pdfColumns={EXPORT_PDF} filename={exportFilename('Equipment_Register')} title="Equipment Register" />}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openForm(null)}>Add equipment</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total" value={items.length} selected={f.status === ALL} onClick={() => set({ status: ALL })} {...tile} />
        <MetricTile compact label="Operational" tone="success" value={counts.operational ?? 0} {...statusTile('operational')} {...tile} />
        <MetricTile compact label="Maintenance" tone={counts.maintenance ? 'warning' : 'default'} value={counts.maintenance ?? 0} {...statusTile('maintenance')} {...tile} />
        <MetricTile compact label="Out of service" tone={counts.out_of_service ? 'danger' : 'default'} value={counts.out_of_service ?? 0} {...statusTile('out_of_service')} {...tile} />
        <MetricTile compact label="Reserved" value={counts.reserved ?? 0} {...statusTile('reserved')} {...tile} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters} onClear={clear} activeCount={[f.category, f.location].filter(v => v !== ALL).length}
        trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}
        moreFilters={(
          <>
            <FilterField label="Category"><Select aria-label="Filter by category" value={f.category} onValueChange={v => set({ category: v })} options={[{ value: ALL, label: 'All categories' }, ...categories.map(c => ({ value: c, label: c }))]} /></FilterField>
            <FilterField label="Location"><Select aria-label="Filter by location" value={f.location} onValueChange={v => set({ location: v })} options={[{ value: ALL, label: 'All locations' }, ...locationOptions.map(l => ({ value: l, label: l }))]} /></FilterField>
          </>
        )}
      >
        <SearchField value={f.search} onValueChange={v => set({ search: v })} placeholder="Search name, ID, model, category or serial" wrapperClassName="min-w-56 max-w-md flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-44" aria-label="Filter by status" value={f.status} onValueChange={v => set({ status: v })} options={[{ value: ALL, label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))]} />
      </Toolbar>

      <DataRegion
        status={status} subject="equipment" error={list.error} onRetry={() => list.refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No equipment matches" description="Try a different search or filter." action={<Button onClick={clear}>Clear filters</Button>} />
          : <EmptyState icon="equipment" title="No equipment yet" description="Add the first asset to start the register." action={<Button variant="primary" icon="plus" onClick={() => openForm(null)}>Add equipment</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} of {items.length} items{hasFilters ? ' (filtered)' : ''}</p>
        {view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageRows.map(i => (
              <RecordCard
                key={i.id}
                eyebrow={<span className="font-mono">{i.equipment_id}{i.category ? <span className="font-sans"> · {i.category}</span> : null}</span>}
                title={i.name}
                status={<StatusTag item={i} />}
                facts={[
                  { label: 'Location', value: i.location || 'Not recorded' },
                  { label: 'Department', value: i.department || 'Not recorded' },
                  { label: 'Model', value: [i.manufacturer, i.model].filter(Boolean).join(' ') || 'Not recorded' },
                  ...(i.criticality ? [{ label: 'Criticality', value: <StatusBadge tone={CRIT_TONE[i.criticality] ?? 'neutral'}>{i.criticality}</StatusBadge> }] : []),
                  { label: 'Age', value: calcAge(i.commission_date) },
                ]}
                action={<span className="inline-flex gap-1"><IconButton icon="edit" size="sm" label={`Edit ${i.name}`} onClick={() => openForm(i)} /><IconButton icon="delete" variant="danger" size="sm" label={`Delete ${i.name}`} onClick={() => remove(i)} /></span>}
                onOpen={() => setViewingId(i.id)} openLabel={`View ${i.name}`}
              />
            ))}
          </div>
        ) : (
          <DataTable
            caption="Equipment register" rows={pageRows} columns={COLUMNS} getRowId={i => String(i.id)} sort={sort} onSortChange={s => { setSort(s); setPage(1); }}
            onRowActivate={i => setViewingId(i.id)}
            rowActions={i => <span className="inline-flex gap-1"><IconButton icon="edit" size="sm" label={`Edit ${i.name}`} onClick={() => openForm(i)} /><IconButton icon="delete" variant="danger" size="sm" label={`Delete ${i.name}`} onClick={() => remove(i)} /></span>}
          />
        )}
        {filtered.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} className="min-w-0 flex-1" />
            <Select className="w-36" aria-label="Items per page" value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }} options={PAGE_SIZES} />
          </div>
        )}
      </DataRegion>

      <Dialog
        open={!!viewing} onOpenChange={o => { if (!o) setViewingId(null); }} title={viewing?.name ?? 'Equipment'} description={viewing?.equipment_id} size="lg"
        footer={viewing && (<><Button variant="danger" icon="delete" onClick={() => remove(viewing)}>Delete</Button><Button onClick={() => setViewingId(null)}>Close</Button><Button variant="primary" icon="edit" onClick={() => openForm(viewing)}>Edit</Button></>)}
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2"><StatusTag item={viewing} />{viewing.criticality && <StatusBadge tone={CRIT_TONE[viewing.criticality] ?? 'neutral'}>{viewing.criticality} criticality</StatusBadge>}</div>
            {viewing.description && <p className="whitespace-pre-wrap rounded-control bg-surface-subtle p-3 font-sans text-body text-ink [overflow-wrap:anywhere]">{viewing.description}</p>}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Fact label="Category">{viewing.category}</Fact><Fact label="Location">{viewing.location}</Fact><Fact label="Department">{viewing.department}</Fact>
              <Fact label="Manufacturer">{viewing.manufacturer}</Fact><Fact label="Model">{viewing.model}</Fact><Fact label="Serial number">{viewing.serial_number}</Fact>
              <Fact label="Power rating">{viewing.power_rating}</Fact><Fact label="Commissioned">{dateText(viewing.commission_date)}</Fact><Fact label="Age">{calcAge(viewing.commission_date)}</Fact>
              <Fact label="Supplier">{viewing.supplier}</Fact><Fact label="Supplier contact">{viewing.supplier_contact}</Fact><Fact label="Supplier phone">{viewing.supplier_phone}</Fact>
              <Fact label="Warranty">{viewing.warranty_info}</Fact><Fact label="Maintenance interval">{viewing.maintenance_interval != null ? `${viewing.maintenance_interval} months` : ''}</Fact><Fact label="Purchase cost">{viewing.purchase_cost != null ? `$${viewing.purchase_cost}` : ''}</Fact>
            </dl>
            {viewing.specifications && <section><h3 className="font-sans text-label font-semibold text-ink">Specifications</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{viewing.specifications}</p></section>}
            {viewing.maintenance_notes && <section><h3 className="font-sans text-label font-semibold text-ink">Maintenance notes</h3><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{viewing.maintenance_notes}</p></section>}
          </div>
        )}
      </Dialog>
      <EquipmentFormDialog open={formOpen} item={editing} locations={locations} onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }} onSave={save} />
    </div>
  );
}

export default function EquipmentPage() {
  return <AppShell migrated><EquipmentContent /></AppShell>;
}
