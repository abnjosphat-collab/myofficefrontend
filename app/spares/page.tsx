// app/spares/page.tsx — spare parts: the register with stock levels against minimums, favourites, a category breakdown, and a parts
// requisition builder. Cards or a table; add, edit, delete; import from Excel on its own page.
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, MetricGrid, MetricTile, PageHeader, Pagination, RecordCard, SearchField, Select, StatusBadge,
  Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, pageSlice, useConfirm, usePersistentState, useViewPreference, type Column,
} from '@/components/ui-system';
import { formatCurrency, formatCurrencyShort } from '@/components/shared/utils';
import { apiCreate, apiDelete, apiUpdate } from './api';
import { CategoryPanel } from './CategoryPanel';
import { RequisitionPanel, newLineId } from './RequisitionPanel';
import { SpareDetail } from './SpareDetail';
import { SpareForm } from './SpareForm';
import { DEFAULT_HEADER, NO_FILTERS, PRIORITY, STOCK, categoriesOf, categoryBreakdown, filterSpares, filled, isFiltered, priorityMeta, sortSpares, stockOf, summarise, type SortKey, type SpareFilters, type StockFilter } from './stock';
import type { ReqHeader, ReqLine, Spare, SpareFormData } from './types';
import { useSavedRequisitions, useSparesRegister } from './useSparesData';

const ALL = 'all';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'stock_code', label: 'Stock code' }, { value: 'description', label: 'Description' }, { value: 'current_quantity', label: 'Quantity on hand' }, { value: 'unit_price', label: 'Unit price' }, { value: 'status', label: 'Stock level' }, { value: 'priority', label: 'Priority' },
];
const STOCKS = [{ value: ALL, label: 'Any stock level' }, ...(Object.keys(STOCK) as (keyof typeof STOCK)[]).map(k => ({ value: k as string, label: STOCK[k].label })), { value: 'safety', label: 'Safety stock' }];
const PRIORITIES = [{ value: ALL, label: 'Any priority' }, ...(Object.keys(PRIORITY) as Spare['priority'][]).map(p => ({ value: p as string, label: PRIORITY[p].label }))];
const PAGE_SIZE = 24;
const validIds = (raw: unknown): number[] | undefined => (Array.isArray(raw) ? raw.filter((n): n is number => typeof n === 'number') : undefined);

function SparesContent() {
  const confirm = useConfirm();
  const list = useSparesRegister();
  const saved = useSavedRequisitions();
  const spares = list.items;
  const [view, setView] = useViewPreference('spares', VIEW_CARDS_TABLE);
  const [favIds, setFavIds] = usePersistentState<number[]>('myoffice_spares_favourites', [], validIds);
  const favourites = useMemo(() => new Set(favIds), [favIds]);
  const [f, setF] = useState<SpareFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>('stock_code');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showCategories, setShowCategories] = useState(false);
  const [formFor, setFormFor] = useState<{ spare: Spare | null } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [header, setHeader] = useState<ReqHeader>(DEFAULT_HEADER);
  const [lines, setLines] = useState<ReqLine[]>([]);
  const set = (patch: Partial<SpareFilters>) => { setF(prev => ({ ...prev, ...patch })); setPage(1); };

  const viewing = useMemo(() => spares.find(s => s.id === viewingId) ?? null, [spares, viewingId]);
  const matches = useMemo(() => sortSpares(filterSpares(spares, f, favourites), sort, dir, favourites), [spares, f, favourites, sort, dir]);
  const visible = pageSlice(matches, page, PAGE_SIZE);
  const stats = useMemo(() => summarise(spares), [spares]);
  const breakdown = useMemo(() => categoryBreakdown(spares), [spares]);
  const categories = useMemo(() => [{ value: ALL, label: 'All categories' }, ...[...new Set(spares.flatMap(categoriesOf))].sort().map(c => ({ value: c, label: c }))], [spares]);
  const filtered = isFiltered(f);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });
  const tile = { loading: list.loading && !list.loaded, unavailable: !list.loaded && !list.loading };
  const clear = () => { setF(NO_FILTERS); setPage(1); };
  const toggleFav = (id: number) => setFavIds(favourites.has(id) ? favIds.filter(x => x !== id) : [...favIds, id]);

  const save = async (data: SpareFormData, id?: number) => { if (id) await apiUpdate(id, data); else await apiCreate(data); await list.refetch(); };
  const remove = async (s: Spare) => {
    if (!await confirm({ title: 'Delete this spare part?', message: `${s.stock_code}, ${s.description}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await apiDelete(s.id); setViewingId(null); toast.success(`${s.stock_code} deleted.`); await list.refetch(); }
    catch (e) { toast.error(`${s.stock_code} was not deleted: ${(e as Error).message}`); }
  };
  const addToRequisition = (s: Spare) => {
    setLines(prev => [...prev, { id: newLineId(), spare: s, searchValue: s.stock_code, qty: 1, dropdownOpen: false }]);
    setReqOpen(true); setViewingId(null);
    toast.success(`${s.stock_code} added to the requisition.`);
  };

  const actionsOf = (s: Spare) => (
    <span className="inline-flex items-center gap-1">
      <IconButton icon="starred" size="sm" variant="ghost" aria-pressed={favourites.has(s.id)} className={favourites.has(s.id) ? 'text-warning' : undefined} label={favourites.has(s.id) ? `Remove ${s.stock_code} from favourites` : `Add ${s.stock_code} to favourites`} onClick={() => toggleFav(s.id)} />
      <IconButton icon="cart" size="sm" variant="ghost" label={`Add ${s.stock_code} to the requisition`} onClick={() => addToRequisition(s)} />
      <Menu>
        <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`More actions for ${s.stock_code}`} /></MenuTrigger>
        <MenuContent><MenuItem icon="edit" onSelect={() => setFormFor({ spare: s })}>Edit</MenuItem><MenuItem icon="delete" onSelect={() => remove(s)}>Delete</MenuItem></MenuContent>
      </Menu>
    </span>
  );
  const badges = (s: Spare) => { const st = stockOf(s); const pr = priorityMeta(s.priority); return <><StatusBadge tone={st.tone}>{st.label}</StatusBadge>{(s.priority === 'critical' || s.priority === 'high') && <StatusBadge tone={pr.tone}>{pr.label}</StatusBadge>}{s.safety_stock && <StatusBadge tone="brand">Safety</StatusBadge>}</>; };
  const COLUMNS: Column<Spare>[] = [
    { id: 'code', header: 'Stock code', sticky: true, cell: s => <span className="font-mono font-semibold text-ink">{s.stock_code}</span> },
    { id: 'desc', header: 'Description', cell: s => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{s.description}</p>{categoriesOf(s)[0] && <p className="text-caption text-ink-muted">{categoriesOf(s).join(', ')}</p>}</div> },
    { id: 'stock', header: 'On hand', numeric: true, cell: s => <div className="flex flex-col items-end gap-1"><span className="font-semibold tabular">{s.current_quantity} {s.unit_of_measure || 'UN'}</span>{badges(s)}</div> },
    { id: 'minmax', header: 'Min / max', numeric: true, hideBelow: 'lg', cell: s => <span className="tabular text-ink-muted">{s.min_quantity} / {s.max_quantity}</span> },
    { id: 'price', header: 'Unit price', numeric: true, hideBelow: 'md', cell: s => <span className="tabular">{formatCurrency(s.unit_price)}</span> },
    { id: 'loc', header: 'Location', hideBelow: 'lg', cell: s => s.storage_location || <span className="text-ink-muted">Not set</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Spares' }]}
        title="Spare parts"
        description="What is in stock against its minimum, and the requisitions to restock it."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh spares" variant="outline" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            <Button icon="cart" onClick={() => setReqOpen(true)}>{`Requisition${filled(lines).length ? ` (${filled(lines).length})` : ''}`}</Button>
            <Button asChild icon="upload"><Link href="/spares/import">Import Excel</Link></Button>
            <Button variant="primary" icon="plus" disabled={!list.loaded} onClick={() => setFormFor({ spare: null })}>Add spare</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Parts" icon="spares" value={stats.total} selected={!filtered} onClick={clear} {...tile} />
        <MetricTile label="Out of stock" icon="out-of-stock" tone={stats.out ? 'danger' : 'default'} value={stats.out} selected={f.stock === 'out'} onClick={() => set({ stock: f.stock === 'out' ? 'all' : 'out' })} {...tile} />
        <MetricTile label="Low stock" icon="low-stock" tone={stats.low ? 'warning' : 'default'} value={stats.low} selected={f.stock === 'low'} onClick={() => set({ stock: f.stock === 'low' ? 'all' : 'low' })} {...tile} />
        <MetricTile label="Safety stock" icon="safe" value={stats.safety} selected={f.stock === 'safety'} onClick={() => set({ stock: f.stock === 'safety' ? 'all' : 'safety' })} {...tile} />
        <MetricTile label="Categories" icon="categories" value={stats.categories} detail={`${formatCurrencyShort(stats.value)} on hand`} selected={showCategories} onClick={() => setShowCategories(v => !v)} {...tile} />
      </MetricGrid>

      {showCategories && <CategoryPanel rows={breakdown} active={f.category} onPick={cat => set({ category: cat })} />}

      <Toolbar filtered={filtered} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search parts" wrapperClassName="min-w-48 max-w-md flex-1" />
        <Select aria-label="Stock level" className="w-40" value={f.stock} onValueChange={v => set({ stock: v as StockFilter })} options={STOCKS} />
        <Select aria-label="Category" className="w-44" value={f.category} onValueChange={v => set({ category: v })} options={categories} />
        <Select aria-label="Priority" className="w-36" value={f.priority} onValueChange={v => set({ priority: v })} options={PRIORITIES} />
        <Select aria-label="Sort by" className="w-44" value={sort} onValueChange={v => setSort(v as SortKey)} options={SORTS} />
        <IconButton icon="sort" variant="outline" label={dir === 'asc' ? 'Ascending, reverse' : 'Descending, reverse'} onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))} />
        <Button variant={f.favouritesOnly ? 'primary' : 'secondary'} icon="starred" aria-pressed={f.favouritesOnly} onClick={() => set({ favouritesOnly: !f.favouritesOnly })}>Favourites</Button>
        {filtered && <Button variant="ghost" icon="close" onClick={clear}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status} subject="spares" error={list.error} onRetry={() => list.refetch()}
        empty={filtered
          ? <EmptyState icon="search" title="No parts match" description="Try fewer filters or a different search." action={<Button onClick={clear}>Clear filters</Button>} />
          : <EmptyState icon="spares" title="No spare parts yet" description="Add the first one, or import a spreadsheet." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ spare: null })}>Add spare</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted" role="status">{matches.length} {matches.length === 1 ? 'part' : 'parts'}{matches.length !== spares.length ? ` of ${spares.length}` : ''}</p>
        {view === 'cards' ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Spare parts">
            {visible.map(s => (
              <li key={s.id} className="relative">
                <RecordCard
                  eyebrow={s.stock_code} title={s.description} openLabel={`Open ${s.stock_code}, ${s.description}`} onOpen={() => setViewingId(s.id)} status={badges(s)}
                  facts={[{ label: 'On hand', value: <span className="tabular">{s.current_quantity} {s.unit_of_measure || 'UN'}, min {s.min_quantity}</span> }, { label: 'Price', value: <span className="tabular">{formatCurrency(s.unit_price)}</span> }, ...(categoriesOf(s).length ? [{ label: 'Category', value: categoriesOf(s).join(', ') }] : []), ...(s.storage_location ? [{ label: 'Location', value: s.storage_location }] : [])]}
                  action={actionsOf(s)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <DataTable caption="Spare parts" rows={visible} columns={COLUMNS} getRowId={s => String(s.id)} onRowActivate={s => setViewingId(s.id)} rowActions={actionsOf} />
        )}
        {matches.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={matches.length} onPageChange={setPage} />}
      </DataRegion>

      <SpareDetail spare={viewing} onClose={() => setViewingId(null)} onEdit={s => { setViewingId(null); setFormFor({ spare: s }); }} onDelete={remove} onAddToRequisition={addToRequisition} />
      <SpareForm open={!!formFor} spare={formFor?.spare ?? null} all={spares} onOpenChange={o => { if (!o) setFormFor(null); }} onSave={save} />
      <RequisitionPanel open={reqOpen} onOpenChange={setReqOpen} spares={spares} saved={saved} header={header} onHeader={setHeader} lines={lines} onLines={setLines} />
    </div>
  );
}

export default function SparesPage() {
  return <AppShell migrated><SparesContent /></AppShell>;
}

