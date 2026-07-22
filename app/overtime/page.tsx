// FILE: app/overtime/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, ElementType } from 'react';
import { api } from '@/lib/apiClient';
import { AppShell } from '@/components/app-shell';
import {
  Clock4, Plus, Search, RefreshCw, CheckCircle2, XCircle,
  FileText, Eye, Trash2, Edit, Download, LayoutGrid, List, AlertCircle,
  Sun, Moon, Briefcase, Calendar, X, User,
} from '@/components/shared/theme';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, FormField, FormActions,
  useCollapseSection, CenterModal, ACCENT_HEX, EmptyState, PrimaryButton, GlowCard, SelectField,
} from '@/components/shared/theme';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const OT_TYPES = ['regular', 'weekend', 'emergency', 'project', 'holiday', 'night'] as const;
type OTType = typeof OT_TYPES[number];
const STATUSES = ['pending', 'approved', 'rejected', 'paid', 'cancelled'] as const;
type OTStatus = typeof STATUSES[number];

const TYPE_LABELS: Record<OTType, string> = { regular: 'Regular', weekend: 'Weekend', emergency: 'Emergency', project: 'Project', holiday: 'Holiday', night: 'Night Shift' };
const TYPE_ICONS: Record<OTType, ElementType> = { regular: Clock4, weekend: Calendar, emergency: AlertCircle, project: Briefcase, holiday: Sun, night: Moon };
const TYPE_HEX: Record<OTType, string> = { regular: ACCENT_HEX.blue, weekend: '#a78bfa', emergency: '#f87171', project: '#34d399', holiday: '#fbbf24', night: '#818cf8' };

const STATUS_HEX: Record<OTStatus, string> = {
  pending: '#fbbf24', approved: '#34d399', rejected: '#f87171', paid: ACCENT_HEX.blue, cancelled: '#94a3b8',
};
const STATUS_COLOR: Record<OTStatus, string> = {
  pending: 'text-amber-400', approved: 'text-emerald-400', rejected: 'text-rose-400', paid: 'text-brand-400', cancelled: 'text-white/40',
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

type EmployeeItem = EmployeeLookup;

interface OTRecord {
  id: number | string;
  employee_name: string;
  employee_id: string;
  position: string;
  department?: string;
  overtime_type: OTType;
  date: string;
  start_time?: string;
  end_time?: string;
  /** Set when entered via the hours-only fast path — no exact times recorded. */
  hours?: number;
  reason?: string;
  status: OTStatus;
  notes?: string;
  contact_number?: string;
  created_at?: string;
}

interface OTForm {
  employee_name: string;
  employee_id: string;
  position: string;
  department: string;
  overtime_type: OTType;
  date: string;
  start_time: string;
  end_time: string;
  /** Entered directly when the fast path is on; empty string means "use start/end". */
  hours: string;
  reason: string;
  contact_number: string;
  notes: string;
}

function nowLocal(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString();
}

const fmtDate = (v?: string): string => (v ? formatDate(v) : '');

function blankForm(): OTForm {
  return {
    employee_name: '', employee_id: '', position: '', department: '',
    overtime_type: 'regular',
    date: nowLocal().slice(0, 10),
    start_time: '17:00', end_time: '20:00', hours: '',
    reason: '', contact_number: '', notes: '',
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchOT(): Promise<OTRecord[]> {
  const data = await api.get<OTRecord[]>('/api/overtime');
  return (Array.isArray(data) ? data : []) as OTRecord[];
}
/** `useHours`: send `hours` and omit start/end (the fast path); otherwise send
 *  start/end and omit hours — never both, matching the backend's either/or validator. */
function buildOvertimePayload(form: OTForm, useHours: boolean) {
  const { start_time, end_time, hours, ...rest } = form;
  return useHours
    ? { ...rest, hours: parseFloat(hours) || undefined }
    : { ...rest, start_time, end_time };
}
async function createOT(body: Record<string, unknown>): Promise<OTRecord> {
  return api.post<OTRecord>('/api/overtime', { ...body, status: 'pending', applied_date: new Date().toISOString() });
}
async function updateOT(id: number | string, body: object): Promise<OTRecord> {
  return api.patch<OTRecord>(`/api/overtime/${id}`, body);
}
async function deleteOT(id: number | string): Promise<void> {
  await api.delete(`/api/overtime/${id}`);
}

// ─── HOURS UTIL ───────────────────────────────────────────────────────────────

function calcHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, diff / 60);
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: OTType }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${TYPE_HEX[type]}22`, color: TYPE_HEX[type] }}>
      <Icon className="h-2.5 w-2.5" />{TYPE_LABELS[type]}
    </span>
  );
}

// Person identity marker — a bare accent person icon (matches the app-wide
// convention; replaced the old initials-in-a-circle avatar). `name` kept in the
// signature only for call-site compatibility.
function Avatar({ size = 'sm' }: { name?: string; size?: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return <User className={`${dims} text-brand-400 shrink-0`} />;
}

// ─── EMPLOYEE AUTOCOMPLETE ────────────────────────────────────────────────────


function EmployeeAutocomplete({ value, onChange, disabled }: { value: string; onChange: (name: string, emp?: EmployeeItem) => void; disabled?: boolean }) {
  const t = useTheme();
  const employees = useEmployees();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0 ? employees.slice(0, 8) : employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <input disabled={disabled} value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="Type to search employees…" className={`w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg} ${disabled ? 'opacity-60' : ''}`} />
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
          <div className="max-h-52 overflow-y-auto">
            {suggestions.map(e => {
              const full = `${e.first_name} ${e.last_name}`;
              return (
                <button key={e.id} type="button" onMouseDown={() => { onChange(full, e); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                  <Avatar name={full} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{full}</div>
                    <div className={`text-[10px] truncate ${t.textFaint}`}>{e.designation}{e.department ? ` · ${e.department}` : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

function OTFormModal({ open, onClose, onSave, editing }: {
  open: boolean; onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: number | string) => Promise<void>;
  editing: OTRecord | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<OTForm>(blankForm());
  const [saving, setSaving] = useState(false);
  // The "pressed for time" fast path: hours entered directly instead of start/end times.
  const [useHours, setUseHours] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        employee_name: editing.employee_name, employee_id: editing.employee_id, position: editing.position,
        department: editing.department || '', overtime_type: editing.overtime_type, date: editing.date,
        start_time: editing.start_time || '17:00', end_time: editing.end_time || '20:00',
        hours: editing.hours != null ? String(editing.hours) : '',
        reason: editing.reason || '', contact_number: editing.contact_number || '', notes: editing.notes || '',
      } : blankForm());
      // An existing record with no recorded start/end but a stored hours value was
      // entered via the fast path — reopen it the same way.
      setUseHours(!!editing && !editing.start_time && editing.hours != null);
    }
  }, [open, editing]);

  const set = (k: keyof OTForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const hours = useHours ? (parseFloat(form.hours) || 0) : calcHours(form.start_time, form.end_time);
  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_name || !form.date) { toast.error('Employee and date are required'); return; }
    if (useHours ? !(parseFloat(form.hours) > 0) : !(form.start_time && form.end_time)) {
      toast.error(useHours ? 'Enter the number of hours' : 'Start and end time are required');
      return;
    }
    setSaving(true);
    try { await onSave(buildOvertimePayload(form, useHours), editing?.id); onClose(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? 'Edit Overtime Request' : 'New Overtime Request'} accent="violet" width="max-w-xl">
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <FormField label="Employee" required>
          <EmployeeAutocomplete
            value={form.employee_name}
            disabled={!!editing}
            onChange={(name, emp) => setForm(f => ({
              ...f, employee_name: name,
              employee_id: emp?.employee_id || f.employee_id,
              position: emp?.designation || f.position,
              department: emp?.department || f.department,
              contact_number: emp?.phone || f.contact_number,
            }))}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employee ID"><input className={inputCls} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="e.g. C1165" /></FormField>
          <FormField label="Position"><input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} placeholder="Job title" /></FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Overtime Type" required>
            <SelectField size="form" value={form.overtime_type} title="Overtime type" onChange={v => set('overtime_type', v as OTType)}
              options={OT_TYPES.map(ty => ({ value: ty, label: TYPE_LABELS[ty] }))} />
          </FormField>
          <FormField label="Date" required><input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} /></FormField>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" title="Skip exact times and just enter the hours worked">
          <input type="checkbox" checked={useHours} onChange={e => setUseHours(e.target.checked)} className="accent-brand-500" />
          <span className={t.textMuted}>Pressed for time — just enter hours</span>
        </label>

        {useHours ? (
          <FormField label="Hours" required>
            <input type="number" min={0.5} max={24} step={0.5} className={inputCls} value={form.hours}
              onChange={e => set('hours', e.target.value)} placeholder="e.g. 3.5" />
          </FormField>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Start Time" required><input type="time" className={inputCls} value={form.start_time} onChange={e => set('start_time', e.target.value)} /></FormField>
            <FormField label="End Time" required><input type="time" className={inputCls} value={form.end_time} onChange={e => set('end_time', e.target.value)} /></FormField>
            <FormField label="Duration"><div className={`${inputCls} flex items-center text-brand-400 font-semibold pointer-events-none`}>{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</div></FormField>
          </div>
        )}

        <FormField label="Reason">
          <textarea rows={3} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Reason for overtime (optional)..."
            className={`text-sm rounded-lg px-3 py-2 w-full outline-none transition-colors resize-none ${t.inputBg}`} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Contact Number"><input className={inputCls} value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="+263 77 ..." /></FormField>
          <FormField label="Notes"><input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." /></FormField>
        </div>

        <FormActions onCancel={onClose} submitting={saving} submitLabel={editing ? 'Update' : 'Submit'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function OTDetailModal({ record, onClose, onEdit, onApprove, onReject }: {
  record: OTRecord; onClose: () => void; onEdit: () => void; onApprove: () => void; onReject: () => void;
}) {
  const t = useTheme();
  const hours = record.hours ?? calcHours(record.start_time, record.end_time);
  const rows = [
    { l: 'Employee', v: record.employee_name },
    { l: 'Employee ID', v: record.employee_id },
    { l: 'Position', v: record.position },
    { l: 'Department', v: record.department },
    { l: 'Date', v: fmtDate(record.date) },
    { l: 'Time', v: record.start_time && record.end_time ? `${record.start_time} – ${record.end_time}` : undefined },
    { l: 'Duration', v: hours > 0 ? `${hours.toFixed(1)} hours` : '—' },
    { l: 'Applied', v: fmtDate(record.created_at) },
    { l: 'Contact', v: record.contact_number },
    { l: 'Notes', v: record.notes },
  ].filter(r => r.v);

  return (
    <CenterModal open onClose={onClose} title="Overtime Request Details" accent="violet" width="max-w-lg">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={record.employee_name} size="lg" />
          <div>
            <p className={`font-semibold ${t.textPrimary}`}>{record.employee_name}</p>
            <p className={`text-xs ${t.textFaint}`}>{record.position} · {record.employee_id}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <StatusBadge color={STATUS_HEX[record.status]} label={record.status} />
            <TypeBadge type={record.overtime_type} />
          </div>
        </div>

        <div className={`${t.chipBg} rounded-xl px-4 py-3`}>
          <p className={`text-xs mb-1 ${t.textFaint}`}>Reason for overtime</p>
          <p className={`text-sm ${t.textMuted}`}>{record.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rows.map(({ l, v }) => (
            <div key={l} className={`${t.chipBg} rounded-lg p-2.5`}>
              <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>{l}</p>
              <p className={`text-xs font-medium ${t.textMuted}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {record.status === 'pending' && (
            <>
              <button type="button" onClick={onReject} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors"><XCircle className="h-3.5 w-3.5" /> Reject</button>
              <button type="button" onClick={onApprove} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
            </>
          )}
          <button type="button" onClick={onEdit} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}><Edit className="h-3.5 w-3.5" /> Edit</button>
          <div className="ml-auto" />
          <button type="button" onClick={onClose} className={`px-3 py-2 rounded-lg text-xs font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}>Close</button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

async function downloadExcel(rows: OTRecord[]) {
  const [ExcelJS, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')]);
  const wb = new ExcelJS.default.Workbook();
  const ws = wb.addWorksheet('Overtime Records');
  const cols = [
    { key: 'employee_name', label: 'Employee' }, { key: 'employee_id', label: 'ID' }, { key: 'position', label: 'Position' },
    { key: 'overtime_type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'start_time', label: 'Start' },
    { key: 'end_time', label: 'End' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' },
  ];
  const headerRow = ws.addRow(cols.map(c => c.label));
  headerRow.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } }; });
  rows.forEach(r => ws.addRow([r.employee_name, r.employee_id, r.position, TYPE_LABELS[r.overtime_type], fmtDate(r.date), r.start_time, r.end_time, r.reason, r.status]));
  ws.columns.forEach(c => { c.width = 20; });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), 'overtime_records.xlsx');
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function OvertimeContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, filters: true });

  const [records, setRecords] = useState<OTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [mainTab, setMainTab] = useState<'records' | 'analytics'>('records');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OTRecord | null>(null);
  const [viewing, setViewing] = useState<OTRecord | null>(null);
  const [delTarget, setDelTarget] = useState<OTRecord | null>(null);
  const [approving, setApproving] = useState<OTRecord | null>(null);
  const [rejecting, setRejecting] = useState<OTRecord | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setRecords(await fetchOT()); }
    catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => records.filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (type !== 'all' && r.overtime_type !== type) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.employee_name.toLowerCase().includes(q) && !r.employee_id.toLowerCase().includes(q) && !(r.reason || '').toLowerCase().includes(q) && !r.position.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [records, status, type, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const pending = records.filter(r => r.status === 'pending').length;
    const approved = records.filter(r => r.status === 'approved').length;
    const totalHrs = records.reduce((s, r) => s + (r.hours ?? calcHours(r.start_time, r.end_time)), 0);
    return { total: records.length, pending, approved, totalHrs: Math.round(totalHrs) };
  }, [records]);

  const byType = useMemo(() => OT_TYPES.map(ty => ({ type: TYPE_LABELS[ty], count: records.filter(r => r.overtime_type === ty).length })).filter(x => x.count > 0), [records]);
  const byStatus = useMemo(() => STATUSES.map(s => ({ status: s.charAt(0).toUpperCase() + s.slice(1), count: records.filter(r => r.status === s).length })).filter(x => x.count > 0), [records]);
  const TYPE_BAR_COLORS = Object.values(TYPE_HEX);
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  const handleSave = async (body: Record<string, unknown>, id?: number | string) => {
    if (id) {
      const updated = await updateOT(id, body);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
      toast.success('Record updated');
    } else {
      const created = await createOT(body);
      setRecords(prev => [created, ...prev]);
      toast.success('Overtime request submitted');
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    await deleteOT(delTarget.id);
    setRecords(prev => prev.filter(r => r.id !== delTarget.id));
    toast.success('Deleted');
    setDelTarget(null);
  };

  const handleApprove = async (sig: SignatureResult) => {
    if (!approving) return;
    const updated = await updateOT(approving.id, { status: 'approved', approved_by: sig.signerName, approved_at: sig.signedAt, approval_signature: sig.dataUrl });
    setRecords(prev => prev.map(r => r.id === approving.id ? updated : r));
    toast.success('Overtime approved');
    setViewing(null);
    setApproving(null);
  };

  const handleReject = async (sig: SignatureResult) => {
    if (!rejecting) return;
    const updated = await updateOT(rejecting.id, { status: 'rejected', rejected_by: sig.signerName, rejected_at: sig.signedAt });
    setRecords(prev => prev.map(r => r.id === rejecting.id ? updated : r));
    toast.success('Overtime rejected');
    setViewing(null);
    setRejecting(null);
  };

  const selCls = `h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;
  const tdCls = `px-3 py-2.5 text-sm ${t.textMuted}`;

  const GridCard = ({ r }: { r: OTRecord }) => {
    const hours = calcHours(r.start_time, r.end_time);
    return (
      <GlowCard onClick={() => setViewing(r)} color={STATUS_HEX[r.status]} surface={`${t.glass} rounded-xl`} className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar name={r.employee_name} />
            <div><p className={`text-xs font-semibold ${t.textPrimary}`}>{r.employee_name}</p><p className={`text-[10px] ${t.textFaint}`}>{r.employee_id}</p></div>
          </div>
          <StatusBadge color={STATUS_HEX[r.status]} label={r.status} />
        </div>
        <TypeBadge type={r.overtime_type} />
        <div className={`mt-2 space-y-0.5 text-[11px] ${t.textFaint}`}>
          <p>{fmtDate(r.date)} · {r.start_time}–{r.end_time} {hours > 0 && <span className="text-brand-400 font-semibold">({hours.toFixed(1)}h)</span>}</p>
          <p className="truncate">{r.reason}</p>
        </div>
        <div className="flex gap-1 mt-3">
          {r.status === 'pending' && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); setApproving(r); }} className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all">Approve</button>
              <button type="button" onClick={e => { e.stopPropagation(); setRejecting(r); }} className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-all">Reject</button>
            </>
          )}
          <button type="button" title="Edit" onClick={e => { e.stopPropagation(); setEditing(r); setFormOpen(true); }} className={`h-6 w-6 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Edit className="h-3 w-3" /></button>
          <button type="button" title="Delete" onClick={e => { e.stopPropagation(); setDelTarget(r); }} className={`h-6 w-6 flex items-center justify-center rounded-lg ${t.chipBg} hover:bg-rose-500/20 ${t.textFaint} hover:text-rose-400 transition-all`}><Trash2 className="h-3 w-3" /></button>
        </div>
      </GlowCard>
    );
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Clock4}
        accent="violet"
        crumbs={['Time & Attendance', 'Overtime']}
        title="Overtime Management"
        description="Submit, track and approve overtime requests"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => load(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => downloadExcel(records)} disabled={records.length === 0} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} disabled:opacity-40`}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <PrimaryButton icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Request</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon={Clock4} color={ACCENT_HEX.blue} label="Total Requests" value={stats.total} />
          <StatTile icon={Clock4} color="#fbbf24" label="Pending" value={stats.pending} onClick={() => setStatus('pending')} />
          <StatTile icon={CheckCircle2} color="#34d399" label="Approved" value={stats.approved} onClick={() => setStatus('approved')} />
          <StatTile icon={Calendar} color={ACCENT_HEX.blue} label="Total Hours" value={`${stats.totalHrs}h`} />
        </div>
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Clock4 className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Total</span></div><div className={`text-xl font-bold ${t.textPrimary}`}>{stats.total}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Clock4 className="h-3.5 w-3.5 text-amber-400" /><span className={`text-xs ${t.textFaint}`}>Pending</span></div><div className="text-xl font-bold text-amber-400">{stats.pending}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className={`text-xs ${t.textFaint}`}>Approved</span></div><div className="text-xl font-bold text-emerald-400">{stats.approved}</div></div>
        <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><Calendar className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>OT Hours</span></div><div className="text-xl font-bold text-brand-400">{stats.totalHrs}h</div></div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Search className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Filters</span>
        </div>
        <div className="px-5 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search employee, reason…" />
            <SelectField size="filter" title="Status" value={status} onChange={setStatus}
              options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
            <SelectField size="filter" title="Type" value={type} onChange={setType}
              options={[{ value: 'all', label: 'All Types' }, ...OT_TYPES.map(ty => ({ value: ty, label: TYPE_LABELS[ty] }))]} />
            {/* Native date inputs have a non-negotiable intrinsic width (segments + picker
                icon) — giving this pair its own 2-column span, plus min-w-0 on each input,
                keeps them from overflowing/overlapping the grid cell at narrower widths. */}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
              <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`flex-1 min-w-0 ${selCls}`} />
              <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`flex-1 min-w-0 ${selCls}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setSearch(''); setStatus('all'); setType('all'); setDateFrom(''); setDateTo(''); }} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}>
              <X className="h-3.5 w-3.5" /> Clear
            </button>
            <div className="ml-auto flex gap-1">
              <button type="button" title="Table view" onClick={() => setView('table')} className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'table' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><List className="h-3.5 w-3.5" /></button>
              <button type="button" title="Grid view" onClick={() => setView('grid')} className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'grid' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
            </div>
            <span className={`text-xs ${t.textFaint}`}>{filtered.length} of {records.length}</span>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit`}>
        {([{ key: 'records', label: 'Records', icon: FileText }, { key: 'analytics', label: 'Analytics', icon: Calendar }] as { key: typeof mainTab; label: string; icon: ElementType }[]).map(tb => (
          <button key={tb.key} type="button" onClick={() => setMainTab(tb.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <tb.icon className="h-4 w-4" />{tb.label}
          </button>
        ))}
      </div>

      {mainTab === 'records' ? (
        loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={Clock4} title="No overtime requests" message="No records match your filters."
              action={{ label: 'New Request', onClick: () => { setEditing(null); setFormOpen(true); } }} />
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => <GridCard key={String(r.id)} r={r} />)}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Employee</th><th className={thCls}>Type</th><th className={thCls}>Date</th><th className={thCls}>Hours</th><th className={thCls}>Reason</th><th className={thCls}>Status</th><th className={thCls}></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const h = calcHours(r.start_time, r.end_time);
                    return (
                      <tr key={r.id} onClick={() => setViewing(r)} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors cursor-pointer`}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.employee_name} />
                            <div><p className={`text-sm font-medium ${t.textPrimary}`}>{r.employee_name}</p><p className={`text-[10px] ${t.textFaint}`}>{r.employee_id} · {r.position}</p></div>
                          </div>
                        </td>
                        <td className={tdCls}><TypeBadge type={r.overtime_type} /></td>
                        <td className={tdCls}><p className="text-xs">{fmtDate(r.date)}</p><p className={`text-[10px] ${t.textFaint}`}>{r.start_time} – {r.end_time}</p></td>
                        <td className={tdCls}><span className="text-xs font-semibold text-brand-400">{h > 0 ? `${h.toFixed(1)}h` : '—'}</span></td>
                        <td className={tdCls}><span className={`text-xs max-w-[200px] truncate block ${t.textFaint}`}>{r.reason}</span></td>
                        <td className={tdCls}><StatusBadge color={STATUS_HEX[r.status]} label={r.status} /></td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button type="button" title="View" onClick={() => setViewing(r)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Eye className="h-3 w-3" /></button>
                            <button type="button" title="Edit" onClick={() => { setEditing(r); setFormOpen(true); }} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><Edit className="h-3 w-3" /></button>
                            {r.status === 'pending' && (
                              <>
                                <button type="button" title="Approve" onClick={() => setApproving(r)} className="h-6 w-6 flex items-center justify-center rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition-all"><CheckCircle2 className="h-3 w-3" /></button>
                                <button type="button" title="Reject" onClick={() => setRejecting(r)} className="h-6 w-6 flex items-center justify-center rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition-all"><XCircle className="h-3 w-3" /></button>
                              </>
                            )}
                            <button type="button" title="Delete" onClick={() => setDelTarget(r)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} hover:bg-rose-500/20 ${t.textFaint} hover:text-rose-400 transition-all`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
              <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Clock4 className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>By Overtime Type</span></div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byType} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="type" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 }} />
                    <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                      {byType.map((_, i) => <Cell key={i} fill={TYPE_BAR_COLORS[i % TYPE_BAR_COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
              <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><CheckCircle2 className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>By Status</span></div>
              <div className="p-4 space-y-3">
                {byStatus.map(({ status: s, count }) => {
                  const pct = records.length > 0 ? (count / records.length) * 100 : 0;
                  const hex = STATUS_HEX[s.toLowerCase() as OTStatus] ?? '#94a3b8';
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1"><StatusBadge color={hex} label={s} /><span className={`font-semibold ${t.textPrimary}`}>{count}</span></div>
                      <ProgressBar value={pct} color={hex} showValue={false} />
                    </div>
                  );
                })}
                {byStatus.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUSES.map(s => (
              <div key={s} className={`${t.glass} rounded-xl p-4`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {s === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : s === 'rejected' ? <XCircle className="h-3.5 w-3.5 text-rose-400" /> : <Clock4 className="h-3.5 w-3.5 text-brand-400" />}
                  <span className={`text-xs ${t.textFaint}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                </div>
                <div className={`text-xl font-bold ${STATUS_COLOR[s]}`}>{records.filter(r => r.status === s).length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OTFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} editing={editing} />

      {viewing && (
        <OTDetailModal
          record={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setFormOpen(true); setViewing(null); }}
          onApprove={() => { setApproving(viewing); setViewing(null); }}
          onReject={() => { setRejecting(viewing); setViewing(null); }}
        />
      )}

      {approving && (
        <ApprovalGate
          title="Approve Overtime Request"
          description={`Approve OT for ${approving.employee_name} on ${fmtDate(approving.date)}`}
          actionLabel="Sign & Approve"
          requiredRole="manager"
          variant="approve"
          onConfirm={handleApprove}
          onCancel={() => setApproving(null)}
        />
      )}

      {rejecting && (
        <ApprovalGate
          title="Reject Overtime Request"
          description={`Reject OT for ${rejecting.employee_name} on ${fmtDate(rejecting.date)}`}
          actionLabel="Sign & Reject"
          requiredRole="manager"
          variant="reject"
          onConfirm={handleReject}
          onCancel={() => setRejecting(null)}
        />
      )}

      <CenterModal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete Overtime Request" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete overtime request for {delTarget?.employee_name}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDelTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all">Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function OvertimePage() {
  return (
    <AppShell>
      <OvertimeContent />
    </AppShell>
  );
}
