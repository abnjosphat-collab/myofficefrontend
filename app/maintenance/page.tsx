// frontend/app/maintenance/page.tsx
'use client';
import { useState, useEffect, useMemo, ElementType, useRef } from "react";
import { api } from '@/lib/apiClient';
import { AppShell } from "@/components/app-shell";
import {
  useEmployees, useEquipment, useSpares,
  type EmployeeLookup, type EquipmentLookup, type SpareLookup,
} from "@/hooks/useLookups";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useTheme, PageHero, StatTile, StatusBadge, ViewToggle, FormField, FormActions,
  useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
  useConfirm, SearchInput, EmptyState, LoadingState, Combobox, type ComboOption, InfoRow,
} from '@/components/shared/theme';
import {
  Wrench, Plus, RefreshCw, CheckCircle2, Clock, PlayCircle, PauseCircle,
  ChevronDown, ChevronUp, ChevronRight, X, XCircle, AlertCircle,
  CalendarOff, ClipboardCheck, FileText, Trash2, Save, Signature,
  HardHat, ShieldCheck, Timer, CalendarClock, Pencil, Repeat2,
  SlidersHorizontal, ArrowUpDown, Zap, Settings2, Package, BarChart2,
  Activity, Layers, AlertTriangle, TrendingUp, Cpu, Maximize2, Minimize2,
  List, LayoutGrid,
} from "@/components/shared/theme";

// ==================== TYPES ====================
type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' | 'postponed' | 'not-done';
type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
const PORD: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const SORD: Record<WorkOrderStatus, number> = {
  'in-progress': 0, pending: 1, 'on-hold': 2, 'not-done': 3,
  completed: 4, postponed: 5, cancelled: 6,
};
type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
type WOClassification = 'planned_maintenance' | 'project' | 'breakdown' | 'custom';
type Discipline = 'Mechanical' | 'Electrical';
type Trade = 'Fitter' | 'Boilermaker' | 'Rigger' | 'Plumber' | 'Carpenter';

const FAILURE_MODES = [
  'Bearing failure', 'Seal / gasket failure', 'Motor failure', 'Belt / chain failure',
  'Shaft failure', 'Coupling failure', 'Gearbox failure', 'Pump failure', 'Valve failure',
  'Electrical fault', 'Lubrication failure', 'Structural failure / cracking',
  'Overheating', 'Blockage / fouling', 'Corrosion', 'Wear & tear', 'Operator error',
  'Foreign object damage', 'Calibration drift', 'Other',
];
const MECHANICAL_TRADES: Trade[] = ['Fitter', 'Boilermaker', 'Rigger', 'Plumber', 'Carpenter'];

interface SpareItem { id: string; name: string; quantity: number; unit_cost: number; }
type SpareRegisterItem = SpareLookup;

interface MaintenanceSchedule {
  id: string; name: string; equipment_info: string; to_department: string; allocated_to: string;
  authorising_foreman: string; estimated_hours: string; job_request_details: string;
  job_instructions: string; priority: WorkOrderPriority; recurrence_type: RecurrenceType;
  recurrence_dow: number; recurrence_dom: number; recurrence_months: number[];
  specific_dates: string[]; advance_days: number; active: boolean; next_due_date: string;
  last_generated: string; created_at: string;
}
// Picker record types + fetch hooks are shared (hooks/useLookups) — these are aliases
// so existing references in this file keep working.
type EquipmentItem = EquipmentLookup;
type EmployeeItem = EmployeeLookup;

interface WorkOrder {
  id: string; work_order_number: string; equipment_info: string; to_department: string; to_section: string;
  from_department: string; from_section: string; date_raised: string; time_raised: string;
  account_number: string; user_lab_today: string;
  job_type: { operational: boolean; maintenance: boolean; mining: boolean } | string;
  job_request_details: string; requested_by: string; authorising_foreman: string; authorising_engineer: string;
  allocated_to: string; estimated_hours: string; responsible_foreman: string; job_instructions: string;
  manpower: unknown; work_done_details: string; cause_of_failure: string; delay_details: string;
  artisan_name: string; artisan_sign: string; artisan_date: string;
  foreman_name: string; foreman_sign: string; foreman_date: string;
  time_work_started: string; time_work_finished: string; total_time_worked: string;
  overtime_start_time: string; overtime_end_time: string; overtime_hours: string;
  delay_from_time: string; delay_to_time: string; total_delay_hours: string;
  status: WorkOrderStatus; priority: WorkOrderPriority; progress: number;
  notes?: string; due_date?: string; created_at: string; updated_at: string;
  classification?: WOClassification; classification_custom?: string; failure_mode?: string;
  discipline?: Discipline; trade?: Trade; spares_used?: SpareItem[];
}

// ==================== API ====================

// The database is the only source of truth. These calls used to fall back to
// localStorage and return { success: true } on failure, so a work order that
// never reached the server showed a success toast and lived on in one browser
// with a fake Date.now() id. They now throw, and callers report the failure.

const LEGACY_WO_KEY = 'maint_work_orders';
const LEGACY_UPLOAD_DONE = 'maint_local_fields_uploaded_v1';
// Fields that used to exist only in the browser, before work_orders had columns
// for them (supabase_migration_work_orders_classification.sql).
const LOCAL_FIELDS: (keyof WorkOrder)[] = ['classification', 'classification_custom', 'failure_mode', 'discipline', 'trade', 'spares_used'];

async function getWorkOrders(): Promise<WorkOrder[]> {
  const data = await api.get<WorkOrder[]>('/api/maintenance/work-orders');
  return Array.isArray(data) ? data : [];
}

async function createWorkOrder(data: Record<string, unknown>): Promise<WorkOrder> {
  const result = await api.post<Partial<WorkOrder>>('/api/maintenance/work-orders', data);
  return { ...data, ...result } as WorkOrder;
}

async function updateWorkOrder(id: string, updates: Record<string, unknown>): Promise<void> {
  await api.patch(`/api/maintenance/work-orders/${id}`, { ...updates, updated_at: new Date().toISOString() });
}

async function deleteWorkOrder(id: string): Promise<void> {
  await api.delete(`/api/maintenance/work-orders/${id}`);
}

/**
 * One-time rescue of classification data stranded in this browser.
 *
 * Before work_orders had these columns, the page kept them in localStorage
 * only — so a user's failure modes, disciplines and spares lived on their
 * machine and nowhere else. Now that the columns exist, push anything the
 * server is still missing before the local copy is discarded. Runs once per
 * browser; only fills blanks, never overwrites a server value.
 */
async function uploadStrandedLocalFields(server: WorkOrder[]): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(LEGACY_UPLOAD_DONE)) return 0;

  let local: WorkOrder[] = [];
  try { local = JSON.parse(localStorage.getItem(LEGACY_WO_KEY) || '[]'); } catch { local = []; }
  if (!Array.isArray(local) || local.length === 0) {
    localStorage.setItem(LEGACY_UPLOAD_DONE, new Date().toISOString());
    return 0;
  }

  const localMap = new Map(local.map(w => [String(w.id), w]));
  let uploaded = 0;

  for (const wo of server) {
    const loc = localMap.get(String(wo.id));
    if (!loc) continue;
    const patch: Record<string, unknown> = {};
    for (const f of LOCAL_FIELDS) {
      const serverVal = wo[f];
      const localVal = loc[f];
      const serverBlank = serverVal === null || serverVal === undefined || serverVal === ''
        || (Array.isArray(serverVal) && serverVal.length === 0);
      const localHas = localVal !== null && localVal !== undefined && localVal !== ''
        && !(Array.isArray(localVal) && localVal.length === 0);
      if (serverBlank && localHas) patch[f] = localVal;
    }
    if (Object.keys(patch).length === 0) continue;
    try {
      await updateWorkOrder(String(wo.id), patch);
      uploaded++;
    } catch {
      // Leave the flag unset so the next load retries rather than dropping data.
      return uploaded;
    }
  }

  localStorage.setItem(LEGACY_UPLOAD_DONE, new Date().toISOString());
  localStorage.removeItem(LEGACY_WO_KEY);
  return uploaded;
}

// ==================== SCHEDULE STORAGE ====================
const SCHED_KEY = 'maint_schedules';
const SCHED_UPLOAD_DONE = 'maint_schedules_uploaded_v1';
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(n: number): string { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
// Schedules are server-side. They used to live in localStorage, which meant a
// schedule you created was invisible to everyone else, and nothing could raise
// its work orders unless you happened to open this page.
async function fetchSchedules(): Promise<MaintenanceSchedule[]> {
  const data = await api.get<MaintenanceSchedule[]>('/api/schedules');
  return Array.isArray(data) ? data : [];
}
async function createSchedule(s: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
  return api.post<MaintenanceSchedule>('/api/schedules', s);
}
async function updateSchedule(id: string | number, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
  return api.patch<MaintenanceSchedule>(`/api/schedules/${id}`, updates);
}
async function deleteSchedule(id: string | number): Promise<void> {
  await api.delete(`/api/schedules/${id}`);
}

/** One-time rescue of schedules stranded in this browser's localStorage. */
async function uploadStrandedSchedules(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(SCHED_UPLOAD_DONE)) return 0;
  let local: MaintenanceSchedule[] = [];
  try { local = JSON.parse(localStorage.getItem(SCHED_KEY) || '[]'); } catch { local = []; }
  if (!Array.isArray(local) || local.length === 0) {
    localStorage.setItem(SCHED_UPLOAD_DONE, new Date().toISOString());
    return 0;
  }
  let uploaded = 0;
  for (const s of local) {
    try {
      // id/created_at are the browser's; the server assigns its own.
      const { id: _id, created_at: _c, last_generated: _lg, ...rest } = s;
      await createSchedule(rest);
      uploaded++;
    } catch {
      return uploaded; // retry on next load rather than lose the schedule
    }
  }
  localStorage.setItem(SCHED_UPLOAD_DONE, new Date().toISOString());
  localStorage.removeItem(SCHED_KEY);
  return uploaded;
}

function recurrenceLabel(s: MaintenanceSchedule): string {
  switch (s.recurrence_type) {
    case 'daily': return 'Every day';
    case 'weekly': return `Every ${DOW[s.recurrence_dow]}`;
    case 'biweekly': return `Every 2 weeks on ${DOW[s.recurrence_dow]}`;
    case 'monthly': return `Monthly on the ${ordinal(s.recurrence_dom)}`;
    case 'quarterly': return `Quarterly — ${(s.recurrence_months ?? []).map(m => MON[m]).join(', ')}`;
    case 'yearly': return `Yearly — ${MON[s.recurrence_months?.[0] ?? 0]} ${ordinal(s.recurrence_dom)}`;
    case 'custom': return `Custom (${(s.specific_dates ?? []).length} date${(s.specific_dates ?? []).length !== 1 ? 's' : ''})`;
    default: return '';
  }
}
// getNextOccurrence() and isScheduleDue() used to live here so the browser could
// decide what was due and raise the work orders itself. The server owns both now
// (app/routers/schedules.py), which is what makes generation happen whether or
// not anyone opens this page, and stops two open tabs raising the same job
// twice. recurrenceLabel() stays — describing a rule is a display concern.

// ==================== HELPERS ====================
function statusCfg(s: WorkOrderStatus) {
  const m = {
    'pending': { Icon: Clock, color: '#facc15', label: 'Pending' },
    'in-progress': { Icon: PlayCircle, color: ACCENT_HEX.blue, label: 'In Progress' },
    'completed': { Icon: CheckCircle2, color: '#34d399', label: 'Completed' },
    'on-hold': { Icon: PauseCircle, color: '#fb923c', label: 'On Hold' },
    'cancelled': { Icon: XCircle, color: '#f87171', label: 'Cancelled' },
    'postponed': { Icon: CalendarOff, color: '#c084fc', label: 'Postponed' },
    'not-done': { Icon: AlertCircle, color: '#94a3b8', label: 'Not Done' },
  } as const;
  return m[s] ?? m['pending'];
}
function priorityCfg(p: WorkOrderPriority) {
  const m = {
    'urgent': { color: '#ef4444', label: 'Urgent' },
    'high': { color: '#f97316', label: 'High' },
    'medium': { color: '#eab308', label: 'Medium' },
    'low': { color: '#22c55e', label: 'Low' },
  } as const;
  return m[p] ?? m['medium'];
}
const CLASS_COLORS: Record<string, string> = { breakdown: '#f87171', planned_maintenance: '#4ade80', project: '#60a5fa', custom: '#c084fc' };
const CLASS_SHORT: Record<string, string> = { planned_maintenance: 'PM', project: 'Proj', breakdown: 'BKD', custom: 'Custom' };

const DONE_STATUSES: WorkOrderStatus[] = ['completed', 'cancelled'];

/**
 * Overdue = has a due date that has already passed, and the job is still open.
 *
 * Compares ISO date strings rather than Date objects: `new Date('2026-07-18') <
 * new Date()` is true from one second past midnight on the 18th, which marks a
 * job due *today* as already late. Cancelled work can't be overdue either.
 */
function isOverdue(w: Pick<WorkOrder, 'due_date' | 'status'>, today = new Date().toISOString().split('T')[0]): boolean {
  if (!w.due_date || DONE_STATUSES.includes(w.status)) return false;
  return w.due_date < today;
}

function calcStats(orders: WorkOrder[]) {
  const by = (s: WorkOrderStatus) => orders.filter(o => o.status === s).length;
  const total = orders.length;
  const completed = by('completed');
  const byClass = (c: WOClassification) => orders.filter(o => o.classification === c).length;
  const breakdowns = orders.filter(o => o.classification === 'breakdown');
  const byDiscipline = (d: Discipline) => orders.filter(o => o.discipline === d).length;

  const artisanCostMap: Record<string, { hours: number; sparesCost: number; count: number }> = {};
  breakdowns.forEach(w => {
    const name = w.artisan_name || w.allocated_to || 'Unknown';
    if (!artisanCostMap[name]) artisanCostMap[name] = { hours: 0, sparesCost: 0, count: 0 };
    artisanCostMap[name].hours += parseFloat(w.estimated_hours || '0') || 0;
    artisanCostMap[name].count += 1;
    (w.spares_used || []).forEach(s => { artisanCostMap[name].sparesCost += s.quantity * s.unit_cost; });
  });
  const artisanCost = Object.entries(artisanCostMap).map(([name, d]) => ({ name, hours: d.hours, sparesCost: d.sparesCost, count: d.count, total: d.hours * 50 + d.sparesCost })).sort((a, b) => b.total - a.total);

  const failureModeMap: Record<string, number> = {};
  breakdowns.forEach(w => { if (w.failure_mode) failureModeMap[w.failure_mode] = (failureModeMap[w.failure_mode] || 0) + 1; });
  const failureModes = Object.entries(failureModeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const hourBuckets = new Array(24).fill(0);
  breakdowns.forEach(w => { if (w.time_raised) { const h = parseInt(w.time_raised.split(':')[0]); if (!isNaN(h) && h >= 0 && h < 24) hourBuckets[h]++; } });

  const sparesTotalCost = orders.reduce((acc, w) => acc + (w.spares_used || []).reduce((s, x) => s + x.quantity * x.unit_cost, 0), 0);

  return {
    total, pending: by('pending'), inProgress: by('in-progress'), completed, onHold: by('on-hold'),
    overdue: orders.filter(o => isOverdue(o)).length,
    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
    plannedMaintenance: byClass('planned_maintenance'), projects: byClass('project'), breakdowns: byClass('breakdown'), customClass: byClass('custom'),
    mechanical: byDiscipline('Mechanical'), electrical: byDiscipline('Electrical'),
    artisanCost, failureModes, hourBuckets, sparesTotalCost,
  };
}

// ==================== ANALYTICS FILTERS ====================
interface AnalyticsFilters { dateFrom: string; dateTo: string; department: string; artisan: string; machine: string; trade: string; failureMode: string; classification: string; discipline: string; }
const emptyAnalyticsFilters: AnalyticsFilters = { dateFrom: '', dateTo: '', department: '', artisan: '', machine: '', trade: '', failureMode: '', classification: '', discipline: '' };

function applyAnalyticsFilters(orders: WorkOrder[], f: AnalyticsFilters): WorkOrder[] {
  return orders.filter(w => {
    if (f.dateFrom && (w.date_raised || '') < f.dateFrom) return false;
    if (f.dateTo && (w.date_raised || '') > f.dateTo) return false;
    if (f.department && w.to_department !== f.department) return false;
    if (f.discipline && w.discipline !== f.discipline) return false;
    if (f.classification && w.classification !== f.classification) return false;
    if (f.trade && w.trade !== f.trade) return false;
    if (f.failureMode && w.failure_mode !== f.failureMode) return false;
    if (f.artisan) { const name = (w.allocated_to || w.artisan_name || '').trim(); if (name !== f.artisan) return false; }
    if (f.machine && !w.equipment_info?.toLowerCase().includes(f.machine.toLowerCase())) return false;
    return true;
  });
}

function nextWONumber(existingOrders: WorkOrder[], offset = 0): string {
  const nums = existingOrders.map(w => { const m = w.work_order_number?.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `WO-${String(max + 1 + offset).padStart(5, '0')}`;
}

function calcTotal(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

// ==================== THEMED FIELD HELPERS ====================

function ThemedInput({ id, label, value, onChange, placeholder, type = 'text', readOnly, autoComplete }: {
  id: string; label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean; autoComplete?: string;
}) {
  const t = useTheme();
  return (
    <FormField label={label}>
      <Input id={id} type={type} value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className={`h-8 text-sm ${t.inputBg} ${readOnly ? 'opacity-60 cursor-default' : ''}`} />
    </FormField>
  );
}

function NAToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 ml-auto">
      <span className={`text-xs transition-colors ${checked ? 'text-orange-400' : 'opacity-40'}`}>{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-orange-500/50' : 'bg-white/20'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

// ==================== PREDICTION ====================
const MAINT_VOCAB: string[] = [
  'adjusted', 'bearing', 'bearings', 'belt', 'belts', 'broken', 'calibrated', 'checked', 'cleaned',
  'compressor', 'conveyor', 'corrective', 'coupling', 'cracked', 'damaged', 'drained', 'electrical',
  'filter', 'flushed', 'gasket', 'gaskets', 'gearbox', 'greased', 'hydraulic', 'inspected', 'installed',
  'lubricated', 'maintenance', 'mechanical', 'motor', 'overhauled', 'pneumatic', 'preventive', 'pump',
  'realigned', 'rectified', 'refitted', 'removed', 'repaired', 'replaced', 'seal', 'seals', 'serviced',
  'shaft', 'tightened', 'tested', 'valve', 'vibration', 'welded',
  'preventive maintenance completed', 'corrective maintenance done', 'no further action required',
  'machine running normally', 'awaiting spare parts', 'spare parts ordered', 'bearing worn out',
  'belt worn out', 'belt slipping', 'oil level low', 'oil leak detected', 'oil changed',
  'found and rectified', 'found fault in', 'maintenance complete', 'works normally after repair',
  'safety hazard identified', 'lockout tagout applied',
];
function getPrediction(text: string): string {
  if (!text) return '';
  if (text.endsWith(' ') || text.endsWith('\n')) {
    const trimmed = text.trimEnd().toLowerCase();
    const phrase = MAINT_VOCAB.filter(v => v.includes(' ')).find(v => v.toLowerCase().startsWith(trimmed + ' '));
    return phrase ? phrase.slice(trimmed.length + 1) : '';
  }
  const last = text.split(/[\s\n]+/).pop() || '';
  if (last.length < 2) return '';
  const lower = last.toLowerCase();
  const match = MAINT_VOCAB.find(v => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower);
  return match ? match.slice(last.length) : '';
}

function PredictiveArea({ id, label, value, onChange, placeholder, rows = 3, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; autoComplete?: string;
}) {
  const t = useTheme();
  const [ghost, setGhost] = useState('');
  const accept = () => { if (!ghost) return; onChange(value + ghost + ' '); setGhost(''); };
  return (
    <FormField label={label}>
      <Textarea id={id} value={value} rows={rows} autoComplete={autoComplete} placeholder={placeholder}
        className={`h-auto resize-none text-sm ${t.inputBg}`}
        onChange={e => { onChange(e.target.value); setGhost(getPrediction(e.target.value)); }}
        onKeyDown={e => { if (e.key === 'Tab' && ghost) { e.preventDefault(); accept(); } else if (e.key === 'Escape') setGhost(''); }}
        onBlur={() => setGhost('')} />
      {ghost && (
        <div className="flex items-center gap-2 px-0.5 mt-1">
          <kbd className={`text-[9px] rounded px-1 py-px font-mono leading-none ${t.chipBg} ${t.textFaint}`}>Tab</kbd>
          <button type="button" onClick={accept} className="text-[11px] text-brand-400 bg-brand-500/[0.08] hover:bg-brand-500/[0.16] px-2 py-0.5 rounded transition-colors max-w-[240px] truncate">{ghost.trim()}</button>
          <span className={`text-[10px] hidden sm:inline ${t.textFaint}`}>or click to accept</span>
        </div>
      )}
    </FormField>
  );
}

// Autocomplete data sources come from the shared hooks (hooks/useLookups) — imported
// at the top of this file; the previously-local useEmployees/useEquipment/useSpares
// (with their own caches + fetch) were removed in favor of that one implementation.


// The three pickers below all sit on the design system's Combobox, which owns
// the dropdown, keyboard handling and outside-click dismissal. Each used to
// hand-roll that machinery — three copies of the same effect and markup — and
// only differed in how it filters and what a row looks like, which is all that
// remains here.

function PersonAutocomplete({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const t = useTheme();
  const employees = useEmployees();

  const q = value.toLowerCase();
  const matches = q.length === 0 ? employees.slice(0, 8) : employees.filter(e => {
    const full = `${e.first_name} ${e.last_name}`.toLowerCase();
    return full.includes(q) || (e.employee_id || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const byValue = new Map(matches.map(e => [String(e.id), e]));
  const options: ComboOption[] = matches.map(e => ({
    value: String(e.id),
    label: `${e.first_name} ${e.last_name}`,
    sub: [e.designation, e.department, e.section].filter(Boolean).join(' · '),
  }));

  return (
    <FormField label={label || ''}>
      <Combobox
        value={value}
        onChange={onChange}
        onSelect={opt => onChange(opt.label)}
        options={options}
        placeholder={placeholder || 'Type to search employees, or enter name…'}
        renderOption={opt => {
          const e = byValue.get(opt.value);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0 text-[10px] text-brand-400 font-bold uppercase">
                {e?.first_name?.[0]}{e?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
                <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
              </div>
              {e?.employee_id && <span className={`text-[10px] flex-shrink-0 ${t.textFaint}`}>{e.employee_id}</span>}
            </div>
          );
        }}
      />
    </FormField>
  );
}

function EquipmentAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const equipment = useEquipment();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // This field holds a comma-separated list — one work order per machine — so
  // it filters on the fragment after the last comma and replaces only that
  // fragment on select, rather than the whole value.
  const fragment = value.split(',').pop()?.trimStart() ?? '';
  const q = fragment.toLowerCase();
  const matches = q.length === 0 ? equipment.slice(0, 8) : equipment.filter(e =>
    (e.name || '').toLowerCase().includes(q) || (e.equipment_id || '').toLowerCase().includes(q) ||
    (e.department || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const byValue = new Map(matches.map(e => [String(e.id), e]));
  const options: ComboOption[] = matches.map(e => ({
    value: String(e.id),
    label: e.name || e.equipment_id || '',
    sub: [e.equipment_id, e.department, e.location].filter(Boolean).join(' · '),
  }));

  const pick = (eq: EquipmentItem) => {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    parts.splice(parts.length > 0 && !value.endsWith(',') ? parts.length - 1 : parts.length, 1, eq.name || eq.equipment_id || '');
    onChange(parts.join(', '));
  };

  return (
    <div className="space-y-1.5">
      <Combobox
        value={value}
        onChange={onChange}
        onSelect={opt => { const eq = byValue.get(opt.value); if (eq) pick(eq); }}
        options={options}
        placeholder="Type machine name — comma-separate for multiple…"
        renderOption={opt => {
          const eq = byValue.get(opt.value);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
                <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
              </div>
              <StatusBadge color={eq?.status === 'operational' ? '#4ade80' : '#fb923c'} label={eq?.status || 'unknown'} />
            </div>
          );
        }}
      />
      {value.includes(',') && <p className="text-[10px] text-brand-400/70 px-0.5">{value.split(',').filter(s => s.trim()).length} machines — will create one work order each</p>}
    </div>
  );
}

function SpareAutocomplete({ value, onChange, onSelect, placeholder }: { value: string; onChange: (v: string) => void; onSelect: (item: SpareRegisterItem) => void; placeholder?: string; }) {
  const t = useTheme();
  const spares = useSpares();

  const q = value.toLowerCase();
  const matches = q.length === 0 ? spares.slice(0, 8) : spares.filter(s =>
    (s.description || '').toLowerCase().includes(q) || (s.stock_code || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const byValue = new Map(matches.map(s => [String(s.id), s]));
  const options: ComboOption[] = matches.map(s => ({
    value: String(s.id),
    label: s.description || '',
    sub: [s.stock_code, s.category, s.unit_of_measure, s.current_quantity !== undefined ? `Stock: ${s.current_quantity}` : '']
      .filter(Boolean).join(' · '),
  }));

  return (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={opt => { const s = byValue.get(opt.value); if (s) onSelect(s); }}
      options={options}
      loading={spares.length === 0}
      emptyText="No matches — value will be saved as typed"
      placeholder={placeholder || 'Search spares register or type manually…'}
      renderOption={opt => {
        const s = byValue.get(opt.value);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
              <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
            </div>
            <span className="text-amber-400 text-xs font-mono flex-shrink-0">R {(s?.unit_price || 0).toFixed(2)}</span>
          </div>
        );
      }}
    />
  );
}

// ==================== CREATE / EDIT WORK ORDER MODAL ====================
interface CreateModalProps { isOpen: boolean; onClose: () => void; onCreated: (newOrder: WorkOrder) => void; editingOrder?: WorkOrder; allOrders?: WorkOrder[]; }

function CreateWorkOrderModal({ isOpen, onClose, onCreated, editingOrder, allOrders = [] }: CreateModalProps) {
  const t = useTheme();
  const blankForm = () => ({
    equipment_info: '', to_department: 'Engineering', allocated_to: '', priority: 'medium' as WorkOrderPriority,
    estimated_hours: '2', job_request_details: '', requested_by: '', authorising_foreman: '', job_instructions: '',
    date_raised: new Date().toISOString().split('T')[0], due_date: '', classification: '' as WOClassification | '',
  });
  const fromOrder = (wo: WorkOrder) => ({
    equipment_info: wo.equipment_info || '', to_department: wo.to_department || 'Engineering',
    allocated_to: wo.allocated_to || wo.artisan_name || '', priority: wo.priority || 'medium' as WorkOrderPriority,
    estimated_hours: wo.estimated_hours || '2', job_request_details: wo.job_request_details || '',
    requested_by: wo.requested_by || '', authorising_foreman: wo.authorising_foreman || wo.responsible_foreman || '',
    job_instructions: wo.job_instructions || '', date_raised: wo.date_raised || new Date().toISOString().split('T')[0],
    due_date: wo.due_date || '', classification: (wo.classification || '') as WOClassification | '',
  });

  const [form, setForm] = useState(editingOrder ? fromOrder(editingOrder) : blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setForm(editingOrder ? fromOrder(editingOrder) : blankForm()); }, [isOpen, editingOrder?.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isEditing = !!editingOrder;
  const machines = form.equipment_info.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipment_info.trim() || !form.job_request_details.trim() || !form.allocated_to.trim()) { toast.error('Machine, artisan name and job request are required'); return; }
    setSaving(true);

    if (isEditing && editingOrder) {
      const updates = {
        equipment_info: form.equipment_info.trim(), to_department: form.to_department, allocated_to: form.allocated_to,
        artisan_name: form.allocated_to, priority: form.priority, estimated_hours: form.estimated_hours,
        job_request_details: form.job_request_details, requested_by: form.requested_by,
        authorising_foreman: form.authorising_foreman, responsible_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions, date_raised: form.date_raised,
        // Explicit null (not '' — the API rejects that for a date column, and not
        // omitted — that would silently keep the old date) so clearing works.
        due_date: form.due_date || null,
        ...(form.classification ? { classification: form.classification } : {}),
      };
      try {
        await updateWorkOrder(editingOrder.id, updates);
        toast.success('Work order updated');
        onCreated({ ...editingOrder, ...updates } as WorkOrder);
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update work order');
      } finally {
        setSaving(false);
      }
      return;
    }

    const created: WorkOrder[] = [];
    const failed: string[] = [];
    for (let i = 0; i < machines.length; i++) {
      try {
        const wo = await createWorkOrder({
        work_order_number: nextWONumber(allOrders, created.length), equipment_info: machines[i],
        to_department: form.to_department, allocated_to: form.allocated_to, priority: form.priority,
        estimated_hours: form.estimated_hours, job_request_details: form.job_request_details,
        requested_by: form.requested_by, authorising_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions, date_raised: form.date_raised,
        to_section: '', from_department: '', from_section: '', account_number: '', user_lab_today: '',
        time_raised: new Date().toTimeString().slice(0, 5),
        job_type: { operational: false, maintenance: true, mining: false },
        authorising_engineer: '', responsible_foreman: form.authorising_foreman, manpower: [],
        work_done_details: '', cause_of_failure: '', delay_details: '',
        artisan_name: form.allocated_to, artisan_sign: '', artisan_date: '',
        foreman_name: '', foreman_sign: '', foreman_date: '',
        time_work_started: '', time_work_finished: '', total_time_worked: '',
        overtime_start_time: '', overtime_end_time: '', overtime_hours: '',
        delay_from_time: '', delay_to_time: '', total_delay_hours: '',
          status: 'pending', progress: 0,
          // Omitted when blank — '' fails date validation on the API.
          ...(form.due_date ? { due_date: form.due_date } : {}),
          ...(form.classification ? { classification: form.classification } : {}),
        });
        created.push(wo);
      } catch (e) {
        failed.push(machines[i]);
        console.error('createWorkOrder failed for', machines[i], e);
      }
    }
    setSaving(false);
    if (failed.length > 0) {
      // Say which machines did not get a work order. This used to report
      // success and quietly keep them in localStorage.
      toast.error(`Could not create work order${failed.length === 1 ? '' : 's'} for: ${failed.join(', ')}`);
    }
    if (created.length > 0) {
      toast.success(created.length > 1 ? `${created.length} work orders created` : 'Work order created');
      setForm(blankForm());
      created.forEach(wo => onCreated(wo));
      if (failed.length === 0) onClose();
    } else toast.error('Failed to create work order');
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={isEditing ? `Edit Work Order — ${editingOrder?.work_order_number}` : 'New Work Order'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <FormField label={<>Machine / Equipment <span className={`ml-1.5 font-normal ${t.textFaint}`}>— comma-separate for multiple</span></> as unknown as string} required>
          <EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} />
        </FormField>
        <FormField label="Department"><Input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="Engineering" className={`h-9 ${t.inputBg}`} /></FormField>
        <PersonAutocomplete label="Allocated To (Artisan)" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Priority">
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Est. Hours"><Input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Date Raised"><Input type="date" title="Date raised" value={form.date_raised} onChange={e => set('date_raised', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          {/* Drives the Overdue KPI and the overdue badge on each row. Optional —
              blank means "no deadline", not "due today". */}
          <FormField label="Due Date"><Input type="date" title="Due date — when this work must be complete" min={form.date_raised} value={form.due_date} onChange={e => set('due_date', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PersonAutocomplete label="Requested By" value={form.requested_by} onChange={v => set('requested_by', v)} placeholder="Who is requesting this work?" />
          <PersonAutocomplete label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
        </div>
        <FormField label="Job Request — What to Do" required><Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)} placeholder="Describe exactly what the artisan needs to do…" rows={4} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label="Special Instructions (optional)"><Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)} placeholder="Safety notes, special tools, access requirements…" rows={2} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label={<>Work Order Classification <span className={`font-normal ${t.textFaint}`}>(optional — artisan can update later)</span></> as unknown as string}>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'planned_maintenance', label: 'Planned Maint.' }, { key: 'project', label: 'Project' }, { key: 'breakdown', label: 'Breakdown' }, { key: 'custom', label: 'Other / Custom' }] as { key: WOClassification; label: string }[]).map(opt => (
              <button key={opt.key} type="button" onClick={() => set('classification', form.classification === opt.key ? '' : opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.classification === opt.key ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={isEditing ? 'Save Changes' : machines.length > 1 ? `Create ${machines.length} Work Orders` : 'Create Work Order'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ==================== WORK ORDER DETAIL MODAL ====================
interface DetailModalProps { workOrder: WorkOrder; onClose: () => void; onRefresh: () => void; onDelete: (id: string) => void; }

function WorkOrderDetailModal({ workOrder, onClose, onRefresh, onDelete }: DetailModalProps) {
  const t = useTheme();
  const confirm = useConfirm();
  // Light-mode crisping. The modal is white (t.glass), but the accents/labels below
  // were tuned for dark glass: -400 shades and textFaint (gray-500) wash out on white.
  // Bump accents to -600 and give the primary buttons a solid fill in light mode.
  const light = t.light;
  const ic = {
    brand: light ? 'text-brand-600' : 'text-brand-400',
    cyan: light ? 'text-cyan-600' : 'text-cyan-400',
    violet: light ? 'text-violet-600' : 'text-violet-400',
    amber: light ? 'text-amber-600' : 'text-amber-400',
  };
  const subLabel = light ? 'text-gray-600' : t.textFaint;   // section sub-headers / field-group labels
  const btnCyan = light ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm' : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400';
  const btnViolet = light ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' : 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-400';
  const [activeTab, setActiveTab] = useState<'request' | 'artisan' | 'foreman'>('artisan');
  const [savingA, setSavingA] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [otNA, setOtNA] = useState(false);
  const [delayNA, setDelayNA] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [artisanSpares, setArtisanSpares] = useState<SpareItem[]>(workOrder.spares_used || []);
  const [newSpare, setNewSpare] = useState({ name: '', quantity: '1', unit_cost: '0' });

  const [artisan, setArtisan] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '';
    return {
      work_done_details: workOrder.work_done_details || '', cause_of_failure: workOrder.cause_of_failure || '',
      delay_details: workOrder.delay_details || '', time_work_started: workOrder.time_work_started || '',
      time_work_finished: workOrder.time_work_finished || '', total_time_worked: workOrder.total_time_worked || '',
      overtime_start_time: workOrder.overtime_start_time || '', overtime_end_time: workOrder.overtime_end_time || '',
      overtime_hours: workOrder.overtime_hours || '', delay_from_time: workOrder.delay_from_time || '',
      delay_to_time: workOrder.delay_to_time || '', total_delay_hours: workOrder.total_delay_hours || '',
      artisan_name: workOrder.artisan_name || workOrder.allocated_to || savedName,
      artisan_sign: workOrder.artisan_sign || '', artisan_date: workOrder.artisan_date || today,
      status: workOrder.status, progress: workOrder.progress,
      classification: workOrder.classification || '' as WOClassification | '',
      classification_custom: workOrder.classification_custom || '', failure_mode: workOrder.failure_mode || '',
      discipline: workOrder.discipline || '' as Discipline | '', trade: workOrder.trade || '' as Trade | '',
    };
  });

  const [foreman, setForeman] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '';
    return { foreman_name: workOrder.foreman_name || savedName, foreman_sign: workOrder.foreman_sign || '', foreman_date: workOrder.foreman_date || today, notes: workOrder.notes || '', status: workOrder.status, progress: workOrder.progress };
  });

  const setA = (k: string, v: string | number) => setArtisan(f => ({ ...f, [k]: v }));
  const setF = (k: string, v: string | number) => setForeman(f => ({ ...f, [k]: v }));

  useEffect(() => { const tt = calcTotal(artisan.time_work_started, artisan.time_work_finished); setArtisan(f => ({ ...f, total_time_worked: tt })); }, [artisan.time_work_started, artisan.time_work_finished]);
  useEffect(() => { const tt = calcTotal(artisan.overtime_start_time, artisan.overtime_end_time); setArtisan(f => ({ ...f, overtime_hours: tt })); }, [artisan.overtime_start_time, artisan.overtime_end_time]);
  useEffect(() => { const tt = calcTotal(artisan.delay_from_time, artisan.delay_to_time); setArtisan(f => ({ ...f, total_delay_hours: tt })); }, [artisan.delay_from_time, artisan.delay_to_time]);
  useEffect(() => { if (otNA) setArtisan(f => ({ ...f, overtime_start_time: '', overtime_end_time: '', overtime_hours: '' })); }, [otNA]);
  useEffect(() => { if (delayNA) setArtisan(f => ({ ...f, delay_from_time: '', delay_to_time: '', total_delay_hours: '' })); }, [delayNA]);

  const addArtisanSpare = () => {
    const name = newSpare.name.trim(); if (!name) return;
    setArtisanSpares(prev => [...prev, { id: Date.now().toString(), name, quantity: parseFloat(newSpare.quantity) || 1, unit_cost: parseFloat(newSpare.unit_cost) || 0 }]);
    setNewSpare({ name: '', quantity: '1', unit_cost: '0' });
  };

  const saveArtisan = async () => {
    setSavingA(true);
    if (artisan.artisan_name) localStorage.setItem('maint_artisan_name', artisan.artisan_name);
    const payload = {
      ...artisan,
      classification: artisan.classification || undefined,
      classification_custom: artisan.classification === 'custom' ? artisan.classification_custom : undefined,
      failure_mode: artisan.classification === 'breakdown' ? artisan.failure_mode || undefined : undefined,
      discipline: artisan.discipline || undefined,
      trade: artisan.discipline === 'Mechanical' ? artisan.trade || undefined : undefined,
      spares_used: artisanSpares.length > 0 ? artisanSpares : undefined,
    };
    try {
      await updateWorkOrder(workOrder.id, payload);
      toast.success('Artisan report saved');
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save artisan report');
    } finally {
      setSavingA(false);
    }
  };

  const saveForeman = async () => {
    setSavingF(true);
    if (foreman.foreman_name) localStorage.setItem('maint_foreman_name', foreman.foreman_name);
    try {
      await updateWorkOrder(workOrder.id, foreman);
      toast.success('Foreman sign-off saved');
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save foreman sign-off');
    } finally {
      setSavingF(false);
    }
  };

  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  const overdue = isOverdue(workOrder);

  return (
    <CenterModal open onClose={onClose} title={`#${workOrder.work_order_number}`} subtitle={workOrder.equipment_info} accent="violet" width="max-w-3xl">
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 pb-3">
          <StatusBadge color={scfg.color} label={scfg.label} dot />
          <StatusBadge color={pcfg.color} label={pcfg.label} />
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
          <TabsList className={`w-full ${t.chipBg} p-1 h-auto rounded-xl mb-4`}>
            <TabsTrigger value="request" className={`flex-1 gap-1.5 font-medium data-[state=active]:bg-brand-500/15 ${light ? 'data-[state=active]:text-brand-700' : 'data-[state=active]:text-brand-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <FileText className="h-3.5 w-3.5" /> Work Request
            </TabsTrigger>
            <TabsTrigger value="artisan" className={`flex-1 gap-1.5 font-medium data-[state=active]:bg-cyan-500/15 ${light ? 'data-[state=active]:text-cyan-700' : 'data-[state=active]:text-cyan-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <HardHat className="h-3.5 w-3.5" /> Artisan Report
            </TabsTrigger>
            <TabsTrigger value="foreman" className={`flex-1 gap-1.5 font-medium data-[state=active]:bg-violet-500/15 ${light ? 'data-[state=active]:text-violet-700' : 'data-[state=active]:text-violet-400'} data-[state=active]:shadow-sm ${subLabel}`}>
              <ShieldCheck className="h-3.5 w-3.5" /> Foreman Sign-off
            </TabsTrigger>
          </TabsList>

          {/* TAB: Work Request */}
          <TabsContent value="request">
            <div className={`${t.glassSoft} ${t.shadow} rounded-xl overflow-hidden`}>
              <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
                <FileText className={`h-4 w-4 ${ic.brand}`} />
                <span className={`font-semibold text-sm ${t.textPrimary}`}>Work Request</span>
                <span className={`ml-auto text-xs ${t.textFaint}`}>supervisor-issued · read-only</span>
              </div>
              <div className="px-4 pt-3 pb-3 grid grid-cols-3 gap-x-6 gap-y-2">
                <InfoRow label="Machine" value={workOrder.equipment_info} />
                <InfoRow label="Allocated To" value={workOrder.allocated_to || workOrder.artisan_name} />
                <InfoRow label="Date Raised" value={workOrder.date_raised} />
                <InfoRow label="Due Date" value={workOrder.due_date
                  ? <span className={overdue ? 'text-rose-600 font-semibold' : ''}>{workOrder.due_date}{overdue && ' — overdue'}</span>
                  : undefined} />
                {workOrder.job_request_details && (
                  <div className="col-span-3 mt-1">
                    <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Job</div>
                    <div className={`text-xs leading-relaxed ${t.textPrimary}`}>{workOrder.job_request_details}</div>
                  </div>
                )}
              </div>
              <div className={`px-4 pb-4 pt-2 border-t ${t.border} grid grid-cols-2 gap-x-8 gap-y-3 mt-1`}>
                <InfoRow label="Department" value={workOrder.to_department} />
                <InfoRow label="Estimated Hours" value={workOrder.estimated_hours ? `${workOrder.estimated_hours} h` : ''} />
                <InfoRow label="Requested By" value={workOrder.requested_by} />
                <InfoRow label="Authorising Foreman" value={workOrder.authorising_foreman} />
                {workOrder.job_instructions && <div className="col-span-2"><InfoRow label="Special Instructions" value={workOrder.job_instructions} /></div>}
              </div>
            </div>
          </TabsContent>

          {/* TAB: Artisan Report */}
          <TabsContent value="artisan">
            <div className="space-y-4">
              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Layers className={`h-3.5 w-3.5 ${ic.brand}`} /> Work Order Classification</div>
                <div className="flex flex-wrap gap-1.5">
                  {([{ v: 'planned_maintenance', label: 'Planned Maintenance' }, { v: 'project', label: 'Project' }, { v: 'breakdown', label: 'Breakdown' }, { v: 'custom', label: 'Other / Custom' }] as { v: WOClassification; label: string }[]).map(opt => (
                    <button key={opt.v} type="button" onClick={() => setA('classification', opt.v)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${artisan.classification === opt.v ? (light ? 'bg-brand-500/15 text-brand-700 font-semibold' : 'bg-brand-500/20 text-brand-400 font-medium') : `${t.hoverBg} ${subLabel}`}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {artisan.classification === 'custom' && (
                  <FormField label="Specify Type"><input value={artisan.classification_custom} onChange={e => setA('classification_custom', e.target.value)} placeholder="e.g. Commissioning, Shutdown work…" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                )}
                {artisan.classification === 'breakdown' && (
                  <FormField label="Failure Mode">
                    <input value={artisan.failure_mode} onChange={e => setA('failure_mode', e.target.value)} list="failure-mode-list" placeholder="Select or type failure mode…" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} />
                    <datalist id="failure-mode-list">{FAILURE_MODES.map(m => <option key={m} value={m} />)}</datalist>
                  </FormField>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Discipline">
                    <div className="flex gap-1.5">
                      {(['Mechanical', 'Electrical'] as Discipline[]).map(d => (
                        <button key={d} type="button" onClick={() => { setA('discipline', d); if (d === 'Electrical') setA('trade', ''); }}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors ${artisan.discipline === d ? (light ? 'bg-brand-500/15 text-brand-700 font-semibold' : 'bg-brand-500/20 text-brand-400 font-medium') : `${t.hoverBg} ${subLabel}`}`}>
                          {d === 'Mechanical' ? <Settings2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}{d}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  {artisan.discipline === 'Mechanical' && (
                    <FormField label="Trade">
                      <input value={artisan.trade} onChange={e => setA('trade', e.target.value)} list="trade-list" placeholder="Select or type trade…" className={`w-full rounded px-2.5 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} />
                      <datalist id="trade-list">{MECHANICAL_TRADES.map(tr => <option key={tr} value={tr} />)}</datalist>
                    </FormField>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <Select value={artisan.status} onValueChange={v => setA('status', v)}>
                    <SelectTrigger className={`h-8 text-sm ${t.inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on-hold">On Hold</SelectItem><SelectItem value="not-done">Not Done</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label={`Progress: ${artisan.progress}%`}>
                  <input type="range" min="0" max="100" value={artisan.progress} title={`Artisan progress: ${artisan.progress}%`} onChange={e => setA('progress', parseInt(e.target.value))} className="w-full mt-2 accent-cyan-400" />
                </FormField>
              </div>

              <PredictiveArea id="a-work-done" label="Work Done — what was carried out" value={artisan.work_done_details} onChange={v => setA('work_done_details', v)} placeholder="Describe exactly what was done…" rows={4} autoComplete="on" />

              <div className="grid grid-cols-2 gap-3">
                <PredictiveArea id="a-cause" label="Cause of Failure" value={artisan.cause_of_failure} onChange={v => setA('cause_of_failure', v)} placeholder="What caused the issue…" rows={3} autoComplete="on" />
                <PredictiveArea id="a-delay-desc" label="Delay Details" value={artisan.delay_details} onChange={v => setA('delay_details', v)} placeholder="Any delays encountered…" rows={3} autoComplete="on" />
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Timer className={`h-3.5 w-3.5 ${ic.cyan}`} /> Time Tracking</div>
                <div className="grid grid-cols-3 gap-3">
                  <ThemedInput id="a-t-start" label="Time Started" type="time" value={artisan.time_work_started} onChange={v => setA('time_work_started', v)} />
                  <ThemedInput id="a-t-finish" label="Time Finished" type="time" value={artisan.time_work_finished} onChange={v => setA('time_work_finished', v)} />
                  <ThemedInput id="a-t-total" label="Total Time (auto)" value={artisan.total_time_worked} onChange={v => setA('total_time_worked', v)} placeholder="auto" readOnly={!!(artisan.time_work_started && artisan.time_work_finished)} />
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${subLabel}`}>Overtime</span><NAToggle checked={otNA} onChange={setOtNA} label={otNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
                  {otNA ? <p className="text-orange-400/60 text-xs italic px-0.5">No overtime for this job.</p> : (
                    <div className="grid grid-cols-3 gap-3">
                      <ThemedInput id="a-ot-start" label="OT Start" type="time" value={artisan.overtime_start_time} onChange={v => setA('overtime_start_time', v)} />
                      <ThemedInput id="a-ot-end" label="OT End" type="time" value={artisan.overtime_end_time} onChange={v => setA('overtime_end_time', v)} />
                      <ThemedInput id="a-ot-hrs" label="OT Hours (auto)" value={artisan.overtime_hours} onChange={v => setA('overtime_hours', v)} placeholder="auto" readOnly={!!(artisan.overtime_start_time && artisan.overtime_end_time)} />
                    </div>
                  )}
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${subLabel}`}>Delays</span><NAToggle checked={delayNA} onChange={setDelayNA} label={delayNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
                  {delayNA ? <p className="text-orange-400/60 text-xs italic px-0.5">No delays for this job.</p> : (
                    <div className="grid grid-cols-3 gap-3">
                      <ThemedInput id="a-d-from" label="Delay From" type="time" value={artisan.delay_from_time} onChange={v => setA('delay_from_time', v)} />
                      <ThemedInput id="a-d-to" label="Delay To" type="time" value={artisan.delay_to_time} onChange={v => setA('delay_to_time', v)} />
                      <ThemedInput id="a-d-total" label="Delay Hours (auto)" value={artisan.total_delay_hours} onChange={v => setA('total_delay_hours', v)} placeholder="auto" readOnly={!!(artisan.delay_from_time && artisan.delay_to_time)} />
                    </div>
                  )}
                </div>
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Package className={`h-3.5 w-3.5 ${ic.amber}`} /> Spares Used</div>
                <div className="grid grid-cols-[1fr_70px_80px_auto] gap-2 items-end">
                  <FormField label="Spare / Part"><SpareAutocomplete value={newSpare.name} onChange={v => setNewSpare(s => ({ ...s, name: v }))} onSelect={item => setNewSpare(s => ({ ...s, name: item.description ?? '', unit_cost: String(item.unit_price ?? 0) }))} placeholder="Search spares register or type…" /></FormField>
                  <FormField label="Qty"><input type="number" min="0.01" step="0.01" value={newSpare.quantity} onChange={e => setNewSpare(s => ({ ...s, quantity: e.target.value }))} className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <FormField label="Unit Cost (R)"><input type="number" min="0" step="0.01" value={newSpare.unit_cost} onChange={e => setNewSpare(s => ({ ...s, unit_cost: e.target.value }))} className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <button type="button" onClick={addArtisanSpare} className={`h-[30px] px-3 rounded text-xs font-semibold transition-colors ${light ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}>Add</button>
                </div>
                {artisanSpares.length > 0 && (
                  <div className="space-y-1.5">
                    {artisanSpares.map(s => (
                      <div key={s.id} className={`flex items-center gap-2 ${t.hoverBgSoft} rounded px-2.5 py-1.5`}>
                        <Package className={`h-3 w-3 ${ic.amber} flex-shrink-0`} />
                        <span className={`flex-1 text-xs truncate ${t.textPrimary}`}>{s.name}</span>
                        <span className={`text-xs ${subLabel}`}>×{s.quantity}</span>
                        <span className={`text-xs font-mono font-semibold ${light ? 'text-amber-700' : 'text-amber-400/80'}`}>R {(s.quantity * s.unit_cost).toFixed(2)}</span>
                        <button type="button" onClick={() => setArtisanSpares(p => p.filter(x => x.id !== s.id))} className={`${t.textFaint} hover:text-rose-500 transition-colors ml-0.5`}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <div className="flex justify-end"><span className={`text-xs font-mono font-semibold ${light ? 'text-amber-700' : 'text-amber-400/90'}`}>Total: ${artisanSpares.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}</span></div>
                  </div>
                )}
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Signature className={`h-3.5 w-3.5 ${ic.cyan}`} /> Artisan Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete label="Artisan Name" value={artisan.artisan_name} onChange={v => setA('artisan_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="a-sign" label="Signature (type name)" value={artisan.artisan_sign} onChange={v => setA('artisan_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="a-date" label="Date" type="date" value={artisan.artisan_date} onChange={v => setA('artisan_date', v)} />
                </div>
              </div>

              <Button onClick={saveArtisan} disabled={savingA} className={`w-full ${btnCyan}`}><Save className="h-3.5 w-3.5 mr-2" />{savingA ? 'Saving…' : 'Save Artisan Report'}</Button>
            </div>
          </TabsContent>

          {/* TAB: Foreman Sign-off */}
          <TabsContent value="foreman">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Final Status">
                  <Select value={foreman.status} onValueChange={v => setF('status', v)}>
                    <SelectTrigger className={`h-8 text-sm ${t.inputBg}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed ✓</SelectItem><SelectItem value="on-hold">On Hold</SelectItem><SelectItem value="not-done">Not Done</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label={`Confirmed Progress: ${foreman.progress}%`}>
                  <input type="range" min="0" max="100" value={foreman.progress} title={`Foreman confirmed progress: ${foreman.progress}%`} onChange={e => setF('progress', parseInt(e.target.value))} className="w-full mt-2 accent-violet-400" />
                </FormField>
              </div>
              <PredictiveArea id="f-notes" label="Foreman Comments" value={foreman.notes} onChange={v => setF('notes', v)} placeholder="Comments on work done, observations, follow-up required…" rows={3} autoComplete="on" />
              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${subLabel}`}><Signature className={`h-3.5 w-3.5 ${ic.violet}`} /> Foreman Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete label="Foreman Name" value={foreman.foreman_name} onChange={v => setF('foreman_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="f-sign" label="Signature (type name)" value={foreman.foreman_sign} onChange={v => setF('foreman_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="f-date" label="Date" type="date" value={foreman.foreman_date} onChange={v => setF('foreman_date', v)} />
                </div>
              </div>
              <Button onClick={saveForeman} disabled={savingF} className={`w-full ${btnViolet}`}><Save className="h-3.5 w-3.5 mr-2" />{savingF ? 'Saving…' : 'Save Foreman Sign-off'}</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={async () => { if (await confirm({ title: 'Delete this work order?', message: 'This cannot be undone.', destructive: true })) { onDelete(workOrder.id); onClose(); } }} className="flex items-center gap-1.5 text-rose-500/70 hover:text-rose-500 text-xs transition-colors">
            <Trash2 className="h-3 w-3" /> Delete work order
          </button>
        </div>
      </div>
    </CenterModal>
  );
}

// ==================== ANALYTICS CHARTS ====================
function DonutChart({ segments, centerLabel }: { segments: { value: number; color: string; label: string }[]; centerLabel?: string }) {
  const t = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className={`flex items-center justify-center h-full text-xs ${t.textFaint}`}>No data</div>;
  const r = 36, cx = 50, cy = 50, sw = 14;
  const circ = 2 * Math.PI * r;
  const segData = segments.reduce<Array<{ seg: typeof segments[0]; dashLen: number; dashOff: number }>>((acc, seg) => {
    const pct = seg.value / total;
    const prevPct = acc.reduce((s, x) => s + x.dashLen / circ, 0);
    acc.push({ seg, dashLen: pct * circ, dashOff: -(prevPct * circ) });
    return acc;
  }, []);
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'} strokeWidth={sw} />
      {segData.map(({ seg, dashLen, dashOff }, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw} strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={dashOff} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.4s ease' }}>
          <title>{seg.label}: {seg.value} ({Math.round((seg.value / total) * 100)}%)</title>
        </circle>
      ))}
      {centerLabel && <text x="50" y="47" textAnchor="middle" fill={t.light ? '#0f172a' : 'rgba(255,255,255,0.85)'} fontSize="11" fontWeight="600">{centerLabel}</text>}
      <text x="50" y="59" textAnchor="middle" fill={t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.35)'} fontSize="7">{total} total</text>
    </svg>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string; value: number; total: number }[] }) {
  const t = useTheme();
  return (
    <div className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className={`text-xs flex-1 truncate ${t.textMuted}`}>{item.label}</span>
          <span className={`text-xs font-medium ${t.textPrimary}`}>{item.value}</span>
          <span className={`text-[10px] w-8 text-right ${t.textFaint}`}>{item.total > 0 ? `${Math.round(item.value / item.total * 100)}%` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

function HBarChart({ data, maxColor }: { data: { label: string; value: number }[]; maxColor: string }) {
  const t = useTheme();
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between"><span className={`text-xs truncate max-w-[140px] ${t.textMuted}`}>{d.label}</span><span className={`text-xs font-medium ml-2 ${t.textPrimary}`}>{d.value}</span></div>
          <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden`}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: maxColor, opacity: 0.6 + 0.4 * (d.value / max) }} /></div>
        </div>
      ))}
    </div>
  );
}

function TimeHeatmap({ hourBuckets }: { hourBuckets: number[] }) {
  const t = useTheme();
  const max = Math.max(...hourBuckets, 1);
  const LABELS = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22'];
  const PERIOD_COLORS: Record<string, string> = { night: '#6366f1', dawn: '#f59e0b', morning: '#10b981', afternoon: '#3b82f6', evening: '#f43f5e', late: '#8b5cf6' };
  const getPeriod = (h: number) => { if (h < 4) return 'night'; if (h < 7) return 'dawn'; if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; if (h < 21) return 'evening'; return 'late'; };
  const peakHour = hourBuckets.indexOf(max);
  return (
    <div>
      <div className="flex gap-0.5">
        {hourBuckets.map((count, h) => {
          const intensity = count / max;
          const color = PERIOD_COLORS[getPeriod(h)];
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5" title={`${String(h).padStart(2, '0')}:00 — ${count} breakdown${count !== 1 ? 's' : ''}`}>
              <div className="w-full rounded-sm transition-all duration-300" style={{ height: 40, backgroundColor: count > 0 ? color : (t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)'), opacity: count > 0 ? 0.2 + 0.8 * intensity : 1, border: h === peakHour && count > 0 ? '1px solid rgba(128,128,128,0.4)' : '1px solid transparent' }} />
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">{LABELS.map((l, i) => <div key={i} className={`text-[9px] ${t.textFaint}`} style={{ width: `${100 / 12}%` }}>{l}</div>)}</div>
      {max > 0 && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {Object.entries(PERIOD_COLORS).map(([period, color]) => <div key={period} className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.7 }} /><span className={`text-[9px] capitalize ${t.textFaint}`}>{period}</span></div>)}
          <span className={`text-[9px] ml-auto ${t.textFaint}`}>Peak: {String(peakHour).padStart(2, '0')}:00 ({hourBuckets[peakHour]} breakdowns)</span>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-brand-500/10 text-brand-400/90 text-[10px] px-2 py-0.5 rounded-full">
      {label}<button type="button" onClick={onRemove} className="hover:opacity-70 transition-opacity ml-0.5 flex-shrink-0"><X className="h-2.5 w-2.5" /></button>
    </span>
  );
}

function AnalyticsFilterBar({ allOrders, filters, onChange }: { allOrders: WorkOrder[]; filters: AnalyticsFilters; onChange: (f: AnalyticsFilters) => void; }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const uniq = (vals: (string | undefined | null)[]) => [...new Set(vals.map(v => (v || '').trim()).filter(Boolean))].sort();
  const depts = uniq(allOrders.map(w => w.to_department));
  const artisans = uniq(allOrders.map(w => w.allocated_to || w.artisan_name));
  const machines = uniq(allOrders.map(w => w.equipment_info));
  const trades = uniq(allOrders.filter(w => w.trade).map(w => w.trade));
  const failModes = uniq(allOrders.filter(w => w.failure_mode).map(w => w.failure_mode));
  const set = (k: keyof AnalyticsFilters, v: string) => onChange({ ...filters, [k]: v });
  const activeCount = Object.values(filters).filter(v => v !== '').length;
  const clearAll = () => onChange({ ...emptyAnalyticsFilters });
  const selCls = `w-full text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer ${t.inputBg}`;
  const inpCls = `w-full text-xs rounded-lg px-2.5 py-1.5 outline-none ${t.inputBg}`;

  const activeChips: { key: keyof AnalyticsFilters; label: string }[] = [
    filters.dateFrom ? { key: 'dateFrom', label: `From: ${filters.dateFrom}` } : null,
    filters.dateTo ? { key: 'dateTo', label: `To: ${filters.dateTo}` } : null,
    filters.department ? { key: 'department', label: `Dept: ${filters.department}` } : null,
    filters.artisan ? { key: 'artisan', label: `Artisan: ${filters.artisan}` } : null,
    filters.machine ? { key: 'machine', label: `Machine: ${filters.machine}` } : null,
    filters.classification ? { key: 'classification', label: `Class: ${filters.classification === 'planned_maintenance' ? 'Planned Maint.' : filters.classification === 'breakdown' ? 'Breakdown' : filters.classification === 'project' ? 'Project' : 'Custom'}` } : null,
    filters.discipline ? { key: 'discipline', label: `Disc: ${filters.discipline}` } : null,
    filters.trade ? { key: 'trade', label: `Trade: ${filters.trade}` } : null,
    filters.failureMode ? { key: 'failureMode', label: `Fail: ${filters.failureMode}` } : null,
  ].filter(Boolean) as { key: keyof AnalyticsFilters; label: string }[];

  return (
    <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
      <button type="button" onClick={() => setOpen(o => !o)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${t.hoverBgSoft} transition-colors text-left`}>
        <SlidersHorizontal className="h-3.5 w-3.5 text-brand-400/80 flex-shrink-0" />
        <span className={`text-xs font-medium ${t.textMuted}`}>Filter Analytics</span>
        {activeCount > 0 && <span className="bg-brand-500/20 text-brand-400 text-[10px] font-semibold px-1.5 py-px rounded-full">{activeCount}</span>}
        <div className="flex-1" />
        {activeCount > 0 && !open && <button type="button" onClick={e => { e.stopPropagation(); clearAll(); }} className={`text-[10px] transition-colors px-2 py-0.5 rounded-lg flex-shrink-0 ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}>Clear all</button>}
        {open ? <ChevronUp className={`h-3.5 w-3.5 flex-shrink-0 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 ${t.textFaint}`} />}
      </button>
      {!open && activeCount > 0 && <div className="flex flex-wrap gap-1.5 px-4 pb-3">{activeChips.map(c => <FilterChip key={c.key} label={c.label} onRemove={() => set(c.key, '')} />)}</div>}
      {open && (
        <div className={`border-t ${t.border} px-4 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`}>
          <FormField label="From Date"><input type="date" title="From date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={inpCls} /></FormField>
          <FormField label="To Date"><input type="date" title="To date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className={inpCls} /></FormField>
          {depts.length > 0 && <FormField label="Department"><SelectField size="filter" title="Department" value={filters.department} onChange={v => set('department', v)} options={[{ value: '', label: 'All departments' }, ...depts.map(d => ({ value: d, label: d }))]} /></FormField>}
          <FormField label="Classification">
            <SelectField size="filter" title="Classification" value={filters.classification} onChange={v => set('classification', v)}
              options={[
                { value: '', label: 'All' },
                { value: 'planned_maintenance', label: 'Planned Maintenance' },
                { value: 'project', label: 'Project' },
                { value: 'breakdown', label: 'Breakdown' },
                { value: 'custom', label: 'Custom / Other' },
              ]} />
          </FormField>
          <FormField label="Discipline"><SelectField size="filter" title="Discipline" value={filters.discipline} onChange={v => set('discipline', v)} options={[{ value: '', label: 'All' }, { value: 'Mechanical', label: 'Mechanical' }, { value: 'Electrical', label: 'Electrical' }]} /></FormField>
          {artisans.length > 0 && <FormField label="Artisan"><SelectField size="filter" title="Artisan" value={filters.artisan} onChange={v => set('artisan', v)} options={[{ value: '', label: 'All artisans' }, ...artisans.map(a => ({ value: a, label: a }))]} /></FormField>}
          {machines.length > 0 && <FormField label="Machine"><SelectField size="filter" title="Machine" value={filters.machine} onChange={v => set('machine', v)} options={[{ value: '', label: 'All machines' }, ...machines.map(m => ({ value: m, label: m }))]} /></FormField>}
          {trades.length > 0 && <FormField label="Trade"><SelectField size="filter" title="Trade" value={filters.trade} onChange={v => set('trade', v)} options={[{ value: '', label: 'All trades' }, ...trades.map(tr => ({ value: tr, label: tr }))]} /></FormField>}
          {failModes.length > 0 && <FormField label="Failure Mode"><SelectField size="filter" title="Failure mode" value={filters.failureMode} onChange={v => set('failureMode', v)} options={[{ value: '', label: 'All failure modes' }, ...failModes.map(f => ({ value: f, label: f }))]} /></FormField>}
          {activeCount > 0 && (
            <div className="flex items-end col-span-full">
              <button type="button" onClick={clearAll} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${t.textFaint} ${t.hoverText} border ${t.border}`}><X className="h-3 w-3" /> Clear all filters</button>
              <span className={`ml-3 text-xs self-center ${t.textFaint}`}>Showing {allOrders.filter(w => applyAnalyticsFilters([w], filters).length > 0).length} of {allOrders.length} work orders</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArtisanCostChart({ artisanCost }: { artisanCost: ReturnType<typeof calcStats>['artisanCost'] }) {
  const t = useTheme();
  if (artisanCost.length === 0) return <div className={`flex items-center justify-center h-20 text-xs ${t.textFaint}`}>No breakdown data yet</div>;
  const top = artisanCost.slice(0, 6);
  const maxHours = Math.max(...top.map(a => a.hours), 1);
  return (
    <div className="space-y-2">
      {top.map((a, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs truncate max-w-[120px] ${t.textMuted}`}>{a.name}</span>
            <div className="flex items-center gap-3 text-[10px] text-right">
              <span className="text-brand-400/80">{a.hours.toFixed(1)}h</span>
              {a.sparesCost > 0 && <span className="text-amber-400/80">${a.sparesCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
              <span className={t.textFaint}>({a.count} WO)</span>
            </div>
          </div>
          <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden`}><div className="h-full rounded-full bg-brand-400/50 transition-all duration-500" style={{ width: `${(a.hours / maxHours) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPanel({ stats, standalone, rawOrders = [] }: { stats: ReturnType<typeof calcStats>; standalone?: boolean; rawOrders?: WorkOrder[]; }) {
  const t = useTheme();
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyAnalyticsFilters);
  const activeStats = useMemo(() => {
    if (!standalone || rawOrders.length === 0) return stats;
    const activeCount = Object.values(filters).filter(v => v !== '').length;
    if (activeCount === 0) return stats;
    return calcStats(applyAnalyticsFilters(rawOrders, filters));
  }, [standalone, rawOrders, filters, stats]);

  const classSegs = [
    { value: activeStats.plannedMaintenance, color: '#10b981', label: 'Planned Maintenance' },
    { value: activeStats.projects, color: '#3b82f6', label: 'Projects' },
    { value: activeStats.breakdowns, color: '#ef4444', label: 'Breakdowns' },
    { value: activeStats.customClass, color: '#8b5cf6', label: 'Custom / Other' },
  ].filter(s => s.value > 0);
  const statusSegs = [
    { value: activeStats.pending, color: '#fbbf24', label: 'Pending' },
    { value: activeStats.inProgress, color: '#60a5fa', label: 'In Progress' },
    { value: activeStats.completed, color: '#34d399', label: 'Completed' },
    { value: activeStats.onHold, color: '#fb923c', label: 'On Hold' },
  ].filter(s => s.value > 0);
  const discSegs = [
    { value: activeStats.mechanical, color: ACCENT_HEX.blue, label: 'Mechanical' },
    { value: activeStats.electrical, color: '#fbbf24', label: 'Electrical' },
  ].filter(s => s.value > 0);
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-6">
      {standalone && rawOrders.length > 0 && <AnalyticsFilterBar allOrders={rawOrders} filters={filters} onChange={setFilters} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total WOs', value: activeStats.total, color: t.textPrimary, sub: activeFilterCount > 0 ? `of ${stats.total}` : undefined },
          { label: 'Breakdowns', value: activeStats.breakdowns, color: 'text-red-400', sub: activeStats.total > 0 ? `${Math.round(activeStats.breakdowns / activeStats.total * 100)}%` : '—' },
          { label: 'Planned Maint.', value: activeStats.plannedMaintenance, color: 'text-green-400', sub: undefined },
          { label: 'Breakdown Hrs', value: `${activeStats.artisanCost.reduce((a, x) => a + x.hours, 0).toFixed(1)}h`, color: 'text-brand-400', sub: undefined },
          { label: 'Spares Cost', value: `$${activeStats.sparesTotalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-amber-400', sub: undefined },
          { label: 'Completion', value: `${activeStats.efficiency}%`, color: activeStats.efficiency >= 70 ? 'text-green-400' : activeStats.efficiency >= 40 ? 'text-yellow-400' : 'text-red-400', sub: `${activeStats.completed}/${activeStats.total}` },
        ].map(k => (
          <div key={k.label} className={`${t.chipBg} rounded-xl p-3 text-center`}>
            <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
            <div className={`text-[10px] mt-0.5 ${t.textFaint}`}>{k.label}</div>
            {k.sub && <div className={`text-[9px] ${t.textFaint}`}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Layers className="h-3.5 w-3.5 text-brand-400" /> WO Classification</div>
          <div className="h-28"><DonutChart segments={classSegs} centerLabel={String(activeStats.total)} /></div>
          <ChartLegend items={classSegs.map(s => ({ ...s, total: activeStats.total }))} />
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Activity className="h-3.5 w-3.5 text-green-400" /> Status Breakdown</div>
          <div className="h-28"><DonutChart segments={statusSegs} centerLabel={`${activeStats.efficiency}%`} /></div>
          <ChartLegend items={statusSegs.map(s => ({ ...s, total: activeStats.total }))} />
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Cpu className="h-3.5 w-3.5 text-amber-400" /> Discipline</div>
          <div className="h-28"><DonutChart segments={discSegs} centerLabel={activeStats.mechanical + activeStats.electrical > 0 ? undefined : '—'} /></div>
          <ChartLegend items={discSegs.map(s => ({ ...s, total: activeStats.mechanical + activeStats.electrical }))} />
          {activeStats.sparesTotalCost > 0 && (
            <div className={`mt-3 pt-2 border-t ${t.border} text-center`}>
              <div className={`text-[10px] ${t.textFaint}`}>Spares Cost</div>
              <div className="text-amber-400/90 text-sm font-semibold font-mono">${activeStats.sparesTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><HardHat className="h-3.5 w-3.5 text-brand-400" /> Artisan Hours (Breakdowns)</div>
          <ArtisanCostChart artisanCost={activeStats.artisanCost} />
          {activeStats.artisanCost.length > 0 && <div className={`mt-3 text-[10px] ${t.textFaint}`}>Hours shown as a cost proxy. Spares cost in USD ($) shown where entered.</div>}
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Failure Modes (Top 8)</div>
          {activeStats.failureModes.length > 0 ? <HBarChart data={activeStats.failureModes.map(([label, value]) => ({ label, value }))} maxColor="#ef4444" /> : <div className={`text-xs ${t.textFaint}`}>No breakdown failure modes recorded</div>}
        </div>
      </div>

      <div className={`${t.glass} rounded-xl p-4`}>
        <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><TrendingUp className="h-3.5 w-3.5 text-violet-400" /> Breakdown Occurrence — Time of Day</div>
        {activeStats.breakdowns > 0 ? <TimeHeatmap hourBuckets={activeStats.hourBuckets} /> : <div className={`text-xs py-4 ${t.textFaint}`}>No breakdown time data recorded yet</div>}
      </div>
    </div>
  );
}

// ==================== WORK ORDER CARD (grid view) ====================
function WorkOrderCard({ workOrder, onClick, onEdit }: { workOrder: WorkOrder; onClick: () => void; onEdit: () => void; }) {
  const t = useTheme();
  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  return (
    <GlowCard onClick={onClick} color={scfg.color} surface={`${t.glass} rounded-xl`} className="p-4 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-[10px] ${t.textFaint}`}>#{workOrder.work_order_number}</span>
            {workOrder.classification && <StatusBadge color={CLASS_COLORS[workOrder.classification]} label={CLASS_SHORT[workOrder.classification]} />}
          </div>
          <span className="text-left mt-1 block">
            <div className={`font-semibold text-sm leading-tight transition-colors truncate max-w-[200px] ${t.textPrimary}`}>{workOrder.equipment_info}</div>
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(); }} className={`p-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`} title="Edit work order"><Pencil className="h-3 w-3" /></button>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pcfg.color }} title={pcfg.label} />
        </div>
      </div>
      <div className={`text-xs line-clamp-2 leading-relaxed flex-1 ${t.textFaint}`}>{workOrder.job_request_details}</div>
      <div className={`flex items-center justify-between pt-2 border-t ${t.border}`}>
        <div className={`text-xs truncate ${t.textMuted}`}>{workOrder.allocated_to || workOrder.artisan_name || '—'}</div>
        <StatusBadge color={scfg.color} label={scfg.label} />
      </div>
      <ProgressBar value={workOrder.progress} color={ACCENT_HEX.blue} showValue={false} />
    </GlowCard>
  );
}

// ==================== WORK ORDER ROW ====================
function WorkOrderRow({ workOrder, onClick, isExpanded, onToggle, onEdit }: { workOrder: WorkOrder; onClick: () => void; isExpanded: boolean; onToggle: () => void; onEdit: () => void; }) {
  const t = useTheme();
  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  const artisanDisplay = workOrder.allocated_to || workOrder.artisan_name || '—';
  const foremanDisplay = workOrder.authorising_foreman || workOrder.foreman_name || workOrder.responsible_foreman || '—';
  const overdue = isOverdue(workOrder);

  return (
    <div className={`border-b ${t.border}`}>
      <div className={`flex items-center gap-4 px-5 py-3 ${t.hoverBgSoft} transition-colors group`}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: scfg.color }} />
        <div className={`font-mono text-xs w-[5.5rem] flex-shrink-0 truncate ${t.textFaint}`}>#{workOrder.work_order_number}</div>
        <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-medium text-sm truncate transition-colors ${t.textPrimary}`}>{workOrder.equipment_info}</span>
            {workOrder.classification && <StatusBadge color={CLASS_COLORS[workOrder.classification]} label={workOrder.classification === 'custom' ? (workOrder.classification_custom?.slice(0, 6) || 'Custom') : CLASS_SHORT[workOrder.classification]} />}
            {workOrder.discipline && <StatusBadge color={workOrder.discipline === 'Electrical' ? '#fbbf24' : ACCENT_HEX.blue} label={`${workOrder.discipline === 'Electrical' ? '⚡' : '⚙'} ${workOrder.trade || workOrder.discipline}`} />}
            {overdue && <StatusBadge color="#e11d48" label={`Overdue · ${workOrder.due_date}`} dot />}
          </div>
          <div className={`text-xs truncate mt-0.5 ${t.textFaint}`}>{artisanDisplay}{workOrder.to_department ? ` · ${workOrder.to_department}` : ''}</div>
        </button>
        <div className="hidden md:block flex-1 min-w-0"><div className={`text-xs truncate ${t.textFaint}`}>{workOrder.job_request_details}</div></div>
        <div className="w-16 flex-shrink-0 hidden sm:block"><ProgressBar value={workOrder.progress} color={ACCENT_HEX.blue} showValue={false} /></div>
        <div className="flex-shrink-0"><StatusBadge color={scfg.color} label={scfg.label} /></div>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pcfg.color }} title={pcfg.label} />
        <div className={`text-xs flex-shrink-0 hidden lg:block w-[5.5rem] ${t.textFaint}`}>{workOrder.date_raised}</div>
        <button type="button" onClick={e => { e.stopPropagation(); onEdit(); }} title="Edit work order" className={`p-1 rounded ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100`}><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onToggle} title={isExpanded ? 'Collapse preview' : 'Quick preview'} className={`p-1 rounded ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors flex-shrink-0`}>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
      </div>

      {isExpanded && (
        <div className={`px-14 pb-4 pt-2 ${t.chipBg} border-t ${t.border}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5">
            <InfoRow label="Artisan" value={artisanDisplay} />
            <InfoRow label="Foreman" value={foremanDisplay} />
            <InfoRow label="Time Worked" value={workOrder.total_time_worked} />
            <InfoRow label="Est. Hours" value={workOrder.estimated_hours ? `${workOrder.estimated_hours}h` : undefined} />
            <InfoRow label="Due Date" value={workOrder.due_date
              ? <span className={overdue ? 'text-rose-600 font-semibold' : ''}>{workOrder.due_date}{overdue && ' — overdue'}</span>
              : undefined} />
            {(workOrder.work_done_details || workOrder.job_request_details) && (
              <div className="col-span-2 sm:col-span-4">
                <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{workOrder.work_done_details ? 'Work Done' : 'Job Request'}</div>
                <div className={`text-xs leading-relaxed line-clamp-3 ${t.textMuted}`}>{workOrder.work_done_details || workOrder.job_request_details}</div>
              </div>
            )}
            {workOrder.cause_of_failure && <div className="col-span-2 sm:col-span-4"><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Cause of Failure</div><div className={`text-xs line-clamp-2 ${t.textMuted}`}>{workOrder.cause_of_failure}</div></div>}
            {workOrder.failure_mode && <InfoRow label="Failure Mode" value={workOrder.failure_mode} />}
            {workOrder.spares_used && workOrder.spares_used.length > 0 && (
              <div className="col-span-2 sm:col-span-4">
                <div className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Spares Used</div>
                <div className="flex flex-wrap gap-1.5">
                  {workOrder.spares_used.map(s => <span key={s.id} className="bg-amber-500/10 text-amber-400/80 text-[10px] px-2 py-0.5 rounded-full">{s.name} ×{s.quantity} · ${(s.quantity * s.unit_cost).toFixed(0)}</span>)}
                  <span className={`${t.chipBg} ${t.textFaint} text-[10px] px-2 py-0.5 rounded-full font-mono`}>Total: ${workOrder.spares_used.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end"><button type="button" onClick={onClick} className="text-brand-400/80 hover:text-brand-400 text-xs flex items-center gap-1.5 transition-colors">Open full details <ChevronRight className="h-3 w-3" /></button></div>
        </div>
      )}
    </div>
  );
}

// ==================== SCHEDULE ROW ====================
function ScheduleRow({ schedule, onEdit, onDelete, onToggle, onRunNow }: { schedule: MaintenanceSchedule; onEdit: () => void; onDelete: () => void; onToggle: () => void; onRunNow: () => void; }) {
  const t = useTheme();
  const pcfg = priorityCfg(schedule.priority);
  return (
    <div className={`flex items-center gap-4 px-5 py-3 border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${schedule.active ? 'bg-green-400' : `${t.chipBg}`}`} />
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm truncate ${t.textPrimary}`}>{schedule.name}</div>
        <div className={`text-xs truncate ${t.textFaint}`}>{schedule.equipment_info}{schedule.to_department ? ` · ${schedule.to_department}` : ''}{schedule.allocated_to ? ` — ${schedule.allocated_to}` : ''}</div>
      </div>
      <div className="text-brand-400/70 text-xs flex-shrink-0 hidden md:block w-52 truncate"><Repeat2 className="h-3 w-3 inline mr-1 opacity-60" />{recurrenceLabel(schedule)}</div>
      <div className="flex-shrink-0 hidden sm:block text-right"><div className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Next</div><div className={`text-xs ${t.textMuted}`}>{schedule.next_due_date || '—'}</div></div>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pcfg.color }} title={pcfg.label} />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={onRunNow} title="Create work order(s) from this schedule now" className="text-[10px] px-2.5 py-0.5 rounded transition-colors text-brand-400 bg-brand-500/[0.10] hover:bg-brand-500/[0.20] whitespace-nowrap font-medium">Create Work Order(s)</button>
        <button type="button" onClick={onToggle} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${schedule.active ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : `${t.textFaint} ${t.chipBg} ${t.hoverBg}`}`}>{schedule.active ? 'Active' : 'Paused'}</button>
        <button type="button" onClick={onEdit} title="Edit schedule" className={`${t.chipBg} ${t.hoverBg} rounded p-1.5 transition-colors`}><Pencil className={`h-3 w-3 ${t.textFaint}`} /></button>
        <button type="button" onClick={onDelete} title="Delete schedule" className={`${t.chipBg} hover:bg-rose-500/[0.15] rounded p-1.5 transition-colors`}><Trash2 className={`h-3 w-3 ${t.textFaint}`} /></button>
      </div>
    </div>
  );
}

// ==================== CREATE SCHEDULE MODAL ====================
interface CreateScheduleModalProps { isOpen: boolean; initial: MaintenanceSchedule | null; onClose: () => void; onSave: (s: MaintenanceSchedule) => void; }

function CreateScheduleModal({ isOpen, initial, onClose, onSave }: CreateScheduleModalProps) {
  const t = useTheme();
  const today = new Date().toISOString().split('T')[0];

  const blankForm = () => ({
    name: '', equipment_info: '', to_department: '',
    allocated_to: typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '',
    authorising_foreman: typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '',
    estimated_hours: '2', job_request_details: '', job_instructions: '', priority: 'medium' as WorkOrderPriority,
    recurrence_type: 'weekly' as RecurrenceType, recurrence_dow: 1, recurrence_dom: 1,
    recurrence_months: [0, 3, 6, 9] as number[], specific_dates: [] as string[], advance_days: 1, start_date: today,
  });

  const [form, setForm] = useState(blankForm);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name, equipment_info: initial.equipment_info, to_department: initial.to_department,
        allocated_to: initial.allocated_to, authorising_foreman: initial.authorising_foreman,
        estimated_hours: initial.estimated_hours, job_request_details: initial.job_request_details,
        job_instructions: initial.job_instructions, priority: initial.priority, recurrence_type: initial.recurrence_type,
        recurrence_dow: initial.recurrence_dow, recurrence_dom: initial.recurrence_dom,
        recurrence_months: initial.recurrence_months ?? [], specific_dates: initial.specific_dates ?? [],
        advance_days: initial.advance_days ?? 1, start_date: initial.next_due_date || today,
      });
    } else setForm(blankForm());
  }, [isOpen, initial]);

  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: ReturnType<typeof blankForm>[K]) => setForm(f => ({ ...f, [k]: v }));
  const toggleMonth = (m: number) => setForm(f => ({ ...f, recurrence_months: f.recurrence_months.includes(m) ? f.recurrence_months.filter(x => x !== m) : [...f.recurrence_months, m].sort((a, b) => a - b) }));
  const addDate = () => { if (!newDate || form.specific_dates.includes(newDate)) return; setForm(f => ({ ...f, specific_dates: [...f.specific_dates, newDate].sort() })); setNewDate(''); };
  const removeDate = (d: string) => setForm(f => ({ ...f, specific_dates: f.specific_dates.filter(x => x !== d) }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.equipment_info.trim() || !form.job_request_details.trim()) { toast.error('Schedule name, equipment, and job request are required'); return; }
    if (form.recurrence_type === 'custom' && form.specific_dates.length === 0) { toast.error('Add at least one date for a custom schedule'); return; }
    const schedule: MaintenanceSchedule = {
      id: initial?.id || Date.now().toString(), name: form.name.trim(), equipment_info: form.equipment_info.trim(),
      to_department: form.to_department, allocated_to: form.allocated_to, authorising_foreman: form.authorising_foreman,
      estimated_hours: form.estimated_hours, job_request_details: form.job_request_details.trim(),
      job_instructions: form.job_instructions, priority: form.priority, recurrence_type: form.recurrence_type,
      recurrence_dow: form.recurrence_dow, recurrence_dom: form.recurrence_dom, recurrence_months: form.recurrence_months,
      specific_dates: form.specific_dates, advance_days: form.advance_days, active: initial?.active ?? true,
      next_due_date: form.start_date, last_generated: initial?.last_generated || '', created_at: initial?.created_at || new Date().toISOString(),
    };
    onSave(schedule);
    onClose();
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={initial ? 'Edit Recurring Schedule' : 'New Recurring Schedule'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <FormField label="Schedule Name" required><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Weekly Compressor Check" className={`h-9 ${t.inputBg}`} /></FormField>
        <FormField label="Machine / Equipment" required><EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} /></FormField>
        <FormField label="Department"><Input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="Engineering…" className={`h-9 ${t.inputBg}`} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <PersonAutocomplete label="Allocated To" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
          <PersonAutocomplete label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Est. Hours"><Input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Priority">
            <Select value={form.priority} onValueChange={v => set('priority', v as WorkOrderPriority)}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </FormField>
        </div>

        <div className={`space-y-3 border ${t.border} rounded-xl p-4`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${t.textMuted}`}><Repeat2 className="h-4 w-4 text-brand-400" /> Recurrence</div>
          <div className="flex flex-wrap gap-1.5">
            {(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'] as RecurrenceType[]).map(rt => (
              <button key={rt} type="button" onClick={() => set('recurrence_type', rt)} className={`px-3 py-1 rounded-lg text-xs transition-colors capitalize ${form.recurrence_type === rt ? 'bg-brand-500/20 text-brand-400 font-medium' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{rt}</button>
            ))}
          </div>
          {(form.recurrence_type === 'weekly' || form.recurrence_type === 'biweekly') && (
            <FormField label="Day of Week">
              <div className="flex gap-1">{DOW.map((d, i) => <button key={d} type="button" onClick={() => set('recurrence_dow', i)} className={`flex-1 py-1.5 rounded text-[11px] transition-colors ${form.recurrence_dow === i ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{d.slice(0, 3)}</button>)}</div>
            </FormField>
          )}
          {(form.recurrence_type === 'monthly' || form.recurrence_type === 'quarterly' || form.recurrence_type === 'yearly') && (
            <FormField label="Day of Month (1–28)"><Input type="number" min="1" max="28" value={form.recurrence_dom} onChange={e => set('recurrence_dom', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} className={`h-9 ${t.inputBg}`} /></FormField>
          )}
          {form.recurrence_type === 'quarterly' && (
            <FormField label="Which months"><div className="flex flex-wrap gap-1.5">{MON.map((m, i) => <button key={m} type="button" onClick={() => toggleMonth(i)} className={`px-2.5 py-1 rounded text-[11px] transition-colors ${form.recurrence_months.includes(i) ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{m}</button>)}</div></FormField>
          )}
          {form.recurrence_type === 'yearly' && (
            <FormField label="Month of Year">
              <Select value={String(form.recurrence_months[0] ?? 0)} onValueChange={v => set('recurrence_months', [parseInt(v)])}>
                <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
                <SelectContent>{MON.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          )}
          {form.recurrence_type === 'custom' && (
            <FormField label="Specific Dates">
              <div className="flex gap-2">
                <Input type="date" title="Add date" value={newDate} onChange={e => setNewDate(e.target.value)} className={`flex-1 h-9 ${t.inputBg}`} />
                <Button type="button" onClick={addDate} size="sm" className="bg-brand-500/15 hover:bg-brand-500/25 text-brand-400">Add</Button>
              </div>
              {form.specific_dates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.specific_dates.map(d => <span key={d} className={`flex items-center gap-1 ${t.chipBg} rounded px-2 py-0.5 text-xs ${t.textMuted}`}>{d}<button type="button" onClick={() => removeDate(d)} title={`Remove ${d}`} className={`${t.textFaint} hover:text-rose-500 ml-0.5`}><X className="h-2.5 w-2.5" /></button></span>)}
                </div>
              )}
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={initial ? 'Next Due Date' : 'First Occurrence Date'}><Input type="date" title="Start date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Generate work order ___ days early"><Input type="number" min="0" max="14" value={form.advance_days} onChange={e => set('advance_days', Math.max(0, parseInt(e.target.value) || 0))} className={`h-9 ${t.inputBg}`} /></FormField>
        </div>
        <FormField label="Job Request — What to Do" required><Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)} placeholder="Describe exactly what the artisan needs to do on each occurrence…" rows={3} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label="Special Instructions (optional)"><Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)} placeholder="Safety notes, tools, access…" rows={2} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormActions onCancel={onClose} submitLabel={initial ? 'Update Schedule' : 'Create Schedule'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ==================== STATUS TABS CONFIG ====================
const STATUS_TABS = [
  { key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' }, { key: 'on-hold', label: 'On Hold' },
] as const;

// ==================== MAIN PAGE ====================
function MaintenancePageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const sections = useCollapseSection({ hero: true });
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'workorders' | 'analytics'>('workorders');
  const [woViewMode, setWoViewMode] = useState<'list' | 'grid'>('list');
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);

  const handleEditWO = (wo: WorkOrder) => { setEditingWO(wo); setShowCreateModal(true); };
  const handleCloseCreateModal = () => { setShowCreateModal(false); setEditingWO(null); };

  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set());
  const toggleWO = (id: string) => setExpandedWOs(prev => { const next = new Set(prev); if (next.has(String(id))) next.delete(String(id)); else next.add(String(id)); return next; });

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(String(id))) next.delete(String(id)); else next.add(String(id)); return next; });
  const selectAll = () => setSelectedIds(new Set(filtered.map(w => String(w.id))));
  const clearSelect = () => setSelectedIds(new Set());
  const exitBulk = () => { setBulkMode(false); clearSelect(); };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!await confirm({ title: `Delete ${count} work order${count !== 1 ? 's' : ''}?`, message: 'This cannot be undone.', destructive: true, confirmLabel: `Delete ${count}` })) return;
    let failed = 0;
    for (const id of selectedIds) {
      try { await deleteWorkOrder(id); } catch { failed++; }
    }
    exitBulk();
    await load();
    if (failed === 0) toast.success(`${count} work order${count !== 1 ? 's' : ''} deleted`);
    else toast.error(`${count - failed} deleted, ${failed} failed`);
  };

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loadError, setLoadError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [schedPanelOpen, setSchedPanelOpen] = useState(true);
  const [showCreateSched, setShowCreateSched] = useState(false);
  const [editingSched, setEditingSched] = useState<MaintenanceSchedule | null>(null);

  type SortBy = 'date-desc' | 'date-asc' | 'priority' | 'machine' | 'status';
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const selectedOrder = useMemo(() => selectedOrderId ? workOrders.find(w => String(w.id) === String(selectedOrderId)) ?? null : null, [workOrders, selectedOrderId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWorkOrders();
      setWorkOrders(data);
      setLoadError('');
    } catch (e) {
      // Previously this fell back to localStorage and looked like success.
      setLoadError(e instanceof Error ? e.message : 'Could not load work orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getWorkOrders();
        setWorkOrders(data);
        setLoadError('');
        const rescued = await uploadStrandedLocalFields(data);
        if (rescued > 0) {
          toast.success(`Saved classification data from this browser to ${rescued} work order${rescued === 1 ? '' : 's'}`);
          setWorkOrders(await getWorkOrders());
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load work orders.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Schedules come from the server, which also raises their work orders — see
  // POST /api/schedules/generate, driven by cron. The browser used to do this
  // on page load, which meant work orders were only raised if somebody opened
  // the page, and two people opening it could raise the same job twice.
  useEffect(() => {
    (async () => {
      try {
        const rescued = await uploadStrandedSchedules();
        if (rescued > 0) {
          toast.success(`Moved ${rescued} schedule${rescued === 1 ? '' : 's'} from this browser to the server`);
        }
        setSchedules(await fetchSchedules());
        setScheduleError('');
      } catch (e) {
        setScheduleError(e instanceof Error ? e.message : 'Could not load schedules.');
      }
    })();
  }, []);

  const stats = useMemo(() => calcStats(workOrders), [workOrders]);

  const q = searchQuery.trim().toLowerCase();
  const filtered = workOrders
    .filter(w => statusTab === 'all' || w.status === statusTab)
    .filter(w => !q || w.work_order_number?.toLowerCase().includes(q) || w.equipment_info?.toLowerCase().includes(q) || w.allocated_to?.toLowerCase().includes(q) || w.artisan_name?.toLowerCase().includes(q) || w.to_department?.toLowerCase().includes(q) || w.job_request_details?.toLowerCase().includes(q) || w.requested_by?.toLowerCase().includes(q))
    .filter(w => priorityFilter.length === 0 || priorityFilter.includes(w.priority))
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return (b.date_raised || '').localeCompare(a.date_raised || '');
        case 'date-asc': return (a.date_raised || '').localeCompare(b.date_raised || '');
        case 'priority': return (PORD[a.priority] ?? 4) - (PORD[b.priority] ?? 4);
        case 'machine': return (a.equipment_info || '').localeCompare(b.equipment_info || '');
        case 'status': return (SORD[a.status] ?? 7) - (SORD[b.status] ?? 7);
        default: return 0;
      }
    });

  const tabCount = (key: string) => key === 'all' ? workOrders.length : workOrders.filter(w => w.status === key).length;

  const handleCreated = (savedOrder: WorkOrder) => {
    setWorkOrders(prev => { const exists = prev.some(w => String(w.id) === String(savedOrder.id)); return exists ? prev.map(w => String(w.id) === String(savedOrder.id) ? savedOrder : w) : [savedOrder, ...prev]; });
    load();
  };
  const handleDelete = async (id: string) => { await deleteWorkOrder(id); setSelectedOrderId(null); await load(); toast.success('Work order deleted'); };

  const handleRunScheduleNow = async (sched: MaintenanceSchedule) => {
    const today = new Date().toISOString().split('T')[0];
    const machines = sched.equipment_info.split(',').map(s => s.trim()).filter(Boolean);
    const created: WorkOrder[] = [];
    const failedMachines: string[] = [];
    for (let i = 0; i < machines.length; i++) {
      try {
        const wo = await createWorkOrder({
        work_order_number: nextWONumber(workOrders, created.length), equipment_info: machines[i],
        to_department: sched.to_department, allocated_to: sched.allocated_to, authorising_foreman: sched.authorising_foreman,
        estimated_hours: sched.estimated_hours, job_request_details: sched.job_request_details,
        job_instructions: sched.job_instructions, priority: sched.priority,
        to_section: '', from_department: '', from_section: '', account_number: '', user_lab_today: '',
        date_raised: today, time_raised: new Date().toTimeString().slice(0, 5),
        job_type: { operational: false, maintenance: true, mining: false },
        requested_by: 'Manual — from schedule', authorising_engineer: '', responsible_foreman: sched.authorising_foreman, manpower: [],
        work_done_details: '', cause_of_failure: '', delay_details: '',
        artisan_name: sched.allocated_to, artisan_sign: '', artisan_date: '',
        foreman_name: '', foreman_sign: '', foreman_date: '',
        time_work_started: '', time_work_finished: '', total_time_worked: '',
        overtime_start_time: '', overtime_end_time: '', overtime_hours: '',
        delay_from_time: '', delay_to_time: '', total_delay_hours: '',
        status: 'pending', progress: 0,
        });
        created.push(wo);
      } catch (e) {
        failedMachines.push(machines[i]);
        console.error('run schedule now failed for', machines[i], e);
      }
    }
    if (failedMachines.length > 0) {
      toast.error(`Could not create work order${failedMachines.length === 1 ? '' : 's'} for: ${failedMachines.join(', ')}`);
    }
    if (created.length > 0) {
      toast.success(created.length > 1 ? `${created.length} work orders created from "${sched.name}"` : `Work order created from "${sched.name}"`);
      setWorkOrders(prev => [...created, ...prev]);
      load();
    }
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Wrench}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Work Orders']}
        title="Work Orders"
        description="Maintenance management & tracking"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={load} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            {mainTab === 'workorders' && <button type="button" onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all"><Plus className="h-3.5 w-3.5" /> New Work Order</button>}
          </>
        }
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: 'Total', value: stats.total, color: t.textPrimary },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-brand-400' },
            { label: 'Completed', value: stats.completed, color: 'text-green-400' },
            { label: 'On Hold', value: stats.onHold, color: 'text-orange-400' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className={`text-xs mt-0.5 ${t.textFaint}`}>{s.label}</div>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Page tab bar */}
      <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit`}>
        {([{ key: 'workorders', label: 'Work Orders', icon: Wrench }, { key: 'analytics', label: 'Analytics & Insights', icon: BarChart2 }] as { key: 'workorders' | 'analytics'; label: string; icon: ElementType }[]).map(tb => {
          const active = mainTab === tb.key;
          return (
            <button key={tb.key} type="button" onClick={() => { setMainTab(tb.key); if (tb.key === 'workorders' && bulkMode) exitBulk(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
              <tb.icon className="h-4 w-4" />{tb.label}
            </button>
          );
        })}
      </div>

      {mainTab === 'workorders' && (
        <>
          {/* Schedules panel */}
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand-400" />
                <span className={`font-semibold text-sm ${t.textPrimary}`}>Recurring Schedules</span>
                {schedules.length > 0 && <span className={`text-xs ${t.chipBg} rounded-full px-2 py-0.5 ${t.textFaint}`}>{schedules.filter(s => s.active).length} active</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { setEditingSched(null); setShowCreateSched(true); }} className="bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 gap-1.5 h-7 text-xs"><Plus className="h-3.5 w-3.5" /> New Schedule</Button>
                <button type="button" onClick={() => setSchedPanelOpen(o => !o)} title={schedPanelOpen ? 'Collapse schedules' : 'Expand schedules'} className={`${t.chipBg} ${t.hoverBg} ${t.textFaint} rounded-lg p-1.5 transition-colors`}>{schedPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              </div>
            </div>
            {schedPanelOpen && (scheduleError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Could not load schedules"
                message={scheduleError}
              />
            ) : schedules.length === 0 ? (
              <EmptyState
                icon={Repeat2}
                title="No recurring schedules yet"
                message="Set up schedules to auto-generate work orders — every week, month, quarter, or custom dates."
                action={{ label: 'Create First Schedule', onClick: () => { setEditingSched(null); setShowCreateSched(true); } }}
              />
            ) : (
              <div>{schedules.map(s => (
                <ScheduleRow key={s.id} schedule={s} onEdit={() => { setEditingSched(s); setShowCreateSched(true); }} onRunNow={() => handleRunScheduleNow(s)}
                  onDelete={async () => {
                    if (!await confirm({ title: `Delete schedule "${s.name}"?`, message: 'This cannot be undone.', destructive: true })) return;
                    try {
                      await deleteSchedule(s.id);
                      setSchedules(prev => prev.filter(x => x.id !== s.id));
                      toast.success('Schedule deleted');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Could not delete schedule');
                    }
                  }}
                  onToggle={async () => {
                    const next = !s.active;
                    setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, active: next } : x));
                    try {
                      await updateSchedule(s.id, { active: next });
                    } catch (e) {
                      // Put the toggle back — the server is the truth.
                      setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, active: !next } : x));
                      toast.error(e instanceof Error ? e.message : 'Could not update schedule');
                    }
                  }} />
              ))}</div>
            ))}
          </div>

          {/* Records panel */}
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b ${t.border}`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_TABS.map(tab => {
                  const active = statusTab === tab.key;
                  return (
                    <button type="button" key={tab.key} onClick={() => setStatusTab(tab.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-brand-500/20 text-brand-400 font-semibold' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
                      {tab.label}<span className={`ml-1.5 text-[10px] ${active ? '' : t.textFaint}`}>{tabCount(tab.key)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                <div className={`flex items-center gap-1.5 ${t.chipBg} rounded-lg px-2.5 py-1.5`}>
                  <ArrowUpDown className={`h-3 w-3 flex-shrink-0 ${t.textFaint}`} />
                  <SelectField size="filter" title="Sort by" value={sortBy} onChange={v => setSortBy(v as SortBy)}
                    options={[
                      { value: 'date-desc', label: 'Newest first' },
                      { value: 'date-asc', label: 'Oldest first' },
                      { value: 'priority', label: 'Priority' },
                      { value: 'status', label: 'Status' },
                      { value: 'machine', label: 'Machine A–Z' },
                    ]} />
                </div>

                <div className="relative">
                  <button type="button" onClick={() => setShowFilterMenu(o => !o)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${priorityFilter.length > 0 ? 'bg-brand-500/15 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />{priorityFilter.length > 0 ? `Priority (${priorityFilter.length})` : 'Filter'}
                  </button>
                  {showFilterMenu && (
                    <div className={`absolute right-0 top-full mt-1.5 z-20 w-44 ${t.glass} ${t.shadow} rounded-xl p-3`}>
                      <div className={`text-[10px] uppercase tracking-wide mb-2 ${t.textFaint}`}>Priority</div>
                      {(['urgent', 'high', 'medium', 'low'] as WorkOrderPriority[]).map(p => {
                        const pcfg = priorityCfg(p);
                        const active = priorityFilter.includes(p);
                        return (
                          <button key={p} type="button" onClick={() => setPriorityFilter(prev => active ? prev.filter(x => x !== p) : [...prev, p])} className={`w-full flex items-center gap-2.5 py-1.5 text-left transition-colors ${t.hoverText}`}>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-brand-500 border-brand-500' : `border ${t.border}`}`}>{active && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}</div>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pcfg.color }} />
                            <span className={`text-xs capitalize ${t.textMuted}`}>{p}</span>
                          </button>
                        );
                      })}
                      {priorityFilter.length > 0 && <button type="button" onClick={() => setPriorityFilter([])} className={`mt-2 pt-2 border-t ${t.border} w-full text-center text-[10px] ${t.textFaint} ${t.hoverText}`}>Clear filter</button>}
                    </div>
                  )}
                </div>

                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search machine, artisan, WO#…" className="w-52" />

                {!panelMinimized && <ViewToggle value={woViewMode} onChange={setWoViewMode} options={[{ value: 'list', icon: List, label: 'List view' }, { value: 'grid', icon: LayoutGrid, label: 'Grid view' }]} />}

                {filtered.length > 0 && !panelMinimized && !bulkMode && woViewMode === 'list' && (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setExpandedWOs(new Set(filtered.map(w => String(w.id))))} title="Expand all" className={`${t.chipBg} ${t.hoverBg} rounded-lg px-2 py-1.5 ${t.textFaint} ${t.hoverText} text-[10px] transition-colors flex items-center gap-1`}><Maximize2 className="h-3 w-3" /> All</button>
                    <button type="button" onClick={() => setExpandedWOs(new Set())} title="Collapse all" className={`${t.chipBg} ${t.hoverBg} rounded-lg px-2 py-1.5 ${t.textFaint} ${t.hoverText} text-[10px] transition-colors flex items-center gap-1`}><Minimize2 className="h-3 w-3" /></button>
                  </div>
                )}

                {!panelMinimized && filtered.length > 0 && !bulkMode && <button type="button" onClick={() => setBulkMode(true)} className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><ClipboardCheck className="h-3.5 w-3.5" /> Select</button>}

                <button type="button" onClick={() => setPanelMinimized(m => !m)} title={panelMinimized ? 'Expand panel' : 'Minimize panel'} className={`${t.chipBg} ${t.hoverBg} ${t.textFaint} rounded-lg p-1.5 transition-colors`}>{panelMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
              </div>
            </div>

            {bulkMode && !panelMinimized && (
              <div className={`flex items-center gap-3 px-5 py-2.5 bg-brand-500/[0.06] border-b ${t.border}`}>
                <button type="button" onClick={() => selectedIds.size === filtered.length ? clearSelect() : selectAll()} className={`flex items-center gap-2 text-xs ${t.textMuted} ${t.hoverText} transition-colors`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-brand-500 border-brand-500' : selectedIds.size > 0 ? 'bg-brand-500/40 border-brand-500' : `border ${t.border} bg-transparent`}`}>
                    {selectedIds.size > 0 && <div className="w-2 h-0.5 bg-white rounded-full" />}
                  </div>
                  {selectedIds.size === 0 ? 'Select all' : `${selectedIds.size} selected`}
                </button>
                <div className="flex-1" />
                {selectedIds.size > 0 && <button type="button" onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 transition-colors"><Trash2 className="h-3.5 w-3.5" />Delete {selectedIds.size} work order{selectedIds.size !== 1 ? 's' : ''}</button>}
                <button type="button" onClick={exitBulk} className={`flex items-center gap-1 text-xs ${t.textFaint} ${t.hoverText} transition-colors px-2 py-1.5`}><X className="h-3.5 w-3.5" /> Cancel</button>
              </div>
            )}

            {!panelMinimized && (
              <div>
                {loading ? (
                  <LoadingState label="Loading work orders…" />
                ) : loadError ? (
                  // The page used to fall back to localStorage here and show
                  // stale browser data as though it were live.
                  <EmptyState
                    icon={AlertTriangle}
                    title="Could not load work orders"
                    message={loadError}
                    action={{ label: 'Try again', onClick: load }}
                  />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title={searchQuery || statusTab !== 'all' ? 'No matching work orders' : 'No work orders yet'}
                    message={searchQuery || statusTab !== 'all' ? 'Try clearing the search or filter' : 'Create the first one with "New Work Order"'}
                    action={!searchQuery && statusTab === 'all' ? { label: 'New Work Order', onClick: () => setShowCreateModal(true) } : undefined}
                  />
                ) : woViewMode === 'grid' ? (
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filtered.map(wo => <WorkOrderCard key={wo.id} workOrder={wo} onClick={() => setSelectedOrderId(wo.id)} onEdit={() => handleEditWO(wo)} />)}
                    </div>
                    <div className={`mt-3 pt-2 border-t ${t.border} text-xs ${t.textFaint}`}>{filtered.length} of {workOrders.length} work orders</div>
                  </div>
                ) : (
                  <div>
                    {filtered.map(wo => (
                      <div key={wo.id} className={`flex items-stretch transition-colors ${bulkMode && selectedIds.has(String(wo.id)) ? 'bg-brand-500/[0.05]' : ''}`}>
                        {bulkMode && (
                          <div className={`flex items-center px-4 border-r ${t.border}`}>
                            <button type="button" onClick={() => toggleSelect(wo.id)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedIds.has(String(wo.id)) ? 'bg-brand-500 border-brand-500' : `border ${t.border} bg-transparent`}`}>
                              {selectedIds.has(String(wo.id)) && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </button>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <WorkOrderRow workOrder={wo} onClick={bulkMode ? () => toggleSelect(wo.id) : () => setSelectedOrderId(wo.id)} isExpanded={!bulkMode && expandedWOs.has(String(wo.id))} onToggle={() => { if (!bulkMode) toggleWO(wo.id); }} onEdit={() => handleEditWO(wo)} />
                        </div>
                      </div>
                    ))}
                    <div className={`px-5 py-2.5 border-t ${t.border} flex items-center justify-between`}>
                      <span className={`text-xs ${t.textFaint}`}>{filtered.length} of {workOrders.length} work orders</span>
                      {bulkMode && selectedIds.size > 0 && <span className="text-brand-400/70 text-xs">{selectedIds.size} selected</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === 'analytics' && <AnalyticsPanel stats={stats} standalone rawOrders={workOrders} />}

      <CreateWorkOrderModal isOpen={showCreateModal} onClose={handleCloseCreateModal} onCreated={handleCreated} editingOrder={editingWO ?? undefined} allOrders={workOrders} />
      {selectedOrder && <WorkOrderDetailModal workOrder={selectedOrder} onClose={() => setSelectedOrderId(null)} onRefresh={load} onDelete={handleDelete} />}
      <CreateScheduleModal isOpen={showCreateSched} initial={editingSched} onClose={() => { setShowCreateSched(false); setEditingSched(null); }}
        onSave={async schedule => {
          try {
            if (editingSched) {
              const saved = await updateSchedule(schedule.id, schedule);
              setSchedules(prev => prev.map(x => x.id === schedule.id ? { ...x, ...saved } : x));
              toast.success('Schedule updated');
            } else {
              // Drop the browser-generated id; the server assigns the real one.
              const { id: _id, created_at: _c, ...rest } = schedule;
              const saved = await createSchedule(rest);
              setSchedules(prev => [saved, ...prev]);
              toast.success('Schedule created');
            }
            setShowCreateSched(false);
            setEditingSched(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not save schedule');
          }
        }} />
    </main>
  );
}

export default function MaintenancePage() {
  return (
    <AppShell>
      <MaintenancePageContent />
    </AppShell>
  );
}
