'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Eye, Save, Target, Plus, Trash2, Loader2, CheckCircle, AlertTriangle,
  LayoutGrid, Table as TableIcon, ChevronRight, RefreshCw, HardHat, Zap,
  MessageSquare, Clock, Send, FileText, CheckCircle2, X, PenTool
} from "lucide-react";
import { PageShell } from '@/components/PageShell';
import { toast } from "sonner";
import {
  safetyFetch, glassInput, glassLabel, glassTextarea, glassSelect,
  SafetyHero, SafetyControls, FilterPills, DateRangeFilter, ClearFiltersButton,
  SafetyPanel, SafetyModal, FormField, ModalActions,
  SafetyTable, RowActions, AddButton, LoadingState, EmptyState, TabBar
} from '@/components/safety';

// =============== TYPES ===============
type SectionType = 'Mechanical' | 'Electrical';
type BehaviourCategory = 'Safe Behaviour' | 'Unsafe Behaviour';
type ObservationType = 'Safe Behaviour' | 'Safe Condition' | 'At Risk Behaviour' | 'At Risk Condition';
type CoachingTechnique = 'SBR' | 'CC';
type VFLStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';
type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

interface ActionItem {
  id: string;
  action: string;
  responsible: string;
  targetDate: string;
  status: ActionStatus;
  completedDate?: string;
  remarks?: string;
}

interface VFLReport {
  id: string;
  observerName: string;
  designation: string;
  sectionChoice: SectionType;
  departmentSection: string;
  date: string;
  time: string;
  behaviourCategory: BehaviourCategory;
  observationType: ObservationType;
  description: string;
  coachingTechnique: CoachingTechnique;
  actions: ActionItem[];
  status: VFLStatus;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

// =============== CONSTANTS ===============
const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = ['Safe Behaviour', 'Unsafe Behaviour'];
const OBSERVATION_TYPES: ObservationType[] = ['Safe Behaviour', 'Safe Condition', 'At Risk Behaviour', 'At Risk Condition'];
const COACHING_TECHNIQUES: CoachingTechnique[] = ['SBR', 'CC'];

const SECTION_COLORS: Record<SectionType, string> = {
  Mechanical: '#3b82f6',
  Electrical: '#f59e0b',
};
const SECTION_ICONS: Record<SectionType, React.ElementType> = {
  Mechanical: HardHat,
  Electrical: Zap,
};

const BEHAVIOUR_COLORS: Record<BehaviourCategory, string> = {
  'Safe Behaviour': '#10b981',
  'Unsafe Behaviour': '#ef4444',
};

const OBSERVATION_COLORS: Record<ObservationType, string> = {
  'Safe Behaviour': '#10b981',
  'Safe Condition': '#34d399',
  'At Risk Behaviour': '#f97316',
  'At Risk Condition': '#ef4444',
};

const COACHING_DESC: Record<CoachingTechnique, string> = {
  SBR: 'Situation, Behaviour, Result',
  CC: 'Coaching Conversation',
};

const STATUS_COLORS: Record<VFLStatus, string> = {
  draft: '#6b7280',
  submitted: '#3b82f6',
  reviewed: '#a78bfa',
  closed: '#10b981',
};

const ACTION_COLORS: Record<ActionStatus, string> = {
  Pending: '#f59e0b',
  'In Progress': '#3b82f6',
  Completed: '#10b981',
};

// =============== API FUNCTIONS ===============
async function getVFLReports(params?: Record<string, string>): Promise<VFLReport[]> {
  try {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await safetyFetch<VFLReport[]>(`/api/vfl/${qs}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function createVFLReport(report: Partial<VFLReport>): Promise<VFLReport> {
  return safetyFetch<VFLReport>('/api/vfl/', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}

async function updateVFLReport(id: string, report: Partial<VFLReport>): Promise<VFLReport> {
  return safetyFetch<VFLReport>(`/api/vfl/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(report),
  });
}

async function deleteVFLReport(id: string): Promise<void> {
  return safetyFetch<void>(`/api/vfl/${id}/`, { method: 'DELETE' });
}

// =============== HELPERS ===============
const fmtDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return s; }
};
const fmtTime = (s: string) => {
  if (!s) return '';
  try { return new Date(`2000-01-01T${s}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const fmtDateTime = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};

const newId = () => Math.random().toString(36).slice(2, 11);

const defaultForm = (): Partial<VFLReport> => ({
  observerName: '',
  designation: '',
  sectionChoice: 'Mechanical',
  departmentSection: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  behaviourCategory: 'Safe Behaviour',
  observationType: 'Safe Behaviour',
  description: '',
  coachingTechnique: 'SBR',
  actions: [],
  status: 'draft',
});

// =============== CHIP BADGE ===============
const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: color + '22', color, border: `1px solid ${color}55`,
  }}>{label}</span>
);

// =============== ACTION ITEM CARD ===============
interface ActionCardProps {
  item: ActionItem;
  index: number;
  onChange: (id: string, field: keyof ActionItem, value: string) => void;
  onRemove: (id: string) => void;
}
const ActionItemCard: React.FC<ActionCardProps> = ({ item, index, onChange, onRemove }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '14px 14px 10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1 }}>Action #{index + 1}</span>
      <button type="button" onClick={() => onRemove(item.id)} title="Remove action"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}>
        <Trash2 size={14} />
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label className={glassLabel}>Action Description *</label>
        <input className={glassInput} value={item.action} placeholder="Describe the action..."
          onChange={e => onChange(item.id, 'action', e.target.value)} title="Action description" />
      </div>
      <div>
        <label className={glassLabel}>Responsible Person *</label>
        <input className={glassInput} value={item.responsible} placeholder="Full name"
          onChange={e => onChange(item.id, 'responsible', e.target.value)} title="Responsible person" />
      </div>
      <div>
        <label className={glassLabel}>Target Date *</label>
        <input type="date" className={glassInput} value={item.targetDate} title="Target date" placeholder="Target date"
          onChange={e => onChange(item.id, 'targetDate', e.target.value)} />
      </div>
      <div>
        <label className={glassLabel}>Status</label>
        <select className={glassSelect} value={item.status} title="Status"
          onChange={e => onChange(item.id, 'status', e.target.value as ActionStatus)}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      {item.status === 'Completed' && (
        <div>
          <label className={glassLabel}>Completed Date</label>
          <input type="date" className={glassInput} value={item.completedDate || ''} title="Completed date" placeholder="Completed date"
            onChange={e => onChange(item.id, 'completedDate', e.target.value)} />
        </div>
      )}
      <div style={{ gridColumn: '1 / -1' }}>
        <label className={glassLabel}>Remarks (Optional)</label>
        <textarea className={glassTextarea} style={{ minHeight: 48 }} value={item.remarks || ''} placeholder="Additional notes..."
          onChange={e => onChange(item.id, 'remarks', e.target.value)} title="Remarks" />
      </div>
    </div>
  </div>
);

// =============== VFL CARD (Grid) ===============
interface VFLCardProps {
  report: VFLReport;
  index: number;
  onView: (r: VFLReport) => void;
  onEdit: (r: VFLReport) => void;
  onDelete: (id: string) => void;
}
const VFLCard: React.FC<VFLCardProps> = ({ report, index, onView, onEdit, onDelete }) => {
  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const bColor = BEHAVIOUR_COLORS[report.behaviourCategory];
  const sColor = SECTION_COLORS[report.sectionChoice];
  const total = report.actions?.length || 0;
  const done = report.actions?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actions?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div onClick={() => onView(report)} style={{ cursor: 'pointer', position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', transition: 'box-shadow 0.2s' }}>
      {/* Accent stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${bColor},${sColor})` }} />
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 7, borderRadius: 8, background: sColor + '22' }}>
              <SectionIcon size={16} style={{ color: sColor }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>VFL #{index + 1}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.92)' }}>{report.observerName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <Chip label={report.sectionChoice} color={sColor} />
            <Chip label={report.behaviourCategory} color={bColor} />
          </div>
        </div>

        {/* Info row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            { label: report.designation || 'No designation' },
            { label: fmtDate(report.date) },
            { label: fmtTime(report.time) },
            { label: report.observationType },
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
              {item.label}
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {report.description || 'No description recorded.'}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              <span>Action Progress</span><span>{pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Chip label={`${total - done - inProg} Pending`} color="#f59e0b" />
              <Chip label={`${inProg} In Progress`} color="#3b82f6" />
              <Chip label={`${done} Done`} color="#10b981" />
            </div>
          </div>
        )}

        {/* Coaching + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
          <Chip label={`${report.coachingTechnique} — ${COACHING_DESC[report.coachingTechnique]}`} color="#a78bfa" />
          <Chip label={report.status.charAt(0).toUpperCase() + report.status.slice(1)} color={STATUS_COLORS[report.status]} />
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
          <button onClick={() => onView(report)} title="View" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} /> View
          </button>
          <button onClick={() => onEdit(report)} title="Edit" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#60a5fa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <PenTool size={12} /> Edit
          </button>
          <button onClick={() => onDelete(report.id)} title="Delete" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#f87171', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// =============== DETAIL MODAL ===============
interface DetailModalProps {
  report: VFLReport | null;
  open: boolean;
  onClose: () => void;
  onEdit: (r: VFLReport) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: VFLStatus) => void;
}
const VFLDetailModal: React.FC<DetailModalProps> = ({ report, open, onClose, onEdit, onDelete, onStatusChange }) => {
  if (!report) return null;
  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const bColor = BEHAVIOUR_COLORS[report.behaviourCategory];
  const sColor = SECTION_COLORS[report.sectionChoice];
  const oColor = OBSERVATION_COLORS[report.observationType];
  const total = report.actions?.length || 0;
  const done = report.actions?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actions?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const infoStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' };

  return (
    <SafetyModal open={open} onClose={onClose} title="Visible Felt Leadership Observation" width="max-w-2xl">
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: 7, borderRadius: 8, background: sColor + '22' }}>
            <SectionIcon size={16} style={{ color: sColor }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14 }}>{report.sectionChoice}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip label={report.behaviourCategory} color={bColor} />
          <select title="Change status" className={glassSelect} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
            value={report.status} onChange={e => onStatusChange(report.id, e.target.value as VFLStatus)}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Action Progress</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{done}/{total} completed</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip label={`${total - done - inProg} Pending`} color="#f59e0b" />
            <Chip label={`${inProg} In Progress`} color="#3b82f6" />
            <Chip label={`${done} Completed`} color="#10b981" />
          </div>
        </div>
      )}

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Observer', val: report.observerName },
          { label: 'Designation', val: report.designation || 'N/A' },
          { label: 'Date', val: fmtDate(report.date) },
          { label: 'Time', val: fmtTime(report.time) },
        ].map(({ label, val }) => (
          <div key={label} style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{val}</div>
          </div>
        ))}
      </div>

      {report.departmentSection && (
        <div style={{ ...infoStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Department/Section</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{report.departmentSection}</div>
        </div>
      )}

      {/* Observation details */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Observation Details</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Chip label={report.observationType} color={oColor} />
          <Chip label={`${report.coachingTechnique} — ${COACHING_DESC[report.coachingTechnique]}`} color="#a78bfa" />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.description}
        </div>
      </div>

      {/* Actions */}
      {report.actions && report.actions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Action Plan ({report.actions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.actions.map((action, idx) => {
              const ac = ACTION_COLORS[action.status];
              return (
                <div key={action.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${ac}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Action #{idx + 1}</span>
                    <Chip label={action.status} color={ac} />
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>{action.action}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    <span>By: {action.responsible}</span>
                    <span>Target: {fmtDate(action.targetDate)}</span>
                    {action.completedDate && <span>Completed: {fmtDate(action.completedDate)}</span>}
                  </div>
                  {action.remarks && (
                    <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', borderLeft: '2px solid #10b981', paddingLeft: 8 }}>
                      {action.remarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ModalActions
        onCancel={onClose}
        onSave={() => { onClose(); onEdit(report); }}
        saveLabel="Edit"
        extra={
          <button onClick={() => { onClose(); onDelete(report.id); }}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Delete
          </button>
        }
      />
    </SafetyModal>
  );
};

// =============== FORM MODAL ===============
interface FormModalProps {
  open: boolean;
  editing: VFLReport | null;
  onClose: () => void;
  onSave: (data: Partial<VFLReport>) => Promise<void>;
  saving: boolean;
}
const VFLFormModal: React.FC<FormModalProps> = ({ open, editing, onClose, onSave, saving }) => {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Partial<VFLReport>>(defaultForm());

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : defaultForm());
      setTab(0);
    }
  }, [open, editing]);

  const set = (field: keyof VFLReport, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));

  const addAction = () => {
    setForm(prev => ({
      ...prev,
      actions: [...(prev.actions || []), { id: newId(), action: '', responsible: '', targetDate: '', status: 'Pending' }],
    }));
  };

  const updateAction = (id: string, field: keyof ActionItem, val: string) => {
    setForm(prev => ({ ...prev, actions: prev.actions?.map(a => a.id === id ? { ...a, [field]: val } : a) || [] }));
  };

  const removeAction = (id: string) => {
    setForm(prev => ({ ...prev, actions: prev.actions?.filter(a => a.id !== id) || [] }));
  };

  const handleSubmit = async () => {
    if (!form.observerName?.trim()) { toast.error('Observer name is required'); setTab(0); return; }
    if (!form.date) { toast.error('Date is required'); setTab(0); return; }
    if (!form.time) { toast.error('Time is required'); setTab(0); return; }
    if (!form.description?.trim()) { toast.error('Description is required'); setTab(1); return; }
    await onSave(form);
  };

  const tabs = ['Observer Info', 'Observation', 'Action Plan'];

  const radioStyle: React.CSSProperties = { accentColor: '#10b981', cursor: 'pointer' };
  const radioGroupStyle: React.CSSProperties = { display: 'flex', gap: 16, flexWrap: 'wrap' };
  const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', cursor: 'pointer' };

  return (
    <SafetyModal open={open} onClose={onClose}
      title={editing ? 'Edit VFL Observation' : 'New VFL Observation'}
      subtitle="Record a Visible Felt Leadership observation. * = required."
      maxWidth={700}>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Observer's Name *">
              <input className={glassInput} value={form.observerName || ''} placeholder="Full name"
                onChange={e => set('observerName', e.target.value)} title="Observer name" />
            </FormField>
          </div>
          <FormField label="Designation">
            <input className={glassInput} value={form.designation || ''} placeholder="Job title"
              onChange={e => set('designation', e.target.value)} title="Designation" />
          </FormField>
          <FormField label="Section *">
            <select className={glassSelect} value={form.sectionChoice || 'Mechanical'} title="Section"
              onChange={e => set('sectionChoice', e.target.value as SectionType)}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Department/Section">
              <input className={glassInput} value={form.departmentSection || ''} placeholder="e.g., Production, Maintenance"
                onChange={e => set('departmentSection', e.target.value)} title="Department or section" />
            </FormField>
          </div>
          <FormField label="Date *">
            <input type="date" className={glassInput} value={form.date || ''} title="Observation date" placeholder="Date"
              onChange={e => set('date', e.target.value)} />
          </FormField>
          <FormField label="Time *">
            <input type="time" className={glassInput} value={form.time || ''} title="Observation time" placeholder="Time"
              onChange={e => set('time', e.target.value)} />
          </FormField>
          <FormField label="Status">
            <select className={glassSelect} value={form.status || 'draft'} title="Status"
              onChange={e => set('status', e.target.value as VFLStatus)}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="closed">Closed</option>
            </select>
          </FormField>
        </div>
      )}

      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className={glassLabel} style={{ display: 'block', marginBottom: 8 }}>Behaviour Category *</label>
            <div style={radioGroupStyle}>
              {BEHAVIOUR_CATEGORIES.map(cat => (
                <label key={cat} style={radioLabelStyle}>
                  <input type="radio" style={radioStyle} name="behaviourCat" value={cat}
                    checked={form.behaviourCategory === cat}
                    onChange={() => set('behaviourCategory', cat)} />
                  <span style={{ color: BEHAVIOUR_COLORS[cat], fontWeight: 600 }}>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={glassLabel} style={{ display: 'block', marginBottom: 8 }}>Observation Type *</label>
            <div style={{ ...radioGroupStyle, flexDirection: 'column', gap: 8 }}>
              {OBSERVATION_TYPES.map(type => (
                <label key={type} style={radioLabelStyle}>
                  <input type="radio" style={radioStyle} name="obsType" value={type}
                    checked={form.observationType === type}
                    onChange={() => set('observationType', type)} />
                  <span style={{ color: OBSERVATION_COLORS[type] }}>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Description *">
            <textarea className={glassTextarea} style={{ minHeight: 100 }} value={form.description || ''}
              placeholder="Relate details of the observation..." title="Description"
              onChange={e => set('description', e.target.value)} />
          </FormField>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
            <label className={glassLabel} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MessageSquare size={14} /> Coaching Technique Used *
            </label>
            <div style={radioGroupStyle}>
              {COACHING_TECHNIQUES.map(tech => (
                <label key={tech} style={radioLabelStyle}>
                  <input type="radio" style={radioStyle} name="coaching" value={tech}
                    checked={form.coachingTechnique === tech}
                    onChange={() => set('coachingTechnique', tech)} />
                  <span style={{ fontWeight: 700 }}>{tech}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>({COACHING_DESC[tech]})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Actions to Rectify / Reinforce</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Define actions to address or reinforce behaviours.</div>
            </div>
            <button type="button" onClick={addAction}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, padding: '6px 12px', color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Add Action
            </button>
          </div>
          {(form.actions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Target size={36} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13 }}>No actions added yet.</div>
              <button type="button" onClick={addAction}
                style={{ marginTop: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>
                + Add First Action
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(form.actions || []).map((item, idx) => (
                <ActionItemCard key={item.id} item={item} index={idx} onChange={updateAction} onRemove={removeAction} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: 1 }}>
            Observer Signature Required on Printout
          </div>
        </div>
      )}

      <ModalActions onCancel={onClose} onSave={handleSubmit} saving={saving}
        saveLabel={editing ? 'Update VFL' : 'Save VFL'} />
    </SafetyModal>
  );
};

// =============== MAIN PAGE ===============
export default function VFLObservationPage() {
  const [reports, setReports] = useState<VFLReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [selectedReport, setSelectedReport] = useState<VFLReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VFLReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [behaviourFilter, setBehaviourFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVFLReports();
      setReports(data);
    } catch {
      toast.error('Failed to load VFL reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (form: Partial<VFLReport>) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateVFLReport(editing.id, { ...form, updated_at: new Date().toISOString() });
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success('VFL observation updated');
      } else {
        const created = await createVFLReport({ ...form, status: 'submitted', submitted_at: new Date().toISOString() });
        setReports(prev => [created, ...prev]);
        toast.success('VFL observation recorded');
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      toast.error('Failed to save VFL report');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: VFLReport) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVFLReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('VFL report deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete report');
    }
  };

  const handleStatusChange = async (id: string, status: VFLStatus) => {
    const prev = reports.find(r => r.id === id);
    if (!prev) return;
    setReports(ps => ps.map(r => r.id === id ? { ...r, status } : r));
    try {
      await updateVFLReport(id, { status });
      toast.success(`Status updated to ${status}`);
    } catch {
      setReports(ps => ps.map(r => r.id === id ? prev : r));
      toast.error('Failed to update status');
    }
  };

  const clearFilters = () => {
    setSearch(''); setSectionFilter('all'); setStatusFilter('all');
    setBehaviourFilter('all'); setDateFrom(''); setDateTo('');
  };

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (![r.observerName, r.designation, r.description, r.departmentSection].some(s => s?.toLowerCase().includes(q))
          && !r.actions?.some(a => a.action?.toLowerCase().includes(q))) return false;
      }
      if (sectionFilter !== 'all' && r.sectionChoice !== sectionFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (behaviourFilter !== 'all' && r.behaviourCategory !== behaviourFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [reports, search, sectionFilter, statusFilter, behaviourFilter, dateFrom, dateTo]);

  const total = reports.length;
  const drafts = reports.filter(r => r.status === 'draft').length;
  const submitted = reports.filter(r => r.status === 'submitted').length;
  const reviewed = reports.filter(r => r.status === 'reviewed').length;
  const closed = reports.filter(r => r.status === 'closed').length;
  const unsafe = reports.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length;
  const safe = reports.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const totalActions = reports.reduce((acc, r) => acc + (r.actions?.length || 0), 0);

  const hasFilters = search || sectionFilter !== 'all' || statusFilter !== 'all' || behaviourFilter !== 'all' || dateFrom || dateTo;

  const heroStats = [
    { label: 'Total', value: total, icon: <Eye size={16} />, color: '#10b981' },
    { label: 'Draft', value: drafts, icon: <FileText size={16} />, color: '#6b7280' },
    { label: 'Submitted', value: submitted, icon: <Send size={16} />, color: '#3b82f6' },
    { label: 'Reviewed', value: reviewed, icon: <CheckCircle size={16} />, color: '#a78bfa' },
    { label: 'Closed', value: closed, icon: <CheckCircle2 size={16} />, color: '#10b981' },
    { label: 'Unsafe', value: unsafe, icon: <AlertTriangle size={16} />, color: '#ef4444' },
    { label: 'Safe', value: safe, icon: <CheckCircle size={16} />, color: '#34d399' },
    { label: 'Actions', value: totalActions, icon: <Target size={16} />, color: '#60a5fa' },
  ];

  const sectionPills = [
    { label: 'All', value: 'all' },
    { label: 'Mechanical', value: 'Mechanical' },
    { label: 'Electrical', value: 'Electrical' },
  ];
  const statusPills = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Closed', value: 'closed' },
  ];
  const behaviourPills = [
    { label: 'All', value: 'all' },
    { label: 'Safe', value: 'Safe Behaviour' },
    { label: 'Unsafe', value: 'Unsafe Behaviour' },
  ];

  const tableColumns = ['Date', 'Observer', 'Designation', 'Section', 'Behaviour', 'Coaching', 'Status', 'Actions'];
  const tableRows = filtered.map(r => ({
    id: r.id,
    cells: [
      fmtDate(r.date),
      r.observerName,
      r.designation || 'N/A',
      r.sectionChoice,
      r.behaviourCategory,
      r.coachingTechnique,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ],
  }));

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Hero */}
        <SafetyHero
          breadcrumb={[{ label: 'Home' }, { label: 'VFL' }]}
          title="Visible Felt Leadership"
          subtitle="Safety observations and coaching tracking."
          accent="#10b981"
          stats={heroStats}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={loadData} title="Refresh"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setViewMode('grid')} title="Grid view"
                style={{ background: viewMode === 'grid' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${viewMode === 'grid' ? '#10b981' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: viewMode === 'grid' ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setViewMode('table')} title="Table view"
                style={{ background: viewMode === 'table' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${viewMode === 'table' ? '#10b981' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: viewMode === 'table' ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                <TableIcon size={15} />
              </button>
              <AddButton label="New VFL" onClick={() => { setEditing(null); setFormOpen(true); }} color="#10b981" />
            </div>
          }
        />

        {/* Controls */}
        <SafetyControls
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search by observer, description, actions..."
          filters={
            <>
              <FilterPills label="Section" pills={sectionPills} value={sectionFilter} onChange={setSectionFilter} />
              <FilterPills label="Status" pills={statusPills} value={statusFilter} onChange={setStatusFilter} />
              <FilterPills label="Behaviour" pills={behaviourPills} value={behaviourFilter} onChange={setBehaviourFilter} />
              <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
              {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
            </>
          }
          resultCount={filtered.length}
          totalCount={total}
        />

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Eye size={40} />}
            title="No VFL observations found"
            message={total === 0 ? 'Start by recording your first VFL observation.' : 'Try adjusting your filters.'}
            action={total === 0
              ? <AddButton label="Create First VFL" onClick={() => { setEditing(null); setFormOpen(true); }} color="#10b981" />
              : <ClearFiltersButton onClick={clearFilters} />}
          />
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((r, i) => (
              <VFLCard key={r.id} report={r} index={i}
                onView={r => { setSelectedReport(r); setDetailOpen(true); }}
                onEdit={handleEdit}
                onDelete={id => setDeleteTarget(id)}
              />
            ))}
          </div>
        ) : (
          <SafetyTable
            columns={tableColumns}
            rows={tableRows}
            onRowClick={id => { const r = reports.find(x => x.id === id); if (r) { setSelectedReport(r); setDetailOpen(true); } }}
            renderActions={id => {
              const r = reports.find(x => x.id === id);
              if (!r) return null;
              return <RowActions onEdit={() => handleEdit(r)} onDelete={() => setDeleteTarget(id)} />;
            }}
          />
        )}

        {/* Modals */}
        <VFLDetailModal
          report={selectedReport}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedReport(null); }}
          onEdit={r => { setDetailOpen(false); handleEdit(r); }}
          onDelete={id => { setDetailOpen(false); setDeleteTarget(id); }}
          onStatusChange={handleStatusChange}
        />

        <VFLFormModal
          open={formOpen}
          editing={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />

        {/* Delete confirm */}
        <SafetyModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
          title="Confirm Deletion" subtitle="This action cannot be undone." maxWidth={420}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
            Are you sure you want to delete this VFL observation?
          </div>
          <ModalActions onCancel={() => setDeleteTarget(null)}
            onSave={() => deleteTarget && handleDelete(deleteTarget)}
            saveLabel="Delete"
            saveColor="#ef4444"
          />
        </SafetyModal>

      </main>
    </PageShell>
  );
}
