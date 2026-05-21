// app/drivers/page.tsx — Authorised Drivers Registry
'use client';

import { PageShell } from '@/components/PageShell';
import { GLASS_INPUT as glassInput, GLASS_LABEL as glassLabel, usePageCollapse, MasterCollapseButton } from '@/components/shared';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Car, Search, Plus, Edit, Trash2, RefreshCw, Phone, ChevronRight,
  ChevronDown, ChevronUp, Loader2, X, Check, Users, Building2,
  Download, FileSpreadsheet, FileText, Shield, CheckCircle2, AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DEPARTMENTS = [
  'Mining', 'Engineering', 'Geology', 'Survey', 'Environment',
  'Safety', 'HR', 'Finance', 'IT', 'Logistics', 'Security', 'Administration',
];

const LICENSE_CLASSES = ['Code 08', 'Code 10', 'Code 14', 'EC', 'EC1', 'PrDP', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  inactive: '#f43f5e',
  suspended: '#f59e0b',
};

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface Driver {
  id: number;
  full_name: string;
  phone_numbers: string[];
  department?: string;
  license_class?: string;
  license_expiry?: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface DriverForm {
  full_name: string;
  phones: string[];
  department: string;
  license_class: string;
  license_expiry: string;
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
}

const emptyForm = (): DriverForm => ({
  full_name: '',
  phones: [''],
  department: '',
  license_class: '',
  license_expiry: '',
  status: 'active',
  notes: '',
});

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiGetDrivers(): Promise<Driver[]> {
  const r = await fetch(`${API_URL}/api/drivers?limit=2000`);
  if (!r.ok) throw new Error(`Failed to load drivers: ${r.status}`);
  return r.json();
}

async function apiCreateDriver(payload: object): Promise<Driver> {
  const r = await fetch(`${API_URL}/api/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to create'); }
  return r.json();
}

async function apiUpdateDriver(id: number, payload: object): Promise<Driver> {
  const r = await fetch(`${API_URL}/api/drivers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to update'); }
  return r.json();
}

async function apiDeleteDriver(id: number): Promise<void> {
  const r = await fetch(`${API_URL}/api/drivers/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Failed to delete');
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

function exportExcel(drivers: Driver[]) {
  const rows = drivers.map(d => ({
    'Full Name': d.full_name,
    'Phone Number(s)': (d.phone_numbers || []).join(' / '),
    'Department': d.department || '',
    'License Class': d.license_class || '',
    'License Expiry': d.license_expiry || '',
    'Status': d.status,
    'Notes': d.notes || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 32 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Authorised Drivers');
  XLSX.writeFile(wb, `Authorised_Drivers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast.success('Excel downloaded');
}

function exportPDF(drivers: Driver[], filterLabel: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(42, 77, 105);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Drivers Registry', 14, 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}  ·  ${filterLabel}  ·  ${drivers.length} driver${drivers.length !== 1 ? 's' : ''}`, 14, 16);

  // Build table body — collect phone positions for link annotation
  const phonePositions: { x: number; y: number; w: number; h: number; tel: string }[] = [];

  const body = drivers.map(d => [
    d.full_name,
    (d.phone_numbers || []).join('\n'),
    d.department || '—',
    d.license_class || '—',
    d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('en-GB') : '—',
    d.status.toUpperCase(),
    d.notes || '',
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['Full Name', 'Phone Number(s)', 'Department', 'Licence Class', 'Expiry', 'Status', 'Notes']],
    body,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: [30, 30, 30],
      lineColor: [220, 230, 240],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: [42, 77, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 249, 253] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { cellWidth: 46, textColor: [30, 90, 160] },
      2: { cellWidth: 32 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 'auto' },
    },
    didDrawCell(data) {
      // Annotate phone cells with tel: links
      if (data.section === 'body' && data.column.index === 1) {
        const driver = drivers[data.row.index];
        if (!driver) return;
        const phones = driver.phone_numbers || [];
        if (phones.length === 0) return;

        const lineH = data.cell.height / Math.max(phones.length, 1);
        phones.forEach((phone, i) => {
          const raw = phone.replace(/\s/g, '');
          if (!raw) return;
          phonePositions.push({
            x: data.cell.x,
            y: data.cell.y + i * lineH,
            w: data.cell.width,
            h: lineH,
            tel: `tel:${raw}`,
          });
        });
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Apply tel: links after table is drawn
  phonePositions.forEach(pos => {
    doc.link(pos.x, pos.y, pos.w, pos.h, { url: pos.tel });
  });

  // Footer on each page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Ozech MyOffice — Confidential', 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`Authorised_Drivers_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('PDF downloaded — phone numbers are clickable links');
}

// ─── PHONE INPUT ROW ─────────────────────────────────────────────────────────

function PhoneRows({ phones, onChange }: { phones: string[]; onChange: (v: string[]) => void }) {
  const add = () => { if (phones.length < 4) onChange([...phones, '']); };
  const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => onChange(phones.map((p, idx) => idx === i ? v : p));

  return (
    <div className="space-y-1.5">
      {phones.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <input type="tel" value={p} onChange={e => update(i, e.target.value)}
              placeholder={i === 0 ? 'Primary number…' : 'Additional number…'}
              className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all" />
          </div>
          {phones.length > 1 && (
            <button type="button" title="Remove" onClick={() => remove(i)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-rose-500/20 text-white/25 hover:text-rose-400 transition-all flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {phones.length < 4 && (
        <button type="button" onClick={add}
          className="text-[11px] text-white/35 hover:text-[#86BBD8] transition-colors flex items-center gap-1 mt-0.5">
          <Plus className="h-3 w-3" /> Add number
        </button>
      )}
    </div>
  );
}

// ─── DRIVER FORM MODAL ────────────────────────────────────────────────────────

function DriverModal({
  open, onClose, onSave, initial, departments,
}: {
  open: boolean; onClose: () => void; onSave: (f: DriverForm) => Promise<void>;
  initial?: Driver; departments: string[];
}) {
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        full_name: initial.full_name,
        phones: initial.phone_numbers?.length ? initial.phone_numbers : [''],
        department: initial.department || '',
        license_class: initial.license_class || '',
        license_expiry: initial.license_expiry?.slice(0, 10) || '',
        status: initial.status,
        notes: initial.notes || '',
      } : emptyForm());
    }
  }, [open, initial]);

  const setF = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  if (!open) return null;

  const allDepts = [...new Set([...DEPARTMENTS, ...departments])].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(8,18,32,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/20">
              <Car className="h-4 w-4 text-[#86BBD8]" />
            </div>
            <span className="text-sm font-semibold text-white">
              {initial ? 'Edit Driver' : 'Add Driver'}
            </span>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Full name */}
          <div>
            <label className={glassLabel}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => setF('full_name', e.target.value)}
              placeholder="e.g. John Moyo" className={glassInput} autoFocus />
          </div>

          {/* Phones */}
          <div>
            <label className={glassLabel}>Phone Number(s)</label>
            <PhoneRows phones={form.phones} onChange={v => setF('phones', v)} />
          </div>

          {/* Department + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={glassLabel}>Department</label>
              <input list="dept-list" value={form.department} onChange={e => setF('department', e.target.value)}
                placeholder="Select or type…" className={glassInput} />
              <datalist id="dept-list">
                {allDepts.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div>
              <label className={glassLabel}>Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value as DriverForm['status'])}
                className={glassInput + ' cursor-pointer'} style={{ colorScheme: 'dark' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* License class + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={glassLabel}>Licence Class</label>
              <input list="lic-list" value={form.license_class} onChange={e => setF('license_class', e.target.value)}
                placeholder="e.g. Code 10, PrDP…" className={glassInput} />
              <datalist id="lic-list">
                {LICENSE_CLASSES.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
            <div>
              <label className={glassLabel}>Licence Expiry</label>
              <input type="date" value={form.license_expiry} onChange={e => setF('license_expiry', e.target.value)}
                className={glassInput} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={glassLabel}>Notes</label>
            <input type="text" value={form.notes} onChange={e => setF('notes', e.target.value)}
              placeholder="Any additional info…" className={glassInput} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {initial ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const sections = usePageCollapse({ stats: false, records: false });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // UI
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const data = await apiGetDrivers();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived
  const departments = useMemo(() =>
    [...new Set(drivers.map(d => d.department).filter(Boolean) as string[])].sort(),
    [drivers]);

  const filtered = useMemo(() => {
    let list = drivers;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (deptFilter !== 'all') list = list.filter(d => d.department === deptFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(d =>
        d.full_name.toLowerCase().includes(t) ||
        (d.department || '').toLowerCase().includes(t) ||
        (d.license_class || '').toLowerCase().includes(t) ||
        (d.phone_numbers || []).some(p => p.includes(t)) ||
        (d.notes || '').toLowerCase().includes(t)
      );
    }
    return list;
  }, [drivers, search, deptFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    inactive: drivers.filter(d => d.status !== 'active').length,
    depts: [...new Set(drivers.map(d => d.department).filter(Boolean))].length,
  }), [drivers]);

  // Reset page when filters change (simple — no pagination needed for drivers list)
  useEffect(() => { setExpandedRows(new Set()); }, [search, deptFilter, statusFilter]);

  const toggleRow = (id: number) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openAdd = () => { setEditingDriver(undefined); setModalOpen(true); };
  const openEdit = (d: Driver) => { setEditingDriver(d); setModalOpen(true); };

  const handleSave = async (form: DriverForm) => {
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone_numbers: form.phones.filter(p => p.trim()),
        department: form.department || null,
        license_class: form.license_class || null,
        license_expiry: form.license_expiry || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editingDriver) {
        await apiUpdateDriver(editingDriver.id, payload);
        toast.success('Driver updated');
      } else {
        await apiCreateDriver(payload);
        toast.success('Driver added');
      }
      setModalOpen(false);
      await loadData(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} from the drivers registry? This cannot be undone.`)) return;
    try { await apiDeleteDriver(id); toast.success('Driver removed'); await loadData(true); }
    catch (e: any) { toast.error(e.message); }
  };

  const filterLabel = [
    deptFilter !== 'all' ? deptFilter : null,
    statusFilter !== 'all' ? statusFilter : null,
    search ? `"${search}"` : null,
  ].filter(Boolean).join(', ') || 'All departments';

  const isExpired = (expiry?: string) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };
  const isExpiringSoon = (expiry?: string) => {
    if (!expiry) return false;
    const d = new Date(expiry);
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return d >= new Date() && d <= soon;
  };

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* ─ HERO ─────────────────────────────────────────────────────────── */}
        <div className="oz-glass-dark rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#2A4D69]/50 border border-[#86BBD8]/20 flex-shrink-0">
                <Car className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div className="min-w-0">
                <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                  <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-white/70 font-medium">Drivers</span>
                </nav>
                <h1 className="text-xl font-bold text-white font-heading tracking-tight">Authorised Drivers</h1>
                <p className="text-xs text-white/35 mt-0.5">Licensed personnel approved to operate mine vehicles</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => loadData(true)} disabled={refreshing} title="Refresh"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all disabled:opacity-40">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" title={sections.expanded.stats ? 'Hide stats' : 'Show stats'}
                onClick={() => sections.toggle('stats')}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                {sections.expanded.stats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <MasterCollapseButton collapse={sections} />
            </div>
          </div>

          {sections.expanded.stats && (
            <div className="px-6 pb-4 pt-3 border-t border-white/[0.07] grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Drivers', value: stats.total, color: '#86BBD8', icon: Car },
                { label: 'Active', value: stats.active, color: '#34d399', icon: CheckCircle2 },
                { label: 'Inactive / Suspended', value: stats.inactive, color: '#f59e0b', icon: AlertCircle },
                { label: 'Departments', value: stats.depts, color: '#a78bfa', icon: Building2 },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 border border-white/[0.08] bg-white/[0.05]">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {sections.expanded.records && <>
        {/* ─ CONTROLS ─────────────────────────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 justify-between">
            {/* Search */}
            <div className="relative flex-1 min-w-48 max-w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input type="text" placeholder="Search name, department, phone…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full text-xs rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all" />
            </div>

            {/* Department filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {['all', ...departments].map(d => (
                <button key={d} type="button" onClick={() => setDeptFilter(d)}
                  className={`h-7 px-3 text-[11px] rounded-lg border capitalize transition-all ${deptFilter === d ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]' : 'bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60'}`}>
                  {d === 'all' ? 'All Depts' : d}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1">
              {(['all', 'active', 'inactive', 'suspended'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`h-7 px-2.5 text-[11px] rounded-lg border capitalize transition-all ${statusFilter === s ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]' : 'bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60'}`}>
                  {s === 'all' ? 'All Status' : s}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" title="Export Excel" onClick={() => exportExcel(filtered)}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button type="button" title="Export PDF" onClick={() => exportPDF(filtered, filterLabel)}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all">
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
              <button type="button" onClick={openAdd}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
                <Plus className="h-3.5 w-3.5" /> Add Driver
              </button>
            </div>
          </div>
        </div>

        {/* ─ TABLE ────────────────────────────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-2.5 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-white/35">
              {filtered.length} driver{filtered.length !== 1 ? 's' : ''}{filtered.length !== drivers.length ? ` of ${drivers.length}` : ''}
            </span>
            {(search || deptFilter !== 'all' || statusFilter !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setDeptFilter('all'); setStatusFilter('all'); }}
                className="text-[11px] text-white/35 hover:text-white/60 flex items-center gap-1 transition-colors">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-white/30 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-white/25">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <div className="text-sm font-medium">No drivers found</div>
              <div className="text-xs mt-1 text-white/20">
                {search || deptFilter !== 'all' || statusFilter !== 'all'
                  ? 'No drivers match your filters'
                  : 'Add the first authorised driver using the button above'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Name', 'Phone Number(s)', 'Department', 'Licence', 'Status', ''].map((h, i) => (
                      <th key={i} className={`py-2.5 text-[10px] font-semibold text-white/35 uppercase tracking-wider ${i === 0 ? 'pl-5 pr-3 text-left' : i === 5 ? 'px-3 w-20' : 'px-3 text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(driver => {
                    const expanded = expandedRows.has(driver.id);
                    const expired = isExpired(driver.license_expiry);
                    const expiringSoon = isExpiringSoon(driver.license_expiry);
                    return (
                      <React.Fragment key={driver.id}>
                        <tr
                          className={`border-b border-white/[0.04] cursor-pointer transition-colors ${expanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                          onClick={() => toggleRow(driver.id)}>
                          {/* Name */}
                          <td className="pl-5 pr-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                style={{ background: 'rgba(42,77,105,0.6)', border: '1px solid rgba(134,187,216,0.25)' }}>
                                {driver.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-white leading-none">{driver.full_name}</div>
                                {driver.notes && (
                                  <div className="text-[10px] text-white/30 mt-0.5 truncate max-w-[180px]">{driver.notes}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Phones */}
                          <td className="px-3 py-3">
                            {(driver.phone_numbers || []).length === 0 ? (
                              <span className="text-[10px] text-white/20">—</span>
                            ) : (
                              <div className="space-y-0.5">
                                {(driver.phone_numbers || []).slice(0, 2).map((p, i) => (
                                  <a key={i} href={`tel:${p.replace(/\s/g, '')}`}
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1.5 text-xs text-[#86BBD8] hover:text-white transition-colors group">
                                    <Phone className="h-3 w-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                                    {p}
                                  </a>
                                ))}
                                {(driver.phone_numbers || []).length > 2 && (
                                  <span className="text-[10px] text-white/30">+{driver.phone_numbers.length - 2} more</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Department */}
                          <td className="px-3 py-3">
                            {driver.department
                              ? <span className="text-xs text-white/70 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">{driver.department}</span>
                              : <span className="text-[10px] text-white/20">—</span>}
                          </td>

                          {/* Licence */}
                          <td className="px-3 py-3">
                            <div>
                              {driver.license_class
                                ? <span className="text-xs font-mono text-white/75">{driver.license_class}</span>
                                : <span className="text-[10px] text-white/20">—</span>}
                              {driver.license_expiry && (
                                <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${expired ? 'text-rose-400' : expiringSoon ? 'text-amber-400' : 'text-white/30'}`}>
                                  {expired && <AlertCircle className="h-2.5 w-2.5" />}
                                  {expiringSoon && !expired && <AlertCircle className="h-2.5 w-2.5" />}
                                  Exp: {new Date(driver.license_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                              style={{
                                color: STATUS_COLORS[driver.status] || '#86BBD8',
                                background: `${STATUS_COLORS[driver.status] || '#86BBD8'}18`,
                                border: `1px solid ${STATUS_COLORS[driver.status] || '#86BBD8'}35`,
                              }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[driver.status] }} />
                              {driver.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" title={expanded ? 'Collapse' : 'Expand'}
                                onClick={e => { e.stopPropagation(); toggleRow(driver.id); }}
                                className="h-6 w-6 flex items-center justify-center rounded text-white/25 hover:text-white/70 transition-all">
                                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" title="Edit driver"
                                onClick={e => { e.stopPropagation(); openEdit(driver); }}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#86BBD8]/15 text-white/25 hover:text-[#86BBD8] transition-all">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button type="button" title="Remove driver"
                                onClick={e => { e.stopPropagation(); handleDelete(driver.id, driver.full_name); }}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expanded && (
                          <tr className="border-b border-white/[0.04]">
                            <td colSpan={6} className="pl-16 pr-5 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                {/* All phones */}
                                <div>
                                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">All Phone Numbers</div>
                                  {(driver.phone_numbers || []).length === 0
                                    ? <span className="text-white/25">None recorded</span>
                                    : (driver.phone_numbers || []).map((p, i) => (
                                      <a key={i} href={`tel:${p.replace(/\s/g, '')}`}
                                        className="flex items-center gap-1.5 text-[#86BBD8] hover:text-white transition-colors mb-1">
                                        <Phone className="h-3 w-3 opacity-60" />{p}
                                      </a>
                                    ))}
                                </div>
                                {/* Department */}
                                <div>
                                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Department</div>
                                  <span className="text-white/70">{driver.department || '—'}</span>
                                </div>
                                {/* Licence */}
                                <div>
                                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Licence Details</div>
                                  <div className="text-white/70">{driver.license_class || '—'}</div>
                                  {driver.license_expiry && (
                                    <div className={`text-[10px] mt-0.5 ${isExpired(driver.license_expiry) ? 'text-rose-400 font-semibold' : isExpiringSoon(driver.license_expiry) ? 'text-amber-400' : 'text-white/35'}`}>
                                      {isExpired(driver.license_expiry) ? 'EXPIRED · ' : isExpiringSoon(driver.license_expiry) ? 'Expiring soon · ' : 'Expires '}
                                      {new Date(driver.license_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                                {/* Notes / dates */}
                                <div>
                                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Notes</div>
                                  <div className="text-white/55">{driver.notes || '—'}</div>
                                  {driver.updated_at && (
                                    <div className="text-[10px] text-white/20 mt-1.5">
                                      Updated {new Date(driver.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>}
      </main>

      <DriverModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editingDriver}
        departments={departments}
      />
    </PageShell>
  );
}
