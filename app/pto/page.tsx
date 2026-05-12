'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList, Target, Plus, Trash2, AlertTriangle,
  Eye, Pencil, FileText, CheckCircle, LayoutGrid, Table as TableIcon,
  RefreshCw, Wrench, Zap, Send, CheckSquare, ShieldAlert, BookOpen
} from "lucide-react";
import { PageShell } from '@/components/PageShell';
import { toast } from "sonner";
import {
  safetyFetch, glassInput, glassLabel, glassTextarea, glassSelect,
  SafetyHero, SafetyControls, FilterPills, DateRangeFilter, ClearFiltersButton,
  SafetyModal, FormField, ModalActions,
  SafetyTable, RowActions, AddButton, LoadingState, EmptyState, TabBar
} from '@/components/safety';

// =============== TYPES ===============
type SectionType = 'Mechanical' | 'Electrical';
type ObservationType = 'Initial' | 'Follow up';
type YesNoType = 'Yes' | 'No';
type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';
type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

interface TimeOnJob { months: string; years: string; }
interface Notification { toldInAdvance: YesNoType; }
interface Reasons {
  monthly: boolean; newEmployee: boolean; safetyAwareness: boolean;
  incidentFollowUp: boolean; trainingFollowUp: boolean; infrequentTask: boolean;
}
interface Procedures { hasProcedure: YesNoType; familiarWithProcedure: YesNoType; }
interface RiskAssessment { made: YesNoType; identified: YesNoType; effective: YesNoType; }
interface SuggestedRemedies {
  newProcedure: YesNoType; reviseExisting: YesNoType; differentEquipment: YesNoType;
  engineeringControls: YesNoType; retraining: YesNoType; improvedPPE: YesNoType; placementOfWorker: YesNoType;
}
interface ActionPlanItem {
  id: string; no: number; action: string; byWhom: string; byWhen: string;
  status: ActionStatus; completedDate?: string; remarks?: string;
}
interface PTOReport {
  id: string; date: string; observerName: string; section: SectionType;
  deptSectionContractor: string; workerName: string; occupation: string;
  jobTaskObserved: string; sheqRefNo: string; observationType: ObservationType;
  timeOnJob: TimeOnJob; notification: Notification; reasons: Reasons;
  procedures: Procedures; riskAssessment: RiskAssessment; suggestedRemedies: SuggestedRemedies;
  observationScope: 'All' | 'Partial'; followUpNeeded: YesNoType;
  actionPlan: ActionPlanItem[]; status: ReportStatus;
  created_at: string; updated_at?: string; submitted_at?: string;
}

// =============== CONSTANTS ===============
const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const SECTION_COLORS: Record<SectionType, string> = { Mechanical: '#3b82f6', Electrical: '#f59e0b' };
const SECTION_ICONS: Record<SectionType, React.ElementType> = { Mechanical: Wrench, Electrical: Zap };
const OBS_COLORS: Record<ObservationType, string> = { Initial: '#a78bfa', 'Follow up': '#f97316' };
const STATUS_COLORS: Record<ReportStatus, string> = {
  draft: '#6b7280', submitted: '#3b82f6', reviewed: '#a78bfa', closed: '#10b981'
};
const ACTION_COLORS: Record<ActionStatus, string> = {
  Pending: '#f59e0b', 'In Progress': '#3b82f6', Completed: '#10b981'
};

const REASON_LABELS: Record<keyof Reasons, string> = {
  monthly: 'Monthly Observation', newEmployee: 'New Employee',
  safetyAwareness: 'Safety Awareness', incidentFollowUp: 'Incident Follow up',
  trainingFollowUp: 'Training Follow up', infrequentTask: 'Infrequently Performed'
};
const REMEDY_LABELS: Record<keyof SuggestedRemedies, string> = {
  newProcedure: 'New Procedure', reviseExisting: 'Revise Existing',
  differentEquipment: 'Different Equipment', engineeringControls: 'Engineering Controls',
  retraining: 'Retraining', improvedPPE: 'Improved PPE', placementOfWorker: 'Placement of Worker'
};

// =============== API FUNCTIONS ===============
async function getPTOReports(params?: Record<string, string>): Promise<PTOReport[]> {
  try {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await safetyFetch<PTOReport[]>(`/api/pto/${qs}`);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
async function createPTOReport(report: Partial<PTOReport>): Promise<PTOReport> {
  return safetyFetch<PTOReport>('/api/pto/', { method: 'POST', body: JSON.stringify(report) });
}
async function updatePTOReport(id: string, report: Partial<PTOReport>): Promise<PTOReport> {
  return safetyFetch<PTOReport>(`/api/pto/${id}/`, { method: 'PATCH', body: JSON.stringify(report) });
}
async function deletePTOReport(id: string): Promise<void> {
  return safetyFetch<void>(`/api/pto/${id}/`, { method: 'DELETE' });
}

// =============== HELPERS ===============
const fmtDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return s; }
};
const fmtDateTime = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};

const newId = () => Math.random().toString(36).slice(2, 11);

const defaultForm = (): Partial<PTOReport> => ({
  date: new Date().toISOString().split('T')[0],
  observerName: '', section: 'Mechanical', deptSectionContractor: '',
  workerName: '', occupation: '', jobTaskObserved: '', sheqRefNo: '',
  observationType: 'Initial', timeOnJob: { months: '', years: '' },
  notification: { toldInAdvance: 'No' },
  reasons: { monthly: false, newEmployee: false, safetyAwareness: false, incidentFollowUp: false, trainingFollowUp: false, infrequentTask: false },
  procedures: { hasProcedure: 'No', familiarWithProcedure: 'No' },
  riskAssessment: { made: 'No', identified: 'No', effective: 'No' },
  suggestedRemedies: { newProcedure: 'No', reviseExisting: 'No', differentEquipment: 'No', engineeringControls: 'No', retraining: 'No', improvedPPE: 'No', placementOfWorker: 'No' },
  observationScope: 'All', followUpNeeded: 'No', actionPlan: [], status: 'draft',
});

// =============== CHIP ===============
const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: color + '22', color, border: `1px solid ${color}55` }}>{label}</span>
);

// =============== YES/NO ROW ===============
const YesNoRow: React.FC<{ label: string; value: YesNoType; onChange: (v: YesNoType) => void; name: string }> = ({ label, value, onChange, name }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
    <div style={{ display: 'flex', gap: 14 }}>
      {(['Yes', 'No'] as YesNoType[]).map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: opt === value ? (opt === 'Yes' ? '#34d399' : '#f87171') : 'rgba(255,255,255,0.45)', fontWeight: opt === value ? 700 : 400 }}>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)}
            style={{ accentColor: opt === 'Yes' ? '#34d399' : '#f87171', cursor: 'pointer' }} />
          {opt}
        </label>
      ))}
    </div>
  </div>
);

// =============== ACTION PLAN ITEM CARD ===============
const ActionPlanCard: React.FC<{ item: ActionPlanItem; index: number; onChange: (id: string, f: keyof ActionPlanItem, v: string) => void; onRemove: (id: string) => void }> = ({ item, index, onChange, onRemove }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '14px 14px 10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1 }}>Action #{index + 1}</span>
      <button type="button" onClick={() => onRemove(item.id)} title="Remove"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}>
        <Trash2 size={14} />
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label className={glassLabel}>Required Action *</label>
        <input className={glassInput} value={item.action} placeholder="Describe the required action..."
          onChange={e => onChange(item.id, 'action', e.target.value)} title="Action" />
      </div>
      <div>
        <label className={glassLabel}>By Whom *</label>
        <input className={glassInput} value={item.byWhom} placeholder="Responsible person"
          onChange={e => onChange(item.id, 'byWhom', e.target.value)} title="Responsible person" />
      </div>
      <div>
        <label className={glassLabel}>By When *</label>
        <input type="date" className={glassInput} value={item.byWhen} title="Due date" placeholder="Due date"
          onChange={e => onChange(item.id, 'byWhen', e.target.value)} />
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
        <textarea className={glassTextarea} style={{ minHeight: 44 }} value={item.remarks || ''} placeholder="Additional notes..."
          onChange={e => onChange(item.id, 'remarks', e.target.value)} title="Remarks" />
      </div>
    </div>
  </div>
);

// =============== PTO CARD (Grid) ===============
interface PTOCardProps {
  report: PTOReport; index: number;
  onView: (r: PTOReport) => void; onEdit: (r: PTOReport) => void; onDelete: (id: string) => void;
}
const PTOCard: React.FC<PTOCardProps> = ({ report, index, onView, onEdit, onDelete }) => {
  const SectionIcon = SECTION_ICONS[report.section];
  const sColor = SECTION_COLORS[report.section];
  const total = report.actionPlan?.length || 0;
  const done = report.actionPlan?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actionPlan?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hasRisk = report.riskAssessment.made === 'No' || report.riskAssessment.identified === 'No' || report.riskAssessment.effective === 'No';

  return (
    <div onClick={() => onView(report)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg,${sColor},${OBS_COLORS[report.observationType]})` }} />
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 7, borderRadius: 8, background: sColor + '22' }}>
              <SectionIcon size={16} style={{ color: sColor }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>PTO-{index + 1}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, maxWidth: 180, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{report.jobTaskObserved}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <Chip label={report.section} color={sColor} />
            <Chip label={report.observationType} color={OBS_COLORS[report.observationType]} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            { label: `Observer: ${report.observerName}` },
            { label: `Worker: ${report.workerName}` },
            { label: fmtDate(report.date) },
            { label: report.occupation || 'No occupation' },
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {item.label}
            </div>
          ))}
        </div>

        {hasRisk && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
            <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Risk Identified — Review Required</span>
          </div>
        )}

        {total > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              <span>Action Progress</span><span>{pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct === 100 ? '#10b981' : '#60a5fa' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Chip label={`${total - done - inProg} Pending`} color="#f59e0b" />
              <Chip label={`${inProg} Active`} color="#3b82f6" />
              <Chip label={`${done} Done`} color="#10b981" />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
          <Chip label={report.status.charAt(0).toUpperCase() + report.status.slice(1)} color={STATUS_COLORS[report.status]} />
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onView(report)} title="View"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye size={12} /> View
            </button>
            <button onClick={() => onEdit(report)} title="Edit"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#60a5fa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => onDelete(report.id)} title="Delete"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#f87171', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============== DETAIL MODAL ===============
const PTODetailModal: React.FC<{ report: PTOReport | null; open: boolean; onClose: () => void; onEdit: (r: PTOReport) => void; onDelete: (id: string) => void; onStatusChange: (id: string, s: ReportStatus) => void }> = ({ report, open, onClose, onEdit, onDelete, onStatusChange }) => {
  if (!report) return null;
  const SectionIcon = SECTION_ICONS[report.section];
  const sColor = SECTION_COLORS[report.section];
  const total = report.actionPlan?.length || 0;
  const done = report.actionPlan?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actionPlan?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hasRisk = report.riskAssessment.made === 'No' || report.riskAssessment.identified === 'No' || report.riskAssessment.effective === 'No';
  const infoStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' };

  const reasonsList = (Object.keys(report.reasons) as (keyof Reasons)[]).filter(k => report.reasons[k]).map(k => REASON_LABELS[k]);
  const remediesList = (Object.keys(report.suggestedRemedies) as (keyof SuggestedRemedies)[]).filter(k => report.suggestedRemedies[k] === 'Yes').map(k => REMEDY_LABELS[k]);

  return (
    <SafetyModal open={open} onClose={onClose} title="Planned Task Observation Report" width="max-w-2xl">
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: 7, borderRadius: 8, background: sColor + '22' }}>
            <SectionIcon size={16} style={{ color: sColor }} />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{report.section}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{report.observationType}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasRisk && <Chip label="Risk Identified" color="#ef4444" />}
          <select title="Change status" className={glassSelect} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
            value={report.status} onChange={e => onStatusChange(report.id, e.target.value as ReportStatus)}>
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
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Action Plan Progress</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{done}/{total} completed</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct === 100 ? '#10b981' : '#60a5fa' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip label={`${total - done - inProg} Pending`} color="#f59e0b" />
            <Chip label={`${inProg} In Progress`} color="#3b82f6" />
            <Chip label={`${done} Completed`} color="#10b981" />
          </div>
        </div>
      )}

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Observer', val: report.observerName },
          { label: 'Worker', val: report.workerName },
          { label: 'Date', val: fmtDate(report.date) },
          { label: 'Occupation', val: report.occupation || 'N/A' },
        ].map(({ label, val }) => (
          <div key={label} style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Task details */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Task Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ gridColumn: '1 / -1', ...infoStyle }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Job/Task Observed</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{report.jobTaskObserved}</div>
          </div>
          <div style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>SHEQ Reference</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{report.sheqRefNo || 'N/A'}</div>
          </div>
          <div style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Dept/Contractor</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{report.deptSectionContractor || 'N/A'}</div>
          </div>
          <div style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Time on Job</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{report.timeOnJob.months || '0'}m, {report.timeOnJob.years || '0'}y</div>
          </div>
          <div style={infoStyle}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Told in Advance</div>
            <Chip label={report.notification.toldInAdvance} color={report.notification.toldInAdvance === 'Yes' ? '#34d399' : '#f87171'} />
          </div>
        </div>
      </div>

      {/* Reasons */}
      {reasonsList.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Reasons for Observation</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {reasonsList.map((r, i) => <Chip key={i} label={r} color="#a78bfa" />)}
          </div>
        </div>
      )}

      {/* Procedures & Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <BookOpen size={12} /> Procedures
          </div>
          {[
            { label: 'Procedure Available', val: report.procedures.hasProcedure },
            { label: 'Employee Familiar', val: report.procedures.familiarWithProcedure },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              <Chip label={val} color={val === 'Yes' ? '#34d399' : '#f87171'} />
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldAlert size={12} /> Risk Assessment
          </div>
          {[
            { label: 'Assessment Made', val: report.riskAssessment.made },
            { label: 'Hazards Identified', val: report.riskAssessment.identified },
            { label: 'Controls Effective', val: report.riskAssessment.effective },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              <Chip label={val} color={val === 'Yes' ? '#34d399' : '#f87171'} />
            </div>
          ))}
        </div>
      </div>

      {/* Remedies */}
      {remediesList.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Suggested Remedies</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {remediesList.map((r, i) => <Chip key={i} label={r} color="#60a5fa" />)}
          </div>
        </div>
      )}

      {/* Scope & followup */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={infoStyle}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Observation Scope</div>
          <Chip label={report.observationScope} color={report.observationScope === 'All' ? '#34d399' : '#f59e0b'} />
        </div>
        <div style={infoStyle}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Follow-up Needed</div>
          <Chip label={report.followUpNeeded} color={report.followUpNeeded === 'Yes' ? '#f97316' : '#34d399'} />
        </div>
      </div>

      {/* Action plan */}
      {report.actionPlan?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Action Plan ({report.actionPlan.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.actionPlan.map((action, idx) => {
              const ac = ACTION_COLORS[action.status];
              return (
                <div key={action.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${ac}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Action #{idx + 1}</span>
                    <Chip label={action.status} color={ac} />
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>{action.action}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    <span>By: {action.byWhom}</span>
                    <span>Due: {fmtDate(action.byWhen)}</span>
                    {action.completedDate && <span>Completed: {fmtDate(action.completedDate)}</span>}
                  </div>
                  {action.remarks && <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', borderLeft: '2px solid #60a5fa', paddingLeft: 8 }}>{action.remarks}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }}
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Delete
        </button>
        <button type="button" onClick={onClose}
          style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.10)', background: 'none', cursor: 'pointer' }}>
          Close
        </button>
        <button type="button" onClick={() => { onClose(); onEdit(report); }}
          style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', background: '#3b82f6', border: 'none', cursor: 'pointer' }}>
          Edit
        </button>
      </div>
    </SafetyModal>
  );
};

// =============== FORM MODAL ===============
const PTOFormModal: React.FC<{ open: boolean; editing: PTOReport | null; onClose: () => void; onSave: (data: Partial<PTOReport>) => Promise<void>; saving: boolean }> = ({ open, editing, onClose, onSave, saving }) => {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Partial<PTOReport>>(defaultForm());

  useEffect(() => {
    if (open) { setForm(editing ? { ...editing } : defaultForm()); setTab(0); }
  }, [open, editing]);

  const set = (field: keyof PTOReport, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));

  const addAction = () => setForm(prev => ({
    ...prev,
    actionPlan: [...(prev.actionPlan || []), { id: newId(), no: (prev.actionPlan?.length || 0) + 1, action: '', byWhom: '', byWhen: '', status: 'Pending' }],
  }));

  const updateAction = (id: string, field: keyof ActionPlanItem, val: string) =>
    setForm(prev => ({ ...prev, actionPlan: prev.actionPlan?.map(a => a.id === id ? { ...a, [field]: val } : a) || [] }));

  const removeAction = (id: string) =>
    setForm(prev => ({ ...prev, actionPlan: prev.actionPlan?.filter(a => a.id !== id) || [] }));

  const handleSubmit = async () => {
    if (!form.observerName?.trim()) { toast.error('Observer name is required'); setTab(0); return; }
    if (!form.workerName?.trim()) { toast.error('Worker name is required'); setTab(0); return; }
    if (!form.jobTaskObserved?.trim()) { toast.error('Job/Task observed is required'); setTab(0); return; }
    if (!form.date) { toast.error('Date is required'); setTab(0); return; }
    await onSave(form);
  };

  const tabs = ['Basic Info', 'Reasons & Procedures', 'Risk Assessment', 'Action Plan'];

  const checkStyle: React.CSSProperties = { accentColor: '#60a5fa', cursor: 'pointer', width: 15, height: 15 };
  const checkLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.75)', padding: '6px 0' };

  return (
    <SafetyModal open={open} onClose={onClose}
      title={editing ? 'Edit PTO Report' : 'New Planned Task Observation'}
      width="max-w-2xl">
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Date *">
            <input type="date" className={glassInput} value={form.date || ''} title="Date" placeholder="Date"
              onChange={e => set('date', e.target.value)} />
          </FormField>
          <FormField label="Observer Name *">
            <input className={glassInput} value={form.observerName || ''} placeholder="Observer's full name"
              onChange={e => set('observerName', e.target.value)} title="Observer name" />
          </FormField>
          <FormField label="Section *">
            <select className={glassSelect} value={form.section || 'Mechanical'} title="Section"
              onChange={e => set('section', e.target.value as SectionType)}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Dept / Contractor">
            <input className={glassInput} value={form.deptSectionContractor || ''} placeholder="Department or contractor"
              onChange={e => set('deptSectionContractor', e.target.value)} title="Department or contractor" />
          </FormField>
          <FormField label="Worker Name *">
            <input className={glassInput} value={form.workerName || ''} placeholder="Worker's full name"
              onChange={e => set('workerName', e.target.value)} title="Worker name" />
          </FormField>
          <FormField label="Occupation">
            <input className={glassInput} value={form.occupation || ''} placeholder="Job title / occupation"
              onChange={e => set('occupation', e.target.value)} title="Occupation" />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Job / Task Observed *">
              <input className={glassInput} value={form.jobTaskObserved || ''} placeholder="Describe the task being observed"
                onChange={e => set('jobTaskObserved', e.target.value)} title="Job/task observed" />
            </FormField>
          </div>
          <FormField label="SHEQ Reference No.">
            <input className={glassInput} value={form.sheqRefNo || ''} placeholder="e.g., SHEQ-001"
              onChange={e => set('sheqRefNo', e.target.value)} title="SHEQ reference number" />
          </FormField>
          <FormField label="Observation Type">
            <select className={glassSelect} value={form.observationType || 'Initial'} title="Observation type"
              onChange={e => set('observationType', e.target.value as ObservationType)}>
              <option value="Initial">Initial</option>
              <option value="Follow up">Follow up</option>
            </select>
          </FormField>
          <FormField label="Time on Job (Months)">
            <input className={glassInput} value={form.timeOnJob?.months || ''} placeholder="0"
              onChange={e => set('timeOnJob', { ...form.timeOnJob, months: e.target.value })} title="Months on job" />
          </FormField>
          <FormField label="Time on Job (Years)">
            <input className={glassInput} value={form.timeOnJob?.years || ''} placeholder="0"
              onChange={e => set('timeOnJob', { ...form.timeOnJob, years: e.target.value })} title="Years on job" />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <YesNoRow label="Was the worker told in advance?" value={form.notification?.toldInAdvance || 'No'} name="toldInAdvance"
              onChange={v => set('notification', { toldInAdvance: v })} />
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reasons for Observation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {(Object.keys(REASON_LABELS) as (keyof Reasons)[]).map(key => (
                <label key={key} style={checkLabelStyle}>
                  <input type="checkbox" style={checkStyle} checked={form.reasons?.[key] || false}
                    onChange={e => set('reasons', { ...form.reasons, [key]: e.target.checked })} />
                  {REASON_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>SHEQ Work Procedure</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <YesNoRow label="Is a SHEQ work procedure available?" value={form.procedures?.hasProcedure || 'No'} name="hasProcedure"
                onChange={v => set('procedures', { ...form.procedures, hasProcedure: v })} />
              <YesNoRow label="Is the employee familiar with the procedure?" value={form.procedures?.familiarWithProcedure || 'No'} name="familiarWithProcedure"
                onChange={v => set('procedures', { ...form.procedures, familiarWithProcedure: v })} />
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested Remedies</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {(Object.keys(REMEDY_LABELS) as (keyof SuggestedRemedies)[]).map(key => (
                <label key={key} style={checkLabelStyle}>
                  <input type="checkbox" style={checkStyle} checked={form.suggestedRemedies?.[key] === 'Yes'}
                    onChange={e => set('suggestedRemedies', { ...form.suggestedRemedies, [key]: e.target.checked ? 'Yes' : 'No' })} />
                  {REMEDY_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Risk Assessment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <YesNoRow label="Has a risk assessment been made?" value={form.riskAssessment?.made || 'No'} name="raMade"
                onChange={v => set('riskAssessment', { ...form.riskAssessment, made: v })} />
              <YesNoRow label="Have hazards/risks/controls been identified?" value={form.riskAssessment?.identified || 'No'} name="raIdentified"
                onChange={v => set('riskAssessment', { ...form.riskAssessment, identified: v })} />
              <YesNoRow label="Are the controls effective?" value={form.riskAssessment?.effective || 'No'} name="raEffective"
                onChange={v => set('riskAssessment', { ...form.riskAssessment, effective: v })} />
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Observation Scope & Follow-up</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Observation Scope</span>
                <div style={{ display: 'flex', gap: 14 }}>
                  {(['All', 'Partial'] as const).map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: form.observationScope === opt ? '#60a5fa' : 'rgba(255,255,255,0.45)', fontWeight: form.observationScope === opt ? 700 : 400 }}>
                      <input type="radio" name="scope" value={opt} checked={form.observationScope === opt}
                        onChange={() => set('observationScope', opt)} style={{ accentColor: '#60a5fa', cursor: 'pointer' }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <YesNoRow label="Is a follow-up observation needed?" value={form.followUpNeeded || 'No'} name="followUp"
                onChange={v => set('followUpNeeded', v)} />
            </div>
          </div>

          <FormField label="Report Status">
            <select className={glassSelect} value={form.status || 'draft'} title="Status"
              onChange={e => set('status', e.target.value as ReportStatus)}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="closed">Closed</option>
            </select>
          </FormField>
        </div>
      )}

      {tab === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Action Plan</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Define corrective or improvement actions.</div>
            </div>
            <button type="button" onClick={addAction}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.35)', borderRadius: 8, padding: '6px 12px', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Add Action
            </button>
          </div>
          {(form.actionPlan || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Target size={36} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13 }}>No actions defined yet.</div>
              <button type="button" onClick={addAction}
                style={{ marginTop: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>
                + Add First Action
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(form.actionPlan || []).map((item, idx) => (
                <ActionPlanCard key={item.id} item={item} index={idx} onChange={updateAction} onRemove={removeAction} />
              ))}
            </div>
          )}
        </div>
      )}

      <ModalActions onCancel={onClose} onSubmit={handleSubmit} submitting={saving}
        submitLabel={editing ? 'Update PTO' : 'Submit PTO'} />
    </SafetyModal>
  );
};

// =============== MAIN PAGE ===============
export default function CompletePTOFormPage() {
  const [reports, setReports] = useState<PTOReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [selectedReport, setSelectedReport] = useState<PTOReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PTOReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [obsTypeFilter, setObsTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPTOReports();
      setReports(data);
    } catch { toast.error('Failed to load PTO reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (form: Partial<PTOReport>) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePTOReport(editing.id, { ...form, updated_at: new Date().toISOString() });
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success('PTO report updated');
      } else {
        const created = await createPTOReport({ ...form, status: 'submitted', submitted_at: new Date().toISOString() });
        setReports(prev => [created, ...prev]);
        toast.success('PTO report submitted');
      }
      setFormOpen(false); setEditing(null);
    } catch { toast.error('Failed to save PTO report'); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: PTOReport) => { setEditing(r); setFormOpen(true); };

  const handleDelete = async (id: string) => {
    try {
      await deletePTOReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('PTO report deleted');
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete report'); }
  };

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    const prev = reports.find(r => r.id === id);
    if (!prev) return;
    setReports(ps => ps.map(r => r.id === id ? { ...r, status } : r));
    try {
      await updatePTOReport(id, { status });
      toast.success(`Status updated to ${status}`);
    } catch {
      setReports(ps => ps.map(r => r.id === id ? prev : r));
      toast.error('Failed to update status');
    }
  };

  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setObsTypeFilter('all'); setDateFrom(''); setDateTo(''); };

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (![r.observerName, r.workerName, r.jobTaskObserved, r.occupation].some(s => s?.toLowerCase().includes(q))
          && !r.actionPlan?.some(a => a.action?.toLowerCase().includes(q))) return false;
      }
      if (sectionFilter !== 'all' && r.section !== sectionFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (obsTypeFilter !== 'all' && r.observationType !== obsTypeFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [reports, search, sectionFilter, statusFilter, obsTypeFilter, dateFrom, dateTo]);

  const total = reports.length;
  const drafts = reports.filter(r => r.status === 'draft').length;
  const submitted = reports.filter(r => r.status === 'submitted').length;
  const reviewed = reports.filter(r => r.status === 'reviewed').length;
  const closed = reports.filter(r => r.status === 'closed').length;
  const totalActions = reports.reduce((acc, r) => acc + (r.actionPlan?.length || 0), 0);
  const completedActions = reports.reduce((acc, r) => acc + (r.actionPlan?.filter(a => a.status === 'Completed').length || 0), 0);
  const highRisk = reports.filter(r => r.riskAssessment.made === 'No' || r.riskAssessment.identified === 'No' || r.riskAssessment.effective === 'No').length;

  const hasFilters = search || sectionFilter !== 'all' || statusFilter !== 'all' || obsTypeFilter !== 'all' || dateFrom || dateTo;

  const heroStats = [
    { label: 'Total', value: total, icon: <ClipboardList size={16} />, color: '#60a5fa' },
    { label: 'Draft', value: drafts, icon: <FileText size={16} />, color: '#6b7280' },
    { label: 'Submitted', value: submitted, icon: <Send size={16} />, color: '#3b82f6' },
    { label: 'Reviewed', value: reviewed, icon: <CheckCircle size={16} />, color: '#a78bfa' },
    { label: 'Closed', value: closed, icon: <CheckSquare size={16} />, color: '#10b981' },
    { label: 'Actions', value: totalActions, icon: <Target size={16} />, color: '#f59e0b' },
    { label: 'Completed', value: completedActions, icon: <CheckCircle size={16} />, color: '#34d399' },
    { label: 'High Risk', value: highRisk, icon: <AlertTriangle size={16} />, color: '#ef4444' },
  ];

  const tableColumns = ['Date', 'Observer', 'Worker', 'Task', 'Section', 'Type', 'Status', 'Risk', 'Actions'];
  const tableRows = filtered.map(r => ({
    id: r.id,
    cells: [
      fmtDate(r.date), r.observerName, r.workerName,
      r.jobTaskObserved.slice(0, 30) + (r.jobTaskObserved.length > 30 ? '…' : ''),
      r.section, r.observationType,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      (r.riskAssessment.made === 'No' || r.riskAssessment.identified === 'No' || r.riskAssessment.effective === 'No') ? '⚠ High' : '—',
    ],
  }));

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">

        <SafetyHero
          breadcrumb={[{ label: 'Home' }, { label: 'PTO' }]}
          title="Planned Task Observation"
          subtitle="Complete PTO forms with risk assessment and action tracking."
          accent="#60a5fa"
          stats={heroStats}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={loadData} title="Refresh"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setViewMode('grid')} title="Grid view"
                style={{ background: viewMode === 'grid' ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${viewMode === 'grid' ? '#60a5fa' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: viewMode === 'grid' ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setViewMode('table')} title="Table view"
                style={{ background: viewMode === 'table' ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${viewMode === 'table' ? '#60a5fa' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: viewMode === 'table' ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}>
                <TableIcon size={15} />
              </button>
              <AddButton label="New PTO" onClick={() => { setEditing(null); setFormOpen(true); }} color="#60a5fa" />
            </div>
          }
        />

        <SafetyControls
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search by observer, worker, task..."
          filters={
            <>
              <FilterPills label="Section" value={sectionFilter} onChange={setSectionFilter}
                pills={[{ label: 'All', value: 'all' }, { label: 'Mechanical', value: 'Mechanical' }, { label: 'Electrical', value: 'Electrical' }]} />
              <FilterPills label="Status" value={statusFilter} onChange={setStatusFilter}
                pills={[{ label: 'All', value: 'all' }, { label: 'Draft', value: 'draft' }, { label: 'Submitted', value: 'submitted' }, { label: 'Reviewed', value: 'reviewed' }, { label: 'Closed', value: 'closed' }]} />
              <FilterPills label="Type" value={obsTypeFilter} onChange={setObsTypeFilter}
                pills={[{ label: 'All', value: 'all' }, { label: 'Initial', value: 'Initial' }, { label: 'Follow up', value: 'Follow up' }]} />
              <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
              {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
            </>
          }
          resultCount={filtered.length}
          totalCount={total}
        />

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="No PTO reports found"
            message={total === 0 ? 'Start by creating your first Planned Task Observation.' : 'Try adjusting your filters.'}
            action={total === 0
              ? <AddButton label="Create First PTO" onClick={() => { setEditing(null); setFormOpen(true); }} color="#60a5fa" />
              : <ClearFiltersButton onClick={clearFilters} />}
          />
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((r, i) => (
              <PTOCard key={r.id} report={r} index={i}
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

        <PTODetailModal
          report={selectedReport}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedReport(null); }}
          onEdit={r => { setDetailOpen(false); handleEdit(r); }}
          onDelete={id => { setDetailOpen(false); setDeleteTarget(id); }}
          onStatusChange={handleStatusChange}
        />

        <PTOFormModal
          open={formOpen}
          editing={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />

        <SafetyModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
          title="Confirm Deletion" width="max-w-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
            Are you sure you want to delete this PTO report?
          </div>
          <ModalActions onCancel={() => setDeleteTarget(null)}
            onSubmit={() => deleteTarget && handleDelete(deleteTarget)}
            submitLabel="Delete" />
        </SafetyModal>

      </main>
    </PageShell>
  );
}
