// app/leaves/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/apiClient';
import React, { useState, useMemo, useEffect, ElementType } from "react";
import {
  Calendar, Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, User, FileText, Eye, Loader2,
  Clock, AlertCircle, Trash2, MoreVertical,
  Download, List, LayoutGrid, X, Edit,
  Stethoscope, Shield, Heart, Users, GraduationCap,
  CalendarDays, BarChart3, Filter, ChevronRight
} from "@/components/shared/theme";

import { toast } from "sonner";
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  useTheme, PageHero, StatusBadge, ACCENT_HEX, CenterModal, FormField,
  useCollapseSection, EmptyState, PrimaryButton, GlowCard, SelectField,
} from '@/components/shared/theme';

// ============= Employee search result type =============
interface EmployeeSearchResult {
  id: number;
  employee_id: string;
  name: string;
  designation: string;
  phone: string;
  supervisor: string;
  department: string;
}

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
  compassionate: { name: 'Compassionate Leave', shortName: 'Compassionate', color: '#7c3aed', icon: Heart, description: 'Bereavement and family emergencies' },
  maternity: { name: 'Maternity Leave', shortName: 'Maternity', color: '#db2777', icon: Users, description: 'Parental leave for childbirth' },
  study: { name: 'Study Leave', shortName: 'Study', color: '#059669', icon: GraduationCap, description: 'Professional development and education' },
};

// ---------- Types ----------
interface Leave {
  id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  leave_type: keyof typeof LEAVE_TYPES;
  start_date: string;
  end_date: string;
  reason: string;
  contact_number: string;
  emergency_contact?: string;
  handover_to?: string;
  status: 'pending' | 'approved' | 'rejected';
  total_days: number;
  applied_date: string;
  updated_at?: string;
  department?: string;
  manager_name?: string;
  manager_approval?: 'pending' | 'approved' | 'rejected';
  hr_approval?: 'pending' | 'approved' | 'rejected';
  supporting_docs?: string[];
}

interface Stats {
  total: number; pending: number; approved: number; rejected: number;
  on_leave_now: number; approvalRate: number; total_days_requested: number; average_days: number;
}

// API Configuration


// ---------- Utility Functions ----------
const formatDays = (days: number): string => days === 1 ? '1 day' : `${days} days`;

// Standardized on the shared formatters (canonical "16 Jul 2026" / "…, 14:30").
const fmtDate = (s?: string): string => (s ? formatDate(s) : '');
const fmtDateTime = (s?: string): string => (s ? formatDateTime(s) : '');
function calcDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Math.max(0, days);
}

// ---------- API Functions ----------
const fetchLeaves = async (): Promise<Leave[]> => {
  try {
    const data = await api.get<Leave[]>('/api/leaves');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching leaves:', error);
    toast.error('Could not load leave requests');
    return [];
  }
};

const createLeave = async (leaveData: Partial<Leave>): Promise<Leave> => {
  return api.post<Leave>('/api/leaves', { ...leaveData, applied_date: new Date().toISOString(), status: 'pending', total_days: calcDays(leaveData.start_date, leaveData.end_date) });
};

const updateLeave = async (leaveId: string, leaveData: Partial<Leave>): Promise<Leave> => {
  const saved = await api.patch<Leave>(`/api/leaves/${leaveId}`, { ...leaveData, total_days: calcDays(leaveData.start_date, leaveData.end_date) });
  return saved ?? ({ ...leaveData, id: leaveId, total_days: calcDays(leaveData.start_date, leaveData.end_date) } as Leave);
};

const updateLeaveStatus = async (leaveId: string, status: Leave['status'], notes?: string): Promise<Leave> => {
  return api.patch<Leave>(`/api/leaves/${leaveId}`, { status, ...(notes ? { notes } : {}) });
};

const deleteLeave = async (leaveId: string): Promise<{ success: boolean; message: string }> => {
  return (await api.delete<{ success: boolean; message: string }>(`/api/leaves/${leaveId}`)) ?? { success: true, message: 'Deleted' };
};

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
  const leaveType = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.annual;
  const Icon = leaveType.icon;
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this leave request?')) return;
    setDeleting(true);
    try { await onDelete(leave.id); } catch (error) { console.error(error); } finally { setDeleting(false); }
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
                  <button type="button" onClick={() => { handleDelete(); setMenuOpen(false); }} disabled={deleting} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50">
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
  const [employees, setEmployees] = useState<EmployeeSearchResult[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSelectOpen, setEmployeeSelectOpen] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const data = await api.get<Record<string, unknown>[]>('/api/employees');
        const employeeList = Array.isArray(data) ? data : [];
        const normalized = employeeList.map((emp: Record<string, unknown>) => {
          const id = typeof emp.id === 'number' ? emp.id : parseInt(String(emp.id)) || 0;
          const employeeId = String(emp.employee_id || '');
          let fullName = '';
          if (emp.first_name && emp.last_name) fullName = `${emp.first_name} ${emp.last_name}`;
          else fullName = String(emp.name || emp.employee_name || emp.full_name || emp.Name || '');
          return {
            id, employee_id: employeeId, name: fullName,
            designation: String(emp.designation || emp.position || emp.job_title || ''),
            phone: String(emp.phone || emp.contact_number || emp.mobile || ''),
            supervisor: String(emp.supervisor || emp.manager_name || emp.manager || ''),
            department: String(emp.department || emp.dept || ''),
          };
        });
        setEmployees(normalized);
      } catch (error) { console.error('Error fetching employees:', error); toast.error('Could not load employee list'); }
      finally { setLoadingEmployees(false); }
    };
    fetchEmployees();
  }, []);

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

  const handleEmployeeSelect = (employee: EmployeeSearchResult) => {
    setFormData({
      ...formData, employee_id: employee.employee_id || employee.id.toString(), employee_name: employee.name || `Employee ${employee.id}`,
      position: employee.designation || '', contact_number: employee.phone || '', manager_name: employee.supervisor || '', department: employee.department || '',
    });
    setEmployeeSelectOpen(false);
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

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter(emp => emp.name.toLowerCase().includes(term) || emp.employee_id.toLowerCase().includes(term) || emp.id.toString().includes(term) || emp.designation?.toLowerCase().includes(term) || emp.department?.toLowerCase().includes(term));
  }, [employees, employeeSearch]);

  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open onClose={onClose} title={editData ? 'Edit Leave Request' : 'New Leave Request'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-center gap-2 text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><p className="text-sm">{error}</p>
          </div>
        )}

        <div className="relative">
          <FormField label="Employee" required>
            <button type="button" disabled={!!editData} onClick={() => setEmployeeSelectOpen(v => !v)}
              className={`w-full h-9 flex items-center justify-between gap-2 px-3 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${t.inputBg}`}>
              {formData.employee_name ? (
                <div className="flex items-center gap-2 truncate">
                  <User className="h-4 w-4 text-brand-400 shrink-0" />
                  <span className={`font-medium truncate ${t.textPrimary}`}>{formData.employee_name}</span>
                  <span className={`text-xs shrink-0 ${t.textFaint}`}>• {formData.employee_id}</span>
                </div>
              ) : <span className={t.textFaint}>Select employee...</span>}
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
            </button>
          </FormField>
          {employeeSelectOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setEmployeeSelectOpen(false)} />
              <div className={`absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
                <div className={`border-b ${t.border}`}>
                  <input type="text" placeholder="Search by name or ID..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)}
                    className={`w-full h-9 px-3 text-sm bg-transparent outline-none ${t.textPrimary}`} autoFocus />
                </div>
                <div className="max-h-56 overflow-y-auto p-1.5">
                  {loadingEmployees ? (
                    <div className="flex justify-center py-4"><Loader2 className={`h-4 w-4 animate-spin ${t.textFaint}`} /></div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className={`text-sm py-6 text-center ${t.textFaint}`}>No employee found.</div>
                  ) : filteredEmployees.map(emp => (
                    <button key={emp.id} type="button" onClick={() => handleEmployeeSelect(emp)} className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 ${t.textMuted} ${t.hoverBgSoft} transition-colors`}>
                      <User className="h-5 w-5 text-brand-400 shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${t.textPrimary}`}>{emp.name}</p>
                        <p className={`text-xs truncate ${t.textFaint}`}><span className="font-mono text-brand-400">{emp.employee_id}</span>{emp.designation ? ` · ${emp.designation}` : ''}{emp.department ? ` · ${emp.department}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {validationErrors.employee_name && <p className="text-rose-400 text-xs mt-1">{validationErrors.employee_name}</p>}
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
            {validationErrors.start_date && <p className="text-rose-400 text-xs mt-1">{validationErrors.start_date}</p>}
          </FormField>
          <FormField label="End Date" required>
            <input type="date" title="End date" required value={formData.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} min={formData.start_date} className={inputCls} />
            {validationErrors.end_date && <p className="text-rose-400 text-xs mt-1">{validationErrors.end_date}</p>}
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
          {validationErrors.contact_number && <p className="text-rose-400 text-xs mt-1">{validationErrors.contact_number}</p>}
        </FormField>

        <div className="relative">
          <FormField label="Reason for Leave" required>
            <textarea rows={3} required value={formData.reason || ''} onChange={e => handleReasonChange(e.target.value)} onKeyDown={handleReasonKeyDown}
              placeholder="Type a reason or choose from suggestions..." className={`w-full px-3 py-2 rounded-lg text-sm resize-none outline-none transition-colors ${t.inputBg}`} />
          </FormField>
          {validationErrors.reason && <p className="text-rose-400 text-xs mt-1">{validationErrors.reason}</p>}
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
    catch (error) { console.error(error); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this leave request?')) return;
    setUpdating(true);
    try { await onDelete(leave.id); onClose(); } catch (error) { console.error(error); } finally { setUpdating(false); }
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

          {(leave.manager_approval || leave.hr_approval) && (
            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><CheckCircle2 className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Approvals</span></div>
              <div className="px-3.5 py-3 flex gap-6">
                {leave.manager_approval && <IF label="Manager" value={leave.manager_approval} />}
                {leave.hr_approval && <IF label="HR" value={leave.hr_approval} />}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-between pt-1">
            <button type="button" onClick={handleDelete} disabled={updating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onEdit(leave); onClose(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all`}><Edit className="h-3.5 w-3.5" /> Edit</button>
              <div className="relative">
                <button type="button" onClick={() => setShowStatusActions(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">Update Status <ChevronDown className="h-3.5 w-3.5" /></button>
                {showStatusActions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusActions(false)} />
                    <div className={`absolute right-0 bottom-9 z-20 w-44 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
                      <button type="button" onClick={() => handleStatusChange('approved')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 ${t.hoverBgSoft} transition-colors`}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                      <button type="button" onClick={() => handleStatusChange('rejected')} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 ${t.hoverBgSoft} transition-colors`}><XCircle className="h-3.5 w-3.5" /> Reject</button>
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
async function downloadLeavesExcel(rows: Leave[], filename: string, title: string, subtitle: string) {
  const [ExcelJS, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')]);
  const wb = new ExcelJS.default.Workbook();
  const ws = wb.addWorksheet(title.slice(0, 31));
  ws.addRow([title]); ws.addRow([subtitle]); ws.addRow([]);
  const cols = [
    { key: 'employee_name', label: 'Employee' }, { key: 'employee_id', label: 'Employee ID' },
    { key: 'department', label: 'Department' }, { key: 'position', label: 'Position' },
    { key: 'leave_type', label: 'Leave Type' }, { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' }, { key: 'total_days', label: 'Days' },
    { key: 'status', label: 'Status' }, { key: 'reason', label: 'Reason' },
    { key: 'contact_number', label: 'Contact No.' }, { key: 'handover_to', label: 'Handover To' },
    { key: 'applied_date', label: 'Applied' }, { key: 'manager_name', label: 'Manager' },
  ];
  const headerRow = ws.addRow(cols.map(c => c.label));
  headerRow.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } }; });
  rows.forEach(r => ws.addRow([
    r.employee_name, r.employee_id, r.department ?? '—', r.position ?? '—',
    LEAVE_TYPES[r.leave_type]?.name ?? r.leave_type, r.start_date, r.end_date,
    `${r.total_days} day${r.total_days === 1 ? '' : 's'}`,
    r.status.charAt(0).toUpperCase() + r.status.slice(1), r.reason ?? '', r.contact_number ?? '',
    r.handover_to ?? '', r.applied_date ? new Date(r.applied_date).toLocaleDateString('en-GB') : '', r.manager_name ?? '',
  ]));
  ws.columns.forEach(c => { c.width = 18; });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `${filename}.xlsx`);
}

// ============= Main Component =============
function LeaveManagementContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Leave | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, on_leave_now: 0, approvalRate: 0, total_days_requested: 0, average_days: 0 });

  const [showTypeSummary, setShowTypeSummary] = useState(false);
  const [showEmployeeSummary, setShowEmployeeSummary] = useState(false);
  const [filterPanelMinimized, setFilterPanelMinimized] = useState(true);
  const [recordsPanelMinimized, setRecordsPanelMinimized] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const leavesData = await fetchLeaves();
      setLeaves(leavesData);
      const today = new Date().toISOString().split('T')[0];
      const approvedLeaves = leavesData.filter(l => l.status === 'approved');
      const rejectedLeaves = leavesData.filter(l => l.status === 'rejected');
      const decided = approvedLeaves.length + rejectedLeaves.length;
      const approvalRate = decided > 0 ? Math.round((approvedLeaves.length / decided) * 100) : 0;
      const totalDays = leavesData.reduce((sum, l) => sum + (l.total_days || 0), 0);
      const avgDays = leavesData.length > 0 ? Math.round(totalDays / leavesData.length) : 0;
      setStats({
        total: leavesData.length, pending: leavesData.filter(l => l.status === 'pending').length,
        approved: approvedLeaves.length, rejected: rejectedLeaves.length,
        on_leave_now: approvedLeaves.filter(l => l.start_date <= today && l.end_date >= today).length,
        approvalRate, total_days_requested: totalDays, average_days: avgDays,
      });
      setLoading(false);
    } catch (err) { toast.error((err as Error).message || 'Failed to fetch data'); setLoading(false); }
  };

  useEffect(() => {
    fetchAllData();
    let interval: ReturnType<typeof setInterval> | null = null;
    function startPolling() { interval = setInterval(() => { if (document.visibilityState === 'visible') fetchAllData(); }, 30000); }
    function handleVisibility() {
      if (document.visibilityState === 'visible') { fetchAllData(); if (!interval) startPolling(); }
      else if (interval) { clearInterval(interval); interval = null; }
    }
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

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
            { label: 'Total Days', value: stats.total_days_requested, textClass: 'text-violet-400', onClick: undefined },
            { label: 'Pending', value: stats.pending, textClass: 'text-amber-400', onClick: () => setFilter('pending') },
            { label: 'Approved', value: stats.approved, textClass: 'text-emerald-400', onClick: () => setFilter('approved') },
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
            <button type="button" onClick={() => downloadLeavesExcel(filteredLeaves, ['Leaves', searchTerm || null, filter !== 'all' ? filter : null, typeFilter !== 'all' ? typeFilter : null].filter(Boolean).join('_'), 'Leave Records', [searchTerm && `Employee: ${searchTerm}`, filter !== 'all' && `Status: ${filter}`].filter(Boolean).join(' | ') || 'All records')}
              disabled={filteredLeaves.length === 0} className={`h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-medium ${t.chipBg} ${t.hoverBg} ${t.textFaint} disabled:opacity-40 transition-all`}>
              <Download className="h-3 w-3" /> Export
            </button>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.border}`}>
                      {['Employee', 'Type', 'Dates', 'Days', 'Status', 'Applied', 'Actions'].map((h, i) => (
                        <th key={h} className={`${i === 6 ? 'text-right' : 'text-left'} px-4 py-2.5 text-xs font-semibold ${t.chipBg} ${t.textFaint}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map(leave => (
                      <tr key={leave.id} className={`cursor-pointer border-b ${t.border} ${t.hoverBgSoft} transition-colors`} onClick={() => setSelectedLeave(leave)}>
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
