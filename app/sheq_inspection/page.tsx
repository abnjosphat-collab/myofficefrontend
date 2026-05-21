'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Plus, Trash2, MapPin, UserCircle,
  FileText, Eye, Pencil, LayoutGrid, Table as TableIcon,
  Maximize2, Minimize2, Wrench, Zap, AlertTriangle,
  CheckCircle2, Clock3, XCircle, Target, Loader2,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import {
  safetyFetch, glassInput, glassLabel, glassTextarea, glassSelect,
  StatusBadge, PriorityBadge, SectionBadge,
  LoadingState, EmptyState,
  SafetyHero, SafetyControls, SafetySearchBar, FilterPills,
  DateRangeFilter, ClearFiltersButton,
  SafetyPanel, SafetyTable, SafetyModal, FormField, ModalActions,
  RowActions, TabBar, AddButton,
} from '@/components/safety';
import { usePageCollapse, MasterCollapseButton } from '@/components/shared';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type SectionType = 'mechanical' | 'electrical';
type PriorityType = 'low' | 'medium' | 'high' | 'critical';
type FindingStatus = 'open' | 'in-progress' | 'closed' | 'overdue';
type InspectionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface InspectionFinding {
  id: string;
  finding: string;
  requiredAction: string;
  byWho: string;
  byWhen: string;
  status: FindingStatus;
  priority: PriorityType;
  section: SectionType;
  completedDate?: string;
  remarks?: string;
}

interface SHEQFormData {
  id: string;
  inspectors: string;
  title: string;
  place: string;
  date: string;
  time: string;
  department: string;
  section: SectionType;
  findings: InspectionFinding[];
  hodName: string;
  sheqOfficialName: string;
  hodSignature?: string;
  sheqSignature?: string;
  status: InspectionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTIONS: SectionType[] = ['mechanical', 'electrical'];
const SECTION_LABELS: Record<SectionType, string> = { mechanical: 'Mechanical', electrical: 'Electrical' };
const PRIORITIES: PriorityType[] = ['low', 'medium', 'high', 'critical'];
const FINDING_STATUSES: FindingStatus[] = ['open', 'in-progress', 'closed', 'overdue'];

// ─── API ──────────────────────────────────────────────────────────────────────

async function getInspections(params?: Record<string, string>): Promise<SHEQFormData[]> {
  const q = new URLSearchParams(params).toString();
  return safetyFetch<SHEQFormData[]>(`/sheq/${q ? '?' + q : ''}`);
}
async function createInspection(data: Partial<SHEQFormData>): Promise<SHEQFormData> {
  return safetyFetch<SHEQFormData>('/sheq/', { method: 'POST', body: JSON.stringify(data) });
}
async function updateInspection(id: string, data: Partial<SHEQFormData>): Promise<SHEQFormData> {
  return safetyFetch<SHEQFormData>(`/sheq/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
async function deleteInspection(id: string): Promise<void> {
  await safetyFetch(`/sheq/${id}`, { method: 'DELETE' });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const newFinding = (section: SectionType = 'mechanical'): InspectionFinding => ({
  id: uid(), finding: '', requiredAction: '', byWho: '', byWhen: '',
  status: 'open', priority: 'medium', section,
});
const blankForm = (): Partial<SHEQFormData> => ({
  inspectors: '', title: '', place: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  department: '', section: 'mechanical', findings: [],
  hodName: '', sheqOfficialName: '', status: 'draft',
});

// ─── FINDING FORM (inside modal) ──────────────────────────────────────────────

function FindingFormCard({
  finding, index, onChange, onRemove,
}: {
  finding: InspectionFinding; index: number;
  onChange: (id: string, field: keyof InspectionFinding, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl p-4 bg-white/[0.04] border border-white/[0.08] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
          Finding #{index + 1}
        </span>
        <button type="button" title="Remove finding" onClick={() => onRemove(finding.id)}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div>
        <label className={glassLabel}>Finding Description *</label>
        <textarea value={finding.finding} rows={2} placeholder="Describe the issue or finding…"
          onChange={e => onChange(finding.id, 'finding', e.target.value)}
          className={glassTextarea} />
      </div>
      <div>
        <label className={glassLabel}>Required Action *</label>
        <textarea value={finding.requiredAction} rows={2} placeholder="What corrective action is required?"
          onChange={e => onChange(finding.id, 'requiredAction', e.target.value)}
          className={glassTextarea} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={glassLabel}>Assigned To *</label>
          <input value={finding.byWho} placeholder="Person responsible"
            onChange={e => onChange(finding.id, 'byWho', e.target.value)}
            className={glassInput} />
        </div>
        <div>
          <label className={glassLabel}>Due Date *</label>
          <input type="date" value={finding.byWhen} title="Due date" placeholder="Due date"
            onChange={e => onChange(finding.id, 'byWhen', e.target.value)}
            className={glassInput} style={{ colorScheme: 'dark' }} />
        </div>
        <div>
          <label className={glassLabel}>Priority</label>
          <select value={finding.priority} title="Priority"
            onChange={e => onChange(finding.id, 'priority', e.target.value)}
            className={glassSelect} style={{ colorScheme: 'dark' }}>
            {PRIORITIES.map(p => <option key={p} value={p} className="bg-[#0a1628] capitalize">{p}</option>)}
          </select>
        </div>
        <div>
          <label className={glassLabel}>Status</label>
          <select value={finding.status} title="Finding status"
            onChange={e => onChange(finding.id, 'status', e.target.value)}
            className={glassSelect} style={{ colorScheme: 'dark' }}>
            {FINDING_STATUSES.map(s => <option key={s} value={s} className="bg-[#0a1628] capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label className={glassLabel}>Section</label>
          <select value={finding.section} title="Section"
            onChange={e => onChange(finding.id, 'section', e.target.value)}
            className={glassSelect} style={{ colorScheme: 'dark' }}>
            {SECTIONS.map(s => <option key={s} value={s} className="bg-[#0a1628]">{SECTION_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={glassLabel}>Completed Date</label>
          <input type="date" value={finding.completedDate || ''} title="Completed date" placeholder="Completed date"
            disabled={finding.status !== 'closed'}
            onChange={e => onChange(finding.id, 'completedDate', e.target.value)}
            className={glassInput + (finding.status !== 'closed' ? ' opacity-30 cursor-not-allowed' : '')}
            style={{ colorScheme: 'dark' }} />
        </div>
      </div>
      <div>
        <label className={glassLabel}>Remarks</label>
        <textarea value={finding.remarks || ''} rows={2} placeholder="Additional remarks…"
          onChange={e => onChange(finding.id, 'remarks', e.target.value)}
          className={glassTextarea} />
      </div>
    </div>
  );
}

// ─── INSPECTION FORM MODAL ────────────────────────────────────────────────────

function InspectionFormModal({
  open, onClose, onSave, inspection,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<SHEQFormData>) => Promise<void>;
  inspection?: SHEQFormData | null;
}) {
  const [form, setForm] = useState<Partial<SHEQFormData>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('basic');

  useEffect(() => {
    setForm(inspection ? { ...inspection, findings: inspection.findings || [] } : blankForm());
    setTab('basic');
  }, [inspection, open]);

  const set = (patch: Partial<SHEQFormData>) => setForm(prev => ({ ...prev, ...patch }));

  const addFinding = () => set({ findings: [...(form.findings || []), newFinding(form.section)] });
  const updateFinding = (id: string, field: keyof InspectionFinding, value: string) =>
    set({ findings: form.findings?.map(f => f.id === id ? { ...f, [field]: value } : f) });
  const removeFinding = (id: string) =>
    set({ findings: form.findings?.filter(f => f.id !== id) });

  const validate = () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return false; }
    if (!form.inspectors?.trim()) { toast.error('Inspector name(s) are required'); return false; }
    if (!form.place?.trim()) { toast.error('Location is required'); return false; }
    if (!form.date) { toast.error('Date is required'); return false; }
    if (!form.time) { toast.error('Time is required'); return false; }
    for (let i = 0; i < (form.findings?.length || 0); i++) {
      const f = form.findings![i];
      if (!f.finding?.trim()) { toast.error(`Finding #${i+1}: Description required`); setTab('findings'); return false; }
      if (!f.requiredAction?.trim()) { toast.error(`Finding #${i+1}: Required action needed`); setTab('findings'); return false; }
      if (!f.byWho?.trim()) { toast.error(`Finding #${i+1}: Assigned person required`); setTab('findings'); return false; }
      if (!f.byWhen) { toast.error(`Finding #${i+1}: Due date required`); setTab('findings'); return false; }
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

  const ACCENT = '#86BBD8';
  const findingCount = form.findings?.length || 0;

  return (
    <SafetyModal open={open} onClose={onClose}
      title={inspection ? 'Edit Inspection' : 'New Inspection'}
      icon={ClipboardCheck} width="max-w-3xl" accentColor={ACCENT}>
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <TabBar
            active={tab} onChange={setTab} accentColor={ACCENT}
            tabs={[
              { id: 'basic', label: 'Basic Info' },
              { id: 'findings', label: `Findings (${findingCount})` },
              { id: 'signoff', label: 'Sign-off' },
            ]}
          />
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── Basic Info ── */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Inspection Title" required className="md:col-span-2">
                  <input value={form.title || ''} placeholder="e.g. Monthly Safety Audit"
                    onChange={e => set({ title: e.target.value })}
                    className={glassInput} />
                </FormField>
                <FormField label="Inspector(s)" required className="md:col-span-2">
                  <input value={form.inspectors || ''} placeholder="John Doe, Jane Smith"
                    onChange={e => set({ inspectors: e.target.value })}
                    className={glassInput} />
                  <p className="text-[10px] text-white/25 mt-1">Separate multiple names with commas</p>
                </FormField>
                <FormField label="Location" required>
                  <input value={form.place || ''} placeholder="e.g. Main Warehouse"
                    onChange={e => set({ place: e.target.value })}
                    className={glassInput} />
                </FormField>
                <FormField label="Department">
                  <input value={form.department || ''} placeholder="e.g. Operations"
                    onChange={e => set({ department: e.target.value })}
                    className={glassInput} />
                </FormField>
                <FormField label="Section" required>
                  <select value={form.section || 'mechanical'} title="Section"
                    onChange={e => set({ section: e.target.value as SectionType })}
                    className={glassSelect} style={{ colorScheme: 'dark' }}>
                    {SECTIONS.map(s => <option key={s} value={s} className="bg-[#0a1628]">{SECTION_LABELS[s]}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={form.status || 'draft'} title="Status"
                    onChange={e => set({ status: e.target.value as InspectionStatus })}
                    className={glassSelect} style={{ colorScheme: 'dark' }}>
                    {(['draft','submitted','approved','rejected'] as InspectionStatus[]).map(s => (
                      <option key={s} value={s} className="bg-[#0a1628] capitalize">{s}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Date" required>
                  <input type="date" value={form.date || ''} title="Inspection date" placeholder="Date"
                    onChange={e => set({ date: e.target.value })}
                    className={glassInput} style={{ colorScheme: 'dark' }} />
                </FormField>
                <FormField label="Time" required>
                  <input type="time" value={form.time || ''} title="Inspection time" placeholder="Time"
                    onChange={e => set({ time: e.target.value })}
                    className={glassInput} style={{ colorScheme: 'dark' }} />
                </FormField>
              </div>
            </div>
          )}

          {/* ── Findings ── */}
          {tab === 'findings' && (
            <div className="space-y-3">
              {findingCount === 0 ? (
                <div className="text-center py-10 text-white/25">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-white/35">No findings added yet</p>
                  <button type="button" onClick={addFinding}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
                    <Plus className="h-3.5 w-3.5" /> Add First Finding
                  </button>
                </div>
              ) : (
                <>
                  {form.findings?.map((f, i) => (
                    <FindingFormCard key={f.id} finding={f} index={i}
                      onChange={updateFinding} onRemove={removeFinding} />
                  ))}
                  <button type="button" onClick={addFinding}
                    className="w-full py-2 rounded-xl text-xs text-white/35 hover:text-[#86BBD8] border border-dashed border-white/10 hover:border-[#86BBD8]/30 transition-all inline-flex items-center justify-center gap-1.5">
                    <Plus className="h-3 w-3" /> Add Another Finding
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Sign-off ── */}
          {tab === 'signoff' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Head of Department Name">
                  <input value={form.hodName || ''} placeholder="e.g. Peter Moyo"
                    onChange={e => set({ hodName: e.target.value })}
                    className={glassInput} />
                </FormField>
                <FormField label="SHEQ Official Name">
                  <input value={form.sheqOfficialName || ''} placeholder="e.g. Sarah Johnson"
                    onChange={e => set({ sheqOfficialName: e.target.value })}
                    className={glassInput} />
                </FormField>
              </div>
              <p className="text-[11px] text-white/25">Signatures will be captured after submission / approval.</p>
            </div>
          )}
        </div>

        <ModalActions
          onCancel={onClose}
          submitLabel={inspection ? 'Update Inspection' : 'Create Inspection'}
          submitting={saving}
        />
      </form>
    </SafetyModal>
  );
}

// ─── INSPECTION DETAIL MODAL ──────────────────────────────────────────────────

function InspectionDetailModal({
  inspection, open, onClose, onEdit,
}: {
  inspection: SHEQFormData | null; open: boolean;
  onClose: () => void; onEdit: (i: SHEQFormData) => void;
}) {
  if (!inspection) return null;
  const ACCENT = '#86BBD8';
  return (
    <SafetyModal open={open} onClose={onClose} title="Inspection Report"
      icon={ClipboardCheck} width="max-w-2xl" accentColor={ACCENT}>
      <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* Header fields */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Inspectors', value: inspection.inspectors },
            { label: 'Department', value: inspection.department || 'N/A' },
            { label: 'Location', value: inspection.place },
            { label: 'Date & Time', value: `${fmtDate(inspection.date)} at ${inspection.time}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-white/80">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Section</p>
            <SectionBadge section={SECTION_LABELS[inspection.section]} />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Status</p>
            <StatusBadge status={inspection.status} />
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Findings */}
        <div>
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Findings & Actions ({inspection.findings?.length || 0})
          </h3>
          {inspection.findings?.length ? (
            <div className="space-y-3">
              {inspection.findings.map((f, idx) => (
                <div key={f.id} className="rounded-xl p-3 bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-white/80">#{idx + 1} {f.finding}</p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <PriorityBadge priority={f.priority} />
                      <StatusBadge status={f.status} />
                    </div>
                  </div>
                  <p className="text-xs text-white/45 mb-2">{f.requiredAction}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-white/40">
                    <span><span className="text-white/25">By:</span> {f.byWho}</span>
                    <span><span className="text-white/25">Due:</span> {fmtDate(f.byWhen)}</span>
                    {f.completedDate && <span><span className="text-white/25">Done:</span> {fmtDate(f.completedDate)}</span>}
                  </div>
                  {f.remarks && <p className="text-xs text-white/35 mt-1">{f.remarks}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/25 italic">No findings recorded for this inspection.</p>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Sign-off boxes */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Head of Department', name: inspection.hodName, sig: inspection.hodSignature },
            { label: 'SHEQ Official', name: inspection.sheqOfficialName, sig: inspection.sheqSignature },
          ].map(({ label, name, sig }) => (
            <div key={label}>
              <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
              <div className="rounded-xl border border-white/[0.10] p-3 text-center min-h-[52px] flex items-center justify-center">
                {sig
                  ? <img src={sig} alt={`${label} signature`} className="max-h-10 mx-auto" />
                  : <p className="text-xs text-white/30 italic">{name || 'Not signed'}</p>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.08] flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
          Close
        </button>
        <button type="button"
          onClick={() => { onClose(); onEdit(inspection); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#2A4D69,#1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
    </SafetyModal>
  );
}

// ─── INSPECTION CARD (grid view) ──────────────────────────────────────────────

function InspectionCard({
  inspection, index, expanded, onToggle, onView, onEdit, onDelete,
}: {
  inspection: SHEQFormData; index: number; expanded: boolean;
  onToggle: () => void; onView: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const isElec = inspection.section === 'electrical';
  const SectionIcon = isElec ? Zap : Wrench;
  const sectionColor = isElec ? '#f59e0b' : '#86BBD8';

  const openCount = inspection.findings?.filter(f => f.status !== 'closed').length || 0;
  const closedCount = inspection.findings?.filter(f => f.status === 'closed').length || 0;
  const criticalCount = inspection.findings?.filter(f => f.priority === 'critical').length || 0;

  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-all"
      onClick={e => { if (!(e.target as HTMLElement).closest('button')) onView(); }}>
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg flex-shrink-0"
            style={{ background: `${sectionColor}18`, border: `1px solid ${sectionColor}30` }}>
            <SectionIcon className="h-4 w-4" style={{ color: sectionColor }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/30">#{index + 1}</p>
            <p className="text-sm font-semibold text-white/90 truncate">{inspection.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge status={inspection.status} />
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
          { label: 'Total', value: inspection.findings?.length || 0, color: '#86BBD8' },
          { label: 'Open', value: openCount, color: '#f59e0b' },
          { label: 'Closed', value: closedCount, color: '#34d399' },
          { label: 'Critical', value: criticalCount, color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-white/25 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Basic info */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <UserCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{inspection.inspectors}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{inspection.place}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{fmtDate(inspection.date)} at {inspection.time}</span>
        </div>
      </div>

      {/* Expanded findings */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
          {inspection.findings?.length ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {inspection.findings.map((f, idx) => (
                <div key={f.id} className="rounded-lg p-2.5 bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-white/75">{idx + 1}. {f.finding}</p>
                    <PriorityBadge priority={f.priority} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-white/35">
                    <span>By: {f.byWho}</span>
                    <span>Due: {fmtDate(f.byWhen)}</span>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/25 italic">No findings recorded</p>
          )}

          {/* Sign-off names */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-white/25">HOD</p>
              <p className="text-white/55">{inspection.hodName || 'Pending'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25">SHEQ Official</p>
              <p className="text-white/55">{inspection.sheqOfficialName || 'Pending'}</p>
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

export default function SHEQInspectionPage() {
  const sections = usePageCollapse({ stats: false, records: false });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inspections, setInspections] = useState<SHEQFormData[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedInspection, setSelectedInspection] = useState<SHEQFormData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<SHEQFormData | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const data = await getInspections();
      setInspections(data);
    } catch {
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Stats
  const stats = useMemo(() => {
    const totFindings = inspections.flatMap(i => i.findings || []);
    return {
      total: inspections.length,
      open: totFindings.filter(f => f.status === 'open').length,
      inProgress: totFindings.filter(f => f.status === 'in-progress').length,
      closed: totFindings.filter(f => f.status === 'closed').length,
      overdue: totFindings.filter(f => f.status === 'overdue').length,
      critical: totFindings.filter(f => f.priority === 'critical').length,
      mechanical: inspections.filter(i => i.section === 'mechanical').length,
      electrical: inspections.filter(i => i.section === 'electrical').length,
    };
  }, [inspections]);

  // Filtered
  const filtered = useMemo(() => inspections.filter(i => {
    const s = search.toLowerCase();
    if (s && !i.title?.toLowerCase().includes(s) && !i.inspectors?.toLowerCase().includes(s) && !i.place?.toLowerCase().includes(s)) return false;
    if (sectionFilter !== 'all' && i.section !== sectionFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (dateFrom && i.date < dateFrom) return false;
    if (dateTo && i.date > dateTo) return false;
    return true;
  }), [inspections, search, sectionFilter, statusFilter, dateFrom, dateTo]);

  const hasFilters = search || sectionFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;

  const toggle = (id: string) => setExpandedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleSave = async (data: Partial<SHEQFormData>) => {
    try {
      if (editingInspection) {
        const updated = await updateInspection(editingInspection.id, data);
        setInspections(prev => prev.map(i => i.id === updated.id ? updated : i));
        toast.success('Inspection updated');
      } else {
        const created = await createInspection(data);
        setInspections(prev => [created, ...prev]);
        toast.success('Inspection created');
      }
      setFormOpen(false);
      setEditingInspection(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save inspection');
      throw e;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection?')) return;
    try {
      await deleteInspection(id);
      setInspections(prev => prev.filter(i => i.id !== id));
      toast.success('Inspection deleted');
    } catch {
      toast.error('Failed to delete inspection');
    }
  };

  const ACCENT = '#86BBD8';

  const heroStats = [
    { label: 'Inspections', value: stats.total, color: ACCENT },
    { label: 'Open Findings', value: stats.open, color: '#f59e0b' },
    { label: 'In Progress', value: stats.inProgress, color: '#60a5fa' },
    { label: 'Closed', value: stats.closed, color: '#34d399' },
    { label: 'Overdue', value: stats.overdue, color: '#f43f5e' },
    { label: 'Critical', value: stats.critical, color: '#f43f5e' },
    { label: 'Mechanical', value: stats.mechanical, color: '#86BBD8' },
    { label: 'Electrical', value: stats.electrical, color: '#f59e0b' },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <SafetyHero
          icon={ClipboardCheck} title="SHEQ Inspections"
          subtitle="Safety, Health, Environment &amp; Quality compliance tracking"
          accentColor={ACCENT} stats={heroStats}
          onRefresh={() => load(true)} refreshing={refreshing}
          showStats={sections.expanded.stats} onToggleStats={() => sections.toggle('stats')}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MasterCollapseButton collapse={sections} /><AddButton label="New Inspection" onClick={() => { setEditingInspection(null); setFormOpen(true); }} /></div>
          }
        />

        {sections.expanded.records && <>
        {/* Controls */}
        <SafetyControls>
          <SafetySearchBar value={search} onChange={setSearch}
            placeholder="Search by title, inspector, location…" />
          <FilterPills label="Section" value={sectionFilter} onChange={setSectionFilter}
            accentColor={ACCENT}
            options={[{ value: 'all', label: 'All' }, { value: 'mechanical', label: 'Mechanical' }, { value: 'electrical', label: 'Electrical' }]}
          />
          <FilterPills label="Status" value={statusFilter} onChange={setStatusFilter}
            accentColor={ACCENT}
            options={[
              { value: 'all', label: 'All' }, { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted' }, { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          {hasFilters && <ClearFiltersButton onClick={() => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} />}
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" title="Expand all" onClick={() => setExpandedIds(new Set(inspections.map(i => i.id)))}
              className="h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:text-white/60 transition-all">
              <Maximize2 className="h-3 w-3" /> Expand all
            </button>
            <button type="button" title="Collapse all" onClick={() => setExpandedIds(new Set())}
              className="h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg bg-white/[0.05] border border-white/10 text-white/40 hover:text-white/60 transition-all">
              <Minimize2 className="h-3 w-3" /> Collapse all
            </button>
            <button type="button" title="Grid view"
              onClick={() => setViewMode('grid')}
              className="h-7 w-7 flex items-center justify-center rounded-lg border transition-all"
              style={viewMode === 'grid'
                ? { background: `${ACCENT}20`, borderColor: `${ACCENT}35`, color: ACCENT }
                : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="List view"
              onClick={() => setViewMode('list')}
              className="h-7 w-7 flex items-center justify-center rounded-lg border transition-all"
              style={viewMode === 'list'
                ? { background: `${ACCENT}20`, borderColor: `${ACCENT}35`, color: ACCENT }
                : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }}>
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </SafetyControls>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading inspections…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardCheck}
            title={hasFilters ? 'No inspections match your filters' : 'No inspections yet'}
            message={hasFilters ? 'Try adjusting your filters' : 'Create your first inspection to get started'}
            onAdd={() => { setEditingInspection(null); setFormOpen(true); }}
            addLabel="New Inspection"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((inspection, idx) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                index={idx}
                expanded={expandedIds.has(inspection.id)}
                onToggle={() => toggle(inspection.id)}
                onView={() => { setSelectedInspection(inspection); setDetailOpen(true); }}
                onEdit={() => { setEditingInspection(inspection); setFormOpen(true); }}
                onDelete={() => handleDelete(inspection.id)}
              />
            ))}
          </div>
        ) : (
          /* List view */
          <SafetyPanel label="Inspections" count={filtered.length}>
            <SafetyTable headers={[
              { label: '' },
              { label: 'Title' },
              { label: 'Inspector(s)' },
              { label: 'Section' },
              { label: 'Location' },
              { label: 'Date' },
              { label: 'Findings' },
              { label: 'Status' },
              { label: '', className: 'px-3 text-right' },
            ]}>
              {filtered.map(inspection => (
                <React.Fragment key={inspection.id}>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => { setSelectedInspection(inspection); setDetailOpen(true); }}>
                    <td className="pl-3 pr-1 py-3 w-6">
                      <button type="button" title={expandedIds.has(inspection.id) ? 'Collapse' : 'Expand'}
                        onClick={e => { e.stopPropagation(); toggle(inspection.id); }}
                        className="h-5 w-5 flex items-center justify-center text-white/25 hover:text-white/60 transition-all">
                        {expandedIds.has(inspection.id)
                          ? <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m18 15-6-6-6 6"/></svg>
                          : <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
                        }
                      </button>
                    </td>
                    <td className="px-3 py-3 text-sm text-white/80 font-medium max-w-[180px] truncate">{inspection.title}</td>
                    <td className="px-3 py-3 text-xs text-white/55 max-w-[140px] truncate">{inspection.inspectors}</td>
                    <td className="px-3 py-3"><SectionBadge section={SECTION_LABELS[inspection.section]} /></td>
                    <td className="px-3 py-3 text-xs text-white/55 max-w-[120px] truncate">{inspection.place}</td>
                    <td className="px-3 py-3 text-xs text-white/55 whitespace-nowrap">{fmtDate(inspection.date)}</td>
                    <td className="px-3 py-3 text-xs">
                      <span className="text-white/70 font-semibold">{inspection.findings?.length || 0}</span>
                      <span className="text-white/30 ml-1">({inspection.findings?.filter(f => f.status === 'closed').length || 0} closed)</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={inspection.status} /></td>
                    <td className="px-3 py-3">
                      <RowActions
                        onEdit={() => { setEditingInspection(inspection); setFormOpen(true); }}
                        onDelete={() => handleDelete(inspection.id)}
                      />
                    </td>
                  </tr>
                  {expandedIds.has(inspection.id) && (
                    <tr className="bg-white/[0.015]">
                      <td colSpan={9} className="px-5 py-3">
                        {inspection.findings?.length ? (
                          <div className="space-y-2">
                            {inspection.findings.map((f, idx) => (
                              <div key={f.id} className="pl-3 border-l-2 space-y-0.5" style={{ borderColor: `${ACCENT}40` }}>
                                <p className="text-xs font-medium text-white/75">#{idx + 1}: {f.finding}</p>
                                <p className="text-[11px] text-white/40">{f.requiredAction}</p>
                                <div className="flex gap-3 items-center mt-0.5">
                                  <span className="text-[10px] text-white/30">By: {f.byWho}</span>
                                  <span className="text-[10px] text-white/30">Due: {fmtDate(f.byWhen)}</span>
                                  <PriorityBadge priority={f.priority} />
                                  <StatusBadge status={f.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/25 italic">No findings recorded</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </SafetyTable>
          </SafetyPanel>
        )}
        </>}

        {/* Modals */}
        <InspectionFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingInspection(null); }}
          onSave={handleSave}
          inspection={editingInspection}
        />
        <InspectionDetailModal
          inspection={selectedInspection}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onEdit={i => { setEditingInspection(i); setFormOpen(true); }}
        />
      </main>
    </PageShell>
  );
}
