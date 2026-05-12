'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Octagon, Plus, Trash2, Eye, Pencil,
  AlertTriangle, CheckCircle, Clock3, AlertCircle,
  Target, ClipboardList, UserCircle, Building2,
  LayoutGrid, Table as TableIcon, Maximize2, Minimize2, Loader2,
  Wrench, Zap,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import {
  safetyFetch, glassInput, glassLabel, glassTextarea, glassSelect,
  StatusBadge, SectionBadge,
  LoadingState, EmptyState,
  SafetyHero, SafetyControls, SafetySearchBar, FilterPills,
  DateRangeFilter, ClearFiltersButton,
  SafetyPanel, SafetyTable, SafetyModal, FormField, ModalActions,
  RowActions, TabBar, AddButton,
} from '@/components/safety';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type SectionType = 'Mechanical' | 'Electrical' | 'General';
type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

interface CorrectiveAction {
  id: string;
  finding: string;
  action: string;
  byWho: string;
  byWhen: string;
  status: ActionStatus;
  completedDate?: string;
  remarks?: string;
}

interface WorkStoppageReport {
  id: string;
  date: string;
  department: string;
  section: SectionType;
  description: string;
  investigationFindings: string;
  stoppageBy: string;
  stoppagePosition: string;
  acceptedBy: string;
  sheqCheckedBy: string;
  correctiveActions: CorrectiveAction[];
  submittedAt: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTIONS: SectionType[] = ['Mechanical', 'Electrical', 'General'];
const ACTION_STATUSES: ActionStatus[] = ['Pending', 'In Progress', 'Completed'];
const SECTION_ICON: Record<SectionType, React.ElementType> = {
  Mechanical: Wrench, Electrical: Zap, General: Building2,
};
const SECTION_COLOR: Record<SectionType, string> = {
  Mechanical: '#86BBD8', Electrical: '#f59e0b', General: '#a78bfa',
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function getReports(): Promise<WorkStoppageReport[]> {
  try { return await safetyFetch<WorkStoppageReport[]>('/api/work-stoppage/'); }
  catch { return []; }
}
async function createReport(data: Partial<WorkStoppageReport>): Promise<WorkStoppageReport> {
  return safetyFetch<WorkStoppageReport>('/api/work-stoppage/', { method: 'POST', body: JSON.stringify(data) });
}
async function updateReport(id: string, data: Partial<WorkStoppageReport>): Promise<WorkStoppageReport> {
  return safetyFetch<WorkStoppageReport>(`/api/work-stoppage/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
async function deleteReport(id: string): Promise<void> {
  await safetyFetch(`/api/work-stoppage/${id}`, { method: 'DELETE' });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const newAction = (): CorrectiveAction => ({
  id: uid(), finding: '', action: '', byWho: '', byWhen: '', status: 'Pending',
});
const blankForm = (): Partial<WorkStoppageReport> => ({
  date: new Date().toISOString().split('T')[0],
  department: '', section: 'General', description: '',
  investigationFindings: '', stoppageBy: '', stoppagePosition: '',
  acceptedBy: '', sheqCheckedBy: '', correctiveActions: [],
});

// ─── CORRECTIVE ACTION EDITOR ─────────────────────────────────────────────────

function CorrectiveActionCard({
  action, index, onChange, onRemove,
}: {
  action: CorrectiveAction; index: number;
  onChange: (id: string, patch: Partial<CorrectiveAction>) => void;
  onRemove: (id: string) => void;
}) {
  const statusColor: Record<ActionStatus, string> = {
    Pending: '#f59e0b', 'In Progress': '#60a5fa', Completed: '#34d399',
  };
  const color = statusColor[action.status];

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04]">
      <div className="h-0.5 w-full" style={{ background: color }} />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
            Action #{index + 1}
          </span>
          <div className="flex items-center gap-2">
            <select value={action.status} title="Action status"
              onChange={e => onChange(action.id, {
                status: e.target.value as ActionStatus,
                ...(e.target.value === 'Completed' && !action.completedDate
                  ? { completedDate: new Date().toISOString().split('T')[0] } : {}),
              })}
              className="h-6 px-2 text-[10px] rounded-lg border transition-all cursor-pointer"
              style={{ background: `${color}15`, borderColor: `${color}30`, color, colorScheme: 'dark' }}>
              {ACTION_STATUSES.map(s => <option key={s} value={s} className="bg-[#0a1628] text-white">{s}</option>)}
            </select>
            <button type="button" title="Remove action" onClick={() => onRemove(action.id)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div>
          <label className={glassLabel}>Finding / Issue *</label>
          <textarea value={action.finding} rows={2}
            placeholder="Describe the finding or unsafe condition…"
            onChange={e => onChange(action.id, { finding: e.target.value })}
            className={glassTextarea} />
        </div>
        <div>
          <label className={glassLabel}>Corrective Action *</label>
          <textarea value={action.action} rows={2}
            placeholder="What action needs to be taken?"
            onChange={e => onChange(action.id, { action: e.target.value })}
            className={glassTextarea} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={glassLabel}>Assigned To *</label>
            <input value={action.byWho} placeholder="Person responsible"
              onChange={e => onChange(action.id, { byWho: e.target.value })}
              className={glassInput} />
          </div>
          <div>
            <label className={glassLabel}>Due Date *</label>
            <input type="date" value={action.byWhen} title="Due date" placeholder="Due date"
              onChange={e => onChange(action.id, { byWhen: e.target.value })}
              className={glassInput} style={{ colorScheme: 'dark' }} />
          </div>
          {action.status === 'Completed' && (
            <div>
              <label className={glassLabel}>Completed Date</label>
              <input type="date" value={action.completedDate || ''} title="Completed date" placeholder="Completed date"
                onChange={e => onChange(action.id, { completedDate: e.target.value })}
                className={glassInput} style={{ colorScheme: 'dark' }} />
            </div>
          )}
        </div>
        <div>
          <label className={glassLabel}>Remarks</label>
          <textarea value={action.remarks || ''} rows={2} placeholder="Additional notes…"
            onChange={e => onChange(action.id, { remarks: e.target.value })}
            className={glassTextarea} />
        </div>
      </div>
    </div>
  );
}

// ─── REPORT FORM MODAL ────────────────────────────────────────────────────────

function ReportFormModal({
  open, onClose, onSave, report,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<WorkStoppageReport>) => Promise<void>;
  report?: WorkStoppageReport | null;
}) {
  const [form, setForm] = useState<Partial<WorkStoppageReport>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    setForm(report ? { ...report, correctiveActions: report.correctiveActions || [] } : blankForm());
    setTab('details');
  }, [report, open]);

  const set = (patch: Partial<WorkStoppageReport>) => setForm(prev => ({ ...prev, ...patch }));

  const addAction = () => set({ correctiveActions: [...(form.correctiveActions || []), newAction()] });
  const updateAction = (id: string, patch: Partial<CorrectiveAction>) =>
    set({ correctiveActions: form.correctiveActions?.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAction = (id: string) =>
    set({ correctiveActions: form.correctiveActions?.filter(a => a.id !== id) });

  const validate = () => {
    if (!form.department?.trim()) { toast.error('Department is required'); setTab('details'); return false; }
    if (!form.description?.trim()) { toast.error('Description is required'); setTab('details'); return false; }
    if (!form.stoppageBy?.trim()) { toast.error('Stoppage issued by is required'); setTab('details'); return false; }
    if (!form.date) { toast.error('Date is required'); setTab('details'); return false; }
    for (let i = 0; i < (form.correctiveActions?.length || 0); i++) {
      const a = form.correctiveActions![i];
      if (!a.finding?.trim()) { toast.error(`Action #${i+1}: Finding required`); setTab('actions'); return false; }
      if (!a.action?.trim()) { toast.error(`Action #${i+1}: Corrective action required`); setTab('actions'); return false; }
      if (!a.byWho?.trim()) { toast.error(`Action #${i+1}: Assigned person required`); setTab('actions'); return false; }
      if (!a.byWhen) { toast.error(`Action #${i+1}: Due date required`); setTab('actions'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { /* toast shown in parent */ }
    finally { setSaving(false); }
  };

  const ACCENT = '#f43f5e';
  const actions = form.correctiveActions || [];
  const pendingCount = actions.filter(a => a.status === 'Pending').length;
  const inProgressCount = actions.filter(a => a.status === 'In Progress').length;
  const completedCount = actions.filter(a => a.status === 'Completed').length;
  const progressPct = actions.length ? Math.round((completedCount / actions.length) * 100) : 0;

  return (
    <SafetyModal open={open} onClose={onClose}
      title={report ? 'Edit Work Stoppage' : 'New Work Stoppage'}
      icon={Octagon} width="max-w-3xl" accentColor={ACCENT}>
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <TabBar active={tab} onChange={setTab} accentColor={ACCENT}
            tabs={[
              { id: 'details', label: 'Incident Details' },
              { id: 'actions', label: `Action Plan (${actions.length})` },
              { id: 'summary', label: 'Summary' },
            ]}
          />
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── Details ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Date" required>
                  <input type="date" value={form.date || ''} title="Incident date" placeholder="Date"
                    onChange={e => set({ date: e.target.value })}
                    className={glassInput} style={{ colorScheme: 'dark' }} />
                </FormField>
                <FormField label="Section" required>
                  <select value={form.section || 'General'} title="Section"
                    onChange={e => set({ section: e.target.value as SectionType })}
                    className={glassSelect} style={{ colorScheme: 'dark' }}>
                    {SECTIONS.map(s => <option key={s} value={s} className="bg-[#0a1628]">{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Department" required className="md:col-span-2">
                  <input value={form.department || ''} placeholder="e.g. Production, Maintenance, Operations"
                    onChange={e => set({ department: e.target.value })}
                    className={glassInput} />
                </FormField>
                <FormField label="Description of Unsafe Act / Potential Impact" required className="md:col-span-2">
                  <textarea value={form.description || ''} rows={4}
                    placeholder="Describe the unsafe condition, what happened, and what could have happened…"
                    onChange={e => set({ description: e.target.value })}
                    className={glassTextarea} />
                </FormField>
                <FormField label="Investigation Findings" className="md:col-span-2">
                  <textarea value={form.investigationFindings || ''} rows={3}
                    placeholder="Initial findings from the investigation…"
                    onChange={e => set({ investigationFindings: e.target.value })}
                    className={glassTextarea} />
                </FormField>
              </div>

              <div className="border-t border-white/[0.06] pt-3">
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-3 font-semibold">Personnel</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Stoppage Issued By" required>
                    <input value={form.stoppageBy || ''} placeholder="Name of person issuing stoppage"
                      onChange={e => set({ stoppageBy: e.target.value })}
                      className={glassInput} />
                  </FormField>
                  <FormField label="Position">
                    <input value={form.stoppagePosition || ''} placeholder="e.g. Safety Officer, Supervisor"
                      onChange={e => set({ stoppagePosition: e.target.value })}
                      className={glassInput} />
                  </FormField>
                  <FormField label="Accepted By">
                    <input value={form.acceptedBy || ''} placeholder="Name & position of person accepting"
                      onChange={e => set({ acceptedBy: e.target.value })}
                      className={glassInput} />
                  </FormField>
                  <FormField label="SHEQ Checked By">
                    <input value={form.sheqCheckedBy || ''} placeholder="Name & position of SHEQ representative"
                      onChange={e => set({ sheqCheckedBy: e.target.value })}
                      className={glassInput} />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          {tab === 'actions' && (
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="text-center py-10 text-white/25">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-white/35">No corrective actions added yet</p>
                  <button type="button" onClick={addAction}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
                    <Plus className="h-3.5 w-3.5" /> Add First Action
                  </button>
                </div>
              ) : (
                <>
                  {actions.map((a, i) => (
                    <CorrectiveActionCard key={a.id} action={a} index={i}
                      onChange={updateAction} onRemove={removeAction} />
                  ))}
                  <button type="button" onClick={addAction}
                    className="w-full py-2 rounded-xl text-xs text-white/35 hover:text-[#86BBD8] border border-dashed border-white/10 hover:border-[#86BBD8]/30 transition-all inline-flex items-center justify-center gap-1.5">
                    <Plus className="h-3 w-3" /> Add Another Action
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Summary ── */}
          {tab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', value: pendingCount, color: '#f59e0b' },
                  { label: 'In Progress', value: inProgressCount, color: '#60a5fa' },
                  { label: 'Completed', value: completedCount, color: '#34d399' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl p-3 bg-white/[0.04] border border-white/[0.07]">
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-white/45 mb-1.5">
                  <span>Overall Progress</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#2A4D69,#34d399)' }} />
                </div>
              </div>
              {actions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Action Items</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {actions.map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04]">
                        <span className="text-[10px] text-white/30 w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 truncate">{a.finding || 'No finding'}</p>
                          <p className="text-[10px] text-white/30">Due: {fmtDate(a.byWhen)}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ModalActions
          onCancel={onClose}
          submitLabel={report ? 'Update Stoppage' : 'Issue Work Stoppage'}
          submitting={saving}
        />
      </form>
    </SafetyModal>
  );
}

// ─── REPORT DETAIL MODAL ──────────────────────────────────────────────────────

function ReportDetailModal({
  report, open, onClose, onEdit,
}: {
  report: WorkStoppageReport | null; open: boolean;
  onClose: () => void; onEdit: (r: WorkStoppageReport) => void;
}) {
  if (!report) return null;
  const ACCENT = '#f43f5e';
  const actions = report.correctiveActions || [];
  const completedCount = actions.filter(a => a.status === 'Completed').length;
  const pct = actions.length ? Math.round((completedCount / actions.length) * 100) : 0;
  const SectionIcon = SECTION_ICON[report.section];
  const sectionColor = SECTION_COLOR[report.section];

  return (
    <SafetyModal open={open} onClose={onClose} title="Work Stoppage Report"
      icon={Octagon} width="max-w-2xl" accentColor={ACCENT}>
      <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* Section + date row */}
        <div className="flex items-center gap-3">
          <SectionBadge section={report.section} />
          <span className="text-xs text-white/35">{fmtDate(report.date)}</span>
          <span className="text-xs text-white/25 ml-auto">ID: {report.id.slice(0, 8)}</span>
        </div>

        {/* Progress */}
        {actions.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-white/45 mb-1">
              <span>Corrective Action Progress</span>
              <span>{completedCount}/{actions.length} completed ({pct}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#34d399' }} />
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Department', value: report.department },
            { label: 'Section', value: report.section },
            { label: 'Issued By', value: report.stoppageBy },
            { label: 'Position', value: report.stoppagePosition || 'N/A' },
            { label: 'Accepted By', value: report.acceptedBy || 'N/A' },
            { label: 'SHEQ Checked By', value: report.sheqCheckedBy || 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-white/75 text-xs">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Description */}
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-xs text-white/65 leading-relaxed whitespace-pre-wrap">{report.description}</p>
        </div>

        {report.investigationFindings && (
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">Investigation Findings</p>
            <p className="text-xs text-white/65 leading-relaxed whitespace-pre-wrap">{report.investigationFindings}</p>
          </div>
        )}

        {actions.length > 0 && (
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Corrective Actions ({actions.length})</p>
            <div className="space-y-2">
              {actions.map((a, idx) => (
                <div key={a.id} className="rounded-xl p-3 bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-medium text-white/75">#{idx + 1} {a.finding}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-white/45 mb-2">{a.action}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/35">
                    <span>By: {a.byWho}</span>
                    <span>Due: {fmtDate(a.byWhen)}</span>
                    {a.completedDate && <span className="col-span-2">Completed: {fmtDate(a.completedDate)}</span>}
                  </div>
                  {a.remarks && <p className="text-[11px] text-white/30 italic mt-1">&ldquo;{a.remarks}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-white/[0.08] flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
          Close
        </button>
        <button type="button" onClick={() => { onClose(); onEdit(report); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
    </SafetyModal>
  );
}

// ─── REPORT CARD (grid) ───────────────────────────────────────────────────────

function ReportCard({
  report, expanded, onToggle, onView, onEdit, onDelete,
}: {
  report: WorkStoppageReport; expanded: boolean;
  onToggle: () => void; onView: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const SIcon = SECTION_ICON[report.section];
  const sColor = SECTION_COLOR[report.section];
  const actions = report.correctiveActions || [];
  const pendingCount = actions.filter(a => a.status === 'Pending').length;
  const completedCount = actions.filter(a => a.status === 'Completed').length;
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = actions.filter(a => a.status !== 'Completed' && a.byWhen && a.byWhen < today).length;

  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-all"
      onClick={e => { if (!(e.target as HTMLElement).closest('button')) onView(); }}>
      {/* Red top stripe */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#f43f5e,#fb923c)' }} />

      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg flex-shrink-0"
            style={{ background: `${sColor}18`, border: `1px solid ${sColor}30` }}>
            <SIcon className="h-4 w-4" style={{ color: sColor }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/30">{report.section} • {fmtDate(report.date)}</p>
            <p className="text-sm font-semibold text-white/90 truncate">{report.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}
            className="h-6 w-6 flex items-center justify-center rounded text-white/25 hover:text-white/70 transition-all">
            {expanded
              ? <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m18 15-6-6-6 6"/></svg>
              : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="px-4 py-2 grid grid-cols-4 gap-1 border-b border-white/[0.05]">
        {[
          { label: 'Actions', value: actions.length, color: '#86BBD8' },
          { label: 'Pending', value: pendingCount, color: '#f59e0b' },
          { label: 'Closed', value: completedCount, color: '#34d399' },
          { label: 'Overdue', value: overdueCount, color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-white/25 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <UserCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{report.stoppageBy}{report.stoppagePosition ? ` — ${report.stoppagePosition}` : ''}</span>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-white/40">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400/60" />
          <span className="line-clamp-2">{report.description}</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
          {report.investigationFindings && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Investigation</p>
              <p className="text-xs text-white/50 line-clamp-3">{report.investigationFindings}</p>
            </div>
          )}
          {actions.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Actions</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {actions.map((a, idx) => (
                  <div key={a.id} className="rounded-lg p-2 bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-white/65">#{idx + 1} {a.finding}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">By: {a.byWho} · Due: {fmtDate(a.byWhen)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-white/25">Accepted By</p>
              <p className="text-white/50">{report.acceptedBy || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25">SHEQ Checked</p>
              <p className="text-white/50">{report.sheqCheckedBy || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex gap-1.5 pt-1">
            {[
              { label: 'View', icon: Eye, fn: onView, color: '#86BBD8' },
              { label: 'Edit', icon: Pencil, fn: onEdit, color: '#86BBD8' },
              { label: 'Delete', icon: Trash2, fn: onDelete, color: '#f43f5e' },
            ].map(({ label, icon: Icon, fn, color }) => (
              <button key={label} type="button" onClick={fn}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-1"
                style={{ color, borderColor: `${color}25`, background: `${color}10` }}>
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function WorkStoppagePage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<WorkStoppageReport[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<WorkStoppageReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkStoppageReport | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setReports(await getReports()); }
    catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); setRefreshing(false); }
  };

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

  const hasFilters = search || sectionFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;

  const toggle = (id: string) => setExpandedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

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
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save'); throw e;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this work stoppage report?')) return;
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Report deleted');
    } catch { toast.error('Failed to delete report'); }
  };

  const ACCENT = '#f43f5e';

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <SafetyHero
          icon={Octagon} title="Work Stoppages"
          subtitle="Document and track unsafe acts, practices, and SHEQ compliance issues"
          accentColor={ACCENT}
          stats={[
            { label: 'Total Reports', value: stats.total, color: ACCENT },
            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
            { label: 'In Progress', value: stats.inProgress, color: '#60a5fa' },
            { label: 'Completed', value: stats.completed, color: '#34d399' },
            { label: 'Overdue', value: stats.overdue, color: '#f43f5e' },
            { label: 'Mechanical', value: stats.mechanical, color: '#86BBD8' },
            { label: 'Electrical', value: stats.electrical, color: '#f59e0b' },
            { label: 'General', value: stats.general, color: '#a78bfa' },
          ]}
          onRefresh={() => load(true)} refreshing={refreshing}
          actions={<AddButton label="Issue Stoppage" icon={Octagon} onClick={() => { setEditingReport(null); setFormOpen(true); }} />}
        />

        {/* Controls */}
        <SafetyControls>
          <SafetySearchBar value={search} onChange={setSearch}
            placeholder="Search by department, description, issued by…" />
          <FilterPills label="Section" value={sectionFilter} onChange={setSectionFilter} accentColor={ACCENT}
            options={[
              { value: 'all', label: 'All' },
              { value: 'Mechanical', label: 'Mechanical' },
              { value: 'Electrical', label: 'Electrical' },
              { value: 'General', label: 'General' },
            ]}
          />
          <FilterPills label="Status" value={statusFilter} onChange={setStatusFilter} accentColor={ACCENT}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          {hasFilters && <ClearFiltersButton onClick={() => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} />}
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" title="Expand all"
              onClick={() => setExpandedIds(new Set(reports.map(r => r.id)))}
              className="h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:text-white/60 transition-all">
              <Maximize2 className="h-3 w-3" /> Expand all
            </button>
            <button type="button" title="Collapse all"
              onClick={() => setExpandedIds(new Set())}
              className="h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:text-white/60 transition-all">
              <Minimize2 className="h-3 w-3" /> Collapse all
            </button>
            {[
              { mode: 'grid', icon: LayoutGrid },
              { mode: 'list', icon: TableIcon },
            ].map(({ mode, icon: Icon }) => (
              <button key={mode} type="button"
                onClick={() => setViewMode(mode as 'grid' | 'list')}
                className="h-7 w-7 flex items-center justify-center rounded-lg border transition-all"
                style={viewMode === mode
                  ? { background: `${ACCENT}20`, borderColor: `${ACCENT}35`, color: ACCENT }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </SafetyControls>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading work stoppages…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Octagon}
            title={hasFilters ? 'No reports match your filters' : 'No work stoppages issued'}
            message={hasFilters ? 'Try adjusting your filters' : 'Issue a work stoppage to document unsafe acts or practices'}
            onAdd={() => { setEditingReport(null); setFormOpen(true); }}
            addLabel="Issue Work Stoppage"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(report => (
              <ReportCard key={report.id}
                report={report}
                expanded={expandedIds.has(report.id)}
                onToggle={() => toggle(report.id)}
                onView={() => { setSelectedReport(report); setDetailOpen(true); }}
                onEdit={() => { setEditingReport(report); setFormOpen(true); }}
                onDelete={() => handleDelete(report.id)}
              />
            ))}
          </div>
        ) : (
          <SafetyPanel label="Work Stoppages" count={filtered.length}>
            <SafetyTable headers={[
              { label: '' },
              { label: 'Department' },
              { label: 'Section' },
              { label: 'Issued By' },
              { label: 'Date' },
              { label: 'Actions' },
              { label: '', className: 'px-3 text-right' },
            ]}>
              {filtered.map(report => {
                const actions = report.correctiveActions || [];
                const completedCount = actions.filter(a => a.status === 'Completed').length;
                return (
                  <React.Fragment key={report.id}>
                    <tr className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => { setSelectedReport(report); setDetailOpen(true); }}>
                      <td className="pl-3 pr-1 py-3 w-6">
                        <button type="button" onClick={e => { e.stopPropagation(); toggle(report.id); }}
                          className="h-5 w-5 flex items-center justify-center text-white/25 hover:text-white/60 transition-all">
                          {expandedIds.has(report.id)
                            ? <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m18 15-6-6-6 6"/></svg>
                            : <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
                          }
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-white/80 font-medium max-w-[160px] truncate">{report.department}</td>
                      <td className="px-3 py-3"><SectionBadge section={report.section} /></td>
                      <td className="px-3 py-3 text-xs text-white/55 max-w-[140px] truncate">{report.stoppageBy}</td>
                      <td className="px-3 py-3 text-xs text-white/55 whitespace-nowrap">{fmtDate(report.date)}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className="text-white/70 font-semibold">{actions.length}</span>
                        <span className="text-white/30 ml-1">({completedCount} done)</span>
                      </td>
                      <td className="px-3 py-3">
                        <RowActions
                          onEdit={() => { setEditingReport(report); setFormOpen(true); }}
                          onDelete={() => handleDelete(report.id)}
                        />
                      </td>
                    </tr>
                    {expandedIds.has(report.id) && (
                      <tr className="bg-white/[0.015]">
                        <td colSpan={7} className="px-5 py-3">
                          <p className="text-xs text-white/55 mb-2 line-clamp-2">{report.description}</p>
                          {actions.length > 0 && (
                            <div className="space-y-1.5">
                              {actions.map((a, idx) => (
                                <div key={a.id} className="flex items-center gap-3">
                                  <span className="text-[10px] text-white/25 w-4">#{idx + 1}</span>
                                  <span className="text-xs text-white/55 flex-1 truncate">{a.finding}</span>
                                  <span className="text-[10px] text-white/30">Due: {fmtDate(a.byWhen)}</span>
                                  <StatusBadge status={a.status} />
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
            </SafetyTable>
          </SafetyPanel>
        )}

        {/* Modals */}
        <ReportFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingReport(null); }}
          onSave={handleSave}
          report={editingReport}
        />
        <ReportDetailModal
          report={selectedReport}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onEdit={r => { setEditingReport(r); setFormOpen(true); }}
        />
      </main>
    </PageShell>
  );
}
