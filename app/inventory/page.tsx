// app/inventory/page.tsx
"use client";

import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Package, Truck, Plus, Filter, MapPin,
  DollarSign, FilterX, Grid, List, RefreshCw, Pencil, Trash2, Eye, Hash,
} from "@/components/shared/theme";
import {
  useTheme, PageHero, StatTile, StatusBadge, ProgressBar,
  SearchInput, ViewToggle, useCollapseSection, ACCENT_HEX,
  GroupSection, RecordCard, staggerContainer, fadeUp, InfoRow, SummaryItem, useConfirm,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { InventoryItem } from './types';
import { useInventoryData } from './useInventoryData';

const CATEGORIES = ['Electronics', 'Mechanical', 'Consumables', 'Safety', 'Tools', 'Office Supplies'];
const SUPPLIERS = ['TechSupply Inc', 'Industrial Parts Co', 'SafetyFirst Ltd', 'Global Tools', 'Office Depot'];

const STATUS_COLORS: Record<string, string> = {
  'in-stock': '#34d399',
  'low-stock': '#f59e0b',
  'out-of-stock': '#f43f5e',
};
const STATUS_LABELS: Record<string, string> = {
  'in-stock': 'In Stock',
  'low-stock': 'Low Stock',
  'out-of-stock': 'Out of Stock',
};

function getStockStatus(item: InventoryItem) {
  if (item.currentStock === 0) return 'out-of-stock';
  if (item.currentStock <= item.minStock) return 'low-stock';
  return 'in-stock';
}

// Palette for categories — drawn from the shared ACCENT_HEX brand palette (not
// arbitrary hexes), hashed so each distinct category name gets a stable color.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function categoryColor(category?: string) {
  if (!category) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

// InfoRow/SummaryItem now come from the shared design system (promoted from
// this page's own local versions — see the design-system migration).

// ─── InventoryCard — built on the shared RecordCard so it inherits the exact
// homepage module-card treatment (bare accent icon, Montserrat title, GlowCard
// lift/glow). Key summary always visible; the rest expands in place. ──
function InventoryCard({ item, onDelete }: { item: InventoryItem; onDelete: () => void }) {
  const t = useTheme();
  const status = getStockStatus(item);
  const statusColor = STATUS_COLORS[status];
  const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);

  return (
    <RecordCard
      icon={Package}
      accentHex={statusColor}
      title={item.name}
      subtitle={`SKU: ${item.sku}`}
      badges={<>
        <StatusBadge color={statusColor} label={STATUS_LABELS[status]} dot />
        {status === 'low-stock' && <StatusBadge color="#f59e0b" label="Needs Reorder" />}
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={MapPin} label="Location" value={item.location} color={statusColor} />
          <SummaryItem icon={Truck} label="Supplier" value={item.supplier} color={statusColor} />
        </div>
      }
      actions={<>
        <Link href={`/inventory/view/${item.id}`} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} ${t.textMuted} ${t.hoverText} text-[12px] font-semibold transition-all`}>
          <Eye className="h-3.5 w-3.5" /> View
        </Link>
        <Link href={`/inventory/edit/${item.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[12px] font-semibold hover:brightness-110 transition-all">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
        <button onClick={onDelete} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] font-semibold transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoRow label="Stock" value={`${item.currentStock}/${item.maxStock} ${item.unit}`} />
        <InfoRow label="Unit Cost" value={`$${item.cost.toFixed(2)}`} />
        <InfoRow label="Category" value={item.category} />
        <InfoRow label="Last Restocked" value={formatDate(item.lastRestocked)} />
      </div>
      <ProgressBar value={Math.round(stockPct)} color={statusColor} label="Stock level" />
      {item.description && <p className={`text-xs ${t.textMuted}`}>{item.description}</p>}
    </RecordCard>
  );
}

// ─── InventoryRow — compact list-view row, mirroring EmployeeRow's pattern. ──
function InventoryRow({ item, onDelete }: { item: InventoryItem; onDelete: () => void }) {
  const t = useTheme();
  const status = getStockStatus(item);
  const statusColor = STATUS_COLORS[status];

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="shrink-0"><Package className="h-5 w-5" style={{ color: statusColor }} /></div>

        <Link href={`/inventory/view/${item.id}`} className="flex-1 min-w-0 text-left">
          <div className={`font-semibold text-sm ${t.textPrimary}`}>{item.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-mono ${t.textFaint}`}>{item.sku}</span>
            {item.category && <span className={`text-xs ${t.textFaint}`}>· {item.category}</span>}
            <StatusBadge color={statusColor} label={STATUS_LABELS[status]} dot />
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:flex items-center gap-1 text-[11px] ${t.textFaint}`}><Hash className="h-3 w-3" style={{ color: statusColor }} />{item.currentStock}/{item.maxStock} {item.unit}</span>
          {item.location && <span className={`hidden md:flex items-center gap-1 text-[11px] ${t.textFaint}`}><MapPin className="h-3 w-3" style={{ color: statusColor }} />{item.location}</span>}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/inventory/edit/${item.id}`} title="Edit item"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-all">
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button type="button" title="Delete item" onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryPageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ hero: true, filters: true });
  const { inventory, isRefreshing, loadInventory, deleteItem } = useInventoryData();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  // Records are grouped by category (homepage category-accordion vocabulary); this
  // tracks which category groups the user has collapsed (default: all open).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const stats = useMemo(() => ({
    totalItems: inventory.length,
    inStock: inventory.filter(i => getStockStatus(i) === 'in-stock').length,
    lowStock: inventory.filter(i => getStockStatus(i) === 'low-stock').length,
    outOfStock: inventory.filter(i => getStockStatus(i) === 'out-of-stock').length,
    totalValue: inventory.reduce((s, i) => s + i.currentStock * i.cost, 0),
    categories: new Set(inventory.map(i => i.category)).size,
  }), [inventory]);

  const statusCounts: Record<string, number> = {
    'in-stock': stats.inStock,
    'low-stock': stats.lowStock,
    'out-of-stock': stats.outOfStock,
  };

  const filtered = useMemo(() => inventory.filter(item => {
    const q = searchTerm.toLowerCase();
    if (q && !item.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
    if (selectedCategories.length && !selectedCategories.includes(item.category)) return false;
    if (selectedStatus.length && !selectedStatus.includes(getStockStatus(item))) return false;
    if (selectedSuppliers.length && !selectedSuppliers.includes(item.supplier)) return false;
    return true;
  }), [inventory, searchTerm, selectedCategories, selectedStatus, selectedSuppliers]);

  const exportColumns: DLColumn[] = [
    { key: 'name', label: 'Item', width: 24 },
    { key: 'sku', label: 'SKU', width: 16 },
    { key: 'category', label: 'Category', width: 16 },
    { key: 'currentStock', label: 'Current Stock', width: 14 },
    { key: 'minStock', label: 'Min Stock', width: 12 },
    { key: 'maxStock', label: 'Max Stock', width: 12 },
    { key: 'unit', label: 'Unit', width: 10 },
    { key: 'cost', label: 'Unit Cost', width: 12 },
    { key: 'supplier', label: 'Supplier', width: 20 },
    { key: 'location', label: 'Location', width: 18 },
    { key: 'status', label: 'Status', width: 14, format: (_v, row) => STATUS_LABELS[getStockStatus(row as unknown as InventoryItem)] },
    { key: 'lastRestocked', label: 'Last Restocked', width: 16, format: v => v ? formatDate(v as string) : '' },
  ];

  const hasActiveFilters = !!(searchTerm || selectedCategories.length || selectedStatus.length || selectedSuppliers.length);

  // Group the filtered list by category — alphabetically, "Uncategorized" last.
  const grouped = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of filtered) {
      const key = item.category || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.keys()]
      .sort((a, b) => (a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)))
      .map(category => ({ category, color: categoryColor(category === 'Uncategorized' ? undefined : category), items: map.get(category)! }));
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Delete this item?', destructive: true })) return;
    deleteItem(id);
  };

  const isGroupOpen = (category: string) => !!searchTerm || !collapsedGroups.has(category);
  const toggleGroup = (category: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(category) ? next.delete(category) : next.add(category);
    return next;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedStatus([]);
    setSelectedSuppliers([]);
  };

  const heroTiles = [
    { icon: Package, color: ACCENT_HEX.blue, value: stats.totalItems, label: 'Total', onClick: () => setSelectedStatus([]) },
    { icon: Package, color: STATUS_COLORS['in-stock'], value: stats.inStock, label: 'In Stock', onClick: () => setSelectedStatus(['in-stock']) },
    { icon: Package, color: STATUS_COLORS['low-stock'], value: stats.lowStock, label: 'Low Stock', onClick: () => setSelectedStatus(['low-stock']) },
    { icon: Package, color: STATUS_COLORS['out-of-stock'], value: stats.outOfStock, label: 'Out of Stock', onClick: () => setSelectedStatus(['out-of-stock']) },
    { icon: DollarSign, color: ACCENT_HEX.emerald, value: `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, label: 'Value' },
    { icon: Package, color: ACCENT_HEX.violet, value: stats.categories, label: 'Categories' },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Package}
        accent="violet"
        crumbs={['Core Management', 'Inventory']}
        title="Inventory Management"
        description="Manage stock levels, track reorder points, and keep inventory organised."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button
              type="button"
              onClick={loadInventory}
              title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Inventory')}
                title="Inventory Management"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_COLORS[getStockStatus(row as unknown as InventoryItem)]?.replace('#', '')}
              />
            )}
            <Link
              href="/inventory/create"
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-emerald-500 to-emerald-700 transition-all hover:brightness-110`}
            >
              <Plus className="h-3.5 w-3.5" /> New Item
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          {heroTiles.map(tile => <StatTile key={tile.label} {...tile} />)}
        </div>
      </PageHero>

      {/* Filters & Search */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, SKU, description…" className="flex-1" />
          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`}`}
            >
              <Filter className="h-3.5 w-3.5" /> Filters
              {hasActiveFilters && <span className={`ml-1 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>{filtered.length}</span>}
            </button>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
                <FilterX className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: Grid, label: 'Grid view' }, { value: 'list', icon: List, label: 'List view' }]} />
          </div>
        </div>

        {showFilters && (
          <div className={`pt-4 border-t ${t.border} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
            <div>
              <p className={`text-xs font-semibold ${t.textFaint} mb-2`}>Category</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={e => setSelectedCategories(prev => e.target.checked ? [...prev, cat] : prev.filter(c => c !== cat))}
                      className="h-3.5 w-3.5 rounded accent-brand-500"
                    />
                    <span className={`text-xs ${t.textMuted}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold ${t.textFaint} mb-2`}>Stock Status</p>
              <div className="space-y-1.5">
                {(['in-stock', 'low-stock', 'out-of-stock'] as const).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatus.includes(s)}
                      onChange={e => setSelectedStatus(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}
                      className="h-3.5 w-3.5 rounded accent-brand-500"
                    />
                    <span className={`text-xs ${t.textMuted}`}>{STATUS_LABELS[s]} ({statusCounts[s]})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold ${t.textFaint} mb-2`}>Supplier</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {SUPPLIERS.map(sup => (
                  <label key={sup} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(sup)}
                      onChange={e => setSelectedSuppliers(prev => e.target.checked ? [...prev, sup] : prev.filter(s => s !== sup))}
                      className="h-3.5 w-3.5 rounded accent-brand-500"
                    />
                    <span className={`text-xs ${t.textMuted}`}>{sup}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <p className={`text-sm ${t.textFaint}`}>
        Showing <span className={`font-semibold ${t.textPrimary}`}>{filtered.length}</span> of {inventory.length} items
        {hasActiveFilters && ' (filtered)'}
      </p>

      {filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl p-12 text-center`}>
          <Package className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
          <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>
            {inventory.length === 0 ? 'No Inventory Items Yet' : 'No Items Match'}
          </h3>
          <p className={`${t.textFaint} text-sm mb-4`}>
            {inventory.length === 0
              ? 'Add your first inventory item to start tracking stock levels.'
              : 'Try adjusting your search or filters.'}
          </p>
          {inventory.length === 0 && (
            <Link href="/inventory/create" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-emerald-500 to-emerald-700 hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> Add First Item
            </Link>
          )}
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {grouped.map(g => (
            <GroupSection
              key={g.category}
              icon={Package}
              accentHex={g.color}
              title={g.category}
              count={g.items.length}
              countLabel={g.items.length === 1 ? 'item' : 'items'}
              open={isGroupOpen(g.category)}
              onToggle={() => toggleGroup(g.category)}
              gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4'}
            >
              {g.items.map(item => (
                <motion.div key={item.id} variants={fadeUp}>
                  {viewMode === 'grid'
                    ? <InventoryCard item={item} onDelete={() => handleDelete(item.id)} />
                    : <InventoryRow item={item} onDelete={() => handleDelete(item.id)} />}
                </motion.div>
              ))}
            </GroupSection>
          ))}
        </motion.div>
      )}
    </main>
  );
}

export default function InventoryPage() {
  return (
    <AppShell>
      <InventoryPageContent />
    </AppShell>
  );
}
