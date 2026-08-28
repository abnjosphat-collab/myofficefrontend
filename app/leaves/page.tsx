// app/leaves/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import React, { useState, useMemo, useEffect, ElementType } from "react";
import {
  Calendar, Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, User, FileText, Eye, Loader2,
  Clock, AlertCircle, Trash2, MoreVertical,
  List, LayoutGrid, X, Edit,
  Stethoscope, Shield, Heart, Users, GraduationCap,
  CalendarDays, BarChart3, Filter, ChevronRight
} from "@/components/shared/theme";

import { toast } from "sonner";
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { formatDate, formatDateTime } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import {
  useTheme, PageHero, StatusBadge, ACCENT_HEX, CenterModal, FormField, accentText,
  useCollapseSection, EmptyState, PrimaryButton, GlowCard, SelectField, useConfirm,
} from '@/components/shared/theme';
import type { Leave, Stats } from './types';
import {
  calcDays, createLeave, deleteLeave, updateLeave, updateLeaveStatus, useLeavesData,
} from './useLeavesData';
import { EmployeeAutocomplete } from '@/components/shared/EmployeeAutocomplete';
import type { EmployeeLookup } from '@/hooks/useLookups';

const COMMON_REASONS = [
  "Annual leave", "Sick leave", "Family emergency", "Medical appointment",
  "Personal reasons", "Bereavement", "Study leave", "Maternity leave",
  "Paternity leave", "Unpaid leave"
];

// ---------- Leave Types ----------
interface LeaveType {
  name: string; shortName: string; color: string; icon: ElementType; description: string;
}

const LEAVE_TYPES: Record<string, LeaveType> = {
  annual: { name: 'Annual Leave', shortName: 'Annual', color: '#2563eb', icon: CalendarDays, description: 'Paid vacation time for rest and relaxation' },
  sick: { name: 'Sick Leave', shortName: 'Sick', color: '#dc2626', icon: Stethoscope, description: 'Medical and health-related absences' },
  emergency: { name: 'Emergency Leave', shortName: 'Emergency', color: '#d97706', icon: Shield, description: 'Urgent personal or family matters' },
  // Key stays 'compassionate' on purpose: existing leave records store that value, and
  // renaming the key would make them fall back to "Annual". Only the display label changed.
  compassionate: { name: 'Special Leave', shortName: 'Special', color: '#7c3aed', icon: Heart, description: 'Bereavement and family emergencies' },
  maternity: { name: 'Maternity Leave', shortName: 'Maternity', color: '#db2777', icon: Users, description: 'Parental leave for childbirth' },
  study: { name: 'Study Leave', shortName: 'Study', color: '#059669', icon: GraduationCap, description: 'Professional development and education' },
  lieu: { name: 'Leave in Lieu of Overtime', shortName: 'In Lieu', color: '#0891b2', icon: Clock, description: 'Time off earned from worked overtime' },
};

// ---------- Utility Functions ----------
const formatDays = (days: number): string => days === 1 ? '1 day' : `${days} days`;

// Standardized on the shared formatters (canonical "16 Jul 2026" / "…, 14:30").
const fmtDate = (s?: string): string => (s ? formatDate(s) : '');
const fmtDateTime = (s?: string): string => (s ? formatDateTime(s) : '');

// ---------- StatusBadge helper ----------
function leaveStatusHex(status: Leave['status']) {
  return status === 'approved' ? '#34d399' : status === 'rejected' ? '#f87171' : '#fbbf24';
}
function LeaveStatusBadge({ status }: { status: Leave['status'] }) {
  const cfg = { pending: { icon: Clock, label: 'Pending' }, approved: { icon: CheckCircle2, label: 'Approved' }, rejected: { icon: XCircle, label: 'Rejected' } }[status];
  return <StatusBadge color={leaveStatusHex(status)} label={cfg.label} />;
}

// Leave Card Component
function LeaveCard({ leave, onView, onEdit, onDelete }: { leave: Leave; onView: (leave: Leave) => void; onEdit: (leave: Leave) => void; onDelete: (leaveId: string) => Promise<void>; }) {
  const t = useTheme();
  const confirm = useConfirm();
  const leaveType = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.annual;
  const Icon = leaveType.icon;
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDelete = async () => {
    if (!await confirm({ title: 'Delete this leave request?', destructive: true })) return;
    setDeleting(true);
    try { await onDelete(leave.id); } catch (error) { toast.error(`Delete failed: ${(error as Error).message}`); } finally { setDeleting(false); }
  };

  return (
    <GlowCard color={leaveType.color} surface={`${t.glass} rounded-xl`} className="group relative overflow-hidden cursor-pointer" onClick={() => onView(leave)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-xl ${t.chipBg} group-hover:scale-110 transition-transform flex-shrink-0`}>
              <Icon className="h-4 w-4" style={{ color: leaveType.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-base font-semibold truncate ${t.textPrimary}`}>{leave.employee_name}</div>
              <div className={`text-xs truncate ${t.textFaint}`}>{leave.position} • {leave.employee_id}</div>
            </div>
          </div>
          <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button type="button" title="More options" onClick={() => setMenuOpen(v => !v)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><MoreVertical className="h-3.5 w-3.5" /></button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className={`absolute right-0 top-8 z-20 w-44 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
                  <button type="button" onClick={() => { onView(leave); setMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}><Eye className="h-3.5 w-3.5" /> View Details</button>
                  <button type="button" onClick={() => { onEdit(leave); setMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}><Edit className="h-3.5 w-3.5" /> Edit</button>
                  <div className={`h-px ${t.border} mx-2`} />
                  <button type="button" onClick={() => { handleDelete(); setMenuOpen(false); }} disabled={deleting} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${accentText('rose', t.light)} hover:bg-rose-500/10 transition-colors disabled:opacity-50`}>
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <StatusBadge color={leaveType.color} label={leaveType.shortName} />
          <LeaveStatusBadge status={leave.status} />
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center"><span className={t.textFaint}>Duration</span><span className={`font-semibold ${t.textPrimary}`}>{formatDays(leave.total_days)}</span></div>
          <div className="flex justify-between items-center"><span className={t.textFaint}>Dates</span><span className={`font-medium text-xs ${t.textPrimary}`}>{fmtDate(leave.start_date)} – {fmtDate(leave.end_date)}</span></div>
          <div className="flex justify-between items-center"><span className={t.textFaint}>Applied</span><span className={`font-medium text-xs ${t.textFaint}`}>{fmtDateTime(leave.applied_date)}</span></div>
        </div>

        {leave.reason && <div className={`mt-3 rounded-lg ${t.chipBg} p-2 text-xs line-clamp-2 ${t.textFaint}`}>{leave.reason}</div>}
      </div>
      <div className={`px-4 py-2.5 ${t.chipBg} border-t ${t.border}`}>
        <button type="button" className={`w-full inline-flex items-center justify-center gap-2 text-xs ${t.textFaint} ${t.hoverText} transition-colors`} onClick={e => { e.stopPropagation(); onView(leave); }}>
          <Eye className="h-3.5 w-3.5" /> View Details
        </button>
      </div>
    </GlowCard>
  );
}

// ============= Leave Application Form =============
function LeaveApplicationForm({ onClose, onSuccess, editData }: { onClose: () => void; onSuccess: (message: string, leave?: Leave) => void; editData?: Leave | null; }) {
  const t = useTheme();
  const [formData, setFormData] = useState<Partial<Leave>>(
    editData ? {
      employee_id: editData.employee_id || '', employee_name: editData.employee_name || '', position: editData.position || '',
      leave_type: editData.leave_type || 'annual', start_date: editData.start_date || '', end_date: editData.end_date || '',
      reason: editData.reason || '', contact_number: editData.contact_number || '', emergency_contact: editData.emergency_contact || '',
      handover_to: editData.handover_to || '', department: editData.department || '', manager_name: editData.manager_name || '',
      applied_date: editData.applied_date,
    } : {
      employee_id: '', employee_name: '', position: '', leave_type: 'annual', start_date: '', end_date: '',
      reason: 'Annual leave', contact_number: '', emergency_contact: '', handover_to: '', department: '', manager_name: '',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleReasonChange = (value: string) => {
    setFormData(prev => ({ ...prev, reason: value }));
    if (value.trim()) {
      setSuggestions(COMMON_REASONS.filter(r => r.toLowerCase().startsWith(value.toLowerCase()) && r.toLowerCase() !== value.toLowerCase()));
      setSelectedSuggestionIndex(-1);
    } else setSuggestions([]);
  };

  const handleReasonKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      const suggestion = suggestions[selectedSuggestionIndex === -1 ? 0 : selectedSuggestionIndex];
      setFormData(prev => ({ ...prev, reason: suggestion }));
      setSuggestions([]);
    } else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestionIndex(prev => (prev > -1 ? prev - 1 : -1)); }
    else if (e.key === 'Escape') setSuggestions([]);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.employee_name?.trim()) errors.employee_name = 'Please select an employee';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (!formData.reason?.trim()) errors.reason = 'Reason is required';
    if (!formData.contact_number?.trim()) errors.contact_number = 'Contact number is required';
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) errors.end_date = 'End date must be after start date';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: keyof Leave, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors(prev => { const rest = { ...prev }; delete rest[field]; return rest; });
  };

  // Employee autocomplete now lives in components/shared/EmployeeAutocomplete.tsx
  // (imported above) — used to be an inline ghost-text implementation here; the
  // shared component (built on the design system's Combobox) keeps Tab/Enter/Arrow
  // selection, now consistent with every other module instead of leaves' own look.
  const handleEmployeeSelect = (employee: EmployeeLookup) => {
    // Raw employee records only ever carry first_name/last_name, never a combined
    // name/full_name — this fallback chain was missing the concatenation step, so
    // every selection silently fell through to the generic "Employee {id}" placeholder
    // (matches the same full chain overtime.tsx and tasks-events.tsx already use).
    const name = employee.name || employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || `Employee ${employee.id}`;
    setFormData(prev => ({
      ...prev, employee_id: employee.employee_id || String(employee.id), employee_name: name,
      position: employee.designation || '', contact_number: employee.phone || '',
      manager_name: (employee.supervisor as string) || (employee.manager_name as string) || '',
      department: employee.department || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true); setError('');
    try {
      const result = editData?.id ? await updateLeave(editData.id, formData) : await createLeave(formData);
      onSuccess(editData ? 'Leave application updated successfully!' : 'Leave application submitted successfully!', result);
      onClose();
    } catch (err) { setError((err as Error).message || 'An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const calculatedDays = calcDays(formData.start_date, formData.end_date);
  const selectedLeaveType = LEAVE_TYPES[formData.leave_type || 'annual'];

  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open onClose={onClose} title={editData ? 'Edit Leave Request' : 'New Leave Request'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className={`p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-center gap-2 ${accentText('rose', t.light)}`}>
            <AlertCircle className="h-4 w-4 shrink-0" /><p className="text-sm">{error}</p>
          </div>
        )}

        <div className="relative">
          <EmployeeAutocomplete
            label="Employee"
            required
            value={formData.employee_name || ''}
            disabled={!!editData}
            placeholder="Type a name or employee ID…"
            onChange={v => handleChange('employee_name', v)}
            onSelect={handleEmployeeSelect}
          />
          {validationErrors.employee_name && <p className={`${accentText('rose', t.light)} text-xs mt-1`}>{validationErrors.employee_name}</p>}
        </div>

        {formData.employee_name && (
          <div className={`${t.chipBg} rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5`}>
            <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Employee ID</div><div className={`text-sm font-mono ${t.textMuted}`}>{formData.employee_id || '—'}</div></div>
            <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Position</div><div className={`text-sm ${t.textMuted}`}>{formData.position || '—'}</div></div>
            <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Department</div><div className={`text-sm ${t.textMuted}`}>{formData.department || '—'}</div></div>
            <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Supervisor</div><div className={`text-sm ${t.textMuted}`}>{formData.manager_name || '—'}</div></div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Leave Type" required>
            <SelectField size="form" value={formData.leave_type || 'annual'} onChange={v => handleChange('leave_type', v)} title="Leave type"
              options={Object.entries(LEAVE_TYPES).map(([key, type]) => ({ value: key, label: type.name }))} />
          </FormField>
          <div className="flex items-end">
            <div className={`flex items-center gap-2 w-full p-2.5 rounded-lg ${t.chipBg}`}>
              {React.createElement(selectedLeaveType.icon, { className: 'h-4 w-4 shrink-0', style: { color: selectedLeaveType.color } })}
              <p className={`text-xs ${t.textFaint}`}>{selectedLeaveType.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Date" required>
            <input type="date" title="Start date" required value={formData.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} className={inputCls} />
            {validationErrors.start_date && <p className={`${accentText('rose', t.light)} text-xs mt-1`}>{validationErrors.start_date}</p>}
          </FormField>
          <FormField label="End Date" required>
            <input type="date" title="End date" required value={formData.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} min={formData.start_date} className={inputCls} />
            {validationErrors.end_date && <p className={`${accentText('rose', t.light)} text-xs mt-1`}>{validationErrors.end_date}</p>}
          </FormField>
        </div>

        {calculatedDays > 0 && (
          <div className={`rounded-xl ${t.chipBg} px-4 py-3 flex items-center justify-between`}>
            <span className={`text-sm ${t.textFaint}`}>Total leave days</span>
            <span className={`text-2xl font-bold ${t.textPrimary}`}>{calculatedDays}<span className={`text-sm ml-1 ${t.textFaint}`}>days</span></span>
          </div>
        )}

        <FormField label="Contact Number During Leave" required>
          <input type="text" value={formData.contact_number || ''} onChange={e => handleChange('contact_number', e.target.value)} placeholder="Phone number to reach you" className={inputCls} />
          {validationErrors.contact_number && <p className={`${accentText('rose', t.light)} text-xs mt-1`}>{validationErrors.contact_number}</p>}
        </FormField>

        <div className="relative">
          <FormField label="Reason for Leave" required>
            <textarea rows={3} required value={formData.reason || ''} onChange={e => handleReasonChange(e.target.value)} onKeyDown={handleReasonKeyDown}
              placeholder="Type a reason or choose from suggestions..." className={`w-full px-3 py-2 rounded-lg text-sm resize-none outline-none transition-colors ${t.inputBg}`} />
          </FormField>
          {validationErrors.reason && <p className={`${accentText('rose', t.light)} text-xs mt-1`}>{validationErrors.reason}</p>}
          {suggestions.length > 0 && (
            <div className={`absolute z-20 w-full mt-1 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
              {suggestions.map((s, index) => (
                <div key={s} className={`px-3 py-2 cursor-pointer text-sm transition-all ${index === selectedSuggestionIndex ? `${t.chipBg} ${t.textPrimary}` : `${t.textFaint} ${t.hoverBgSoft} ${t.hoverText}`}`}
                  onClick={() => { setFormData(prev => ({ ...prev, reason: s })); setSuggestions([]); }}>
                  {s}
                </div>
              ))}
            </div>
          )}
          <p className={`text-[11px] mt-1 ${t.textFaint}`}>Tab to accept suggestion · Esc to dismiss</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Emergency Contact"><input type="text" value={formData.emergency_contact || ''} onChange={e => handleChange('emergency_contact', e.target.value)} placeholder="Name and phone number" className={inputCls} /></FormField>
          <FormField label="Handover To"><input type="text" value={formData.handover_to || ''} onChange={e => handleChange('handover_to', e.target.value)} placeholder="Colleague's name" className={inputCls} /></FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} border ${t.border} transition-all`}>Cancel</button>
          <PrimaryButton type="submit" size="md" submitting={loading}>{editData ? 'Update Request' : 'Submit Request'}</PrimaryButton>
        </div>
      </form>
    </CenterModal>
  );
}

// Leave Details Modal
function LeaveDetailsModal({ leave, onClose, onEdit, onDelete, onStatusUpdate }: { leave: Leave; onClose: () => void; onEdit: (leave: Leave) => void; onDelete: (leaveId: string) => Promise<void>; onStatusUpdate: (leaveId: string, status: Leave['status']) => Promise<void>; }) {
  const t = useTheme();
  const confirm = useConfirm();
  const selectedLeaveType = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.annual;
  const [updating, setUpdating] = useState(false);
  const [showStatusActions, setShowStatusActions] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Leave['status'] | null>(null);

  const handleStatusChange = (newStatus: Leave['status']) => {
    if (newStatus === 'approved' || newStatus === 'rejected') { setShowStatusActions(false); setPendingStatus(newStatus); return; }
    commitStatusChange(newStatus);
  };

  const commitStatusChange = async (newStatus: Leave['status'], _sig?: SignatureResult) => {
    setUpdating(true);
    try { await onStatusUpdate(leave.id, newStatus); setPendingStatus(null); onClose(); }
    catch (error) { toast.error(`Update failed: ${(error as Error).message}`); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!await confirm({ title: 'Delete this leave request?', destructive: true })) return;
    setUpdating(true);
    try { await onDelete(leave.id); onClose(); } catch (error) { toast.error(`Delete failed: ${(error as Error).message}`); } finally { setUpdating(false); }
  };

  const IF = ({ label, value }: { label: string; value?: string | null }) => (
    <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div><div className={`text-sm ${t.textMuted}`}>{value || '—'}</div></div>
  );

  return (
    <>
      {pendingStatus && (
        <ApprovalGate
          title={pendingStatus === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
          description={`${leave.employee_name} — ${leave.leave_type} · ${leave.total_days} day(s)`}
          actionLabel={pendingStatus === 'approved' ? 'Sign & Approve' : 'Sign & Reject'}
          requiredRole="manager"
          variant={pendingStatus === 'approved' ? 'approve' : 'reject'}
          preferSavedSignature={pendingStatus === 'approved'}
          onConfirm={async sig => { await commitStatusChange(pendingStatus, sig); }}
          onCancel={() => setPendingStatus(null)}
        />
      )}
      <CenterModal open onClose={onClose} title={`Leave Request #${leave.id}`} accent="violet" width="max-w-2xl">
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 pb-3">
            {React.createElement(selectedLeaveType.icon, { className: 'h-4 w-4', style: { color: selectedLeaveType.color } })}
            <LeaveStatusBadge status={leave.status} />
          </div>
        </div>
        <div className="px-5 pb-5 space-y-4">
          {updating && <div className={`flex items-center gap-2 p-3 rounded-lg ${t.chipBg} ${t.textFaint}`}><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Updating...</span></div>}

          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><User className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Employee</span></div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Name" value={leave.employee_name} /><IF label="Employee ID" value={leave.employee_id} /><IF label="Position" value={leave.position} />
              <IF label="Department" value={leave.department} /><IF label="Contact" value={leave.contact_number} />
              {leave.emergency_contact && <IF label="Emergency Contact" value={leave.emergency_contact} />}
            </div>
          </div>

          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><CalendarDays className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Leave Details</span></div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Type" value={selectedLeaveType.name} /><IF label="Start Date" value={fmtDate(leave.start_date)} /><IF label="End Date" value={fmtDate(leave.end_date)} />
              <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Duration</div><div className={`font-semibold text-sm ${t.textPrimary}`}>{formatDays(leave.total_days)}</div></div>
              <IF label="Applied" value={fmtDateTime(leave.applied_date)} />
              {leave.handover_to && <IF label="Handover To" value={leave.handover_to} />}
            </div>
          </div>

          {leave.reason && (
            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><FileText className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Reason</span></div>
              <p className={`px-3.5 py-3 text-sm whitespace-pre-wrap ${t.textFaint}`}>{leave.reason}</p>
            </div>
          )}

          {/* Two-stage manager/HR approval UI removed 2026-07-18: the fields it
              rendered never existed in the backend or DB, so the block could never
              display. Rebuild from git history if the feature is ever wanted. */}

          <div className="flex flex-wrap gap-2 justify-between pt-1">
            <button type="button" onClick={handleDelete} disabled={updating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 ${accentText('rose', t.light)} transition-all disabled:opacity-50`}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onEdit(leave); onClose(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all`}><Edit className="h-3.5 w-3.5" /> Edit</button>
              <div className="relative">
                <button type="button" onClick={() => setShowStatusActions(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">Update Status <ChevronDown className="h-3.5 w-3.5" /></button>
                {showStatusActions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusActions(false)} />
                    <div className={`absolute right-0 bottom-9 z-20 w-44 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
                      <button type="button" onClick={() => handleStatusChange('approved')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${accentText('emerald', t.light)} ${t.hoverBgSoft} transition-colors`}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                      <button type="button" onClick={() => handleStatusChange('rejected')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${accentText('rose', t.light)} ${t.hoverBgSoft} transition-colors`}><XCircle className="h-3.5 w-3.5" /> Reject</button>
                      <div className={`h-px ${t.border} mx-2`} />
                      <button type="button" onClick={() => handleStatusChange('pending')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textFaint} ${t.hoverBgSoft} transition-colors`}><Clock className="h-3.5 w-3.5" /> Mark Pending</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CenterModal>
    </>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────
const leavesExportColumns: DLColumn[] = [
  { key: 'employee_name', label: 'Employee', width: 18 },
  { key: 'employee_id', label: 'Employee ID', width: 18 },
  { key: 'department', label: 'Department', width: 18, format: v => (v as string) ?? '—' },
  { key: 'position', label: 'Position', width: 18, format: v => (v as string) ?? '—' },
  { key: 'leave_type', label: 'Leave Type', width: 18, format: v => LEAVE_TYPES[v as string]?.name ?? (v as string) },
  { key: 'start_date', label: 'Start Date', width: 18 },
  { key: 'end_date', label: 'End Date', width: 18 },
  { key: 'total_days', label: 'Days', width: 18, format: v => `${v} day${v === 1 ? '' : 's'}` },
  { key: 'status', label: 'Status', width: 18, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'reason', label: 'Reason', width: 18 },
  { key: 'contact_number', label: 'Contact No.', width: 18 },
  { key: 'handover_to', label: 'Handover To', width: 18 },
  { key: 'applied_date', label: 'Applied', width: 18, format: v => v ? new Date(v as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' },
  { key: 'manager_name', label: 'Manager', width: 18 },
];

// ============= Main Component =============
function LeaveManagementContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const { leaves, stats, loading, refresh: fetchAllData } = useLeavesData();
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Leave | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approved' | 'rejected' | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [showTypeSummary, setShowTypeSummary] = useState(false);
  const [showEmployeeSummary, setShowEmployeeSummary] = useState(false);
  const [filterPanelMinimized, setFilterPanelMinimized] = useState(true);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);

  const handleFormSuccess = (message: string) => { toast.success(message); fetchAllData(); };

  const handleStatusUpdate = async (id: string, status: Leave['status']) => {
    try { await updateLeaveStatus(id, status); toast.success(`Status updated to ${status}`); fetchAllData(); }
    catch (error) { toast.error((error as Error).message); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLeave(id); toast.success('Leave deleted'); fetchAllData(); }
    catch (error) { toast.error((error as Error).message); }
  };

  const filteredLeaves = useMemo(() => {
    let filtered = leaves;
    if (filter !== 'all') filtered = filtered.filter(l => l.status === filter);
    if (typeFilter !== 'all') filtered = filtered.filter(l => l.leave_type === typeFilter);
    if (dateFrom) filtered = filtered.filter(l => l.start_date >= dateFrom);
    if (dateTo) filtered = filtered.filter(l => l.end_date <= dateTo);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => l.employee_name?.toLowerCase().includes(term) || l.employee_id?.toLowerCase().includes(term) || l.position?.toLowerCase().includes(term) || l.department?.toLowerCase().includes(term));
    }
    const [sortField, sortDirection] = sortBy.split('-');
    filtered = [...filtered].sort((a, b) => {
      if (sortField === 'date') { const d = new Date(a.applied_date).getTime() - new Date(b.applied_date).getTime(); return sortDirection === 'desc' ? -d : d; }
      if (sortField === 'days') return sortDirection === 'desc' ? b.total_days - a.total_days : a.total_days - b.total_days;
      if (sortField === 'name') { const c = a.employee_name.localeCompare(b.employee_name); return sortDirection === 'desc' ? -c : c; }
      return 0;
    });
    return filtered;
  }, [leaves, filter, typeFilter, dateFrom, dateTo, searchTerm, sortBy]);

  const clearFilters = () => { setFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); setSortBy('date-desc'); };

  // Only pending requests are selectable — approve/reject is the only bulk action, and a
  // stale selection (e.g. someone else actioned one mid-session) is filtered out again
  // at submit time rather than trusted.
  const pendingInView = useMemo(() => filteredLeaves.filter(l => l.status === 'pending'), [filteredLeaves]);
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every(l => selectedIds.has(l.id));
  const toggleSelectAll = () => setSelectedIds(allPendingSelected ? new Set() : new Set(pendingInView.map(l => l.id)));
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedLeaves = useMemo(() => leaves.filter(l => l.status === 'pending' && selectedIds.has(l.id)), [leaves, selectedIds]);

  const handleBulkStatusUpdate = async () => {
    if (!bulkAction) return;
    const targets = selectedLeaves;
    const results = await Promise.allSettled(targets.map(l => updateLeaveStatus(l.id, bulkAction)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (failed > 0) toast.warning(`${failed} failed to update`);
    if (succeeded > 0) toast.success(`${bulkAction === 'approved' ? 'Approved' : 'Rejected'} ${succeeded} request${succeeded !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const typeSummary = useMemo(() => Object.entries(LEAVE_TYPES).map(([key, type]) => {
    const typeLeaves = leaves.filter(l => l.leave_type === key);
    const totalDays = typeLeaves.reduce((sum, l) => sum + (l.total_days || 0), 0);
    return { key, type, count: typeLeaves.length, totalDays, percentage: leaves.length > 0 ? Math.round((typeLeaves.length / leaves.length) * 100) : 0 };
  }).filter(t => t.count > 0), [leaves]);

  const employeeSummary = useMemo(() => {
    const empMap: Record<string, { name: string; total_days: number; pending: number; approved: number; rejected: number }> = {};
    leaves.forEach(l => {
      if (!empMap[l.employee_id]) empMap[l.employee_id] = { name: l.employee_name, total_days: 0, pending: 0, approved: 0, rejected: 0 };
      empMap[l.employee_id].total_days += l.total_days || 0;
      empMap[l.employee_id][l.status]++;
    });
    return Object.entries(empMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total_days - a.total_days);
  }, [leaves]);

  const activeFilterCount = [filter !== 'all', typeFilter !== 'all', !!dateFrom, !!dateTo, !!searchTerm].filter(Boolean).length;
  const inputCls = `px-3 py-2 w-full text-sm rounded-lg outline-none transition-colors ${t.inputBg}`;
  const pillCls = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-brand-500/25 text-brand-400 font-semibold' : `${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={CalendarDays}
        accent="violet"
        crumbs={['Time & Attendance', 'Leaves']}
        title="Leave Management"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={fetchAllData} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
            <PrimaryButton icon={Plus} onClick={() => setShowForm(true)}>New Leave Request</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, textClass: 'text-brand-400', onClick: () => setFilter('all') },
            { label: 'Total Days', value: stats.total_days_requested, textClass: accentText('violet', t.light), onClick: undefined },
            { label: 'Pending', value: stats.pending, textClass: accentText('amber', t.light), onClick: () => setFilter('pending') },
            { label: 'Approved', value: stats.approved, textClass: accentText('emerald', t.light), onClick: () => setFilter('approved') },
            { label: 'On Leave Now', value: stats.on_leave_now, textClass: 'text-brand-400', onClick: undefined },
            { label: 'Approval Rate', value: `${stats.approvalRate}%`, textClass: 'text-brand-400', onClick: undefined },
          ].map(stat => (
            <button type="button" key={stat.label} onClick={stat.onClick} className={`rounded-xl p-3 text-left ${t.chipBg} transition-all ${stat.onClick ? `${t.hoverBg} cursor-pointer` : 'cursor-default'}`}>
              <div className={`text-2xl font-bold ${stat.textClass}`}>{stat.value}</div>
              <div className={`text-xs mt-0.5 ${t.textFaint}`}>{stat.label}</div>
            </button>
          ))}
        </div>
      </PageHero>

      {typeSummary.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Leave Type Breakdown</span><span className={`text-[11px] ${t.textFaint}`}>click to filter</span></div>
            <button type="button" title={showTypeSummary ? 'Collapse' : 'Expand'} onClick={() => setShowTypeSummary(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>{showTypeSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
          </div>
          {showTypeSummary && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {typeSummary.map(({ key, type, count, totalDays, percentage }) => {
                const Icon = type.icon;
                const isActive = typeFilter === key;
                return (
                  <GlowCard key={key} onClick={() => setTypeFilter(isActive ? 'all' : key)} color={type.color}
                    surface="rounded-xl overflow-hidden p-4"
                    className={`group text-left cursor-pointer ${isActive ? `${t.chipBg} ring-1 ring-brand-400/40` : `${t.chipBg} ${t.hoverBg}`}`}>
                    <div className="flex items-center justify-between mb-2"><Icon className="h-4 w-4" style={{ color: type.color }} /><span className={`text-xs font-bold ${t.textPrimary}`}>{count}</span></div>
                    <div className={`text-xs font-semibold mb-0.5 ${t.textMuted}`}>{type.shortName}</div>
                    <div className={`text-[11px] ${t.textFaint}`}>{totalDays}d total</div>
                    <div className={`mt-2 h-1 rounded-full ${t.chipBg} overflow-hidden`}><div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: type.color }} /></div>
                  </GlowCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {employeeSummary.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Employee Summary</span><span className={`text-[11px] ${t.textFaint}`}>{employeeSummary.length} employees</span></div>
            <button type="button" title={showEmployeeSummary ? 'Collapse' : 'Expand'} onClick={() => setShowEmployeeSummary(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>{showEmployeeSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
          </div>
          {showEmployeeSummary && (
            <div className="h-[260px] overflow-y-auto">
              <div className="space-y-1 p-4">
                {employeeSummary.map(emp => {
                  const maxDays = employeeSummary[0]?.total_days || 1;
                  const percentage = Math.round((emp.total_days / maxDays) * 100);
                  return (
                    <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg ${t.hoverBgSoft} cursor-pointer transition-all`} onClick={() => { setSearchTerm(emp.name); setFilter('all'); }}>
                      <User className="h-5 w-5 text-brand-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${t.textPrimary}`}>{emp.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden flex-1`}><div className="h-full bg-brand-400/60 rounded-full transition-all" style={{ width: `${percentage}%` }} /></div>
                          <span className={`text-[11px] flex-shrink-0 ${t.textFaint}`}>{emp.total_days}d</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {emp.pending > 0 && <StatusBadge color="#fbbf24" label={`${emp.pending}p`} />}
                        {emp.approved > 0 && <StatusBadge color="#34d399" label={`${emp.approved}a`} />}
                        {emp.rejected > 0 && <StatusBadge color="#f87171" label={`${emp.rejected}r`} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Filters</span>
            {activeFilterCount > 0 && <StatusBadge color={ACCENT_HEX.blue} label={`${activeFilterCount} active`} />}
          </div>
          <div className="flex items-center gap-1">
            {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className={`h-6 px-2 flex items-center gap-1 rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} text-[11px] transition-all`}><X className="h-2.5 w-2.5" /> Clear</button>}
            <button type="button" title={filterPanelMinimized ? 'Expand filters' : 'Collapse filters'} onClick={() => setFilterPanelMinimized(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>{filterPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}</button>
          </div>
        </div>
        {!filterPanelMinimized && (
          <div className="px-5 pb-4 pt-3 space-y-3">
            <div>
              <div className={`text-[11px] mb-1.5 ${t.textFaint}`}>Status</div>
              <div className="flex flex-wrap gap-1.5">
                {[{ key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' }].map(opt => (
                  <button type="button" key={opt.key} onClick={() => setFilter(opt.key)} className={pillCls(filter === opt.key)}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className={`text-[11px] mb-1.5 ${t.textFaint}`}>Leave Type</div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setTypeFilter('all')} className={pillCls(typeFilter === 'all')}>All Types</button>
                {Object.entries(LEAVE_TYPES).map(([key, type]) => {
                  const Icon = type.icon;
                  return <button type="button" key={key} onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)} className={`inline-flex items-center gap-1.5 ${pillCls(typeFilter === key)}`}><Icon className="h-3 w-3" />{type.shortName}</button>;
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
                <input type="text" placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`pl-8 ${inputCls}`} />
              </div>
              <div><input type="date" title="Filter from date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} /><div className={`text-[10px] mt-0.5 ${t.textFaint}`}>From date</div></div>
              <div><input type="date" title="Filter to date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} /><div className={`text-[10px] mt-0.5 ${t.textFaint}`}>To date</div></div>
            </div>
          </div>
        )}
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-3 px-5 py-3 border-b ${t.border} flex-wrap`}>
          <div className="flex items-center gap-2 shrink-0"><FileText className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Records</span><span className={`text-[11px] ${t.textFaint}`}>{filteredLeaves.length} of {leaves.length}</span></div>
          <div className="flex-1 relative min-w-0 max-w-xs">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${t.textFaint}`} />
            <input type="text" placeholder="Search employee…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`pl-7 pr-3 h-7 w-full text-xs rounded-lg outline-none transition-colors ${t.inputBg}`} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {filteredLeaves.length > 0 && (
              <DownloadButton
                data={filteredLeaves as unknown as Record<string, unknown>[]}
                columns={leavesExportColumns}
                filename={['Leaves', searchTerm || null, filter !== 'all' ? filter : null, typeFilter !== 'all' ? typeFilter : null].filter(Boolean).join('_')}
                title="Leave Records"
                subtitle={[searchTerm && `Employee: ${searchTerm}`, filter !== 'all' && `Status: ${filter}`].filter(Boolean).join(' | ') || 'All records'}
                formats={['excel']}
              />
            )}
            <SelectField size="filter" value={sortBy} onChange={setSortBy} title="Sort order" className="w-[120px]"
              options={[
                { value: 'date-desc', label: 'Newest First' },
                { value: 'date-asc', label: 'Oldest First' },
                { value: 'days-desc', label: 'Days (High→Low)' },
                { value: 'days-asc', label: 'Days (Low→High)' },
                { value: 'name-asc', label: 'Name A→Z' },
                { value: 'name-desc', label: 'Name Z→A' },
              ]} />
            <div className={`flex rounded-lg border ${t.border} overflow-hidden`}>
              <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={`h-7 w-7 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-brand-500/25 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3 w-3" /></button>
              <button type="button" title="Table view" onClick={() => setViewMode('table')} className={`h-7 w-7 flex items-center justify-center border-l ${t.border} transition-all ${viewMode === 'table' ? 'bg-brand-500/25 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><List className="h-3 w-3" /></button>
            </div>
            <button type="button" title={recordsPanelMinimized ? 'Expand records' : 'Collapse records'} onClick={() => setRecordsPanelMinimized(v => !v)} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>{recordsPanelMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}</button>
          </div>
        </div>
        {!recordsPanelMinimized && (
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className={`h-8 w-8 animate-spin ${t.textFaint}`} /></div>
            ) : filteredLeaves.length === 0 ? (
              <EmptyState icon={Calendar} title="No leave requests found"
                message={leaves.length === 0 ? 'Create your first request.' : 'Try adjusting your filters.'}
                action={leaves.length === 0 ? { label: 'New Leave', onClick: () => setShowForm(true) } : undefined} />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredLeaves.map(leave => <LeaveCard key={leave.id} leave={leave} onView={setSelectedLeave} onEdit={l => { setEditData(l); setShowForm(true); }} onDelete={handleDelete} />)}
              </div>
            ) : (
              <div className={`rounded-xl overflow-hidden border ${t.border}`}>
                {selectedIds.size > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${t.border} bg-brand-500/[0.06]`}>
                    <span className={`text-xs font-semibold ${t.textPrimary}`}>{selectedIds.size} selected</span>
                    <button type="button" onClick={() => setBulkAction('approved')} className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 ${accentText('emerald', t.light)} hover:bg-emerald-500/25 transition-all`}><CheckCircle2 className="h-3 w-3" /> Approve</button>
                    <button type="button" onClick={() => setBulkAction('rejected')} className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/15 ${accentText('rose', t.light)} hover:bg-rose-500/25 transition-all`}><XCircle className="h-3 w-3" /> Reject</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className={`ml-auto text-[11px] ${t.textFaint} ${t.hoverText} transition-colors`}>Clear</button>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.border}`}>
                      <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.chipBg} ${t.textFaint} w-8`}>
                        {pendingInView.length > 0 && <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAll} title="Select all pending" className="rounded" />}
                      </th>
                      {['Employee', 'Type', 'Dates', 'Days', 'Status', 'Applied', 'Actions'].map((h, i) => (
                        <th key={h} className={`${i === 6 ? 'text-right' : 'text-left'} px-4 py-2.5 text-xs font-semibold ${t.chipBg} ${t.textFaint}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map(leave => (
                      <tr key={leave.id} className={`cursor-pointer border-b ${t.border} ${t.hoverBgSoft} transition-colors`} onClick={() => setSelectedLeave(leave)}>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {leave.status === 'pending' && <input type="checkbox" checked={selectedIds.has(leave.id)} onChange={() => toggleSelect(leave.id)} className="rounded" />}
                        </td>
                        <td className="px-4 py-3"><div className={`font-medium ${t.textPrimary}`}>{leave.employee_name}</div><div className={`text-xs ${t.textFaint}`}>{leave.employee_id}</div></td>
                        <td className="px-4 py-3"><StatusBadge color={LEAVE_TYPES[leave.leave_type]?.color ?? ACCENT_HEX.blue} label={LEAVE_TYPES[leave.leave_type]?.shortName || leave.leave_type} /></td>
                        <td className={`px-4 py-3 whitespace-nowrap ${t.textMuted}`}>{fmtDate(leave.start_date)} – {fmtDate(leave.end_date)}</td>
                        <td className={`px-4 py-3 ${t.textMuted}`}>{formatDays(leave.total_days)}</td>
                        <td className="px-4 py-3"><LeaveStatusBadge status={leave.status} /></td>
                        <td className={`px-4 py-3 text-xs ${t.textFaint}`}>{fmtDateTime(leave.applied_date)}</td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <button type="button" title="View details" className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all mr-1`} onClick={() => setSelectedLeave(leave)}><Eye className="h-3.5 w-3.5" /></button>
                          <button type="button" title="Edit leave" className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`} onClick={() => { setEditData(leave); setShowForm(true); }}><Edit className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && <LeaveApplicationForm onClose={() => { setShowForm(false); setEditData(null); }} onSuccess={handleFormSuccess} editData={editData} />}
      {selectedLeave && <LeaveDetailsModal leave={selectedLeave} onClose={() => setSelectedLeave(null)} onEdit={l => { setEditData(l); setShowForm(true); setSelectedLeave(null); }} onDelete={handleDelete} onStatusUpdate={handleStatusUpdate} />}

      {bulkAction && (
        <ApprovalGate
          title={bulkAction === 'approved' ? `Approve ${selectedLeaves.length} Leave Request${selectedLeaves.length !== 1 ? 's' : ''}` : `Reject ${selectedLeaves.length} Leave Request${selectedLeaves.length !== 1 ? 's' : ''}`}
          description={`${selectedLeaves.length} pending request${selectedLeaves.length !== 1 ? 's' : ''} selected`}
          actionLabel={bulkAction === 'approved' ? 'Sign & Approve All' : 'Sign & Reject All'}
          requiredRole="manager"
          variant={bulkAction === 'approved' ? 'approve' : 'reject'}
          preferSavedSignature={bulkAction === 'approved'}
          onConfirm={async () => { await handleBulkStatusUpdate(); }}
          onCancel={() => setBulkAction(null)}
        />
      )}
    </main>
  );
}

export default function LeaveManagementPage() {
  return (
    <AppShell>
      <LeaveManagementContent />
    </AppShell>
  );
}
