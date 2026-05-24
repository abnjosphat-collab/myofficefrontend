// app/equipment/page.tsx
'use client';

import { PageShell } from '@/components/PageShell';
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from 'sonner';
import EquipmentForm from "@/components/EquipmentForm";
import {
  Loader2, Plus, Search, Trash2, Edit, Briefcase, Calendar, Wrench, Phone,
  MapPin, FileText, BarChart3, Target, Building, Clock, Truck, AlertTriangle,
  CheckCircle, XCircle, Cpu, LayoutGrid, List, ChevronUp, ChevronDown,
  Server, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, FilterX, RefreshCw, Download, FileSpreadsheet, FileDown,
} from "lucide-react";
import {
  HeroPanel, GlassPanel, GlassButton, GlassBadge, GlassInput, GlassSelect,
  GlassModal, usePageCollapse, MasterCollapseButton,
} from "@/components/shared";
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

// --- Utility helpers ---
function statusBadge(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case 'operational': return <GlassBadge variant="success">Operational</GlassBadge>;
    case 'maintenance': return <GlassBadge variant="warning">Maintenance</GlassBadge>;
    case 'out_of_service': return <GlassBadge variant="danger">Out of Service</GlassBadge>;
    case 'reserved': return <GlassBadge variant="info">Reserved</GlassBadge>;
    case 'retired': return <GlassBadge variant="neutral">Retired</GlassBadge>;
    default: return <GlassBadge variant="neutral">{status || 'Unknown'}</GlassBadge>;
  }
}

function maintenanceBadge(status: string) {
  switch (status) {
    case 'Overdue': return <GlassBadge variant="danger">Overdue</GlassBadge>;
    case 'Due Soon': return <GlassBadge variant="warning">Due Soon</GlassBadge>;
    case 'Upcoming': return <GlassBadge variant="info">Upcoming</GlassBadge>;
    default: return <GlassBadge variant="success">On Track</GlassBadge>;
  }
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

// --- Expanded details panel ---
function ExpandedDetails({ eq }: { eq: EquipmentItem }) {
  const age = calcAge(eq.commission_date);
  const mStatus = calcMaintenanceStatus(eq.last_maintenance, eq.maintenance_interval);
  return (
    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-[#86BBD8] mb-2 flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Basic Info</p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Equipment ID</span><span className="text-white">{eq.equipment_id}</span></div>
          <div className="flex justify-between"><span>Serial</span><span className="text-white">{eq.serial_number || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Model</span><span className="text-white">{eq.model || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Category</span><span className="text-white">{eq.category || 'N/A'}</span></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#86BBD8] mb-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Location</p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Location</span><span className="text-white">{eq.location || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Department</span><span className="text-white">{eq.department || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Age</span><span className="text-white">{age}</span></div>
          <div className="flex justify-between"><span>Commission</span><span className="text-white">{eq.commission_date || 'N/A'}</span></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#86BBD8] mb-2 flex items-center gap-1"><Truck className="h-3.5 w-3.5" />Supplier</p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Supplier</span><span className="text-white">{eq.supplier || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Contact</span><span className="text-white">{eq.supplier_contact || 'N/A'}</span></div>
          <div className="flex justify-between">
            <span>Phone</span>
            {eq.supplier_phone
              ? <button type="button" onClick={() => window.open(`tel:${eq.supplier_phone}`, '_self')} className="text-[#86BBD8] hover:underline">{eq.supplier_phone}</button>
              : <span className="text-white">N/A</span>}
          </div>
          <div className="flex justify-between"><span>Warranty</span><span className="text-white">{eq.warranty_info || 'N/A'}</span></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#86BBD8] mb-2 flex items-center gap-1"><Wrench className="h-3.5 w-3.5" />Maintenance</p>
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between"><span>Interval</span><span className="text-white">{eq.maintenance_interval ? `${eq.maintenance_interval} mo` : 'N/A'}</span></div>
          <div className="flex justify-between"><span>Last</span><span className="text-white">{eq.last_maintenance || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Next Due</span><span className="text-white">{eq.next_maintenance || 'N/A'}</span></div>
          <div className="flex items-center justify-between"><span>Status</span>{maintenanceBadge(mStatus)}</div>
        </div>
      </div>
      {(eq.purchase_cost || eq.current_value) && (
        <div>
          <p className="text-xs font-semibold text-[#86BBD8] mb-2 flex items-center gap-1"><Target className="h-3.5 w-3.5" />Cost</p>
          <div className="space-y-1 text-xs text-white/70">
            {eq.purchase_cost && <div className="flex justify-between"><span>Purchase</span><span className="text-white">${eq.purchase_cost}</span></div>}
            {eq.current_value && <div className="flex justify-between"><span>Current Value</span><span className="text-white">${eq.current_value}</span></div>}
            {eq.depreciation_rate && <div className="flex justify-between"><span>Depreciation</span><span className="text-white">{eq.depreciation_rate}%</span></div>}
          </div>
        </div>
      )}
      {(eq.description || eq.specifications || eq.maintenance_notes) && (
        <div className="sm:col-span-2 space-y-2">
          {eq.description && <div><p className="text-xs font-semibold text-[#86BBD8] mb-1">Description</p><p className="text-xs text-white/70">{eq.description}</p></div>}
          {eq.specifications && <div><p className="text-xs font-semibold text-[#86BBD8] mb-1">Specifications</p><p className="text-xs text-white/70">{eq.specifications}</p></div>}
          {eq.maintenance_notes && <div><p className="text-xs font-semibold text-[#86BBD8] mb-1">Maintenance Notes</p><p className="text-xs text-white/70">{eq.maintenance_notes}</p></div>}
        </div>
      )}
    </div>
  );
}

// --- Equipment grid card ---
function EquipmentCard({
  eq, onEdit, onDelete, expanded, onToggle,
}: { eq: EquipmentItem; onEdit: (e: EquipmentItem) => void; onDelete: (id: number | string) => void; expanded: boolean; onToggle: () => void }) {
  const StatusIcon = statusIcon(eq.status);
  const age = calcAge(eq.commission_date);

  return (
    <div className="oz-glass-panel rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#2A4D69]/60 shrink-0">
            <StatusIcon className="h-4 w-4 text-[#86BBD8]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{eq.name}</p>
            <p className="text-xs text-white/50">{eq.equipment_id}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-white/60"><Briefcase className="h-3 w-3" /><span className="truncate">{eq.category || 'N/A'}</span></div>
        <div className="flex items-center gap-1 text-white/60"><Clock className="h-3 w-3" /><span>{age}</span></div>
        <div className="flex items-center gap-1 text-white/60"><MapPin className="h-3 w-3" /><span className="truncate">{eq.location || 'N/A'}</span></div>
        <div>{statusBadge(eq.status)}</div>
      </div>

      {expanded && <ExpandedDetails eq={eq} />}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        <GlassButton size="xs" icon={Edit} onClick={() => onEdit(eq)} className="flex-1">Edit</GlassButton>
        <GlassButton size="xs" icon={Trash2} variant="danger" onClick={() => onDelete(eq.id)} title="Delete" aria-label="Delete equipment" />
      </div>
    </div>
  );
}

// --- Equipment list row ---
function EquipmentListRow({
  eq, onEdit, onDelete, expanded, onToggle,
}: { eq: EquipmentItem; onEdit: (e: EquipmentItem) => void; onDelete: (id: number | string) => void; expanded: boolean; onToggle: () => void }) {
  const StatusIcon = statusIcon(eq.status);
  const mStatus = calcMaintenanceStatus(eq.last_maintenance, eq.maintenance_interval);
  const age = calcAge(eq.commission_date);

  return (
    <div className="oz-glass-panel rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <div className="p-1.5 rounded-lg bg-[#2A4D69]/60 shrink-0">
          <StatusIcon className="h-4 w-4 text-[#86BBD8]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white">{eq.name}</span>
            {statusBadge(eq.status)}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5 flex-wrap">
            <span>{eq.equipment_id}</span>
            {eq.category && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{eq.category}</span>}
            {eq.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{eq.location}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{age}</span>
          </div>
        </div>
        <div className="shrink-0 hidden sm:block">{maintenanceBadge(mStatus)}</div>
        <div className="flex gap-1 shrink-0">
          <GlassButton size="xs" icon={Edit} onClick={() => onEdit(eq)} title="Edit" aria-label="Edit equipment" />
          <GlassButton size="xs" icon={Trash2} variant="danger" onClick={() => onDelete(eq.id)} title="Delete" aria-label="Delete equipment" />
        </div>
      </div>
      {expanded && <ExpandedDetails eq={eq} />}
    </div>
  );
}

// --- Simple glass pagination ---
function GlassPagination({ current, total, onPage, perPage, totalItems, onPerPage }: {
  current: number; total: number; onPage: (p: number) => void;
  perPage: number; totalItems: number; onPerPage: (n: number) => void;
}) {
  const from = (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, totalItems);

  const pages: number[] = [];
  const max = 5;
  let start = Math.max(1, current - Math.floor(max / 2));
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
      <p className="text-sm text-white/60">Showing {from}–{to} of {totalItems}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <GlassButton size="xs" icon={ChevronsLeft} onClick={() => onPage(1)} disabled={current === 1} title="First" aria-label="First page" />
        <GlassButton size="xs" icon={ChevronLeft} onClick={() => onPage(current - 1)} disabled={current === 1} title="Previous" aria-label="Previous page" />
        {start > 1 && <><button type="button" onClick={() => onPage(1)} className="h-7 w-7 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">1</button>{start > 2 && <span className="text-white/30">…</span>}</>}
        {pages.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`h-7 w-7 text-xs rounded-lg transition-colors ${p === current ? 'bg-[#2A4D69]/60 text-[#86BBD8] border border-[#86BBD8]/25' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            {p}
          </button>
        ))}
        {end < total && <>{end < total - 1 && <span className="text-white/30">…</span>}<button type="button" onClick={() => onPage(total)} className="h-7 w-7 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">{total}</button></>}
        <GlassButton size="xs" icon={ChevronRight} onClick={() => onPage(current + 1)} disabled={current === total} title="Next" aria-label="Next page" />
        <GlassButton size="xs" icon={ChevronsRight} onClick={() => onPage(total)} disabled={current === total} title="Last" aria-label="Last page" />
        <GlassSelect
          options={[{value:'12',label:'12/page'},{value:'24',label:'24/page'},{value:'48',label:'48/page'},{value:'96',label:'96/page'}]}
          value={String(perPage)}
          onChange={e => onPerPage(Number(e.target.value))}
          wrapperClassName="w-28"
        />
      </div>
    </div>
  );
}

// --- Main page ---
const EquipmentManagement = () => {
  const sections = usePageCollapse({ hero: false, filtersSearch: false });
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
  const [expandedItems, setExpandedItems] = useState<Set<number | string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const toggleExpand = (id: number | string) => {
    setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); setLocationFilter('all'); setDepartmentFilter('all'); };

  const [showDlMenu, setShowDlMenu] = useState(false);

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
    } catch (err: any) { toast.error(`Export failed: ${(err as Error).message}`); }
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
    } catch (err: any) { toast.error(`Export failed: ${(err as Error).message}`); }
  };
  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || departmentFilter !== 'all' || !!searchTerm;

  const metrics = useMemo(() => {
    const operational = equipment.filter(i => i.status?.toLowerCase() === 'operational').length;
    const maintenance = equipment.filter(i => i.status?.toLowerCase() === 'maintenance').length;
    const outOfService = equipment.filter(i => i.status?.toLowerCase() === 'out_of_service').length;
    const reserved = equipment.filter(i => i.status?.toLowerCase() === 'reserved').length;
    const retired = equipment.filter(i => i.status?.toLowerCase() === 'retired').length;
    const totalValue = equipment.reduce((s, i) => s + (i.current_value || 0), 0);
    return { total: equipment.length, operational, maintenance, outOfService, reserved, retired, totalValue };
  }, [equipment]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const heroStats = [
    { label: 'Total Assets', value: metrics.total },
    { label: 'Operational', value: metrics.operational, textClass: 'text-emerald-400', onClick: () => setStatusFilter('operational') },
    { label: 'Maintenance', value: metrics.maintenance, textClass: 'text-amber-400', onClick: () => setStatusFilter('maintenance') },
    { label: 'Out of Service', value: metrics.outOfService, textClass: 'text-red-400', onClick: () => setStatusFilter('out_of_service') },
    { label: 'Reserved', value: metrics.reserved, textClass: 'text-[#86BBD8]', onClick: () => setStatusFilter('reserved') },
    { label: 'Total Value', value: `$${metrics.totalValue.toLocaleString()}` },
  ];

  if (loading) {
    return (
      <PageShell>
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#86BBD8] mx-auto mb-4" />
              <p className="text-white/60">Loading equipment data…</p>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <HeroPanel
          title="Equipment Management"
          subtitle="Track all equipment assets — status, location, maintenance history, and performance."
          icon={Server}
          stats={heroStats}
          onRefresh={fetchEquipment}
          loading={refreshing}
          {...sections.panel('hero')}
          actions={[
            <MasterCollapseButton key="collapse" collapse={sections} />,
            <div key="download" className="relative">
              <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={equipment.length === 0}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white/80 hover:text-white transition-all hover:-translate-y-0.5 bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.15] disabled:opacity-40 disabled:translate-y-0">
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {showDlMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden w-48"
                    style={{ background: 'rgba(4,12,24,0.97)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <button type="button" onClick={downloadEquipmentExcel}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all border-b border-white/[0.07]">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                    </button>
                    <button type="button" onClick={downloadEquipmentPDF}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all">
                      <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>,
            <GlassButton key="add" icon={Plus} variant="primary" onClick={() => { setEditingEq(null); setIsFormOpen(true); }}>
              Add Equipment
            </GlassButton>,
          ]}
        />

        {error && (
          <div className="oz-glass-panel rounded-2xl p-4 flex items-center gap-3 border border-red-500/30">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => setError('')} className="ml-auto text-white/40 hover:text-white text-lg leading-none">×</button>
          </div>
        )}

        {/* Filters */}
        <GlassPanel title="Filters & Search" defaultOpen {...sections.panel('filtersSearch')}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <GlassInput
              placeholder="Search by name, ID, model, category…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              icon={Search}
              wrapperClassName="flex-1"
            />
            <div className="flex gap-2 flex-wrap">
              <GlassButton size="sm" icon={Filter} onClick={() => setShowFilters(v => !v)} variant={showFilters ? 'primary' : 'secondary'}>
                Filters {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-[#86BBD8]/30 rounded text-[10px]">{filtered.length}</span>}
              </GlassButton>
              {hasActiveFilters && <GlassButton size="sm" icon={FilterX} onClick={clearFilters} variant="ghost">Clear</GlassButton>}
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                <button type="button" onClick={() => setViewMode('grid')} title="Grid view" aria-label="Grid view" className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode('list')} title="List view" aria-label="List view" className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><List className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <GlassSelect
                label="Status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                options={[{value:'all',label:'All Status'},{value:'operational',label:'Operational'},{value:'maintenance',label:'Maintenance'},{value:'out_of_service',label:'Out of Service'},{value:'reserved',label:'Reserved'},{value:'retired',label:'Retired'}]}
              />
              <GlassSelect
                label="Category"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                options={[{value:'all',label:'All Categories'}, ...uniqueCategories.map(c => ({value:c,label:c}))]}
              />
              <GlassSelect
                label="Location"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                options={[{value:'all',label:'All Locations'}, ...uniqueLocations.map(l => ({value:l,label:l}))]}
              />
              <GlassSelect
                label="Department"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                options={[{value:'all',label:'All Departments'}, ...uniqueDepartments.map(d => ({value:d,label:d}))]}
              />
            </div>
          )}
        </GlassPanel>

        <p className="text-sm text-white/60">
          Showing <span className="font-semibold text-white">{filtered.length}</span> of {equipment.length} items
          {hasActiveFilters && ' (filtered)'}
        </p>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="oz-glass-panel rounded-2xl p-12 text-center">
            <Server className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Equipment Found</h3>
            <p className="text-white/50 text-sm mb-4">
              {equipment.length === 0 ? 'Add your first equipment asset to get started.' : 'Try adjusting your search or filters.'}
            </p>
            {equipment.length === 0 && (
              <GlassButton icon={Plus} variant="primary" onClick={() => { setEditingEq(null); setIsFormOpen(true); }}>Add Equipment</GlassButton>
            )}
          </div>
        )}

        {/* Grid view */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(eq => (
              <EquipmentCard
                key={eq.id}
                eq={eq}
                onEdit={e => { setEditingEq(e); setIsFormOpen(true); }}
                onDelete={setDeleteConfirm}
                expanded={expandedItems.has(eq.id)}
                onToggle={() => toggleExpand(eq.id)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {filtered.length > 0 && viewMode === 'list' && (
          <div className="space-y-2">
            {paginated.map(eq => (
              <EquipmentListRow
                key={eq.id}
                eq={eq}
                onEdit={e => { setEditingEq(e); setIsFormOpen(true); }}
                onDelete={setDeleteConfirm}
                expanded={expandedItems.has(eq.id)}
                onToggle={() => toggleExpand(eq.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > perPage && (
          <GlassPagination
            current={currentPage}
            total={totalPages}
            onPage={setCurrentPage}
            perPage={perPage}
            totalItems={filtered.length}
            onPerPage={n => { setPerPage(n); setCurrentPage(1); }}
          />
        )}

        {/* Equipment form modal */}
        <GlassModal
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingEq(null); }}
          title={editingEq ? 'Edit Equipment' : 'Add New Equipment'}
          size="xl"
        >
          <EquipmentForm
            equipment={editingEq}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingEq(null); }}
          />
        </GlassModal>

        {/* Delete confirmation modal */}
        <GlassModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Confirm Deletion"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <GlassButton variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</GlassButton>
              <GlassButton variant="danger" icon={Trash2} onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Delete</GlassButton>
            </div>
          }
        >
          <p className="text-white/70 text-sm">Are you sure you want to delete this equipment? This action cannot be undone.</p>
        </GlassModal>
      </main>
    </PageShell>
  );
};

export default EquipmentManagement;
