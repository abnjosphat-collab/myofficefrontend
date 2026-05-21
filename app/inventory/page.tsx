// app/inventory/page.tsx
"use client";

import { PageShell } from '@/components/PageShell';
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Grid,
  List,
  BarChart3,
  Warehouse,
  PackageOpen,
  MapPin,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  FilterX,
  Eye,
} from "lucide-react";
import {
  HeroPanel,
  GlassPanel,
  GlassButton,
  GlassBadge,
  GlassInput,
  GlassSelect,
  GlassProgress,
  usePageCollapse,
  MasterCollapseButton,
} from "@/components/shared";

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

function getStockStatus(item: InventoryItem) {
  if (item.currentStock === 0) return 'out-of-stock';
  if (item.currentStock <= item.minStock) return 'low-stock';
  return 'in-stock';
}

function statusBadge(status: string) {
  if (status === 'in-stock') return <GlassBadge variant="success">In Stock</GlassBadge>;
  if (status === 'low-stock') return <GlassBadge variant="warning">Low Stock</GlassBadge>;
  return <GlassBadge variant="danger">Out of Stock</GlassBadge>;
}

// Expanded details panel shown inside a card
function ExpandedDetails({ item }: { item: InventoryItem }) {
  const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);
  return (
    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#86BBD8] flex items-center gap-1">
          <Warehouse className="h-3.5 w-3.5" /> Stock Information
        </p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Current</span><span className="text-white">{item.currentStock} {item.unit}</span></div>
          <div className="flex justify-between"><span>Minimum</span><span className="text-white">{item.minStock} {item.unit}</span></div>
          <div className="flex justify-between"><span>Maximum</span><span className="text-white">{item.maxStock} {item.unit}</span></div>
        </div>
        <GlassProgress value={stockPct} showLabel size="sm" />
        {item.currentStock <= item.minStock && (
          <GlassBadge variant="warning"><ShoppingCart className="h-3 w-3 mr-1 inline" />Needs Reorder</GlassBadge>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#86BBD8] flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> Location & Cost
        </p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Location</span><span className="text-white">{item.location}</span></div>
          <div className="flex justify-between"><span>Supplier</span><span className="text-white">{item.supplier}</span></div>
          <div className="flex justify-between"><span>Unit Cost</span><span className="text-white">${item.cost.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Total Value</span><span className="text-white">${(item.currentStock * item.cost).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Restocked</span><span className="text-white">{new Date(item.lastRestocked).toLocaleDateString()}</span></div>
        </div>
      </div>
      {item.description && (
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-[#86BBD8] mb-1">Description</p>
          <p className="text-xs text-white/70">{item.description}</p>
        </div>
      )}
    </div>
  );
}

// Grid card
function InventoryCard({
  item, onDelete, expanded, onToggle,
}: { item: InventoryItem; onDelete: (id: string) => void; expanded: boolean; onToggle: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stockStatus = getStockStatus(item);
  const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);

  return (
    <div className="oz-glass-panel rounded-2xl p-4 flex flex-col gap-3 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{item.name}</p>
            <p className="text-xs text-white/50">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            title={expanded ? "Collapse" : "Expand"}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              title="Actions"
              aria-label="Open actions menu"
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 oz-glass-dark rounded-xl shadow-xl z-20 w-36 py-1 border border-white/10">
                <Link
                  href={`/inventory/edit/${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
                  onClick={() => { setMenuOpen(false); if (confirm('Delete this item?')) onDelete(item.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {statusBadge(stockStatus)}
        <span className="text-xs text-white/50 flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/60">
          <span>{item.currentStock}/{item.maxStock} {item.unit}</span>
          <span>{Math.round(stockPct)}%</span>
        </div>
        <GlassProgress value={stockPct} size="sm" />
      </div>

      <div className="flex items-center justify-between text-xs text-white/60">
        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${item.cost.toFixed(2)}/{item.unit}</span>
        <span className="flex items-center gap-1 truncate max-w-[120px]"><Truck className="h-3 w-3 shrink-0" />{item.supplier}</span>
      </div>

      {expanded && <ExpandedDetails item={item} />}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        <GlassButton size="xs" icon={Eye} className="flex-1" asChild>
          <Link href={`/inventory/view/${item.id}`}>View</Link>
        </GlassButton>
        {item.currentStock <= item.minStock && (
          <GlassButton size="xs" icon={ShoppingCart} variant="primary" className="flex-1">Reorder</GlassButton>
        )}
      </div>
    </div>
  );
}

// List row
function InventoryListItem({
  item, onDelete, expanded, onToggle,
}: { item: InventoryItem; onDelete: (id: string) => void; expanded: boolean; onToggle: () => void }) {
  const stockStatus = getStockStatus(item);
  const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);

  return (
    <div className="oz-glass-panel rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          title={expanded ? "Collapse" : "Expand"}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
          <Package className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white">{item.name}</span>
            {statusBadge(stockStatus)}
            {item.currentStock <= item.minStock && (
              <GlassBadge variant="warning">Needs Reorder</GlassBadge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5 flex-wrap">
            <span>SKU: {item.sku}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{item.supplier}</span>
            <span>${item.cost.toFixed(2)}/{item.unit}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-white">{item.currentStock}</p>
          <p className="text-xs text-white/50">of {item.maxStock} {item.unit}</p>
        </div>
        <div className="w-20 shrink-0">
          <GlassProgress value={stockPct} size="sm" />
        </div>
        <div className="flex gap-1 shrink-0">
          <GlassButton size="xs" icon={Eye} asChild>
            <Link href={`/inventory/view/${item.id}`}>View</Link>
          </GlassButton>
          <GlassButton
            size="xs"
            variant="danger"
            icon={Trash2}
            onClick={() => { if (confirm('Delete this item?')) onDelete(item.id); }}
            title="Delete"
            aria-label="Delete item"
          />
        </div>
      </div>
      {expanded && <ExpandedDetails item={item} />}
    </div>
  );
}

export default function InventoryPage() {
  const sections = usePageCollapse({ hero: false, filters: false, records: false });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState(new Set<string>());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { loadInventory(); }, []);

  const generateSampleInventory = (): InventoryItem[] => [
    { id: 'inv-001', name: 'Industrial Circuit Boards', sku: 'CB-IND-005', category: 'Electronics', description: 'High-temperature circuit boards for manufacturing equipment', currentStock: 45, minStock: 20, maxStock: 100, unit: 'pcs', cost: 125.50, supplier: 'TechSupply Inc', location: 'Shelf A-12', status: 'in-stock', lastRestocked: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'inv-002', name: 'Safety Gloves - Large', sku: 'SG-L-100', category: 'Safety', description: 'Cut-resistant safety gloves, large size', currentStock: 8, minStock: 25, maxStock: 200, unit: 'pairs', cost: 12.75, supplier: 'SafetyFirst Ltd', location: 'Bin C-08', status: 'low-stock', lastRestocked: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 'inv-003', name: 'Hydraulic Fluid', sku: 'HYD-40W', category: 'Consumables', description: 'Industrial grade hydraulic fluid, 40W', currentStock: 120, minStock: 50, maxStock: 300, unit: 'liters', cost: 8.20, supplier: 'Industrial Parts Co', location: 'Drum Storage', status: 'in-stock', lastRestocked: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'inv-004', name: 'CNC Cutting Tools', sku: 'CNC-CT-3MM', category: 'Tools', description: '3mm carbide cutting tools for CNC machines', currentStock: 0, minStock: 15, maxStock: 80, unit: 'pcs', cost: 45.00, supplier: 'Global Tools', location: 'Tool Crib B', status: 'out-of-stock', lastRestocked: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'inv-005', name: 'Laser Printer Toner', sku: 'TONER-XL500', category: 'Office Supplies', description: 'High-yield toner for XL500 series printers', currentStock: 3, minStock: 5, maxStock: 20, unit: 'cartridges', cost: 89.99, supplier: 'Office Depot', location: 'Supply Closet', status: 'low-stock', lastRestocked: new Date(Date.now() - 21 * 86400000).toISOString() },
  ];

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

  const deleteItem = (id: string) => {
    const items = inventory.filter(i => i.id !== id);
    setInventory(items);
    try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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

  const heroStats = [
    { label: 'Total Items', value: stats.totalItems, onClick: () => setSelectedStatus([]) },
    { label: 'In Stock', value: stats.inStock, textClass: 'text-emerald-400', onClick: () => setSelectedStatus(['in-stock']) },
    { label: 'Low Stock', value: stats.lowStock, textClass: 'text-amber-400', onClick: () => setSelectedStatus(['low-stock']) },
    { label: 'Out of Stock', value: stats.outOfStock, textClass: 'text-red-400', onClick: () => setSelectedStatus(['out-of-stock']) },
    { label: 'Total Value', value: `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: 'Categories', value: stats.categories },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <HeroPanel
          title="Inventory Management"
          subtitle="Manage stock levels, track reorder points, and keep inventory organised."
          icon={Package}
          stats={heroStats}
          onRefresh={loadInventory}
          loading={isRefreshing}
          {...sections.panel('hero')}
          actions={[
            <MasterCollapseButton key="collapse" collapse={sections} />,
            <GlassButton key="new" icon={Plus} variant="primary" asChild>
              <Link href="/inventory/create">New Item</Link>
            </GlassButton>,
          ]}
        />

        {/* Controls */}
        <GlassPanel title="Filters & Search" {...sections.panel('filters')}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <GlassInput
              placeholder="Search by name, SKU, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              icon={Search}
              wrapperClassName="flex-1"
            />
            <div className="flex gap-2 flex-wrap">
              <GlassButton
                size="sm"
                icon={Filter}
                onClick={() => setShowFilters(v => !v)}
                variant={showFilters ? 'primary' : 'secondary'}
              >
                Filters {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-[#86BBD8]/30 rounded text-[10px]">{filtered.length}</span>}
              </GlassButton>
              {hasActiveFilters && (
                <GlassButton size="sm" icon={FilterX} onClick={clearFilters} variant="ghost">Clear</GlassButton>
              )}
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  aria-label="Grid view"
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List view"
                  aria-label="List view"
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-white/60 mb-2">Category</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={e => setSelectedCategories(prev => e.target.checked ? [...prev, cat] : prev.filter(c => c !== cat))}
                        className="h-3.5 w-3.5 rounded border-white/20 accent-[#86BBD8]"
                      />
                      <span className="text-xs text-white/70">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/60 mb-2">Stock Status</p>
                <div className="space-y-1.5">
                  {(['in-stock', 'low-stock', 'out-of-stock'] as const).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatus.includes(s)}
                        onChange={e => setSelectedStatus(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}
                        className="h-3.5 w-3.5 rounded border-white/20 accent-[#86BBD8]"
                      />
                      <span className="text-xs text-white/70 capitalize">{s.replace('-', ' ')} ({statusCounts[s]})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/60 mb-2">Supplier</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {SUPPLIERS.map(sup => (
                    <label key={sup} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(sup)}
                        onChange={e => setSelectedSuppliers(prev => e.target.checked ? [...prev, sup] : prev.filter(s => s !== sup))}
                        className="h-3.5 w-3.5 rounded border-white/20 accent-[#86BBD8]"
                      />
                      <span className="text-xs text-white/70">{sup}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </GlassPanel>

        {sections.expanded.records && <>
        {/* Results summary */}
        <p className="text-sm text-white/60">
          Showing <span className="font-semibold text-white">{filtered.length}</span> of {inventory.length} items
          {hasActiveFilters && ' (filtered)'}
        </p>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="oz-glass-panel rounded-2xl p-12 text-center">
            <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {inventory.length === 0 ? 'No Inventory Items Yet' : 'No Items Match'}
            </h3>
            <p className="text-white/50 text-sm mb-4">
              {inventory.length === 0
                ? 'Add your first inventory item to start tracking stock levels.'
                : 'Try adjusting your search or filters.'}
            </p>
            {inventory.length === 0 && (
              <GlassButton icon={Plus} variant="primary" asChild>
                <Link href="/inventory/create">Add First Item</Link>
              </GlassButton>
            )}
          </div>
        )}

        {/* Grid view */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <InventoryCard
                key={item.id}
                item={item}
                onDelete={deleteItem}
                expanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpand(item.id)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {filtered.length > 0 && viewMode === 'list' && (
          <div className="space-y-2">
            {filtered.map(item => (
              <InventoryListItem
                key={item.id}
                item={item}
                onDelete={deleteItem}
                expanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpand(item.id)}
              />
            ))}
          </div>
        )}
        </>}
      </main>
    </PageShell>
  );
}
