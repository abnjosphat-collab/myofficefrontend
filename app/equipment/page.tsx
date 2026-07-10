// app/equipment/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from 'sonner';
import EquipmentForm from "@/components/EquipmentForm";
import {
  Loader2, Plus, Trash2, Edit, Briefcase, Wrench, MapPin,
  FileText, Target, Clock, Truck, AlertTriangle,
  CheckCircle, XCircle, LayoutGrid, List,
  Server, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, FilterX, Download, FileSpreadsheet, FileDown,
} from "lucide-react";
import {
  useTheme, PageHero, StatTile, StatusBadge, ListItemCard, SearchInput, ViewToggle,
  useCollapseSection, CenterModal, ACCENT_HEX, SelectField,
} from '@/components/shared/theme';
import type { ElementType } from "react";

interface EquipmentItem {
  id: number | string;
  equipment_id: string;
  name: string;
  status?: string;
  category?: string;
  location?: string;
  department?: string;
  model?: string;
  serial_number?: string;
  commission_date?: string;
  supplier?: string;
  supplier_contact?: string;
  supplier_phone?: string;
  warranty_info?: string;
  maintenance_interval?: number;
  last_maintenance?: string;
  next_maintenance?: string;
  maintenance_notes?: string;
  purchase_cost?: number;
  current_value?: number;
  depreciation_rate?: number;
  description?: string;
  specifications?: string;
}

interface ValidationError {
  loc?: string[];
  msg: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const API_BASE_URL = `${API_BASE}/api/equipment`;
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
          <button key={p} type="button" onClick={() => onPage(p)} className={`h-7 w-7 text-xs rounded-lg transition-colors ${p === current ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>{p}</button>
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
  const [showDlMenu, setShowDlMenu] = useState(false);

  const uniqueLocations = useMemo(() => [...new Set(equipment.map(i => i.location).filter(Boolean) as string[])], [equipment]);
  const uniqueDepartments = useMemo(() => [...new Set(equipment.map(i => i.department).filter(Boolean) as string[])], [equipment]);
  const uniqueCategories = useMemo(() => [...new Set(equipment.map(i => i.category).filter(Boolean) as string[])], [equipment]);

  const fetchEquipment = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(API_BASE_URL);
      if (!res.ok) throw new Error('Failed to fetch equipment');
      const data: EquipmentItem[] = await res.json();
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
      const url = isEditing ? `${API_BASE_URL}/${editingEq!.id}` : API_BASE_URL;
      const body = isEditing ? { id: editingEq!.id, ...formData } : formData;
      const res = await fetch(url, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        let msg = 'Failed to save equipment';
        try {
          const d = await res.json();
          if (Array.isArray(d)) msg = (d as ValidationError[]).map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          else if (d.detail) msg = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail);
          else if (d.message) msg = typeof d.message === 'string' ? d.message : JSON.stringify(d.message);
          else msg = JSON.stringify(d);
        } catch { msg = res.statusText || `HTTP ${res.status}`; }
        throw new Error(msg);
      }
      setIsFormOpen(false);
      setEditingEq(null);
      fetchEquipment();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete equipment');
      fetchEquipment();
      setDeleteConfirm(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); setLocationFilter('all'); setDepartmentFilter('all'); };

  const downloadEquipmentExcel = async () => {
    setShowDlMenu(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('Equipment Register');
      ws.columns = [
        { header: 'Equipment ID',    key: 'eqid',    width: 16 },
        { header: 'Name',            key: 'name',    width: 28 },
        { header: 'Category',        key: 'cat',     width: 18 },
        { header: 'Status',          key: 'status',  width: 16 },
        { header: 'Location',        key: 'loc',     width: 18 },
        { header: 'Department',      key: 'dept',    width: 18 },
        { header: 'Model',           key: 'model',   width: 20 },
        { header: 'Serial Number',   key: 'serial',  width: 18 },
        { header: 'Commission Date', key: 'comm',    width: 16 },
        { header: 'Last Maintenance',key: 'lastmnt', width: 16 },
        { header: 'Next Maintenance',key: 'nextmnt', width: 16 },
        { header: 'Purchase Cost',   key: 'pcost',   width: 16 },
        { header: 'Current Value',   key: 'cval',    width: 16 },
        { header: 'Supplier',        key: 'supplier',width: 22 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      equipment.forEach((e, i) => {
        const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB') : '';
        const row = ws.addRow({
          eqid: e.equipment_id, name: e.name, cat: e.category || '', status: e.status || '',
          loc: e.location || '', dept: e.department || '', model: e.model || '',
          serial: e.serial_number || '', comm: fmt(e.commission_date),
          lastmnt: fmt(e.last_maintenance), nextmnt: fmt(e.next_maintenance),
          pcost: e.purchase_cost ?? '', cval: e.current_value ?? '', supplier: e.supplier || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
      });
      ws.autoFilter = { from: 'A1', to: 'N1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Equipment_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${equipment.length} assets`);
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  };

  const downloadEquipmentPDF = async () => {
    setShowDlMenu(false);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14); doc.setTextColor(42, 77, 105);
      doc.text('Equipment Register', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${equipment.length} assets`, 14, 20);
      const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB') : '';
      autoTable(doc, {
        startY: 25,
        head: [['ID', 'Name', 'Category', 'Status', 'Location', 'Department', 'Model', 'Serial No.', 'Commissioned', 'Next Maint.', 'Value']],
        body: equipment.map(e => [
          e.equipment_id, e.name, e.category || '', e.status || '', e.location || '',
          e.department || '', e.model || '', e.serial_number || '',
          fmt(e.commission_date), fmt(e.next_maintenance),
          e.current_value != null ? `$${e.current_value.toLocaleString()}` : '',
        ]),
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        styles: { cellPadding: 1.5 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Equipment_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${equipment.length} assets`);
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  };

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
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className={`h-10 w-10 animate-spin ${t.textFaint} mx-auto mb-4`} />
            <p className={t.textFaint}>Loading equipment data…</p>
          </div>
        </div>
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDlMenu(p => !p)}
                disabled={equipment.length === 0}
                className={`h-8 px-3 flex items-center gap-1.5 text-[13px] rounded-lg font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} transition-colors disabled:opacity-40`}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {showDlMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl ${t.shadow} overflow-hidden w-48 ${t.glass}`}>
                    <button type="button" onClick={downloadEquipmentExcel} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] ${t.textMuted} ${t.hoverBgSoft} transition-colors border-b ${t.border}`}>
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                    </button>
                    <button type="button" onClick={downloadEquipmentPDF} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] ${t.textMuted} ${t.hoverBgSoft} transition-colors`}>
                      <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setEditingEq(null); setIsFormOpen(true); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:brightness-110"
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
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-400">{error}</p>
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
            <button type="button" onClick={() => { setEditingEq(null); setIsFormOpen(true); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
          {paginated.map(eq => {
            const status = eq.status?.toLowerCase() || 'unknown';
            const mStatus = calcMaintenanceStatus(eq.last_maintenance, eq.maintenance_interval);
            return (
              <ListItemCard
                key={eq.id}
                color={STATUS_COLORS[status] || '#94a3b8'}
                icon={statusIcon(eq.status)}
                title={eq.name}
                subtitle={eq.equipment_id}
                onEdit={() => { setEditingEq(eq); setIsFormOpen(true); }}
                onDelete={() => setDeleteConfirm(eq.id)}
                badges={<>
                  <StatusBadge color={STATUS_COLORS[status] || '#94a3b8'} label={STATUS_LABELS[status] || eq.status || 'Unknown'} dot />
                  <StatusBadge color={MAINT_COLORS[mStatus] || '#94a3b8'} label={mStatus} />
                </>}
                rows={[
                  { label: 'Category', value: <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{eq.category || 'N/A'}</span> },
                  { label: 'Location', value: <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{eq.location || 'N/A'}</span> },
                  { label: 'Age', value: <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{calcAge(eq.commission_date)}</span> },
                  { label: 'Supplier', value: <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{eq.supplier || 'N/A'}</span> },
                ]}
              />
            );
          })}
        </div>
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
        <div className="p-5">
          <EquipmentForm
            equipment={editingEq}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingEq(null); }}
          />
        </div>
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
