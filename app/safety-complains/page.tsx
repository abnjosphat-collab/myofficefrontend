// app/safety-complaints/page.tsx
'use client';

import React, { useState, useMemo, useEffect, Fragment } from "react";
import {
  AlertTriangle, Plus, Search, RefreshCw, Calendar,
  Filter, ChevronDown, ChevronUp, ChevronRight,
  CheckCircle2, User, FileText, Eye, Loader2, Clock,
  AlertCircle, Trash2, Edit, X, FilterX,
  Table as TableIcon, Grid, MessageSquare, Check,
  Settings, Sun, HelpCircle, Info, Download, Zap, MapPin,
} from "lucide-react";
import { PageShell } from '@/components/PageShell';
import {
  fmtDate as formatDate,
  initials as getInitials,
  GlassBadge,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  GlassModal,
  GlassStatCard,
  AvatarInitials,
  usePageCollapse,
  MasterCollapseButton,
} from '@/components/shared';
import { toast } from "sonner";

// =============== TYPES ===============
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface Complaint {
  id: string;
  title: string;
  complaint_type: string;
  severity: string;
  description: string;
  location: string;
  reported_by_name: string;
  reported_by_id: string;
  reported_by_position?: string;
  reported_by_department?: string;
  reported_date: string;
  assigned_to?: string;
  action_taken?: string;
  resolution_date?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface ComplaintFormData {
  title: string;
  complaint_type: string;
  severity: string;
  description: string;
  location: string;
  reported_by_name: string;
  reported_by_id: string;
  reported_by_position?: string;
  reported_by_department?: string;
  assigned_to?: string;
  action_taken?: string;
  status: string;
  reported_date: string;
}

// =============== CONSTANTS ===============
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const COMPLAINTS_API = `${API_BASE}/api/safety-complaints`;

const COMPLAINT_TYPES: Record<string, { name: string; icon: React.ElementType; badge: BadgeVariant; description: string }> = {
  hazard:      { name: 'Hazard',           icon: AlertTriangle, badge: 'warning',  description: 'Unsafe condition or potential hazard' },
  unsafe_act:  { name: 'Unsafe Act',       icon: AlertCircle,   badge: 'danger',   description: 'Unsafe behavior or action' },
  near_miss:   { name: 'Near Miss',        icon: Zap,           badge: 'warning',  description: 'Incident that could have caused harm' },
  equipment:   { name: 'Equipment Issue',  icon: Settings,      badge: 'info',     description: 'Faulty or unsafe equipment' },
  environmental:{ name: 'Environmental',   icon: Sun,           badge: 'success',  description: 'Environmental safety concern' },
  other:       { name: 'Other',            icon: HelpCircle,    badge: 'neutral',  description: 'Other safety concerns' },
};

const SEVERITY_LEVELS: Record<string, { name: string; badge: BadgeVariant }> = {
  low:      { name: 'Low',      badge: 'info'    },
  medium:   { name: 'Medium',   badge: 'warning' },
  high:     { name: 'High',     badge: 'warning' },
  critical: { name: 'Critical', badge: 'danger'  },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; badge: BadgeVariant }> = {
  pending:      { label: 'Pending',      icon: Clock,        badge: 'warning' },
  investigating:{ label: 'Investigating',icon: Search,       badge: 'info'    },
  resolved:     { label: 'Resolved',     icon: CheckCircle2, badge: 'success' },
  closed:       { label: 'Closed',       icon: Check,        badge: 'neutral' },
};

const COMPLAINT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(COMPLAINT_TYPES).map(([k, v]) => ({ value: k, label: v.name })),
];
const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severity' },
  ...Object.entries(SEVERITY_LEVELS).map(([k, v]) => ({ value: k, label: v.name })),
];
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];
const SORT_OPTIONS = [
  { value: 'date-desc',     label: 'Date (Newest first)' },
  { value: 'date-asc',      label: 'Date (Oldest first)' },
  { value: 'title-asc',     label: 'Title (A-Z)' },
  { value: 'severity-desc', label: 'Severity (High to low)' },
  { value: 'status-asc',    label: 'Status (A-Z)' },
];

// =============== API FUNCTIONS ===============
const fetchComplaints = async (filters: Record<string, string> = {}): Promise<Complaint[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params.append(k, v); });
  const url = params.toString() ? `${COMPLAINTS_API}?${params.toString()}` : COMPLAINTS_API;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
};

const createComplaint = async (data: ComplaintFormData): Promise<Complaint> => {
  const res = await fetch(COMPLAINTS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
  return res.json();
};

const updateComplaint = async (id: string, data: Partial<ComplaintFormData>): Promise<Complaint> => {
  const res = await fetch(`${COMPLAINTS_API}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
  return res.json();
};

const deleteComplaint = async (id: string): Promise<void> => {
  const res = await fetch(`${COMPLAINTS_API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete complaint');
};

const exportToCSV = (data: Complaint[]) => {
  if (!data.length) { toast.warning('No data to export'); return; }
  const headers = ['ID', 'Type', 'Severity', 'Title', 'Description', 'Location', 'Reported By', 'Date', 'Status', 'Action Taken'];
  const rows = data.map(c => [
    c.id, COMPLAINT_TYPES[c.complaint_type]?.name || c.complaint_type,
    SEVERITY_LEVELS[c.severity]?.name || c.severity, c.title, c.description,
    c.location, c.reported_by_name, formatDate(c.reported_date),
    STATUS_CONFIG[c.status]?.label || c.status, c.action_taken || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(cell => {
    const s = String(cell ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `safety-complaints-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${data.length} records`);
};

// =============== GLASS BADGE HELPERS ===============
const TypeBadge = ({ type }: { type: string }) => {
  const cfg = COMPLAINT_TYPES[type] || COMPLAINT_TYPES.other;
  const Icon = cfg.icon;
  return <GlassBadge variant={cfg.badge}><Icon className="h-3 w-3 mr-1 inline" />{cfg.name}</GlassBadge>;
};
const SeverityBadge = ({ severity }: { severity: string }) => {
  const cfg = SEVERITY_LEVELS[severity] || SEVERITY_LEVELS.low;
  return <GlassBadge variant={cfg.badge}>{cfg.name}</GlassBadge>;
};
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return <GlassBadge variant={cfg.badge}><Icon className="h-3 w-3 mr-1 inline" />{cfg.label}</GlassBadge>;
};

// =============== COMPLAINT CARD (GRID) ===============
interface CardProps {
  complaint: Complaint;
  onView: (c: Complaint) => void;
  onEdit: (c: Complaint) => void;
  onDelete: (id: string) => void;
}

const ComplaintCard: React.FC<CardProps> = ({ complaint, onView, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = COMPLAINT_TYPES[complaint.complaint_type] || COMPLAINT_TYPES.other;

  return (
    <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden hover:border-white/[0.15] hover:shadow-xl transition-all duration-300">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <AvatarInitials name={complaint.reported_by_name} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/90 truncate">{complaint.title}</h3>
            <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />{complaint.location || 'No location'}
            </p>
          </div>
          <button type="button" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <TypeBadge type={complaint.complaint_type} />
          <SeverityBadge severity={complaint.severity} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0 border-b border-white/[0.06]">
        <div className="py-2 px-4 border-r border-white/[0.06]">
          <p className="text-[10px] text-white/40 flex items-center gap-1"><Calendar className="h-3 w-3" /> Reported</p>
          <p className="text-xs font-medium text-white/70 mt-0.5">{formatDate(complaint.reported_date)}</p>
        </div>
        <div className="py-2 px-4">
          <p className="text-[10px] text-white/40 flex items-center gap-1"><User className="h-3 w-3" /> By</p>
          <p className="text-xs font-medium text-white/70 mt-0.5 truncate">{complaint.reported_by_name}</p>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <div>
            <p className="text-[10px] text-white/40 flex items-center gap-1 mb-1"><MessageSquare className="h-3 w-3" /> Description</p>
            <p className="text-xs text-white/70 bg-white/[0.03] rounded-lg p-3 whitespace-pre-wrap">{complaint.description || 'No description'}</p>
          </div>
          {complaint.action_taken && (
            <div>
              <p className="text-[10px] text-white/40 flex items-center gap-1 mb-1"><Check className="h-3 w-3" /> Action Taken</p>
              <p className="text-xs text-white/70 bg-white/[0.03] rounded-lg p-3 whitespace-pre-wrap">{complaint.action_taken}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex border-t border-white/[0.06]">
        <button type="button" onClick={() => onView(complaint)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors border-r border-white/[0.06]">
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button type="button" onClick={() => onEdit(complaint)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors border-r border-white/[0.06]">
          <Edit className="h-3.5 w-3.5" /> Edit
        </button>
        <button type="button" onClick={() => onDelete(complaint.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

// =============== TABLE ROW ===============
interface RowProps {
  complaint: Complaint;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ComplaintTableRow: React.FC<RowProps> = ({ complaint, onView, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Fragment>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <td className="px-3 py-3">
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(v => !v)}
            className="p-1 rounded text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </td>
        <td className="px-4 py-3 text-xs font-medium text-white/80 max-w-[180px] truncate">{complaint.title}</td>
        <td className="px-4 py-3"><TypeBadge type={complaint.complaint_type} /></td>
        <td className="px-4 py-3"><SeverityBadge severity={complaint.severity} /></td>
        <td className="px-4 py-3 text-xs text-white/60 max-w-[130px] truncate">{complaint.location}</td>
        <td className="px-4 py-3 text-xs text-white/60">{complaint.reported_by_name}</td>
        <td className="px-4 py-3 text-xs text-white/60 whitespace-nowrap">{formatDate(complaint.reported_date)}</td>
        <td className="px-4 py-3"><StatusBadge status={complaint.status} /></td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <button type="button" title="View details" onClick={onView}
            className="inline-flex p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Edit" onClick={onEdit}
            className="inline-flex p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete" onClick={onDelete}
            className="inline-flex p-1.5 rounded-lg text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/[0.04] bg-white/[0.01]">
          <td colSpan={9} className="px-6 py-3 space-y-2">
            <div>
              <p className="text-[10px] text-white/40 flex items-center gap-1 mb-1"><MessageSquare className="h-3 w-3" /> Description</p>
              <p className="text-xs text-white/70 bg-white/[0.03] rounded-lg p-3">{complaint.description || 'No description provided'}</p>
            </div>
            {complaint.action_taken && (
              <div>
                <p className="text-[10px] text-white/40 flex items-center gap-1 mb-1"><Check className="h-3 w-3" /> Action Taken</p>
                <p className="text-xs text-white/70 bg-white/[0.03] rounded-lg p-3">{complaint.action_taken}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
};

// =============== DETAIL MODAL ===============
const ComplaintDetailModal = ({
  complaint, open, onClose, onEdit, onDelete, onStatusChange,
}: {
  complaint: Complaint | null;
  open: boolean;
  onClose: () => void;
  onEdit: (c: Complaint) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  if (!complaint) return null;

  return (
    <GlassModal isOpen={open} onClose={onClose} title="Complaint Details" icon={AlertTriangle} size="lg"
      footer={
        <>
          <div className="relative mr-auto">
            <button type="button" onClick={() => setStatusOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs hover:text-white/80 transition-colors">
              Change Status <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                <div className="absolute bottom-9 left-0 z-20 w-44 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-xl overflow-hidden">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => { setStatusOpen(false); onStatusChange(complaint.id, key); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => { onClose(); onEdit(complaint); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A4D69]/60 border border-[#86BBD8]/25 text-[#86BBD8] text-sm hover:bg-[#2A4D69]/80 transition-colors">
            <Edit className="h-3.5 w-3.5" /> Edit
          </button>
          <button type="button" onClick={() => { onClose(); onDelete(complaint.id); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <TypeBadge type={complaint.complaint_type} />
          <SeverityBadge severity={complaint.severity} />
          <StatusBadge status={complaint.status} />
        </div>

        <h3 className="text-base font-semibold text-white/90">{complaint.title}</h3>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Location', value: complaint.location || 'N/A' },
            { label: 'Reported Date', value: formatDate(complaint.reported_date) },
            { label: 'Reported By', value: complaint.reported_by_name },
            { label: 'Department', value: complaint.reported_by_department || 'N/A' },
            { label: 'Position', value: complaint.reported_by_position || 'N/A' },
            { label: 'Assigned To', value: complaint.assigned_to || 'Unassigned' },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-0.5">{item.label}</p>
              <p className="text-sm font-medium text-white/80">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] rounded-xl p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{complaint.description || 'No description provided'}</p>
        </div>

        {complaint.action_taken && (
          <div className="bg-white/[0.03] rounded-xl border border-l-4 border-emerald-500/40 border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Action Taken</p>
            <p className="text-sm text-white/70 whitespace-pre-wrap">{complaint.action_taken}</p>
          </div>
        )}

        {complaint.resolution_date && (
          <p className="text-xs text-white/40">
            Resolved on: {formatDate(complaint.resolution_date)}
          </p>
        )}
      </div>
    </GlassModal>
  );
};

// =============== FORM MODAL ===============
const defaultForm: ComplaintFormData = {
  title: '', complaint_type: 'hazard', severity: 'medium',
  description: '', location: '', reported_by_name: '',
  reported_by_id: '', reported_by_position: '', reported_by_department: '',
  assigned_to: '', action_taken: '', status: 'pending',
  reported_date: new Date().toISOString().split('T')[0],
};

const ComplaintFormModal = ({
  open, onClose, editData, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editData: Complaint | null;
  onSave: (data: ComplaintFormData, id?: string) => Promise<void>;
}) => {
  const [form, setForm] = useState<ComplaintFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        title: editData.title, complaint_type: editData.complaint_type,
        severity: editData.severity, description: editData.description,
        location: editData.location, reported_by_name: editData.reported_by_name,
        reported_by_id: editData.reported_by_id,
        reported_by_position: editData.reported_by_position || '',
        reported_by_department: editData.reported_by_department || '',
        assigned_to: editData.assigned_to || '',
        action_taken: editData.action_taken || '',
        status: editData.status, reported_date: editData.reported_date,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.location.trim()) { toast.error('Location is required'); return; }
    if (!form.reported_by_name.trim()) { toast.error('Reporter name is required'); return; }
    setSaving(true);
    try {
      await onSave(form, editData?.id);
      onClose();
    } catch (err) {
      toast.error('Failed to save complaint');
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof ComplaintFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <GlassModal
      isOpen={open} onClose={onClose}
      title={editData ? 'Edit Complaint' : 'Report Safety Complaint'}
      icon={AlertTriangle} size="xl"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:text-white/80 transition-colors">
            Cancel
          </button>
          <button type="submit" form="safety-complaint-form" disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#2A4D69] hover:bg-[#1e3a52] text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editData ? 'Update Complaint' : 'Submit Complaint'}
          </button>
        </>
      }
    >
      <form id="safety-complaint-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Core Details */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Complaint Details</p>
          <GlassInput label="Title *" value={form.title} onChange={f('title')}
            placeholder="Brief title describing the complaint" required />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSelect label="Type *" value={form.complaint_type} onChange={f('complaint_type')}
              options={Object.entries(COMPLAINT_TYPES).map(([k, v]) => ({ value: k, label: v.name }))} />
            <GlassSelect label="Severity *" value={form.severity} onChange={f('severity')}
              options={Object.entries(SEVERITY_LEVELS).map(([k, v]) => ({ value: k, label: v.name }))} />
            <GlassSelect label="Status" value={form.status} onChange={f('status')}
              options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput label="Location *" value={form.location} onChange={f('location')}
              placeholder="Where did this occur?" required />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Reported Date *</label>
              <input type="date" value={form.reported_date} onChange={f('reported_date')} required
                title="Reported date"
                className="w-full h-9 px-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/80 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50 transition-colors" />
            </div>
          </div>
          <GlassTextarea label="Description *" value={form.description} onChange={f('description')}
            placeholder="Detailed description of the safety concern..." rows={4} required />
        </div>

        {/* Reporter Info */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Reporter Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput label="Name *" value={form.reported_by_name} onChange={f('reported_by_name')}
              placeholder="Reporter full name" required />
            <GlassInput label="Employee ID" value={form.reported_by_id} onChange={f('reported_by_id')}
              placeholder="Employee ID number" />
            <GlassInput label="Position" value={form.reported_by_position || ''} onChange={f('reported_by_position')}
              placeholder="Job title/position" />
            <GlassInput label="Department" value={form.reported_by_department || ''} onChange={f('reported_by_department')}
              placeholder="Department name" />
          </div>
        </div>

        {/* Resolution */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Resolution (optional)</p>
          <GlassInput label="Assigned To" value={form.assigned_to || ''} onChange={f('assigned_to')}
            placeholder="Person responsible for resolving" />
          <GlassTextarea label="Action Taken" value={form.action_taken || ''} onChange={f('action_taken')}
            placeholder="Describe actions taken to address this complaint..." rows={3} />
        </div>
      </form>
    </GlassModal>
  );
};

// =============== MAIN PAGE ===============
export default function SafetyComplaintsPage() {
  const sections = usePageCollapse({ stats: false, records: true });

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Complaint | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortValue, setSortValue] = useState('date-desc');

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (typeFilter) filters.complaint_type = typeFilter;
      if (severityFilter) filters.severity = severityFilter;
      if (statusFilter) filters.status = statusFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      const data = await fetchComplaints(filters);
      setComplaints(data);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [typeFilter, severityFilter, statusFilter, dateFrom, dateTo]);

  const handleSave = async (data: ComplaintFormData, id?: string) => {
    if (id) {
      const updated = await updateComplaint(id, data);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      toast.success('Complaint updated');
    } else {
      const created = await createComplaint(data);
      setComplaints(prev => [created, ...prev]);
      toast.success('Complaint submitted');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComplaint(id);
      setComplaints(prev => prev.filter(c => c.id !== id));
      toast.success('Complaint deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateComplaint(id, { status });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label || status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const clearFilters = () => {
    setSearchTerm(''); setTypeFilter(''); setSeverityFilter('');
    setStatusFilter(''); setDateFrom(''); setDateTo('');
    setCurrentPage(1);
  };

  const processedComplaints = useMemo(() => {
    let filtered = complaints;
    if (searchTerm) {
      const sl = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(sl) || c.description?.toLowerCase().includes(sl) ||
        c.location?.toLowerCase().includes(sl) || c.reported_by_name?.toLowerCase().includes(sl)
      );
    }
    const [sortBy, sortOrder] = sortValue.split('-');
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.reported_date).getTime() - new Date(b.reported_date).getTime();
      else if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortBy === 'severity') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        cmp = (order[a.severity as keyof typeof order] || 0) - (order[b.severity as keyof typeof order] || 0);
      } else if (sortBy === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [complaints, searchTerm, sortValue]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedComplaints.slice(start, start + itemsPerPage);
  }, [processedComplaints, currentPage]);

  const totalPages = Math.ceil(processedComplaints.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: processedComplaints.length,
    pending: processedComplaints.filter(c => c.status === 'pending').length,
    investigating: processedComplaints.filter(c => c.status === 'investigating').length,
    resolved: processedComplaints.filter(c => c.status === 'resolved').length,
    critical: processedComplaints.filter(c => c.severity === 'critical').length,
    high: processedComplaints.filter(c => c.severity === 'high').length,
  }), [processedComplaints]);

  const hasFilters = searchTerm || typeFilter || severityFilter || statusFilter || dateFrom || dateTo;

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <span>Home</span><ChevronRight className="h-3 w-3" />
              <span className="text-[#86BBD8] font-medium">Safety Complaints</span>
            </nav>
            <h1 className="text-2xl font-bold text-white/90 font-heading tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Safety Complaints
            </h1>
            <p className="text-white/40 text-sm mt-1">Report, track, and resolve safety concerns. Every report helps create a safer workplace.</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button type="button" onClick={() => exportToCSV(processedComplaints)} title="Export CSV"
              className="p-2 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={loadData} disabled={loading} title="Refresh"
              className="p-2 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <MasterCollapseButton collapse={sections} />
            <button type="button" onClick={() => { setEditData(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A4D69] hover:bg-[#1e3a52] text-white border border-[#86BBD8]/20 text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> New Complaint
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => sections.toggle('stats')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-all">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Overview</span>
              <span className="text-xs text-white/35">{stats.total} reports</span>
            </div>
            {sections.expanded.stats ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
          </button>
          {sections.expanded.stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 px-5 pb-5">
              <GlassStatCard label="Total Reports" value={stats.total} icon={FileText} />
              <GlassStatCard label="Pending" value={stats.pending} icon={Clock} valueClass="text-amber-400"
                onClick={() => setStatusFilter('pending')} />
              <GlassStatCard label="Investigating" value={stats.investigating} icon={Search} valueClass="text-blue-400"
                onClick={() => setStatusFilter('investigating')} />
              <GlassStatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} valueClass="text-emerald-400"
                onClick={() => setStatusFilter('resolved')} />
              <GlassStatCard label="Critical" value={stats.critical} icon={AlertTriangle} valueClass="text-red-400"
                onClick={() => setSeverityFilter('critical')} />
              <GlassStatCard label="High Risk" value={stats.high} icon={AlertCircle} valueClass="text-orange-400"
                onClick={() => setSeverityFilter('high')} />
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm p-5">
          <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search title, description, location, reporter..."
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/80 placeholder:text-white/25 text-sm outline-none focus:border-[#86BBD8]/50 transition-colors" />
              {searchTerm && (
                <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <GlassSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              options={COMPLAINT_TYPE_OPTIONS} title="Filter by type" className="w-[150px]" />
            <GlassSelect value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
              options={SEVERITY_OPTIONS} title="Filter by severity" className="w-[140px]" />
            <GlassSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS} title="Filter by status" className="w-[140px]" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date"
              className="h-9 px-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/70 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date"
              className="h-9 px-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/70 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50" />
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-sm transition-colors">
                <FilterX className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-white/40">
              {loading ? 'Loading...' : `Showing ${paginatedData.length} of ${processedComplaints.length} complaints`}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" title="Table view" onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'table' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/25 text-[#86BBD8]' : 'border-white/[0.08] text-white/40 hover:text-white/70'}`}>
                <TableIcon className="h-4 w-4" />
              </button>
              <button type="button" title="Grid view" onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/25 text-[#86BBD8]' : 'border-white/[0.08] text-white/40 hover:text-white/70'}`}>
                <Grid className="h-4 w-4" />
              </button>
              <GlassSelect value={sortValue} onChange={e => setSortValue(e.target.value)}
                options={SORT_OPTIONS} title="Sort order" className="w-[200px]" />
            </div>
          </div>
        </div>

        {/* Records */}
        <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => sections.toggle('records')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-all">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Records</span>
              <span className="text-xs text-white/35">{processedComplaints.length} complaints</span>
            </div>
            {sections.expanded.records ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
          </button>
          {sections.expanded.records && (
          <div className="px-5 pb-5 pt-1">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-red-400" />
          </div>
        )}

        {/* Empty */}
        {!loading && paginatedData.length === 0 && (
          <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] py-20 text-center">
            <AlertTriangle className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/60 mb-2">No safety complaints found</h3>
            <p className="text-sm text-white/30 mb-6">
              {complaints.length === 0 ? 'Get started by reporting your first safety concern.' : 'No records match your filters.'}
            </p>
            {complaints.length === 0 ? (
              <button type="button" onClick={() => { setEditData(null); setShowForm(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors">
                <Plus className="h-4 w-4" /> Report Complaint
              </button>
            ) : (
              <button type="button" onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm hover:text-white/70 transition-colors">
                <FilterX className="h-4 w-4" /> Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && paginatedData.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedData.map(complaint => (
                <ComplaintCard key={complaint.id} complaint={complaint}
                  onView={setSelectedComplaint}
                  onEdit={c => { setEditData(c); setShowForm(true); }}
                  onDelete={id => setDeleteConfirm(id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['', 'Title', 'Type', 'Severity', 'Location', 'Reporter', 'Date', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(complaint => (
                      <ComplaintTableRow key={complaint.id} complaint={complaint}
                        onView={() => setSelectedComplaint(complaint)}
                        onEdit={() => { setEditData(complaint); setShowForm(true); }}
                        onDelete={() => setDeleteConfirm(complaint.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs hover:text-white/80 disabled:opacity-30 transition-colors">
              Previous
            </button>
            <span className="text-xs text-white/40">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs hover:text-white/80 disabled:opacity-30 transition-colors">
              Next
            </button>
          </div>
        )}

          </div>
          )}
        </div>

        {/* Detail Modal */}
        <ComplaintDetailModal
          complaint={selectedComplaint} open={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onEdit={c => { setSelectedComplaint(null); setEditData(c); setShowForm(true); }}
          onDelete={id => { setSelectedComplaint(null); setDeleteConfirm(id); }}
          onStatusChange={handleStatusChange}
        />

        {/* Form Modal */}
        <ComplaintFormModal
          open={showForm} onClose={() => setShowForm(false)}
          editData={editData} onSave={handleSave}
        />

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="text-base font-semibold text-white/90">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-white/50 mb-5">Are you sure you want to delete this complaint? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:text-white/80 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                  className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
