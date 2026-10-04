// app/inventory/page.tsx
"use client";

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Progress, RecordCard,
  Segmented, SearchField, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, sortRows, useConfirm, useViewPreference,
  type Column, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { InventoryItem } from './types';
import { stockStatus, useInventoryData } from './useInventoryData';

type StockStatus = ReturnType<typeof stockStatus>;
const STATUS: Record<StockStatus, { label: string; tone: Tone; icon: 'valid' | 'low-stock' | 'out-of-stock'; hex: string }> = {
  'in-stock': { label: 'In stock', tone: 'success', icon: 'valid', hex: '34d399' },
  'low-stock': { label: 'Low stock', tone: 'warning', icon: 'low-stock', hex: 'f59e0b' },
  'out-of-stock': { label: 'Out of stock', tone: 'danger', icon: 'out-of-stock', hex: 'f43f5e' },
};
const STATUS_FILTERS: { value: 'all' | StockStatus; label: string }[] = [{ value: 'all', label: 'All' }, ...(Object.keys(STATUS) as StockStatus[]).map(s => ({ value: s, label: STATUS[s].label }))];
const ALL = '__all__';
const EMPTY_FORM = { name: '', sku: '', category: '', description: '', currentStock: '0', minStock: '0', maxStock: '0', unit: 'pcs', cost: '0', supplier: '', location: '' };

const StatusTag = ({ item }: { item: InventoryItem }) => { const s = STATUS[stockStatus(item)]; return <StatusBadge tone={s.tone} icon={s.icon}>{s.label}</StatusBadge>; };
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const stockPct = (i: InventoryItem) => (i.maxStock > 0 ? Math.min(100, Math.round((i.currentStock / i.maxStock) * 100)) : 0);
const wholeNumber = (text: string) => text.trim() !== '' && Number.isInteger(Number(text)) && Number(text) >= 0;

const exportColumns: DLColumn[] = [
  { key: 'name', label: 'Item', width: 24 }, { key: 'sku', label: 'SKU', width: 16 }, { key: 'category', label: 'Category', width: 16 },
  { key: 'currentStock', label: 'Current Stock', width: 14 }, { key: 'minStock', label: 'Min Stock', width: 12 }, { key: 'maxStock', label: 'Max Stock', width: 12 },
  { key: 'unit', label: 'Unit', width: 10 }, { key: 'cost', label: 'Unit Cost', width: 12 }, { key: 'supplier', label: 'Supplier', width: 20 }, { key: 'location', label: 'Location', width: 18 },
  { key: 'status', label: 'Status', width: 14, format: (_v, row) => STATUS[stockStatus(row as unknown as InventoryItem)].label },
  { key: 'lastRestocked', label: 'Last Restocked', width: 16, format: v => (v ? formatDate(v as string) : '') },
];

function ItemDialog({ item, existing, open, onOpenChange, onSave }: { item: InventoryItem | null; existing: readonly InventoryItem[]; open: boolean; onOpenChange: (open: boolean) => void; onSave: (item: InventoryItem) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  // Load the form when the dialog opens for a different item (or for a new one).
  const key = open ? (item?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(item ? { name: item.name, sku: item.sku, category: item.category, description: item.description, currentStock: String(item.currentStock), minStock: String(item.minStock), maxStock: String(item.maxStock), unit: item.unit, cost: String(item.cost), supplier: item.supplier, location: item.location } : EMPTY_FORM);
    }
  }
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(current => ({ ...current, ...patch }));

  const duplicateSku = existing.some(i => i.id !== item?.id && i.sku.trim().toLowerCase() === form.sku.trim().toLowerCase() && form.sku.trim() !== '');
  const errors = {
    name: form.name.trim() ? undefined : 'Enter the item name.',
    sku: !form.sku.trim() ? 'Enter the SKU.' : duplicateSku ? 'Another item already uses this SKU.' : undefined,
    currentStock: wholeNumber(form.currentStock) ? undefined : 'Enter a whole number, 0 or more.',
    minStock: wholeNumber(form.minStock) ? undefined : 'Enter a whole number, 0 or more.',
    maxStock: wholeNumber(form.maxStock) ? undefined : 'Enter a whole number, 0 or more.',
    cost: form.cost.trim() !== '' && Number.isFinite(Number(form.cost)) && Number(form.cost) >= 0 ? undefined : 'Enter an amount, 0 or more.',
  };
  const show = (field: keyof typeof errors) => (touched ? errors[field] : undefined);

  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return false;
    const currentStock = Number(form.currentStock);
    const restocked = !item || currentStock > item.currentStock;
    onSave({
      ...(item ?? { id: `inv-${Date.now()}`, status: 'in-stock', lastRestocked: new Date().toISOString() }),
      name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim(), description: form.description.trim(),
      currentStock, minStock: Number(form.minStock), maxStock: Number(form.maxStock), unit: form.unit.trim() || 'pcs',
      cost: Number(form.cost), supplier: form.supplier.trim(), location: form.location.trim(),
      status: stockStatus({ currentStock, minStock: Number(form.minStock) }),
      // A higher stock level than before counts as a restock.
      lastRestocked: restocked ? new Date().toISOString() : item!.lastRestocked,
    });
    toast.success(`${form.name.trim()} was saved.`);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={item ? 'Edit item' : 'Add item'} description="Name and SKU are required." submitLabel={item ? 'Save changes' : 'Add item'} onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item name" required error={show('name')}><Input value={form.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="SKU" required error={show('sku')}><Input value={form.sku} onChange={e => set({ sku: e.target.value })} /></Field>
        <Field label="Category" optional><Input value={form.category} onChange={e => set({ category: e.target.value })} /></Field>
        <Field label="Supplier" optional><Input value={form.supplier} onChange={e => set({ supplier: e.target.value })} /></Field>
        <Field label="Current stock" required error={show('currentStock')}><Input inputMode="numeric" value={form.currentStock} onChange={e => set({ currentStock: e.target.value })} /></Field>
        <Field label="Unit"><Input value={form.unit} onChange={e => set({ unit: e.target.value })} /></Field>
        <Field label="Reorder level" required description="Low stock is flagged at or below this level." error={show('minStock')}><Input inputMode="numeric" value={form.minStock} onChange={e => set({ minStock: e.target.value })} /></Field>
        <Field label="Maximum stock" required error={show('maxStock')}><Input inputMode="numeric" value={form.maxStock} onChange={e => set({ maxStock: e.target.value })} /></Field>
        <Field label="Unit cost" required error={show('cost')}><Input inputMode="decimal" value={form.cost} onChange={e => set({ cost: e.target.value })} /></Field>
        <Field label="Location" optional><Input value={form.location} onChange={e => set({ location: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Description" optional><Textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })} /></Field></div>
      </div>
    </FormDialog>
  );
}

function InventoryPageContent() {
  const confirm = useConfirm();
  const { inventory, upsertItem, deleteItem } = useInventoryData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [category, setCategory] = useState(ALL);
  const [supplier, setSupplier] = useState(ALL);
  const [view, setView] = useViewPreference('inventory', VIEW_CARDS_TABLE);
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const categories = useMemo(() => [...new Set(inventory.map(i => i.category).filter(Boolean))].sort(), [inventory]);
  const suppliers = useMemo(() => [...new Set(inventory.map(i => i.supplier).filter(Boolean))].sort(), [inventory]);
  const counts = useMemo(() => ({
    total: inventory.length,
    inStock: inventory.filter(i => stockStatus(i) === 'in-stock').length,
    lowStock: inventory.filter(i => stockStatus(i) === 'low-stock').length,
    outOfStock: inventory.filter(i => stockStatus(i) === 'out-of-stock').length,
    value: inventory.reduce((sum, i) => sum + i.currentStock * i.cost, 0),
  }), [inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter(item =>
      (!q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q))
      && (statusFilter === 'all' || stockStatus(item) === statusFilter)
      && (category === ALL || item.category === category)
      && (supplier === ALL || item.supplier === supplier));
  }, [inventory, search, statusFilter, category, supplier]);
  const rows = useMemo(() => sortRows(filtered, sort, (i, id) => (id === 'status' ? stockStatus(i) : typeof i[id as keyof InventoryItem] === 'string' ? String(i[id as keyof InventoryItem]).toLowerCase() : i[id as keyof InventoryItem])), [filtered, sort]);
  const hasFilters = !!search || statusFilter !== 'all' || category !== ALL || supplier !== ALL;

  const openEditor = (item: InventoryItem | null) => { setEditing(item); setDialogOpen(true); };
  const remove = async (item: InventoryItem) => {
    if (!await confirm({ title: `Delete ${item.name}?`, message: 'This removes the item from this browser. It cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    try { deleteItem(item.id); toast.success(`${item.name} was deleted.`); } catch (e) { toast.error(e instanceof Error ? e.message : 'The item could not be deleted.'); }
  };
  const save = (item: InventoryItem) => upsertItem(item);

  const rowActions = (item: InventoryItem) => (
    <span className="inline-flex gap-1">
      <IconButton icon="edit" label={`Edit ${item.name}`} size="sm" onClick={() => openEditor(item)} />
      <IconButton icon="delete" label={`Delete ${item.name}`} size="sm" variant="danger" onClick={() => remove(item)} />
    </span>
  );

  // The card itself opens the editor, so its own action is only Delete (no duplicate "Edit" control).
  const cardActions = (item: InventoryItem) => <IconButton icon="delete" label={`Delete ${item.name}`} size="sm" variant="danger" onClick={() => remove(item)} />;

  const COLUMNS: Column<InventoryItem>[] = [
    { id: 'name', header: 'Item', sortable: true, sticky: true, cell: i => <span>{i.name}<span className="block font-mono text-caption font-normal text-ink-muted">{i.sku}</span></span> },
    { id: 'category', header: 'Category', sortable: true, hideBelow: 'md', cell: i => i.category || <span className="text-ink-muted">None</span> },
    { id: 'status', header: 'Status', sortable: true, cell: i => <StatusTag item={i} /> },
    { id: 'currentStock', header: 'Stock', numeric: true, sortable: true, cell: i => <span>{i.currentStock}<span className="text-ink-muted"> / {i.maxStock} {i.unit}</span></span> },
    { id: 'cost', header: 'Unit cost', numeric: true, sortable: true, hideBelow: 'md', cell: i => money(i.cost) },
    { id: 'location', header: 'Location', hideBelow: 'lg', cell: i => i.location },
    { id: 'supplier', header: 'Supplier', hideBelow: 'lg', cell: i => i.supplier },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Inventory' }]}
        title="Inventory"
        description="Stock levels, reorder points and locations."
        actions={(
          <>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Inventory')}
                title="Inventory"
                statusColumn="status"
                statusColor={(_v, row) => STATUS[stockStatus(row as unknown as InventoryItem)].hex}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => openEditor(null)}>Add item</Button>
          </>
        )}
      />

      <Notice tone="info" icon="info" title="Stored in this browser only">
        This register is not connected to a shared service. Items are saved on this device and are not visible to other people or devices.
      </Notice>

      <MetricGrid columns={5}>
        <MetricTile label="Items" icon="package" value={counts.total} selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <MetricTile label="In stock" icon="valid" tone="success" value={counts.inStock} selected={statusFilter === 'in-stock'} onClick={() => setStatusFilter('in-stock')} />
        <MetricTile label="Low stock" icon="low-stock" tone="warning" value={counts.lowStock} selected={statusFilter === 'low-stock'} onClick={() => setStatusFilter('low-stock')} />
        <MetricTile label="Out of stock" icon="out-of-stock" tone="danger" value={counts.outOfStock} selected={statusFilter === 'out-of-stock'} onClick={() => setStatusFilter('out-of-stock')} />
        <MetricTile label="Stock value" icon="value" value={`$${counts.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </MetricGrid>

      <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, SKU or description" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Segmented label="Stock status" value={statusFilter} onValueChange={setStatusFilter} options={STATUS_FILTERS} />
        {categories.length > 0 && <Select className="w-44" aria-label="Filter by category" value={category} onValueChange={setCategory} options={[{ value: ALL, label: 'All categories' }, ...categories.map(c => ({ value: c, label: c }))]} />}
        {suppliers.length > 0 && <Select className="w-44" aria-label="Filter by supplier" value={supplier} onValueChange={setSupplier} options={[{ value: ALL, label: 'All suppliers' }, ...suppliers.map(s => ({ value: s, label: s }))]} />}
      </Toolbar>

      {inventory.length === 0 ? (
        <EmptyState icon="package" title="No inventory items yet" description="Add your first item to start tracking stock levels." action={<Button variant="primary" icon="plus" onClick={() => openEditor(null)}>Add item</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No items match" description="Try a different search or filter." action={hasFilters ? <Button onClick={() => { setSearch(''); setStatusFilter('all'); setCategory(ALL); setSupplier(ALL); }}>Clear filters</Button> : undefined} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => (
            <RecordCard
              key={item.id}
              eyebrow={<span className="font-mono">{item.sku}</span>}
              title={item.name}
              subtitle={item.category || undefined}
              status={<StatusTag item={item} />}
              facts={[
                { label: 'Stock', value: <span>{item.currentStock} / {item.maxStock} {item.unit}</span> },
                { label: 'Unit cost', value: money(item.cost) },
                ...(item.location ? [{ label: 'Location', value: item.location }] : []),
                ...(item.supplier ? [{ label: 'Supplier', value: item.supplier }] : []),
                { label: 'Restocked', value: formatDate(item.lastRestocked) },
              ]}
              meta={<Progress value={stockPct(item)} label={`${item.name} stock level`} className="min-w-32" />}
              action={cardActions(item)}
              onOpen={() => openEditor(item)}
              openLabel={`Edit ${item.name}`}
            />
          ))}
        </div>
      ) : (
        <DataTable caption="Inventory items" rows={rows} columns={COLUMNS} getRowId={i => i.id} sort={sort} onSortChange={setSort} onRowActivate={openEditor} rowActions={rowActions} />
      )}

      <ItemDialog item={editing} existing={inventory} open={dialogOpen} onOpenChange={setDialogOpen} onSave={save} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AppShell migrated>
      <InventoryPageContent />
    </AppShell>
  );
}
