// app/employees/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  List, LayoutGrid, MapPin, Filter, Award, Plus, Phone, Archive,
  FileSpreadsheet, FileText, HardHat,
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ACCENT_HEX, STATUS_TONE, SelectField, Combobox, type ComboOption, TYPE_SCALE, TYPE_WEIGHT, RADIUS,
  GroupSection, RecordCard, staggerContainer, fadeUp,
  Subsection, InfoRow, SummaryItem, LoadingState, AutofillInput, useConfirm, accentText, uiIconClass, decorativeAccentHex,
} from '@/components/shared/theme';
import { formatDate } from '@/lib/format';
import { exportFilename, EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB, styleExcelHeaderRow } from '@/lib/exportUtils';
import { exportPersonnelRegistryExcel } from './exportPersonnelRegistry';
import {
  designationSelectOptions, foremanSelectOptions, normalizeDesignation,
  designationFilterOptions, driverLicenseSelectOptions, resolveDriverLicense,
  sectionForDesignation, normalizeEmployeeRoleFields, rosterSubgroupLabel,
  ARTISAN_FILTER_VALUE, ARTISAN_SUBCATEGORY, FOREMAN_SUBCATEGORY, isArtisanClass1Designation,
} from '@/lib/employeeCatalog';
import { formatPhoneDisplay, telHref, normalizePhoneField } from '@/lib/phone';
import {
  normalizeSection, sectionColor, SECTION_ORDER, sectionSelectOptions,
} from '@/lib/sections';
import type { Employee, EmployeeFormData, SectionGroup, SortDir, SortField } from './types';
import { removeEmployee, saveEmployee, useEmployeesData } from './useEmployeesData';
import { NormalizeRosterDialog } from './NormalizeRosterDialog';
import { useAuth } from '@/lib/auth-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS = ['Permanent', 'Contract', 'Internship', 'Part-Time'] as const;
const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'none', label: 'Not set' },
  { value: 'NEC', label: 'NEC' },
  { value: 'SALARIED', label: 'Salaried' },
] as const;

const CLASS_COLORS: Record<string, string> = {
  Permanent: STATUS_TONE.good,
  Contract: STATUS_TONE.warning,
  Internship: ACCENT_HEX.blue,
  'Part-Time': ACCENT_HEX.violet,
};
const ETYPE_COLORS: Record<string, string> = { NEC: ACCENT_HEX.indigo, SALARIED: ACCENT_HEX.cyan };
const NEUTRAL_BADGE = STATUS_TONE.neutral;

/** Shared grid columns for list-view header + rows — keeps badges and actions aligned. */
const LIST_ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1.35fr)_minmax(0,1fr)_88px_72px_72px_7.5rem] items-center gap-x-3';

function driverLabel(e: Pick<Employee, 'drivers_license_class'>): string {
  return resolveDriverLicense(e.drivers_license_class);
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
        const subKey = rosterSubgroupLabel(e.designation);
        if (!subMap.has(subKey)) subMap.set(subKey, []);
        subMap.get(subKey)!.push(e);
      }
      const subgroups = [...subMap.keys()]
        .sort((a, b) => {
          if (a === ARTISAN_SUBCATEGORY) return -1;
          if (b === ARTISAN_SUBCATEGORY) return 1;
          if (a === FOREMAN_SUBCATEGORY) return -1;
          if (b === FOREMAN_SUBCATEGORY) return 1;
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return a.localeCompare(b);
        })
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
    const key = normalizeDesignation(e.designation) || 'Unclassified';
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

function EmployeeResults({
  employees, viewMode, onEdit, onDelete, expandRows = false, showListHeader = false,
}: {
  employees: Employee[];
  viewMode: 'list' | 'grid';
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  expandRows?: boolean;
  showListHeader?: boolean;
}) {
  const t = useTheme();
  const gridCls = viewMode === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'flex flex-col gap-1.5';
  return (
    <div className={viewMode === 'list' ? 'rounded-xl border overflow-hidden' : undefined} style={viewMode === 'list' ? { borderColor: `${ACCENT_HEX.violet}22` } : undefined}>
      {viewMode === 'list' && showListHeader && (
        <ListRowHeader />
      )}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className={gridCls}>
        {employees.map(e => (
          <motion.div key={e.id} variants={fadeUp} className={viewMode === 'grid' ? 'min-w-0' : undefined}>
            {viewMode === 'grid'
              ? <EmployeeCard employee={e} onEdit={onEdit} onDelete={onDelete} />
              : <EmployeeRow employee={e} onEdit={onEdit} onDelete={onDelete} defaultExpanded={expandRows} />}
          </motion.div>
        ))}
      </motion.div>
      {viewMode === 'list' && employees.length === 0 && (
        <p className={`px-4 py-6 text-center text-sm ${t.textFaint}`}>No employees in this group.</p>
      )}
    </div>
  );
}

function ListRowHeader() {
  const t = useTheme();
  return (
    <div className={`${LIST_ROW_GRID} px-4 py-2.5 text-[10px] uppercase tracking-wider ${TYPE_WEIGHT.semibold} ${t.textFaint} border-b ${t.border} ${t.chipBg} max-lg:hidden`}>
      <span aria-hidden />
      <span>Employee</span>
      <span className="hidden xl:block">Designation</span>
      <span className="hidden md:block text-center">Section</span>
      <span className="hidden sm:block text-center">Type</span>
      <span className="hidden sm:block text-center">Class</span>
      <span className="text-right">Actions</span>
    </div>
  );
}

function EmployeeListShell({ children, showHeader = false }: { children: React.ReactNode; showHeader?: boolean }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${ACCENT_HEX.violet}22` }}>
      {showHeader && <ListRowHeader />}
      {children}
    </div>
  );
}

function renderEmployeeList(
  employees: Employee[],
  onEdit: (e: Employee) => void,
  onDelete: (e: Employee) => void,
  showHeader = false,
) {
  return (
    <EmployeeListShell showHeader={showHeader}>
      {employees.map(e => (
        <motion.div key={e.id} variants={fadeUp}>
          <EmployeeRow employee={e} onEdit={onEdit} onDelete={onDelete} />
        </motion.div>
      ))}
    </EmployeeListShell>
  );
}


// ─── Small themed building blocks ────────────────────────────────────────────
// InfoRow/SummaryItem now come from the shared design system (promoted from
// this page's own local versions — see the design-system migration).

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

// Section isn't a column here — every row on a given worksheet already shares one
// (that's the grouping key itself, see RosterExportDialog below), so repeating it per
// row would be redundant. Trimmed to the fields actually needed for a roster handout;
// email/grade/class/supervisor/id_number live in the full flat registry export instead.
const EXPORT_COLUMNS = [
  { header: 'Employee ID', key: 'employee_id', width: 14 },
  { header: 'First Name', key: 'first_name', width: 18 },
  { header: 'Last Name', key: 'last_name', width: 18 },
  { header: 'Designation', key: 'designation', width: 24 },
  { header: 'Section', key: 'section', width: 18 },
  { header: 'Phone', key: 'phone', width: 16 },
  { header: 'Employment Type', key: 'employment_type', width: 16 },
  { header: 'Start Date', key: 'date_of_engagement', width: 14 },
];
const EXPORT_PDF_HEAD = ['Employee ID', 'First Name', 'Last Name', 'Designation', 'Section', 'Phone', 'Employment Type', 'Start Date'];
const exportPdfRow = (e: Employee) => [
  e.employee_id, e.first_name, e.last_name,
  normalizeDesignation(e.designation) || '',
  normalizeSection(e.section) === 'Unassigned' ? '' : normalizeSection(e.section),
  formatPhoneDisplay(e.phone) || '',
  e.employment_type || '',
  e.date_of_engagement ? fmtDate(e.date_of_engagement) : '',
];

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

  // ws.addRow(employee) writes raw field values as-is (no per-column formatter, unlike
  // DownloadButton's `format` callback) — this formats the one field that needs it
  // (date_of_engagement is a raw ISO string otherwise) before handing rows to ExcelJS.
  const toExportRow = (e: Employee) => ({
    ...e,
    designation: normalizeDesignation(e.designation) || '',
    section: normalizeSection(e.section) === 'Unassigned' ? '' : normalizeSection(e.section),
    phone: formatPhoneDisplay(e.phone) || '',
    date_of_engagement: e.date_of_engagement ? fmtDate(e.date_of_engagement) : '',
  });

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
          sub.employees.forEach(e => ws.addRow(toExportRow(e) as any));
        }
      }
    } else {
      for (const g of flatGroups) {
        const ws = wb.addWorksheet(g.label.slice(0, 31));
        ws.columns = EXPORT_COLUMNS;
        styleExcelHeaderRow(ws.getRow(1));
        g.rows.forEach(e => ws.addRow(toExportRow(e) as any));
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
  allEmployees: Employee[];
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
  offences: [], awards_recognition: [], other_positions: [], previous_employer: '', archived: false,
};

function EmployeeForm({ initialData, allEmployees, onSubmit, onCancel, isSubmitting }: EmployeeFormProps) {
  const t = useTheme();
  const [form, setForm] = useState<EmployeeFormData>(() => {
    if (!initialData) return { ...EMPTY_FORM };
    const role = normalizeEmployeeRoleFields(initialData.designation, initialData.section, initialData.first_name, initialData.last_name);
    return {
      employee_id: initialData.employee_id || '',
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      id_number: initialData.id_number || '',
      email: initialData.email || '',
      phone: normalizePhoneField(initialData.phone) || '',
      address: initialData.address || '',
      date_of_engagement: initialData.date_of_engagement || '',
      designation: role.designation,
      employee_class: initialData.employee_class || '',
      employment_type: (initialData.employment_type as 'NEC' | 'SALARIED' | '') || '',
      supervisor: initialData.supervisor || '',
      section: role.section,
      department: initialData.department || '',
      grade: initialData.grade || '',
      qualifications: initialData.qualifications || [],
      drivers_license_class: resolveDriverLicense(initialData.drivers_license_class) || initialData.drivers_license_class || '',
      offences: initialData.offences || [],
      awards_recognition: initialData.awards_recognition || [],
      other_positions: initialData.other_positions || [],
      previous_employer: initialData.previous_employer || '',
      archived: !!initialData.archived,
    };
  });

  const designationComboOptions = useMemo((): ComboOption[] => {
    const q = (form.designation || '').trim().toLowerCase();
    const opts = designationSelectOptions(form.designation).filter(o => o.value);
    const filtered = !q
      ? opts
      : opts.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    return filtered.slice(0, 20).map(o => ({ value: o.value, label: o.label }));
  }, [form.designation]);
  const sectionOptions = useMemo(
    () => sectionSelectOptions(form.section),
    [form.section],
  );
  const supervisorOptions = useMemo(
    () => foremanSelectOptions(allEmployees, form.supervisor),
    [allEmployees, form.supervisor],
  );
  const driverLicenseOptions = useMemo(
    () => driverLicenseSelectOptions(form.drivers_license_class),
    [form.drivers_license_class],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'basic' | 'employment' | 'qualifications' | 'additional'>('basic');
  const [temps, setTemps] = useState({ qual: '', offence: '', award: '', pos: '' });

  const set = (f: keyof EmployeeFormData, v: string | string[] | boolean) => {
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
              { f: 'phone' as const,       label: 'Phone',       ph: '+263 77 123 4567 — use / between multiple numbers' },
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
            <FormField label="Engagement Date">
              <input type="date" title="Date of engagement (optional)" aria-label="Date of engagement" value={form.date_of_engagement}
                onChange={e => set('date_of_engagement', e.target.value)}
                className={inputCls} />
            </FormField>
            <FormField label="Designation" required>
              <Combobox
                size="form"
                title="Designation"
                placeholder="Search or select designation…"
                value={form.designation || ''}
                onChange={v => set('designation', v)}
                onSelect={opt => {
                  set('designation', opt.value);
                  const implied = sectionForDesignation(opt.value);
                  if (implied) set('section', implied);
                }}
                onBlurCommit={() => {
                  const normalized = normalizeDesignation(form.designation);
                  if (normalized && normalized !== form.designation) {
                    set('designation', normalized);
                    const implied = sectionForDesignation(normalized);
                    if (implied) set('section', implied);
                  }
                }}
                options={designationComboOptions}
                emptyText="No matching designation"
              />
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
              <SelectField size="form"
                title="Employment type"
                value={form.employment_type || 'none'}
                onChange={v => set('employment_type', v === 'none' ? '' : v as 'NEC' | 'SALARIED')}
                options={[...EMPLOYMENT_TYPE_OPTIONS]}
              />
            </FormField>
            <FormField label="Section">
              <SelectField size="form"
                title="Section"
                value={form.section || ''}
                onChange={v => set('section', v)}
                options={sectionOptions}
              />
            </FormField>
            <FormField label="Foreman / Supervisor">
              <SelectField size="form"
                title="Foreman or supervisor"
                value={form.supervisor || ''}
                onChange={v => set('supervisor', v)}
                options={supervisorOptions}
              />
            </FormField>
            {[
              { f: 'grade' as const,             label: 'Grade' },
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
              <SelectField size="form"
                title="Driver's license class"
                value={form.drivers_license_class || ''}
                onChange={v => set('drivers_license_class', v)}
                options={driverLicenseOptions}
              />
            </FormField>
            <FormField label="Other Positions">{tagInput('other_positions', 'pos', 'Add position', ACCENT_HEX.violet)}</FormField>
            <FormField label="Awards & Recognition">{tagInput('awards_recognition', 'award', 'Add award or recognition', STATUS_TONE.warning)}</FormField>
            <FormField label="Offences">{tagInput('offences', 'offence', 'Add offence record', STATUS_TONE.critical)}</FormField>
            <FormField label="Archived">
              <label className={`flex items-center gap-2 text-sm ${t.textMuted} cursor-pointer`}>
                <input
                  type="checkbox"
                  checked={!!form.archived}
                  onChange={e => set('archived', e.target.checked)}
                  className="rounded border-white/20"
                />
                Hide from active roster (e.g. Hoist Drivers no longer on site)
              </label>
            </FormField>
          </div>
        )}
      </div>

      <FormActions onCancel={onCancel} submitting={isSubmitting} submitLabel={initialData ? 'Save Changes' : 'Add Employee'} accent="violet" />
    </form>
  );
}

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

function DetailPanel({
  icon: Icon, title, accent, children, suffix,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  accent: string;
  children: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  const t = useTheme();
  const panelIconHex = decorativeAccentHex(t.light, accent);
  return (
    <div className={`${t.chipBg} rounded-xl overflow-hidden border ${t.border}`}>
      <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}>
        <Icon
          className={`h-3.5 w-3.5 ${panelIconHex ? '' : uiIconClass('neutral', t.light)}`}
          style={panelIconHex ? { color: panelIconHex } : undefined}
        />
        <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textSecondary}`}>{title}</span>
        {suffix}
      </div>
      {children}
    </div>
  );
}

function EmployeeRowActions({
  employee, expanded, onToggle, onEdit, onDelete, className = '',
}: {
  employee: Employee;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  className?: string;
}) {
  const t = useTheme();
  const secColor = sectionColor(employee.section);
  return (
    <div className={`flex items-center justify-end gap-0.5 ${className}`}>
      {employee.email && (
        <button type="button" title="Send email" onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
          style={{ backgroundColor: `${ACCENT_HEX.violet}18`, color: ACCENT_HEX.violet }}>
          <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
      {employee.phone && telHref(employee.phone) && (
        <button type="button" title="Call" onClick={() => window.open(telHref(employee.phone), '_self')}
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
          style={{ backgroundColor: `${STATUS_TONE.good}18`, color: STATUS_TONE.good }}>
          <Phone className="h-3.5 w-3.5" />
        </button>
      )}
      <button type="button" title="Edit employee" onClick={() => onEdit(employee)}
        className="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
        style={{ backgroundColor: `${ACCENT_HEX.violet}18`, color: ACCENT_HEX.violet }}>
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" title="Delete employee" onClick={() => onDelete(employee)}
        className="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
        style={{ backgroundColor: `${STATUS_TONE.critical}14`, color: STATUS_TONE.critical }}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}
        className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" style={{ color: secColor }} />}
      </button>
    </div>
  );
}

interface EmployeeRowProps {
  employee: Employee; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void;
  defaultExpanded?: boolean;
}

function EmployeeRow({ employee, onEdit, onDelete, defaultExpanded = false }: EmployeeRowProps) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const name = `${employee.first_name} ${employee.last_name}`;
  const ten = tenure(employee.date_of_engagement);
  const quals = employee.qualifications?.length ?? 0;
  const secColor = sectionColor(employee.section);
  const designation = normalizeDesignation(employee.designation);
  const sectionLabel = employee.section ? normalizeSection(employee.section) : '';
  const driver = driverLabel(employee);
  const toggle = () => setExpanded(o => !o);

  return (
    <div
      className={`border-b last:border-b-0 ${t.border} ${expanded ? t.chipBg : t.hoverBgSoft} transition-colors`}
      style={{ borderLeftWidth: 3, borderLeftColor: expanded ? secColor : 'transparent' }}
    >
      <div className={`${LIST_ROW_GRID} px-4 py-3 group max-lg:flex max-lg:flex-wrap max-lg:items-center max-lg:gap-3`}>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 max-lg:order-1"
          style={{ backgroundColor: `${secColor}18` }}
        >
          <UserRound className="h-4 w-4" style={{ color: secColor }} />
        </div>

        <button type="button" onClick={toggle} className="min-w-0 text-left max-lg:order-2 max-lg:flex-1">
          <div className={`${TYPE_WEIGHT.semibold} text-[14px] tracking-tight ${t.textPrimary} truncate`}>{name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-mono ${t.textFaint}`}>{employee.employee_id}</span>
            {designation && <span className={`text-xs ${t.textFaint} xl:hidden truncate max-w-[12rem]`}>· {designation}</span>}
            <span className={`hidden lg:flex items-center gap-1 text-[11px] ${t.textFaint}`}>
              <Clock className="h-3 w-3" style={{ color: secColor }} />{ten}
            </span>
            {quals > 0 && (
              <span className={`hidden lg:flex items-center gap-1 text-[11px] ${t.textFaint}`}>
                <GraduationCap className="h-3 w-3" style={{ color: secColor }} />{quals}
              </span>
            )}
          </div>
        </button>

        <div className={`hidden xl:block min-w-0 text-xs ${t.textMuted} truncate`} title={designation}>
          {designation || '—'}
        </div>

        <div className="hidden md:flex justify-center">
          {sectionLabel
            ? <StatusBadge color={secColor} label={sectionLabel} />
            : <span className={`text-xs ${t.textFaint}`}>—</span>}
        </div>

        <div className="hidden sm:flex justify-center">
          {employee.employment_type
            ? <StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? NEUTRAL_BADGE} label={employee.employment_type} />
            : <span className={`text-xs ${t.textFaint}`}>—</span>}
        </div>

        <div className="hidden sm:flex justify-center items-center gap-1.5">
          <StatusBadge
            color={CLASS_COLORS[employee.employee_class || ''] ?? NEUTRAL_BADGE}
            label={employee.employee_class || 'Unclassified'}
          />
        </div>

        <EmployeeRowActions
          employee={employee}
          expanded={expanded}
          onToggle={toggle}
          onEdit={onEdit}
          onDelete={onDelete}
          className="max-lg:order-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity"
        />
      </div>

      {expanded && (
        <div className={`px-4 pb-4 pt-1 border-t ${t.border} space-y-3`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DetailPanel icon={UserRound} title="Personal" accent={secColor}>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="ID Number" value={employee.id_number} />
                <InfoRow label="Phone" value={employee.phone ? (
                  telHref(employee.phone)
                    ? <a href={telHref(employee.phone)} className="text-brand-500 dark:text-brand-400 hover:underline">{formatPhoneDisplay(employee.phone)}</a>
                    : formatPhoneDisplay(employee.phone)
                ) : undefined} />
                <div className="col-span-2"><InfoRow label="Email" value={employee.email ? <a href={`mailto:${employee.email}`} className="text-brand-500 dark:text-brand-400 hover:underline">{employee.email}</a> : undefined} /></div>
                {employee.address && <div className="col-span-2"><InfoRow label="Address" value={employee.address} /></div>}
              </div>
            </DetailPanel>

            <DetailPanel icon={BriefcaseBusiness} title="Employment" accent={secColor}>
              <div className="px-3.5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                <InfoRow label="Engaged" value={fmtDate(employee.date_of_engagement)} />
                <InfoRow label="Tenure" value={ten} />
                <InfoRow label="Designation" value={designation || undefined} />
                <InfoRow label="Section" value={sectionLabel || undefined} />
                <InfoRow label="Grade" value={employee.grade} />
                <InfoRow label="Supervisor" value={employee.supervisor} />
                {driver && <InfoRow label="Driver's Licence" value={driver} />}
                <InfoRow label="Prev. Employer" value={employee.previous_employer} />
              </div>
            </DetailPanel>
          </div>

          {quals > 0 && (
            <DetailPanel
              icon={GraduationCap}
              title="Qualifications"
              accent={secColor}
              suffix={<span className={`text-[10px] ml-1 ${t.textFaint}`}>{quals} recorded</span>}
            >
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {employee.qualifications!.map((q, i) => <StatusBadge key={i} color={ACCENT_HEX.blue} label={q} />)}
              </div>
            </DetailPanel>
          )}

          {((employee.awards_recognition?.length ?? 0) > 0 || (employee.other_positions?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(employee.awards_recognition?.length ?? 0) > 0 && (
                <DetailPanel icon={Award} title="Awards" accent={STATUS_TONE.warning}>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.awards_recognition!.map((a, i) => <StatusBadge key={i} color={STATUS_TONE.warning} label={a} />)}
                  </div>
                </DetailPanel>
              )}
              {(employee.other_positions?.length ?? 0) > 0 && (
                <DetailPanel icon={Briefcase} title="Other Positions" accent={ACCENT_HEX.violet}>
                  <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                    {employee.other_positions!.map((p, i) => <StatusBadge key={i} color={ACCENT_HEX.violet} label={p} />)}
                  </div>
                </DetailPanel>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={() => onEdit(employee)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${TYPE_WEIGHT.medium}`}
              style={{ backgroundColor: `${ACCENT_HEX.violet}18`, color: ACCENT_HEX.violet }}>
              <Pencil className="h-3 w-3" /> Edit Employee
            </button>
            <button type="button" onClick={() => onDelete(employee)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${TYPE_WEIGHT.medium}`}
              style={{ backgroundColor: `${STATUS_TONE.critical}14`, color: STATUS_TONE.critical }}>
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
      subtitle={normalizeDesignation(employee.designation) || 'No role'}
      badges={<>
        {employee.section && <StatusBadge color={t.light ? secColor : NEUTRAL_BADGE} label={normalizeSection(employee.section)} />}
        {employee.employment_type && <StatusBadge color={ETYPE_COLORS[employee.employment_type] ?? NEUTRAL_BADGE} label={employee.employment_type} />}
        {employee.employee_class && <StatusBadge color={CLASS_COLORS[employee.employee_class] ?? NEUTRAL_BADGE} label={employee.employee_class} />}
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <SummaryItem icon={Hash} label="Mine No." value={employee.employee_id} color={secColor} />
          <SummaryItem icon={Phone} label="Phone" value={formatPhoneDisplay(employee.phone) || undefined} color={secColor} />
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
        <InfoRow label="Section" value={employee.section ? normalizeSection(employee.section) : undefined} />
        <InfoRow label="Tenure" value={ten} />
        <InfoRow label="Joined" value={fmtDate(employee.date_of_engagement)} />
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
  const { isAtLeast } = useAuth();
  const canManageRoster = isAtLeast('manager');
  const { employees, isLoading, error, setError, reload } = useEmployeesData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRosterExport, setShowRosterExport] = useState(false);
  const [showNormalize, setShowNormalize] = useState(false);

  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  useEffect(() => {
    const fromUrl = searchParams.get('highlight') || searchParams.get('q');
    if (fromUrl?.trim()) setSearch(fromUrl.trim());
  }, [searchParams]);
  const [classFilter,   setClassFilter]   = useState('all');
  const [etypeFilter,   setEtypeFilter]   = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
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
  const [showFilters, setShowFilters] = useState(false);

  const sections = useCollapseSection({ hero: true });

  const activeEmployees = useMemo(() => employees.filter(e => e.archived !== true), [employees]);
  const archivedEmployees = useMemo(() => employees.filter(e => e.archived === true), [employees]);

  const legacyRoles = useMemo(
    () => [...new Set(activeEmployees.map(e => (e.designation || '').trim()).filter(Boolean))],
    [activeEmployees],
  );
  const roleFilterOptions = useMemo(() => designationFilterOptions(legacyRoles), [legacyRoles]);
  const sectionFilterOptions = useMemo(() => [
    { value: 'all', label: 'All sections' },
    ...SECTION_ORDER.map(s => ({ value: s, label: s })),
    { value: 'Unassigned', label: 'Unassigned' },
  ], []);

  const filtered = useMemo(() => {
    let list = [...activeEmployees];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
        e.employee_id?.toLowerCase().includes(s) ||
        (e.designation?.toLowerCase() ?? '').includes(s) ||
        (normalizeDesignation(e.designation).toLowerCase()).includes(s) ||
        (e.id_number?.toLowerCase() ?? '').includes(s) ||
        (e.section?.toLowerCase() ?? '').includes(s)
      );
    }
    if (classFilter   !== 'all') list = list.filter(e => (e.employee_class || 'Unclassified') === classFilter);
    if (etypeFilter   !== 'all') list = list.filter(e => (e.employment_type || '') === etypeFilter);
    if (sectionFilter !== 'all') list = list.filter(e => normalizeSection(e.section) === sectionFilter);
    if (roleFilter === ARTISAN_FILTER_VALUE) {
      list = list.filter(e => isArtisanClass1Designation(e.designation));
    } else if (roleFilter !== 'all') {
      list = list.filter(e => normalizeDesignation(e.designation) === roleFilter
        || (e.designation || '').trim() === roleFilter);
    }
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sortBy === 'first_name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
      else if (sortBy === 'date_of_engagement') { av = a.date_of_engagement || ''; bv = b.date_of_engagement || ''; }
      else if (sortBy === 'section') { av = normalizeSection(a.section); bv = normalizeSection(b.section); }
      else { av = (a[sortBy] as string) || ''; bv = (b[sortBy] as string) || ''; }
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    return list;
  }, [activeEmployees, search, classFilter, etypeFilter, sectionFilter, roleFilter, sortBy, sortDir]);

  const isSearchActive = search.trim().length > 0;
  const grouped = useMemo(() => (isSearchActive ? [] : groupBySectionAndProfession(filtered)), [filtered, isSearchActive]);

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

  const activeFilterCount = [classFilter !== 'all', etypeFilter !== 'all', sectionFilter !== 'all', roleFilter !== 'all'].filter(Boolean).length;

  const stats = useMemo(() => ({
    total:    activeEmployees.length,
    nec:      activeEmployees.filter(e => e.employment_type === 'NEC').length,
    salaried: activeEmployees.filter(e => e.employment_type === 'SALARIED').length,
    permanent:activeEmployees.filter(e => e.employee_class === 'Permanent').length,
    artisans: activeEmployees.filter(e => isArtisanClass1Designation(e.designation)).length,
    archived: archivedEmployees.length,
  }), [activeEmployees, archivedEmployees]);

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
  const clearFilters = () => { setSearch(''); setClassFilter('all'); setEtypeFilter('all'); setSectionFilter('all'); setRoleFilter('all'); };
  const showAllStaff = () => { setEtypeFilter('all'); setClassFilter('all'); setSectionFilter('all'); setRoleFilter('all'); };
  const artisansOnly = roleFilter === ARTISAN_FILTER_VALUE;
  const toggleArtisansOnly = () => setRoleFilter(prev => prev === ARTISAN_FILTER_VALUE ? 'all' : ARTISAN_FILTER_VALUE);
  const showArtisansOnly = () => setRoleFilter(ARTISAN_FILTER_VALUE);

  const downloadPersonnelRegistry = () => {
    void exportPersonnelRegistryExcel(activeEmployees, exportFilename('Personnel_Registry'));
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
            {activeEmployees.length > 0 && (
              <button
                type="button"
                title="Download Personnel Registry (Excel, grouped by designation)"
                onClick={downloadPersonnelRegistry}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} border border-emerald-500/30 bg-emerald-500/15 ${accentText('emerald', t.light)} hover:bg-emerald-500/25 transition-all hover:brightness-110`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download
              </button>
            )}
            <button type="button" onClick={() => setShowRosterExport(true)} disabled={activeEmployees.length === 0} title="Download organized by section or profession"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors disabled:opacity-40`}>
              <Award className="h-4 w-4" />
            </button>
            {canManageRoster && activeEmployees.length > 0 && (
              <button type="button" onClick={() => setShowNormalize(true)} title="Normalize designations, sections, and phone numbers across the roster"
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}>
                <Sparkles className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={openAdd} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 transition-all hover:brightness-110`}>
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={Users} color={ACCENT_HEX.blue} value={stats.total} label="Total Staff" onClick={showAllStaff} />
          <StatTile icon={HardHat} color="#f97316" value={stats.artisans} label="Artisans" onClick={showArtisansOnly} />
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

      {/* Registry — search lives with the results it filters */}
      <div className={`${t.glass} ${RADIUS.card} ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} space-y-3`}>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, mine number, designation…"
              className="flex-1 min-w-0"
            />
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                title="Show Class 1 trades and winder technicians only"
                onClick={toggleArtisansOnly}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} transition-colors ${
                  artisansOnly
                    ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
                    : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`
                }`}
              >
                <HardHat className="h-3.5 w-3.5" /> Artisans only
              </button>
              <button type="button" onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`}`}>
                <Filter className="h-3.5 w-3.5" /> Filters
                {activeFilterCount > 0 && <span className={`ml-0.5 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>{activeFilterCount}</span>}
              </button>
              {(activeFilterCount > 0 || search) && (
                <button type="button" onClick={clearFilters}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] ${TYPE_WEIGHT.medium} ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
                  <FilterX className="h-3.5 w-3.5" /> Clear
                </button>
              )}
              <SelectField size="filter" title="Sort by" value={sortBy} onChange={v => setSortBy(v as SortField)}
                options={[
                  { value: 'first_name', label: 'Name' },
                  { value: 'employee_id', label: 'Mine No.' },
                  { value: 'designation', label: 'Designation' },
                  { value: 'section', label: 'Section' },
                  { value: 'date_of_engagement', label: 'Engagement date' },
                ]} />
              <button type="button" title="Toggle sort direction" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Card view' }, { value: 'list', icon: List, label: 'List view' }]} />
            </div>
          </div>

          {showFilters && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1 border-t ${t.border}`}>
              <FormField label="Section">
                <SelectField size="filter" title="Filter by section" value={sectionFilter} onChange={setSectionFilter} options={sectionFilterOptions} />
              </FormField>
              <FormField label="Designation">
                <SelectField size="filter" title="Filter by designation" value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} />
              </FormField>
              <FormField label="Employment Type">
                <SelectField size="filter" title="Filter by employment type" value={etypeFilter} onChange={setEtypeFilter}
                  options={[{ value: 'all', label: 'All types' }, { value: 'NEC', label: 'NEC' }, { value: 'SALARIED', label: 'Salaried' }]} />
              </FormField>
              <FormField label="Employee Class">
                <SelectField size="filter" title="Filter by employee class" value={classFilter} onChange={setClassFilter}
                  options={[{ value: 'all', label: 'All classes' }, ...CLASS_OPTIONS.map(c => ({ value: c, label: c }))]} />
              </FormField>
            </div>
          )}
        </div>

        <div className={`px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b ${t.border} ${t.chipBg}`}>
          <p className={`${TYPE_SCALE.body} ${t.textFaint}`}>
            {isSearchActive ? (
              <>
                <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{filtered.length}</span>
                {' '}result{filtered.length === 1 ? '' : 's'} for &ldquo;{search.trim()}&rdquo;
              </>
            ) : (
              <>
                Showing <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{filtered.length}</span> of {activeEmployees.length} active
                {artisansOnly && <span className="text-orange-400"> · Artisans only</span>}
                {stats.archived > 0 && <span className={t.textFaint}> · {stats.archived} archived</span>}
                {grouped.length > 0 && <span> · {grouped.length} section{grouped.length === 1 ? '' : 's'}</span>}
              </>
            )}
          </p>
          {!isSearchActive && grouped.length > 1 && (
            <button type="button" onClick={toggleAllGroups}
              className={`flex items-center gap-1.5 text-[12px] ${TYPE_WEIGHT.medium} ${t.textMuted} ${t.hoverText} transition-colors`}>
              {allGroupsOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allGroupsOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

        <div className="p-4">
        {isLoading ? (
          <div className="py-16 text-center">
            <LoadingState />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            {activeEmployees.length === 0 && archivedEmployees.length === 0 ? (
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
        ) : isSearchActive ? (
          <EmployeeResults employees={filtered} viewMode={viewMode} onEdit={openEdit} onDelete={onDelete} expandRows showListHeader />
        ) : (
          <div className="space-y-3">
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
                gridClassName={g.hasMeaningfulSubgroups ? 'space-y-3' : (viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : '')}
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
                      gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : ''}
                    >
                      {viewMode === 'grid' ? (
                        sg.employees.map(e => (
                          <motion.div key={e.id} variants={fadeUp}>
                            <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                          </motion.div>
                        ))
                      ) : renderEmployeeList(sg.employees, openEdit, onDelete)}
                    </Subsection>
                  ))
                ) : viewMode === 'grid' ? (
                  g.employees.map(e => (
                    <motion.div key={e.id} variants={fadeUp}>
                      <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                    </motion.div>
                  ))
                ) : renderEmployeeList(g.employees, openEdit, onDelete, true)}
              </GroupSection>
            ))}
            {archivedEmployees.length > 0 && (
              <GroupSection
                icon={Archive}
                accentHex={STATUS_TONE.neutral}
                title="Archived Personnel"
                count={archivedEmployees.length}
                countLabel={archivedEmployees.length === 1 ? 'person' : 'people'}
                open={isGroupOpen('__archived__')}
                onToggle={() => toggleGroup('__archived__')}
                gridClassName={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : ''}
              >
                {viewMode === 'grid' ? archivedEmployees.map(e => (
                  <motion.div key={e.id} variants={fadeUp}>
                    <EmployeeCard employee={e} onEdit={openEdit} onDelete={onDelete} />
                  </motion.div>
                )) : renderEmployeeList(archivedEmployees, openEdit, onDelete, true)}
              </GroupSection>
            )}
          </div>
        )}
        </div>
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
            allEmployees={employees}
            onSubmit={onSubmit}
            onCancel={() => { setShowForm(false); setSelectedEmployee(null); }}
            isSubmitting={isSubmitting}
          />
        </div>
      </CenterModal>

      {showRosterExport && <RosterExportDialog employees={activeEmployees} onClose={() => setShowRosterExport(false)} />}
      {showNormalize && (
        <NormalizeRosterDialog
          open={showNormalize}
          employees={employees}
          onClose={() => setShowNormalize(false)}
          onComplete={reload}
        />
      )}
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
