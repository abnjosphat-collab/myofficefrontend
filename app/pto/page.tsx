'use client';

import React, { useState, useEffect, useMemo, ElementType } from "react";
import { api } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';
import {
  ClipboardList, Target, Plus, Trash2, AlertTriangle,
  Eye, Pencil, LayoutGrid, Table as TableIcon,
  RefreshCw, Wrench, Zap, ShieldAlert, BookOpen, Search, X,
} from "@/components/shared/theme";
import { AppShell } from '@/components/app-shell';
import { toast } from "sonner";
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, FormField, FormActions,
  useCollapseSection, CenterModal, ACCENT_HEX, EmptyState, PrimaryButton, GlowCard, SelectField,
} from '@/components/shared/theme';

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
const SECTION_ICONS: Record<SectionType, ElementType> = { Mechanical: Wrench, Electrical: Zap };
const OBS_COLORS: Record<ObservationType, string> = { Initial: '#a78bfa', 'Follow up': '#f97316' };
const STATUS_COLORS: Record<ReportStatus, string> = {
  draft: '#94a3b8', submitted: '#3b82f6', reviewed: '#a78bfa', closed: '#10b981'
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
// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no PTO reports yet".
async function getPTOReports(): Promise<PTOReport[]> {
  const data = await api.get<PTOReport[]>('/api/pto/');
  return Array.isArray(data) ? data : [];
}
async function createPTOReport(report: Partial<PTOReport>): Promise<PTOReport> {
  return api.post<PTOReport>('/api/pto/', report);
}
async function updatePTOReport(id: string, report: Partial<PTOReport>): Promise<PTOReport> {
  return api.patch<PTOReport>(`/api/pto/${id}/`, report);
}
async function deletePTOReport(id: string): Promise<void> {
  return api.delete<void>(`/api/pto/${id}/`);
}

// =============== HELPERS ===============
const fmtDate = (s: string) => (s ? formatDate(s) : '');

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

// =============== YES/NO ROW ===============
function YesNoRow({ label, value, onChange, name }: { label: string; value: YesNoType; onChange: (v: YesNoType) => void; name: string }) {
  const t = useTheme();
  return (
    <div className={`flex justify-between items-center px-3 py-2.5 rounded-lg ${t.chipBg}`}>
      <span className={`text-sm ${t.textMuted}`}>{label}</span>
      <div className="flex gap-3.5">
        {(['Yes', 'No'] as YesNoType[]).map(opt => (
          <label key={opt} className={`flex items-center gap-1.5 cursor-pointer text-sm ${opt === value ? (opt === 'Yes' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold') : t.textFaint}`}>
            <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)}
              className="cursor-pointer" style={{ accentColor: opt === 'Yes' ? '#34d399' : '#f87171' }} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

// =============== ACTION PLAN ITEM CARD ===============
function ActionPlanCard({ item, index, onChange, onRemove }: { item: ActionPlanItem; index: number; onChange: (id: string, f: keyof ActionPlanItem, v: string) => void; onRemove: (id: string) => void }) {
  const t = useTheme();
  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  return (
    <div className={`${t.chipBg} rounded-xl p-3.5`}>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wide">Action #{index + 1}</span>
        <button type="button" onClick={() => onRemove(item.id)} title="Remove" className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><FormField label="Required Action *"><input className={inputCls} value={item.action} placeholder="Describe the required action..." onChange={e => onChange(item.id, 'action', e.target.value)} title="Action" /></FormField></div>
        <FormField label="By Whom *"><input className={inputCls} value={item.byWhom} placeholder="Responsible person" onChange={e => onChange(item.id, 'byWhom', e.target.value)} title="Responsible person" /></FormField>
        <FormField label="By When *"><input type="date" className={inputCls} value={item.byWhen} title="Due date" onChange={e => onChange(item.id, 'byWhen', e.target.value)} /></FormField>
        <FormField label="Status">
          <SelectField size="form" value={item.status} title="Status" onChange={v => onChange(item.id, 'status', v as ActionStatus)}
            options={[{ value: 'Pending', label: 'Pending' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }]} />
        </FormField>
        {item.status === 'Completed' && (
          <FormField label="Completed Date"><input type="date" className={inputCls} value={item.completedDate || ''} title="Completed date" onChange={e => onChange(item.id, 'completedDate', e.target.value)} /></FormField>
        )}
        <div className="col-span-2">
          <FormField label="Remarks (Optional)">
            <textarea className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none ${t.inputBg}`} style={{ minHeight: 44 }} value={item.remarks || ''} placeholder="Additional notes..." onChange={e => onChange(item.id, 'remarks', e.target.value)} title="Remarks" />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// =============== PTO CARD (Grid) ===============
interface PTOCardProps { report: PTOReport; index: number; onView: (r: PTOReport) => void; onEdit: (r: PTOReport) => void; onDelete: (id: string) => void; }
function PTOCard({ report, index, onView, onEdit, onDelete }: PTOCardProps) {
  const t = useTheme();
  const SectionIcon = SECTION_ICONS[report.section];
  const sColor = SECTION_COLORS[report.section];
  const total = report.actionPlan?.length || 0;
  const done = report.actionPlan?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actionPlan?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hasRisk = report.riskAssessment.made === 'No' || report.riskAssessment.identified === 'No' || report.riskAssessment.effective === 'No';

  return (
    <GlowCard onClick={() => onView(report)} color={sColor} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-2.5">
            <SectionIcon className="h-5 w-5 shrink-0" style={{ color: sColor }} />
            <div>
              <div className={`text-[11px] mb-0.5 ${t.textFaint}`}>PTO-{index + 1}</div>
              <div className={`font-bold text-sm leading-tight max-w-[180px] truncate ${t.textPrimary}`}>{report.jobTaskObserved}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <StatusBadge color={sColor} label={report.section} />
            <StatusBadge color={OBS_COLORS[report.observationType]} label={report.observationType} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {[`Observer: ${report.observerName}`, `Worker: ${report.workerName}`, fmtDate(report.date), report.occupation || 'No occupation'].map((label, i) => (
            <div key={i} className={`text-[11px] px-2 py-1 rounded ${t.chipBg} ${t.textFaint} truncate`}>{label}</div>
          ))}
        </div>

        {hasRisk && (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-lg px-2.5 py-1.5 mb-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
            <span className="text-[11px] text-red-400 font-semibold">Risk Identified — Review Required</span>
          </div>
        )}

        {total > 0 && (
          <div className="mb-2.5">
            <div className={`flex justify-between text-[10px] mb-1 ${t.textFaint}`}><span>Action Progress</span><span>{pct}%</span></div>
            <ProgressBar value={pct} color={pct === 100 ? '#10b981' : '#60a5fa'} showValue={false} />
            <div className="flex gap-1.5 mt-1.5">
              <StatusBadge color="#f59e0b" label={`${total - done - inProg} Pending`} />
              <StatusBadge color="#3b82f6" label={`${inProg} Active`} />
              <StatusBadge color="#10b981" label={`${done} Done`} />
            </div>
          </div>
        )}

        <div className={`flex justify-between items-center border-t ${t.border} pt-2.5`}>
          <StatusBadge color={STATUS_COLORS[report.status]} label={report.status.charAt(0).toUpperCase() + report.status.slice(1)} />
          <div onClick={e => e.stopPropagation()} className="flex gap-1.5">
            <button type="button" onClick={() => onView(report)} title="View" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors ${t.textFaint}`}><Eye className="h-3 w-3" /> View</button>
            <button type="button" onClick={() => onEdit(report)} title="Edit" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors text-brand-400`}><Pencil className="h-3 w-3" /> Edit</button>
            <button type="button" onClick={() => onDelete(report.id)} title="Delete" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors text-red-400`}><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

// =============== DETAIL MODAL ===============
function PTODetailModal({ report, open, onClose, onEdit, onDelete, onStatusChange }: { report: PTOReport | null; open: boolean; onClose: () => void; onEdit: (r: PTOReport) => void; onDelete: (id: string) => void; onStatusChange: (id: string, s: ReportStatus) => void }) {
  const t = useTheme();
  if (!report) return null;
  const SectionIcon = SECTION_ICONS[report.section];
  const sColor = SECTION_COLORS[report.section];
  const total = report.actionPlan?.length || 0;
  const done = report.actionPlan?.filter(a => a.status === 'Completed').length || 0;
  const inProg = report.actionPlan?.filter(a => a.status === 'In Progress').length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hasRisk = report.riskAssessment.made === 'No' || report.riskAssessment.identified === 'No' || report.riskAssessment.effective === 'No';

  const reasonsList = (Object.keys(report.reasons) as (keyof Reasons)[]).filter(k => report.reasons[k]).map(k => REASON_LABELS[k]);
  const remediesList = (Object.keys(report.suggestedRemedies) as (keyof SuggestedRemedies)[]).filter(k => report.suggestedRemedies[k] === 'Yes').map(k => REMEDY_LABELS[k]);

  const infoBox = `${t.chipBg} rounded-lg px-3 py-2`;

  return (
    <CenterModal open={open} onClose={onClose} title="Planned Task Observation Report" accent="violet" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className={`flex justify-between items-center ${t.chipBg} rounded-xl px-3.5 py-2.5`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: `${sColor}22` }}><SectionIcon className="h-4 w-4" style={{ color: sColor }} /></div>
            <div><span className={`font-bold ${t.textPrimary}`}>{report.section}</span><span className={`text-[11px] ml-2 ${t.textFaint}`}>{report.observationType}</span></div>
          </div>
          <div className="flex gap-2 items-center">
            {hasRisk && <StatusBadge color="#ef4444" label="Risk Identified" />}
            <SelectField size="filter" title="Change status"
              value={report.status} onChange={v => onStatusChange(report.id, v as ReportStatus)}
              options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
          </div>
        </div>

        {total > 0 && (
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className="flex justify-between text-xs mb-1.5"><span className={t.textFaint}>Action Plan Progress</span><span className={`font-semibold ${t.textPrimary}`}>{done}/{total} completed</span></div>
            <ProgressBar value={pct} color={pct === 100 ? '#10b981' : '#60a5fa'} showValue={false} />
            <div className="flex gap-2 mt-2">
              <StatusBadge color="#f59e0b" label={`${total - done - inProg} Pending`} />
              <StatusBadge color="#3b82f6" label={`${inProg} In Progress`} />
              <StatusBadge color="#10b981" label={`${done} Completed`} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[{ label: 'Observer', val: report.observerName }, { label: 'Worker', val: report.workerName }, { label: 'Date', val: fmtDate(report.date) }, { label: 'Occupation', val: report.occupation || 'N/A' }].map(({ label, val }) => (
            <div key={label} className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>{label}</div><div className={`text-sm font-semibold ${t.textPrimary}`}>{val}</div></div>
          ))}
        </div>

        <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
          <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Task Details</div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`col-span-2 ${infoBox}`}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>Job/Task Observed</div><div className={`text-sm ${t.textMuted}`}>{report.jobTaskObserved}</div></div>
            <div className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>SHEQ Reference</div><div className={`text-sm ${t.textMuted}`}>{report.sheqRefNo || 'N/A'}</div></div>
            <div className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>Dept/Contractor</div><div className={`text-sm ${t.textMuted}`}>{report.deptSectionContractor || 'N/A'}</div></div>
            <div className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>Time on Job</div><div className={`text-sm ${t.textMuted}`}>{report.timeOnJob.months || '0'}m, {report.timeOnJob.years || '0'}y</div></div>
            <div className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>Told in Advance</div><StatusBadge color={report.notification.toldInAdvance === 'Yes' ? '#34d399' : '#f87171'} label={report.notification.toldInAdvance} /></div>
          </div>
        </div>

        {reasonsList.length > 0 && (
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2 ${t.textFaint}`}>Reasons for Observation</div>
            <div className="flex flex-wrap gap-1.5">{reasonsList.map((r, i) => <StatusBadge key={i} color="#a78bfa" label={r} />)}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5 ${t.textFaint}`}><BookOpen className="h-3 w-3" /> Procedures</div>
            {[{ label: 'Procedure Available', val: report.procedures.hasProcedure }, { label: 'Employee Familiar', val: report.procedures.familiarWithProcedure }].map(({ label, val }) => (
              <div key={label} className={`flex justify-between items-center py-1.5 border-b ${t.border} last:border-0`}><span className={`text-xs ${t.textFaint}`}>{label}</span><StatusBadge color={val === 'Yes' ? '#34d399' : '#f87171'} label={val} /></div>
            ))}
          </div>
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5 ${t.textFaint}`}><ShieldAlert className="h-3 w-3" /> Risk Assessment</div>
            {[{ label: 'Assessment Made', val: report.riskAssessment.made }, { label: 'Hazards Identified', val: report.riskAssessment.identified }, { label: 'Controls Effective', val: report.riskAssessment.effective }].map(({ label, val }) => (
              <div key={label} className={`flex justify-between items-center py-1.5 border-b ${t.border} last:border-0`}><span className={`text-xs ${t.textFaint}`}>{label}</span><StatusBadge color={val === 'Yes' ? '#34d399' : '#f87171'} label={val} /></div>
            ))}
          </div>
        </div>

        {remediesList.length > 0 && (
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2 ${t.textFaint}`}>Suggested Remedies</div>
            <div className="flex flex-wrap gap-1.5">{remediesList.map((r, i) => <StatusBadge key={i} color="#60a5fa" label={r} />)}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className={infoBox}><div className={`text-[10px] mb-1 ${t.textFaint}`}>Observation Scope</div><StatusBadge color={report.observationScope === 'All' ? '#34d399' : '#f59e0b'} label={report.observationScope} /></div>
          <div className={infoBox}><div className={`text-[10px] mb-1 ${t.textFaint}`}>Follow-up Needed</div><StatusBadge color={report.followUpNeeded === 'Yes' ? '#f97316' : '#34d399'} label={report.followUpNeeded} /></div>
        </div>

        {report.actionPlan?.length > 0 && (
          <div>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Action Plan ({report.actionPlan.length})</div>
            <div className="flex flex-col gap-2">
              {report.actionPlan.map((action, idx) => {
                const ac = ACTION_COLORS[action.status];
                return (
                  <div key={action.id} className={`${t.chipBg} rounded-lg px-3 py-2.5`} style={{ borderLeft: `3px solid ${ac}` }}>
                    <div className="flex justify-between mb-1.5"><span className={`text-[11px] ${t.textFaint}`}>Action #{idx + 1}</span><StatusBadge color={ac} label={action.status} /></div>
                    <div className={`text-sm mb-1.5 ${t.textMuted}`}>{action.action}</div>
                    <div className={`flex gap-4 text-[11px] ${t.textFaint}`}>
                      <span>By: {action.byWhom}</span><span>Due: {fmtDate(action.byWhen)}</span>
                      {action.completedDate && <span>Completed: {fmtDate(action.completedDate)}</span>}
                    </div>
                    {action.remarks && <div className={`mt-1.5 text-xs italic ${t.textFaint} border-l-2 border-brand-400 pl-2`}>{action.remarks}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }} className="bg-red-500/15 hover:bg-red-500/25 rounded-xl px-4 py-2.5 text-red-400 text-sm font-semibold transition-colors">Delete</button>
        <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Close</button>
        <PrimaryButton size="md" fullWidth onClick={() => { onClose(); onEdit(report); }}>Edit</PrimaryButton>
      </div>
    </CenterModal>
  );
}

// =============== FORM MODAL ===============
function PTOFormModal({ open, editing, onClose, onSave, saving }: { open: boolean; editing: PTOReport | null; onClose: () => void; onSave: (data: Partial<PTOReport>) => Promise<void>; saving: boolean }) {
  const t = useTheme();
  const [tab, setTab] = useState<string>('basic');
  const [form, setForm] = useState<Partial<PTOReport>>(defaultForm());

  useEffect(() => {
    if (open) { setForm(editing ? { ...editing } : defaultForm()); setTab('basic'); }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.observerName?.trim()) { toast.error('Observer name is required'); setTab('basic'); return; }
    if (!form.workerName?.trim()) { toast.error('Worker name is required'); setTab('basic'); return; }
    if (!form.jobTaskObserved?.trim()) { toast.error('Job/Task observed is required'); setTab('basic'); return; }
    if (!form.date) { toast.error('Date is required'); setTab('basic'); return; }
    await onSave(form);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'reasons', label: 'Reasons & Procedures' },
    { id: 'risk', label: 'Risk Assessment' },
    { id: 'actions', label: 'Action Plan' },
  ];

  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const checkLabelCls = `flex items-center gap-2 cursor-pointer text-sm py-1.5 ${t.textMuted}`;

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? 'Edit PTO Report' : 'New Planned Task Observation'} accent="violet" width="max-w-2xl">
      <div className={`flex gap-1 px-5 pt-4 border-b ${t.border} overflow-x-auto`}>
        {tabs.map(tb => (
          <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab === tb.id ? 'bg-brand-500/15 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
            {tb.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {tab === 'basic' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date *"><input type="date" className={inputCls} value={form.date || ''} title="Date" onChange={e => set('date', e.target.value)} /></FormField>
            <FormField label="Observer Name *"><input className={inputCls} value={form.observerName || ''} placeholder="Observer's full name" onChange={e => set('observerName', e.target.value)} title="Observer name" /></FormField>
            <FormField label="Section *">
              <SelectField size="form" value={form.section || 'Mechanical'} title="Section" onChange={v => set('section', v as SectionType)}
                options={SECTIONS.map(s => ({ value: s, label: s }))} />
            </FormField>
            <FormField label="Dept / Contractor"><input className={inputCls} value={form.deptSectionContractor || ''} placeholder="Department or contractor" onChange={e => set('deptSectionContractor', e.target.value)} title="Department or contractor" /></FormField>
            <FormField label="Worker Name *"><input className={inputCls} value={form.workerName || ''} placeholder="Worker's full name" onChange={e => set('workerName', e.target.value)} title="Worker name" /></FormField>
            <FormField label="Occupation"><input className={inputCls} value={form.occupation || ''} placeholder="Job title / occupation" onChange={e => set('occupation', e.target.value)} title="Occupation" /></FormField>
            <div className="col-span-2"><FormField label="Job / Task Observed *"><input className={inputCls} value={form.jobTaskObserved || ''} placeholder="Describe the task being observed" onChange={e => set('jobTaskObserved', e.target.value)} title="Job/task observed" /></FormField></div>
            <FormField label="SHEQ Reference No."><input className={inputCls} value={form.sheqRefNo || ''} placeholder="e.g., SHEQ-001" onChange={e => set('sheqRefNo', e.target.value)} title="SHEQ reference number" /></FormField>
            <FormField label="Observation Type">
              <SelectField size="form" value={form.observationType || 'Initial'} title="Observation type" onChange={v => set('observationType', v as ObservationType)}
                options={[{ value: 'Initial', label: 'Initial' }, { value: 'Follow up', label: 'Follow up' }]} />
            </FormField>
            <FormField label="Time on Job (Months)"><input className={inputCls} value={form.timeOnJob?.months || ''} placeholder="0" onChange={e => set('timeOnJob', { ...form.timeOnJob, months: e.target.value })} title="Months on job" /></FormField>
            <FormField label="Time on Job (Years)"><input className={inputCls} value={form.timeOnJob?.years || ''} placeholder="0" onChange={e => set('timeOnJob', { ...form.timeOnJob, years: e.target.value })} title="Years on job" /></FormField>
            <div className="col-span-2"><YesNoRow label="Was the worker told in advance?" value={form.notification?.toldInAdvance || 'No'} name="toldInAdvance" onChange={v => set('notification', { toldInAdvance: v })} /></div>
          </div>
        )}

        {tab === 'reasons' && (
          <div className="flex flex-col gap-5">
            <div>
              <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Reasons for Observation</div>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(REASON_LABELS) as (keyof Reasons)[]).map(key => (
                  <label key={key} className={checkLabelCls}>
                    <input type="checkbox" style={{ accentColor: '#60a5fa' }} className="cursor-pointer w-3.5 h-3.5" checked={form.reasons?.[key] || false} onChange={e => set('reasons', { ...form.reasons, [key]: e.target.checked })} />
                    {REASON_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>SHEQ Work Procedure</div>
              <div className="flex flex-col gap-1.5">
                <YesNoRow label="Is a SHEQ work procedure available?" value={form.procedures?.hasProcedure || 'No'} name="hasProcedure" onChange={v => set('procedures', { ...form.procedures, hasProcedure: v })} />
                <YesNoRow label="Is the employee familiar with the procedure?" value={form.procedures?.familiarWithProcedure || 'No'} name="familiarWithProcedure" onChange={v => set('procedures', { ...form.procedures, familiarWithProcedure: v })} />
              </div>
            </div>
            <div>
              <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Suggested Remedies</div>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(REMEDY_LABELS) as (keyof SuggestedRemedies)[]).map(key => (
                  <label key={key} className={checkLabelCls}>
                    <input type="checkbox" style={{ accentColor: '#60a5fa' }} className="cursor-pointer w-3.5 h-3.5" checked={form.suggestedRemedies?.[key] === 'Yes'} onChange={e => set('suggestedRemedies', { ...form.suggestedRemedies, [key]: e.target.checked ? 'Yes' : 'No' })} />
                    {REMEDY_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="flex flex-col gap-5">
            <div>
              <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Risk Assessment</div>
              <div className="flex flex-col gap-1.5">
                <YesNoRow label="Has a risk assessment been made?" value={form.riskAssessment?.made || 'No'} name="raMade" onChange={v => set('riskAssessment', { ...form.riskAssessment, made: v })} />
                <YesNoRow label="Have hazards/risks/controls been identified?" value={form.riskAssessment?.identified || 'No'} name="raIdentified" onChange={v => set('riskAssessment', { ...form.riskAssessment, identified: v })} />
                <YesNoRow label="Are the controls effective?" value={form.riskAssessment?.effective || 'No'} name="raEffective" onChange={v => set('riskAssessment', { ...form.riskAssessment, effective: v })} />
              </div>
            </div>
            <div>
              <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Observation Scope & Follow-up</div>
              <div className="flex flex-col gap-1.5">
                <div className={`flex justify-between items-center px-3 py-2.5 rounded-lg ${t.chipBg}`}>
                  <span className={`text-sm ${t.textMuted}`}>Observation Scope</span>
                  <div className="flex gap-3.5">
                    {(['All', 'Partial'] as const).map(opt => (
                      <label key={opt} className={`flex items-center gap-1.5 cursor-pointer text-sm ${form.observationScope === opt ? 'text-brand-400 font-bold' : t.textFaint}`}>
                        <input type="radio" name="scope" value={opt} checked={form.observationScope === opt} onChange={() => set('observationScope', opt)} style={{ accentColor: '#60a5fa' }} className="cursor-pointer" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <YesNoRow label="Is a follow-up observation needed?" value={form.followUpNeeded || 'No'} name="followUp" onChange={v => set('followUpNeeded', v)} />
              </div>
            </div>
            <FormField label="Report Status">
              <SelectField size="form" value={form.status || 'draft'} title="Status" onChange={v => set('status', v as ReportStatus)}
                options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
            </FormField>
          </div>
        )}

        {tab === 'actions' && (
          <div>
            <div className="flex justify-between items-center mb-3.5">
              <div><div className={`font-bold text-sm ${t.textPrimary}`}>Action Plan</div><div className={`text-[11px] mt-0.5 ${t.textFaint}`}>Define corrective or improvement actions.</div></div>
              <button type="button" onClick={addAction} className="flex items-center gap-1.5 bg-brand-500/15 hover:bg-brand-500/25 rounded-lg px-3 py-1.5 text-brand-400 text-sm font-semibold transition-colors"><Plus className="h-3.5 w-3.5" /> Add Action</button>
            </div>
            {(form.actionPlan || []).length === 0 ? (
              <div className={`text-center py-8 ${t.textFaint}`}>
                <Target className="h-9 w-9 mx-auto mb-2" />
                <div className="text-sm">No actions defined yet.</div>
                <button type="button" onClick={addAction} className={`mt-2.5 ${t.chipBg} ${t.hoverBg} rounded-lg px-3.5 py-1.5 text-xs transition-colors ${t.textMuted}`}>+ Add First Action</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {(form.actionPlan || []).map((item, idx) => (
                  <ActionPlanCard key={item.id} item={item} index={idx} onChange={updateAction} onRemove={removeAction} />
                ))}
              </div>
            )}
          </div>
        )}

        <FormActions onCancel={onClose} submitting={saving} submitLabel={editing ? 'Update PTO' : 'Submit PTO'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// =============== MAIN PAGE ===============
function PTOPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, records: true });
  const [reports, setReports] = useState<PTOReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
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
    try { setReports(await getPTOReports()); setLoadError(''); }
    catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load PTO reports.');
      toast.error('Failed to load PTO reports');
    }
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
    try { await updatePTOReport(id, { status }); toast.success(`Status updated to ${status}`); }
    catch { setReports(ps => ps.map(r => r.id === id ? prev : r)); toast.error('Failed to update status'); }
  };

  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setObsTypeFilter('all'); setDateFrom(''); setDateTo(''); };

  const filtered = useMemo(() => reports.filter(r => {
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
  }), [reports, search, sectionFilter, statusFilter, obsTypeFilter, dateFrom, dateTo]);

  const total = reports.length;
  const drafts = reports.filter(r => r.status === 'draft').length;
  const submitted = reports.filter(r => r.status === 'submitted').length;
  const reviewed = reports.filter(r => r.status === 'reviewed').length;
  const closed = reports.filter(r => r.status === 'closed').length;
  const totalActions = reports.reduce((acc, r) => acc + (r.actionPlan?.length || 0), 0);
  const completedActions = reports.reduce((acc, r) => acc + (r.actionPlan?.filter(a => a.status === 'Completed').length || 0), 0);
  const highRisk = reports.filter(r => r.riskAssessment.made === 'No' || r.riskAssessment.identified === 'No' || r.riskAssessment.effective === 'No').length;

  const hasFilters = !!(search || sectionFilter !== 'all' || statusFilter !== 'all' || obsTypeFilter !== 'all' || dateFrom || dateTo);

  const selCls = `h-8 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;
  const tdCls = `px-3 py-2.5 text-sm ${t.textMuted}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ClipboardList}
        accent="violet"
        crumbs={['Safety & Compliance', 'Planned Task Observation']}
        title="Planned Task Observation"
        description="Complete PTO forms with risk assessment and action tracking."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={loadData} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={() => setViewMode('grid')} title="Grid view" className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setViewMode('table')} title="Table view" className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'table' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><TableIcon className="h-3.5 w-3.5" /></button>
            <PrimaryButton icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New PTO</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          <StatTile icon={ClipboardList} color={ACCENT_HEX.blue} label="Total" value={total} />
          <StatTile icon={ClipboardList} color="#94a3b8" label="Draft" value={drafts} />
          <StatTile icon={ClipboardList} color="#3b82f6" label="Submitted" value={submitted} />
          <StatTile icon={ClipboardList} color="#a78bfa" label="Reviewed" value={reviewed} />
          <StatTile icon={ClipboardList} color="#10b981" label="Closed" value={closed} />
          <StatTile icon={Target} color="#f59e0b" label="Actions" value={totalActions} />
          <StatTile icon={Target} color="#34d399" label="Completed" value={completedActions} />
          <StatTile icon={AlertTriangle} color="#ef4444" label="High Risk" value={highRisk} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by observer, worker, task..." className="w-56" />
            <SelectField size="filter" title="Section" value={sectionFilter} onChange={setSectionFilter}
              options={[{ value: 'all', label: 'All Sections' }, { value: 'Mechanical', label: 'Mechanical' }, { value: 'Electrical', label: 'Electrical' }]} />
            <SelectField size="filter" title="Status" value={statusFilter} onChange={setStatusFilter}
              options={[{ value: 'all', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
            <SelectField size="filter" title="Type" value={obsTypeFilter} onChange={setObsTypeFilter}
              options={[{ value: 'all', label: 'All Types' }, { value: 'Initial', label: 'Initial' }, { value: 'Follow up', label: 'Follow up' }]} />
            <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
            <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
            {hasFilters && <button type="button" onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
            <span className={`text-[11px] ml-auto ${t.textFaint}`}>{filtered.length} of {total}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
        ) : loadError ? (
          // Don't invite a first PTO over data that merely failed to load.
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={ClipboardList} title="Could not load PTO reports" message={loadError}
              action={{ label: 'Try again', onClick: () => loadData() }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={ClipboardList} title="No PTO reports found"
              message={total === 0 ? 'Start by creating your first Planned Task Observation.' : 'Try adjusting your filters.'}
              action={{ label: total === 0 ? 'Create First PTO' : 'Clear Filters', onClick: total === 0 ? () => { setEditing(null); setFormOpen(true); } : clearFilters }} />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map((r, i) => (
              <PTOCard key={r.id} report={r} index={i} onView={rep => { setSelectedReport(rep); setDetailOpen(true); }} onEdit={handleEdit} onDelete={id => setDeleteTarget(id)} />
            ))}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Date</th><th className={thCls}>Observer</th><th className={thCls}>Worker</th><th className={thCls}>Task</th><th className={thCls}>Section</th><th className={thCls}>Type</th><th className={thCls}>Status</th><th className={thCls}>Risk</th><th className={thCls}></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const hasRisk = r.riskAssessment.made === 'No' || r.riskAssessment.identified === 'No' || r.riskAssessment.effective === 'No';
                    return (
                      <tr key={r.id} onClick={() => { setSelectedReport(r); setDetailOpen(true); }} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors cursor-pointer`}>
                        <td className={tdCls}>{fmtDate(r.date)}</td>
                        <td className={tdCls}>{r.observerName}</td>
                        <td className={tdCls}>{r.workerName}</td>
                        <td className={tdCls}>{r.jobTaskObserved.slice(0, 30)}{r.jobTaskObserved.length > 30 ? '…' : ''}</td>
                        <td className={tdCls}><StatusBadge color={SECTION_COLORS[r.section]} label={r.section} /></td>
                        <td className={tdCls}><StatusBadge color={OBS_COLORS[r.observationType]} label={r.observationType} /></td>
                        <td className={tdCls}><StatusBadge color={STATUS_COLORS[r.status]} label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} /></td>
                        <td className={tdCls}>{hasRisk ? <StatusBadge color="#ef4444" label="⚠ High" /> : <span className={t.textFaint}>—</span>}</td>
                        <td className={tdCls} onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <button type="button" title="Edit" onClick={() => handleEdit(r)} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}><Pencil className="h-3 w-3" /></button>
                            <button type="button" title="Delete" onClick={() => setDeleteTarget(r.id)} className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-400 transition-colors`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      <PTODetailModal
        report={selectedReport}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedReport(null); }}
        onEdit={r => { setDetailOpen(false); handleEdit(r); }}
        onDelete={id => { setDetailOpen(false); setDeleteTarget(id); }}
        onStatusChange={handleStatusChange}
      />

      <PTOFormModal open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} saving={saving} />

      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <div className={`flex items-center gap-3 text-sm ${t.textMuted}`}><AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" /> Are you sure you want to delete this PTO report?</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all">Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function CompletePTOFormPage() {
  return (
    <AppShell>
      <PTOPageContent />
    </AppShell>
  );
}
