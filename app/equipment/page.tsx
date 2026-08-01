// app/equipment/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import EquipmentForm from "@/components/EquipmentForm";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Pencil, Briefcase, Wrench, MapPin,
  Target, Truck, AlertTriangle,
  CheckCircle, XCircle, LayoutGrid, List,
  Server, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, FilterX,
  ChevronDown, ChevronUp,
} from "@/components/shared/theme";
import {
  useTheme, accentText, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  useCollapseSection, CenterModal, ACCENT_HEX, SelectField,
  GroupSection, RecordCard, staggerContainer, fadeUp, InfoRow, SummaryItem, LoadingState,
} from '@/components/shared/theme';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { ElementType } from "react";
import type { EquipmentItem } from './types';
import { fetchEquipmentList, createEquipment, updateEquipment, deleteEquipment } from './api';

const ITEMS_PER_PAGE = 12;

const STATUS_COLORS: Record<string, string> = {
  operational: '#34d399',
  maintenance: '#f59e0b',
  out_of_service: '#f43f5e',
  reserved: ACCENT_HEX.blue,
  retired: '#94a3b8',
};
const STATUS_LABELS: Record<string, string> = {
  operational: 'Operational', maintenance: 'Maintenance', out_of_service: 'Out of Service',
  reserved: 'Reserved', retired: 'Retired',
};
const MAINT_COLORS: Record<string, string> = {
  Overdue: '#f43f5e', 'Due Soon': '#f59e0b', Upcoming: ACCENT_HEX.blue, 'On Track': '#34d399',
};

// Palette for categories — drawn from the shared ACCENT_HEX brand palette (not
// arbitrary hexes), hashed so each distinct category name gets a stable color.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function categoryColor(category?: string) {
  if (!category) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

function statusIcon(status: string | undefined): ElementType {
  switch (status?.toLowerCase()) {
    case 'operational': return CheckCircle;
    case 'maintenance': return Wrench;
    case 'out_of_service': return XCircle;
    case 'reserved': return Package;
    default: return Server;
  }
}

function calcAge(date?: string): string {
  if (!date) return 'N/A';
  const start = new Date(date);
  if (isNaN(start.getTime())) return 'Invalid';
  const now = new Date();
  let y = now.getFullYear() - start.getFullYear();
  let m = now.getMonth() - start.getMonth();
  if (m < 0) { y--; m += 12; }
  if (y === 0 && m === 0) return '<1 mo';
  return [y > 0 ? `${y}yr` : '', m > 0 ? `${m}mo` : ''].filter(Boolean).join(' ');
}

function calcMaintenanceStatus(last?: string, interval?: number): string {
  if (!last || !interval) return 'Unknown';
  const next = new Date(last);
  next.setMonth(next.getMonth() + interval);
  const days = Math.ceil((next.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Overdue';
  if (days <= 7) return 'Due Soon';
  if (days <= 30) return 'Upcoming';
  return 'On Track';
}

// --- Simple pagination (themed) ---
function Pagination({ current, total, onPage, perPage, totalItems, onPerPage }: {
  current: number; total: number; onPage: (p: number) => void;
  perPage: number; totalItems: number; onPerPage: (n: number) => void;
}) {
  const t = useTheme();
  const from = (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, totalItems);

  const pages: number[] = [];
  const max = 5;
  let start = Math.max(1, current - Math.floor(max / 2));
  const end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t ${t.border}`}>
      <p className={`text-sm ${t.textFaint}`}>Showing {from}–{to} of {totalItems}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <button type="button" onClick={() => onPage(1)} disabled={current === 1} title="First" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-30 transition-colors`}><ChevronsLeft className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onPage(current - 1)} disabled={current === 1} title="Previous" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-30 transition-colors`}><ChevronLeft className="h-3.5 w-3.5" /></button>
        {start > 1 && <><button type="button" onClick={() => onPage(1)} className={`h-7 w-7 text-xs ${t.textFaint} ${t.hoverText} ${t.hoverBg} rounded-lg transition-colors`}>1</button>{start > 2 && <span className={t.textFaint}>…</span>}</>}
        {pages.map(p => (
          <button key={p} type="button" onClick={() => onPage(p)} className={`h-7 w-7 text-xs rounded-lg transition-colors ${p === current ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>{p}</button>
        ))}
        {end < total && <>{end < total - 1 && <span className={t.textFaint}>…</span>}<button type="button" onClick={() => onPage(total)} className={`h-7 w-7 text-xs ${t.textFaint} ${t.hoverText} ${t.hoverBg} rounded-lg transition-colors`}>{total}</button></>}
        <button type="button" onClick={() => onPage(current + 1)} disabled={current === total} title="Next" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-30 transition-colors`}><ChevronRight className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onPage(total)} disabled={current === total} title="Last" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-30 transition-colors`}><ChevronsRight className="h-3.5 w-3.5" /></button>
        <SelectField size="filter"
          value={String(perPage)}
          onChange={v => onPerPage(Number(v))}
          title="Items per page"
          options={[12, 24, 48, 96].map(n => ({ value: String(n), label: `${n}/page` }))} />
      </div>
    </div>
  );
}

// InfoRow/SummaryItem now come from the shared design system (promoted from
// this page's own local versions — see the design-system migration).

// ─── EquipmentCard — built on the shared RecordCard so it inherits the exact
// homepage module-card treatment (bare accent icon, Montserrat title, GlowCard
// lift/glow). Key summary always visible; the rest expands in place. ──
function EquipmentCard({ eq, onEdit, onDelete }: { eq: EquipmentItem; onEdit: () => void; onDelete: () => void }) {
  const t = useTheme();
  const status = eq.status?.toLowerCase() || 'unknown';
  const mStatus = calcMaintenanceStatus(eq.last_maintenance, eq.maintenance_interval);
  const statusColor = STATUS_COLORS[status] || '#94a3b8';

  return (
    <RecordCard
      icon={statusIcon(eq.status)}
      accentHex={statusColor}
      title={eq.name}
      subtitle={eq.equipment_id}
      badges={<>
        <StatusBadge color={statusColor} label={STATUS_LABELS[status] || eq.status || 'Unknown'} dot />
        <StatusBadge color={MAINT_COLORS[mStatus] || '#94a3b8'} label={mStatus} />
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={MapPin} label="Location" value={eq.location} color={statusColor} />
          <SummaryItem icon={Truck} label="Supplier" value={eq.supplier} color={statusColor} />
        </div>
      }
      actions={<>
        <button onClick={onEdit} type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[12px] font-semibold hover:brightness-110 transition-all">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onDelete} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] font-semibold transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoRow label="Category" value={eq.category} />
        <InfoRow label="Department" value={eq.department} />
        <InfoRow label="Model" value={eq.model} />
        <InfoRow label="Serial Number" value={eq.serial_number} />
        <InfoRow label="Age" value={calcAge(eq.commission_date)} />
        <InfoRow label="Supplier" value={eq.supplier} />
        <InfoRow label="Next Maintenance" value={eq.next_maintenance ? formatDate(eq.next_maintenance) : undefined} />
        <InfoRow label="Current Value" value={eq.current_value != null ? `$${eq.current_value.toLocaleString()}` : undefined} />
      </div>
      {eq.maintenance_notes && (
        <div>
          <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Maintenance Notes</p>
          <p className={`text-xs ${t.textMuted}`}>{eq.maintenance_notes}</p>
        </div>
      )}
    </RecordCard>
  );
}

// ─── EquipmentRow — compact list-view row, mirroring EmployeeRow's pattern. ──
function EquipmentRow({ eq, onEdit, onDelete }: { eq: EquipmentItem; onEdit: () => void; onDelete: () => void }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const status = eq.status?.toLowerCase() || 'unknown';
  const mStatus = calcMaintenanceStatus(eq.last_maintenance, eq.maintenance_interval);
  const statusColor = STATUS_COLORS[status] || '#94a3b8';
  const Icon = statusIcon(eq.status);

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="shrink-0"><Icon className="h-5 w-5" style={{ color: statusColor }} /></div>

        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className={`font-semibold text-sm ${t.textPrimary}`}>{eq.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-mono ${t.textFaint}`}>{eq.equipment_id}</span>
            {eq.category && <span className={`text-xs ${t.textFaint}`}>· {eq.category}</span>}
            <StatusBadge color={statusColor} label={STATUS_LABELS[status] || eq.status || 'Unknown'} dot />
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block"><StatusBadge color={MAINT_COLORS[mStatus] || '#94a3b8'} label={mStatus} /></span>
          {eq.location && <span className={`hidden md:flex items-center gap-1 text-[11px] ${t.textFaint}`}><MapPin className="h-3 w-3" style={{ color: statusColor }} />{eq.location}</span>}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" title="Edit equipment" onClick={onEdit}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-all">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete equipment" onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`px-4 pb-4 pt-3 border-t ${t.border} ${t.hoverBgSoft}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5">
            <InfoRow label="Department" value={eq.department} />
            <InfoRow label="Model" value={eq.model} />
            <InfoRow label="Serial Number" value={eq.serial_number} />
            <InfoRow label="Age" value={calcAge(eq.commission_date)} />
            <InfoRow label="Supplier" value={eq.supplier} />
            <InfoRow label="Next Maintenance" value={eq.next_maintenance ? formatDate(eq.next_maintenance) : undefined} />
            <InfoRow label="Current Value" value={eq.current_value != null ? `$${eq.current_value.toLocaleString()}` : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [filtered, setFiltered] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<EquipmentItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Records are grouped by category (homepage category-accordion vocabulary); this
  // tracks which category groups the user has collapsed (default: all open).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const uniqueLocations = useMemo(() => [...new Set(equipment.map(i => i.location).filter(Boolean) as string[])], [equipment]);
  const uniqueDepartments = useMemo(() => [...new Set(equipment.map(i => i.department).filter(Boolean) as string[])], [equipment]);
  const uniqueCategories = useMemo(() => [...new Set(equipment.map(i => i.category).filter(Boolean) as string[])], [equipment]);

  const fetchEquipment = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchEquipmentList();
      setEquipment(data);
      setFiltered(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  useEffect(() => {
    let result = equipment;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) || i.equipment_id?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) || i.serial_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
    if (locationFilter !== 'all') result = result.filter(i => i.location === locationFilter);
    if (departmentFilter !== 'all') result = result.filter(i => i.department === departmentFilter);
    setFiltered(result);
    setCurrentPage(1);
  }, [equipment, searchTerm, statusFilter, categoryFilter, locationFilter, departmentFilter]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      const isEditing = !!editingEq;
      const body = isEditing ? { id: editingEq!.id, ...formData } : formData;
      if (isEditing) await updateEquipment(editingEq!.id, body);
      else await createEquipment(body);
      setIsFormOpen(false);
      setEditingEq(null);
      fetchEquipment();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      await deleteEquipment(id);
      fetchEquipment();
      setDeleteConfirm(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); setLocationFilter('all'); setDepartmentFilter('all'); };

  const fmtExportDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // Excel gets every field; the PDF's landscape table only fits a subset
  // (matches the original hand-rolled exports' divergent column sets).
  const exportColumns: DLColumn[] = [
    { key: 'equipment_id', label: 'Equipment ID', width: 16 },
    { key: 'name', label: 'Name', width: 28 },
    { key: 'category', label: 'Category', width: 18 },
    { key: 'status', label: 'Status', width: 16 },
    { key: 'location', label: 'Location', width: 18 },
    { key: 'department', label: 'Department', width: 18 },
    { key: 'model', label: 'Model', width: 20 },
    { key: 'serial_number', label: 'Serial Number', width: 18 },
    { key: 'commission_date', label: 'Commission Date', width: 16, format: v => fmtExportDate(v as string) },
    { key: 'last_maintenance', label: 'Last Maintenance', width: 16, format: v => fmtExportDate(v as string) },
    { key: 'next_maintenance', label: 'Next Maintenance', width: 16, format: v => fmtExportDate(v as string) },
    { key: 'purchase_cost', label: 'Purchase Cost', width: 16 },
    { key: 'current_value', label: 'Current Value', width: 16 },
    { key: 'supplier', label: 'Supplier', width: 22 },
  ];
  const exportPdfColumns: DLColumn[] = [
    { key: 'equipment_id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'location', label: 'Location' },
    { key: 'department', label: 'Department' },
    { key: 'model', label: 'Model' },
    { key: 'serial_number', label: 'Serial No.' },
    { key: 'commission_date', label: 'Commissioned', format: v => fmtExportDate(v as string) },
    { key: 'next_maintenance', label: 'Next Maint.', format: v => fmtExportDate(v as string) },
    { key: 'current_value', label: 'Value', format: v => v != null ? `$${(v as number).toLocaleString()}` : '' },
  ];

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || departmentFilter !== 'all' || !!searchTerm;

  const metrics = useMemo(() => {
    const operational = equipment.filter(i => i.status?.toLowerCase() === 'operational').length;
    const maintenance = equipment.filter(i => i.status?.toLowerCase() === 'maintenance').length;
    const outOfService = equipment.filter(i => i.status?.toLowerCase() === 'out_of_service').length;
    const reserved = equipment.filter(i => i.status?.toLowerCase() === 'reserved').length;
    const totalValue = equipment.reduce((s, i) => s + (i.current_value || 0), 0);
    return { total: equipment.length, operational, maintenance, outOfService, reserved, totalValue };
  }, [equipment]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Group the current page's items by category — defined categories alphabetically,
  // "Uncategorized" last.
  const grouped = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const eq of paginated) {
      const key = eq.category || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(eq);
    }
    return [...map.keys()]
      .sort((a, b) => (a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)))
      .map(category => ({ category, color: categoryColor(category === 'Uncategorized' ? undefined : category), items: map.get(category)! }));
  }, [paginated]);

  const isGroupOpen = (category: string) => !!searchTerm || !collapsedGroups.has(category);
  const toggleGroup = (category: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(category) ? next.delete(category) : next.add(category);
    return next;
  });

  const heroTiles = [
    { icon: Server, color: ACCENT_HEX.blue, value: metrics.total, label: 'Total' },
    { icon: CheckCircle, color: STATUS_COLORS.operational, value: metrics.operational, label: 'Operational', onClick: () => setStatusFilter('operational') },
    { icon: Wrench, color: STATUS_COLORS.maintenance, value: metrics.maintenance, label: 'Maintenance', onClick: () => setStatusFilter('maintenance') },
    { icon: XCircle, color: STATUS_COLORS.out_of_service, value: metrics.outOfService, label: 'Out of Service', onClick: () => setStatusFilter('out_of_service') },
    { icon: Package, color: STATUS_COLORS.reserved, value: metrics.reserved, label: 'Reserved', onClick: () => setStatusFilter('reserved') },
    { icon: Target, color: ACCENT_HEX.emerald, value: `$${metrics.totalValue.toLocaleString()}`, label: 'Value' },
  ];

  if (loading) {
    return (
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <LoadingState label="Loading equipment data…" />
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Server}
        accent="violet"
        crumbs={['Core Management', 'Assets']}
        title="Equipment Management"
        description="Track all equipment assets — status, location, maintenance history, and performance."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            {equipment.length > 0 && (
              <DownloadButton
                data={equipment as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                pdfColumns={exportPdfColumns}
                filename={exportFilename('Equipment_Register')}
                title="Equipment Register"
              />
            )}
            <button
              type="button"
              onClick={() => { setEditingEq(null); setIsFormOpen(true); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 transition-all hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          {heroTiles.map(tile => <StatTile key={tile.label} {...tile} />)}
        </div>
      </PageHero>

      {error && (
        <div className={`${t.glass} rounded-2xl p-4 flex items-center gap-3 border border-rose-500/30`}>
          <AlertTriangle className={`h-5 w-5 ${accentText('rose', t.light)} shrink-0`} />
          <p className={`text-sm ${accentText('rose', t.light)}`}>{error}</p>
          <button type="button" onClick={() => setError('')} className={`ml-auto ${t.textFaint} ${t.hoverText} text-lg leading-none`}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, ID, model, category…" className="flex-1" />
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
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'list', icon: List, label: 'List view' }]} />
          </div>
        </div>

        {showFilters && (
          <div className={`pt-4 border-t ${t.border} grid grid-cols-2 sm:grid-cols-4 gap-3`}>
            {[
              { label: 'Status', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))] },
              { label: 'Category', value: categoryFilter, onChange: setCategoryFilter, options: [{ value: 'all', label: 'All Categories' }, ...uniqueCategories.map(c => ({ value: c, label: c }))] },
              { label: 'Location', value: locationFilter, onChange: setLocationFilter, options: [{ value: 'all', label: 'All Locations' }, ...uniqueLocations.map(l => ({ value: l, label: l }))] },
              { label: 'Department', value: departmentFilter, onChange: setDepartmentFilter, options: [{ value: 'all', label: 'All Departments' }, ...uniqueDepartments.map(d => ({ value: d, label: d }))] },
            ].map(f => (
              <div key={f.label}>
                <label className={`text-xs font-medium ${t.textFaint} mb-1 block`}>{f.label}</label>
                <SelectField size="filter"
                  value={f.value}
                  onChange={f.onChange}
                  title={f.label}
                  options={f.options} />
              </div>
            ))}
          </div>
        )}
      </div>

      <p className={`text-sm ${t.textFaint}`}>
        Showing <span className={`font-semibold ${t.textPrimary}`}>{filtered.length}</span> of {equipment.length} items
        {hasActiveFilters && ' (filtered)'}
      </p>

      {filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl p-12 text-center`}>
          <Server className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
          <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No Equipment Found</h3>
          <p className={`${t.textFaint} text-sm mb-4`}>
            {equipment.length === 0 ? 'Add your first equipment asset to get started.' : 'Try adjusting your search or filters.'}
          </p>
          {equipment.length === 0 && (
            <button type="button" onClick={() => { setEditingEq(null); setIsFormOpen(true); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {grouped.map(g => (
            <GroupSection
              key={g.category}
              icon={Briefcase}
              accentHex={g.color}
              title={g.category}
              count={g.items.length}
              countLabel={g.items.length === 1 ? 'item' : 'items'}
              open={isGroupOpen(g.category)}
              onToggle={() => toggleGroup(g.category)}
              gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4'}
            >
              {g.items.map(eq => (
                <motion.div key={eq.id} variants={fadeUp}>
                  {viewMode === 'grid'
                    ? <EquipmentCard eq={eq} onEdit={() => { setEditingEq(eq); setIsFormOpen(true); }} onDelete={() => setDeleteConfirm(eq.id)} />
                    : <EquipmentRow eq={eq} onEdit={() => { setEditingEq(eq); setIsFormOpen(true); }} onDelete={() => setDeleteConfirm(eq.id)} />}
                </motion.div>
              ))}
            </GroupSection>
          ))}
        </motion.div>
      )}

      {filtered.length > perPage && (
        <Pagination
          current={currentPage}
          total={totalPages}
          onPage={setCurrentPage}
          perPage={perPage}
          totalItems={filtered.length}
          onPerPage={n => { setPerPage(n); setCurrentPage(1); }}
        />
      )}

      {/* Equipment form modal */}
      <CenterModal
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingEq(null); }}
        title={editingEq ? 'Edit Equipment' : 'Add New Equipment'}
        subtitle={editingEq ? editingEq.equipment_id : 'New asset'}
        accent="violet"
        width="max-w-3xl"
      >
        <EquipmentForm
          equipment={editingEq}
          onSubmit={handleFormSubmit}
          onCancel={() => { setIsFormOpen(false); setEditingEq(null); }}
        />
      </CenterModal>

      {/* Delete confirmation modal */}
      <CenterModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Deletion"
        subtitle="This action cannot be undone"
        accent="amber"
        width="max-w-sm"
      >
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Are you sure you want to delete this equipment?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteConfirm(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button
              type="button"
              onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function EquipmentPage() {
  return (
    <AppShell>
      <EquipmentPageContent />
    </AppShell>
  );
}
