'use client';

import { useState, useEffect, useMemo, ElementType } from "react";
import {
  Eye, Target, Plus, Trash2, AlertTriangle,
  LayoutGrid, Table as TableIcon, RefreshCw, HardHat, Zap,
  MessageSquare, PenTool, X,
} from "@/components/shared/theme";
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { summarizeActions } from '@/lib/actionPlan';
import { UnderlineTabs } from '@/components/shared/UnderlineTabs';
import { toast } from "sonner";
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ProgressBar, ACCENT_HEX, GlowCard, SelectField, accentText,
} from '@/components/shared/theme';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { EmployeeNameInput } from '@/components/shared/EmployeeNameInput';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type {
  SectionType, BehaviourCategory, ObservationType, CoachingTechnique, VFLStatus, ActionStatus,
  ActionItem, VFLReport,
} from './types';
import { useVFLData, createVFLReport, updateVFLReport, deleteVFLReport } from './useVFLData';

// =============== CONSTANTS ===============
const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = ['Safe Behaviour', 'Unsafe Behaviour'];
const OBSERVATION_TYPES: ObservationType[] = ['Safe Behaviour', 'Safe Condition', 'At Risk Behaviour', 'At Risk Condition'];
const COACHING_TECHNIQUES: CoachingTechnique[] = ['SBR', 'CC'];

const SECTION_HEX: Record<SectionType, string> = { Mechanical: '#3b82f6', Electrical: '#f59e0b' };
const SECTION_ICONS: Record<SectionType, ElementType> = { Mechanical: HardHat, Electrical: Zap };
const BEHAVIOUR_HEX: Record<BehaviourCategory, string> = { 'Safe Behaviour': '#10b981', 'Unsafe Behaviour': '#ef4444' };
const OBSERVATION_HEX: Record<ObservationType, string> = { 'Safe Behaviour': '#10b981', 'Safe Condition': '#34d399', 'At Risk Behaviour': '#f97316', 'At Risk Condition': '#ef4444' };
const COACHING_DESC: Record<CoachingTechnique, string> = { SBR: 'Situation, Behaviour, Result', CC: 'Coaching Conversation' };
const STATUS_HEX: Record<VFLStatus, string> = { draft: '#94a3b8', submitted: '#3b82f6', reviewed: '#a78bfa', closed: '#10b981' };
const ACTION_HEX: Record<ActionStatus, string> = { Pending: '#f59e0b', 'In Progress': '#3b82f6', Completed: '#10b981' };

// =============== HELPERS ===============
const fmtDate = (s: string) => (s ? formatDate(s) : '');
const fmtTime = (s: string) => { if (!s) return ''; try { return new Date(`2000-01-01T${s}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
const newId = () => Math.random().toString(36).slice(2, 11);

const defaultForm = (): Partial<VFLReport> => ({
  observerName: '', designation: '', sectionChoice: 'Mechanical', departmentSection: 'Engineering',
  date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  behaviourCategory: 'Safe Behaviour', observationType: 'Safe Behaviour', description: '',
  coachingTechnique: 'SBR', actions: [], status: 'draft',
});

// =============== ACTION ITEM CARD ===============
function ActionItemCard({ item, index, onChange, onRemove }: { item: ActionItem; index: number; onChange: (id: string, field: keyof ActionItem, value: string) => void; onRemove: (id: string) => void; }) {
  const t = useTheme();
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;
  return (
    <div className={`${t.chipBg} rounded-xl p-3.5`}>
      <div className="flex justify-between items-center mb-2.5">
        <span className={`text-[11px] font-bold ${accentText('emerald', t.light)} uppercase tracking-wide`}>Action #{index + 1}</span>
        <button type="button" onClick={() => onRemove(item.id)} title="Remove action" className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><FormField label="Action Description" required><input className={inputCls} value={item.action} placeholder="Describe the action..." onChange={e => onChange(item.id, 'action', e.target.value)} /></FormField></div>
        <FormField label="Responsible Person" required><input className={inputCls} value={item.responsible} placeholder="Full name" onChange={e => onChange(item.id, 'responsible', e.target.value)} /></FormField>
        <FormField label="Target Date" required><input type="date" className={inputCls} value={item.targetDate} title="Target date" onChange={e => onChange(item.id, 'targetDate', e.target.value)} /></FormField>
        <FormField label="Status">
          <SelectField size="form" value={item.status} title="Status" onChange={v => onChange(item.id, 'status', v as ActionStatus)}
            options={[{ value: 'Pending', label: 'Pending' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }]} />
        </FormField>
        {item.status === 'Completed' && <FormField label="Completed Date"><input type="date" className={inputCls} value={item.completedDate || ''} title="Completed date" onChange={e => onChange(item.id, 'completedDate', e.target.value)} /></FormField>}
        <div className="col-span-2"><FormField label="Remarks (Optional)"><textarea className={`${inputCls} resize-none`} style={{ minHeight: 48 }} value={item.remarks || ''} placeholder="Additional notes..." onChange={e => onChange(item.id, 'remarks', e.target.value)} /></FormField></div>
      </div>
    </div>
  );
}

// =============== VFL CARD (Grid) ===============
function VFLCard({ report, index, onView, onEdit, onDelete }: { report: VFLReport; index: number; onView: (r: VFLReport) => void; onEdit: (r: VFLReport) => void; onDelete: (id: string) => void; }) {
  const t = useTheme();
  // ?? fallback: an unrecognized sectionChoice value (legacy/malformed data)
  // otherwise makes SectionIcon undefined and crashes the page — same bug class
  // found and fixed on overtime.tsx's TypeBadge (2026-08-29 UI audit,
  // audit/07-ui-polish-findings.md).
  const SectionIcon = SECTION_ICONS[report.sectionChoice] ?? HardHat;
  const bColor = BEHAVIOUR_HEX[report.behaviourCategory];
  const sColor = SECTION_HEX[report.sectionChoice];
  const progress = summarizeActions(report.actions);

  return (
    <GlowCard onClick={() => onView(report)} color={sColor} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-2.5">
            <SectionIcon className="h-5 w-5 shrink-0" style={{ color: sColor }} />
            <div><div className={`text-[11px] mb-0.5 ${t.textFaint}`}>VFL #{index + 1}</div><div className={`font-bold text-[15px] ${t.textPrimary}`}>{report.observerName}</div></div>
          </div>
          <div className="flex flex-col gap-1 items-end"><StatusBadge color={sColor} label={report.sectionChoice} /><StatusBadge color={bColor} label={report.behaviourCategory} /></div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {[report.designation || 'No designation', fmtDate(report.date), fmtTime(report.time), report.observationType].map((label, i) => (
            <div key={i} className={`text-[11px] px-2 py-1 rounded ${t.chipBg} ${t.textFaint}`}>{label}</div>
          ))}
        </div>

        <div className={`text-xs mb-2.5 leading-relaxed line-clamp-2 ${t.textMuted}`}>{report.description || 'No description recorded.'}</div>

        {progress.total > 0 && (
          <div className="mb-2.5">
            <div className={`flex justify-between text-[10px] mb-1 ${t.textFaint}`}><span>Action Progress</span><span>{progress.pct}%</span></div>
            <ProgressBar value={progress.pct} color={progress.pct === 100 ? '#10b981' : '#3b82f6'} showValue={false} />
            <div className="flex gap-1.5 mt-1.5"><StatusBadge color="#f59e0b" label={`${progress.pending} Pending`} /><StatusBadge color="#3b82f6" label={`${progress.inProgress} In Progress`} /><StatusBadge color="#10b981" label={`${progress.completed} Done`} /></div>
          </div>
        )}

        <div className={`flex justify-between items-center border-t ${t.border} pt-2.5`}>
          <StatusBadge color="#a78bfa" label={`${report.coachingTechnique} — ${COACHING_DESC[report.coachingTechnique]}`} />
          <StatusBadge color={STATUS_HEX[report.status]} label={report.status.charAt(0).toUpperCase() + report.status.slice(1)} />
        </div>

        <div onClick={e => e.stopPropagation()} className="flex justify-end gap-1.5 mt-2.5">
          <button type="button" onClick={() => onView(report)} title="View" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors ${t.textFaint}`}><Eye className="h-3 w-3" /> View</button>
          <button type="button" onClick={() => onEdit(report)} title="Edit" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors text-brand-400`}><PenTool className="h-3 w-3" /> Edit</button>
          <button type="button" onClick={() => onDelete(report.id)} title="Delete" className={`${t.chipBg} ${t.hoverBg} rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-colors text-red-400`}><Trash2 className="h-3 w-3" /> Delete</button>
        </div>
      </div>
    </GlowCard>
  );
}

// =============== DETAIL MODAL ===============
function VFLDetailModal({ report, open, onClose, onEdit, onDelete, onStatusChange }: {
  report: VFLReport | null; open: boolean; onClose: () => void; onEdit: (r: VFLReport) => void; onDelete: (id: string) => void; onStatusChange: (id: string, status: VFLStatus) => void;
}) {
  const t = useTheme();
  if (!report) return null;
  // ?? fallback: an unrecognized sectionChoice value (legacy/malformed data)
  // otherwise makes SectionIcon undefined and crashes the page — same bug class
  // found and fixed on overtime.tsx's TypeBadge (2026-08-29 UI audit,
  // audit/07-ui-polish-findings.md).
  const SectionIcon = SECTION_ICONS[report.sectionChoice] ?? HardHat;
  const bColor = BEHAVIOUR_HEX[report.behaviourCategory];
  const sColor = SECTION_HEX[report.sectionChoice];
  const oColor = OBSERVATION_HEX[report.observationType];
  const progress = summarizeActions(report.actions);
  const infoBox = `${t.chipBg} rounded-lg px-3 py-2`;

  return (
    <CenterModal open={open} onClose={onClose} title="Visible Felt Leadership Observation" accent="emerald" width="max-w-2xl">
      <div className="px-5 py-4 space-y-4">
        <div className={`flex justify-between items-center ${t.chipBg} rounded-xl px-3.5 py-2.5`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: `${sColor}22` }}><SectionIcon className="h-4 w-4" style={{ color: sColor }} /></div>
            <span className={`font-semibold ${t.textPrimary}`}>{report.sectionChoice}</span>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge color={bColor} label={report.behaviourCategory} />
            <SelectField size="filter" title="Change status" value={report.status} onChange={v => onStatusChange(report.id, v as VFLStatus)}
              options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
          </div>
        </div>

        {progress.total > 0 && (
          <div className={`${t.chipBg} rounded-xl px-3.5 py-3`}>
            <div className="flex justify-between text-xs mb-1.5"><span className={t.textFaint}>Action Progress</span><span className={`font-semibold ${t.textPrimary}`}>{progress.completed}/{progress.total} completed</span></div>
            <ProgressBar value={progress.pct} color={progress.pct === 100 ? '#10b981' : '#3b82f6'} showValue={false} />
            <div className="flex gap-2 mt-2"><StatusBadge color="#f59e0b" label={`${progress.pending} Pending`} /><StatusBadge color="#3b82f6" label={`${progress.inProgress} In Progress`} /><StatusBadge color="#10b981" label={`${progress.completed} Completed`} /></div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[{ label: 'Observer', val: report.observerName }, { label: 'Designation', val: report.designation || 'N/A' }, { label: 'Date', val: fmtDate(report.date) }, { label: 'Time', val: fmtTime(report.time) }].map(({ label, val }) => (
            <div key={label} className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>{label}</div><div className={`text-sm font-semibold ${t.textPrimary}`}>{val}</div></div>
          ))}
        </div>

        {report.departmentSection && <div className={infoBox}><div className={`text-[10px] mb-0.5 ${t.textFaint}`}>Department/Section</div><div className={`text-sm ${t.textMuted}`}>{report.departmentSection}</div></div>}

        <div className={`${t.chipBg} rounded-xl px-3.5 py-3.5`}>
          <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Observation Details</div>
          <div className="flex gap-2 mb-2.5 flex-wrap"><StatusBadge color={oColor} label={report.observationType} /><StatusBadge color="#a78bfa" label={`${report.coachingTechnique} — ${COACHING_DESC[report.coachingTechnique]}`} /></div>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${t.textMuted}`}>{report.description}</div>
        </div>

        {report.actions && report.actions.length > 0 && (
          <div>
            <div className={`font-bold text-xs uppercase tracking-wide mb-2.5 ${t.textFaint}`}>Action Plan ({report.actions.length})</div>
            <div className="flex flex-col gap-2">
              {report.actions.map((action, idx) => {
                const ac = ACTION_HEX[action.status];
                return (
                  <div key={action.id} className={`${t.chipBg} rounded-lg px-3 py-2.5`} style={{ borderLeft: `3px solid ${ac}` }}>
                    <div className="flex justify-between mb-1.5"><span className={`text-[11px] ${t.textFaint}`}>Action #{idx + 1}</span><StatusBadge color={ac} label={action.status} /></div>
                    <div className={`text-sm mb-1.5 ${t.textMuted}`}>{action.action}</div>
                    <div className={`flex gap-4 text-[11px] ${t.textFaint}`}><span>By: {action.responsible}</span><span>Target: {fmtDate(action.targetDate)}</span>{action.completedDate && <span>Completed: {fmtDate(action.completedDate)}</span>}</div>
                    {action.remarks && <div className={`mt-1.5 text-xs italic ${t.textFaint} border-l-2 border-emerald-400 pl-2`}>{action.remarks}</div>}
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
        <button type="button" onClick={() => { onClose(); onEdit(report); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">Edit</button>
      </div>
    </CenterModal>
  );
}

// =============== FORM MODAL ===============
function VFLFormModal({ open, editing, onClose, onSave, saving }: { open: boolean; editing: VFLReport | null; onClose: () => void; onSave: (data: Partial<VFLReport>) => Promise<void>; saving: boolean; }) {
  const t = useTheme();
  const [tab, setTab] = useState<string>('observer');
  const [form, setForm] = useState<Partial<VFLReport>>(defaultForm());

  useEffect(() => { if (open) { setForm(editing ? { ...editing } : defaultForm()); setTab('observer'); } }, [open, editing]);

  const set = (field: keyof VFLReport, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));
  const addAction = () => setForm(prev => ({ ...prev, actions: [...(prev.actions || []), { id: newId(), action: '', responsible: '', targetDate: '', status: 'Pending' }] }));
  const updateAction = (id: string, field: keyof ActionItem, val: string) => setForm(prev => ({ ...prev, actions: prev.actions?.map(a => a.id === id ? { ...a, [field]: val } : a) || [] }));
  const removeAction = (id: string) => setForm(prev => ({ ...prev, actions: prev.actions?.filter(a => a.id !== id) || [] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.observerName?.trim()) { toast.error('Observer name is required'); setTab('observer'); return; }
    if (!form.date) { toast.error('Date is required'); setTab('observer'); return; }
    if (!form.time) { toast.error('Time is required'); setTab('observer'); return; }
    if (!form.description?.trim()) { toast.error('Description is required'); setTab('observation'); return; }
    await onSave(form);
  };

  const tabs = [{ id: 'observer', label: 'Observer Info' }, { id: 'observation', label: 'Observation' }, { id: 'actions', label: 'Action Plan' }];
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;
  const radioLabelCls = `flex items-center gap-1.5 text-sm cursor-pointer ${t.textMuted}`;

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? 'Edit VFL Observation' : 'New VFL Observation'} accent="emerald" width="max-w-2xl">
      <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} accent="emerald" />

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {tab === 'observer' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FormField label="Observer's Name" required><EmployeeNameInput value={form.observerName || ''} onChange={(name, emp) => { set('observerName', name); if (emp?.designation) set('designation', emp.designation); if (emp?.department) set('departmentSection', emp.department); }} placeholder="Select or type observer name…" /></FormField></div>
            <FormField label="Designation"><PredictiveInput historyKey="vfl_designation" value={form.designation || ''} onChange={v => set('designation', v)} placeholder="Job title" hints={['Safety Officer', 'Supervisor', 'Foreman', 'Engineer', 'Technician', 'SHEQ Manager', 'Shift Boss']} /></FormField>
            <FormField label="Section" required>
              <SelectField size="form" value={form.sectionChoice || 'Mechanical'} title="Section" onChange={v => set('sectionChoice', v as SectionType)}
                options={SECTIONS.map(s => ({ value: s, label: s }))} />
            </FormField>
            <div className="col-span-2"><FormField label="Department/Section"><PredictiveInput historyKey="vfl_department" value={form.departmentSection || ''} onChange={v => set('departmentSection', v)} placeholder="e.g. Engineering" hints={['Engineering', 'Mechanical', 'Electrical', 'Mining', 'Processing', 'Safety', 'Maintenance', 'Operations']} /></FormField></div>
            <FormField label="Date" required><input type="date" className={inputCls} value={form.date || ''} title="Observation date" onChange={e => set('date', e.target.value)} /></FormField>
            <FormField label="Time" required><input type="time" className={inputCls} value={form.time || ''} title="Observation time" onChange={e => set('time', e.target.value)} /></FormField>
            <FormField label="Status">
              <SelectField size="form" value={form.status || 'draft'} title="Status" onChange={v => set('status', v as VFLStatus)}
                options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
            </FormField>
          </div>
        )}

        {tab === 'observation' && (
          <div className="flex flex-col gap-5">
            <div>
              <div className={`text-xs font-medium mb-2 ${t.textFaint}`}>Behaviour Category *</div>
              <div className="flex gap-4 flex-wrap">
                {BEHAVIOUR_CATEGORIES.map(cat => (
                  <label key={cat} className={radioLabelCls}><input type="radio" style={{ accentColor: '#10b981' }} name="behaviourCat" value={cat} checked={form.behaviourCategory === cat} onChange={() => set('behaviourCategory', cat)} /><span className="font-semibold" style={{ color: BEHAVIOUR_HEX[cat] }}>{cat}</span></label>
                ))}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-2 ${t.textFaint}`}>Observation Type *</div>
              <div className="flex flex-col gap-2">
                {OBSERVATION_TYPES.map(type => (
                  <label key={type} className={radioLabelCls}><input type="radio" style={{ accentColor: '#10b981' }} name="obsType" value={type} checked={form.observationType === type} onChange={() => set('observationType', type)} /><span style={{ color: OBSERVATION_HEX[type] }}>{type}</span></label>
                ))}
              </div>
            </div>
            <FormField label="Description" required><textarea className={`${inputCls} resize-none`} style={{ minHeight: 100 }} value={form.description || ''} placeholder="Relate details of the observation..." onChange={e => set('description', e.target.value)} /></FormField>
            <div className={`${t.chipBg} rounded-xl p-3.5`}>
              <div className={`flex items-center gap-1.5 text-xs font-medium mb-2.5 ${t.textFaint}`}><MessageSquare className="h-3.5 w-3.5" /> Coaching Technique Used *</div>
              <div className="flex gap-4 flex-wrap">
                {COACHING_TECHNIQUES.map(tech => (
                  <label key={tech} className={radioLabelCls}><input type="radio" style={{ accentColor: '#10b981' }} name="coaching" value={tech} checked={form.coachingTechnique === tech} onChange={() => set('coachingTechnique', tech)} /><span className={`font-bold ${t.textPrimary}`}>{tech}</span><span className={`text-[11px] ${t.textFaint}`}>({COACHING_DESC[tech]})</span></label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'actions' && (
          <div>
            <div className="flex justify-between items-center mb-3.5">
              <div><div className={`font-bold text-sm ${t.textPrimary}`}>Actions to Rectify / Reinforce</div><div className={`text-[11px] mt-0.5 ${t.textFaint}`}>Define actions to address or reinforce behaviours.</div></div>
              <button type="button" onClick={addAction} className={`flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 ${accentText('emerald', t.light)} text-sm font-semibold transition-colors`}><Plus className="h-3.5 w-3.5" /> Add Action</button>
            </div>
            {(form.actions || []).length === 0 ? (
              <div className={`text-center py-8 ${t.textFaint}`}><Target className="h-9 w-9 mx-auto mb-2" /><div className="text-sm">No actions added yet.</div><button type="button" onClick={addAction} className={`mt-2.5 ${t.chipBg} ${t.hoverBg} rounded-lg px-3.5 py-1.5 text-xs transition-colors ${t.textMuted}`}>+ Add First Action</button></div>
            ) : (
              <div className="flex flex-col gap-2.5">{(form.actions || []).map((item, idx) => <ActionItemCard key={item.id} item={item} index={idx} onChange={updateAction} onRemove={removeAction} />)}</div>
            )}
            <div className={`mt-3.5 text-right text-[10px] italic uppercase tracking-wide ${t.textFaint}`}>Observer Signature Required on Printout</div>
          </div>
        )}

        <FormActions onCancel={onClose} submitting={saving} submitLabel={editing ? 'Update VFL' : 'Save VFL'} accent="emerald" />
      </form>
    </CenterModal>
  );
}

// =============== MAIN PAGE ===============
function VFLObservationContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, records: true });
  const { reports, setReports, loading, loadError, loadData } = useVFLData();
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
      setFormOpen(false); setEditing(null);
    } catch { toast.error('Failed to save VFL report'); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: VFLReport) => { setEditing(r); setFormOpen(true); };

  const handleDelete = async (id: string) => {
    try { await deleteVFLReport(id); setReports(prev => prev.filter(r => r.id !== id)); toast.success('VFL report deleted'); setDeleteTarget(null); }
    catch { toast.error('Failed to delete report'); }
  };

  const handleStatusChange = async (id: string, status: VFLStatus) => {
    const prev = reports.find(r => r.id === id);
    if (!prev) return;
    setReports(ps => ps.map(r => r.id === id ? { ...r, status } : r));
    try { await updateVFLReport(id, { status }); toast.success(`Status updated to ${status}`); }
    catch { setReports(ps => ps.map(r => r.id === id ? prev : r)); toast.error('Failed to update status'); }
  };

  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setBehaviourFilter('all'); setDateFrom(''); setDateTo(''); };

  const filtered = useMemo(() => reports.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (![r.observerName, r.designation, r.description, r.departmentSection].some(s => s?.toLowerCase().includes(q)) && !r.actions?.some(a => a.action?.toLowerCase().includes(q))) return false;
    }
    if (sectionFilter !== 'all' && r.sectionChoice !== sectionFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (behaviourFilter !== 'all' && r.behaviourCategory !== behaviourFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  }), [reports, search, sectionFilter, statusFilter, behaviourFilter, dateFrom, dateTo]);

  const exportColumns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 14, format: v => v ? fmtDate(v as string) : '' },
    { key: 'observerName', label: 'Observer', width: 18 },
    { key: 'designation', label: 'Designation', width: 18 },
    { key: 'sectionChoice', label: 'Section', width: 14 },
    { key: 'behaviourCategory', label: 'Behaviour', width: 16 },
    { key: 'coachingTechnique', label: 'Coaching', width: 12 },
    { key: 'status', label: 'Status', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
    { key: 'departmentSection', label: 'Dept/Section', width: 18 },
    { key: 'description', label: 'Description', width: 30 },
  ];

  const total = reports.length;
  const drafts = reports.filter(r => r.status === 'draft').length;
  const submitted = reports.filter(r => r.status === 'submitted').length;
  const reviewed = reports.filter(r => r.status === 'reviewed').length;
  const closed = reports.filter(r => r.status === 'closed').length;
  const unsafe = reports.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length;
  const safe = reports.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const totalActions = reports.reduce((acc, r) => acc + (r.actions?.length || 0), 0);

  const hasFilters = !!(search || sectionFilter !== 'all' || statusFilter !== 'all' || behaviourFilter !== 'all' || dateFrom || dateTo);
  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Eye}
        accent="violet"
        crumbs={['Safety & Compliance', 'Visible Felt Leadership']}
        title="Visible Felt Leadership"
        description="Safety observations and coaching tracking."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={loadData} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('VFL_Observations')}
                title="Visible Felt Leadership"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_HEX[row.status as VFLStatus]?.replace('#', '')}
              />
            )}
            <button type="button" onClick={() => setViewMode('grid')} title="Grid view" className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? `bg-emerald-500/20 ${accentText('emerald', t.light)}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setViewMode('table')} title="Table view" className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'table' ? `bg-emerald-500/20 ${accentText('emerald', t.light)}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><TableIcon className="h-3.5 w-3.5" /></button>
            <PrimaryButton icon={Plus} accent="emerald" onClick={() => { setEditing(null); setFormOpen(true); }}>New VFL</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          <StatTile icon={Eye} color="#10b981" label="Total" value={total} />
          <StatTile icon={Eye} color="#94a3b8" label="Draft" value={drafts} />
          <StatTile icon={Eye} color={ACCENT_HEX.blue} label="Submitted" value={submitted} />
          <StatTile icon={Eye} color="#a78bfa" label="Reviewed" value={reviewed} />
          <StatTile icon={Eye} color="#10b981" label="Closed" value={closed} />
          <StatTile icon={AlertTriangle} color="#ef4444" label="Unsafe" value={unsafe} />
          <StatTile icon={Eye} color="#34d399" label="Safe" value={safe} />
          <StatTile icon={Target} color="#60a5fa" label="Actions" value={totalActions} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by observer, description, actions..." className="w-56" />
            <SelectField size="filter" title="Section" value={sectionFilter} onChange={setSectionFilter} options={[{ value: 'all', label: 'All Sections' }, { value: 'Mechanical', label: 'Mechanical' }, { value: 'Electrical', label: 'Electrical' }]} />
            <SelectField size="filter" title="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
            <SelectField size="filter" title="Behaviour" value={behaviourFilter} onChange={setBehaviourFilter} options={[{ value: 'all', label: 'All Behaviour' }, { value: 'Safe Behaviour', label: 'Safe' }, { value: 'Unsafe Behaviour', label: 'Unsafe' }]} />
            <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
            <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
            {hasFilters && <button type="button" onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
            <span className={`text-[11px] ml-auto ${t.textFaint}`}>{filtered.length} of {total}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
        ) : loadError ? (
          // Never invite the user to "record their first observation" over data
          // that merely failed to load.
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={Eye} title="Could not load VFL reports" message={loadError}
              action={{ label: 'Try again', onClick: () => loadData() }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={Eye} title="No VFL observations found" message={total === 0 ? 'Start by recording your first VFL observation.' : 'Try adjusting your filters.'}
              action={{ label: total === 0 ? 'Create First VFL' : 'Clear Filters', onClick: total === 0 ? () => { setEditing(null); setFormOpen(true); } : clearFilters }} />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map((r, i) => <VFLCard key={r.id} report={r} index={i} onView={rep => { setSelectedReport(rep); setDetailOpen(true); }} onEdit={handleEdit} onDelete={id => setDeleteTarget(id)} />)}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}><tr><th className={thCls}>Date</th><th className={thCls}>Observer</th><th className={thCls}>Designation</th><th className={thCls}>Section</th><th className={thCls}>Behaviour</th><th className={thCls}>Coaching</th><th className={thCls}>Status</th><th className={thCls}></th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => { setSelectedReport(r); setDetailOpen(true); }} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors cursor-pointer`}>
                      <td className={tdCls(t)}>{fmtDate(r.date)}</td>
                      <td className={tdCls(t)}>{r.observerName}</td>
                      <td className={`px-3 py-2.5 text-xs ${t.textFaint}`}>{r.designation || 'N/A'}</td>
                      <td className={tdCls(t)}>{r.sectionChoice}</td>
                      <td className="px-3 py-2.5"><StatusBadge color={BEHAVIOUR_HEX[r.behaviourCategory] || ACCENT_HEX.blue} label={r.behaviourCategory} /></td>
                      <td className={`px-3 py-2.5 text-xs ${t.textFaint}`}>{r.coachingTechnique}</td>
                      <td className="px-3 py-2.5"><StatusBadge color={STATUS_HEX[r.status]} label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} /></td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button type="button" title="Edit" onClick={() => handleEdit(r)} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}><PenTool className="h-3 w-3" /></button>
                          <button type="button" title="Delete" onClick={() => setDeleteTarget(r.id)} className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} transition-colors`}><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      <VFLDetailModal report={selectedReport} open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedReport(null); }}
        onEdit={r => { setDetailOpen(false); handleEdit(r); }} onDelete={id => { setDetailOpen(false); setDeleteTarget(id); }} onStatusChange={handleStatusChange} />

      <VFLFormModal open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} saving={saving} />

      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <div className={`flex items-center gap-3 text-sm ${t.textMuted}`}><AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" /> Are you sure you want to delete this VFL observation?</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all">Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

function tdCls(t: ReturnType<typeof useTheme>) { return `px-3 py-2.5 text-sm ${t.textMuted}`; }

export default function VFLObservationPage() {
  return (
    <AppShell>
      <VFLObservationContent />
    </AppShell>
  );
}
