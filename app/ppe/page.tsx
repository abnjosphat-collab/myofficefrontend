'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, FileText, Eye,
  Trash2, Pencil, HardHat, AlertTriangle,
  Users, UserRound, Package,
  Award, Layers, ChevronRight,
  Shirt, Wind, CloudRain, Link2, ChevronsUp, ChevronsDown, X,
  Flashlight, Download, FileSpreadsheet, FileDown, Sun, Moon,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  useTheme, Collapse, AnimatedText, PulsingIcon, CenterModal, GlowCard,
  staggerContainer, fadeUp, ACCENT, ACCENT_HEX, type Accent,
  StatusBadge, RecordCard, StatTile, ProgressBar, FormField, FormActions,
  useCollapseSection, SelectField, AutofillInput,
} from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PPETypeInfo {
  name: string; shortName: string; color: string;
  icon: React.ElementType; bgColor: string; textColor: string;
  borderColor: string; description: string;
}

interface PPERecord {
  id: string; employee_id: string; employee_name: string;
  position: string; department: string;
  ppe_type: string; item_name: string; size: string;
  issue_date: string; expiry_date: string | null;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  status: 'active' | 'expired' | 'returned' | 'lost' | 'damaged';
  notes: string; issued_by: string; location: string; mine_section: string;
}

interface EmployeeRow {
  employee_id: string; employee_name: string;
  position: string; department: string; section: string;
}

interface EmployeeWithPPE {
  employee_id: string; employee_name: string;
  position: string; records: PPERecord[];
}

interface PPEStats {
  total: number; active: number; expired: number;
  unique_employees: number; expiring_soon: number;
}

interface EnhancedStats extends PPEStats {
  activeRecords: number; expiringSoon: number;
  employeesWithExpiring: number; employeesWithExpired: number;
}

interface FormState {
  employee_name: string; employee_id: string; position: string;
  ppe_type: string; item_name: string; size: string;
  issue_date: string; expiry_date: string;
  condition: string; status: string; notes: string;
  issued_by: string; location: string; mine_section: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const PPE_TYPES: Record<string, PPETypeInfo> = {
  helmet:        { name: 'Safety Helmet',        shortName: 'Helmet',     color: '#94a3b8', icon: HardHat,    bgColor: 'bg-slate-500/15',   textColor: 'text-slate-300',   borderColor: 'border-slate-400/25',   description: 'Head protection for underground and surface operations' },
  gloves:        { name: 'Safety Gloves',        shortName: 'Gloves',     color: '#f87171', icon: Shield,     bgColor: 'bg-rose-500/15',    textColor: 'text-rose-300',    borderColor: 'border-rose-500/25',    description: 'Hand protection for handling materials and chemicals' },
  glasses:       { name: 'Safety Glasses',       shortName: 'Glasses',    color: '#60a5fa', icon: Eye,        bgColor: 'bg-brand-500/15',    textColor: 'text-brand-300',    borderColor: 'border-brand-500/25',    description: 'Eye protection from dust and debris' },
  vest:          { name: 'High-Vis Vest',         shortName: 'Vest',       color: '#fbbf24', icon: Shirt,      bgColor: 'bg-amber-500/15',   textColor: 'text-amber-300',   borderColor: 'border-amber-500/25',   description: 'High visibility clothing for surface operations' },
  gumboots:      { name: 'Safety Gum Boots',     shortName: 'GumBoots',   color: '#a78bfa', icon: Shield,     bgColor: 'bg-violet-500/15',  textColor: 'text-violet-300',  borderColor: 'border-violet-500/25',  description: 'Steel-toe foot protection' },
  safety_shoes:  { name: 'Safety Shoes',         shortName: 'Shoes',      color: '#38bdf8', icon: Package,    bgColor: 'bg-sky-500/15',     textColor: 'text-sky-300',     borderColor: 'border-sky-500/25',     description: 'Protective footwear for various work environments' },
  harness:       { name: 'Safety Harness',       shortName: 'Harness',    color: '#34d399', icon: Link2,      bgColor: 'bg-emerald-500/15', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/25', description: 'Fall protection for heights and shafts' },
  respirator:    { name: 'Respirator',           shortName: 'Respirator', color: '#2dd4bf', icon: Wind,       bgColor: 'bg-teal-500/15',    textColor: 'text-teal-300',    borderColor: 'border-teal-500/25',    description: 'Respiratory protection from dust and chemicals' },
  Cap_lamp_belt: { name: 'Cap Lamp Belt',        shortName: 'Lamp Belt',  color: '#f472b6', icon: Flashlight, bgColor: 'bg-pink-500/15',    textColor: 'text-pink-300',    borderColor: 'border-pink-500/25',    description: 'Lighting for underground operations' },
  worksuit:      { name: 'Protective Work Suit', shortName: 'Work Suit',  color: '#fb923c', icon: Shirt,      bgColor: 'bg-orange-500/15',  textColor: 'text-orange-300',  borderColor: 'border-orange-500/25',  description: 'Full body protection for various work environments' },
  rainsuit:      { name: 'Rain Suit',            shortName: 'Rain Suit',  color: '#22d3ee', icon: CloudRain,  bgColor: 'bg-cyan-500/15',    textColor: 'text-cyan-300',    borderColor: 'border-cyan-500/25',    description: 'Waterproof protection for wet conditions' },
  overall:       { name: 'Protective Overall',   shortName: 'Overall',    color: '#c084fc', icon: Layers,     bgColor: 'bg-purple-500/15',  textColor: 'text-purple-300',  borderColor: 'border-purple-500/25',  description: 'Full body protective clothing' },
};

const MINE_LOCATIONS = ['Deep Shaft A', 'Deep Shaft B', 'Open Pit', 'Processing Plant', 'Workshop', 'Surface', 'All Areas'];

const CONDITION_COLORS: Record<string, string> = { excellent: '#34d399', good: '#86BBD8', fair: '#f59e0b', poor: '#f97316', damaged: '#f43f5e' };
const CONDITION_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged' };
const STATUS_COLORS_PPE: Record<string, string> = { active: '#34d399', expired: '#f43f5e', returned: '#94a3b8', lost: '#a78bfa', damaged: '#f97316' };
const STATUS_LABELS: Record<string, string> = { active: 'Active', expired: 'Due', returned: 'Returned', lost: 'Lost', damaged: 'Damaged' };

// ─── UTILITIES ────────────────────────────────────────────────────────────────

const fmtDate = (s?: string | null) => (s ? formatDate(s) : 'Not specified');

const isExpiringSoon = (d?: string | null, days = 30) => {
  if (!d) return false;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff <= days && diff > 0;
};
const isExpired = (d?: string | null) => !!d && new Date(d) < new Date();


// ─── API ─────────────────────────────────────────────────────────────────────

const fetchPPERecords  = async () => api.get<PPERecord[]>('/api/ppe');
const fetchPPEStats    = async () => { try { return await api.get<PPEStats>('/api/ppe/stats/summary'); } catch { return null; } };
const fetchAllEmployees = async (): Promise<EmployeeRow[]> => {
  try {
    const data = await api.get<any[]>('/api/employees/');
    return data.map(e => ({
      employee_id: e.employee_id,
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      position: e.designation || '',
      department: e.department || '',
      section: e.section || '',
    }));
  } catch { return []; }
};
const createPPERecord = async (data: Partial<FormState>) => {
  if (!data.employee_id?.trim()) throw new Error('Employee ID is required');
  if (!data.employee_name?.trim()) throw new Error('Employee name is required');
  return api.post('/api/ppe', { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
};
const updatePPERecord = async (id: string, data: Partial<FormState>) =>
  api.patch(`/api/ppe/${id}`, { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
const deletePPERecord = async (id: string) => api.delete(`/api/ppe/${id}`);

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
}

function EmployeeAutocomplete({ value, onChange, options, placeholder, onSelect }: EmployeeAutocompleteProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');

  const filtered = useMemo(() => options.filter(o =>
    o.employee_id?.toLowerCase().includes(q.toLowerCase()) ||
    o.employee_name?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10), [options, q]);

  return (
    <div className="relative">
      <input type="text" value={q} placeholder={placeholder}
        className={`${t.inputBg} rounded-lg text-sm px-3 py-2 w-full transition-all focus:outline-none`}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)} />
      {open && filtered.length > 0 && (
        <ul className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-xl shadow-2xl max-h-56 overflow-y-auto list-none p-0 ${t.glass}`}>
          {filtered.map((opt, i) => (
            <li key={i}>
              <button type="button"
                onMouseDown={e => { e.preventDefault(); setQ(opt.employee_id); onSelect(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs ${t.hoverBg} border-b ${t.border} last:border-0 transition-all`}>
                <div className={`font-semibold ${t.textPrimary}`}>{opt.employee_id}</div>
                <div className={`text-[11px] ${t.textFaint} mt-0.5`}>{opt.employee_name} · {opt.position}</div>
              </button>
            </li>
          ))}
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
                <div className={`font-semibold ${t.textPrimary}`}>{emp.employee_name}</div>
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
}

function PPEItemCard({ record, onEdit, onDelete, onView }: PPEItemCardProps) {
  const t = useTheme();
  const ppeType = PPE_TYPES[record.ppe_type] || PPE_TYPES.helmet;
  const expiring = isExpiringSoon(record.expiry_date);
  const expired  = isExpired(record.expiry_date);
  const glowColor = expired ? '#f43f5e' : expiring ? '#f59e0b' : ACCENT_HEX.blue;

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
            <span className={`font-semibold ${expired ? 'text-rose-500' : expiring ? 'text-amber-500' : t.textMuted}`}>Expires: {fmtDate(record.expiry_date)}</span>
          )}
          {record.size && <span>Size: {record.size}</span>}
        </div>
      }
      actions={<>
        <button onClick={() => onView(record)} type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} ${t.textMuted} ${t.hoverText} text-[12px] font-semibold transition-all`}>
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button onClick={() => onEdit(record)} type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[12px] font-semibold hover:brightness-110 transition-all">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={() => onDelete(record.id)} type="button" className={`px-4 flex items-center justify-center gap-1.5 py-2 rounded-lg ${t.chipBg} text-rose-500 hover:bg-rose-500/10 text-[12px] font-semibold transition-all`}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </>}
    >
      <div className={`text-xs ${glowColor === '#f43f5e' ? 'text-rose-500' : glowColor === '#f59e0b' ? 'text-amber-500' : t.textFaint}`}>
        {expired ? 'Overdue for replacement' : expiring ? 'Expiring soon' : 'In date'}
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
}

function EmployeePPECard({ employee, isExpanded, onToggle, onIssueNew, onEditItem, onDeleteItem, onViewItem }: EmployeePPECardProps) {
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
          className="flex items-center gap-1.5 text-[12px] h-7 px-2.5 rounded-lg font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
          <Plus className="h-3 w-3" /> Issue
        </button>
      }
    >
      {employee.records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employee.records.map(record => (
            <PPEItemCard key={record.id} record={record}
              onEdit={onEditItem} onDelete={onDeleteItem} onView={onViewItem} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-xl ${t.glassSoft}`}>
          <Shield className={`h-9 w-9 mx-auto mb-2 ${t.textTertiary}`} />
          <p className={`text-sm font-medium ${t.textMuted}`}>No PPE items issued yet</p>
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
            <h3 className={`font-semibold ${t.textPrimary} text-base tracking-tight`}>{item.item_name}</h3>
            <AnimatedText as="p" trigger="mount" text={ppeType.description} className={`text-[12.5px] ${t.textSecondary} mt-0.5`} />
          </div>
        </motion.div>

        <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fields.map(f => (
            <motion.div key={f.label} variants={fadeUp} whileHover={{ y: -2 }} className={`rounded-xl p-3 ${t.glassSoft} ${t.shadow} transition-shadow duration-300`}>
              <div className={`text-xs font-medium ${t.textFaint}`}>{f.label}</div>
              <div className={`text-sm font-medium break-words mt-1 ${t.textMuted}`}>{f.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {item.notes && (
          <motion.div variants={fadeUp} className={`rounded-xl p-3 ${t.glassSoft}`}>
            <div className={`text-xs font-medium ${t.textFaint} mb-1`}>Notes</div>
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
          className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-br ${ACCENT.blue.gradient} ${ACCENT.blue.solidGlow} ${ACCENT.blue.glow}`}>
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
}

const blankForm = (): FormState => ({
  employee_name: '', employee_id: '', position: '',
  ppe_type: 'helmet', item_name: '', size: '',
  issue_date: new Date().toISOString().slice(0, 10),
  expiry_date: '', condition: 'good', status: 'active',
  notes: '', issued_by: '', location: 'Workshop', mine_section: '',
});

// `FormField`/`FormActions` now come from the shared design-system (promoted from
// this page's own local versions — see the design-system migration plan).

function PPEIssueForm({ isOpen, onClose, onSubmit, initialData, employee, allEmployees }: IssueFormProps) {
  const t = useTheme();
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...blankForm(),
        employee_name: employee?.employee_name || initialData?.employee_name || '',
        employee_id:   employee?.employee_id   || initialData?.employee_id   || '',
        position:      employee?.position      || initialData?.position      || '',
        ppe_type:      initialData?.ppe_type      || 'helmet',
        item_name:     initialData?.item_name     || '',
        size:          initialData?.size          || '',
        issue_date:    initialData?.issue_date    || new Date().toISOString().slice(0, 10),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id.trim()) { toast.error('Employee ID is required'); return; }
    if (!form.employee_name.trim()) { toast.error('Employee name is required'); return; }
    if (!form.position.trim()) { toast.error('Position is required'); return; }
    if (!form.item_name.trim()) { toast.error('Item name is required'); return; }
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
            <p className={`text-[11px] font-semibold ${t.textFaint} uppercase tracking-wider`}>Employee</p>
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
                <input type="text" value={form.employee_name} onChange={e => set('employee_name', e.target.value)}
                  className={inputCls} placeholder="Auto-filled from ID lookup" />
              </FormField>
              <FormField label="Position" required>
                <AutofillInput field="position" value={form.position} onChange={v => set('position', v)}
                  className={inputCls} placeholder="Job title" />
              </FormField>
            </div>
          </div>

          {/* PPE details */}
          <div className={`rounded-xl ${t.glassSoft} p-4 space-y-3`}>
            <p className={`text-[11px] font-semibold ${t.textFaint} uppercase tracking-wider`}>PPE Details</p>
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
            <p className={`text-[11px] font-semibold ${t.textFaint} uppercase tracking-wider`}>Dates & Location</p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Issue Date" required>
                <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                  title="Issue date" className={inputCls} style={{ colorScheme: t.light ? 'light' : 'dark' }} />
              </FormField>
              <FormField label="Expiry Date">
                <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)}
                  title="Expiry date" className={inputCls} style={{ colorScheme: t.light ? 'light' : 'dark' }} />
              </FormField>
              <FormField label="Location">
                <SelectField title="Location" {...sel('location')}
                  options={MINE_LOCATIONS.map(loc => ({ value: loc, label: loc }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mine Section">
                <input type="text" value={form.mine_section} onChange={e => set('mine_section', e.target.value)}
                  className={inputCls} placeholder="Optional section" />
              </FormField>
              <FormField label="Issued By">
                <IssuedByInput value={form.issued_by} onChange={v => set('issued_by', v)} employees={allEmployees} />
              </FormField>
            </div>
          </div>

          <FormField label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className={`${inputCls} resize-none`} placeholder="Any additional notes…" />
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
}

function DueItemsList({ employees, filterType, onEditItem, onDeleteItem, onViewItem }: DueItemsProps) {
  const t = useTheme();
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const out: (PPERecord & { employee_name: string; employee_id: string })[] = [];
    employees.forEach(emp => {
      emp.records.forEach(rec => {
        if (filterType === 'soon-to-due' && !(isExpiringSoon(rec.expiry_date) && rec.status === 'active')) return;
        if (filterType === 'due'         && !(isExpired(rec.expiry_date)      && rec.status === 'active')) return;
        if (typeFilter !== 'all' && rec.ppe_type !== typeFilter) return;
        if (search) {
          const t = search.toLowerCase();
          if (!emp.employee_name?.toLowerCase().includes(t) && !rec.item_name?.toLowerCase().includes(t)) return;
        }
        out.push({ ...rec, employee_name: emp.employee_name, employee_id: emp.employee_id });
      });
    });
    return out.sort((a, b) => new Date(a.expiry_date ?? 0).getTime() - new Date(b.expiry_date ?? 0).getTime());
  }, [employees, filterType, typeFilter, search]);

  if (items.length === 0 && !search && typeFilter === 'all') {
    return (
      <div className={`text-center py-12 ${t.glassSoft} rounded-xl`}>
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400/60" />
        <p className={`font-semibold ${t.textPrimary}`}>No {filterType === 'due' ? 'overdue' : 'expiring soon'} items</p>
        <p className={`text-sm ${t.textFaint} mt-1`}>All PPE is up to date</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-56">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
          <input type="text" placeholder="Search employee or item…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-7 pr-3 py-1.5 w-full text-xs rounded-lg ${t.inputBg} transition-all`} />
        </div>
        <SelectField size="filter" value={typeFilter} onChange={setTypeFilter} title="PPE Type filter"
          options={[{ value: 'all', label: 'All Types' }, ...Object.entries(PPE_TYPES).map(([k, pt]) => ({ value: k, label: pt.name }))]} />
      </div>
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
                  <div className={`p-2 rounded-lg shrink-0 ${t.chipBg}`}><Icon className="h-4 w-4" style={{ color: ppeType.color }} /></div>

                  <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 items-center">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${t.textPrimary} truncate`}>{item.employee_name}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{item.employee_id}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${t.textSecondary} font-medium truncate`}>{item.item_name}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{ppeType.name}{item.size ? ` · ${item.size}` : ''}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] ${t.textFaint} uppercase tracking-wide`}>Expires</p>
                      <p className="text-sm font-semibold" style={{ color: glowColor }}>{fmtDate(item.expiry_date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge color={CONDITION_COLORS[item.condition] || '#86BBD8'} label={CONDITION_LABELS[item.condition] || item.condition} />
                      <StatusBadge color={STATUS_COLORS_PPE[item.status] || '#86BBD8'} label={STATUS_LABELS[item.status] || item.status} dot />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button type="button" title="Edit" onClick={() => onEditItem(item)}
                      className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-brand-500 transition-all`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Delete" onClick={() => onDeleteItem(item.id)}
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PPEManagement() {
  const t = useTheme();
  const [records,      setRecords]      = useState<PPERecord[]>([]);
  const [apiEmployees, setApiEmployees] = useState<EmployeeRow[]>([]);
  const [stats,        setStats]        = useState<PPEStats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // UI state
  const [showForm,      setShowForm]      = useState(false);
  const [editData,      setEditData]      = useState<PPERecord | null>(null);
  const [selEmployee,   setSelEmployee]   = useState<EmployeeWithPPE | null>(null);
  const [detailItem,    setDetailItem]    = useState<PPERecord | null>(null);
  const [showDetail,    setShowDetail]    = useState(false);
  // Master collapse — all page sections. Read sections.expanded[key] / sections.toggle(key).
  const sections = useCollapseSection({ heroStats: false, typeBreakdown: false, records: false });
  const [filterType,    setFilterType]    = useState<'all' | 'active' | 'soon-to-due' | 'due'>('all');
  const [searchTerm,    setSearchTerm]    = useState('');
  // All employee cards start collapsed (empty object = all false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Data loading ───────────────────────────────────────────────────────────

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [rec, st, emp] = await Promise.all([fetchPPERecords(), fetchPPEStats(), fetchAllEmployees()]);
      setRecords(rec);
      setStats(st);
      if (emp.length > 0) setApiEmployees(emp);
    } catch (err: any) { toast.error(`Failed to load: ${err.message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
    const map = new Map<string, EmployeeWithPPE>();
    records.forEach(r => {
      if (!map.has(r.employee_id))
        map.set(r.employee_id, { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, records: [] });
      map.get(r.employee_id)!.records.push(r);
    });
    return Array.from(map.values());
  }, [records]);

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

  const complianceRate = useMemo(() => {
    const active = records.filter(r => r.status === 'active');
    if (!active.length) return null;
    return Math.round((active.filter(r => !isExpired(r.expiry_date)).length / active.length) * 100);
  }, [records]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.filter(r => r.status === 'active').forEach(r => { counts[r.ppe_type] = (counts[r.ppe_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

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
    if (!confirm('Delete this PPE record? This cannot be undone.')) return;
    try { await deletePPERecord(id); setRecords(p => p.filter(r => r.id !== id)); toast.success('Record deleted'); }
    catch (err: any) { toast.error(`Delete failed: ${err.message}`); }
  };

  const compColor = complianceRate == null ? ACCENT_HEX.blue : complianceRate >= 80 ? '#10b981' : complianceRate >= 60 ? ACCENT_HEX.blue : '#f43f5e';

  const [showDlMenu, setShowDlMenu] = useState(false);

  const downloadExcel = async () => {
    setShowDlMenu(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('PPE Register');
      ws.columns = [
        { header: 'Employee Name', key: 'name',    width: 26 },
        { header: 'Employee ID',   key: 'id',      width: 14 },
        { header: 'Position',      key: 'pos',     width: 22 },
        { header: 'PPE Type',      key: 'type',    width: 22 },
        { header: 'Item / Brand',  key: 'item',    width: 30 },
        { header: 'Size',          key: 'size',    width: 10 },
        { header: 'Issue Date',    key: 'issued',  width: 14 },
        { header: 'Expiry Date',   key: 'expiry',  width: 14 },
        { header: 'Condition',     key: 'cond',    width: 13 },
        { header: 'Status',        key: 'status',  width: 13 },
        { header: 'Issued By',     key: 'issuedby',width: 22 },
        { header: 'Location',      key: 'loc',     width: 16 },
        { header: 'Mine Section',  key: 'section', width: 16 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF86BBD8' } } };
      });
      hdr.height = 18;
      records.forEach((r, i) => {
        const row = ws.addRow({
          name:     r.employee_name,
          id:       r.employee_id,
          pos:      r.position || '',
          type:     PPE_TYPES[r.ppe_type]?.name || r.ppe_type,
          item:     r.item_name,
          size:     r.size || '',
          issued:   r.issue_date  ? new Date(r.issue_date).toLocaleDateString('en-GB')  : '',
          expiry:   r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-GB') : '',
          cond:     CONDITION_LABELS[r.condition]  || r.condition,
          status:   STATUS_LABELS[r.status]        || r.status,
          issuedby: r.issued_by    || '',
          loc:      r.location     || '',
          section:  r.mine_section || '',
        });
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
          });
        }
        // Colour expiry cell red if overdue, amber if soon
        const expCell = row.getCell('expiry');
        if (r.expiry_date) {
          if (isExpired(r.expiry_date))         expCell.font = { color: { argb: 'FFF43F5E' }, bold: true };
          else if (isExpiringSoon(r.expiry_date)) expCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
        }
      });
      ws.autoFilter = { from: 'A1', to: 'M1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `PPE_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${records.length} records`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const downloadPDF = async () => {
    setShowDlMenu(false);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14);
      doc.setTextColor(42, 77, 105);
      doc.text('PPE Register', 14, 14);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${records.length} records  ·  ${employeesWithPPE.length} employees`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['Employee', 'ID', 'Position', 'PPE Type', 'Item / Brand', 'Size', 'Issued', 'Expires', 'Condition', 'Status', 'Issued By']],
        body: records.map(r => [
          r.employee_name,
          r.employee_id,
          r.position || '',
          PPE_TYPES[r.ppe_type]?.shortName || r.ppe_type,
          r.item_name,
          r.size || '',
          r.issue_date  ? new Date(r.issue_date).toLocaleDateString('en-GB')  : '',
          r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-GB') : '',
          CONDITION_LABELS[r.condition] || r.condition,
          STATUS_LABELS[r.status]       || r.status,
          r.issued_by || '',
        ]),
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 7) {
            const val = data.cell.raw as string;
            if (val) {
                if (isExpired(records[data.row.index]?.expiry_date))         data.cell.styles.textColor = [244, 63, 94];
              else if (isExpiringSoon(records[data.row.index]?.expiry_date)) data.cell.styles.textColor = [245, 158, 11];
            }
          }
        },
        styles: { cellPadding: 1.5, overflow: 'linebreak' },
        margin: { left: 10, right: 10 },
      });
      doc.save(`PPE_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${records.length} records`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

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
                  <span className={`${t.textMuted} font-medium`}>PPE Management</span>
                </nav>
                <h1 className={`text-xl font-bold ${t.textPrimary} font-heading tracking-tight`}>PPE Management</h1>
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
              <button type="button" onClick={t.toggle}
                title={t.light ? 'Switch to dark mode' : 'Switch to light mode'}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all`}>
                {t.light ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title={sections.expanded.heroStats ? 'Hide stats' : 'Show stats'} onClick={() => sections.toggle('heroStats')}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all`}>
                {sections.expanded.heroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title="Refresh" onClick={() => load(true)} disabled={refreshing}
                className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} transition-all disabled:opacity-40`}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Download dropdown */}
              <div className="relative">
                <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={records.length === 0}
                  className={`h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold ${t.textMuted} ${t.hoverText} transition-all hover:-translate-y-0.5 ${t.glassSoft} ${t.hoverBg} disabled:opacity-40 disabled:translate-y-0`}>
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                {showDlMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                    <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden w-44 ${t.glass}`}>
                      <button type="button" onClick={downloadExcel}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBg} transition-all border-b ${t.border}`}>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Export Excel (.xlsx)</span>
                      </button>
                      <button type="button" onClick={downloadPDF}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBg} transition-all`}>
                        <FileDown className="h-3.5 w-3.5 text-rose-500" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <motion.button type="button" onClick={() => openIssueForm()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg font-semibold text-white transition-all bg-gradient-to-br ${ACCENT.blue.gradient} ${ACCENT.blue.solidGlow} ${ACCENT.blue.glow}`}>
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
                      <span key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.chipBg} ${t.textMuted}`}>
                        <Icon className="h-3 w-3" style={{ color: info.color }} />{info.shortName} <span className={t.textPrimary}>{count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── PPE TYPE BREAKDOWN (collapsed by default) ── */}
        {records.length > 0 && (
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <button type="button" onClick={() => sections.toggle('typeBreakdown')}
              className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBgSoft} transition-all`}>
              <div className="flex items-center gap-2">
                <HardHat className={`h-3.5 w-3.5 ${ACCENT.blue.icon}`} />
                <span className={`text-xs font-semibold ${t.textSecondary} uppercase tracking-wider`}>PPE Type Breakdown</span>
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
                    <GlowCard key={key} color={ACCENT_HEX.blue} className="p-4 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${t.chipBg}`}><Icon className="h-3.5 w-3.5" style={{ color: type.color }} /></div>
                        <span className={`text-sm font-semibold ${t.textPrimary}`}>{type.shortName}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className={t.textFaint}>Active</span><span className="font-bold text-emerald-500">{active}</span></div>
                        {soonC    > 0 && <div className="flex justify-between text-xs"><span className={t.textFaint}>Expiring</span><span className="font-bold text-amber-500">{soonC}</span></div>}
                        {expiredC > 0 && <div className="flex justify-between text-xs"><span className={t.textFaint}>Overdue</span><span className="font-bold text-rose-500">{expiredC}</span></div>}
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
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    filterType === value
                      ? `${ACCENT.blue.chip} ${ACCENT.blue.text}`
                      : `${t.glassSoft} ${t.textMuted} ${t.hoverBg} ${t.hoverText}`
                  }`}>
                  {label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${filterType === value ? 'bg-white/20' : t.chipBg} ${filterType === value ? '' : t.textFaint}`}>{count}</span>
                </button>
              ))}
            </div>
            {/* Search */}
            {(filterType === 'all' || filterType === 'active') && (
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
                <input type="text" placeholder="Search employee…" value={searchTerm}
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
              <span className={`text-xs font-semibold ${t.textSecondary} uppercase tracking-wider`}>Records</span>
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
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${anyExpanded ? `${t.glassSoft} ${t.textMuted} ${t.hoverText}` : `text-white bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow}`}`}>
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
              ) : (filterType === 'soon-to-due' || filterType === 'due') ? (
                <DueItemsList employees={employeesWithPPE} filterType={filterType}
                  onEditItem={r => { setEditData(r); setShowForm(true); }}
                  onDeleteItem={handleDelete}
                  onViewItem={item => { setDetailItem(item); setShowDetail(true); }} />
              ) : filteredEmployees.length === 0 ? (
                <div className={`text-center py-16 rounded-xl ${t.glassSoft}`}>
                  <HardHat className={`h-12 w-12 mx-auto mb-4 ${t.textTertiary}`} />
                  <p className={`text-sm font-semibold ${t.textMuted} mb-1`}>
                    {records.length === 0 ? 'No PPE records yet' : 'No employees match your search'}
                  </p>
                  <p className={`text-xs ${t.textFaint}`}>
                    {records.length === 0 ? 'Issue PPE to an employee to get started' : 'Try adjusting the search or filter'}
                  </p>
                  {records.length === 0 && (
                    <motion.button type="button" onClick={() => openIssueForm()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className={`mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold text-white transition-all bg-gradient-to-br ${ACCENT.violet.gradient} ${ACCENT.violet.solidGlow}`}>
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
                      onViewItem={item => { setDetailItem(item); setShowDetail(true); }} />
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
        allEmployees={allEmployeesForForm} />

      <PPEDetailModal item={detailItem} isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={item => { setEditData(item); setShowForm(true); }} />
    </AppShell>
  );
}
