// app/drivers/page.tsx — Authorised Drivers Registry
'use client';

import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, FormField, FormActions,
  SearchInput, ViewToggle, CenterModal, PrimaryButton, EmptyState, useCollapseSection, SelectField,
  GroupSection, RecordCard, ACCENT_HEX, staggerContainer, fadeUp, InfoRow, SummaryItem,
} from '@/components/shared/theme';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Car, Plus, Pencil, Trash2, RefreshCw, Phone,
  ChevronDown, ChevronUp, Loader2, X, Building2,
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle, LayoutGrid, List,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';

const DEPARTMENTS = [
  'Mining', 'Engineering', 'Geology', 'Survey', 'Environment',
  'Safety', 'HR', 'Finance', 'IT', 'Logistics', 'Security', 'Administration',
];

const LICENSE_CLASSES = ['Code 08', 'Code 10', 'Code 14', 'EC', 'EC1', 'PrDP', 'Other'];

const STATUS_COLORS: Record<string, string> = { active: '#34d399', inactive: '#f43f5e', suspended: '#f59e0b' };

// Palette for departments — drawn from the shared ACCENT_HEX brand palette (not
// arbitrary hexes), hashed so each distinct department gets a stable color.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function deptColor(department?: string) {
  if (!department) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < department.length; i++) h = (h * 31 + department.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

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
  full_name: string; phones: string[]; department: string; license_class: string;
  license_expiry: string; status: 'active' | 'inactive' | 'suspended'; notes: string;
}

const emptyForm = (): DriverForm => ({ full_name: '', phones: [''], department: '', license_class: '', license_expiry: '', status: 'active', notes: '' });

const isExpired = (expiry?: string) => !!expiry && new Date(expiry) < new Date();
const isExpiringSoon = (expiry?: string) => {
  if (!expiry) return false;
  const d = new Date(expiry); const soon = new Date(); soon.setDate(soon.getDate() + 30);
  return d >= new Date() && d <= soon;
};

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiGetDrivers(): Promise<Driver[]> {
  const r = await fetch(`${API_URL}/api/drivers?limit=2000`);
  if (!r.ok) throw new Error(`Failed to load drivers: ${r.status}`);
  return r.json();
}
async function apiCreateDriver(payload: object): Promise<Driver> {
  const r = await fetch(`${API_URL}/api/drivers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to create'); }
  return r.json();
}
async function apiUpdateDriver(id: number, payload: object): Promise<Driver> {
  const r = await fetch(`${API_URL}/api/drivers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
    'Full Name': d.full_name, 'Phone Number(s)': (d.phone_numbers || []).join(' / '),
    'Department': d.department || '', 'License Class': d.license_class || '',
    'License Expiry': d.license_expiry || '', 'Status': d.status, 'Notes': d.notes || '',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Authorised Drivers');
  XLSX.writeFile(wb, `Authorised_Drivers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast.success('Excel downloaded');
}

function exportPDF(drivers: Driver[], filterLabel: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(42, 77, 105);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Authorised Drivers Registry', 14, 9);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}  ·  ${filterLabel}  ·  ${drivers.length} driver${drivers.length !== 1 ? 's' : ''}`, 14, 16);

  const phonePositions: { x: number; y: number; w: number; h: number; tel: string }[] = [];
  const body = drivers.map(d => [
    d.full_name, (d.phone_numbers || []).join('\n'), d.department || '—', d.license_class || '—',
    d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('en-GB') : '—', d.status.toUpperCase(), d.notes || '',
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['Full Name', 'Phone Number(s)', 'Department', 'Licence Class', 'Expiry', 'Status', 'Notes']],
    body,
    styles: { fontSize: 8.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, textColor: [30, 30, 30], lineColor: [220, 230, 240], lineWidth: 0.25 },
    headStyles: { fillColor: [42, 77, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 249, 253] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44 }, 1: { cellWidth: 46, textColor: [30, 90, 160] }, 2: { cellWidth: 32 }, 3: { cellWidth: 24 }, 4: { cellWidth: 22 }, 5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 6: { cellWidth: 'auto' } },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 1) {
        const driver = drivers[data.row.index];
        if (!driver) return;
        const phones = driver.phone_numbers || [];
        if (phones.length === 0) return;
        const lineH = data.cell.height / Math.max(phones.length, 1);
        phones.forEach((phone, i) => {
          const raw = phone.replace(/\s/g, '');
          if (!raw) return;
          phonePositions.push({ x: data.cell.x, y: data.cell.y + i * lineH, w: data.cell.width, h: lineH, tel: `tel:${raw}` });
        });
      }
    },
    margin: { left: 14, right: 14 },
  });

  phonePositions.forEach(pos => doc.link(pos.x, pos.y, pos.w, pos.h, { url: pos.tel }));

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160, 160, 160);
    doc.text('Ozech MyOffice — Confidential', 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`Authorised_Drivers_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('PDF downloaded — phone numbers are clickable links');
}

// ─── PHONE INPUT ROW ─────────────────────────────────────────────────────────

function PhoneRows({ phones, onChange }: { phones: string[]; onChange: (v: string[]) => void }) {
  const t = useTheme();
  const add = () => { if (phones.length < 4) onChange([...phones, '']); };
  const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => onChange(phones.map((p, idx) => idx === i ? v : p));

  return (
    <div className="space-y-1.5">
      {phones.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Phone className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
            <input type="tel" value={p} onChange={e => update(i, e.target.value)}
              placeholder={i === 0 ? 'Primary number…' : 'Additional number…'}
              className={`w-full pl-7 pr-3 h-9 text-sm rounded-lg outline-none transition-colors ${t.inputBg}`} />
          </div>
          {phones.length > 1 && (
            <button type="button" title="Remove" onClick={() => remove(i)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all flex-shrink-0`}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {phones.length < 4 && (
        <button type="button" onClick={add} className="text-[11px] text-[#86BBD8] hover:opacity-80 transition-colors flex items-center gap-1 mt-0.5">
          <Plus className="h-3 w-3" /> Add number
        </button>
      )}
    </div>
  );
}

// ─── DRIVER FORM MODAL ────────────────────────────────────────────────────────

function DriverModal({ open, onClose, onSave, initial, departments }: {
  open: boolean; onClose: () => void; onSave: (f: DriverForm) => Promise<void>; initial?: Driver; departments: string[];
}) {
  const t = useTheme();
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        full_name: initial.full_name, phones: initial.phone_numbers?.length ? initial.phone_numbers : [''],
        department: initial.department || '', license_class: initial.license_class || '',
        license_expiry: initial.license_expiry?.slice(0, 10) || '', status: initial.status, notes: initial.notes || '',
      } : emptyForm());
    }
  }, [open, initial]);

  const setF = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  if (!open) return null;
  const allDepts = [...new Set([...DEPARTMENTS, ...departments])].sort();

  return (
    <CenterModal open={open} onClose={onClose} title={initial ? 'Edit Driver' : 'Add Driver'} width="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4">
          <FormField label="Full Name" required>
            <input type="text" value={form.full_name} onChange={e => setF('full_name', e.target.value)} placeholder="e.g. John Moyo" className={inputCls} autoFocus />
          </FormField>
          <FormField label="Phone Number(s)">
            <PhoneRows phones={form.phones} onChange={v => setF('phones', v)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department">
              <input list="dept-list" value={form.department} onChange={e => setF('department', e.target.value)} placeholder="Select or type…" className={inputCls} />
              <datalist id="dept-list">{allDepts.map(d => <option key={d} value={d} />)}</datalist>
            </FormField>
            <FormField label="Status">
              <SelectField size="form" value={form.status} title="Status" onChange={v => setF('status', v as DriverForm['status'])}
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }]} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Licence Class">
              <input list="lic-list" value={form.license_class} onChange={e => setF('license_class', e.target.value)} placeholder="e.g. Code 10, PrDP…" className={inputCls} />
              <datalist id="lic-list">{LICENSE_CLASSES.map(l => <option key={l} value={l} />)}</datalist>
            </FormField>
            <FormField label="Licence Expiry">
              <input type="date" value={form.license_expiry} title="Licence expiry" onChange={e => setF('license_expiry', e.target.value)} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Notes">
            <input type="text" value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Any additional info…" className={inputCls} />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={initial ? 'Save Changes' : 'Add Driver'} />
      </form>
    </CenterModal>
  );
}

// ─── SHARED DISPLAY HELPERS ───────────────────────────────────────────────────
// InfoRow/SummaryItem now come from the shared design system (promoted from
// this page's own local versions — see the design-system migration).

function licenceExpiryNote(expiry?: string) {
  if (!expiry) return undefined;
  const label = new Date(expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return isExpired(expiry) ? `EXPIRED · ${label}` : isExpiringSoon(expiry) ? `Expiring soon · ${label}` : `Expires ${label}`;
}

// ─── DriverCard — built on the shared RecordCard so it inherits the exact
// homepage module-card treatment (bare accent icon, Montserrat title, GlowCard
// lift/glow). Key summary always visible; the rest expands in place. ──
function DriverCard({ driver, onEdit, onDelete }: { driver: Driver; onEdit: () => void; onDelete: () => void }) {
  const t = useTheme();
  const dColor = deptColor(driver.department);
  const statusColor = STATUS_COLORS[driver.status] || '#94a3b8';
  const expiryNote = licenceExpiryNote(driver.license_expiry);
  const expiryTone = isExpired(driver.license_expiry) ? 'text-rose-500 font-semibold' : isExpiringSoon(driver.license_expiry) ? 'text-amber-500' : t.textFaint;
  const primaryPhone = driver.phone_numbers?.[0];

  return (
    <RecordCard
      icon={Car}
      accentHex={dColor}
      title={driver.full_name}
      subtitle={driver.department || 'No department'}
      badges={<>
        <StatusBadge color={statusColor} label={driver.status} dot />
        {driver.license_class && <StatusBadge color={dColor} label={driver.license_class} />}
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={Phone} label="Phone" value={primaryPhone} color={dColor} />
          {driver.phone_numbers && driver.phone_numbers.length > 1 && (
            <span className={`text-xs ${t.textFaint}`}>+{driver.phone_numbers.length - 1} more number{driver.phone_numbers.length - 1 === 1 ? '' : 's'}</span>
          )}
        </div>
      }
      actions={<>
        <button onClick={onEdit} type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[12px] font-semibold hover:brightness-110 transition-all">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onDelete} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] font-semibold transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoRow label="Department" value={driver.department} />
        <InfoRow label="Licence Class" value={driver.license_class} />
        <InfoRow label="Licence Expiry" value={expiryNote && <span className={expiryTone}>{expiryNote}</span>} />
        <InfoRow label="Updated" value={driver.updated_at ? new Date(driver.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined} />
      </div>
      {(driver.phone_numbers?.length ?? 0) > 0 && (
        <div>
          <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Phone Numbers</p>
          <div className="flex flex-wrap gap-1.5">
            {driver.phone_numbers!.map((p, i) => (
              <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline">
                <Phone className="h-3 w-3" />{p}
              </a>
            ))}
          </div>
        </div>
      )}
      {driver.notes && <p className={`text-xs ${t.textMuted}`}>{driver.notes}</p>}
    </RecordCard>
  );
}

// ─── DriverRow — compact list-view row, mirroring EmployeeRow's pattern. ──
function DriverRow({ driver, onEdit, onDelete }: { driver: Driver; onEdit: () => void; onDelete: () => void }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const dColor = deptColor(driver.department);
  const statusColor = STATUS_COLORS[driver.status] || '#94a3b8';
  const expiryNote = licenceExpiryNote(driver.license_expiry);
  const expiryTone = isExpired(driver.license_expiry) ? 'text-rose-500' : isExpiringSoon(driver.license_expiry) ? 'text-amber-500' : t.textFaint;

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="shrink-0"><Car className="h-5 w-5" style={{ color: dColor }} /></div>

        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className={`font-semibold text-sm ${t.textPrimary}`}>{driver.full_name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {driver.department && <span className={`text-xs ${t.textFaint}`}>{driver.department}</span>}
            {driver.license_class && <span className={`text-xs font-mono ${t.textFaint}`}>· {driver.license_class}</span>}
            <StatusBadge color={statusColor} label={driver.status} dot />
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {driver.phone_numbers?.[0] && (
            <a href={`tel:${driver.phone_numbers[0].replace(/\s/g, '')}`} onClick={e => e.stopPropagation()}
              className={`hidden sm:flex items-center gap-1 text-[11px] text-blue-400 hover:underline`}>
              <Phone className="h-3 w-3" />{driver.phone_numbers[0]}
            </a>
          )}
          {expiryNote && <span className={`hidden md:block text-[11px] ${expiryTone}`}>{expiryNote}</span>}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" title="Edit driver" onClick={onEdit}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Remove driver" onClick={onDelete}
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
            <InfoRow label="All Phone Numbers" value={(driver.phone_numbers?.length ?? 0) === 0 ? undefined : (
              <div className="space-y-0.5">
                {driver.phone_numbers!.map((p, i) => (
                  <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-blue-400 hover:underline">
                    <Phone className="h-3 w-3" />{p}
                  </a>
                ))}
              </div>
            )} />
            <InfoRow label="Department" value={driver.department} />
            <InfoRow label="Licence" value={expiryNote ? <><span>{driver.license_class}</span><span className={`block ${expiryTone}`}>{expiryNote}</span></> : driver.license_class} />
            <InfoRow label="Notes" value={driver.notes} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function DriversContent() {
  const t = useTheme();
  const sections = useCollapseSection({ records: true });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Records are grouped by department (homepage category-accordion vocabulary); this
  // tracks which department groups the user has collapsed (default: all open).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try { setDrivers(Array.isArray(await apiGetDrivers()) ? await apiGetDrivers() : []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const departments = useMemo(() => [...new Set(drivers.map(d => d.department).filter(Boolean) as string[])].sort(), [drivers]);

  const filtered = useMemo(() => {
    let list = drivers;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (deptFilter !== 'all') list = list.filter(d => d.department === deptFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(d => d.full_name.toLowerCase().includes(s) || (d.department || '').toLowerCase().includes(s) || (d.license_class || '').toLowerCase().includes(s) || (d.phone_numbers || []).some(p => p.includes(s)) || (d.notes || '').toLowerCase().includes(s));
    }
    return list;
  }, [drivers, search, deptFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: drivers.length, active: drivers.filter(d => d.status === 'active').length,
    inactive: drivers.filter(d => d.status !== 'active').length, depts: [...new Set(drivers.map(d => d.department).filter(Boolean))].length,
  }), [drivers]);

  // Group the filtered list by department — alphabetically, "Unassigned" last.
  const grouped = useMemo(() => {
    const map = new Map<string, Driver[]>();
    for (const d of filtered) {
      const key = d.department || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return [...map.keys()]
      .sort((a, b) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)))
      .map(department => ({ department, color: deptColor(department === 'Unassigned' ? undefined : department), drivers: map.get(department)! }));
  }, [filtered]);

  const isGroupOpen = (department: string) => !!search || !collapsedGroups.has(department);
  const toggleGroup = (department: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(department) ? next.delete(department) : next.add(department);
    return next;
  });

  const openAdd = () => { setEditingDriver(undefined); setModalOpen(true); };
  const openEdit = (d: Driver) => { setEditingDriver(d); setModalOpen(true); };

  const handleSave = async (form: DriverForm) => {
    try {
      const payload = {
        full_name: form.full_name.trim(), phone_numbers: form.phones.filter(p => p.trim()),
        department: form.department || null, license_class: form.license_class || null,
        license_expiry: form.license_expiry || null, status: form.status, notes: form.notes || null,
      };
      if (editingDriver) { await apiUpdateDriver(editingDriver.id, payload); toast.success('Driver updated'); }
      else { await apiCreateDriver(payload); toast.success('Driver added'); }
      setModalOpen(false);
      await loadData(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} from the drivers registry? This cannot be undone.`)) return;
    try { await apiDeleteDriver(id); toast.success('Driver removed'); await loadData(true); }
    catch (e: any) { toast.error(e.message); }
  };

  const filterLabel = [deptFilter !== 'all' ? deptFilter : null, statusFilter !== 'all' ? statusFilter : null, search ? `"${search}"` : null].filter(Boolean).join(', ') || 'All departments';

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Car}
        accent="violet"
        crumbs={['Core Management', 'Drivers']}
        title="Authorised Drivers"
        description="Licensed personnel approved to operate mine vehicles"
        statsOpen={sections.expanded.records}
        actions={
          <>
            <button type="button" onClick={() => loadData(true)} disabled={refreshing} title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all disabled:opacity-40`}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <PrimaryButton icon={Plus} accent="violet" onClick={openAdd}>Add Driver</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Car} color="#86BBD8" label="Total Drivers" value={stats.total} />
          <StatTile icon={CheckCircle2} color="#34d399" label="Active" value={stats.active} />
          <StatTile icon={AlertCircle} color="#f59e0b" label="Inactive / Suspended" value={stats.inactive} />
          <StatTile icon={Building2} color="#a78bfa" label="Departments" value={stats.depts} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 justify-between">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, department, phone…" className="flex-1 min-w-48 max-w-72" />
            <div className="flex items-center gap-1 flex-wrap">
              {['all', ...departments].map(d => (
                <button key={d} type="button" onClick={() => setDeptFilter(d)}
                  className={`h-7 px-3 text-[11px] rounded-lg capitalize transition-all ${deptFilter === d ? 'bg-blue-500/15 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                  {d === 'all' ? 'All Depts' : d}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'active', 'inactive', 'suspended'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`h-7 px-2.5 text-[11px] rounded-lg capitalize transition-all ${statusFilter === s ? 'bg-blue-500/15 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                  {s === 'all' ? 'All Status' : s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" title="Export Excel" onClick={() => exportExcel(filtered)}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button type="button" title="Export PDF" onClick={() => exportPDF(filtered, filterLabel)}
                className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all">
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
              <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'list', icon: List, label: 'List view' }]} />
            </div>
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`px-5 py-2.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`text-[11px] ${t.textFaint}`}>{filtered.length} driver{filtered.length !== 1 ? 's' : ''}{filtered.length !== drivers.length ? ` of ${drivers.length}` : ''}</span>
            {(search || deptFilter !== 'all' || statusFilter !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setDeptFilter('all'); setStatusFilter('all'); }}
                className={`text-[11px] ${t.textFaint} ${t.hoverText} flex items-center gap-1 transition-colors`}>
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className={`flex items-center justify-center py-24 ${t.textFaint} gap-2`}><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Car} title="No drivers found"
              message={search || deptFilter !== 'all' || statusFilter !== 'all' ? 'No drivers match your filters' : 'Add the first authorised driver using the button above'} />
          ) : (
            <div className="p-4">
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                {grouped.map(g => (
                  <GroupSection
                    key={g.department}
                    icon={Building2}
                    accentHex={g.color}
                    title={g.department}
                    count={g.drivers.length}
                    countLabel={g.drivers.length === 1 ? 'driver' : 'drivers'}
                    open={isGroupOpen(g.department)}
                    onToggle={() => toggleGroup(g.department)}
                    gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4'}
                  >
                    {g.drivers.map(driver => (
                      <motion.div key={driver.id} variants={fadeUp}>
                        {viewMode === 'grid'
                          ? <DriverCard driver={driver} onEdit={() => openEdit(driver)} onDelete={() => handleDelete(driver.id, driver.full_name)} />
                          : <DriverRow driver={driver} onEdit={() => openEdit(driver)} onDelete={() => handleDelete(driver.id, driver.full_name)} />}
                      </motion.div>
                    ))}
                  </GroupSection>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </>}

      <DriverModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={editingDriver} departments={departments} />
    </main>
  );
}

export default function DriversPage() {
  return <AppShell><DriversContent /></AppShell>;
}
