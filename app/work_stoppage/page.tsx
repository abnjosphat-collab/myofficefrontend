'use client';

import React, { useState, useEffect, useMemo, ElementType } from 'react';
import { formatDate } from '@/lib/format';
import {
  Octagon, Plus, Trash2, Eye, Pencil,
  AlertTriangle, Target, UserCircle, Building2,
  LayoutGrid, Table as TableIcon, Maximize2, Minimize2, RefreshCw,
  Wrench, Zap, ChevronDown, ChevronUp, X,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ProgressBar, ACCENT_HEX, GlowCard, SelectField, useConfirm,
} from '@/components/shared/theme';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { EmployeeNameInput } from '@/components/shared/EmployeeNameInput';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { summarizeActions } from '@/lib/actionPlan';
import { UnderlineTabs } from '@/components/shared/UnderlineTabs';
import type { SectionType, ActionStatus, CorrectiveAction, WorkStoppageReport } from './types';
import { useWorkStoppageData, createReport, updateReport, deleteReport } from './useWorkStoppageData';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical', 'General'];
const ACTION_STATUSES: ActionStatus[] = ['Pending', 'In Progress', 'Completed'];
const SECTION_ICON: Record<SectionType, ElementType> = { Mechanical: Wrench, Electrical: Zap, General: Building2 };
const SECTION_HEX: Record<SectionType, string> = { Mechanical: '#86BBD8', Electrical: '#f59e0b', General: '#a78bfa' };
const STATUS_HEX: Record<ActionStatus, string> = { Pending: '#f59e0b', 'In Progress': '#60a5fa', Completed: '#34d399' };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => (d ? formatDate(d) : '');
const newAction = (): CorrectiveAction => ({ id: uid(), finding: '', action: '', byWho: '', byWhen: '', status: 'Pending' });
const blankForm = (): Partial<WorkStoppageReport> => ({
  date: new Date().toISOString().split('T')[0], department: 'Engineering', section: 'General', description: '',
  investigationFindings: '', stoppageBy: '', stoppagePosition: '', acceptedBy: '', sheqCheckedBy: '', correctiveActions: [],
});

// ─── CORRECTIVE ACTION EDITOR ─────────────────────────────────────────────────

function CorrectiveActionCard({ action, index, onChange, onRemove }: {
  action: CorrectiveAction; index: number; onChange: (id: string, patch: Partial<CorrectiveAction>) => void; onRemove: (id: string) => void;
}) {
  const t = useTheme();
  const color = STATUS_HEX[action.status];
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <div className={`rounded-xl overflow-hidden ${t.chipBg}`}>
      <div className="h-0.5 w-full" style={{ background: color }} />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Action #{index + 1}</span>
          <div className="flex items-center gap-2">
            <SelectField size="filter" value={action.status} title="Action status"
              onChange={v => onChange(action.id, { status: v as ActionStatus, ...(v === 'Completed' && !action.completedDate ? { completedDate: new Date().toISOString().split('T')[0] } : {}) })}
              options={ACTION_STATUSES.map(s => ({ value: s, label: s }))} />
            <button type="button" title="Remove action" onClick={() => onRemove(action.id)} className={`h-5 w-5 flex items-center justify-center rounded hover:bg-rose-500/20 ${t.textFaint} hover:text-rose-400 transition-all`}><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
        <FormField label="Finding / Issue" required><textarea value={action.finding} rows={2} placeholder="Describe the finding or unsafe condition…" onChange={e => onChange(action.id, { finding: e.target.value })} className={`${inputCls} resize-none`} /></FormField>
        <FormField label="Corrective Action" required><textarea value={action.action} rows={2} placeholder="What action needs to be taken?" onChange={e => onChange(action.id, { action: e.target.value })} className={`${inputCls} resize-none`} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Assigned To" required><input value={action.byWho} placeholder="Person responsible" onChange={e => onChange(action.id, { byWho: e.target.value })} className={inputCls} /></FormField>
          <FormField label="Due Date" required><input type="date" value={action.byWhen} title="Due date" onChange={e => onChange(action.id, { byWhen: e.target.value })} className={inputCls} /></FormField>
          {action.status === 'Completed' && <FormField label="Completed Date"><input type="date" value={action.completedDate || ''} title="Completed date" onChange={e => onChange(action.id, { completedDate: e.target.value })} className={inputCls} /></FormField>}
        </div>
        <FormField label="Remarks"><textarea value={action.remarks || ''} rows={2} placeholder="Additional notes…" onChange={e => onChange(action.id, { remarks: e.target.value })} className={`${inputCls} resize-none`} /></FormField>
      </div>
    </div>
  );
}

// ─── REPORT FORM MODAL ────────────────────────────────────────────────────────

function ReportFormModal({ open, onClose, onSave, report }: {
  open: boolean; onClose: () => void; onSave: (data: Partial<WorkStoppageReport>) => Promise<void>; report?: WorkStoppageReport | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<Partial<WorkStoppageReport>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => { setForm(report ? { ...report, correctiveActions: report.correctiveActions || [] } : blankForm()); setTab('details'); }, [report, open]);

  const set = (patch: Partial<WorkStoppageReport>) => setForm(prev => ({ ...prev, ...patch }));
  const addAction = () => set({ correctiveActions: [...(form.correctiveActions || []), newAction()] });
  const updateAction = (id: string, patch: Partial<CorrectiveAction>) => set({ correctiveActions: form.correctiveActions?.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAction = (id: string) => set({ correctiveActions: form.correctiveActions?.filter(a => a.id !== id) });

  const validate = () => {
    if (!form.department?.trim()) { toast.error('Department is required'); setTab('details'); return false; }
    if (!form.description?.trim()) { toast.error('Description is required'); setTab('details'); return false; }
    if (!form.stoppageBy?.trim()) { toast.error('Stoppage issued by is required'); setTab('details'); return false; }
    if (!form.date) { toast.error('Date is required'); setTab('details'); return false; }
    for (let i = 0; i < (form.correctiveActions?.length || 0); i++) {
      const a = form.correctiveActions![i];
      if (!a.finding?.trim()) { toast.error(`Action #${i + 1}: Finding required`); setTab('actions'); return false; }
      if (!a.action?.trim()) { toast.error(`Action #${i + 1}: Corrective action required`); setTab('actions'); return false; }
      if (!a.byWho?.trim()) { toast.error(`Action #${i + 1}: Assigned person required`); setTab('actions'); return false; }
      if (!a.byWhen) { toast.error(`Action #${i + 1}: Due date required`); setTab('actions'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try { await onSave(form); onClose(); } catch { /* toast in parent */ } finally { setSaving(false); }
  };

  const actions = form.correctiveActions || [];
  const progress = summarizeActions(actions);
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  const TABS = [{ id: 'details', label: 'Incident Details' }, { id: 'actions', label: `Action Plan (${actions.length})` }, { id: 'summary', label: 'Summary' }];

  return (
    <CenterModal open={open} onClose={onClose} title={report ? 'Edit Work Stoppage' : 'New Work Stoppage'} accent="amber" width="max-w-3xl">
      <form onSubmit={handleSubmit}>
        <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} accent="rose" />

        <div className="px-5 py-4 space-y-4">
          {tab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Date" required><input type="date" value={form.date || ''} title="Incident date" onChange={e => set({ date: e.target.value })} className={inputCls} /></FormField>
                <FormField label="Section" required>
                  <SelectField size="form" value={form.section || 'General'} title="Section" onChange={v => set({ section: v as SectionType })}
                    options={SECTIONS.map(s => ({ value: s, label: s }))} />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Department" required>
                    <PredictiveInput historyKey="ws_department" value={form.department || ''} onChange={v => set({ department: v })} placeholder="e.g. Engineering" hints={['Engineering', 'Mechanical', 'Electrical', 'Mining', 'Processing', 'Safety', 'Maintenance', 'Operations', 'HR', 'Administration']} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Description of Unsafe Act / Potential Impact" required>
                    <PredictiveInput historyKey="ws_description" value={form.description || ''} onChange={v => set({ description: v })} multiline rows={4} placeholder="Describe the unsafe condition, what happened, and what could have happened…" hints={['Unsafe working conditions observed at', 'Equipment operating without safety guards', 'Worker exposed to electrical hazard', 'Improper chemical storage detected', 'Slip/trip hazard identified at']} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Investigation Findings">
                    <PredictiveInput historyKey="ws_findings" value={form.investigationFindings || ''} onChange={v => set({ investigationFindings: v })} multiline rows={3} placeholder="Initial findings from the investigation…" hints={['Root cause identified as', 'Contributing factors include', 'Immediate corrective action taken', 'Further investigation required']} />
                  </FormField>
                </div>
              </div>

              <div className={`border-t ${t.border} pt-3`}>
                <p className={`text-[10px] uppercase tracking-wider mb-3 font-semibold ${t.textFaint}`}>Personnel</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Stoppage Issued By" required>
                    <EmployeeNameInput value={form.stoppageBy || ''} onChange={(name, emp) => { set({ stoppageBy: name }); if (emp?.designation) set({ stoppagePosition: emp.designation }); if (emp?.department && !form.department?.trim()) set({ department: emp.department }); }} placeholder="Select or type name…" />
                  </FormField>
                  <FormField label="Position">
                    <PredictiveInput historyKey="ws_position" value={form.stoppagePosition || ''} onChange={v => set({ stoppagePosition: v })} placeholder="e.g. Safety Officer, Supervisor" hints={['Safety Officer', 'Supervisor', 'Foreman', 'SHEQ Manager', 'Section Engineer', 'Shift Boss']} />
                  </FormField>
                  <FormField label="Accepted By"><EmployeeNameInput value={form.acceptedBy || ''} onChange={name => set({ acceptedBy: name })} placeholder="Select or type name…" /></FormField>
                  <FormField label="SHEQ Checked By"><EmployeeNameInput value={form.sheqCheckedBy || ''} onChange={name => set({ sheqCheckedBy: name })} placeholder="Select or type SHEQ representative…" /></FormField>
                </div>
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className={`text-center py-10 ${t.textFaint}`}>
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No corrective actions added yet</p>
                  <button type="button" onClick={addAction} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all"><Plus className="h-3.5 w-3.5" /> Add First Action</button>
                </div>
              ) : (
                <>
                  {actions.map((a, i) => <CorrectiveActionCard key={a.id} action={a} index={i} onChange={updateAction} onRemove={removeAction} />)}
                  <button type="button" onClick={addAction} className={`w-full py-2 rounded-xl text-xs border border-dashed ${t.border} ${t.textFaint} hover:text-brand-400 transition-all inline-flex items-center justify-center gap-1.5`}><Plus className="h-3 w-3" /> Add Another Action</button>
                </>
              )}
            </div>
          )}

          {tab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[{ label: 'Pending', value: progress.pending, color: '#f59e0b' }, { label: 'In Progress', value: progress.inProgress, color: '#60a5fa' }, { label: 'Completed', value: progress.completed, color: '#34d399' }].map(s => (
                  <div key={s.label} className={`text-center rounded-xl p-3 ${t.chipBg}`}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className={`text-[11px] mt-0.5 ${t.textFaint}`}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className={`flex justify-between text-xs mb-1.5 ${t.textFaint}`}><span>Overall Progress</span><span>{progress.pct}%</span></div>
                <ProgressBar value={progress.pct} color="#34d399" showValue={false} />
              </div>
              {actions.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Action Items</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {actions.map((a, idx) => (
                      <div key={a.id} className={`flex items-center gap-3 py-1.5 border-b ${t.border} last:border-0`}>
                        <span className={`text-[10px] w-4 ${t.textFaint}`}>{idx + 1}</span>
                        <div className="flex-1 min-w-0"><p className={`text-xs truncate ${t.textMuted}`}>{a.finding || 'No finding'}</p><p className={`text-[10px] ${t.textFaint}`}>Due: {fmtDate(a.byWhen)}</p></div>
                        <StatusBadge color={STATUS_HEX[a.status]} label={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <FormActions onCancel={onClose} submitLabel={report ? 'Update Stoppage' : 'Issue Work Stoppage'} submitting={saving} accent="amber" />
      </form>
    </CenterModal>
  );
}

// ─── REPORT DETAIL MODAL ──────────────────────────────────────────────────────

function ReportDetailModal({ report, open, onClose, onEdit }: {
  report: WorkStoppageReport | null; open: boolean; onClose: () => void; onEdit: (r: WorkStoppageReport) => void;
}) {
  const t = useTheme();
  if (!report) return null;
  const actions = report.correctiveActions || [];
  const progress = summarizeActions(actions);

  return (
    <CenterModal open={open} onClose={onClose} title="Work Stoppage Report" accent="amber" width="max-w-2xl">
      <div className="px-5 py-4 space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge color={SECTION_HEX[report.section]} label={report.section} />
          <span className={`text-xs ${t.textFaint}`}>{fmtDate(report.date)}</span>
          <span className={`text-xs ml-auto ${t.textFaint}`}>ID: {report.id.slice(0, 8)}</span>
        </div>

        {actions.length > 0 && (
          <div>
            <div className={`flex justify-between text-xs mb-1 ${t.textFaint}`}><span>Corrective Action Progress</span><span>{progress.completed}/{progress.total} completed ({progress.pct}%)</span></div>
            <ProgressBar value={progress.pct} color="#34d399" showValue={false} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Department', value: report.department }, { label: 'Section', value: report.section },
            { label: 'Issued By', value: report.stoppageBy }, { label: 'Position', value: report.stoppagePosition || 'N/A' },
            { label: 'Accepted By', value: report.acceptedBy || 'N/A' }, { label: 'SHEQ Checked By', value: report.sheqCheckedBy || 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}><p className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</p><p className={`text-xs ${t.textMuted}`}>{value}</p></div>
          ))}
        </div>

        <div className={`border-t ${t.border}`} />

        <div><p className={`text-[10px] uppercase tracking-wide mb-1.5 ${t.textFaint}`}>Description</p><p className={`text-xs leading-relaxed whitespace-pre-wrap ${t.textMuted}`}>{report.description}</p></div>
        {report.investigationFindings && <div><p className={`text-[10px] uppercase tracking-wide mb-1.5 ${t.textFaint}`}>Investigation Findings</p><p className={`text-xs leading-relaxed whitespace-pre-wrap ${t.textMuted}`}>{report.investigationFindings}</p></div>}

        {actions.length > 0 && (
          <div>
            <p className={`text-[10px] uppercase tracking-wide mb-2 ${t.textFaint}`}>Corrective Actions ({actions.length})</p>
            <div className="space-y-2">
              {actions.map((a, idx) => (
                <div key={a.id} className={`rounded-xl p-3 ${t.chipBg}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5"><p className={`text-xs font-medium ${t.textMuted}`}>#{idx + 1} {a.finding}</p><StatusBadge color={STATUS_HEX[a.status]} label={a.status} /></div>
                  <p className={`text-xs mb-2 ${t.textFaint}`}>{a.action}</p>
                  <div className={`grid grid-cols-2 gap-2 text-[10px] ${t.textFaint}`}><span>By: {a.byWho}</span><span>Due: {fmtDate(a.byWhen)}</span>{a.completedDate && <span className="col-span-2">Completed: {fmtDate(a.completedDate)}</span>}</div>
                  {a.remarks && <p className={`text-[11px] italic mt-1 ${t.textFaint}`}>&ldquo;{a.remarks}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className={`px-5 py-4 border-t ${t.border} flex justify-end gap-2`}>
        <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Close</button>
        <button type="button" onClick={() => { onClose(); onEdit(report); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 inline-flex items-center gap-2 transition-all"><Pencil className="h-3.5 w-3.5" /> Edit</button>
      </div>
    </CenterModal>
  );
}

// ─── REPORT CARD (grid) ───────────────────────────────────────────────────────

function ReportCard({ report, expanded, onToggle, onView, onEdit, onDelete }: {
  report: WorkStoppageReport; expanded: boolean; onToggle: () => void; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const t = useTheme();
  const SIcon = SECTION_ICON[report.section];
  const sColor = SECTION_HEX[report.section];
  const actions = report.correctiveActions || [];
  const progress = summarizeActions(actions);
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = actions.filter(a => a.status !== 'Completed' && a.byWhen && a.byWhen < today).length;

  return (
    <GlowCard onClick={onView} color="#f43f5e" surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <SIcon className="h-5 w-5 shrink-0" style={{ color: sColor }} />
          <div className="min-w-0"><p className={`text-[10px] ${t.textFaint}`}>{report.section} • {fmtDate(report.date)}</p><p className={`text-sm font-semibold truncate ${t.textPrimary}`}>{report.department}</p></div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText} transition-all`}>{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        </div>
      </div>

      <div className={`px-4 py-2 grid grid-cols-4 gap-1 border-b ${t.border}`}>
        {[{ label: 'Actions', value: progress.total, color: ACCENT_HEX.blue }, { label: 'Pending', value: progress.pending, color: '#f59e0b' }, { label: 'Closed', value: progress.completed, color: '#34d399' }, { label: 'Overdue', value: overdueCount, color: '#f43f5e' }].map(s => (
          <div key={s.label} className="text-center"><div className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</div><div className={`text-[9px] mt-0.5 ${t.textFaint}`}>{s.label}</div></div>
        ))}
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><UserCircle className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{report.stoppageBy}{report.stoppagePosition ? ` — ${report.stoppagePosition}` : ''}</span></div>
        <div className={`flex items-start gap-1.5 text-xs ${t.textFaint}`}><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400/60" /><span className="line-clamp-2">{report.description}</span></div>
      </div>

      {expanded && (
        <div className={`border-t ${t.border} px-4 py-3 space-y-3`} onClick={e => e.stopPropagation()}>
          {report.investigationFindings && <div><p className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Investigation</p><p className={`text-xs line-clamp-3 ${t.textFaint}`}>{report.investigationFindings}</p></div>}
          {actions.length > 0 && (
            <div>
              <p className={`text-[10px] uppercase tracking-wide mb-1.5 ${t.textFaint}`}>Actions</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {actions.map((a, idx) => (
                  <div key={a.id} className={`rounded-lg p-2 ${t.chipBg}`}>
                    <div className="flex items-start justify-between gap-2"><p className={`text-xs ${t.textMuted}`}>#{idx + 1} {a.finding}</p><StatusBadge color={STATUS_HEX[a.status]} label={a.status} /></div>
                    <p className={`text-[10px] mt-0.5 ${t.textFaint}`}>By: {a.byWho} · Due: {fmtDate(a.byWhen)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className={`text-[10px] ${t.textFaint}`}>Accepted By</p><p className={t.textFaint}>{report.acceptedBy || 'Not specified'}</p></div>
            <div><p className={`text-[10px] ${t.textFaint}`}>SHEQ Checked</p><p className={t.textFaint}>{report.sheqCheckedBy || 'Not specified'}</p></div>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button type="button" title="View" onClick={onView} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-brand-500/10 text-brand-400 transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-1"><Eye className="h-3 w-3" /> View</button>
            <button type="button" title="Edit" onClick={onEdit} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-brand-500/10 text-brand-400 transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
            <button type="button" title="Delete" onClick={onDelete} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/10 text-rose-400 transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
        </div>
      )}
    </GlowCard>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function WorkStoppageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ hero: true, records: true });
  const { reports, setReports, loading, refreshing, load } = useWorkStoppageData();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<WorkStoppageReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkStoppageReport | null>(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const allActions = reports.flatMap(r => r.correctiveActions || []);
    const today = new Date().toISOString().split('T')[0];
    return {
      total: reports.length,
      pending: allActions.filter(a => a.status === 'Pending').length,
      inProgress: allActions.filter(a => a.status === 'In Progress').length,
      completed: allActions.filter(a => a.status === 'Completed').length,
      overdue: allActions.filter(a => a.status !== 'Completed' && a.byWhen && a.byWhen < today).length,
      mechanical: reports.filter(r => r.section === 'Mechanical').length,
      electrical: reports.filter(r => r.section === 'Electrical').length,
      general: reports.filter(r => r.section === 'General').length,
    };
  }, [reports]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reports.filter(r => {
      const s = search.toLowerCase();
      if (s && !r.department?.toLowerCase().includes(s) && !r.description?.toLowerCase().includes(s) && !r.stoppageBy?.toLowerCase().includes(s)) return false;
      if (sectionFilter !== 'all' && r.section !== sectionFilter) return false;
      if (statusFilter !== 'all') {
        const actions = r.correctiveActions || [];
        if (statusFilter === 'pending' && !actions.some(a => a.status === 'Pending')) return false;
        if (statusFilter === 'in-progress' && !actions.some(a => a.status === 'In Progress')) return false;
        if (statusFilter === 'completed' && !actions.every(a => a.status === 'Completed')) return false;
        if (statusFilter === 'overdue' && !actions.some(a => a.status !== 'Completed' && a.byWhen && a.byWhen < today)) return false;
      }
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [reports, search, sectionFilter, statusFilter, dateFrom, dateTo]);

  const hasFilters = !!(search || sectionFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo);
  const toggle = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportColumns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 14, format: v => v ? fmtDate(v as string) : '' },
    { key: 'department', label: 'Department', width: 18 },
    { key: 'section', label: 'Section', width: 14 },
    { key: 'stoppageBy', label: 'Issued By', width: 18 },
    { key: 'stoppagePosition', label: 'Position', width: 18 },
    { key: 'description', label: 'Description', width: 30 },
    { key: 'investigationFindings', label: 'Investigation Findings', width: 30 },
    { key: 'acceptedBy', label: 'Accepted By', width: 18 },
    { key: 'sheqCheckedBy', label: 'SHEQ Checked By', width: 18 },
    {
      key: 'correctiveActions', label: 'Actions', width: 14,
      format: (_v, row) => {
        const actions = (row.correctiveActions as CorrectiveAction[]) ?? [];
        const done = actions.filter(a => a.status === 'Completed').length;
        return `${done}/${actions.length} done`;
      },
    },
  ];

  const handleSave = async (data: Partial<WorkStoppageReport>) => {
    try {
      if (editingReport) {
        const updated = await updateReport(editingReport.id, data);
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success('Work stoppage updated');
      } else {
        const created = await createReport(data);
        setReports(prev => [created, ...prev]);
        toast.success('Work stoppage issued');
      }
      setFormOpen(false); setEditingReport(null);
    } catch (e) { toast.error((e as Error)?.message || 'Failed to save'); throw e; }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Delete this work stoppage report?', destructive: true })) return;
    try { await deleteReport(id); setReports(prev => prev.filter(r => r.id !== id)); toast.success('Report deleted'); }
    catch { toast.error('Failed to delete report'); }
  };

  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Octagon}
        accent="violet"
        crumbs={['Safety & Compliance', 'Work Stoppage']}
        title="Work Stoppages"
        description="Document and track unsafe acts, practices, and SHEQ compliance issues"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => load(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Work_Stoppage_Reports')}
                title="Work Stoppages"
                statusColumn="section"
                statusColor={(_v, row) => SECTION_HEX[row.section as SectionType]?.replace('#', '')}
              />
            )}
            <PrimaryButton icon={Octagon} accent="amber" onClick={() => { setEditingReport(null); setFormOpen(true); }}>Issue Stoppage</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          <StatTile icon={Octagon} color="#fb7185" label="Total Reports" value={stats.total} />
          <StatTile icon={Octagon} color="#f59e0b" label="Pending" value={stats.pending} />
          <StatTile icon={Octagon} color="#60a5fa" label="In Progress" value={stats.inProgress} />
          <StatTile icon={Octagon} color="#34d399" label="Completed" value={stats.completed} />
          <StatTile icon={Octagon} color="#f43f5e" label="Overdue" value={stats.overdue} />
          <StatTile icon={Wrench} color={ACCENT_HEX.blue} label="Mechanical" value={stats.mechanical} />
          <StatTile icon={Zap} color="#f59e0b" label="Electrical" value={stats.electrical} />
          <StatTile icon={Building2} color="#a78bfa" label="General" value={stats.general} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by department, description, issued by…" className="w-56" />
            <SelectField size="filter" title="Section" value={sectionFilter} onChange={setSectionFilter} options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
            <SelectField size="filter" title="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'in-progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'overdue', label: 'Overdue' }]} />
            <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
            <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
            {hasFilters && <button type="button" onClick={() => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" title="Expand all" onClick={() => setExpandedIds(new Set(reports.map(r => r.id)))} className={`h-8 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} transition-all`}><Maximize2 className="h-3 w-3" /> Expand all</button>
              <button type="button" title="Collapse all" onClick={() => setExpandedIds(new Set())} className={`h-8 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} transition-all`}><Minimize2 className="h-3 w-3" /></button>
              <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-rose-500/20 text-rose-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button type="button" title="List view" onClick={() => setViewMode('list')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-rose-500/20 text-rose-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}><TableIcon className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl ${t.shadow}`}>
            <EmptyState icon={Octagon} title={hasFilters ? 'No reports match your filters' : 'No work stoppages issued'}
              message={hasFilters ? 'Try adjusting your filters' : 'Issue a work stoppage to document unsafe acts or practices'}
              action={{ label: 'Issue Work Stoppage', onClick: () => { setEditingReport(null); setFormOpen(true); } }} />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(report => (
              <ReportCard key={report.id} report={report} expanded={expandedIds.has(report.id)} onToggle={() => toggle(report.id)}
                onView={() => { setSelectedReport(report); setDetailOpen(true); }} onEdit={() => { setEditingReport(report); setFormOpen(true); }} onDelete={() => handleDelete(report.id)} />
            ))}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}><tr><th className={thCls}></th><th className={thCls}>Department</th><th className={thCls}>Section</th><th className={thCls}>Issued By</th><th className={thCls}>Date</th><th className={thCls}>Actions</th><th className={thCls}></th></tr></thead>
                <tbody>
                  {filtered.map(report => {
                    const actions = report.correctiveActions || [];
                    const completedCount = actions.filter(a => a.status === 'Completed').length;
                    return (
                      <React.Fragment key={report.id}>
                        <tr className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer transition-colors`} onClick={() => { setSelectedReport(report); setDetailOpen(true); }}>
                          <td className="pl-3 pr-1 py-3 w-6"><button type="button" title="Toggle" onClick={e => { e.stopPropagation(); toggle(report.id); }} className={`h-5 w-5 flex items-center justify-center ${t.textFaint} ${t.hoverText} transition-all`}>{expandedIds.has(report.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button></td>
                          <td className={`px-3 py-3 text-sm font-medium max-w-[160px] truncate ${t.textPrimary}`}>{report.department}</td>
                          <td className="px-3 py-3"><StatusBadge color={SECTION_HEX[report.section]} label={report.section} /></td>
                          <td className={`px-3 py-3 text-xs max-w-[140px] truncate ${t.textMuted}`}>{report.stoppageBy}</td>
                          <td className={`px-3 py-3 text-xs whitespace-nowrap ${t.textFaint}`}>{fmtDate(report.date)}</td>
                          <td className="px-3 py-3 text-xs"><span className={`font-semibold ${t.textMuted}`}>{actions.length}</span><span className={`ml-1 ${t.textFaint}`}>({completedCount} done)</span></td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <button type="button" title="Edit" onClick={() => { setEditingReport(report); setFormOpen(true); }} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}><Pencil className="h-3 w-3" /></button>
                              <button type="button" title="Delete" onClick={() => handleDelete(report.id)} className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-400 transition-colors`}><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </td>
                        </tr>
                        {expandedIds.has(report.id) && (
                          <tr className={`border-b ${t.border} ${t.chipBg}`}>
                            <td colSpan={7} className="px-5 py-3">
                              <p className={`text-xs mb-2 line-clamp-2 ${t.textFaint}`}>{report.description}</p>
                              {actions.length > 0 && (
                                <div className="space-y-1.5">
                                  {actions.map((a, idx) => (
                                    <div key={a.id} className="flex items-center gap-3">
                                      <span className={`text-[10px] w-4 ${t.textFaint}`}>#{idx + 1}</span>
                                      <span className={`text-xs flex-1 truncate ${t.textFaint}`}>{a.finding}</span>
                                      <span className={`text-[10px] ${t.textFaint}`}>Due: {fmtDate(a.byWhen)}</span>
                                      <StatusBadge color={STATUS_HEX[a.status]} label={a.status} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      <ReportFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingReport(null); }} onSave={handleSave} report={editingReport} />
      <ReportDetailModal report={selectedReport} open={detailOpen} onClose={() => setDetailOpen(false)} onEdit={r => { setEditingReport(r); setFormOpen(true); }} />
    </main>
  );
}

export default function WorkStoppagePage() {
  return (
    <AppShell>
      <WorkStoppageContent />
    </AppShell>
  );
}
