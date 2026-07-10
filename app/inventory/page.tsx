// app/inventory/page.tsx
"use client";

import { AppShell } from '@/components/app-shell';
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Package, Truck, Plus, Filter, MapPin,
  DollarSign, FilterX, Grid, List, RefreshCw,
} from "lucide-react";
import {
  useTheme, PageHero, StatTile, StatusBadge, ListItemCard,
  SearchInput, ViewToggle, useCollapseSection, ACCENT_HEX,
} from '@/components/shared/theme';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  cost: number;
  supplier: string;
  location: string;
  status: string;
  lastRestocked: string;
}

const INVENTORY_STORAGE_KEY = 'inventory-items';

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

function generateSampleInventory(): InventoryItem[] {
  return [
    { id: 'inv-001', name: 'Industrial Circuit Boards', sku: 'CB-IND-005', category: 'Electronics', description: 'High-temperature circuit boards for manufacturing equipment', currentStock: 45, minStock: 20, maxStock: 100, unit: 'pcs', cost: 125.50, supplier: 'TechSupply Inc', location: 'Shelf A-12', status: 'in-stock', lastRestocked: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'inv-002', name: 'Safety Gloves - Large', sku: 'SG-L-100', category: 'Safety', description: 'Cut-resistant safety gloves, large size', currentStock: 8, minStock: 25, maxStock: 200, unit: 'pairs', cost: 12.75, supplier: 'SafetyFirst Ltd', location: 'Bin C-08', status: 'low-stock', lastRestocked: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 'inv-003', name: 'Hydraulic Fluid', sku: 'HYD-40W', category: 'Consumables', description: 'Industrial grade hydraulic fluid, 40W', currentStock: 120, minStock: 50, maxStock: 300, unit: 'liters', cost: 8.20, supplier: 'Industrial Parts Co', location: 'Drum Storage', status: 'in-stock', lastRestocked: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'inv-004', name: 'CNC Cutting Tools', sku: 'CNC-CT-3MM', category: 'Tools', description: '3mm carbide cutting tools for CNC machines', currentStock: 0, minStock: 15, maxStock: 80, unit: 'pcs', cost: 45.00, supplier: 'Global Tools', location: 'Tool Crib B', status: 'out-of-stock', lastRestocked: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'inv-005', name: 'Laser Printer Toner', sku: 'TONER-XL500', category: 'Office Supplies', description: 'High-yield toner for XL500 series printers', currentStock: 3, minStock: 5, maxStock: 20, unit: 'cartridges', cost: 89.99, supplier: 'Office Depot', location: 'Supply Closet', status: 'low-stock', lastRestocked: new Date(Date.now() - 21 * 86400000).toISOString() },
  ];
}

function InventoryPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, filters: true });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInventory = () => {
    setIsRefreshing(true);
    try {
      const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (stored) {
        setInventory(JSON.parse(stored));
      } else {
        const sample = generateSampleInventory();
        setInventory(sample);
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(sample));
      }
    } catch { /* ignore */ } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const deleteItem = (id: string) => {
    const items = inventory.filter(i => i.id !== id);
    setInventory(items);
    try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

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

  const hasActiveFilters = !!(searchTerm || selectedCategories.length || selectedStatus.length || selectedSuppliers.length);

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
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-blue-500/15 text-blue-400' : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`}`}
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
                      className="h-3.5 w-3.5 rounded accent-blue-500"
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
                      className="h-3.5 w-3.5 rounded accent-blue-500"
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
                      className="h-3.5 w-3.5 rounded accent-blue-500"
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
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
          {filtered.map(item => {
            const status = getStockStatus(item);
            const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);
            return (
              <ListItemCard
                key={item.id}
                color={STATUS_COLORS[status]}
                icon={Package}
                title={item.name}
                subtitle={`SKU: ${item.sku}`}
                onClick={() => window.location.assign(`/inventory/view/${item.id}`)}
                onEdit={() => window.location.assign(`/inventory/edit/${item.id}`)}
                onDelete={() => { if (confirm('Delete this item?')) deleteItem(item.id); }}
                badges={<>
                  <StatusBadge color={STATUS_COLORS[status]} label={STATUS_LABELS[status]} dot />
                  {status === 'low-stock' && <StatusBadge color="#f59e0b" label="Needs Reorder" />}
                </>}
                rows={[
                  { label: 'Stock', value: `${item.currentStock}/${item.maxStock} ${item.unit}` },
                  { label: 'Location', value: <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span> },
                  { label: 'Supplier', value: <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{item.supplier}</span> },
                  { label: 'Unit cost', value: <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{item.cost.toFixed(2)}</span> },
                  { label: 'Stock level', value: `${Math.round(stockPct)}%` },
                ]}
              />
            );
          })}
        </div>
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
