// app/employees/page.tsx
'use client';

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
// All icons + components come from the shared design-system barrel (icons are
// Phosphor-backed and respond to the global solid/outline toggle).
import {
  Users, RefreshCw, UserCheck, ArrowUpDown, Hash,
  FilterX, ChevronsDownUp, ChevronsUpDown, ChevronDown, ChevronUp,
  Clock, AlertCircle, Trash2, X, Pencil, Mail, Briefcase,
  GraduationCap, Sparkles, UserRound, BriefcaseBusiness,
  List, LayoutGrid, MapPin, Filter, Award, Plus, Phone,
  FileSpreadsheet, FileText,
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ACCENT_HEX, SelectField, TYPE_SCALE, TYPE_WEIGHT, RADIUS,
  GroupSection, RecordCard, staggerContainer, fadeUp,
  Subsection, InfoRow, SummaryItem, LoadingState, AutofillInput, useConfirm, accentText,
} from '@/components/shared/theme';
import { formatDate } from '@/lib/format';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename, EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB, styleExcelHeaderRow } from '@/lib/exportUtils';
import type { Employee, EmployeeFormData, SectionGroup, SortDir, SortField } from './types';
import { removeEmployee, saveEmployee, useEmployeesData } from './useEmployeesData';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS = ['Permanent', 'Contract', 'Internship', 'Part-Time'] as const;

const CLASS_COLORS: Record<string, string> = {
  Permanent: '#34d399', Contract: '#f59e0b', Internship: ACCENT_HEX.blue, 'Part-Time': '#a78bfa',
};
const ETYPE_COLORS: Record<string, string> = { NEC: ACCENT_HEX.indigo, SALARIED: ACCENT_HEX.cyan };
const SECTION_COLORS: Record<string, string> = {
  Mechanical: ACCENT_HEX.blue, Electrical: ACCENT_HEX.amber, Civil: ACCENT_HEX.emerald, Instrumentation: ACCENT_HEX.violet,
};

// Stable display order for the section groups (the record accordions).
const SECTION_ORDER = ['Mechanical', 'Electrical', 'Civil', 'Instrumentation'];

// Case/whitespace-insensitive canonicalization — source data has inconsistent
// casing ("Electrical" vs "electrical " etc.); without this, each variant was
// treated as a distinct section, splitting one real group into several and
// giving each a different (hashed) color — the "color chaos" bug. Every
// display label AND every color lookup for a section must go through this
// so the same real-world section always reads as one group, one color.
function normalizeSection(section?: string): string {
  const s = (section || '').trim();
  if (!s) return 'Unassigned';
  const canonical = SECTION_ORDER.find(c => c.toLowerCase() === s.toLowerCase());
  return canonical ?? s;
}

// Palette for sections that aren't one of the predefined four — drawn from the shared
// ACCENT_HEX brand palette (not arbitrary hexes) so every group colour stays in harmony
// with the rest of the app; hashed so each distinct section name is stable.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
function sectionColor(section?: string) {
  const s = normalizeSection(section);
  if (s === 'Unassigned') return '#94a3b8';
  if (SECTION_COLORS[s]) return SECTION_COLORS[s];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

/** Section → profession/designation grouping — the same categorisation the on-page
 *  accordion uses (normalizeSection, SECTION_ORDER, then alphabetical designation
 *  subgroups so e.g. "Boilermaker" and "Boilermaker Assistant" naturally sit next to
 *  each other). Extracted as a pure function so the Excel/PDF export can produce
 *  exactly what's shown on screen instead of a second, divergent grouping. */
function groupBySectionAndProfession(list: Employee[]): SectionGroup[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) {
    const key = normalizeSection(e.section);
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
    .map(section => {
      const employeesInSection = map.get(section)!;
      const subMap = new Map<string, Employee[]>();
      for (const e of employeesInSection) {
        const subKey = (e.designation || '').trim() || 'Other';
        if (!subMap.has(subKey)) subMap.set(subKey, []);
        subMap.get(subKey)!.push(e);
      }
      const subgroups = [...subMap.keys()]
        .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
        .map(designation => ({ designation, employees: subMap.get(designation)! }));
      const hasMeaningfulSubgroups = subgroups.length > 1 && subgroups.some(sg => sg.employees.length > 1);
      return { section, color: sectionColor(section === 'Unassigned' ? undefined : section), employees: employeesInSection, subgroups, hasMeaningfulSubgroups };
    });
}

/** Profession/designation only, ignoring section — for a flat "just professions"
 *  breakdown (e.g. every Rigger together regardless of which section they're in). */
function groupByProfession(list: Employee[]): { designation: string; employees: Employee[] }[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) {
    const key = (e.designation || '').trim() || 'Unclassified';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.keys()]
    .sort((a, b) => (a === 'Unclassified' ? 1 : b === 'Unclassified' ? -1 : a.localeCompare(b)))
    .map(designation => ({ designation, employees: map.get(designation)! }));
}

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

// fmtDate was identical to the shared formatDate — alias it to the single source.
const fmtDate = formatDate;


// ─── Small themed building blocks ────────────────────────────────────────────
// InfoRow/SummaryItem now come from the shared design system (promoted from
// this page's own local versions — see the design-system migration).

function FilterChips({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <div>
      <p className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-8 px-2.5 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} transition-colors ${
              value === o.value ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textPrimary} ${t.hoverText} ${t.hoverBg}`
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Roster Export Dialog ──────────────────────────────────────────────────────
// Organizes the full roster for export — by section, by profession/designation,
// or section-then-profession together (sections as worksheets, professions as
// labelled sub-groups within each — the same "Boilermaker" / "Boilermaker
// Assistant" clustering the on-page accordion shows, since alphabetical sort
// naturally puts a trade next to its assistants).

const BRAND = EXPORT_BRAND_RGB; // matches the registry Excel export's header fill

type ExportGroupBy = 'section' | 'profession' | 'section_profession';

const EXPORT_GROUP_OPTIONS: { value: ExportGroupBy; label: string; hint: string }[] = [
  { value: 'section_profession', label: 'Section + Profession', hint: 'Sections as sheets, professions labelled within each' },
  { value: 'section', label: 'Section only', hint: 'One sheet per section' },
  { value: 'profession', label: 'Profession only', hint: 'One sheet per role, regardless of section' },
];

const EXPORT_COLUMNS = [
  { header: 'Employee ID', key: 'employee_id', width: 14 },
  { header: 'First Name', key: 'first_name', width: 18 },
  { header: 'Last Name', key: 'last_name', width: 18 },
  { header: 'Designation', key: 'designation', width: 24 },
  { header: 'Department', key: 'department', width: 20 },
  { header: 'Section', key: 'section', width: 18 },
  { header: 'Employment Type', key: 'employment_type', width: 16 },
];
const EXPORT_PDF_HEAD = ['Employee ID', 'First Name', 'Last Name', 'Designation', 'Department', 'Section', 'Employment Type'];
const exportPdfRow = (e: Employee) => [e.employee_id, e.first_name, e.last_name, e.designation || '', e.department || '', e.section || '', e.employment_type || ''];

function RosterExportDialog({ employees, onClose }: { employees: Employee[]; onClose: () => void }) {
  const t = useTheme();
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [groupBy, setGroupBy] = useState<ExportGroupBy>('section_profession');
  const [generating, setGenerating] = useState(false);

  const flatGroups = useMemo(() => {
    if (groupBy === 'section') return groupBySectionAndProfession(employees).map(g => ({ label: g.section, rows: g.employees }));
    if (groupBy === 'profession') return groupByProfession(employees).map(g => ({ label: g.designation, rows: g.employees }));
    return [];
  }, [employees, groupBy]);
  const sectionGroups = useMemo(() => groupBy === 'section_profession' ? groupBySectionAndProfession(employees) : [], [employees, groupBy]);

  const previewCards = groupBy === 'section_profession'
    ? sectionGroups.map(g => ({ label: g.section, count: g.employees.length }))
    : flatGroups.map(g => ({ label: g.label, count: g.rows.length }));

  const fileStub = `Personnel_By_${groupBy === 'section_profession' ? 'Section_and_Profession' : groupBy[0].toUpperCase() + groupBy.slice(1)}`;

  const generateExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const wb = new ExcelJS.Workbook();

    if (groupBy === 'section_profession') {
      for (const g of sectionGroups) {
        const ws = wb.addWorksheet(g.section.slice(0, 31)); // Excel sheet-name limit
        ws.columns = EXPORT_COLUMNS;
        styleExcelHeaderRow(ws.getRow(1));
        for (const sub of g.subgroups) {
          // A bold, merged label row names the profession before its people — the
          // "Boilermaker" / "Boilermaker Assistant" clustering, spelled out.
          const labelRow = ws.addRow([`${sub.designation} (${sub.employees.length})`]);
          ws.mergeCells(labelRow.number, 1, labelRow.number, EXPORT_COLUMNS.length);
          labelRow.getCell(1).font = { bold: true, italic: true, size: 10, color: { argb: EXPORT_BRAND_ARGB } };
          labelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF3' } };
          sub.employees.forEach(e => ws.addRow(e as any));
        }
      }
    } else {
      for (const g of flatGroups) {
        const ws = wb.addWorksheet(g.label.slice(0, 31));
        ws.columns = EXPORT_COLUMNS;
        styleExcelHeaderRow(ws.getRow(1));
        g.rows.forEach(e => ws.addRow(e as any));
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${fileStub}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const generatePDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let first = true;

    const pageHeader = (title: string) => {
      doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 16, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(12);
      doc.text(title, 10, 10);
    };

    if (groupBy === 'section_profession') {
      for (const g of sectionGroups) {
        if (!first) doc.addPage();
        first = false;
        pageHeader(`${g.section} — ${g.employees.length} employee${g.employees.length === 1 ? '' : 's'}`);
        let y = 20;
        for (const sub of g.subgroups) {
          doc.setTextColor(...BRAND); doc.setFontSize(10);
          doc.text(`${sub.designation} (${sub.employees.length})`, 10, y);
          autoTable(doc, {
            startY: y + 2,
            head: [EXPORT_PDF_HEAD],
            body: sub.employees.map(exportPdfRow),
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }
    } else {
      for (const g of flatGroups) {
        if (!first) doc.addPage();
        first = false;
        pageHeader(`${g.label} — ${g.rows.length} employee${g.rows.length === 1 ? '' : 's'}`);
        autoTable(doc, {
          startY: 20,
          head: [EXPORT_PDF_HEAD],
          body: g.rows.map(exportPdfRow),
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
      }
    }
    doc.save(`${fileStub}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (format === 'excel') await generateExcel(); else await generatePDF();
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} exported — ${employees.length} employees`);
      onClose();
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
    finally { setGenerating(false); }
  };

  return (
    <CenterModal open onClose={onClose} title="Download Organized Roster" subtitle="Choose how to group the export" accent="violet" width="max-w-lg">
      <form onSubmit={e => { e.preventDefault(); handleGenerate(); }}>
        <div className="p-5 space-y-4">
          <FormField label="Group by">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXPORT_GROUP_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setGroupBy(o.value)}
                  className={`text-left px-3 py-2 rounded-lg transition-colors ${groupBy === o.value ? 'bg-brand-500/15 ring-1 ring-brand-500/40' : `${t.chipBg} ${t.hoverBg}`}`}>
                  <div className={`text-[12.5px] ${TYPE_WEIGHT.semibold} ${groupBy === o.value ? 'text-brand-400' : t.textPrimary}`}>{o.label}</div>
                  <div className={`text-[10.5px] ${t.textFaint}`}>{o.hint}</div>
                </button>
              ))}
            </div>
          </FormField>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {previewCards.map(g => (
              <div key={g.label} className={`${t.chipBg} rounded-xl px-3 py-2 text-center min-w-[72px]`}>
                <div className={`text-base ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{g.count}</div>
                <div className={`text-[10.5px] ${t.textFaint} truncate max-w-[100px]`}>{g.label}</div>
              </div>
            ))}
          </div>

          <FormField label="Format">
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormat('excel')}
                className={`flex-1 h-10 rounded-lg text-xs ${TYPE_WEIGHT.semibold} flex items-center justify-center gap-1.5 transition-all ${format === 'excel' ? `bg-emerald-500/20 ${accentText('emerald', t.light)}` : `${t.hoverBg} ${t.textFaint}`}`}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button type="button" onClick={() => setFormat('pdf')}
                className={`flex-1 h-10 rounded-lg text-xs ${TYPE_WEIGHT.semibold} flex items-center justify-center gap-1.5 transition-all ${format === 'pdf' ? `bg-rose-500/20 ${accentText('rose', t.light)}` : `${t.hoverBg} ${t.textFaint}`}`}>
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitting={generating} submitLabel="Download" />
      </form>
    </CenterModal>
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

  const inputCls = `w-full h-9 px-3 ${RADIUS.tile} ${TYPE_SCALE.input} ${t.inputBg} focus:outline-none`;

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
          aria-label={ph}
          onChange={e => setTemps(p => ({ ...p, [k]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(f, temps[k], k))}
          className={inputCls}
        />
        <button type="button" onClick={() => addItem(f, temps[k], k)}
          className={`px-3 h-9 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 text-sm ${TYPE_WEIGHT.medium} transition-all whitespace-nowrap`}>
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(form[f] as string[]).map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${TYPE_WEIGHT.medium}`} style={{ color: tint, background: `${tint}18`, border: `1px solid ${tint}30` }}>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${
                tab === tb.id ? 'bg-brand-500/15 text-brand-400' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`
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
                  aria-label={label}
                  className={`${inputCls} ${errors[f] ? 'ring-1 ring-rose-500/50' : ''}`}
                />
                {errors[f] && <p className="text-xs text-rose-500 mt-1">{errors[f]}</p>}
              </FormField>
            ))}
            <div className="md:col-span-2">
              <FormField label="Address">
                <textarea value={form.address} rows={2} placeholder="Optional" aria-label="Address"
                  onChange={e => set('address', e.target.value)}
                  className={`${inputCls} h-auto py-2 resize-none`} />
              </FormField>
            </div>
          </div>
        )}

        {tab === 'employment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Engagement Date" required>
              <input type="date" title="Date of engagement" aria-label="Date of engagement" value={form.date_of_engagement}
                onChange={e => set('date_of_engagement', e.target.value)}
                className={`${inputCls} ${errors.date_of_engagement ? 'ring-1 ring-rose-500/50' : ''}`} />
              {errors.date_of_engagement && <p className="text-xs text-rose-500 mt-1">{errors.date_of_engagement}</p>}
            </FormField>
            <FormField label="Designation" required>
              <AutofillInput field="designation" value={form.designation} placeholder="Job title / position"
                onChange={v => set('designation', v)}
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
                    className={`flex-1 h-9 rounded-lg text-xs ${TYPE_WEIGHT.semibold} transition-all ${
                      form.employment_type === et
                        ? et === 'NEC' ? `bg-indigo-500/20 ${accentText('indigo', t.light)}` : et === 'SALARIED' ? 'bg-teal-500/20 text-teal-400' : `${t.chipBg} ${t.textMuted}`
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
                <AutofillInput field={f} value={form[f]} onChange={v => set(f, v)} placeholder="Optional" className={inputCls} />
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
              <input value={form.drivers_license_class} placeholder="Optional" aria-label="Driver's License Class"
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

interface EmployeeRowProps {
  employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void;
}

function EmployeeRow({ employee, onEdit, onDelete }: EmployeeRowProps) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const name = `${employee.first_name} ${employee.last_name}`;
  const ten = tenure(employee.date_of_engagement);
  const quals = employee.qualifications?.length ?? 0;
  const secColor = sectionColor(employee.section);

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-3.5 px-4 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="shrink-0">
          <UserRound className="h-5 w-5" style={{ color: secColor }} />
        </div>

        <button type="button" onClick={() => setExpanded(o => !o)} className="flex-1 min-w-0 text-left">
          {/* text-[14px] + tracking-tight, not text-sm — matches RecordCard's grid-view
              title exactly (components.tsx:526), so a name reads identically whether the
              page is in list or grid view. */}
          <div className={`${TYPE_WEIGHT.semibold} text-[14px] tracking-tight ${t.textPrimary}`}>{name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-mono ${t.textFaint}`}>{employee.employee_id}</span>
            {employee.designation && <span className={`text-xs ${t.textFaint}`}>· {employee.designation}</span>}
            {employee.section && <StatusBadge color={secColor} label={normalizeSection(employee.section)} />}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {employee.employment_type && (
            <span className="hidden sm:block"><StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? '#94a3b8'} label={employee.employment_type} /></span>
          )}
          <span className="hidden sm:block"><StatusBadge color={CLASS_COLORS[employee.employee_class || ''] ?? '#94a3b8'} label={employee.employee_class || 'Unclassified'} /></span>
          <span className={`hidden md:flex items-center gap-1 text-[11px] ${t.textFaint}`}><Clock className="h-3 w-3" style={{ color: secColor }} />{ten}</span>
          {quals > 0 && <span className={`hidden lg:flex items-center gap-1 text-[11px] ${t.textFaint}`}><GraduationCap className="h-3 w-3" style={{ color: secColor }} />{quals}</span>}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {employee.email && (
            <button type="button" title="Send email" onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-all">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          )}
          {employee.phone && (
            <button type="button" title="Call" onClick={() => window.open(`tel:${employee.phone}`, '_self')}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all">
              <Phone className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" title="Edit employee" onClick={() => onEdit(employee)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-all">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete employee" onClick={() => onDelete(employee)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all">
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
                <UserRound className="h-3.5 w-3.5 text-brand-400" />
                <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>Personal</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="ID Number" value={employee.id_number} />
                <InfoRow label="Phone" value={employee.phone ? <a href={`tel:${employee.phone}`} className="text-brand-400 hover:underline">{employee.phone}</a> : undefined} />
                <div className="col-span-2"><InfoRow label="Email" value={employee.email ? <a href={`mailto:${employee.email}`} className="text-brand-400 hover:underline">{employee.email}</a> : undefined} /></div>
                {employee.address && <div className="col-span-2"><InfoRow label="Address" value={employee.address} /></div>}
              </div>
            </div>

            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                <BriefcaseBusiness className="h-3.5 w-3.5 text-brand-400" />
                <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>Employment</span>
              </div>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="Engaged" value={fmtDate(employee.date_of_engagement)} />
                <InfoRow label="Tenure" value={ten} />
                <InfoRow label="Section" value={employee.section ? normalizeSection(employee.section) : undefined} />
                <InfoRow label="Grade" value={employee.grade} />
                <InfoRow label="Supervisor" value={employee.supervisor} />
                <InfoRow label="Prev. Employer" value={employee.previous_employer} />
              </div>
            </div>
          </div>

          {quals > 0 && (
            <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                <GraduationCap className="h-3.5 w-3.5 text-brand-400" />
                <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>Qualifications</span>
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
                    <Award className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} />
                    <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>Awards</span>
                  </div>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.awards_recognition!.map((a, i) => <StatusBadge key={i} color="#f59e0b" label={a} />)}
                  </div>
                </div>
              )}
              {(employee.other_positions?.length ?? 0) > 0 && (
                <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
                  <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
                    <Briefcase className={`h-3.5 w-3.5 ${accentText('violet', t.light)}`} />
                    <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>Other Positions</span>
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
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 transition-all ${TYPE_WEIGHT.medium}`}>
              <Pencil className="h-3 w-3" /> Edit Employee
            </button>
            <button type="button" onClick={() => onDelete(employee)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all ${TYPE_WEIGHT.medium}`}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmployeeCard — built on the shared RecordCard, so it inherits the exact homepage
// module-card treatment (bare accent icon + pop, Montserrat title, GlowCard lift/glow).
// Key summary always visible; the rest expands in place. ──

function EmployeeCard({ employee, onEdit, onDelete }: {
  employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void;
}) {
  const t = useTheme();
  const secColor = sectionColor(employee.section);
  const ten = tenure(employee.date_of_engagement);
  const quals = employee.qualifications ?? [];

  return (
    <RecordCard
      icon={UserRound}
      accentHex={secColor}
      title={`${employee.first_name} ${employee.last_name}`}
      subtitle={employee.designation || 'No role'}
      badges={<>
        {employee.section && <StatusBadge color={secColor} label={employee.section} />}
        {employee.employment_type && <StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? '#94a3b8'} label={employee.employment_type} />}
        {employee.employee_class && <StatusBadge color={CLASS_COLORS[employee.employee_class] ?? '#94a3b8'} label={employee.employee_class} />}
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={Hash} label="Mine No." value={employee.employee_id} color={secColor} />
          <SummaryItem icon={Phone} label="Phone" value={employee.phone} color={secColor} />
          {employee.address && <div className="col-span-2"><SummaryItem icon={MapPin} label="Address" value={employee.address} color={secColor} /></div>}
        </div>
      }
      actions={<>
        <button onClick={() => onEdit(employee)} type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[12px] ${TYPE_WEIGHT.semibold} hover:brightness-110 transition-all`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={() => onDelete(employee)} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] ${TYPE_WEIGHT.semibold} transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InfoRow label="ID Number" value={employee.id_number} />
        <InfoRow label="Department" value={employee.department} />
        <InfoRow label="Tenure" value={ten} />
        <InfoRow label="Joined" value={fmtDate(employee.date_of_engagement)} />
        <InfoRow label="Grade" value={employee.grade} />
        <InfoRow label="Supervisor" value={employee.supervisor} />
      </div>
      {employee.email && (
        <a href={`mailto:${employee.email}`} className="flex items-center gap-1.5 text-xs text-brand-400 hover:underline w-fit">
          <Mail className="h-3 w-3" strokeWidth={1.75} />{employee.email}
        </a>
      )}
      {quals.length > 0 && (
        <div>
          <p className={`text-[10px] ${TYPE_WEIGHT.semibold} ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Qualifications</p>
          <div className="flex flex-wrap gap-1.5">
            {quals.map((q, i) => <span key={i} className={`text-[10.5px] ${TYPE_WEIGHT.medium} ${t.textMuted} ${t.chipBg} rounded-full px-2 py-0.5`}>{q}</span>)}
          </div>
        </div>
      )}
    </RecordCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function EmployeesPageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const { employees, isLoading, error, setError, reload } = useEmployeesData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRosterExport, setShowRosterExport] = useState(false);

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
  // Within a section, records are further grouped into subsections by trade/
  // designation (e.g. Mechanical → Fitters/Riggers/Boilermakers); tracked by
  // "section::designation" key, default all open.
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  const sections = useCollapseSection({ hero: true });

  const uniqueDepts    = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean) as string[])].sort(), [employees]);
  const uniqueRoles    = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean) as string[])].sort(), [employees]);
  // Normalized (see normalizeSection) so "Electrical" / "electrical " collapse to one
  // filter option instead of listing every raw-casing variant separately.
  const uniqueSections = useMemo(() => {
    const set = new Set(employees.map(e => normalizeSection(e.section)));
    set.delete('Unassigned');
    const known = SECTION_ORDER.filter(s => set.has(s));
    const other = [...set].filter(s => !SECTION_ORDER.includes(s)).sort();
    return [...known, ...other];
  }, [employees]);

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
    if (sectionFilter !== 'all') list = list.filter(e => normalizeSection(e.section) === sectionFilter);
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
  // order), any other sections alphabetically, "Unassigned" last — then by profession/
  // designation within each section. Shared with the export dialog (groupBySectionAndProfession).
  const grouped = useMemo(() => groupBySectionAndProfession(filtered), [filtered]);

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

  // Subsections (designation/trade groups within a section) default open too,
  // and a search likewise force-opens them so matches stay visible.
  const isSubOpen = (section: string, designation: string) => !!search || !collapsedSubgroups.has(`${section}::${designation}`);
  const toggleSub = (section: string, designation: string) => setCollapsedSubgroups(prev => {
    const key = `${section}::${designation}`;
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

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
    if (!await confirm({ title: `Delete ${e.first_name} ${e.last_name}?`, message: 'This cannot be undone.', destructive: true })) return;
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

  const registryExportColumns: DLColumn[] = [
    { key: 'employee_id', label: 'Employee ID', width: 14 },
    { key: 'first_name', label: 'First Name', width: 18 },
    { key: 'last_name', label: 'Last Name', width: 18 },
    { key: 'employment_type', label: 'Type', width: 10 },
    { key: 'designation', label: 'Designation', width: 24 },
    { key: 'department', label: 'Department', width: 20 },
    { key: 'section', label: 'Section', width: 18 },
    { key: 'grade', label: 'Grade', width: 10 },
    { key: 'employee_class', label: 'Class', width: 14 },
    { key: 'email', label: 'Email', width: 28 },
    { key: 'phone', label: 'Phone', width: 16 },
    { key: 'date_of_engagement', label: 'Date of Engagement', width: 18, format: v => fmtDate(v as string) },
    { key: 'supervisor', label: 'Supervisor', width: 20 },
    { key: 'id_number', label: 'ID Number', width: 16 },
  ];

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
            {employees.length > 0 && (
              <DownloadButton
                data={employees as unknown as Record<string, unknown>[]}
                columns={registryExportColumns}
                filename={exportFilename('Personnel_Registry')}
                title="Personnel Registry"
                formats={['excel']}
              />
            )}
            <button type="button" onClick={() => setShowRosterExport(true)} disabled={employees.length === 0} title="Download organized by section or profession"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors disabled:opacity-40`}>
              <Award className="h-4 w-4" />
            </button>
            <button type="button" onClick={openAdd} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 transition-all hover:brightness-110`}>
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
          <AlertCircle className={`h-5 w-5 ${accentText('rose', t.light)} shrink-0`} />
          <p className={`text-sm ${accentText('rose', t.light)} flex-1`}>{error}</p>
          <button type="button" onClick={() => setError(null)} className={`${t.textFaint} ${t.hoverText}`}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className={`${t.glass} ${RADIUS.card} ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID, role…" className="flex-1" />
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} transition-colors ${showFilters ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`}`}>
              <Filter className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && <span className={`ml-1 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Section</p>
                <SelectField size="filter" title="Filter by section" value={sectionFilter} onChange={setSectionFilter}
                  options={[{ value: 'all', label: 'All Sections' }, ...uniqueSections.map(s => ({ value: s, label: s })), { value: 'Unassigned', label: 'Unassigned' }]} />
              </div>
              <div>
                <p className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Department</p>
                <SelectField size="filter" title="Filter by department" value={deptFilter} onChange={setDeptFilter}
                  options={[{ value: 'all', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))]} />
              </div>
              <div>
                <p className={`${TYPE_SCALE.label} ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Role / Profession</p>
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
          <p className={`${TYPE_SCALE.body} ${t.textFaint}`}>
            Showing <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{filtered.length}</span> of {employees.length} employees
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
                className={`flex items-center gap-1.5 text-[12px] ${TYPE_WEIGHT.medium} ${t.textMuted} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 transition-colors`}>
                {allGroupsOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                {allGroupsOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={`${t.glass} ${RADIUS.card} p-16 text-center`}>
            <LoadingState />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${t.glass} ${RADIUS.card} p-12 text-center`}>
            {employees.length === 0 ? (
              <>
                <Users className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
                <h3 className={`text-lg ${TYPE_WEIGHT.semibold} ${t.textPrimary} mb-2`}>No employees yet</h3>
                <p className={`${TYPE_SCALE.body} mb-4 ${t.textFaint}`}>Add your first employee to get started.</p>
                <button type="button" onClick={openAdd} className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </button>
              </>
            ) : (
              <>
                <FilterX className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
                <h3 className={`text-lg ${TYPE_WEIGHT.semibold} ${t.textPrimary} mb-2`}>No results match your filters</h3>
                <p className={`${TYPE_SCALE.body} mb-4 ${t.textFaint}`}>Try adjusting your search or filters.</p>
                <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-all`}>
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
                gridClassName={g.hasMeaningfulSubgroups ? 'space-y-1' : (viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0 -mx-4')}
              >
                {g.hasMeaningfulSubgroups ? (
                  g.subgroups.map(sg => (
                    <Subsection
                      key={sg.designation}
                      label={sg.designation}
                      color={g.color}
                      count={sg.employees.length}
                      open={isSubOpen(g.section, sg.designation)}
                      onToggle={() => toggleSub(g.section, sg.designation)}
                      gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-0'}
                    >
                      {sg.employees.map(e => (
                        <motion.div key={e.id} variants={fadeUp}>
                          {viewMode === 'grid'
                            ? <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                            : <EmployeeRow employee={e} onEdit={openEdit} onDelete={onDelete} />}
                        </motion.div>
                      ))}
                    </Subsection>
                  ))
                ) : (
                  g.employees.map(e => (
                    <motion.div key={e.id} variants={fadeUp}>
                      {viewMode === 'grid'
                        ? <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                        : <EmployeeRow employee={e} onEdit={openEdit} onDelete={onDelete} />}
                    </motion.div>
                  ))
                )}
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

      {showRosterExport && <RosterExportDialog employees={employees} onClose={() => setShowRosterExport(false)} />}
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
