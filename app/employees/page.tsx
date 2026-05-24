// app/employees/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, ChevronDown, ChevronUp, RefreshCw,
  Loader2, Clock, AlertCircle, Trash2, X, Edit,
  Mail, Briefcase, Building, Calendar, GraduationCap, UserCheck,
  FilterX, Sparkles, UserRound, BriefcaseBusiness, Phone,
  ChevronLeft, ChevronRight, ArrowUpDown, List, LayoutGrid,
  Filter, FileText, Award, Download, FileSpreadsheet, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import {
  IF as InfoField, EmptyState, LoadingPane,
  HeroPanel, GlassPanel, RecordsPanelHeader, FilterChips,
  fmtDate, initials as sharedInitials,
  usePageCollapse, MasterCollapseButton,
  type StatItem,
} from '@/components/shared';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

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
  supervisor: string;
  section: string;
  department: string;
  grade: string;
  qualifications: string[];
  drivers_license_class: string;
  ppe_issue_date: string;
  offences: string[];
  awards_recognition: string[];
  other_positions: string[];
  previous_employer: string;
}

type SortField = 'first_name' | 'employee_id' | 'designation' | 'department';
type SortDir = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const EMPLOYEES_API = `${API_BASE}/api/employees`;
const CLASS_OPTIONS = ['Permanent', 'Contract', 'Internship', 'Part-Time'] as const;

// ─── Design tokens ────────────────────────────────────────────────────────────

const GIN = "bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10] h-9 text-sm";
const LBL = "text-white/55 text-xs font-medium";

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

function classPill(cls?: string) {
  const map: Record<string, string> = {
    Permanent:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Contract:   'bg-amber-500/20  text-amber-300  border-amber-500/30',
    Internship: 'bg-blue-500/20   text-blue-300   border-blue-500/30',
    'Part-Time':'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return map[cls || ''] ?? 'bg-white/10 text-white/55 border-white/12';
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

// ─── EmployeeForm — dark glass inputs ────────────────────────────────────────

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSubmit: (d: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EMPTY_FORM: EmployeeFormData = {
  employee_id: '', first_name: '', last_name: '', id_number: '',
  email: '', phone: '', address: '', date_of_engagement: '', designation: '',
  employee_class: '', supervisor: '', section: '', department: '', grade: '',
  qualifications: [], drivers_license_class: '', ppe_issue_date: '',
  offences: [], awards_recognition: [], other_positions: [], previous_employer: '',
};

function EmployeeForm({ initialData, onSubmit, onCancel, isSubmitting }: EmployeeFormProps) {
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
      supervisor: initialData.supervisor || '',
      section: initialData.section || '',
      department: initialData.department || '',
      grade: initialData.grade || '',
      qualifications: initialData.qualifications || [],
      drivers_license_class: initialData.drivers_license_class || '',
      ppe_issue_date: initialData.ppe_issue_date || '',
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

  const textInp = `flex w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${GIN}`;

  const tabs = [
    { id: 'basic' as const, label: 'Personal', icon: UserRound },
    { id: 'employment' as const, label: 'Employment', icon: BriefcaseBusiness },
    { id: 'qualifications' as const, label: 'Qualifications', icon: GraduationCap },
    { id: 'additional' as const, label: 'Additional', icon: Sparkles },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.08] pb-3 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#86BBD8]/20 text-white border border-[#86BBD8]/30'
                  : 'text-white/45 hover:bg-white/[0.07] hover:text-white/70'
              }`}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="max-h-[54vh] pr-2">
        {tab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
            {[
              { f: 'employee_id', label: 'Employee ID *', ph: 'e.g. C1165, PM365', upper: true },
              { f: 'first_name',  label: 'First Name *',  ph: 'First name' },
              { f: 'last_name',   label: 'Last Name *',   ph: 'Last name' },
              { f: 'id_number',   label: 'ID Number *',   ph: 'National ID or passport' },
              { f: 'email',       label: 'Email',         ph: 'Optional', type: 'email' },
              { f: 'phone',       label: 'Phone',         ph: 'Optional' },
            ].map(({ f, label, ph, upper, type }) => (
              <div key={f} className="space-y-1.5">
                <Label htmlFor={f} className={LBL}>{label}</Label>
                <Input id={f} type={type ?? 'text'} value={(form as unknown as Record<string, unknown>)[f] as string}
                  onChange={e => set(f as keyof EmployeeFormData, upper ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={ph} className={`${GIN} ${errors[f] ? 'border-red-500/50' : ''}`} />
                {errors[f] && <p className="text-xs text-red-400">{errors[f]}</p>}
              </div>
            ))}
            <div className="md:col-span-2 space-y-1.5">
              <Label className={LBL}>Address</Label>
              <textarea value={form.address} rows={2} placeholder="Optional"
                onChange={e => set('address', e.target.value)}
                className={`${textInp} resize-none`} />
            </div>
          </div>
        )}

        {tab === 'employment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
            <div className="space-y-1.5">
              <Label className={LBL}>Engagement Date *</Label>
              <input type="date" title="Date of engagement" value={form.date_of_engagement}
                onChange={e => set('date_of_engagement', e.target.value)}
                className={`${textInp} [color-scheme:dark] ${errors.date_of_engagement ? 'border-red-500/50' : ''}`} />
              {errors.date_of_engagement && <p className="text-xs text-red-400">{errors.date_of_engagement}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={LBL}>Designation *</Label>
              <Input value={form.designation} placeholder="Job title / position"
                onChange={e => set('designation', e.target.value)}
                className={`${GIN} ${errors.designation ? 'border-red-500/50' : ''}`} />
              {errors.designation && <p className="text-xs text-red-400">{errors.designation}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={LBL}>Employee Class</Label>
              <Select value={form.employee_class || 'none'} onValueChange={v => set('employee_class', v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 bg-white/[0.07] border-white/[0.12] text-white text-sm">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1f33] border-white/10 text-white">
                  <SelectItem value="none">None</SelectItem>
                  {CLASS_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {[
              { f: 'department',       label: 'Department' },
              { f: 'section',          label: 'Section' },
              { f: 'grade',            label: 'Grade' },
              { f: 'supervisor',       label: 'Supervisor' },
              { f: 'previous_employer',label: 'Previous Employer' },
            ].map(({ f, label }) => (
              <div key={f} className="space-y-1.5">
                <Label className={LBL}>{label}</Label>
                <Input value={(form as unknown as Record<string, unknown>)[f] as string}
                  onChange={e => set(f as keyof EmployeeFormData, e.target.value)}
                  placeholder="Optional" className={GIN} />
              </div>
            ))}
          </div>
        )}

        {tab === 'qualifications' && (
          <div className="space-y-5 pr-1">
            <div className="space-y-2">
              <Label className={LBL}>Qualifications</Label>
              <div className="flex gap-2">
                <Input value={temps.qual} placeholder="Add a qualification"
                  onChange={e => setTemps(p => ({ ...p, qual: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('qualifications', temps.qual, 'qual'))}
                  className={GIN} />
                <button type="button" onClick={() => addItem('qualifications', temps.qual, 'qual')}
                  className="px-3 py-2 rounded-lg bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 text-white border border-[#86BBD8]/30 text-sm transition-all whitespace-nowrap">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.qualifications.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#86BBD8]/15 text-[#86BBD8] text-xs border border-[#86BBD8]/25 font-medium">
                    {item}
                    <button type="button" aria-label="Remove" onClick={() => rmItem('qualifications', i)} className="hover:text-red-400 ml-0.5 transition-colors"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'additional' && (
          <div className="space-y-5 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={LBL}>Driver&apos;s License Class</Label>
                <Input value={form.drivers_license_class} placeholder="Optional"
                  onChange={e => set('drivers_license_class', e.target.value)} className={GIN} />
              </div>
              <div className="space-y-1.5">
                <Label className={LBL}>PPE Issue Date</Label>
                <input type="date" title="PPE issue date" value={form.ppe_issue_date}
                  onChange={e => set('ppe_issue_date', e.target.value)} className={`${textInp} [color-scheme:dark]`} />
              </div>
            </div>
            {([
              { f: 'other_positions'   as const, label: 'Other Positions',      k: 'pos'     as const, ph: 'Add position' },
              { f: 'awards_recognition'as const, label: 'Awards & Recognition', k: 'award'   as const, ph: 'Add award or recognition' },
              { f: 'offences'          as const, label: 'Offences',             k: 'offence' as const, ph: 'Add offence record' },
            ]).map(({ f, label, k, ph }) => (
              <div key={f} className="space-y-2">
                <Label className={LBL}>{label}</Label>
                <div className="flex gap-2">
                  <Input value={temps[k]} placeholder={ph}
                    onChange={e => setTemps(p => ({ ...p, [k]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(f, temps[k], k))}
                    className={GIN} />
                  <button type="button" onClick={() => addItem(f, temps[k], k)}
                    className="px-3 py-2 rounded-lg bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 text-white border border-[#86BBD8]/30 text-sm transition-all whitespace-nowrap">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form[f] as string[]).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] text-white/70 text-xs border border-white/12">
                      {item}
                      <button type="button" aria-label="Remove" onClick={() => rmItem(f, i)} className="hover:text-red-400 ml-0.5 transition-colors"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <DialogFooter className="gap-2 pt-4 border-t border-white/[0.08]">
        <Button type="button" onClick={onCancel}
          className="bg-white/[0.07] hover:bg-white/[0.14] text-white/70 border border-white/12">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}
          className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/35">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Save Changes' : 'Add Employee'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

interface EmployeeRowProps { employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void; }

function EmployeeRow({ employee, onEdit, onDelete }: EmployeeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const name = `${employee.first_name} ${employee.last_name}`;
  const t = tenure(employee.date_of_engagement);
  const quals = employee.qualifications?.length ?? 0;

  return (
    <div className="border-b border-white/[0.05]">
      <div className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[0.03] transition-colors group">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
          {sharedInitials(`${employee.first_name} ${employee.last_name}`)}
        </div>

        {/* Name + meta */}
        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          <div className="text-white/90 font-semibold text-sm group-hover:text-white transition-colors">
            {name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-white/40 text-xs font-mono">{employee.employee_id}</span>
            {employee.designation && <span className="text-white/40 text-xs">· {employee.designation}</span>}
            {employee.department  && <span className="text-white/30 text-xs">· {employee.department}</span>}
          </div>
        </button>

        {/* Right: pills + tenure + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full border font-medium ${classPill(employee.employee_class)}`}>
            {employee.employee_class || 'Unclassified'}
          </span>
          <span className="hidden md:flex items-center gap-1 text-[11px] text-white/35">
            <Clock className="h-3 w-3" />{t}
          </span>
          {quals > 0 && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] text-white/35">
              <GraduationCap className="h-3 w-3" />{quals}
            </span>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {employee.email && (
            <button type="button" title="Send email" onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/40 border border-white/10 transition-all">
              <Mail className="h-3.5 w-3.5" />
            </button>
          )}
          {employee.phone && (
            <button type="button" title="Call" onClick={() => window.open(`tel:${employee.phone}`, '_self')}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/40 border border-white/10 transition-all">
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" title="Edit employee" onClick={() => onEdit(employee)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#86BBD8]/[0.12] hover:bg-[#86BBD8]/25 text-[#86BBD8]/70 hover:text-[#86BBD8] border border-[#86BBD8]/20 transition-all">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete employee" onClick={() => onDelete(employee)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-red-500/15 text-white/30 hover:text-red-400 border border-white/10 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/40 border border-white/10 transition-all">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Mobile expand */}
        <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 transition-all md:hidden">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Expanded detail — maintenance style ─────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-4 pt-3 border-t border-white/[0.05] bg-white/[0.02] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Personal section */}
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <UserRound className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Personal</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoField label="ID Number" value={employee.id_number} />
                <div>
                  <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Phone</div>
                  {employee.phone
                    ? <a href={`tel:${employee.phone}`} className="text-[#86BBD8] text-sm hover:text-white hover:underline transition-all">{employee.phone}</a>
                    : <span className="text-white/80 text-sm">—</span>}
                </div>
                <div className="col-span-2">
                  <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Email</div>
                  {employee.email
                    ? <a href={`mailto:${employee.email}`} className="text-[#86BBD8] text-sm hover:text-white hover:underline transition-all">{employee.email}</a>
                    : <span className="text-white/80 text-sm">—</span>}
                </div>
                {employee.address && <div className="col-span-2"><InfoField label="Address" value={employee.address} /></div>}
              </div>
            </div>

            {/* Employment section */}
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Employment</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoField label="Engaged" value={fmtDate(employee.date_of_engagement)} />
                <InfoField label="Tenure"  value={t} />
                <InfoField label="Section" value={employee.section} />
                <InfoField label="Grade"   value={employee.grade} />
                <InfoField label="Supervisor" value={employee.supervisor} />
                <InfoField label="Prev. Employer" value={employee.previous_employer} />
              </div>
            </div>
          </div>

          {/* Qualifications */}
          {quals > 0 && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <GraduationCap className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Qualifications</span>
                <span className="text-[10px] text-white/30 ml-1">{quals} recorded</span>
              </div>
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {employee.qualifications!.map((q, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[#86BBD8]/15 border border-[#86BBD8]/25 text-[#86BBD8] font-medium">{q}</span>
                ))}
              </div>
            </div>
          )}

          {/* Awards & Other positions */}
          {((employee.awards_recognition?.length ?? 0) > 0 || (employee.other_positions?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(employee.awards_recognition?.length ?? 0) > 0 && (
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                    <Award className="h-3.5 w-3.5 text-[#86BBD8]" />
                    <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Awards</span>
                  </div>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.awards_recognition!.map((a, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {(employee.other_positions?.length ?? 0) > 0 && (
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                    <Briefcase className="h-3.5 w-3.5 text-[#86BBD8]" />
                    <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Other Positions</span>
                  </div>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.other_positions!.map((p, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => onEdit(employee)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#86BBD8]/15 hover:bg-[#86BBD8]/25 text-[#86BBD8] border border-[#86BBD8]/25 transition-all font-medium">
              <Edit className="h-3 w-3" /> Edit Employee
            </button>
            <button type="button" onClick={() => onDelete(employee)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/15 text-white/40 hover:text-red-400 border border-white/10 transition-all">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmployeeCard ─────────────────────────────────────────────────────────────

interface EmployeeCardProps { employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void; }

function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const name = `${employee.first_name} ${employee.last_name}`;
  const quals = employee.qualifications?.length ?? 0;
  const t = tenure(employee.date_of_engagement);

  return (
    <div className="oz-glass-dark rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center text-white font-bold text-base shadow-lg shrink-0">
            {sharedInitials(`${employee.first_name} ${employee.last_name}`)}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white leading-tight">{name}</p>
            <p className="text-xs text-white/50 mt-0.5">
              {employee.designation || 'No role'}{' '}·{' '}
              <span className="font-mono text-[#86BBD8]">{employee.employee_id}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${classPill(employee.employee_class)}`}>
                {employee.employee_class || 'Unclassified'}
              </span>
              {employee.department && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10 text-white/50">
                  {employee.department}
                </span>
              )}
            </div>
          </div>
        </div>
        <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(o => !o)}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-white/40 border border-white/12 transition-all shrink-0">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Stats strip */}
      <div className="px-5 pb-4 pt-0 grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-3">
        <div>
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Joined</div>
          <div className="text-white/65 text-xs">{fmtDate(employee.date_of_engagement)}</div>
        </div>
        <div>
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Tenure</div>
          <div className="text-white/65 text-xs">{t}</div>
        </div>
        <div>
          <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Quals</div>
          <div className="text-white/65 text-xs">{quals > 0 ? `${quals} recorded` : 'None'}</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-white/[0.05] space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {employee.id_number  && <InfoField label="ID Number"   value={employee.id_number} />}
            {employee.supervisor && <InfoField label="Supervisor"  value={employee.supervisor} />}
            {employee.section    && <InfoField label="Section"     value={employee.section} />}
            {employee.grade      && <InfoField label="Grade"       value={employee.grade} />}
          </div>
          {(employee.email || employee.phone) && (
            <div className="flex flex-wrap gap-3 pt-1">
              {employee.email && (
                <a href={`mailto:${employee.email}`} className="flex items-center gap-1.5 text-xs text-[#86BBD8] hover:text-white transition-all">
                  <Mail className="h-3 w-3" />{employee.email}
                </a>
              )}
              {employee.phone && (
                <a href={`tel:${employee.phone}`} className="flex items-center gap-1.5 text-xs text-[#86BBD8] hover:text-white transition-all">
                  <Phone className="h-3 w-3" />{employee.phone}
                </a>
              )}
            </div>
          )}
          {quals > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {employee.qualifications!.map((q, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#86BBD8]/15 border border-[#86BBD8]/25 text-[#86BBD8] font-medium">{q}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="px-5 py-2.5 border-t border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
        <button type="button" onClick={() => onEdit(employee)}
          className="flex items-center gap-1.5 text-[11px] text-white/45 hover:text-[#86BBD8] transition-all font-medium">
          <Edit className="h-3 w-3" /> Edit
        </button>
        <div className="h-3 w-px bg-white/[0.10]" />
        {employee.email && (
          <a href={`mailto:${employee.email}`}
            className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-[#86BBD8] transition-all">
            <Mail className="h-3 w-3" /> Email
          </a>
        )}
        <div className="flex-1" />
        <button type="button" onClick={() => onDelete(employee)}
          className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-red-400 transition-all">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortField>('first_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);

  const sections = usePageCollapse({ hero: false, filters: false, records: false });

  const PER_PAGE = 25;

  const reload = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setEmployees(await loadEmployees()); }
    catch (e) { const m = e instanceof Error ? e.message : 'Failed to load'; setError(m); toast.error(m); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const uniqueDepts = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean) as string[])].sort(), [employees]);
  const uniqueRoles = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean) as string[])].sort(), [employees]);

  const filtered = useMemo(() => {
    let list = [...employees];
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(t) ||
        e.employee_id?.toLowerCase().includes(t) ||
        (e.designation?.toLowerCase() ?? '').includes(t) ||
        (e.id_number?.toLowerCase() ?? '').includes(t)
      );
    }
    if (classFilter !== 'all') list = list.filter(e => (e.employee_class || 'Unclassified') === classFilter);
    if (deptFilter  !== 'all') list = list.filter(e => e.department === deptFilter);
    if (roleFilter  !== 'all') list = list.filter(e => e.designation === roleFilter);
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sortBy === 'first_name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
      else { av = a[sortBy] || ''; bv = b[sortBy] || ''; }
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    return list;
  }, [employees, search, classFilter, deptFilter, roleFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => setPage(1), [search, classFilter, deptFilter, roleFilter, sortBy, sortDir]);

  const activeFilterCount = [search, classFilter !== 'all', deptFilter !== 'all', roleFilter !== 'all'].filter(Boolean).length;

  const stats = useMemo(() => ({
    total:     employees.length,
    roles:     new Set(employees.map(e => e.designation).filter(Boolean)).size,
    quals:     employees.reduce((s, e) => s + (e.qualifications?.length || 0), 0),
    permanent: employees.filter(e => e.employee_class === 'Permanent').length,
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
  const clearFilters = () => { setSearch(''); setClassFilter('all'); setDeptFilter('all'); setRoleFilter('all'); };

  const [showDlMenu, setShowDlMenu] = useState(false);

  const downloadEmployeesExcel = async () => {
    setShowDlMenu(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('Personnel Registry');
      ws.columns = [
        { header: 'Employee ID',       key: 'id',      width: 14 },
        { header: 'First Name',        key: 'fname',   width: 18 },
        { header: 'Last Name',         key: 'lname',   width: 18 },
        { header: 'Designation',       key: 'role',    width: 24 },
        { header: 'Department',        key: 'dept',    width: 20 },
        { header: 'Section',           key: 'section', width: 18 },
        { header: 'Grade',             key: 'grade',   width: 10 },
        { header: 'Employee Class',    key: 'class',   width: 16 },
        { header: 'Email',             key: 'email',   width: 28 },
        { header: 'Phone',             key: 'phone',   width: 16 },
        { header: 'Date of Engagement',key: 'doe',     width: 18 },
        { header: 'Supervisor',        key: 'super',   width: 20 },
        { header: 'ID Number',         key: 'idnum',   width: 16 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      employees.forEach((e, i) => {
        const row = ws.addRow({
          id: e.employee_id, fname: e.first_name, lname: e.last_name,
          role: e.designation || '', dept: e.department || '', section: e.section || '',
          grade: e.grade || '', class: e.employee_class || '',
          email: e.email || '', phone: e.phone || '',
          doe: e.date_of_engagement ? new Date(e.date_of_engagement).toLocaleDateString('en-GB') : '',
          super: e.supervisor || '', idnum: e.id_number || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
      });
      ws.autoFilter = { from: 'A1', to: 'M1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Personnel_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${employees.length} employees`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const downloadEmployeesPDF = async () => {
    setShowDlMenu(false);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14); doc.setTextColor(42, 77, 105);
      doc.text('Personnel Registry', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${employees.length} employees`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['ID', 'Name', 'Designation', 'Department', 'Section', 'Grade', 'Class', 'Email', 'Phone', 'Engaged']],
        body: employees.map(e => [
          e.employee_id,
          `${e.first_name} ${e.last_name}`,
          e.designation || '',
          e.department  || '',
          e.section     || '',
          e.grade       || '',
          e.employee_class || '',
          e.email || '',
          e.phone || '',
          e.date_of_engagement ? new Date(e.date_of_engagement).toLocaleDateString('en-GB') : '',
        ]),
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        styles: { cellPadding: 1.5 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Personnel_Registry_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${employees.length} employees`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* ── PANEL 1: Hero ────────────────────────────────────────── */}
        <HeroPanel
          icon={Users}
          breadcrumb="Personnel"
          title="Personnel Registry"
          onRefresh={reload}
          loading={isLoading}
          onNew={openAdd}
          newLabel="Add Employee"
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <div className="relative">
                <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={employees.length === 0}
                  className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white/80 hover:text-white transition-all hover:-translate-y-0.5 bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.15] disabled:opacity-40 disabled:translate-y-0">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                {showDlMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden w-48"
                      style={{ background: 'rgba(4,12,24,0.97)', border: '1px solid rgba(255,255,255,0.14)' }}>
                      <button type="button" onClick={downloadEmployeesExcel}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all border-b border-white/[0.07]">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                      </button>
                      <button type="button" onClick={downloadEmployeesPDF}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all">
                        <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
          stats={[
            { label: 'Total Employees', value: stats.total,     textClass: 'text-[#86BBD8]', onClick: () => setClassFilter('all') },
            { label: 'Unique Roles',    value: stats.roles,     textClass: 'text-violet-400' },
            { label: 'Qualifications',  value: stats.quals,     textClass: 'text-emerald-400' },
            { label: 'Permanent Staff', value: stats.permanent, textClass: 'text-amber-400', onClick: () => setClassFilter('Permanent') },
          ] satisfies StatItem[]}
          {...sections.panel('hero')}
        />

        {/* ── Error banner ─────────────────────────────────────────── */}
        {error && (
          <div className="oz-glass-dark rounded-xl p-3.5 flex items-start gap-3 border border-red-500/25">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)} className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── PANEL 2: Filters ─────────────────────────────────────── */}
        <GlassPanel
          icon={Filter}
          title="Filters"
          {...sections.panel('filters')}
          badge={activeFilterCount > 0 ? (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#86BBD8]/20 text-[#86BBD8] border border-[#86BBD8]/30">
              {activeFilterCount} active
            </span>
          ) : undefined}
          actions={activeFilterCount > 0 ? (
            <button onClick={clearFilters}
              className="h-6 px-2 flex items-center gap-1 rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 text-[11px] border border-white/12 transition-all">
              <X className="h-2.5 w-2.5" /> Clear
            </button>
          ) : undefined}
          contentClassName="px-5 pb-4 pt-3 space-y-3"
        >
          <FilterChips
            label="Employee Class"
            options={[
              { value: 'all', label: 'All Staff' },
              ...CLASS_OPTIONS.map(c => ({ value: c, label: c })),
            ]}
            value={classFilter}
            onChange={setClassFilter}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input type="text" placeholder="Search name, ID, role..."
                value={search} onChange={e => setSearch(e.target.value)}
                aria-label="Search employees"
                className="pl-8 pr-3 py-2 w-full text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all" />
            </div>
            <select aria-label="Filter by department" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white/70 focus:outline-none focus:border-white/30 transition-all">
              <option value="all">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white/70 focus:outline-none focus:border-white/30 transition-all">
              <option value="all">All Roles</option>
              {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </GlassPanel>

        {/* ── PANEL 3: Records ─────────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <RecordsPanelHeader
            icon={FileText}
            title="Records"
            count={filtered.length}
            total={employees.length !== filtered.length ? employees.length : undefined}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search name, ID, role…"
            sortValue={sortBy}
            sortOptions={[
              { value: 'first_name', label: 'Name A–Z' },
              { value: 'employee_id', label: 'ID' },
              { value: 'designation', label: 'Role' },
              { value: 'department', label: 'Department' },
            ]}
            onSort={v => setSortBy(v as SortField)}
            viewMode={viewMode === 'list' ? 'table' : 'grid'}
            onViewMode={v => setViewMode(v === 'table' ? 'list' : 'grid')}
            show={sections.expanded.records}
            onToggle={() => sections.toggle('records')}
            actions={
              <button type="button" aria-label="Toggle sort direction"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-white/50 border border-white/12 transition-all">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            }
          />

          {sections.expanded.records && (
            <div className="p-4">
              {isLoading ? (
                <LoadingPane />
              ) : paged.length === 0 ? (
                employees.length === 0 ? (
                  <EmptyState icon={Users} title="No employees yet"
                    message="Add your first employee to get started."
                    action={{ label: 'Add Employee', onClick: openAdd }} />
                ) : (
                  <EmptyState icon={FilterX} title="No results match your filters"
                    message="Try adjusting your search or filters."
                    action={{ label: 'Clear Filters', onClick: clearFilters }} />
                )
              ) : viewMode === 'list' ? (
                <div className="rounded-xl overflow-hidden border border-white/[0.07]">
                  {paged.map(e => <EmployeeRow key={e.id} employee={e} onEdit={openEdit} onDelete={onDelete} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paged.map(e => <EmployeeCard key={e.id} employee={e} onEdit={openEdit} onDelete={onDelete} />)}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/12 text-xs text-white/60 hover:text-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <span className="text-xs text-white/35 px-2">Page {page} of {totalPages}</span>
                  <button type="button" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/12 text-xs text-white/60 hover:text-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* ── Dark glass Add / Edit dialog ──────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-bold">
              <div className="bg-[#86BBD8]/20 p-2 rounded-lg border border-[#86BBD8]/25">
                <Users className="h-4 w-4 text-[#86BBD8]" />
              </div>
              {selectedEmployee
                ? `Edit — ${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs mt-1">
              {selectedEmployee
                ? `ID: ${selectedEmployee.employee_id} · All fields are editable`
                : 'Fields marked with * are required'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <EmployeeForm
              initialData={selectedEmployee}
              onSubmit={onSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
