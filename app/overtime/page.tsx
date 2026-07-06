// FILE: app/overtime/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import {
  Clock4, Plus, Search, RefreshCw, CheckCircle2, XCircle,
  User, FileText, Eye, Trash2, Edit, ChevronDown, ChevronUp,
  X, Download, LayoutGrid, List, AlertCircle,
  Sun, Moon, Briefcase, Calendar, DollarSign,
} from 'lucide-react';
import {
  HeroPanel, GlassPanel, GlassButton, GlassInput, GlassSelect,
  GlassModal, GlassBadge, GlassTable, GlassTabs, GlassStatCard,
  GlassProgress, DeleteDialog, EmptyState, LoadingPane,
  MasterCollapseButton, DownloadButton, AvatarInitials,
  EmployeeNameInput, usePageCollapse,
  fmtDate, fmtDateTime, initials, formatCurrency, nowLocal,
  type StatItem, type GlassColumn, type GlassTab, type DLColumn,
} from '@/components/shared';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const OT_API = `${API}/api/overtime`;
const TOOLTIP_STYLE = { backgroundColor: '#0f1e2e', border: '1px solid rgba(134,187,216,0.2)', borderRadius: 12, color: '#fff', fontSize: 12 };

const OT_TYPES = ['regular', 'weekend', 'emergency', 'project', 'holiday', 'night'] as const;
type OTType   = typeof OT_TYPES[number];
const STATUSES = ['pending', 'approved', 'rejected', 'paid', 'cancelled'] as const;
type OTStatus = typeof STATUSES[number];

const TYPE_LABELS: Record<OTType, string>   = { regular: 'Regular', weekend: 'Weekend', emergency: 'Emergency', project: 'Project', holiday: 'Holiday', night: 'Night Shift' };
const TYPE_ICONS:  Record<OTType, React.ElementType> = { regular: Clock4, weekend: Calendar, emergency: AlertCircle, project: Briefcase, holiday: Sun, night: Moon };

const TYPE_CLASS: Record<OTType, string> = {
  regular:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  weekend:   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  emergency: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  project:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  holiday:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  night:     'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const STATUS_VARIANT: Record<OTStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  pending: 'warning', approved: 'success', rejected: 'danger', paid: 'info', cancelled: 'neutral',
};
const STATUS_COLOR: Record<OTStatus, string> = {
  pending: 'text-amber-400', approved: 'text-emerald-400', rejected: 'text-rose-400', paid: 'text-[#86BBD8]', cancelled: 'text-white/40',
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface OTRecord {
  id: number | string;
  employee_name: string;
  employee_id:   string;
  position:      string;
  department?:   string;
  overtime_type: OTType;
  date:          string;
  start_time:    string;
  end_time:      string;
  reason:        string;
  status:        OTStatus;
  notes?:        string;
  contact_number?: string;
  created_at?:   string;
}

interface OTForm {
  employee_name: string;
  employee_id:   string;
  position:      string;
  department:    string;
  overtime_type: OTType;
  date:          string;
  start_time:    string;
  end_time:      string;
  reason:        string;
  contact_number: string;
  notes:         string;
}

function blankForm(): OTForm {
  return {
    employee_name: '', employee_id: '', position: '', department: '',
    overtime_type: 'regular',
    date: nowLocal().slice(0, 10),
    start_time: '17:00', end_time: '20:00',
    reason: '', contact_number: '', notes: '',
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchOT(filters: Record<string, string | null> = {}): Promise<OTRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params.append(k, v); });
  const r = await fetch(`${OT_API}${params.toString() ? '?' + params : ''}`);
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return (Array.isArray(data) ? data : []) as OTRecord[];
}

async function createOT(body: Partial<OTForm>): Promise<OTRecord> {
  const r = await fetch(OT_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, status: 'pending', applied_date: new Date().toISOString() }) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function updateOT(id: number | string, body: object): Promise<OTRecord> {
  const r = await fetch(`${OT_API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deleteOT(id: number | string): Promise<void> {
  const r = await fetch(`${OT_API}/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
}

// ─── HOURS UTIL ───────────────────────────────────────────────────────────────

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, diff / 60);
}

// ─── TYPE BADGE ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: OTType }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_CLASS[type]}`}>
      <Icon className="h-2.5 w-2.5" />{TYPE_LABELS[type]}
    </span>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

const GIN = 'bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 h-9 text-sm rounded-lg px-3 w-full focus:outline-none transition-all [color-scheme:dark]';
const LBL = 'text-white/55 text-xs font-medium block mb-1';

function OTFormModal({ open, onClose, onSave, editing }: {
  open: boolean; onClose: () => void;
  onSave: (data: OTForm, id?: number | string) => Promise<void>;
  editing: OTRecord | null;
}) {
  const [form, setForm] = useState<OTForm>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        employee_name: editing.employee_name,
        employee_id:   editing.employee_id,
        position:      editing.position,
        department:    editing.department || '',
        overtime_type: editing.overtime_type,
        date:          editing.date,
        start_time:    editing.start_time,
        end_time:      editing.end_time,
        reason:        editing.reason,
        contact_number: editing.contact_number || '',
        notes:         editing.notes || '',
      } : blankForm());
    }
  }, [open, editing]);

  const set = (k: keyof OTForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const hours = calcHours(form.start_time, form.end_time);

  const handleSave = async () => {
    if (!form.employee_name || !form.date || !form.reason) {
      toast.error('Employee, date and reason are required'); return;
    }
    setSaving(true);
    try { await onSave(form, editing?.id); onClose(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <GlassModal
      isOpen={open} onClose={onClose}
      title={editing ? 'Edit Overtime Request' : 'New Overtime Request'}
      icon={Clock4} size="lg"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <GlassButton variant="secondary" onClick={onClose}>Cancel</GlassButton>
          <GlassButton variant="primary" onClick={handleSave} loading={saving}>
            {editing ? 'Update' : 'Submit'}
          </GlassButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Employee */}
        <div>
          <label className={LBL}>Employee *</label>
          <EmployeeNameInput
            value={form.employee_name}
            onChange={(name, emp) => {
              setForm(f => ({
                ...f,
                employee_name: name,
                employee_id:   emp?.employee_id || f.employee_id,
                position:      emp?.designation || f.position,
                department:    emp?.department  || f.department,
                contact_number: emp?.phone     || f.contact_number,
              }));
            }}
            disabled={!!editing}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Employee ID</label>
            <input className={GIN} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="e.g. C1165" />
          </div>
          <div>
            <label className={LBL}>Position</label>
            <input className={GIN} value={form.position} onChange={e => set('position', e.target.value)} placeholder="Job title" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Overtime Type *</label>
            <select className={GIN} value={form.overtime_type} onChange={e => set('overtime_type', e.target.value as OTType)}>
              {OT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Date *</label>
            <input type="date" className={GIN} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LBL}>Start Time</label>
            <input type="time" className={GIN} value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          </div>
          <div>
            <label className={LBL}>End Time</label>
            <input type="time" className={GIN} value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
          <div>
            <label className={LBL}>Duration</label>
            <div className={`${GIN} flex items-center text-[#86BBD8] font-semibold pointer-events-none`}>
              {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
            </div>
          </div>
        </div>

        <div>
          <label className={LBL}>Reason *</label>
          <textarea
            rows={3} value={form.reason}
            onChange={e => set('reason', e.target.value)}
            placeholder="Reason for overtime..."
            className="bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 text-sm rounded-lg px-3 py-2 w-full focus:outline-none transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Contact Number</label>
            <input className={GIN} value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="+263 77 ..." />
          </div>
          <div>
            <label className={LBL}>Notes</label>
            <input className={GIN} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>
      </div>
    </GlassModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function OTDetailModal({ record, onClose, onEdit, onApprove, onReject }: {
  record: OTRecord; onClose: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const hours = calcHours(record.start_time, record.end_time);
  const rows = [
    { l: 'Employee',     v: record.employee_name },
    { l: 'Employee ID',  v: record.employee_id },
    { l: 'Position',     v: record.position },
    { l: 'Department',   v: record.department },
    { l: 'Date',         v: fmtDate(record.date) },
    { l: 'Time',         v: `${record.start_time} – ${record.end_time}` },
    { l: 'Duration',     v: hours > 0 ? `${hours.toFixed(1)} hours` : '—' },
    { l: 'Applied',      v: fmtDate(record.created_at) },
    { l: 'Contact',      v: record.contact_number },
    { l: 'Notes',        v: record.notes },
  ].filter(r => r.v);

  return (
    <GlassModal isOpen onClose={onClose} title="Overtime Request Details" icon={Clock4} size="md"
      footer={
        <div className="flex gap-2 w-full">
          {record.status === 'pending' && (
            <>
              <GlassButton variant="danger" icon={XCircle} onClick={onReject} size="sm">Reject</GlassButton>
              <GlassButton variant="primary" icon={CheckCircle2} onClick={onApprove} size="sm">Approve</GlassButton>
            </>
          )}
          <GlassButton variant="ghost" icon={Edit} onClick={onEdit} size="sm">Edit</GlassButton>
          <div className="ml-auto" />
          <GlassButton variant="secondary" onClick={onClose} size="sm">Close</GlassButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <AvatarInitials name={record.employee_name} size="lg" />
          <div>
            <p className="font-semibold text-white">{record.employee_name}</p>
            <p className="text-xs text-white/50">{record.position} · {record.employee_id}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <GlassBadge variant={STATUS_VARIANT[record.status]}>{record.status}</GlassBadge>
            <TypeBadge type={record.overtime_type} />
          </div>
        </div>

        <div className="bg-[#86BBD8]/08 rounded-xl px-4 py-3 border border-[#86BBD8]/15">
          <p className="text-xs text-white/50 mb-1">Reason for overtime</p>
          <p className="text-sm text-white/90">{record.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rows.map(({ l, v }) => (
            <div key={l} className="bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.07]">
              <p className="text-[10px] text-white/40 mb-0.5">{l}</p>
              <p className="text-xs text-white/80 font-medium">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassModal>
  );
}

// ─── DOWNLOAD COLUMNS ─────────────────────────────────────────────────────────

const DL_COLS: DLColumn[] = [
  { key: 'employee_name', label: 'Employee' },
  { key: 'employee_id',   label: 'ID' },
  { key: 'position',      label: 'Position' },
  { key: 'overtime_type', label: 'Type', format: v => TYPE_LABELS[v as OTType] || String(v) },
  { key: 'date',          label: 'Date',   format: v => fmtDate(String(v)) },
  { key: 'start_time',    label: 'Start' },
  { key: 'end_time',      label: 'End' },
  { key: 'reason',        label: 'Reason' },
  { key: 'status',        label: 'Status' },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OvertimePage() {
  const sections = usePageCollapse({ hero: false, filters: false });

  const [records,    setRecords]    = useState<OTRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters (client-side)
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('all');
  const [type,      setType]      = useState('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  // View
  const [view, setView] = useState<'table' | 'grid'>('table');

  // Modals
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState<OTRecord | null>(null);
  const [viewing,    setViewing]    = useState<OTRecord | null>(null);
  const [delTarget,  setDelTarget]  = useState<OTRecord | null>(null);

  // Approval gate
  const [approving,  setApproving]  = useState<OTRecord | null>(null);
  const [rejecting,  setRejecting]  = useState<OTRecord | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const data = await fetchOT();
      setRecords(data);
    } catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => records.filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (type   !== 'all' && r.overtime_type !== type) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.employee_name.toLowerCase().includes(q) &&
          !r.employee_id.toLowerCase().includes(q) &&
          !r.reason.toLowerCase().includes(q) &&
          !r.position.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [records, status, type, dateFrom, dateTo, search]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending  = records.filter(r => r.status === 'pending').length;
    const approved = records.filter(r => r.status === 'approved').length;
    const totalHrs = records.reduce((s, r) => s + calcHours(r.start_time, r.end_time), 0);
    return { total: records.length, pending, approved, totalHrs: Math.round(totalHrs) };
  }, [records]);

  const heroStats: StatItem[] = [
    { label: 'Total Requests', value: stats.total },
    { label: 'Pending',        value: stats.pending,  textClass: 'text-amber-400',   onClick: () => setStatus('pending') },
    { label: 'Approved',       value: stats.approved, textClass: 'text-emerald-400', onClick: () => setStatus('approved') },
    { label: 'Total Hours',    value: `${stats.totalHrs}h`, textClass: 'text-[#86BBD8]' },
  ];

  // ── Analytics ────────────────────────────────────────────────────────────

  const byType = useMemo(() => OT_TYPES.map(t => ({
    type: TYPE_LABELS[t],
    count: records.filter(r => r.overtime_type === t).length,
  })).filter(t => t.count > 0), [records]);

  const byStatus = useMemo(() => STATUSES.map(s => ({
    status: s.charAt(0).toUpperCase() + s.slice(1),
    count: records.filter(r => r.status === s).length,
  })).filter(s => s.count > 0), [records]);

  const TYPE_BAR_COLORS = ['#86BBD8','#a78bfa','#f87171','#34d399','#fbbf24','#818cf8'];

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (form: OTForm, id?: number | string) => {
    const body = {
      employee_name: form.employee_name,
      employee_id:   form.employee_id,
      position:      form.position,
      department:    form.department,
      overtime_type: form.overtime_type,
      date:          form.date,
      start_time:    form.start_time,
      end_time:      form.end_time,
      reason:        form.reason,
      contact_number: form.contact_number,
      notes:         form.notes,
    };
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
  };

  const handleApprove = async (sig: SignatureResult) => {
    if (!approving) return;
    const updated = await updateOT(approving.id, {
      status: 'approved',
      approved_by: sig.signerName,
      approved_at: sig.signedAt,
      approval_signature: sig.dataUrl,
    });
    setRecords(prev => prev.map(r => r.id === approving.id ? updated : r));
    toast.success('Overtime approved');
    setViewing(null);
  };

  const handleReject = async (sig: SignatureResult) => {
    if (!rejecting) return;
    const updated = await updateOT(rejecting.id, {
      status: 'rejected',
      rejected_by: sig.signerName,
      rejected_at: sig.signedAt,
    });
    setRecords(prev => prev.map(r => r.id === rejecting.id ? updated : r));
    toast.success('Overtime rejected');
    setViewing(null);
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const cols: GlassColumn<OTRecord>[] = [
    {
      key: 'employee_name', header: 'Employee',
      render: r => (
        <div className="flex items-center gap-2.5">
          <AvatarInitials name={r.employee_name} size="sm" />
          <div>
            <p className="text-sm font-medium text-white">{r.employee_name}</p>
            <p className="text-[10px] text-white/40">{r.employee_id} · {r.position}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'overtime_type', header: 'Type',
      render: r => <TypeBadge type={r.overtime_type} />,
    },
    {
      key: 'date', header: 'Date',
      render: r => (
        <div>
          <p className="text-xs text-white/80">{fmtDate(r.date)}</p>
          <p className="text-[10px] text-white/40">{r.start_time} – {r.end_time}</p>
        </div>
      ),
    },
    {
      key: 'end_time', header: 'Hours',
      render: r => {
        const h = calcHours(r.start_time, r.end_time);
        return <span className="text-xs font-semibold text-[#86BBD8]">{h > 0 ? `${h.toFixed(1)}h` : '—'}</span>;
      },
    },
    {
      key: 'reason', header: 'Reason',
      render: r => <span className="text-xs text-white/60 max-w-[200px] truncate block">{r.reason}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: r => <GlassBadge variant={STATUS_VARIANT[r.status]} size="sm">{r.status}</GlassBadge>,
    },
    {
      key: 'id', header: '',
      render: r => (
        <div className="flex items-center gap-1">
          <button type="button" title="View"
            onClick={e => { e.stopPropagation(); setViewing(r); }}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.06] hover:bg-white/[0.15] text-white/50 transition-all">
            <Eye className="h-3 w-3" />
          </button>
          <button type="button" title="Edit"
            onClick={e => { e.stopPropagation(); setEditing(r); setFormOpen(true); }}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.06] hover:bg-white/[0.15] text-white/50 transition-all">
            <Edit className="h-3 w-3" />
          </button>
          {r.status === 'pending' && (
            <>
              <button type="button" title="Approve"
                onClick={e => { e.stopPropagation(); setApproving(r); }}
                className="h-6 w-6 flex items-center justify-center rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition-all">
                <CheckCircle2 className="h-3 w-3" />
              </button>
              <button type="button" title="Reject"
                onClick={e => { e.stopPropagation(); setRejecting(r); }}
                className="h-6 w-6 flex items-center justify-center rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition-all">
                <XCircle className="h-3 w-3" />
              </button>
            </>
          )}
          <button type="button" title="Delete"
            onClick={e => { e.stopPropagation(); setDelTarget(r); }}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.06] hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ),
    },
  ];

  // ── Grid card ────────────────────────────────────────────────────────────

  const GridCard = ({ r }: { r: OTRecord }) => {
    const hours = calcHours(r.start_time, r.end_time);
    return (
      <div
        className="oz-glass-panel rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition-all"
        onClick={() => setViewing(r)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <AvatarInitials name={r.employee_name} size="sm" />
            <div>
              <p className="text-xs font-semibold text-white">{r.employee_name}</p>
              <p className="text-[10px] text-white/40">{r.employee_id}</p>
            </div>
          </div>
          <GlassBadge variant={STATUS_VARIANT[r.status]} size="sm">{r.status}</GlassBadge>
        </div>
        <TypeBadge type={r.overtime_type} />
        <div className="mt-2 space-y-0.5 text-[11px] text-white/50">
          <p>{fmtDate(r.date)} · {r.start_time}–{r.end_time} {hours > 0 && <span className="text-[#86BBD8] font-semibold">({hours.toFixed(1)}h)</span>}</p>
          <p className="truncate">{r.reason}</p>
        </div>
        <div className="flex gap-1 mt-3">
          {r.status === 'pending' && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); setApproving(r); }}
                className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                Approve
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); setRejecting(r); }}
                className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500/25 transition-all">
                Reject
              </button>
            </>
          )}
          <button type="button" title="Edit" onClick={e => { e.stopPropagation(); setEditing(r); setFormOpen(true); }}
            className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/40 transition-all">
            <Edit className="h-3 w-3" />
          </button>
          <button type="button" title="Delete" onClick={e => { e.stopPropagation(); setDelTarget(r); }}
            className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: GlassTab[] = [
    {
      key: 'records', label: 'Records',
      content: loading
        ? <LoadingPane message="Loading overtime records…" />
        : filtered.length === 0
        ? <EmptyState icon={Clock4} title="No overtime requests" message="No records match your filters." action={{ label: 'New Request', onClick: () => { setEditing(null); setFormOpen(true); } }} />
        : view === 'table'
        ? <GlassTable<OTRecord> columns={cols} data={filtered} onRowClick={r => setViewing(r)} keyField={'id' satisfies keyof OTRecord} />
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {filtered.map(r => <GridCard key={String(r.id)} r={r} />)}
          </div>,
    },
    {
      key: 'analytics', label: 'Analytics',
      content: (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Type */}
            <GlassPanel title="By Overtime Type" icon={Clock4} variant="dark">
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byType} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Requests" radius={[6,6,0,0]}>
                      {byType.map((_, i) => <Cell key={i} fill={TYPE_BAR_COLORS[i % TYPE_BAR_COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            {/* By Status */}
            <GlassPanel title="By Status" icon={CheckCircle2} variant="dark">
              <div className="p-4 space-y-3">
                {byStatus.map(({ status: s, count }) => {
                  const pct = records.length > 0 ? (count / records.length) * 100 : 0;
                  const v = STATUS_VARIANT[s.toLowerCase() as OTStatus] ?? 'neutral';
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1">
                        <GlassBadge variant={v} size="sm">{s}</GlassBadge>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                      <GlassProgress value={pct} />
                    </div>
                  );
                })}
                {byStatus.length === 0 && <p className="text-white/30 text-sm text-center py-6">No data</p>}
              </div>
            </GlassPanel>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUSES.map(s => (
              <GlassStatCard key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                value={records.filter(r => r.status === s).length}
                icon={s === 'approved' ? CheckCircle2 : s === 'rejected' ? XCircle : Clock4}
                valueClass={STATUS_COLOR[s]}
              />
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={Clock4}
          title="Overtime Management"
          subtitle="Submit, track and approve overtime requests"
          stats={heroStats}
          onRefresh={() => load(true)}
          loading={refreshing}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <DownloadButton data={records as unknown as Record<string, unknown>[]} columns={DL_COLS} filename="overtime_records" />
              <GlassButton variant="primary" icon={Plus} size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                New Request
              </GlassButton>
            </>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStatCard label="Total"    value={stats.total}             icon={Clock4} />
          <GlassStatCard label="Pending"  value={stats.pending}           icon={Clock4}       valueClass="text-amber-400" />
          <GlassStatCard label="Approved" value={stats.approved}          icon={CheckCircle2} valueClass="text-emerald-400" />
          <GlassStatCard label="OT Hours" value={`${stats.totalHrs}h`}   icon={Calendar}     valueClass="text-[#86BBD8]" />
        </div>

        {/* Filters */}
        <GlassPanel icon={Search} title="Filters" variant="panel" {...sections.panel('filters')}>
          <div className="px-5 pb-4 pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <GlassInput icon={Search} placeholder="Search employee, reason…" value={search} onChange={e => setSearch(e.target.value)} />
              <GlassSelect value={status} onChange={e => setStatus(e.target.value)}
                options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
              <GlassSelect value={type} onChange={e => setType(e.target.value)}
                options={[{ value: 'all', label: 'All Types' }, ...OT_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))]} />
              <div className="flex gap-2">
                <GlassInput type="date" label="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <GlassInput type="date" label="To"   value={dateTo}   onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setStatus('all'); setType('all'); setDateFrom(''); setDateTo(''); }}>
                Clear
              </GlassButton>
              <div className="ml-auto flex gap-1">
                <button type="button" title="Table view" onClick={() => setView('table')}
                  className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'table' ? 'bg-[#86BBD8]/20 text-[#86BBD8]' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'}`}>
                  <List className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Grid view" onClick={() => setView('grid')}
                  className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${view === 'grid' ? 'bg-[#86BBD8]/20 text-[#86BBD8]' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'}`}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs text-white/35">{filtered.length} of {records.length}</span>
            </div>
          </div>
        </GlassPanel>

        <GlassTabs tabs={tabs} defaultTab="records" />

      </main>

      {/* Form */}
      <OTFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} editing={editing} />

      {/* Detail */}
      {viewing && (
        <OTDetailModal
          record={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setFormOpen(true); setViewing(null); }}
          onApprove={() => { setApproving(viewing); setViewing(null); }}
          onReject={() => { setRejecting(viewing); setViewing(null); }}
        />
      )}

      {/* Approve gate */}
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

      {/* Reject gate */}
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

      {/* Delete */}
      <DeleteDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onDelete={handleDelete}
        title="Delete Overtime Request"
        description={`Delete overtime request for ${delTarget?.employee_name}? This cannot be undone.`}
      />
    </PageShell>
  );
}
