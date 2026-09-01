'use client';

import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { api } from '@/lib/apiClient';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, FileText, Eye,
  Trash2, Pencil, HardHat, AlertTriangle,
  Users, UserRound,
  Award, ChevronRight,
  Shirt, ChevronsUp, ChevronsDown, X,
  BoxingGlove, Goggles, Boot, Seatbelt, FaceMask, Hoodie, ShirtFolded, Pants, Belt, Umbrella,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { ListAutocomplete } from '@/components/shared/ListAutocomplete';
import { formatDate } from '@/lib/format';
import { addMonths, todayLocal } from '@/lib/dates';
import { toast } from 'sonner';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import {
  useTheme, STATUS_TONE, Collapse, AnimatedText, PulsingIcon, CenterModal, GlowCard,
  staggerContainer, fadeUp, ACCENT, ACCENT_HEX, type Accent,
  StatusBadge, RecordCard, StatTile, ProgressBar, FormField, FormActions,
  useCollapseSection, SelectField, AutofillInput, useConfirm, accentText, TYPE_WEIGHT,
} from '@/components/shared/theme';
import type { PPETypeInfo, PPERecord, EmployeeRow, EmployeeWithPPE, EnhancedStats, FormState } from './types';
import {
  usePPEData,
  createPPERecord, updatePPERecord, deletePPERecord,
} from './usePPEData';
import { isExpiringSoon, isExpired, computeComplianceRate, computeSizeBreakdown } from './calcPPE';

// Data-model types (PPERecord, EmployeeRow, PPEStats, etc.) now live in ./types —
// imported above. Component prop interfaces below stay page-local.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const PPE_TYPES: Record<string, PPETypeInfo> = {
  helmet:        { name: 'Safety Helmet',        shortName: 'Helmet',     color: '#172554', icon: HardHat,     bgColor: 'bg-slate-500/15',   textColor: 'text-slate-300',   borderColor: 'border-slate-400/25',   description: 'Head protection for underground and surface operations' },
  gloves:        { name: 'Safety Gloves',        shortName: 'Gloves',     color: '#f87171', icon: BoxingGlove, bgColor: 'bg-rose-500/15',    textColor: 'text-rose-300',    borderColor: 'border-rose-500/25',    description: 'Hand protection for handling materials and chemicals' },
  glasses:       { name: 'Safety Glasses',       shortName: 'Glasses',    color: '#60a5fa', icon: Goggles,     bgColor: 'bg-brand-500/15',    textColor: 'text-brand-300',    borderColor: 'border-brand-500/25',    description: 'Eye protection from dust and debris' },
  vest:          { name: 'High-Vis Vest',         shortName: 'Vest',       color: '#fbbf24', icon: Shirt,      bgColor: 'bg-amber-500/15',   textColor: 'text-amber-300',   borderColor: 'border-amber-500/25',   description: 'High visibility clothing for surface operations' },
  gumboots:      { name: 'Safety Gum Boots',     shortName: 'GumBoots',   color: '#a78bfa', icon: Boot,        bgColor: 'bg-violet-500/15',  textColor: 'text-violet-300',  borderColor: 'border-violet-500/25',  description: 'Steel-toe foot protection' },
  safety_shoes:  { name: 'Safety Shoes',         shortName: 'Shoes',      color: '#38bdf8', icon: Boot,        bgColor: 'bg-sky-500/15',     textColor: 'text-sky-300',     borderColor: 'border-sky-500/25',     description: 'Protective footwear for various work environments' },
  harness:       { name: 'Safety Harness',       shortName: 'Harness',    color: '#34d399', icon: Seatbelt,    bgColor: 'bg-emerald-500/15', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/25', description: 'Fall protection for heights and shafts' },
  respirator:    { name: 'Respirator',           shortName: 'Respirator', color: '#2dd4bf', icon: FaceMask,    bgColor: 'bg-teal-500/15',    textColor: 'text-teal-300',    borderColor: 'border-teal-500/25',    description: 'Respiratory protection from dust and chemicals' },
  Cap_lamp_belt: { name: 'Cap Lamp Belt',        shortName: 'Lamp Belt',  color: '#f472b6', icon: Belt,        bgColor: 'bg-pink-500/15',    textColor: 'text-pink-300',    borderColor: 'border-pink-500/25',    description: 'Lighting for underground operations' },
  worksuit:      { name: 'Protective Work Suit', shortName: 'Work Suit',  color: '#4169E1', icon: Hoodie,      bgColor: 'bg-orange-500/15',  textColor: 'text-orange-300',  borderColor: 'border-orange-500/25',  description: 'Full body protection for various work environments' },
  rainsuit:      { name: 'Rain Suit',            shortName: 'Rain Suit',  color: '#22d3ee', icon: Umbrella,    bgColor: 'bg-cyan-500/15',    textColor: 'text-cyan-300',    borderColor: 'border-cyan-500/25',    description: 'Waterproof protection for wet conditions' },
  overall:       { name: 'Protective Overall',   shortName: 'Overall',    color: '#c084fc', icon: Pants,       bgColor: 'bg-purple-500/15',  textColor: 'text-purple-300',  borderColor: 'border-purple-500/25',  description: 'One-piece coverall worn going underground' },
  pneumo_jacket: { name: 'Pneumo Jacket',        shortName: 'Pneumo Jkt', color: '#818cf8', icon: ShirtFolded, bgColor: 'bg-indigo-500/15',  textColor: 'text-indigo-300',  borderColor: 'border-indigo-500/25',  description: 'Pneumatic / insulated jacket' },
};

// PPE_MATRIX_DEFAULTS now lives in ./usePPEData (imported above) — same data,
// single source of truth for both the hook's initial state and this page's UI.

// Partially harmonized onto STATUS_TONE (2026-08-29 palette consolidation) — the two
// clean-fit endpoints (best/worst) are shared; 'good'/'poor' keep their own distinct
// shades on purpose. This is a real 5-step severity scale (excellent > good > fair >
// poor > damaged) and STATUS_TONE only has 5 tones total — collapsing 'good' into
// STATUS_TONE.info or 'poor' into STATUS_TONE.critical would make two genuinely
// different conditions render identically. '#86BBD8' is also the app's established
// secondary-brand blue reused elsewhere (ApprovalGate's "sign" variant), not a
// one-off pick worth losing.
const CONDITION_COLORS: Record<string, string> = { excellent: STATUS_TONE.good, good: '#86BBD8', fair: STATUS_TONE.warning, poor: '#f97316', damaged: STATUS_TONE.critical };
const CONDITION_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged' };
// Same reasoning: 'lost' and 'damaged' are distinct alert states worth keeping
// visually separate from plain 'expired', not collapsed onto STATUS_TONE.critical.
const STATUS_COLORS_PPE: Record<string, string> = { active: STATUS_TONE.good, expired: STATUS_TONE.critical, returned: STATUS_TONE.neutral, lost: '#a78bfa', damaged: '#f97316', not_required: STATUS_TONE.neutral };
const STATUS_LABELS: Record<string, string> = { active: 'Active', expired: 'Due', returned: 'Returned', lost: 'Lost', damaged: 'Damaged', not_required: 'Not required' };

// ─── UTILITIES ────────────────────────────────────────────────────────────────

const fmtDate = (s?: string | null) => (s ? formatDate(s) : 'Not specified');

// isExpiringSoon/isExpired/computeComplianceRate/computeSizeBreakdown now live in
// ./calcPPE (imported above) — extracted per the "extract + test business logic"
// standard (app/timesheets/calcTotals.ts precedent), tested in calcPPE.test.ts.

// fetchPPERecords/fetchPPEStats/fetchAllEmployees/createPPERecord/updatePPERecord/
// deletePPERecord now live in ./usePPEData (imported above).

// ─── BADGES ───────────────────────────────────────────────────────────────────
// Rendered via the shared `StatusBadge` component now (see imports) —
// `STATUS_COLORS_PPE`/`CONDITION_COLORS`/labels below remain page-local data.

// ─── EMPLOYEE AUTOCOMPLETE ────────────────────────────────────────────────────

interface EmployeeAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  options: EmployeeRow[];
  placeholder?: string;
  onSelect: (opt: EmployeeRow) => void;
  /** What the field shows/searches primarily — the ID field vs the Name field. */
  display?: 'id' | 'name';
}

function EmployeeAutocomplete({ value, onChange, options, placeholder, onSelect, display = 'id' }: EmployeeAutocompleteProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');
  const [highlight, setHighlight] = useState(0);

  // Keep the local text in sync when the field is filled from elsewhere (e.g. selecting
  // an employee in the ID field fills the name, and vice versa).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setQ(value || ''); }, [value]);

  const filtered = useMemo(() => options.filter(o =>
    o.employee_id?.toLowerCase().includes(q.toLowerCase()) ||
    o.employee_name?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10), [options, q]);

  const pick = (opt: EmployeeRow) => {
    setQ(display === 'name' ? opt.employee_name : opt.employee_id);
    onSelect(opt);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      // Tab (or Enter) accepts the highlighted match — quick keyboard entry.
      const opt = filtered[Math.min(highlight, filtered.length - 1)];
      if (opt) { e.preventDefault(); pick(opt); }
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative">
      <input type="text" value={q} placeholder={placeholder}
        aria-label={display === 'name' ? 'Employee Name' : 'Employee ID'}
        className={`${t.inputBg} rounded-lg text-sm px-3 py-2 w-full transition-all focus:outline-none`}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 160)} />
      {open && filtered.length > 0 && (
        <ul className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-xl shadow-2xl max-h-56 overflow-y-auto list-none p-0 ${t.glass}`}>
          {filtered.map((opt, i) => (
            <li key={i}>
              <button type="button"
                onMouseDown={e => { e.preventDefault(); pick(opt); }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2.5 text-xs border-b ${t.border} last:border-0 transition-all ${i === highlight ? 'bg-brand-500/15' : t.hoverBg}`}>
                <div className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{display === 'name' ? opt.employee_name : opt.employee_id}</div>
                <div className={`text-[11px] ${t.textFaint} mt-0.5`}>{display === 'name' ? `${opt.employee_id} · ${opt.position}` : `${opt.employee_name} · ${opt.position}`}</div>
              </button>
            </li>
          ))}
          <li className={`px-3 py-1.5 text-[10px] ${t.textFaint} border-t ${t.border}`}>↑↓ to move · Tab to select</li>
        </ul>
      )}
    </div>
  );
}

// ─── ISSUED BY — hybrid: pick employee or free-type ──────────────────────────

interface IssuedByInputProps {
  value: string;
  onChange: (v: string) => void;
  employees: EmployeeRow[];
}

function IssuedByInput({ value, onChange, employees }: IssuedByInputProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setQ(value || ''); }, [value]);

  const filtered = useMemo(() => (q.length > 0
    ? employees.filter(e =>
        e.employee_name?.toLowerCase().includes(q.toLowerCase()) ||
        e.employee_id?.toLowerCase().includes(q.toLowerCase()) ||
        e.position?.toLowerCase().includes(q.toLowerCase()))
    : employees
  ).slice(0, 10), [employees, q]);

  return (
    <div className="relative">
      <input type="text" value={q} placeholder="Type a name or pick from employees…"
        aria-label="Issued By"
        className={`${t.inputBg} rounded-lg text-sm px-3 py-2 w-full transition-all focus:outline-none`}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)} />
      {open && filtered.length > 0 && (
        <ul className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-xl shadow-2xl max-h-56 overflow-y-auto list-none p-0 ${t.glass}`}>
          {q.length === 0 && (
            <li className={`px-3 py-1.5 text-[10px] ${t.textFaint} uppercase tracking-wider border-b ${t.border}`}>
              All employees — or keep typing to filter
            </li>
          )}
          {filtered.map((emp, i) => (
            <li key={i}>
              <button type="button"
                onMouseDown={e => { e.preventDefault(); setQ(emp.employee_name); onChange(emp.employee_name); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs ${t.hoverBg} border-b ${t.border} last:border-0 transition-all`}>
                <div className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{emp.employee_name}</div>
                <div className={`text-[11px] ${t.textFaint} mt-0.5`}>{emp.position} · {emp.employee_id}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── PPE ITEM CARD ────────────────────────────────────────────────────────────

interface PPEItemCardProps {
  record: PPERecord;
  onEdit: (r: PPERecord) => void;
  onDelete: (id: string) => void;
  onView: (r: PPERecord) => void;
  onToggleNotRequired: (r: PPERecord) => void;
}

function PPEItemCard({ record, onEdit, onDelete, onView, onToggleNotRequired }: PPEItemCardProps) {
  const t = useTheme();
  const ppeType = PPE_TYPES[record.ppe_type] || PPE_TYPES.helmet;
  const notRequired = record.status === 'not_required';
  const expiring = !notRequired && isExpiringSoon(record.expiry_date);
  const expired  = !notRequired && isExpired(record.expiry_date);
  const glowColor = notRequired ? '#94a3b8' : expired ? '#f43f5e' : expiring ? '#f59e0b' : ACCENT_HEX.blue;

  return (
    <RecordCard
      icon={ppeType.icon}
      accentHex={ppeType.color}
      title={record.item_name}
      subtitle={ppeType.name}
      badges={<>
        <StatusBadge color={CONDITION_COLORS[record.condition] || '#86BBD8'} label={CONDITION_LABELS[record.condition] || record.condition} />
        <StatusBadge color={STATUS_COLORS_PPE[record.status] || '#86BBD8'} label={STATUS_LABELS[record.status] || record.status} dot />
      </>}
      summary={
        <div className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${t.textMuted}`}>
          <span>Issued: {fmtDate(record.issue_date)}</span>
          {record.expiry_date && (
            <span className={`${TYPE_WEIGHT.semibold} ${expired ? 'text-rose-500' : expiring ? 'text-amber-500' : t.textMuted}`}>Expires: {fmtDate(record.expiry_date)}</span>
          )}
          {record.size && <span>Size: {record.size}</span>}
        </div>
      }
      actions={<>
        <button onClick={() => onView(record)} type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} ${t.textMuted} ${t.hoverText} text-[12px] ${TYPE_WEIGHT.semibold} transition-all`}>
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button onClick={() => onEdit(record)} type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[12px] ${TYPE_WEIGHT.semibold} hover:brightness-110 transition-all`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={() => onDelete(record.id)} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] ${TYPE_WEIGHT.semibold} transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`text-xs ${expired ? 'text-rose-500' : expiring ? 'text-amber-500' : t.textFaint}`}>
          {notRequired ? 'Marked not required' : expired ? 'Overdue for replacement' : expiring ? 'Expiring soon' : 'In date'}
        </div>
        {/* Mark an overdue item as intentionally not-needed (drops it from Overdue counts),
            or restore a not-required item to active. */}
        {(expired || notRequired) && (
          <button type="button" onClick={() => onToggleNotRequired(record)}
            className={`text-[11px] ${TYPE_WEIGHT.medium} px-2 py-1 rounded-md ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} transition-colors shrink-0`}>
            {notRequired ? 'Mark as active' : 'Not required'}
          </button>
        )}
      </div>
    </RecordCard>
  );
}

// ─── EMPLOYEE PPE CARD ────────────────────────────────────────────────────────

interface EmployeePPECardProps {
  employee: EmployeeWithPPE;
  isExpanded: boolean;
  onToggle: () => void;
  onIssueNew: (emp: EmployeeWithPPE) => void;
  onEditItem: (r: PPERecord) => void;
  onDeleteItem: (id: string) => void;
  onViewItem: (r: PPERecord) => void;
  onToggleNotRequired: (r: PPERecord) => void;
}

function EmployeePPECard({ employee, isExpanded, onToggle, onIssueNew, onEditItem, onDeleteItem, onViewItem, onToggleNotRequired }: EmployeePPECardProps) {
  const t = useTheme();

  const active   = employee.records.filter(r => r.status === 'active');
  const expired  = employee.records.filter(r => isExpired(r.expiry_date) && r.status === 'active');
  const expiring = employee.records.filter(r => isExpiringSoon(r.expiry_date) && r.status === 'active');
  // Accent = worst outstanding state (overdue → expiring → healthy blue). Drives the
  // homepage-tile treatment: the bare person icon, the GlowCard hover-glow, the accents.
  const accent = expired.length > 0 ? '#f43f5e' : expiring.length > 0 ? '#f59e0b' : ACCENT_HEX.blue;

  return (
    <RecordCard
      icon={UserRound}
      accentHex={accent}
      title={employee.employee_name}
      subtitle={`${employee.position} · ${employee.employee_id}`}
      open={isExpanded}
      onToggle={onToggle}
      badges={<>
        <StatusBadge color="#10b981" label={`${active.length} Active`} dot />
        {expired.length > 0 && <StatusBadge color="#f43f5e" label={`${expired.length} Overdue`} />}
        {expiring.length > 0 && <StatusBadge color="#f59e0b" label={`${expiring.length} Expiring`} />}
        {employee.records.length === 0 && <StatusBadge color="#94a3b8" label="No items" />}
      </>}
      headerActions={
        <button type="button" onClick={e => { e.stopPropagation(); onIssueNew(employee); }} title="Issue new PPE"
          className={`flex items-center gap-1.5 text-[12px] h-7 px-2.5 rounded-lg ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
          <Plus className="h-3 w-3" /> Issue
        </button>
      }
    >
      {employee.records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employee.records.map(record => (
            <PPEItemCard key={record.id} record={record}
              onEdit={onEditItem} onDelete={onDeleteItem} onView={onViewItem} onToggleNotRequired={onToggleNotRequired} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-xl ${t.glassSoft}`}>
          <Shield className={`h-9 w-9 mx-auto mb-2 ${t.textTertiary}`} />
          <p className={`text-sm ${TYPE_WEIGHT.medium} ${t.textMuted}`}>No PPE items issued yet</p>
          <p className={`text-xs ${t.textFaint} mt-1`}>Click &quot;Issue&quot; to add equipment for this employee</p>
        </div>
      )}
    </RecordCard>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  item: PPERecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (r: PPERecord) => void;
}

function PPEDetailModal({ item, isOpen, onClose, onEdit }: DetailModalProps) {
  const t = useTheme();
  if (!item) return null;
  const ppeType = PPE_TYPES[item.ppe_type] || PPE_TYPES.helmet;
  const Icon = ppeType.icon;
  const fields = [
    { label: 'Employee', value: `${item.employee_name} (${item.employee_id})` },
    { label: 'Position',    value: item.position || '—' },
    { label: 'Department',  value: item.department || '—' },
    { label: 'PPE Type',    value: ppeType.name },
    { label: 'Item Name',   value: item.item_name },
    { label: 'Size',        value: item.size || '—' },
    { label: 'Issue Date',  value: fmtDate(item.issue_date) },
    { label: 'Expiry Date', value: fmtDate(item.expiry_date) },
    { label: 'Condition',   value: CONDITION_LABELS[item.condition] || item.condition },
    { label: 'Status',      value: STATUS_LABELS[item.status] || item.status },
    { label: 'Location',    value: item.location || '—' },
    { label: 'Mine Section',value: item.mine_section || '—' },
    { label: 'Issued By',   value: item.issued_by || '—' },
  ];

  return (
    <CenterModal open={isOpen} onClose={onClose} title="PPE Item Details" subtitle={item.item_name} accent="violet" width="max-w-3xl">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-5 space-y-4">
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <PulsingIcon className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${t.chipBg}`}>
            <Icon className="h-5 w-5" style={{ color: ppeType.color }} />
          </PulsingIcon>
          <div>
            <h3 className={`${TYPE_WEIGHT.semibold} ${t.textPrimary} text-base tracking-tight`}>{item.item_name}</h3>
            <AnimatedText as="p" trigger="mount" text={ppeType.description} className={`text-[12.5px] ${t.textSecondary} mt-0.5`} />
          </div>
        </motion.div>

        <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map(f => (
            <motion.div key={f.label} variants={fadeUp} whileHover={{ y: -2 }} className={`rounded-xl p-3 ${t.glassSoft} ${t.shadow} transition-shadow duration-300`}>
              <div className={`text-xs ${TYPE_WEIGHT.medium} ${t.textFaint}`}>{f.label}</div>
              <div className={`text-sm ${TYPE_WEIGHT.medium} break-words mt-1 ${t.textMuted}`}>{f.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {item.notes && (
          <motion.div variants={fadeUp} className={`rounded-xl p-3 ${t.glassSoft}`}>
            <div className={`text-xs ${TYPE_WEIGHT.medium} ${t.textFaint} mb-1`}>Notes</div>
            <AnimatedText as="p" trigger="mount" text={item.notes} className={`text-sm ${t.textMuted}`} />
          </motion.div>
        )}
      </motion.div>
      <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
        <button type="button" onClick={onClose}
          className={`flex-1 py-2 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>
          Close
        </button>
        <motion.button type="button" onClick={() => { onEdit(item); onClose(); }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className={`flex-1 py-2 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white transition-all bg-gradient-to-br ${ACCENT.blue.gradient} ${ACCENT.blue.solidGlow} ${ACCENT.blue.glow}`}>
          <Pencil className="h-4 w-4 inline mr-2" />Edit Record
        </motion.button>
      </div>
    </CenterModal>
  );
}

// ─── ISSUE FORM MODAL ─────────────────────────────────────────────────────────

interface IssueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormState) => Promise<void>;
  initialData: PPERecord | null;
  employee: EmployeeWithPPE | null;
  allEmployees: EmployeeRow[];
  matrix: Record<string, number>;
}

const blankForm = (): FormState => ({
  employee_name: '', employee_id: '', position: '',
  ppe_type: 'helmet', item_name: '', size: '',
  issue_date: todayLocal(),
  expiry_date: '', condition: 'good', status: 'active',
  notes: '', issued_by: '', location: 'Workshop', mine_section: '',
});

// `FormField`/`FormActions` now come from the shared design-system (promoted from
// this page's own local versions — see the design-system migration plan).

function PPEIssueForm({ isOpen, onClose, onSubmit, initialData, employee, allEmployees, matrix }: IssueFormProps) {
  const t = useTheme();
  const confirm = useConfirm();
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  // Auto-calc expiry from issue date + the matrix interval, unless the user has typed
  // an expiry themselves THIS session. Editing an existing record starts untouched too
  // (not "touched because it already has a stored expiry") — so correcting an issue
  // date, or fixing stale data from an old matrix interval, recalculates expiry the
  // same way a brand-new entry does, instead of freezing at whatever was last saved.
  const [expiryTouched, setExpiryTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExpiryTouched(false);
      setForm({
        ...blankForm(),
        employee_name: employee?.employee_name || initialData?.employee_name || '',
        employee_id:   employee?.employee_id   || initialData?.employee_id   || '',
        position:      employee?.position      || initialData?.position      || '',
        ppe_type:      initialData?.ppe_type      || 'helmet',
        item_name:     initialData?.item_name     || '',
        size:          initialData?.size          || '',
        issue_date:    initialData?.issue_date    || todayLocal(),
        expiry_date:   initialData?.expiry_date   || '',
        condition:     initialData?.condition     || 'good',
        status:        initialData?.status        || 'active',
        notes:         initialData?.notes         || '',
        issued_by:     initialData?.issued_by     || '',
        location:      initialData?.location      || 'Workshop',
        mine_section:  initialData?.mine_section  || '',
      });
    }
  }, [isOpen, initialData, employee]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  // Recompute expiry when type/issue-date change (matrix-driven), unless the user set it.
  useEffect(() => {
    if (expiryTouched || !form.issue_date) return;
    const months = matrix[form.ppe_type];
    if (months === undefined) return; // no matrix entry for this type — leave expiry alone
    // 0 months = no expiry (e.g. gloves) — clears any stale value from a prior interval.
    const calc = months > 0 ? addMonths(form.issue_date, months) : '';
    if (calc !== form.expiry_date) setForm(p => ({ ...p, expiry_date: calc }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ppe_type, form.issue_date, expiryTouched, matrix]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id.trim()) { toast.error('Employee ID is required'); return; }
    if (!form.employee_name.trim()) { toast.error('Employee name is required'); return; }
    if (!form.position.trim()) { toast.error('Position is required'); return; }
    if (!form.item_name.trim()) { toast.error('Item name is required'); return; }
    // Employee ID can be typed freely rather than picked from the autocomplete — that's
    // how a mismatched/placeholder ID ends up saved even though the name shown alongside
    // it is correct (the name field syncs its own ID independently on select). Catch it
    // here rather than silently saving something that doesn't match the real register.
    const idKnown = allEmployees.some(e => e.employee_id === form.employee_id.trim());
    if (!idKnown) {
      const proceed = await confirm({
        title: 'Employee ID not found',
        message: `"${form.employee_id.trim()}" doesn't match anyone currently in the Employees register. Save anyway?`,
      });
      if (!proceed) return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, employee_id: form.employee_id.trim(), employee_name: form.employee_name.trim() });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const sel = (k: keyof FormState) => ({
    value: form[k] as string,
    onChange: (v: string) => set(k, v as any),
    size: 'form' as const,
  });

  const inputCls = `${t.inputBg} rounded-lg text-sm px-3 py-2 w-full transition-all focus:outline-none`;

  return (
    <CenterModal open={isOpen} onClose={onClose} accent="violet"
      title={initialData ? 'Edit PPE Record' : 'Issue New PPE'} width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Employee lookup */}
          <div className={`rounded-xl ${t.glassSoft} p-4 space-y-3`}>
            <p className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textFaint} uppercase tracking-wider`}>Employee</p>
            <FormField label="Employee ID" required>
              <EmployeeAutocomplete value={form.employee_id} options={allEmployees}
                placeholder="Type employee ID or name to search…"
                onChange={v => set('employee_id', v)}
                onSelect={opt => {
                  set('employee_id', opt.employee_id);
                  set('employee_name', opt.employee_name);
                  set('position', opt.position);
                  if (opt.department) set('mine_section', opt.section || '');
                }} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Full Name" required>
                <EmployeeAutocomplete value={form.employee_name} options={allEmployees} display="name"
                  placeholder="Type a name to search…"
                  onChange={v => set('employee_name', v)}
                  onSelect={opt => {
                    set('employee_id', opt.employee_id);
                    set('employee_name', opt.employee_name);
                    set('position', opt.position);
                    if (opt.department) set('mine_section', opt.section || '');
                  }} />
              </FormField>
              <FormField label="Position" required>
                <AutofillInput field="position" value={form.position} onChange={v => set('position', v)}
                  className={inputCls} placeholder="Job title" />
              </FormField>
            </div>
          </div>

          {/* PPE details */}
          <div className={`rounded-xl ${t.glassSoft} p-4 space-y-3`}>
            <p className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textFaint} uppercase tracking-wider`}>PPE Details</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="PPE Type" required>
                <SelectField title="PPE Type" {...sel('ppe_type')}
                  options={Object.entries(PPE_TYPES).map(([k, pt]) => ({ value: k, label: pt.name }))} />
              </FormField>
              <FormField label="Item Name / Brand" required>
                <AutofillInput field="ppe_item_name" value={form.item_name} onChange={v => set('item_name', v)}
                  className={inputCls} placeholder="e.g. MSA V-Gard Helmet" />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Size">
                <AutofillInput field="ppe_size" value={form.size} onChange={v => set('size', v)}
                  className={inputCls} placeholder="L, XL, 42…" />
              </FormField>
              <FormField label="Condition">
                <SelectField title="Condition" {...sel('condition')}
                  options={Object.entries(CONDITION_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
              </FormField>
              <FormField label="Status">
                <SelectField title="Status" {...sel('status')}
                  options={Object.entries(STATUS_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
              </FormField>
            </div>
          </div>

          {/* Dates & location */}
          <div className={`rounded-xl ${t.glassSoft} p-4 space-y-3`}>
            <p className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textFaint} uppercase tracking-wider`}>Dates & Location</p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Issue Date" required>
                <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                  title="Issue date" aria-label="Issue Date" className={inputCls} style={{ colorScheme: t.light ? 'light' : 'dark' }} />
              </FormField>
              <FormField label={expiryTouched ? 'Expiry Date' : matrix[form.ppe_type] === 0 ? 'Expiry Date · no expiry' : `Expiry Date · auto (${matrix[form.ppe_type] || '—'}mo)`}>
                <input type="date" value={form.expiry_date}
                  onChange={e => { setExpiryTouched(true); set('expiry_date', e.target.value); }}
                  title="Expiry date — auto-calculated from the matrix; edit to override" aria-label="Expiry Date" className={inputCls} style={{ colorScheme: t.light ? 'light' : 'dark' }} />
              </FormField>
              <FormField label="Location">
                <ListAutocomplete listName="location" value={form.location} onChange={v => set('location', v as any)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mine Section">
                <input type="text" value={form.mine_section} onChange={e => set('mine_section', e.target.value)}
                  aria-label="Mine Section" className={inputCls} placeholder="Optional section" />
              </FormField>
              <FormField label="Issued By">
                <IssuedByInput value={form.issued_by} onChange={v => set('issued_by', v)} employees={allEmployees} />
              </FormField>
            </div>
          </div>

          <FormField label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              aria-label="Notes" rows={2} className={`${inputCls} resize-none`} placeholder="Any additional notes…" />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitting={saving}
          submitLabel={initialData ? 'Update Record' : 'Issue PPE'} />
      </form>
    </CenterModal>
  );
}

// ─── DUE ITEMS TABLE ──────────────────────────────────────────────────────────

interface DueItemsProps {
  employees: EmployeeWithPPE[];
  filterType: 'due' | 'soon-to-due';
  onEditItem: (r: PPERecord) => void;
  onDeleteItem: (id: string) => void;
  onViewItem: (r: PPERecord) => void;
  onToggleNotRequired: (r: PPERecord) => void;
  onBulkMarkNotRequired: (ids: string[]) => void;
}

function DueItemsList({ employees, filterType, onEditItem, onDeleteItem, onViewItem, onToggleNotRequired, onBulkMarkNotRequired }: DueItemsProps) {
  const t = useTheme();
  const [typeFilter, setTypeFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [search, setSearch] = useState('');
  // Bulk triage for the Overdue tab specifically — with many items flagged by the
  // replacement-interval matrix but not actually needing reorder, marking each one
  // "not required" individually isn't practical. Same checkbox-multi-select pattern as
  // the Overtime/Leaves bulk-approve toolbars elsewhere in this app.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  type DueItem = PPERecord & { employee_name: string; employee_id: string };

  // Filtered by status/type/search but NOT by size yet — this is what the size dropdown
  // and the reorder-by-size quick stats below are both built from, so switching type
  // never leaves a size selected that no longer applies, and the counts always answer
  // "of the items I'm currently looking at, how many per size."
  const typeFilteredItems = useMemo<DueItem[]>(() => {
    const out: DueItem[] = [];
    employees.forEach(emp => {
      emp.records.forEach(rec => {
        if (filterType === 'soon-to-due' && !(isExpiringSoon(rec.expiry_date) && rec.status === 'active')) return;
        if (filterType === 'due'         && !(isExpired(rec.expiry_date)      && rec.status === 'active')) return;
        if (typeFilter !== 'all' && rec.ppe_type !== typeFilter) return;
        if (search) {
          const q = search.toLowerCase();
          if (!emp.employee_name?.toLowerCase().includes(q) && !rec.item_name?.toLowerCase().includes(q)) return;
        }
        out.push({ ...rec, employee_name: emp.employee_name, employee_id: emp.employee_id });
      });
    });
    return out;
  }, [employees, filterType, typeFilter, search]);

  // Reorder-by-size quick stats: how many of each size are due/expiring right now among
  // the currently type-filtered items — e.g. select "Boots" and this directly answers
  // "how many size 8 do we need to order." Sorted by count so the biggest reorder need
  // surfaces first.
  const sizeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    typeFilteredItems.forEach(item => {
      const size = (item.size || '').trim() || 'Unspecified';
      counts.set(size, (counts.get(size) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [typeFilteredItems]);

  const items = useMemo(() => {
    return typeFilteredItems
      .filter(item => sizeFilter === 'all' || ((item.size || '').trim() || 'Unspecified') === sizeFilter)
      .sort((a, b) => new Date(a.expiry_date ?? 0).getTime() - new Date(b.expiry_date ?? 0).getTime());
  }, [typeFilteredItems, sizeFilter]);

  // A size that no longer appears for the newly selected type (or status tab) would
  // otherwise silently filter the list to empty — reset it whenever the set of
  // available sizes changes out from under it.
  useEffect(() => {
    if (sizeFilter !== 'all' && !sizeCounts.some(([size]) => size === sizeFilter)) setSizeFilter('all');
  }, [sizeCounts, sizeFilter]);

  useEffect(() => { setSelectedIds(new Set()); }, [filterType]);
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = items.length > 0 && items.every(i => selectedIds.has(String(i.id)));
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map(i => String(i.id))));
  const handleBulkMarkNotRequired = () => { onBulkMarkNotRequired([...selectedIds]); setSelectedIds(new Set()); };

  if (items.length === 0 && !search && typeFilter === 'all' && sizeFilter === 'all') {
    return (
      <div className={`text-center py-12 ${t.glassSoft} rounded-xl`}>
        <CheckCircle2 className={`h-12 w-12 mx-auto mb-3 ${t.light ? 'text-emerald-600/60' : 'text-emerald-400/60'}`} />
        <p className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>No {filterType === 'due' ? 'overdue' : 'expiring soon'} items</p>
        <p className={`text-sm ${t.textFaint} mt-1`}>All PPE is up to date</p>
      </div>
    );
  }

  const accentClasses = filterType === 'due'
    ? { chip: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-600 dark:text-rose-400' }
    : { chip: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-56">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
          <input type="text" placeholder="Search employee or item…" aria-label="Search employee or item" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-7 pr-3 py-1.5 w-full text-xs rounded-lg ${t.inputBg} transition-all`} />
        </div>
        <SelectField size="filter" value={typeFilter} onChange={setTypeFilter} title="PPE Type filter"
          options={[{ value: 'all', label: 'All Types' }, ...Object.entries(PPE_TYPES).map(([k, pt]) => ({ value: k, label: pt.name }))]} />
        <SelectField size="filter" value={sizeFilter} onChange={setSizeFilter} title="Size filter"
          options={[{ value: 'all', label: 'All Sizes' }, ...sizeCounts.map(([size]) => ({ value: size, label: size }))]} />
        {filterType === 'due' && items.length > 0 && (
          <label htmlFor="ppe-due-select-all" className={`flex items-center gap-1.5 text-xs ${t.textFaint} cursor-pointer ml-auto`}>
            <input id="ppe-due-select-all" type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all" className="rounded" /> Select all
          </label>
        )}
      </div>
      {/* Reorder-by-size quick stats — how many of each size are due/expiring among the
          currently type-filtered items, e.g. select "Boots" to see "8 × 5, 9 × 3…" at a
          glance. Doubles as a size-filter shortcut: click a chip to filter to just that
          size, click again (or "All Sizes" above) to clear it. */}
      {sizeCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] ${TYPE_WEIGHT.medium} ${t.textFaint} shrink-0`}>Reorder by size:</span>
          {sizeCounts.map(([size, count]) => (
            <button key={size} type="button"
              onClick={() => setSizeFilter(prev => prev === size ? 'all' : size)}
              title={`${count} ${filterType === 'due' ? 'overdue' : 'expiring soon'} — size ${size}`}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${TYPE_WEIGHT.medium} transition-all ${
                sizeFilter === size ? `${accentClasses.chip} ${accentClasses.text}` : `${t.glassSoft} ${t.textMuted} ${t.hoverBg} ${t.hoverText} border-transparent`
              }`}>
              {size}
              <span className={`px-1 py-0.5 rounded text-[10px] ${TYPE_WEIGHT.bold} ${sizeFilter === size ? 'bg-white/20' : t.chipBg} ${sizeFilter === size ? '' : t.textFaint}`}>{count}</span>
            </button>
          ))}
        </div>
      )}
      {filterType === 'due' && selectedIds.size > 0 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${t.chipBg}`}>
          <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{selectedIds.size} selected</span>
          <button type="button" onClick={handleBulkMarkNotRequired}
            className={`ml-auto text-[11px] ${TYPE_WEIGHT.semibold} px-2.5 py-1 rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
            Mark {selectedIds.size} as not required
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className={`text-[11px] ${t.textFaint} ${t.hoverText} transition-colors`}>Clear</button>
        </div>
      )}
      {items.length === 0 ? (
        <div className={`text-center py-8 ${t.textFaint} text-sm rounded-xl ${t.glassSoft}`}>No items match the current filters</div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {items.map(item => {
            const ppeType = PPE_TYPES[item.ppe_type] || PPE_TYPES.helmet;
            const Icon = ppeType.icon;
            const glowColor = filterType === 'due' ? '#f43f5e' : '#f59e0b';
            return (
              <motion.div key={item.id} variants={fadeUp}>
                <GlowCard color={glowColor} onClick={() => onViewItem(item)} className="p-3.5 flex items-center gap-3">
                  {filterType === 'due' && (
                    <input type="checkbox" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelect(String(item.id))}
                      onClick={e => e.stopPropagation()} aria-label={`Select ${item.employee_name}'s ${item.item_name}`} className="rounded shrink-0" />
                  )}
                  <div className={`p-2 rounded-lg shrink-0 ${t.chipBg}`}><Icon className="h-4 w-4" style={{ color: ppeType.color }} /></div>

                  <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 items-center">
                    <div className="min-w-0">
                      <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary} truncate`}>{item.employee_name}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{item.employee_id}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${t.textSecondary} ${TYPE_WEIGHT.medium} truncate`}>{item.item_name}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{ppeType.name}{item.size ? ` · ${item.size}` : ''}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] ${t.textFaint} uppercase tracking-wide`}>Expires</p>
                      <p className={`text-sm ${TYPE_WEIGHT.semibold}`} style={{ color: glowColor }}>{fmtDate(item.expiry_date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge color={CONDITION_COLORS[item.condition] || '#86BBD8'} label={CONDITION_LABELS[item.condition] || item.condition} />
                      <StatusBadge color={STATUS_COLORS_PPE[item.status] || '#86BBD8'} label={STATUS_LABELS[item.status] || item.status} dot />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {filterType === 'due' && (
                      <button type="button" title="Mark as not required" onClick={e => { e.stopPropagation(); onToggleNotRequired(item); }}
                        className={`h-7 px-2 flex items-center justify-center rounded-lg text-[11px] ${TYPE_WEIGHT.medium} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                        Not required
                      </button>
                    )}
                    <button type="button" title="Edit" onClick={e => { e.stopPropagation(); onEditItem(item); }}
                      className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-brand-500 transition-all`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Delete" onClick={e => { e.stopPropagation(); onDeleteItem(item.id); }}
                      className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── PPE MATRIX MODAL ─────────────────────────────────────────────────────────
// The company replacement matrix: months-until-expiry per item type. Editing an interval
// saves it (shared); "Recalculate" resets every active item of that type to
// issue_date + interval, so you never edit cards one by one.

function PPEMatrixModal({ isOpen, onClose, matrix, records, onSetInterval, onRecalculate, onRecalculateAll }: {
  isOpen: boolean;
  onClose: () => void;
  matrix: Record<string, number>;
  records: PPERecord[];
  onSetInterval: (ppeType: string, months: number) => void;
  onRecalculate: (ppeType: string) => void;
  onRecalculateAll: () => void;
}) {
  const t = useTheme();
  return (
    <CenterModal open={isOpen} onClose={onClose} title="PPE Replacement Matrix"
      subtitle="Set how long each item lasts — saving an interval recalculates every existing item of that type" accent="violet" width="max-w-2xl">
      <div className="px-5 pt-3 flex justify-end">
        <button type="button" onClick={onRecalculateAll}
          title="Recalculate expiry for every active record of every type against the current matrix — fixes anything left stale by a past interval change"
          className={`h-8 px-3 rounded-lg text-[12px] ${TYPE_WEIGHT.medium} ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} transition-colors`}>
          Recalculate all types
        </button>
      </div>
      <div className="px-5 py-3 space-y-1.5 max-h-[65vh] overflow-y-auto">
        {Object.entries(PPE_TYPES).map(([key, info]) => {
          const Icon = info.icon;
          const activeCount = records.filter(r => r.ppe_type === key && r.status === 'active').length;
          const months = matrix[key] ?? 0;
          return (
            <div key={key} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${t.hoverBgSoft}`}>
              <div className={`p-1.5 rounded-lg ${t.chipBg} shrink-0`}><Icon className="h-4 w-4" style={{ color: info.color }} /></div>
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] ${TYPE_WEIGHT.medium} ${t.textPrimary} truncate`}>{info.name}</div>
                <div className={`text-[11px] ${t.textFaint}`}>{activeCount} active item{activeCount === 1 ? '' : 's'}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min={0} max={120} value={months}
                  onChange={e => onSetInterval(key, Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                  title={`${info.name} — months until expiry (0 = no expiry)`}
                  aria-label={`${info.name} — months until expiry`}
                  className={`w-16 h-8 px-2 rounded-lg text-sm text-center ${t.inputBg} focus:outline-none`} />
                <span className={`text-[11px] ${t.textFaint} w-16`}>{months === 0 ? 'no expiry' : 'mo'}</span>
                <button type="button" onClick={() => onRecalculate(key)} disabled={activeCount === 0}
                  className={`h-8 px-2.5 rounded-lg text-[12px] ${TYPE_WEIGHT.medium} transition-colors ${activeCount === 0 ? `${t.chipBg} ${t.textFaint} opacity-50` : `${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText}`}`}>
                  Recalculate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </CenterModal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PPEManagement() {
  const t = useTheme();
  const confirm = useConfirm();
  // records/apiEmployees/stats/loading/refreshing/matrix + the load cycle now live in
  // usePPEData (./usePPEData) — `refresh` is aliased back to `load` since every call
  // site below already calls load()/load(true).
  const { records, setRecords, apiEmployees, stats, statsError, recordsError, loading, refreshing, matrix, setMatrix, refresh: load } = usePPEData();

  // UI state
  const [showForm,      setShowForm]      = useState(false);
  const [showMatrix,    setShowMatrix]    = useState(false);
  const [editData,      setEditData]      = useState<PPERecord | null>(null);
  const [selEmployee,   setSelEmployee]   = useState<EmployeeWithPPE | null>(null);
  const [detailItem,    setDetailItem]    = useState<PPERecord | null>(null);
  const [showDetail,    setShowDetail]    = useState(false);
  // Master collapse — all page sections. Read sections.expanded[key] / sections.toggle(key).
  const sections = useCollapseSection({ heroStats: false, typeBreakdown: false, sizeBreakdown: false, records: false });
  const [filterType,    setFilterType]    = useState<'all' | 'active' | 'soon-to-due' | 'due'>('all');
  const [searchTerm,    setSearchTerm]    = useState('');
  // All employee cards start collapsed (empty object = all false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Data loading (records/stats/employees fetch + matrix load) now happens inside
  // usePPEData — see the destructure above.

  // ── Derived data ───────────────────────────────────────────────────────────

  const ppeEmployees = useMemo(() => {
    const map = new Map<string, EmployeeRow>();
    records.forEach(r => {
      if (!map.has(r.employee_id))
        map.set(r.employee_id, { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, department: r.department || '', section: r.mine_section || '' });
    });
    return Array.from(map.values());
  }, [records]);

  const allEmployeesForForm = useMemo(() => {
    const map = new Map<string, EmployeeRow>();
    apiEmployees.forEach(e => map.set(e.employee_id, e));
    ppeEmployees.forEach(e => { if (!map.has(e.employee_id)) map.set(e.employee_id, e); });
    return Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  }, [apiEmployees, ppeEmployees]);

  const employeesWithPPE = useMemo<EmployeeWithPPE[]>(() => {
    // Prefer the live personnel register (apiEmployees) for name/position so editing
    // someone in Personnel is reflected on their PPE card; fall back to the value stored
    // on the PPE record when the employee isn't (yet) in the register.
    const live = new Map(apiEmployees.map(e => [e.employee_id, e]));
    const map = new Map<string, EmployeeWithPPE>();
    records.forEach(r => {
      if (!map.has(r.employee_id)) {
        const emp = live.get(r.employee_id);
        map.set(r.employee_id, {
          employee_id: r.employee_id,
          employee_name: emp?.employee_name || r.employee_name,
          position: emp?.position || r.position,
          records: [],
        });
      }
      map.get(r.employee_id)!.records.push(r);
    });
    return Array.from(map.values());
  }, [records, apiEmployees]);

  const filteredEmployees = useMemo(() => {
    let list = employeesWithPPE;
    if (filterType === 'active')     list = list.filter(e => e.records.some(r => r.status === 'active'));
    if (filterType === 'soon-to-due') list = list.filter(e => e.records.some(r => isExpiringSoon(r.expiry_date) && r.status === 'active'));
    if (filterType === 'due')         list = list.filter(e => e.records.some(r => isExpired(r.expiry_date) && r.status === 'active'));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.employee_name?.toLowerCase().includes(t) ||
        e.employee_id?.toLowerCase().includes(t) ||
        e.position?.toLowerCase().includes(t));
    }
    return list;
  }, [employeesWithPPE, filterType, searchTerm]);

  const enhancedStats = useMemo<EnhancedStats | null>(() => {
    if (!stats) return null;
    const activeRecords        = records.filter(r => r.status === 'active').length;
    const expiringSoon         = records.filter(r => isExpiringSoon(r.expiry_date) && r.status === 'active').length;
    const expiredCount         = records.filter(r => isExpired(r.expiry_date) && r.status === 'active').length;
    const employeesWithExpiring = employeesWithPPE.filter(e => e.records.some(r => isExpiringSoon(r.expiry_date) && r.status === 'active')).length;
    const employeesWithExpired  = employeesWithPPE.filter(e => e.records.some(r => isExpired(r.expiry_date) && r.status === 'active')).length;
    return { ...stats, activeRecords, expiringSoon, expired: expiredCount, employeesWithExpiring, employeesWithExpired };
  }, [stats, records, employeesWithPPE]);

  const complianceRate = useMemo(() => computeComplianceRate(records), [records]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.filter(r => r.status === 'active').forEach(r => { counts[r.ppe_type] = (counts[r.ppe_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // Order breakdown: active items grouped by PPE type → size, with a count in use and a
  // "to reorder" count (past expiry, i.e. needs replacing). Lets a purchaser see e.g.
  // "Helmet · L × 12 (3 to reorder)" at a glance. Returns [type, [size, {inUse, reorder}][]][].
  const sizeBreakdown = useMemo(() => computeSizeBreakdown(records), [records]);

  // ── Expand / collapse ─────────────────────────────────────────────────────

  const toggle    = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const expandAll = () => setExpanded(Object.fromEntries(filteredEmployees.map(e => [e.employee_id, true])));
  const collapseAll = () => setExpanded({});
  const anyExpanded = filteredEmployees.some(e => expanded[e.employee_id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openIssueForm = (emp?: EmployeeWithPPE) => {
    setSelEmployee(emp ?? null);
    setEditData(null);
    setShowForm(true);
  };

  const handleSubmit = async (formData: FormState) => {
    if (editData) { await updatePPERecord(editData.id, formData); toast.success('PPE record updated'); }
    else          { await createPPERecord(formData);               toast.success('PPE issued successfully'); }
    setShowForm(false); setEditData(null); setSelEmployee(null);
    load(true);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Delete this PPE record?', message: 'This cannot be undone.', destructive: true })) return;
    try { await deletePPERecord(id); setRecords(p => p.filter(r => r.id !== id)); toast.success('Record deleted'); }
    catch (err: any) { toast.error(`Delete failed: ${err.message}`); }
  };

  // Mark an item "not required" (or back to active). Sends status only — the backend
  // PATCH is exclude_unset so no other field is touched. Not-required items drop out of
  // the Overdue/Expiring counts (which only tally status === 'active'). Reversible.
  const handleToggleNotRequired = async (r: PPERecord) => {
    const next = r.status === 'not_required' ? 'active' : 'not_required';
    try {
      await api.patch(`/api/ppe/${r.id}`, { status: next });
      toast.success(next === 'not_required' ? 'Marked as not required' : 'Marked as active');
      load(true);
    } catch (err: any) { toast.error(`Update failed: ${err.message}`); }
  };

  // Same as above, applied to a whole batch from the Overdue tab's checkbox selection —
  // for triaging the false positives (items past their matrix interval that don't
  // actually need reordering) without clicking through them one at a time.
  const handleBulkMarkNotRequired = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map(id => api.patch(`/api/ppe/${id}`, { status: 'not_required' })));
    const okCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;
    if (okCount > 0) toast.success(`Marked ${okCount} item${okCount !== 1 ? 's' : ''} as not required`);
    if (failCount > 0) toast.warning(`${failCount} failed to update`);
    load(true);
  };

  // Matrix: save an interval (shared) — the backend now also recalculates expiry for
  // every existing active record of that type as part of the same save, so stored data
  // never drifts from the matrix (no separate "apply" step required).
  const handleSetInterval = async (ppeType: string, months: number) => {
    setMatrix(m => ({ ...m, [ppeType]: months }));   // optimistic
    try {
      const res = await api.put<{ updated: number }>('/api/ppe/matrix', { ppe_type: ppeType, interval_months: months });
      if (res?.updated) { toast.success(`Interval saved — recalculated ${res.updated} existing item(s)`); load(true); }
    } catch { toast.error('Interval not saved — the ppe_matrix table may not exist yet (see migration).'); }
  };
  const handleRecalculate = async (ppeType: string) => {
    const label = PPE_TYPES[ppeType]?.name || ppeType;
    const count = records.filter(r => r.ppe_type === ppeType && r.status === 'active').length;
    const months = matrix[ppeType];
    const what = months === 0
      ? `Clear the expiry date on ${count} active ${label} item(s)? (no expiry)`
      : `Reset expiry for ${count} active ${label} item(s) to issue date + ${months} months?`;
    if (!await confirm({ title: what, message: 'This overwrites their current expiry dates.', destructive: true })) return;
    try {
      const res = await api.post<{ updated: number }>(`/api/ppe/matrix/${ppeType}/apply`, {});
      toast.success(`Recalculated ${res?.updated ?? count} ${label} item(s)`);
      load(true);
    } catch { toast.error('Recalculate failed — needs manager access (and the ppe_matrix table).'); }
  };
  const handleRecalculateAll = async () => {
    const activeCount = records.filter(r => r.status === 'active').length;
    if (!await confirm({ title: `Recalculate expiry for all ${activeCount} active PPE item(s)?`, message: 'Uses the current matrix across every type — this overwrites their current expiry dates.', destructive: true })) return;
    try {
      const res = await api.post<{ total_updated: number; failed?: string[] }>('/api/ppe/matrix/apply-all', {});
      toast.success(`Recalculated ${res?.total_updated ?? 0} item(s) across all types`);
      if (res?.failed && res.failed.length > 0) {
        toast.error(`Failed to recalculate: ${res.failed.map(t => PPE_TYPES[t]?.shortName || t).join(', ')}`);
      }
      load(true);
    } catch { toast.error('Recalculate failed — needs manager access.'); }
  };

  const compColor = complianceRate == null ? ACCENT_HEX.blue : complianceRate >= 80 ? '#10b981' : complianceRate >= 60 ? ACCENT_HEX.blue : '#f43f5e';

  const fmtExportDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // Expiry cell color depends on the raw expiry_date, not the formatted
  // display string, so it's computed from the row, not the column value.
  const ppeExpiryColor = (_v: string, row: Record<string, unknown>) => {
    const expiry = row.expiry_date as string | null | undefined;
    if (!expiry) return undefined;
    if (isExpired(expiry)) return 'F43F5E';
    if (isExpiringSoon(expiry)) return 'F59E0B';
    return undefined;
  };

  // ── PPE Summary ── a minimal, publicly-postable snapshot (name / item / size /
  // last issue / next issue), meant to be printed and pinned on a noticeboard so
  // people can check their own status instead of asking. Separate from the full
  // PPE Register export above (every field, every status) — this one is active
  // issues only (a returned/lost/damaged item has no live "next issue" date to
  // show) and colors every row, not just the ones that need attention, so it
  // reads at a glance: red = already due, amber = due soon, green = fine.
  const summaryRecords = records
    .filter(r => r.status === 'active')
    .slice()
    .sort((a, b) => {
      const ea = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
      const eb = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
      return ea - eb;
    });

  const ppeSummaryColor = (_v: string, row: Record<string, unknown>) => {
    const expiry = row.expiry_date as string | null | undefined;
    if (!expiry) return '6B7280';
    if (isExpired(expiry)) return 'F43F5E';
    if (isExpiringSoon(expiry)) return 'F59E0B';
    return '10B981';
  };

  const ppeSummaryColumns: DLColumn[] = [
    { key: 'employee_name', label: 'Name', width: 26 },
    { key: 'ppe_type', label: 'PPE Item', width: 22, format: v => PPE_TYPES[v as string]?.name || (v as string) },
    { key: 'size', label: 'Size', width: 10 },
    { key: 'issue_date', label: 'Last Issue Date', width: 18, format: v => fmtExportDate(v as string) },
    { key: 'expiry_date', label: 'Next Issue Date', width: 18, format: v => fmtExportDate(v as string) },
  ];

  // Excel gets every field; the PDF's landscape table omits Location and
  // Mine Section (matches the original hand-rolled exports' divergent
  // column sets). PPE Type also uses a shorter label in the PDF.
  const exportColumns: DLColumn[] = [
    { key: 'employee_name', label: 'Employee Name', width: 26 },
    { key: 'employee_id', label: 'Employee ID', width: 14 },
    { key: 'position', label: 'Position', width: 22 },
    { key: 'ppe_type', label: 'PPE Type', width: 22, format: v => PPE_TYPES[v as string]?.name || (v as string) },
    { key: 'item_name', label: 'Item / Brand', width: 30 },
    { key: 'size', label: 'Size', width: 10 },
    { key: 'issue_date', label: 'Issue Date', width: 14, format: v => fmtExportDate(v as string) },
    { key: 'expiry_date', label: 'Expiry Date', width: 14, format: v => fmtExportDate(v as string) },
    { key: 'condition', label: 'Condition', width: 13, format: v => CONDITION_LABELS[v as string] || (v as string) },
    { key: 'status', label: 'Status', width: 13, format: v => STATUS_LABELS[v as string] || (v as string) },
    { key: 'issued_by', label: 'Issued By', width: 22 },
    { key: 'location', label: 'Location', width: 16 },
    { key: 'mine_section', label: 'Mine Section', width: 16 },
  ];
  const exportPdfColumns: DLColumn[] = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'employee_id', label: 'ID' },
    { key: 'position', label: 'Position' },
    { key: 'ppe_type', label: 'PPE Type', format: v => PPE_TYPES[v as string]?.shortName || (v as string) },
    { key: 'item_name', label: 'Item / Brand' },
    { key: 'size', label: 'Size' },
    { key: 'issue_date', label: 'Issued', format: v => fmtExportDate(v as string) },
    { key: 'expiry_date', label: 'Expires', format: v => fmtExportDate(v as string) },
    { key: 'condition', label: 'Condition', format: v => CONDITION_LABELS[v as string] || (v as string) },
    { key: 'status', label: 'Status', format: v => STATUS_LABELS[v as string] || (v as string) },
    { key: 'issued_by', label: 'Issued By' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}
          style={{ boxShadow: t.light ? '0 8px 30px -14px rgba(15,23,42,0.14)' : undefined }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <PulsingIcon className={`p-2.5 rounded-xl shrink-0 ${ACCENT.blue.chip} border ${t.border}`}>
                <HardHat className={`h-5 w-5 ${ACCENT.blue.icon}`} />
              </PulsingIcon>
              <div className="min-w-0">
                <nav className={`flex items-center gap-1.5 text-xs ${t.textFaint} mb-0.5`}>
                  <span>Home</span><ChevronRight className="h-3 w-3" />
                  <span className={`${t.textMuted} ${TYPE_WEIGHT.medium}`}>PPE Management</span>
                </nav>
                <h1 className={`text-xl ${TYPE_WEIGHT.bold} ${t.textPrimary} font-heading tracking-tight`}>PPE Management</h1>
                <AnimatedText
                  as="p"
                  trigger="mount"
                  text="Personal protective equipment tracking and compliance"
                  className={`text-xs ${t.textFaint} mt-0.5`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={sections.toggleAll} title={sections.allOpen ? 'Collapse all sections' : 'Expand all sections'}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all`}>
                {sections.allOpen ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title={sections.expanded.heroStats ? 'Hide stats' : 'Show stats'} onClick={() => sections.toggle('heroStats')}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all`}>
                {sections.expanded.heroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title="PPE replacement matrix — set expiry intervals & recalculate" onClick={() => setShowMatrix(true)}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl ${TYPE_WEIGHT.semibold} ${t.textMuted} ${t.hoverText} transition-all hover:-translate-y-0.5 ${t.glassSoft} ${t.hoverBg}`}>
                <HardHat className="h-3.5 w-3.5" /> Matrix
              </button>
              <button type="button" title="Refresh" onClick={() => load(true)} disabled={refreshing}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all disabled:opacity-40`}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {records.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${TYPE_WEIGHT.medium} ${t.textFaint} hidden sm:inline`}>Register</span>
                  <DownloadButton
                    data={records as unknown as Record<string, unknown>[]}
                    columns={exportColumns}
                    pdfColumns={exportPdfColumns}
                    filename={exportFilename('PPE_Register')}
                    title="PPE Register"
                    subtitle={`${employeesWithPPE.length} employees`}
                    statusColumn="expiry_date"
                    statusColor={ppeExpiryColor}
                  />
                </div>
              )}

              {summaryRecords.length > 0 && (
                <div className="flex items-center gap-1.5" title="Printable summary — name, item, size, last/next issue date, color-coded by due status">
                  <span className={`text-[10px] ${TYPE_WEIGHT.medium} ${t.textFaint} hidden sm:inline`}>Summary</span>
                  <DownloadButton
                    data={summaryRecords as unknown as Record<string, unknown>[]}
                    columns={ppeSummaryColumns}
                    filename={exportFilename('PPE_Summary')}
                    title="PPE Summary"
                    subtitle="Who has what, and when it's due"
                    statusColumn="expiry_date"
                    statusColor={ppeSummaryColor}
                  />
                </div>
              )}

              {/* Primary "create" CTA uses ACCENT.violet, matching every other page's
                  equivalent button (New Breakdown, Add Employee, New Work Order, ...) —
                  this one was the one outlier still on ACCENT.blue (2026-08-29 UI audit,
                  audit/07-ui-polish-findings.md). */}
              <motion.button type="button" onClick={() => openIssueForm()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg ${TYPE_WEIGHT.semibold} text-white transition-all bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow} ${ACCENT.violet.glow}`}>
                <Plus className="h-3.5 w-3.5" /> Issue PPE
              </motion.button>
            </div>
          </div>

          {sections.expanded.heroStats && enhancedStats && (
            <div className={`border-t ${t.border} px-6 py-3 space-y-3`}>
              {/* KPI chips */}
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-wrap items-center gap-1">
                {([
                  { icon: Users,        color: ACCENT_HEX.blue, val: enhancedStats.unique_employees, label: 'Employees',   filter: 'all' as const },
                  { icon: CheckCircle2, color: '#10b981', val: enhancedStats.activeRecords,    label: 'Active PPE',  filter: 'active' as const },
                  enhancedStats.expiringSoon > 0 && { icon: AlertTriangle, color: '#f59e0b', val: enhancedStats.expiringSoon, label: `Expiring (${enhancedStats.employeesWithExpiring} emp)`, filter: 'soon-to-due' as const },
                  enhancedStats.expired > 0      && { icon: XCircle,       color: '#f43f5e', val: enhancedStats.expired,      label: `Overdue (${enhancedStats.employeesWithExpired} emp)`,  filter: 'due' as const },
                  complianceRate != null && { icon: Award, color: compColor, val: `${complianceRate}%`, label: 'Compliance', filter: null },
                ] as const).filter(Boolean).map((item: any, i: number, arr: any[]) => (
                  <motion.div key={i} variants={fadeUp} className="contents">
                    <StatTile icon={item.icon} color={item.color} value={item.val} label={item.label}
                      onClick={item.filter ? () => setFilterType(item.filter) : undefined} />
                    {i < arr.length - 1 && <span className={`${t.textTertiary} hidden sm:block`}>|</span>}
                  </motion.div>
                ))}
              </motion.div>
              {/* Compliance bar */}
              {complianceRate != null && (
                <ProgressBar value={complianceRate} color={compColor} label="Compliance rate" />
              )}
              {/* PPE type chips */}
              {typeCounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-0.5">
                  {typeCounts.slice(0, 8).map(([type, count]) => {
                    const info = PPE_TYPES[type] || PPE_TYPES.helmet;
                    const Icon = info.icon;
                    return (
                      <span key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${TYPE_WEIGHT.semibold} ${t.chipBg} ${t.textMuted}`}>
                        <Icon className="h-3 w-3" style={{ color: info.color }} />{info.shortName} <span className={t.textPrimary}>{count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {sections.expanded.heroStats && !enhancedStats && statsError && !loading && (
            <div className={`border-t ${t.border} px-6 py-4 flex items-center justify-between gap-3`}>
              <span className={`flex items-center gap-2 text-sm ${accentText('rose', t.light)}`}>
                <AlertTriangle className="h-4 w-4" /> Couldn&apos;t load stats
              </span>
              <button type="button" onClick={() => load(true)} className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textMuted} ${t.hoverText} transition-colors`}>
                Retry
              </button>
            </div>
          )}
        </motion.div>

        {/* ── PPE TYPE BREAKDOWN (collapsed by default) ── */}
        {records.length > 0 && (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <button type="button" onClick={() => sections.toggle('typeBreakdown')}
              className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBgSoft} transition-all`}>
              <div className="flex items-center gap-2">
                <HardHat className="h-3.5 w-3.5 text-brand-500" />
                <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textSecondary} uppercase tracking-wider`}>PPE Type Breakdown</span>
                <span className={`text-[11px] ${t.textFaint} font-normal normal-case tracking-normal`}>
                  {typeCounts.length} types active
                </span>
              </div>
              {sections.expanded.typeBreakdown
                ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} />
                : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
            </button>
            <Collapse open={!!sections.expanded.typeBreakdown}>
              <div className={`px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 border-t ${t.border}`}>
                {Object.entries(PPE_TYPES).map(([key, type]) => {
                  const Icon = type.icon;
                  const active  = records.filter(r => r.ppe_type === key && r.status === 'active').length;
                  if (active === 0) return null;
                  const expiredC = records.filter(r => r.ppe_type === key && r.status === 'active' && isExpired(r.expiry_date)).length;
                  const soonC    = records.filter(r => r.ppe_type === key && r.status === 'active' && isExpiringSoon(r.expiry_date)).length;
                  return (
                    <GlowCard key={key} color={ACCENT_HEX.violet} className="p-4 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${t.chipBg}`}><Icon className="h-3.5 w-3.5" style={{ color: type.color }} /></div>
                        <span className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{type.shortName}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className={t.textFaint}>Active</span><span className={`${TYPE_WEIGHT.bold} text-emerald-500`}>{active}</span></div>
                        {soonC    > 0 && <div className="flex justify-between text-xs"><span className={t.textFaint}>Expiring</span><span className={`${TYPE_WEIGHT.bold} text-amber-500`}>{soonC}</span></div>}
                        {expiredC > 0 && <div className="flex justify-between text-xs"><span className={t.textFaint}>Overdue</span><span className={`${TYPE_WEIGHT.bold} text-rose-500`}>{expiredC}</span></div>}
                        <div className={`h-1 rounded-full ${t.chipBg} overflow-hidden mt-2`}>
                          <div className="h-full bg-emerald-400/70 rounded-full"
                            style={{ width: `${active > 0 ? Math.max(8, Math.round(((active - expiredC) / active) * 100)) : 0}%` }} />
                        </div>
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            </Collapse>
          </div>
        )}

        {/* ── ORDER BREAKDOWN BY SIZE (collapsed by default) ── */}
        {sizeBreakdown.length > 0 && (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <button type="button" onClick={() => sections.toggle('sizeBreakdown')}
              className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBgSoft} transition-all`}>
              <div className="flex items-center gap-2">
                <HardHat className="h-3.5 w-3.5 text-brand-500" />
                <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textSecondary} uppercase tracking-wider`}>Order Breakdown — by size</span>
                <span className={`text-[11px] ${t.textFaint} font-normal normal-case tracking-normal`}>
                  what to reorder, per size
                </span>
              </div>
              {sections.expanded.sizeBreakdown
                ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} />
                : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
            </button>
            <Collapse open={!!sections.expanded.sizeBreakdown}>
              <div className={`px-4 pb-4 pt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border-t ${t.border}`}>
                {sizeBreakdown.map(([type, sizes]) => {
                  const info = PPE_TYPES[type] || PPE_TYPES.helmet;
                  const Icon = info.icon;
                  const reorderTotal = sizes.reduce((s, [, v]) => s + v.reorder, 0);
                  return (
                    <div key={type} className={`rounded-xl ${t.glassSoft} p-3`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg ${t.chipBg}`}><Icon className="h-3.5 w-3.5" style={{ color: info.color }} /></div>
                          <span className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary} truncate`}>{info.shortName}</span>
                        </div>
                        {reorderTotal > 0 && <StatusBadge color="#f43f5e" label={`${reorderTotal} to reorder`} />}
                      </div>
                      <div className={`grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs ${t.textMuted}`}>
                        <span className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Size</span>
                        <span className={`text-[10px] uppercase tracking-wide ${t.textFaint} text-right`}>In use</span>
                        <span className={`text-[10px] uppercase tracking-wide ${t.textFaint} text-right`}>Reorder</span>
                        {sizes.map(([size, v]) => (
                          <Fragment key={size}>
                            <span className={`${TYPE_WEIGHT.medium} ${t.textPrimary} truncate`}>{size}</span>
                            <span className="text-right tabular-nums">{v.inUse}</span>
                            <span className={`text-right tabular-nums ${TYPE_WEIGHT.semibold} ${v.reorder > 0 ? 'text-rose-500' : t.textFaint}`}>{v.reorder || '—'}</span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Collapse>
          </div>
        )}

        {/* ── FILTER + EXPAND/COLLAPSE BAR ── */}
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 justify-between">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'all',         label: 'All Employees', count: employeesWithPPE.length },
                { value: 'active',      label: 'Has Active',    count: employeesWithPPE.filter(e => e.records.some(r => r.status === 'active')).length },
                { value: 'soon-to-due', label: 'Expiring Soon', count: enhancedStats?.employeesWithExpiring ?? 0 },
                { value: 'due',         label: 'Overdue',       count: enhancedStats?.employeesWithExpired  ?? 0 },
              ] as const).map(({ value, label, count }) => (
                <button key={value} type="button" onClick={() => setFilterType(value)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${TYPE_WEIGHT.medium} transition-all ${
                    filterType === value
                      ? `${ACCENT.blue.chip} ${ACCENT.blue.text}`
                      : `${t.glassSoft} ${t.textMuted} ${t.hoverBg} ${t.hoverText}`
                  }`}>
                  {label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${TYPE_WEIGHT.bold} ${filterType === value ? 'bg-white/20' : t.chipBg} ${filterType === value ? '' : t.textFaint}`}>{count}</span>
                </button>
              ))}
            </div>
            {/* Search */}
            {(filterType === 'all' || filterType === 'active') && (
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
                <input type="text" placeholder="Search employee…" aria-label="Search employee" value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`pl-7 pr-8 py-1.5 text-xs w-44 rounded-lg ${t.inputBg} transition-all`} />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textFaint} ${t.hoverText} transition-colors`}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RECORDS ── */}
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          {/* Collapsible header — click title area to toggle panel; Collapse All lives here */}
          <div className="flex items-center gap-2 px-5 py-3">
            <button type="button" onClick={() => sections.toggle('records')}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-90 transition-opacity">
              <FileText className={`h-3.5 w-3.5 ${ACCENT.blue.icon} shrink-0`} />
              <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textSecondary} uppercase tracking-wider`}>Records</span>
              <span className={`text-xs ${t.textFaint} font-normal normal-case tracking-normal`}>
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} · {records.length} items
              </span>
              {sections.expanded.records
                ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint} ml-1`} />
                : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint} ml-1`} />}
            </button>
            {/* Collapse All / Expand All — only visible when the panel is open and cards are shown */}
            {sections.expanded.records && (filterType === 'all' || filterType === 'active') && filteredEmployees.length > 0 && (
              <motion.button type="button" onClick={anyExpanded ? collapseAll : expandAll}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${TYPE_WEIGHT.semibold} transition-all shrink-0 ${anyExpanded ? `${t.glassSoft} ${t.textMuted} ${t.hoverText}` : `text-white bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow}`}`}>
                {anyExpanded ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
                {anyExpanded ? 'Collapse All' : 'Expand All'}
              </motion.button>
            )}
          </div>

          <Collapse open={!!sections.expanded.records}>
            <div className={`border-t ${t.border} p-4`}>
              {loading ? (
                <div className={`flex items-center justify-center py-16 gap-2 ${t.textFaint}`}>
                  <RefreshCw className="h-5 w-5 animate-spin" /> Loading PPE records…
                </div>
              ) : recordsError && records.length === 0 ? (
                // Distinct from the genuinely-empty-table state below: records stays at
                // its [] default on a failed fetch (a Render cold-start timeout, a
                // dropped connection, anything), which used to render the identical
                // "No PPE records yet" copy — indistinguishable from real data loss.
                <div className={`text-center py-16 rounded-xl ${t.glassSoft}`}>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textMuted} mb-1`}>Couldn&apos;t load PPE records</p>
                  <p className={`text-xs ${t.textFaint} mb-4`}>The server may still be starting up — try again in a moment.</p>
                  <motion.button type="button" onClick={() => load()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg ${TYPE_WEIGHT.semibold} text-white transition-all bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow}`}>
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </motion.button>
                </div>
              ) : (filterType === 'soon-to-due' || filterType === 'due') ? (
                <DueItemsList employees={employeesWithPPE} filterType={filterType}
                  onEditItem={r => { setEditData(r); setShowForm(true); }}
                  onDeleteItem={handleDelete}
                  onViewItem={item => { setDetailItem(item); setShowDetail(true); }}
                  onToggleNotRequired={handleToggleNotRequired}
                  onBulkMarkNotRequired={handleBulkMarkNotRequired} />
              ) : filteredEmployees.length === 0 ? (
                <div className={`text-center py-16 rounded-xl ${t.glassSoft}`}>
                  <HardHat className={`h-12 w-12 mx-auto mb-4 ${t.textTertiary}`} />
                  <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textMuted} mb-1`}>
                    {records.length === 0 ? 'No PPE records yet' : 'No employees match your search'}
                  </p>
                  <p className={`text-xs ${t.textFaint}`}>
                    {records.length === 0 ? 'Issue PPE to an employee to get started' : 'Try adjusting the search or filter'}
                  </p>
                  {records.length === 0 && (
                    <motion.button type="button" onClick={() => openIssueForm()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className={`mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg ${TYPE_WEIGHT.semibold} text-white transition-all bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow}`}>
                      <Plus className="h-3.5 w-3.5" /> Issue First PPE
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEmployees.map(emp => (
                    <EmployeePPECard key={emp.employee_id} employee={emp}
                      isExpanded={!!expanded[emp.employee_id]}
                      onToggle={() => toggle(emp.employee_id)}
                      onIssueNew={openIssueForm}
                      onEditItem={r => { setEditData(r); setShowForm(true); }}
                      onDeleteItem={handleDelete}
                      onViewItem={item => { setDetailItem(item); setShowDetail(true); }}
                      onToggleNotRequired={handleToggleNotRequired} />
                  ))}
                  <p className={`text-center text-[11px] ${t.textFaint} pt-1`}>
                    {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} · {records.length} PPE records total
                  </p>
                </div>
              )}
            </div>
          </Collapse>
        </div>
      </main>

      <PPEIssueForm isOpen={showForm}
        onClose={() => { setShowForm(false); setEditData(null); setSelEmployee(null); }}
        onSubmit={handleSubmit} initialData={editData} employee={selEmployee}
        allEmployees={allEmployeesForForm} matrix={matrix} />

      <PPEMatrixModal isOpen={showMatrix} onClose={() => setShowMatrix(false)}
        matrix={matrix} records={records}
        onSetInterval={handleSetInterval} onRecalculate={handleRecalculate} onRecalculateAll={handleRecalculateAll} />

      <PPEDetailModal item={detailItem} isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={item => { setEditData(item); setShowForm(true); }} />
    </AppShell>
  );
}
