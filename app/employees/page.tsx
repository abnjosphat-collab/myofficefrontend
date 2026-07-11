// app/employees/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Plus, Search, ChevronDown, ChevronUp, RefreshCw,
  Loader2, Clock, AlertCircle, Trash2, X, Edit,
  Mail, Briefcase, GraduationCap, UserCheck,
  FilterX, Sparkles, UserRound, BriefcaseBusiness, Phone,
  ArrowUpDown, List, LayoutGrid, Hash, MapPin,
  Filter, FileText, Award, Download, ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ACCENT_HEX, GlowCard, SelectField,
  GroupSection, Collapse, staggerContainer, fadeUp,
} from '@/components/shared/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  id_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_engagement?: string;
  designation?: string;
  employee_class?: string;
  supervisor?: string;
  section?: string;
  department?: string;
  grade?: string;
  qualifications?: string[];
  employment_type?: 'NEC' | 'SALARIED' | '';
  drivers_license_class?: string;
  ppe_issue_date?: string;
  offences?: string[];
  awards_recognition?: string[];
  other_positions?: string[];
  previous_employer?: string;
}

interface EmployeeFormData {
  employee_id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string;
  address: string;
  date_of_engagement: string;
  designation: string;
  employee_class: string;
  employment_type: 'NEC' | 'SALARIED' | '';
  supervisor: string;
  section: string;
  department: string;
  grade: string;
  qualifications: string[];
  drivers_license_class: string;
  offences: string[];
  awards_recognition: string[];
  other_positions: string[];
  previous_employer: string;
}

type SortField = 'first_name' | 'employee_id' | 'designation' | 'department' | 'date_of_engagement';
type SortDir = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const EMPLOYEES_API = `${API_BASE}/api/employees`;
const CLASS_OPTIONS = ['Permanent', 'Contract', 'Internship', 'Part-Time'] as const;

const CLASS_COLORS: Record<string, string> = {
  Permanent: '#34d399', Contract: '#f59e0b', Internship: ACCENT_HEX.blue, 'Part-Time': '#a78bfa',
};
const ETYPE_COLORS: Record<string, string> = { NEC: ACCENT_HEX.indigo, SALARIED: '#14b8a6' };
const SECTION_COLORS: Record<string, string> = {
  Mechanical: ACCENT_HEX.blue, Electrical: '#f59e0b', Civil: '#34d399', Instrumentation: '#a78bfa',
};

// Palette for sections that aren't one of the predefined four — hashed so each
// distinct section name always gets the same colour (like the homepage's per-category
// accents), instead of every unknown section rendering the same flat grey.
const GROUP_PALETTE = ['#60a5fa', '#f59e0b', '#34d399', '#a78bfa', '#f43f5e', '#22d3ee', '#fb923c', '#a3e635', '#e879f9'];
function sectionColor(section?: string) {
  if (!section) return '#94a3b8';
  if (SECTION_COLORS[section]) return SECTION_COLORS[section];
  let h = 0;
  for (let i = 0; i < section.length; i++) h = (h * 31 + section.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

// Stable display order for the section groups (the record accordions).
const SECTION_ORDER = ['Mechanical', 'Electrical', 'Civil', 'Instrumentation'];

// ─── Utilities ────────────────────────────────────────────────────────────────

function tenure(eng?: string) {
  if (!eng) return '—';
  try {
    const s = new Date(eng); const n = new Date();
    if (isNaN(s.getTime())) return '—';
    let y = n.getFullYear() - s.getFullYear(), m = n.getMonth() - s.getMonth();
    if (m < 0) { y--; m += 12; }
    if (y === 0 && m === 0) return '<1 mo';
    return [y > 0 && `${y}y`, m > 0 && `${m}m`].filter(Boolean).join(' ');
  } catch { return '—'; }
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const d = e.detail;
    throw new Error(
      Array.isArray(d) ? d.map((x: { msg?: string }) => x.msg || String(x)).join('; ')
        : typeof d === 'string' ? d : e.message || `HTTP ${r.status}`
    );
  }
  return r.json();
}

async function loadEmployees() { return apiFetch<Employee[]>(EMPLOYEES_API); }
async function saveEmployee(data: EmployeeFormData, id?: number) {
  if (id) return apiFetch<Employee>(`${EMPLOYEES_API}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return apiFetch<Employee>(EMPLOYEES_API, { method: 'POST', body: JSON.stringify(data) });
}
async function removeEmployee(id: number) {
  await apiFetch(`${EMPLOYEES_API}/${id}`, { method: 'DELETE' });
}

// ─── Small themed building blocks ────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const t = useTheme();
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div>
      <div className={`text-sm ${t.textMuted}`}>{value || '—'}</div>
    </div>
  );
}

function FilterChips({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <div>
      <p className={`text-xs font-medium mb-1.5 ${t.textFaint}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
              value === o.value ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── EmployeeForm ─────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSubmit: (d: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EMPTY_FORM: EmployeeFormData = {
  employee_id: '', first_name: '', last_name: '', id_number: '',
  email: '', phone: '', address: '', date_of_engagement: '', designation: '',
  employee_class: '', employment_type: '', supervisor: '', section: '',
  department: '', grade: '',
  qualifications: [], drivers_license_class: '',
  offences: [], awards_recognition: [], other_positions: [], previous_employer: '',
};

function EmployeeForm({ initialData, onSubmit, onCancel, isSubmitting }: EmployeeFormProps) {
  const t = useTheme();
  const [form, setForm] = useState<EmployeeFormData>(
    initialData ? {
      employee_id: initialData.employee_id || '',
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      id_number: initialData.id_number || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      address: initialData.address || '',
      date_of_engagement: initialData.date_of_engagement || '',
      designation: initialData.designation || '',
      employee_class: initialData.employee_class || '',
      employment_type: (initialData.employment_type as 'NEC' | 'SALARIED' | '') || '',
      supervisor: initialData.supervisor || '',
      section: initialData.section || '',
      department: initialData.department || '',
      grade: initialData.grade || '',
      qualifications: initialData.qualifications || [],
      drivers_license_class: initialData.drivers_license_class || '',
      offences: initialData.offences || [],
      awards_recognition: initialData.awards_recognition || [],
      other_positions: initialData.other_positions || [],
      previous_employer: initialData.previous_employer || '',
    } : { ...EMPTY_FORM }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'basic' | 'employment' | 'qualifications' | 'additional'>('basic');
  const [temps, setTemps] = useState({ qual: '', offence: '', award: '', pos: '' });

  const set = (f: keyof EmployeeFormData, v: string | string[]) => {
    setForm(p => ({ ...p, [f]: v }));
    if (errors[f]) setErrors(p => { const n = { ...p }; delete n[f]; return n; });
  };
  const addItem = (f: keyof EmployeeFormData, v: string, k: keyof typeof temps) => {
    if (v.trim()) { set(f, [...(form[f] as string[]), v.trim()]); setTemps(p => ({ ...p, [k]: '' })); }
  };
  const rmItem = (f: keyof EmployeeFormData, i: number) =>
    set(f, (form[f] as string[]).filter((_, j) => j !== i));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employee_id.trim()) e.employee_id = 'Required';
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.id_number.trim()) e.id_number = 'Required';
    if (!form.date_of_engagement) e.date_of_engagement = 'Required';
    if (!form.designation.trim()) e.designation = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  const tabs = [
    { id: 'basic' as const, label: 'Personal', icon: UserRound },
    { id: 'employment' as const, label: 'Employment', icon: BriefcaseBusiness },
    { id: 'qualifications' as const, label: 'Qualifications', icon: GraduationCap },
    { id: 'additional' as const, label: 'Additional', icon: Sparkles },
  ];

  const tagInput = (f: 'qualifications' | 'other_positions' | 'awards_recognition' | 'offences', k: keyof typeof temps, ph: string, tint: string) => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={temps[k]}
          placeholder={ph}
          onChange={e => setTemps(p => ({ ...p, [k]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(f, temps[k], k))}
          className={inputCls}
        />
        <button type="button" onClick={() => addItem(f, temps[k], k)}
          className="px-3 h-9 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-sm font-medium transition-all whitespace-nowrap">
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(form[f] as string[]).map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ color: tint, background: `${tint}18`, border: `1px solid ${tint}30` }}>
            {item}
            <button type="button" aria-label="Remove" onClick={() => rmItem(f, i)} className="hover:opacity-60 ml-0.5 transition-opacity"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={`flex gap-1 border-b ${t.border} pb-3 flex-wrap`}>
        {tabs.map(tb => {
          const Icon = tb.icon;
          return (
            <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === tb.id ? 'bg-blue-500/15 text-blue-400' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`
              }`}>
              <Icon className="h-3.5 w-3.5" />{tb.label}
            </button>
          );
        })}
      </div>

      <div className="max-h-[54vh] overflow-y-auto pr-1">
        {tab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { f: 'employee_id' as const, label: 'Employee ID', ph: 'e.g. C1165, PM365', upper: true, required: true },
              { f: 'first_name' as const,  label: 'First Name',  ph: 'First name', required: true },
              { f: 'last_name' as const,   label: 'Last Name',   ph: 'Last name', required: true },
              { f: 'id_number' as const,   label: 'ID Number',   ph: 'National ID or passport', required: true },
              { f: 'email' as const,       label: 'Email',       ph: 'Optional', type: 'email' },
              { f: 'phone' as const,       label: 'Phone',       ph: 'Optional' },
            ].map(({ f, label, ph, upper, type, required }) => (
              <FormField key={f} label={label} required={required}>
                <input
                  type={type ?? 'text'}
                  value={form[f]}
                  onChange={e => set(f, upper ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={ph}
                  className={`${inputCls} ${errors[f] ? 'ring-1 ring-rose-500/50' : ''}`}
                />
                {errors[f] && <p className="text-xs text-rose-500 mt-1">{errors[f]}</p>}
              </FormField>
            ))}
            <div className="md:col-span-2">
              <FormField label="Address">
                <textarea value={form.address} rows={2} placeholder="Optional"
                  onChange={e => set('address', e.target.value)}
                  className={`${inputCls} h-auto py-2 resize-none`} />
              </FormField>
            </div>
          </div>
        )}

        {tab === 'employment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Engagement Date" required>
              <input type="date" title="Date of engagement" value={form.date_of_engagement}
                onChange={e => set('date_of_engagement', e.target.value)}
                className={`${inputCls} ${errors.date_of_engagement ? 'ring-1 ring-rose-500/50' : ''}`} />
              {errors.date_of_engagement && <p className="text-xs text-rose-500 mt-1">{errors.date_of_engagement}</p>}
            </FormField>
            <FormField label="Designation" required>
              <input value={form.designation} placeholder="Job title / position"
                onChange={e => set('designation', e.target.value)}
                className={`${inputCls} ${errors.designation ? 'ring-1 ring-rose-500/50' : ''}`} />
              {errors.designation && <p className="text-xs text-rose-500 mt-1">{errors.designation}</p>}
            </FormField>
            <FormField label="Employee Class">
              <SelectField size="form"
                title="Employee class"
                value={form.employee_class || 'none'}
                onChange={v => set('employee_class', v === 'none' ? '' : v)}
                options={[{ value: 'none', label: 'None' }, ...CLASS_OPTIONS]}
              />
            </FormField>
            <FormField label="Employment Type">
              <div className="flex gap-2">
                {(['', 'NEC', 'SALARIED'] as const).map(et => (
                  <button key={et || 'none'} type="button"
                    onClick={() => set('employment_type', et)}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${
                      form.employment_type === et
                        ? et === 'NEC' ? 'bg-indigo-500/20 text-indigo-400' : et === 'SALARIED' ? 'bg-teal-500/20 text-teal-400' : `${t.chipBg} ${t.textMuted}`
                        : `${t.hoverBg} ${t.textFaint}`
                    }`}>
                    {et || 'Not set'}
                  </button>
                ))}
              </div>
            </FormField>
            {[
              { f: 'department' as const,        label: 'Department' },
              { f: 'section' as const,           label: 'Section' },
              { f: 'grade' as const,             label: 'Grade' },
              { f: 'supervisor' as const,        label: 'Supervisor' },
              { f: 'previous_employer' as const, label: 'Previous Employer' },
            ].map(({ f, label }) => (
              <FormField key={f} label={label}>
                <input value={form[f]} onChange={e => set(f, e.target.value)} placeholder="Optional" className={inputCls} />
              </FormField>
            ))}
          </div>
        )}

        {tab === 'qualifications' && (
          <FormField label="Qualifications">
            {tagInput('qualifications', 'qual', 'Add a qualification', ACCENT_HEX.blue)}
          </FormField>
        )}

        {tab === 'additional' && (
          <div className="space-y-5">
            <FormField label="Driver's License Class">
              <input value={form.drivers_license_class} placeholder="Optional"
                onChange={e => set('drivers_license_class', e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Other Positions">{tagInput('other_positions', 'pos', 'Add position', '#a78bfa')}</FormField>
            <FormField label="Awards & Recognition">{tagInput('awards_recognition', 'award', 'Add award or recognition', '#f59e0b')}</FormField>
            <FormField label="Offences">{tagInput('offences', 'offence', 'Add offence record', '#f43f5e')}</FormField>
          </div>
        )}
      </div>

      <FormActions onCancel={onCancel} submitting={isSubmitting} submitLabel={initialData ? 'Save Changes' : 'Add Employee'} accent="violet" />
    </form>
  );
}

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

interface EmployeeRowProps { employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void; }

function EmployeeRow({ employee, onEdit, onDelete }: EmployeeRowProps) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const name = `${employee.first_name} ${employee.last_name}`;
  const ten = tenure(employee.date_of_engagement);
  const quals = employee.qualifications?.length ?? 0;
  const secColor = sectionColor(employee.section);

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group border-l-2`} style={{ borderLeftColor: secColor }}>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${secColor}1a` }}>
          <UserRound className="h-5 w-5" style={{ color: secColor }} />
        </div>

        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className={`font-semibold text-sm ${t.textPrimary}`}>{name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-mono ${t.textFaint}`}>{employee.employee_id}</span>
            {employee.designation && <span className={`text-xs ${t.textFaint}`}>· {employee.designation}</span>}
            {employee.section && <StatusBadge color={secColor} label={employee.section} />}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {employee.employment_type && (
            <span className="hidden sm:block"><StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? '#94a3b8'} label={employee.employment_type} /></span>
          )}
          <span className="hidden sm:block"><StatusBadge color={CLASS_COLORS[employee.employee_class || ''] ?? '#94a3b8'} label={employee.employee_class || 'Unclassified'} /></span>
          <span className={`hidden md:flex items-center gap-1 text-[11px] ${t.textFaint}`}><Clock className="h-3 w-3" />{ten}</span>
          {quals > 0 && <span className={`hidden lg:flex items-center gap-1 text-[11px] ${t.textFaint}`}><GraduationCap className="h-3 w-3" />{quals}</span>}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {employee.email && (
            <button type="button" title="Send email" onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
              className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
              <Mail className="h-3.5 w-3.5" />
            </button>
          )}
          {employee.phone && (
            <button type="button" title="Call" onClick={() => window.open(`tel:${employee.phone}`, '_self')}
              className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" title="Edit employee" onClick={() => onEdit(employee)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete employee" onClick={() => onDelete(employee)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.textFaint} ${t.hoverText} transition-all md:hidden`}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className={`px-4 pb-4 pt-3 border-t ${t.border} ${t.hoverBgSoft} space-y-3`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                <UserRound className="h-3.5 w-3.5 text-blue-400" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.textSecondary}`}>Personal</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="ID Number" value={employee.id_number} />
                <InfoRow label="Phone" value={employee.phone ? <a href={`tel:${employee.phone}`} className="text-blue-400 hover:underline">{employee.phone}</a> : undefined} />
                <div className="col-span-2"><InfoRow label="Email" value={employee.email ? <a href={`mailto:${employee.email}`} className="text-blue-400 hover:underline">{employee.email}</a> : undefined} /></div>
                {employee.address && <div className="col-span-2"><InfoRow label="Address" value={employee.address} /></div>}
              </div>
            </div>

            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                <BriefcaseBusiness className="h-3.5 w-3.5 text-blue-400" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.textSecondary}`}>Employment</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="Engaged" value={fmtDate(employee.date_of_engagement)} />
                <InfoRow label="Tenure" value={ten} />
                <InfoRow label="Section" value={employee.section} />
                <InfoRow label="Grade" value={employee.grade} />
                <InfoRow label="Supervisor" value={employee.supervisor} />
                <InfoRow label="Prev. Employer" value={employee.previous_employer} />
              </div>
            </div>
          </div>

          {quals > 0 && (
            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.textSecondary}`}>Qualifications</span>
                <span className={`text-[10px] ml-1 ${t.textFaint}`}>{quals} recorded</span>
              </div>
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {employee.qualifications!.map((q, i) => <StatusBadge key={i} color={ACCENT_HEX.blue} label={q} />)}
              </div>
            </div>
          )}

          {((employee.awards_recognition?.length ?? 0) > 0 || (employee.other_positions?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(employee.awards_recognition?.length ?? 0) > 0 && (
                <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
                  <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${t.textSecondary}`}>Awards</span>
                  </div>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.awards_recognition!.map((a, i) => <StatusBadge key={i} color="#f59e0b" label={a} />)}
                  </div>
                </div>
              )}
              {(employee.other_positions?.length ?? 0) > 0 && (
                <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
                  <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                    <Briefcase className="h-3.5 w-3.5 text-violet-400" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${t.textSecondary}`}>Other Positions</span>
                  </div>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.other_positions!.map((p, i) => <StatusBadge key={i} color="#a78bfa" label={p} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => onEdit(employee)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-all font-medium">
              <Edit className="h-3 w-3" /> Edit Employee
            </button>
            <button type="button" onClick={() => onDelete(employee)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmployeeCard — the same InfoCard tile the homepage module cards use (icon +
// title + hover-revealed detail + GlowCard lift/glow), so a person reads exactly like
// a "Personnel"/"Assets" tile. Clicking opens the quick-view popup below. No initials
// avatar — a person icon tinted by the employee's section, matching the homepage. ──

function EmployeeCard({ employee, onEdit, onDelete }: { employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const name = `${employee.first_name} ${employee.last_name}`;
  const secColor = sectionColor(employee.section);
  const ten = tenure(employee.date_of_engagement);
  const quals = employee.qualifications ?? [];

  return (
    <GlowCard color={secColor} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      {/* Header: person icon (no initials), name, job title, section/type badges */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${secColor}1a` }}>
            <UserRound className="h-[22px] w-[22px]" style={{ color: secColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-semibold leading-tight truncate ${t.textPrimary}`}>{name}</p>
            <p className={`text-xs mt-0.5 truncate ${t.textMuted}`}>{employee.designation || 'No role'}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {employee.section && <StatusBadge color={secColor} label={employee.section} />}
              {employee.employment_type && <StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? '#94a3b8'} label={employee.employment_type} />}
            </div>
          </div>
          <button type="button" onClick={() => setExpanded(o => !o)} title={expanded ? 'Show less' : 'Expand details'}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all shrink-0`}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Key summary (always visible) */}
        <div className={`mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={Hash} label="Mine No." value={employee.employee_id} />
          <SummaryItem icon={Phone} label="Phone" value={employee.phone} />
          {employee.address && <div className="col-span-2"><SummaryItem icon={MapPin} label="Address" value={employee.address} /></div>}
        </div>
      </div>

      {/* Expanded — the rest of the detail, in-place */}
      <Collapse open={expanded}>
        <div className={`px-4 pb-4 border-t ${t.border} pt-3 space-y-3`}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <InfoRow label="ID Number" value={employee.id_number} />
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Tenure" value={ten} />
            <InfoRow label="Joined" value={fmtDate(employee.date_of_engagement)} />
            <InfoRow label="Grade" value={employee.grade} />
            <InfoRow label="Supervisor" value={employee.supervisor} />
            <InfoRow label="Class" value={employee.employee_class || 'Unclassified'} />
          </div>
          {employee.email && (
            <a href={`mailto:${employee.email}`} className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline w-fit">
              <Mail className="h-3 w-3" />{employee.email}
            </a>
          )}
          {quals.length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Qualifications</p>
              <div className="flex flex-wrap gap-1.5">
                {quals.map((q, i) => <span key={i} className={`text-[10.5px] font-medium ${t.textMuted} ${t.chipBg} rounded-full px-2 py-0.5`}>{q}</span>)}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onEdit(employee)} type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[12px] font-semibold hover:brightness-110 transition-all">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => onDelete(employee)} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] font-semibold transition-all`}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      </Collapse>
    </GlowCard>
  );
}

// One line of the always-visible summary on an employee card (icon + label + value).
function SummaryItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  const t = useTheme();
  if (!value) return null;
  return (
    <span className="flex items-start gap-1.5 min-w-0">
      <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${t.textFaint}`} />
      <span className="min-w-0 truncate"><span className={t.textFaint}>{label}: </span>{value}</span>
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function EmployeesPageContent() {
  const t = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [classFilter,   setClassFilter]   = useState('all');
  const [etypeFilter,   setEtypeFilter]   = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [deptFilter,    setDeptFilter]    = useState('all');
  const [roleFilter,    setRoleFilter]    = useState('all');
  const [sortBy, setSortBy] = useState<SortField>('first_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  // Records are grouped by section (homepage category-accordion vocabulary); this
  // tracks which section groups the user has collapsed (default: all open).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  const sections = useCollapseSection({ hero: true });

  const reload = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setEmployees(await loadEmployees()); }
    catch (e) { const m = e instanceof Error ? e.message : 'Failed to load'; setError(m); toast.error(m); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const uniqueDepts    = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean) as string[])].sort(), [employees]);
  const uniqueRoles    = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean) as string[])].sort(), [employees]);

  const filtered = useMemo(() => {
    let list = [...employees];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
        e.employee_id?.toLowerCase().includes(s) ||
        (e.designation?.toLowerCase() ?? '').includes(s) ||
        (e.id_number?.toLowerCase() ?? '').includes(s) ||
        (e.section?.toLowerCase() ?? '').includes(s)
      );
    }
    if (classFilter   !== 'all') list = list.filter(e => (e.employee_class || 'Unclassified') === classFilter);
    if (etypeFilter   !== 'all') list = list.filter(e => (e.employment_type || '') === etypeFilter);
    if (sectionFilter !== 'all') list = list.filter(e => (e.section || '') === sectionFilter);
    if (deptFilter    !== 'all') list = list.filter(e => e.department === deptFilter);
    if (roleFilter    !== 'all') list = list.filter(e => e.designation === roleFilter);
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sortBy === 'first_name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
      else if (sortBy === 'date_of_engagement') { av = a.date_of_engagement || ''; bv = b.date_of_engagement || ''; }
      else { av = (a[sortBy] as string) || ''; bv = (b[sortBy] as string) || ''; }
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    return list;
  }, [employees, search, classFilter, etypeFilter, sectionFilter, deptFilter, roleFilter, sortBy, sortDir]);

  // Group the filtered/sorted list by section — defined sections first (in a stable
  // order), any other sections alphabetically, "Unassigned" last.
  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const e of filtered) {
      const key = e.section || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const rank = (k: string) => {
      if (k === 'Unassigned') return 999;
      const i = SECTION_ORDER.indexOf(k);
      return i === -1 ? 500 : i;
    };
    return [...map.keys()]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map(section => ({ section, color: sectionColor(section === 'Unassigned' ? undefined : section), employees: map.get(section)! }));
  }, [filtered]);

  // A group is open unless the user collapsed it; an active search force-opens every
  // group so matches are always visible.
  const isGroupOpen = (section: string) => !!search || !collapsedGroups.has(section);
  const toggleGroup = (section: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(section) ? next.delete(section) : next.add(section);
    return next;
  });
  const allGroupsOpen = grouped.every(g => !collapsedGroups.has(g.section));
  const toggleAllGroups = () => setCollapsedGroups(allGroupsOpen ? new Set(grouped.map(g => g.section)) : new Set());

  const activeFilterCount = [search, classFilter !== 'all', etypeFilter !== 'all', sectionFilter !== 'all', deptFilter !== 'all', roleFilter !== 'all'].filter(Boolean).length;

  const stats = useMemo(() => ({
    total:    employees.length,
    nec:      employees.filter(e => e.employment_type === 'NEC').length,
    salaried: employees.filter(e => e.employment_type === 'SALARIED').length,
    permanent:employees.filter(e => e.employee_class === 'Permanent').length,
  }), [employees]);

  const openAdd  = () => { setSelectedEmployee(null); setShowForm(true); };
  const openEdit = (e: Employee) => { setSelectedEmployee(e); setShowForm(true); };
  const onDelete = async (e: Employee) => {
    if (!confirm(`Delete ${e.first_name} ${e.last_name}? This cannot be undone.`)) return;
    try { await removeEmployee(e.id); await reload(); toast.success(`${e.first_name} ${e.last_name} deleted`); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
  };
  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true); setError(null);
    try {
      await saveEmployee(data, selectedEmployee?.id);
      toast.success(selectedEmployee ? 'Employee updated' : 'Employee added');
      await reload(); setShowForm(false); setSelectedEmployee(null);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Save failed'; setError(m); toast.error(m);
    } finally { setIsSubmitting(false); }
  };
  const clearFilters = () => { setSearch(''); setClassFilter('all'); setEtypeFilter('all'); setSectionFilter('all'); setDeptFilter('all'); setRoleFilter('all'); };

  const downloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Personnel Registry');
      ws.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 14 },
        { header: 'First Name', key: 'first_name', width: 18 },
        { header: 'Last Name', key: 'last_name', width: 18 },
        { header: 'Type', key: 'employment_type', width: 10 },
        { header: 'Designation', key: 'designation', width: 24 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Section', key: 'section', width: 18 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Class', key: 'employee_class', width: 14 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Date of Engagement', key: 'date_of_engagement', width: 18 },
        { header: 'Supervisor', key: 'supervisor', width: 20 },
        { header: 'ID Number', key: 'id_number', width: 16 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
      });
      employees.forEach(e => ws.addRow({ ...e, date_of_engagement: fmtDate(e.date_of_engagement) }));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Personnel_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${employees.length} employees`);
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Users}
        accent="violet"
        crumbs={['Core Management', 'Personnel']}
        title="Personnel Registry"
        description="Employee profiles, roles, and organisational structure."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={reload} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={downloadExcel} disabled={employees.length === 0} title="Download Excel"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors disabled:opacity-40`}>
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={openAdd} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={Users} color={ACCENT_HEX.blue} value={stats.total} label="Total Staff" onClick={() => { setEtypeFilter('all'); setClassFilter('all'); }} />
          <StatTile icon={BriefcaseBusiness} color={ACCENT_HEX.indigo} value={stats.nec} label="NEC" onClick={() => setEtypeFilter('NEC')} />
          <StatTile icon={BriefcaseBusiness} color="#14b8a6" value={stats.salaried} label="Salaried" onClick={() => setEtypeFilter('SALARIED')} />
          <StatTile icon={UserCheck} color={ACCENT_HEX.amber} value={stats.permanent} label="Permanent" onClick={() => setClassFilter('Permanent')} />
        </div>
      </PageHero>

      {error && (
        <div className={`${t.glass} rounded-2xl p-4 flex items-center gap-3 border border-rose-500/30`}>
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-400 flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} className={`${t.textFaint} ${t.hoverText}`}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID, role…" className="flex-1" />
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-blue-500/15 text-blue-400' : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`}`}>
              <Filter className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && <span className={`ml-1 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
                <FilterX className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'list', icon: List, label: 'List view' }, { value: 'grid', icon: LayoutGrid, label: 'Grid view' }]} />
          </div>
        </div>

        {showFilters && (
          <div className={`pt-4 border-t ${t.border} space-y-3`}>
            <FilterChips label="Employment Type" value={etypeFilter} onChange={setEtypeFilter}
              options={[{ value: 'all', label: 'All Types' }, { value: 'NEC', label: 'NEC' }, { value: 'SALARIED', label: 'Salaried' }]} />
            <FilterChips label="Employee Class" value={classFilter} onChange={setClassFilter}
              options={[{ value: 'all', label: 'All Classes' }, ...CLASS_OPTIONS.map(c => ({ value: c, label: c }))]} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className={`text-xs font-medium mb-1.5 ${t.textFaint}`}>Department</p>
                <SelectField size="filter" title="Filter by department" value={deptFilter} onChange={setDeptFilter}
                  options={[{ value: 'all', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))]} />
              </div>
              <div>
                <p className={`text-xs font-medium mb-1.5 ${t.textFaint}`}>Role</p>
                <SelectField size="filter" title="Filter by role" value={roleFilter} onChange={setRoleFilter}
                  options={[{ value: 'all', label: 'All Roles' }, ...uniqueRoles.map(r => ({ value: r, label: r }))]} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records — grouped by section (homepage category-accordion vocabulary) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className={`text-sm ${t.textFaint}`}>
            Showing <span className={`font-semibold ${t.textPrimary}`}>{filtered.length}</span> of {employees.length} employees
            {grouped.length > 0 && <span> · {grouped.length} section{grouped.length === 1 ? '' : 's'}</span>}
          </p>
          <div className="flex items-center gap-2">
            <SelectField size="filter" title="Sort by" value={sortBy} onChange={v => setSortBy(v as SortField)}
              options={[
                { value: 'first_name', label: 'Name (A–Z)' },
                { value: 'employee_id', label: 'Employee ID' },
                { value: 'designation', label: 'Role' },
                { value: 'department', label: 'Department' },
                { value: 'date_of_engagement', label: 'Date of Engagement' },
              ]} />
            <button type="button" title="Toggle sort direction" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Card grid' }, { value: 'list', icon: List, label: 'Compact rows' }]} />
            {grouped.length > 1 && !search && (
              <button type="button" onClick={toggleAllGroups}
                className={`flex items-center gap-1.5 text-[12px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 transition-colors`}>
                {allGroupsOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                {allGroupsOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={`${t.glass} rounded-2xl p-16 text-center`}>
            <Loader2 className={`h-8 w-8 animate-spin ${t.textFaint} mx-auto`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} rounded-2xl p-12 text-center`}>
            {employees.length === 0 ? (
              <>
                <Users className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
                <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No employees yet</h3>
                <p className={`text-sm mb-4 ${t.textFaint}`}>Add your first employee to get started.</p>
                <button type="button" onClick={openAdd} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </button>
              </>
            ) : (
              <>
                <FilterX className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
                <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No results match your filters</h3>
                <p className={`text-sm mb-4 ${t.textFaint}`}>Try adjusting your search or filters.</p>
                <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-all`}>
                  <FilterX className="h-3.5 w-3.5" /> Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {grouped.map(g => (
              <GroupSection
                key={g.section}
                icon={Users}
                accentHex={g.color}
                title={g.section}
                count={g.employees.length}
                countLabel={g.employees.length === 1 ? 'person' : 'people'}
                open={isGroupOpen(g.section)}
                onToggle={() => toggleGroup(g.section)}
                gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4'}
              >
                {g.employees.map(e => (
                  <motion.div key={e.id} variants={fadeUp}>
                    {viewMode === 'grid'
                      ? <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                      : <EmployeeRow employee={e} onEdit={openEdit} onDelete={onDelete} />}
                  </motion.div>
                ))}
              </GroupSection>
            ))}
          </motion.div>
        )}
      </div>

      <CenterModal
        open={showForm}
        onClose={() => { setShowForm(false); setSelectedEmployee(null); }}
        title={selectedEmployee ? `Edit — ${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'Add New Employee'}
        subtitle={selectedEmployee ? `ID: ${selectedEmployee.employee_id} · All fields are editable` : 'Fields marked with * are required'}
        accent="violet"
        width="max-w-3xl"
      >
        <div className="p-5">
          <EmployeeForm
            initialData={selectedEmployee}
            onSubmit={onSubmit}
            onCancel={() => { setShowForm(false); setSelectedEmployee(null); }}
            isSubmitting={isSubmitting}
          />
        </div>
      </CenterModal>
    </main>
  );
}

export default function EmployeesPage() {
  return (
    <AppShell>
      <EmployeesPageContent />
    </AppShell>
  );
}
