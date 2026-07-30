'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '@/lib/format';
import {
  ClipboardCheck, Plus, Trash2, MapPin, UserCircle,
  FileText, Eye, Pencil, LayoutGrid, Table as TableIcon,
  Maximize2, Minimize2, Wrench, Zap, AlertTriangle,
  Clock3, XCircle, Target, Loader2, RefreshCw, ChevronUp, ChevronDown, X,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ACCENT_HEX, ViewToggle, GlowCard, SelectField, useConfirm,
} from '@/components/shared/theme';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { EmployeeNameInput } from '@/components/shared/EmployeeNameInput';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { SectionType, PriorityType, FindingStatus, InspectionStatus, InspectionFinding, SHEQFormData } from './types';
import { useSheqInspectionData, createInspection, updateInspection, deleteInspection } from './useSheqInspectionData';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTIONS: SectionType[] = ['mechanical', 'electrical'];
const SECTION_LABELS: Record<SectionType, string> = { mechanical: 'Mechanical', electrical: 'Electrical' };
const PRIORITIES: PriorityType[] = ['low', 'medium', 'high', 'critical'];
const FINDING_STATUSES: FindingStatus[] = ['open', 'in-progress', 'closed', 'overdue'];
const PRIORITY_HEX: Record<PriorityType, string> = { low: '#34d399', medium: '#fbbf24', high: '#f97316', critical: '#f43f5e' };
const FINDING_STATUS_HEX: Record<FindingStatus, string> = { open: '#f59e0b', 'in-progress': '#60a5fa', closed: '#34d399', overdue: '#f43f5e' };
const INSPECTION_STATUS_HEX: Record<InspectionStatus, string> = { draft: '#94a3b8', submitted: '#3b82f6', approved: '#34d399', rejected: '#f43f5e' };
const ACCENT = '#86BBD8';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 11);
const fmtDate = (d: string) => (d ? formatDate(d) : '');
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
  before_photos: [], after_photos: [],
});

// ─── FINDING FORM CARD ─────────────────────────────────────────────────────────

function FindingFormCard({
  finding, index, onChange, onRemove,
}: {
  finding: InspectionFinding; index: number;
  onChange: (id: string, field: keyof InspectionFinding, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTheme();
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;
  return (
    <div className={`rounded-xl p-4 ${t.chipBg} border ${t.border} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Finding #{index + 1}</span>
        <button type="button" title="Remove finding" onClick={() => onRemove(finding.id)}
          className={`h-5 w-5 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <FormField label="Finding Description" required>
        <textarea value={finding.finding} rows={2} placeholder="Describe the issue or finding…"
          onChange={e => onChange(finding.id, 'finding', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
      </FormField>
      <FormField label="Required Action" required>
        <textarea value={finding.requiredAction} rows={2} placeholder="What corrective action is required?"
          onChange={e => onChange(finding.id, 'requiredAction', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Assigned To" required>
          <input value={finding.byWho} placeholder="Person responsible" title="Assigned to"
            onChange={e => onChange(finding.id, 'byWho', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Due Date" required>
          <input type="date" value={finding.byWhen} title="Due date"
            onChange={e => onChange(finding.id, 'byWhen', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Priority">
          <SelectField size="form" value={finding.priority} title="Priority"
            onChange={v => onChange(finding.id, 'priority', v)}
            options={PRIORITIES.map(p => ({ value: p, label: p }))} />
        </FormField>
        <FormField label="Status">
          <SelectField size="form" value={finding.status} title="Finding status"
            onChange={v => onChange(finding.id, 'status', v)}
            options={FINDING_STATUSES.map(s => ({ value: s, label: s }))} />
        </FormField>
        <FormField label="Section">
          <SelectField size="form" value={finding.section} title="Section"
            onChange={v => onChange(finding.id, 'section', v)}
            options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))} />
        </FormField>
        <FormField label="Completed Date">
          <input type="date" value={finding.completedDate || ''} title="Completed date"
            disabled={finding.status !== 'closed'}
            onChange={e => onChange(finding.id, 'completedDate', e.target.value)}
            className={`${inputCls} ${finding.status !== 'closed' ? 'opacity-40 cursor-not-allowed' : ''}`} />
        </FormField>
      </div>
      <FormField label="Remarks">
        <textarea value={finding.remarks || ''} rows={2} placeholder="Additional remarks…"
          onChange={e => onChange(finding.id, 'remarks', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
      </FormField>
    </div>
  );
}

// ─── INSPECTION FORM MODAL ──────────────────────────────────────────────────────

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'findings', label: 'Findings' },
  { id: 'photos', label: 'Photos' },
  { id: 'signoff', label: 'Sign-off' },
] as const;

function InspectionFormModal({
  open, onClose, onSave, inspection,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<SHEQFormData>) => Promise<void>;
  inspection?: SHEQFormData | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<Partial<SHEQFormData>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<typeof TABS[number]['id']>('basic');

  useEffect(() => {
    if (!open) return;
    setForm(inspection ? { ...inspection, findings: inspection.findings || [] } : blankForm());
    setTab('basic');
  }, [inspection, open]);

  const set = (patch: Partial<SHEQFormData>) => setForm(prev => ({ ...prev, ...patch }));
  const addFinding = () => set({ findings: [...(form.findings || []), newFinding(form.section)] });
  const updateFinding = (id: string, field: keyof InspectionFinding, value: string) =>
    set({ findings: form.findings?.map(f => f.id === id ? { ...f, [field]: value } : f) });
  const removeFinding = (id: string) => set({ findings: form.findings?.filter(f => f.id !== id) });

  const validate = () => {
    if (!form.title?.trim()) { toast.error('Title is required'); setTab('basic'); return false; }
    if (!form.inspectors?.trim()) { toast.error('Inspector name(s) are required'); setTab('basic'); return false; }
    if (!form.place?.trim()) { toast.error('Location is required'); setTab('basic'); return false; }
    if (!form.date) { toast.error('Date is required'); setTab('basic'); return false; }
    if (!form.time) { toast.error('Time is required'); setTab('basic'); return false; }
    for (let i = 0; i < (form.findings?.length || 0); i++) {
      const f = form.findings![i];
      if (!f.finding?.trim()) { toast.error(`Finding #${i + 1}: Description required`); setTab('findings'); return false; }
      if (!f.requiredAction?.trim()) { toast.error(`Finding #${i + 1}: Required action needed`); setTab('findings'); return false; }
      if (!f.byWho?.trim()) { toast.error(`Finding #${i + 1}: Assigned person required`); setTab('findings'); return false; }
      if (!f.byWhen) { toast.error(`Finding #${i + 1}: Due date required`); setTab('findings'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try { await onSave(form); } catch { /* toast shown in parent */ } finally { setSaving(false); }
  };

  const findingCount = form.findings?.length || 0;
  const photoCount = (form.before_photos?.length || 0) + (form.after_photos?.length || 0);

  return (
    <CenterModal open={open} onClose={onClose} title={inspection ? 'Edit Inspection' : 'New Inspection'} width="max-w-3xl">
      <form onSubmit={handleSubmit}>
        <div className={`px-5 pt-1 pb-3 border-b ${t.border} flex gap-1.5 flex-wrap`}>
          {TABS.map(tb => (
            <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === tb.id ? `${ACCENT_HEX.blue ? 'bg-brand-500/20 text-brand-400' : ''}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`
              }`}>
              {tb.label}{tb.id === 'findings' && findingCount > 0 && ` (${findingCount})`}
              {tb.id === 'photos' && photoCount > 0 && ` (${photoCount})`}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <FormField label="Inspection Title" required>
                  <input value={form.title || ''} placeholder="e.g. Monthly Safety Audit" title="Inspection title"
                    onChange={e => set({ title: e.target.value })}
                    className={`w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`} />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Inspector(s)" required>
                  <EmployeeNameInput
                    value={form.inspectors || ''}
                    onChange={(name, emp) => { set({ inspectors: name }); if (emp?.department) set({ department: emp.department }); }}
                    placeholder="Select or type inspector name(s)…"
                  />
                  <p className={`text-[10px] ${t.textFaint} mt-1`}>Separate multiple names with commas</p>
                </FormField>
              </div>
              <FormField label="Location" required>
                <PredictiveInput historyKey="sheq_location" value={form.place || ''} onChange={v => set({ place: v })}
                  placeholder="e.g. Main Warehouse"
                  hints={['Main Warehouse', 'Workshop', 'Electrical Substation', 'Crusher Bay', 'Processing Plant', 'Pit Area', 'Administration Block']} />
              </FormField>
              <FormField label="Department">
                <PredictiveInput historyKey="sheq_department" value={form.department || ''} onChange={v => set({ department: v })}
                  placeholder="e.g. Engineering"
                  hints={['Engineering', 'Mechanical', 'Electrical', 'Mining', 'Processing', 'Safety', 'HR', 'Administration', 'Operations', 'Maintenance']} />
              </FormField>
              <FormField label="Section" required>
                <SelectField size="form" value={form.section || 'mechanical'} title="Section"
                  onChange={v => set({ section: v as SectionType })}
                  options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))} />
              </FormField>
              <FormField label="Status">
                <SelectField size="form" value={form.status || 'draft'} title="Status"
                  onChange={v => set({ status: v as InspectionStatus })}
                  options={(['draft', 'submitted', 'approved', 'rejected'] as InspectionStatus[]).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
              </FormField>
              <FormField label="Date" required>
                <input type="date" value={form.date || ''} title="Inspection date"
                  onChange={e => set({ date: e.target.value })}
                  className={`w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`} />
              </FormField>
              <FormField label="Time" required>
                <input type="time" value={form.time || ''} title="Inspection time"
                  onChange={e => set({ time: e.target.value })}
                  className={`w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`} />
              </FormField>
            </div>
          )}

          {tab === 'findings' && (
            <div className="space-y-3">
              {findingCount === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No findings added yet" action={{ label: 'Add First Finding', onClick: addFinding }} />
              ) : (
                <>
                  {form.findings?.map((f, i) => (
                    <FindingFormCard key={f.id} finding={f} index={i} onChange={updateFinding} onRemove={removeFinding} />
                  ))}
                  <button type="button" onClick={addFinding}
                    className={`w-full py-2 rounded-xl text-xs ${t.textFaint} hover:text-brand-400 border border-dashed ${t.border} hover:border-brand-400/30 transition-all inline-flex items-center justify-center gap-1.5`}>
                    <Plus className="h-3 w-3" /> Add Another Finding
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div className="space-y-6">
              <PhotoUpload label="Before Inspection" description="State of the area / equipment before work began"
                photos={form.before_photos ?? []} onChange={urls => set({ before_photos: urls })}
                folder="sheq/before" maxPhotos={10} accentColor={ACCENT} />
              <div className={`border-t ${t.border}`} />
              <PhotoUpload label="After Inspection" description="Condition after inspection / corrective actions"
                photos={form.after_photos ?? []} onChange={urls => set({ after_photos: urls })}
                folder="sheq/after" maxPhotos={10} accentColor={ACCENT} />
            </div>
          )}

          {tab === 'signoff' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Head of Department Name">
                  <EmployeeNameInput value={form.hodName || ''} onChange={name => set({ hodName: name })} placeholder="Select or type HOD name…" />
                </FormField>
                <FormField label="SHEQ Official Name">
                  <EmployeeNameInput value={form.sheqOfficialName || ''} onChange={name => set({ sheqOfficialName: name })} placeholder="Select or type SHEQ official name…" />
                </FormField>
              </div>
              <p className={`text-[11px] ${t.textFaint}`}>Signatures will be captured after submission / approval.</p>
            </div>
          )}
        </div>

        <FormActions onCancel={onClose} submitting={saving} submitLabel={inspection ? 'Update Inspection' : 'Create Inspection'} />
      </form>
    </CenterModal>
  );
}

// ─── INSPECTION DETAIL MODAL ────────────────────────────────────────────────────

function InspectionDetailModal({
  inspection, open, onClose, onEdit,
}: {
  inspection: SHEQFormData | null; open: boolean;
  onClose: () => void; onEdit: (i: SHEQFormData) => void;
}) {
  const t = useTheme();
  if (!inspection) return null;
  return (
    <CenterModal open={open} onClose={onClose} title="Inspection Report" width="max-w-2xl">
      <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Inspectors', value: inspection.inspectors },
            { label: 'Department', value: inspection.department || 'N/A' },
            { label: 'Location', value: inspection.place },
            { label: 'Date & Time', value: `${fmtDate(inspection.date)} at ${inspection.time}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${t.textFaint}`}>{label}</p>
              <p className={t.textMuted}>{value}</p>
            </div>
          ))}
          <div>
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${t.textFaint}`}>Section</p>
            <StatusBadge color={inspection.section === 'electrical' ? '#f59e0b' : ACCENT} label={SECTION_LABELS[inspection.section]} />
          </div>
          <div>
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${t.textFaint}`}>Status</p>
            <StatusBadge color={INSPECTION_STATUS_HEX[inspection.status]} label={inspection.status} />
          </div>
        </div>

        <div className={`border-t ${t.border}`} />

        <div>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${t.textMuted}`}>
            <FileText className="h-3.5 w-3.5" /> Findings & Actions ({inspection.findings?.length || 0})
          </h3>
          {inspection.findings?.length ? (
            <div className="space-y-3">
              {inspection.findings.map((f, idx) => (
                <div key={f.id} className={`rounded-xl p-3 ${t.chipBg} border ${t.border}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-sm font-medium ${t.textMuted}`}>#{idx + 1} {f.finding}</p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <StatusBadge color={PRIORITY_HEX[f.priority]} label={f.priority} />
                      <StatusBadge color={FINDING_STATUS_HEX[f.status]} label={f.status} />
                    </div>
                  </div>
                  <p className={`text-xs mb-2 ${t.textFaint}`}>{f.requiredAction}</p>
                  <div className={`grid grid-cols-3 gap-2 text-xs ${t.textFaint}`}>
                    <span>By: {f.byWho}</span>
                    <span>Due: {fmtDate(f.byWhen)}</span>
                    {f.completedDate && <span>Done: {fmtDate(f.completedDate)}</span>}
                  </div>
                  {f.remarks && <p className={`text-xs mt-1 ${t.textFaint}`}>{f.remarks}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs italic ${t.textFaint}`}>No findings recorded for this inspection.</p>
          )}
        </div>

        {((inspection.before_photos?.length || 0) + (inspection.after_photos?.length || 0)) > 0 && (
          <>
            <div className={`border-t ${t.border}`} />
            <div className="space-y-4">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Photos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inspection.before_photos?.length > 0 && (
                  <PhotoUpload label="Before Inspection" photos={inspection.before_photos} onChange={() => {}} disabled accentColor={ACCENT} />
                )}
                {inspection.after_photos?.length > 0 && (
                  <PhotoUpload label="After Inspection" photos={inspection.after_photos} onChange={() => {}} disabled accentColor={ACCENT} />
                )}
              </div>
            </div>
          </>
        )}

        <div className={`border-t ${t.border}`} />

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Head of Department', name: inspection.hodName, sig: inspection.hodSignature },
            { label: 'SHEQ Official', name: inspection.sheqOfficialName, sig: inspection.sheqSignature },
          ].map(({ label, name, sig }) => (
            <div key={label}>
              <p className={`text-[10px] uppercase tracking-wider mb-1 ${t.textFaint}`}>{label}</p>
              <div className={`rounded-xl border ${t.border} p-3 text-center min-h-[52px] flex items-center justify-center`}>
                {sig ? <img src={sig} alt={`${label} signature`} className="max-h-10 mx-auto" /> : <p className={`text-xs italic ${t.textFaint}`}>{name || 'Not signed'}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`px-5 py-4 border-t ${t.border} flex justify-end gap-2`}>
        <button type="button" onClick={onClose}
          className={`px-4 py-2 rounded-xl text-sm ${t.textFaint} ${t.hoverText} border ${t.border} transition-all`}>
          Close
        </button>
        <PrimaryButton icon={Pencil} accent="violet" size="md" onClick={() => { onClose(); onEdit(inspection); }}>Edit</PrimaryButton>
      </div>
    </CenterModal>
  );
}

// ─── INSPECTION CARD (grid view) ────────────────────────────────────────────────

function InspectionCard({
  inspection, index, expanded, onToggle, onView, onEdit, onDelete,
}: {
  inspection: SHEQFormData; index: number; expanded: boolean;
  onToggle: () => void; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const t = useTheme();
  const isElec = inspection.section === 'electrical';
  const SectionIcon = isElec ? Zap : Wrench;
  const sectionColor = isElec ? '#f59e0b' : ACCENT;

  const openCount = inspection.findings?.filter(f => f.status !== 'closed').length || 0;
  const closedCount = inspection.findings?.filter(f => f.status === 'closed').length || 0;
  const criticalCount = inspection.findings?.filter(f => f.priority === 'critical').length || 0;
  const photoCount = (inspection.before_photos?.length || 0) + (inspection.after_photos?.length || 0);

  return (
    <GlowCard onClick={onView} color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <SectionIcon className="h-5 w-5 shrink-0" style={{ color: sectionColor }} />
          <div className="min-w-0">
            <p className={`text-[10px] ${t.textFaint}`}>#{index + 1}</p>
            <p className={`text-sm font-semibold truncate ${t.textPrimary}`}>{inspection.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge color={INSPECTION_STATUS_HEX[inspection.status]} label={inspection.status} />
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}
            className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText} transition-all`}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className={`px-4 py-2 grid grid-cols-5 gap-1 border-b ${t.border}`}>
        {[
          { label: 'Total', value: inspection.findings?.length || 0, color: ACCENT },
          { label: 'Open', value: openCount, color: '#f59e0b' },
          { label: 'Closed', value: closedCount, color: '#34d399' },
          { label: 'Critical', value: criticalCount, color: '#f43f5e' },
          { label: 'Photos', value: photoCount, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className={`text-[9px] mt-0.5 ${t.textFaint}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <div className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}>
          <UserCircle className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{inspection.inspectors}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}>
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{inspection.place}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}>
          <Clock3 className="h-3.5 w-3.5 flex-shrink-0" /><span>{fmtDate(inspection.date)} at {inspection.time}</span>
        </div>
      </div>

      {expanded && (
        <div className={`border-t ${t.border} px-4 py-3 space-y-3`} onClick={e => e.stopPropagation()}>
          {inspection.findings?.length ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {inspection.findings.map((f, idx) => (
                <div key={f.id} className={`rounded-lg p-2.5 ${t.chipBg} border ${t.border}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className={`text-xs font-medium ${t.textMuted}`}>{idx + 1}. {f.finding}</p>
                    <StatusBadge color={PRIORITY_HEX[f.priority]} label={f.priority} />
                  </div>
                  <div className={`flex gap-3 text-[10px] items-center ${t.textFaint}`}>
                    <span>By: {f.byWho}</span>
                    <span>Due: {fmtDate(f.byWhen)}</span>
                    <StatusBadge color={FINDING_STATUS_HEX[f.status]} label={f.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs italic ${t.textFaint}`}>No findings recorded</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className={`text-[10px] ${t.textFaint}`}>HOD</p><p className={t.textMuted}>{inspection.hodName || 'Pending'}</p></div>
            <div><p className={`text-[10px] ${t.textFaint}`}>SHEQ Official</p><p className={t.textMuted}>{inspection.sheqOfficialName || 'Pending'}</p></div>
          </div>

          <div className="flex gap-1.5 pt-1">
            {[
              { label: 'View', icon: Eye, fn: onView, color: ACCENT },
              { label: 'Edit', icon: Pencil, fn: onEdit, color: ACCENT },
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
    </GlowCard>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────

function SHEQInspectionContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ hero: true, records: true });
  const { inspections, setInspections, loading, refreshing, load } = useSheqInspectionData();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedInspection, setSelectedInspection] = useState<SHEQFormData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<SHEQFormData | null>(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { load(); }, []);

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

  const filtered = useMemo(() => inspections.filter(i => {
    const s = search.toLowerCase();
    if (s && !i.title?.toLowerCase().includes(s) && !i.inspectors?.toLowerCase().includes(s) && !i.place?.toLowerCase().includes(s)) return false;
    if (sectionFilter !== 'all' && i.section !== sectionFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (dateFrom && i.date < dateFrom) return false;
    if (dateTo && i.date > dateTo) return false;
    return true;
  }), [inspections, search, sectionFilter, statusFilter, dateFrom, dateTo]);

  const hasFilters = !!(search || sectionFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo);

  const exportColumns: DLColumn[] = [
    { key: 'title', label: 'Title', width: 26 },
    { key: 'inspectors', label: 'Inspector(s)', width: 22 },
    { key: 'section', label: 'Section', width: 14 },
    { key: 'place', label: 'Location', width: 18 },
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'status', label: 'Status', width: 14 },
    {
      key: 'findings', label: 'Findings', width: 16,
      format: (_v, row) => {
        const findings = (row.findings as InspectionFinding[]) ?? [];
        const closed = findings.filter(f => f.status === 'closed').length;
        return `${closed}/${findings.length} closed`;
      },
    },
  ];

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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save inspection');
      throw e;
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Delete this inspection?', destructive: true })) return;
    try {
      await deleteInspection(id);
      setInspections(prev => prev.filter(i => i.id !== id));
      toast.success('Inspection deleted');
    } catch { toast.error('Failed to delete inspection'); }
  };

  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ClipboardCheck}
        accent="violet"
        crumbs={['Safety & Compliance', 'SHEQ Inspections']}
        title="SHEQ Inspections"
        description="Safety, Health, Environment & Quality compliance tracking."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => load(true)} title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <ViewToggle value={viewMode} onChange={setViewMode}
              options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'table', icon: TableIcon, label: 'Table view' }]} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('SHEQ_Inspections')}
                title="SHEQ Inspections"
                statusColumn="status"
                statusColor={(_v, row) => INSPECTION_STATUS_HEX[row.status as InspectionStatus]?.replace('#', '')}
              />
            )}
            <PrimaryButton icon={Plus} accent="violet" onClick={() => { setEditingInspection(null); setFormOpen(true); }}>New Inspection</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          <StatTile icon={ClipboardCheck} color={ACCENT} label="Total" value={stats.total} />
          <StatTile icon={AlertTriangle} color="#f59e0b" label="Open" value={stats.open} />
          <StatTile icon={Loader2} color="#60a5fa" label="In Progress" value={stats.inProgress} />
          <StatTile icon={Target} color="#34d399" label="Closed" value={stats.closed} />
          <StatTile icon={XCircle} color="#f43f5e" label="Overdue" value={stats.overdue} />
          <StatTile icon={AlertTriangle} color="#f43f5e" label="Critical" value={stats.critical} />
          <StatTile icon={Wrench} color={ACCENT} label="Mechanical" value={stats.mechanical} />
          <StatTile icon={Zap} color="#f59e0b" label="Electrical" value={stats.electrical} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl overflow-hidden`}>
          <div className="p-4 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by title, inspector, location…" className="w-64" />
            <SelectField size="filter" value={sectionFilter} onChange={setSectionFilter} title="Section filter"
              options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))]} />
            <SelectField size="filter" value={statusFilter} onChange={setStatusFilter} title="Status filter"
              options={[{ value: 'all', label: 'All Status' }, ...(['draft', 'submitted', 'approved', 'rejected'] as InspectionStatus[]).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" className={selCls} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" className={selCls} />
            {hasFilters && (
              <button type="button" onClick={() => { setSearch(''); setSectionFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
                title="Clear filters" className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                <X className="h-3 w-3" /> Clear
              </button>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" title="Expand all" onClick={() => setExpandedIds(new Set(inspections.map(i => i.id)))}
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                <Maximize2 className="h-3 w-3" /> Expand all
              </button>
              <button type="button" title="Collapse all" onClick={() => setExpandedIds(new Set())}
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                <Minimize2 className="h-3 w-3" /> Collapse all
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-6 w-6 animate-spin ${t.textFaint}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl overflow-hidden`}>
            <EmptyState icon={ClipboardCheck}
              title={hasFilters ? 'No inspections match your filters' : 'No inspections yet'}
              message={hasFilters ? 'Try adjusting your filters' : 'Create your first inspection to get started'}
              action={{ label: 'New Inspection', onClick: () => { setEditingInspection(null); setFormOpen(true); } }} />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((inspection, idx) => (
              <InspectionCard key={inspection.id} inspection={inspection} index={idx}
                expanded={expandedIds.has(inspection.id)} onToggle={() => toggle(inspection.id)}
                onView={() => { setSelectedInspection(inspection); setDetailOpen(true); }}
                onEdit={() => { setEditingInspection(inspection); setFormOpen(true); }}
                onDelete={() => handleDelete(inspection.id)} />
            ))}
          </div>
        ) : (
          <div className={`${t.glass} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className={`border-b ${t.border}`}>
                  <th className={thCls}></th>
                  <th className={thCls}>Title</th>
                  <th className={thCls}>Inspector(s)</th>
                  <th className={thCls}>Section</th>
                  <th className={thCls}>Location</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Findings</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}></th>
                </tr></thead>
                <tbody>
                  {filtered.map(inspection => (
                    <React.Fragment key={inspection.id}>
                      <tr className={`border-b ${t.border} ${t.hoverBg} cursor-pointer transition-colors`}
                        onClick={() => { setSelectedInspection(inspection); setDetailOpen(true); }}>
                        <td className="pl-3 pr-1 py-3 w-6">
                          <button type="button" title={expandedIds.has(inspection.id) ? 'Collapse' : 'Expand'}
                            onClick={e => { e.stopPropagation(); toggle(inspection.id); }}
                            className={`h-5 w-5 flex items-center justify-center ${t.textFaint} ${t.hoverText} transition-all`}>
                            {expandedIds.has(inspection.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className={`px-3 py-3 text-sm font-medium max-w-[180px] truncate ${t.textPrimary}`}>{inspection.title}</td>
                        <td className={`px-3 py-3 text-xs max-w-[140px] truncate ${t.textMuted}`}>{inspection.inspectors}</td>
                        <td className="px-3 py-3"><StatusBadge color={inspection.section === 'electrical' ? '#f59e0b' : ACCENT} label={SECTION_LABELS[inspection.section]} /></td>
                        <td className={`px-3 py-3 text-xs max-w-[120px] truncate ${t.textMuted}`}>{inspection.place}</td>
                        <td className={`px-3 py-3 text-xs whitespace-nowrap ${t.textMuted}`}>{fmtDate(inspection.date)}</td>
                        <td className="px-3 py-3 text-xs">
                          <span className={`font-semibold ${t.textMuted}`}>{inspection.findings?.length || 0}</span>
                          <span className={`ml-1 ${t.textFaint}`}>({inspection.findings?.filter(f => f.status === 'closed').length || 0} closed)</span>
                        </td>
                        <td className="px-3 py-3"><StatusBadge color={INSPECTION_STATUS_HEX[inspection.status]} label={inspection.status} /></td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button type="button" title="Edit" onClick={() => { setEditingInspection(inspection); setFormOpen(true); }}
                              className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-brand-400`}><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" title="Delete" onClick={() => handleDelete(inspection.id)}
                              className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-400`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                      {expandedIds.has(inspection.id) && (
                        <tr className={t.chipBg}>
                          <td colSpan={9} className="px-5 py-3">
                            {inspection.findings?.length ? (
                              <div className="space-y-2">
                                {inspection.findings.map((f, idx) => (
                                  <div key={f.id} className="pl-3 border-l-2 space-y-0.5" style={{ borderColor: `${ACCENT}40` }}>
                                    <p className={`text-xs font-medium ${t.textMuted}`}>#{idx + 1}: {f.finding}</p>
                                    <p className={`text-[11px] ${t.textFaint}`}>{f.requiredAction}</p>
                                    <div className="flex gap-3 items-center mt-0.5">
                                      <span className={`text-[10px] ${t.textFaint}`}>By: {f.byWho}</span>
                                      <span className={`text-[10px] ${t.textFaint}`}>Due: {fmtDate(f.byWhen)}</span>
                                      <StatusBadge color={PRIORITY_HEX[f.priority]} label={f.priority} />
                                      <StatusBadge color={FINDING_STATUS_HEX[f.status]} label={f.status} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-xs italic ${t.textFaint}`}>No findings recorded</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      <InspectionFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingInspection(null); }} onSave={handleSave} inspection={editingInspection} />
      <InspectionDetailModal inspection={selectedInspection} open={detailOpen} onClose={() => setDetailOpen(false)} onEdit={i => { setEditingInspection(i); setFormOpen(true); }} />
    </main>
  );
}

export default function SHEQInspectionPage() {
  return <AppShell><SHEQInspectionContent /></AppShell>;
}
