// frontend/app/maintenance/page.tsx
'use client';
import { useState, useEffect, useMemo, ElementType, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useTheme, PageHero, StatTile, StatusBadge, ViewToggle, FormField, FormActions,
  useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
} from '@/components/shared/theme';
import {
  Wrench, Plus, RefreshCw, CheckCircle2, Clock, PlayCircle, PauseCircle,
  Search, ChevronDown, ChevronUp, ChevronRight, X, XCircle, AlertCircle,
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
interface SpareRegisterItem {
  id: number | string; stock_code: string; description: string; unit_price: number;
  unit_of_measure?: string; category?: string; current_quantity?: number;
}

let _empCache: EmployeeItem[] = [];
let _empFetched = false;
let _eqCache: EquipmentItem[] = [];
let _eqFetched = false;
let _spCache: SpareRegisterItem[] = [];
let _spFetched = false;

interface MaintenanceSchedule {
  id: string; name: string; equipment_info: string; to_department: string; allocated_to: string;
  authorising_foreman: string; estimated_hours: string; job_request_details: string;
  job_instructions: string; priority: WorkOrderPriority; recurrence_type: RecurrenceType;
  recurrence_dow: number; recurrence_dom: number; recurrence_months: number[];
  specific_dates: string[]; advance_days: number; active: boolean; next_due_date: string;
  last_generated: string; created_at: string;
}
interface EquipmentItem { id: string; equipment_id: string; name: string; category?: string; department?: string; location?: string; status?: string; }
interface EmployeeItem { id: string; employee_id?: string; first_name: string; last_name: string; designation?: string; department?: string; section?: string; }

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
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const LOCAL_FIELDS: (keyof WorkOrder)[] = ['classification', 'classification_custom', 'failure_mode', 'discipline', 'trade', 'spares_used'];

function lsRead(): WorkOrder[] { if (typeof window === 'undefined') return []; return JSON.parse(localStorage.getItem('maint_work_orders') || '[]'); }
function lsWrite(list: WorkOrder[]) { localStorage.setItem('maint_work_orders', JSON.stringify(list)); }
function lsMergeIn(patch: Partial<WorkOrder> & { id: string | number }) {
  const list = lsRead();
  const idx = list.findIndex(w => String(w.id) === String(patch.id));
  if (idx >= 0) list[idx] = { ...list[idx], ...patch }; else list.unshift(patch as WorkOrder);
  lsWrite(list);
}
function lsPatchFields(id: string, updates: Record<string, unknown>) {
  const list = lsRead();
  lsWrite(list.map(w => String(w.id) === String(id) ? { ...w, ...updates } : w));
}

async function getWorkOrders(): Promise<WorkOrder[]> {
  const local = lsRead();
  const localMap = new Map(local.map(w => [String(w.id), w]));
  try {
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders`);
    if (!res.ok) throw new Error(`${res.status}`);
    const apiData: WorkOrder[] = await res.json();
    if (!Array.isArray(apiData)) return local;
    const apiIds = new Set(apiData.map(w => String(w.id)));
    const localOnly = local.filter(w => !apiIds.has(String(w.id)));
    const merged = apiData.map(w => {
      const loc = localMap.get(String(w.id));
      if (!loc) return w;
      const extra: Partial<WorkOrder> = {};
      for (const f of LOCAL_FIELDS) {
        const apiVal = w[f]; const locVal = loc[f];
        (extra as Record<string, unknown>)[f] = (apiVal !== null && apiVal !== undefined) ? apiVal : locVal;
      }
      return { ...w, ...extra };
    });
    return [...merged, ...localOnly];
  } catch { return local; }
}

async function createWorkOrder(data: Record<string, unknown>): Promise<{ success: boolean; data?: WorkOrder }> {
  try {
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`${res.status}`);
    const result = await res.json();
    const full = { ...data, ...result } as WorkOrder;
    lsMergeIn(full);
    return { success: true, data: full };
  } catch {
    const wo = { ...data, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as WorkOrder;
    lsMergeIn(wo);
    return { success: true, data: wo };
  }
}
async function updateWorkOrder(id: string, updates: Record<string, unknown>): Promise<{ success: boolean }> {
  const ts = new Date().toISOString();
  try {
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...updates, updated_at: ts }) });
    if (!res.ok) throw new Error(`${res.status}`);
    lsPatchFields(id, { ...updates, updated_at: ts });
    return { success: true };
  } catch { lsPatchFields(id, { ...updates, updated_at: ts }); return { success: true }; }
}
async function deleteWorkOrder(id: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${res.status}`);
    return { success: true };
  } catch {
    const prev: WorkOrder[] = JSON.parse(localStorage.getItem('maint_work_orders') || '[]');
    localStorage.setItem('maint_work_orders', JSON.stringify(prev.filter(w => w.id !== id)));
    return { success: true };
  }
}

// ==================== SCHEDULE STORAGE ====================
const SCHED_KEY = 'maint_schedules';
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(n: number): string { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function loadSchedules(): MaintenanceSchedule[] { if (typeof window === 'undefined') return []; return JSON.parse(localStorage.getItem(SCHED_KEY) || '[]'); }
function persistSchedules(list: MaintenanceSchedule[]) { localStorage.setItem(SCHED_KEY, JSON.stringify(list)); }

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
function getNextOccurrence(s: MaintenanceSchedule, from: Date): Date {
  const d = new Date(from); d.setHours(0, 0, 0, 0);
  switch (s.recurrence_type) {
    case 'daily': { d.setDate(d.getDate() + 1); return d; }
    case 'weekly': { d.setDate(d.getDate() + 7); return d; }
    case 'biweekly': { d.setDate(d.getDate() + 14); return d; }
    case 'monthly': return new Date(d.getFullYear(), d.getMonth() + 1, s.recurrence_dom);
    case 'quarterly': {
      const months = [...(s.recurrence_months ?? [0, 3, 6, 9])].sort((a, b) => a - b);
      const cur = d.getMonth();
      const next = months.find(m => m > cur);
      return next !== undefined ? new Date(d.getFullYear(), next, s.recurrence_dom) : new Date(d.getFullYear() + 1, months[0] ?? 0, s.recurrence_dom);
    }
    case 'yearly': { const month = s.recurrence_months?.[0] ?? 0; return new Date(d.getFullYear() + 1, month, s.recurrence_dom); }
    case 'custom': {
      const todayStr = d.toISOString().split('T')[0];
      const future = (s.specific_dates ?? []).filter(dt => dt > todayStr).sort();
      return future.length > 0 ? new Date(future[0] + 'T00:00:00') : new Date(9999, 0, 1);
    }
    default: return new Date(9999, 0, 1);
  }
}
function isScheduleDue(s: MaintenanceSchedule): boolean {
  if (!s.active || !s.next_due_date) return false;
  const today = new Date().toISOString().split('T')[0];
  if (s.last_generated === today) return false;
  const dueDate = new Date(s.next_due_date + 'T00:00:00');
  dueDate.setDate(dueDate.getDate() - (s.advance_days || 0));
  return dueDate.toISOString().split('T')[0] <= today;
}

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
    overdue: orders.filter(o => o.due_date && o.status !== 'completed' && new Date(o.due_date) < new Date()).length,
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
          <button type="button" onClick={accept} className="text-[11px] text-blue-400 bg-blue-500/[0.08] hover:bg-blue-500/[0.16] px-2 py-0.5 rounded transition-colors max-w-[240px] truncate">{ghost.trim()}</button>
          <span className={`text-[10px] hidden sm:inline ${t.textFaint}`}>or click to accept</span>
        </div>
      )}
    </FormField>
  );
}

// ==================== AUTOCOMPLETE HELPERS ====================
function useEmployees() {
  const [list, setList] = useState<EmployeeItem[]>(_empCache);
  useEffect(() => {
    if (_empFetched) return;
    fetch(`${API_BASE}/api/employees`).then(r => r.json()).then((d: EmployeeItem[]) => { if (Array.isArray(d)) { _empCache = d; setList(d); } _empFetched = true; }).catch(() => { _empFetched = true; });
  }, []);
  return list;
}
function useEquipment() {
  const [list, setList] = useState<EquipmentItem[]>(_eqCache);
  useEffect(() => {
    if (_eqFetched) return;
    fetch(`${API_BASE}/api/equipment`).then(r => r.json()).then((d: EquipmentItem[]) => { if (Array.isArray(d)) { _eqCache = d; setList(d); } _eqFetched = true; }).catch(() => { _eqFetched = true; });
  }, []);
  return list;
}
function useSpares() {
  const [list, setList] = useState<SpareRegisterItem[]>(_spCache);
  useEffect(() => {
    if (_spFetched) return;
    fetch(`${API_BASE}/api/spares?limit=500`).then(r => r.json()).then((d) => { const items: SpareRegisterItem[] = Array.isArray(d) ? d : (d?.results ?? []); _spCache = items; setList(items); _spFetched = true; }).catch(() => { _spFetched = true; });
  }, []);
  return list;
}

function ACDropdown({ show, children }: { show: boolean; children: React.ReactNode }) {
  const t = useTheme();
  if (!show) return null;
  return (
    <div className={`absolute z-50 w-full mt-1 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
      <div className="max-h-52 overflow-y-auto">{children}</div>
    </div>
  );
}

function PersonAutocomplete({ id, label, value, onChange, placeholder }: { id?: string; label?: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const t = useTheme();
  const employees = useEmployees();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0 ? employees.slice(0, 8) : employees.filter(e => {
    const full = `${e.first_name} ${e.last_name}`.toLowerCase();
    return full.includes(q) || (e.employee_id || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q);
  }).slice(0, 8);

  return (
    <FormField label={label || ''}>
      <div className="relative" ref={ref}>
        <input id={id} value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Type to search employees, or enter name…'}
          className={`w-full rounded-md px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`} />
        <ACDropdown show={open && suggestions.length > 0}>
          {suggestions.map(e => {
            const full = `${e.first_name} ${e.last_name}`;
            return (
              <button key={e.id} type="button" onMouseDown={() => { onChange(full); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 text-[10px] text-blue-400 font-bold uppercase">{e.first_name?.[0]}{e.last_name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{full}</div>
                  <div className={`text-[10px] truncate ${t.textFaint}`}>{e.designation}{e.department ? ` · ${e.department}` : ''}{e.section ? ` · ${e.section}` : ''}</div>
                </div>
                {e.employee_id && <span className={`text-[10px] flex-shrink-0 ${t.textFaint}`}>{e.employee_id}</span>}
              </button>
            );
          })}
        </ACDropdown>
      </div>
    </FormField>
  );
}

function EquipmentAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const equipment = useEquipment();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const fragment = value.split(',').pop()?.trimStart() ?? '';
  const q = fragment.toLowerCase();
  const suggestions = q.length === 0 ? equipment.slice(0, 8) : equipment.filter(e =>
    (e.name || '').toLowerCase().includes(q) || (e.equipment_id || '').toLowerCase().includes(q) ||
    (e.department || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const pick = (eq: EquipmentItem) => {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    parts.splice(parts.length > 0 && !value.endsWith(',') ? parts.length - 1 : parts.length, 1, eq.name || eq.equipment_id);
    onChange(parts.join(', '));
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative" ref={ref}>
        <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Type machine name — comma-separate for multiple…" className={`w-full rounded-md px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`} />
        <ACDropdown show={open && suggestions.length > 0}>
          {suggestions.map(eq => (
            <button key={eq.id} type="button" onMouseDown={() => pick(eq)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{eq.name}</div>
                <div className={`text-[10px] truncate ${t.textFaint}`}>{eq.equipment_id}{eq.department ? ` · ${eq.department}` : ''}{eq.location ? ` · ${eq.location}` : ''}</div>
              </div>
              <StatusBadge color={eq.status === 'operational' ? '#4ade80' : '#fb923c'} label={eq.status || 'unknown'} />
            </button>
          ))}
        </ACDropdown>
      </div>
      {value.includes(',') && <p className="text-[10px] text-blue-400/70 px-0.5">{value.split(',').filter(s => s.trim()).length} machines — will create one work order each</p>}
    </div>
  );
}

function SpareAutocomplete({ value, onChange, onSelect, placeholder }: { value: string; onChange: (v: string) => void; onSelect: (item: SpareRegisterItem) => void; placeholder?: string; }) {
  const t = useTheme();
  const spares = useSpares();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0 ? spares.slice(0, 8) : spares.filter(s =>
    (s.description || '').toLowerCase().includes(q) || (s.stock_code || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)
  ).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Search spares register or type manually…'} className={`w-full rounded-md px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`} />
      <ACDropdown show={open && (suggestions.length > 0 || spares.length === 0)}>
        {spares.length === 0 ? (
          <div className={`px-3 py-3 text-xs flex items-center gap-2 ${t.textFaint}`}><RefreshCw className="h-3 w-3 animate-spin" /> Loading spares register…</div>
        ) : suggestions.length === 0 ? (
          <div className={`px-3 py-3 text-xs ${t.textFaint}`}>No matches — value will be saved as typed</div>
        ) : suggestions.map(s => (
          <button key={s.id} type="button" onMouseDown={() => { onSelect(s); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{s.description}</div>
              <div className={`text-[10px] truncate ${t.textFaint}`}>{s.stock_code}{s.category ? ` · ${s.category}` : ''}{s.unit_of_measure ? ` · ${s.unit_of_measure}` : ''}{s.current_quantity !== undefined ? ` · Stock: ${s.current_quantity}` : ''}</div>
            </div>
            <span className="text-amber-400 text-xs font-mono flex-shrink-0">R {(s.unit_price || 0).toFixed(2)}</span>
          </button>
        ))}
      </ACDropdown>
    </div>
  );
}

// ==================== CREATE / EDIT WORK ORDER MODAL ====================
interface CreateModalProps { isOpen: boolean; onClose: () => void; onCreated: (newOrder: WorkOrder) => void; editingOrder?: WorkOrder; allOrders?: WorkOrder[]; }

function CreateWorkOrderModal({ isOpen, onClose, onCreated, editingOrder, allOrders = [] }: CreateModalProps) {
  const t = useTheme();
  const blankForm = () => ({
    equipment_info: '', to_department: 'Engineering', allocated_to: '', priority: 'medium' as WorkOrderPriority,
    estimated_hours: '2', job_request_details: '', requested_by: '', authorising_foreman: '', job_instructions: '',
    date_raised: new Date().toISOString().split('T')[0], classification: '' as WOClassification | '',
  });
  const fromOrder = (wo: WorkOrder) => ({
    equipment_info: wo.equipment_info || '', to_department: wo.to_department || 'Engineering',
    allocated_to: wo.allocated_to || wo.artisan_name || '', priority: wo.priority || 'medium' as WorkOrderPriority,
    estimated_hours: wo.estimated_hours || '2', job_request_details: wo.job_request_details || '',
    requested_by: wo.requested_by || '', authorising_foreman: wo.authorising_foreman || wo.responsible_foreman || '',
    job_instructions: wo.job_instructions || '', date_raised: wo.date_raised || new Date().toISOString().split('T')[0],
    classification: (wo.classification || '') as WOClassification | '',
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
        ...(form.classification ? { classification: form.classification } : {}),
      };
      const { success } = await updateWorkOrder(editingOrder.id, updates);
      setSaving(false);
      if (success) { toast.success('Work order updated'); onCreated({ ...editingOrder, ...updates } as WorkOrder); onClose(); }
      else toast.error('Failed to update work order');
      return;
    }

    const created: WorkOrder[] = [];
    for (let i = 0; i < machines.length; i++) {
      const result = await createWorkOrder({
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
        ...(form.classification ? { classification: form.classification } : {}),
      });
      if (result.success && result.data) created.push(result.data);
    }
    setSaving(false);
    if (created.length > 0) {
      toast.success(created.length > 1 ? `${created.length} work orders created` : 'Work order created');
      setForm(blankForm());
      created.forEach(wo => onCreated(wo));
      onClose();
    } else toast.error('Failed to create work order');
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={isEditing ? `Edit Work Order — ${editingOrder?.work_order_number}` : 'New Work Order'} accent="violet" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <FormField label={<>Machine / Equipment <span className={`ml-1.5 font-normal ${t.textFaint}`}>— comma-separate for multiple</span></> as unknown as string} required>
          <EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} />
        </FormField>
        <FormField label="Department"><Input value={form.to_department} onChange={e => set('to_department', e.target.value)} placeholder="Engineering" className={`h-9 ${t.inputBg}`} /></FormField>
        <PersonAutocomplete id="cwo-artisan" label="Allocated To (Artisan)" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Priority">
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Est. Hours"><Input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
          <FormField label="Date Raised"><Input type="date" title="Date raised" value={form.date_raised} onChange={e => set('date_raised', e.target.value)} className={`h-9 ${t.inputBg}`} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PersonAutocomplete id="cwo-reqby" label="Requested By" value={form.requested_by} onChange={v => set('requested_by', v)} placeholder="Who is requesting this work?" />
          <PersonAutocomplete id="cwo-foreman" label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
        </div>
        <FormField label="Job Request — What to Do" required><Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)} placeholder="Describe exactly what the artisan needs to do…" rows={4} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label="Special Instructions (optional)"><Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)} placeholder="Safety notes, special tools, access requirements…" rows={2} className={`resize-none ${t.inputBg}`} /></FormField>
        <FormField label={<>Work Order Classification <span className={`font-normal ${t.textFaint}`}>(optional — artisan can update later)</span></> as unknown as string}>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'planned_maintenance', label: 'Planned Maint.' }, { key: 'project', label: 'Project' }, { key: 'breakdown', label: 'Breakdown' }, { key: 'custom', label: 'Other / Custom' }] as { key: WOClassification; label: string }[]).map(opt => (
              <button key={opt.key} type="button" onClick={() => set('classification', form.classification === opt.key ? '' : opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.classification === opt.key ? 'bg-blue-500/20 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
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

function InfoField({ label, value }: { label: string; value?: string | null }) {
  const t = useTheme();
  return <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div><div className={`text-sm ${t.textMuted}`}>{value || '—'}</div></div>;
}

function WorkOrderDetailModal({ workOrder, onClose, onRefresh, onDelete }: DetailModalProps) {
  const t = useTheme();
  const [s1Open, setS1Open] = useState(false);
  const [s2Open, setS2Open] = useState(true);
  const [s3Open, setS3Open] = useState(true);
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
    const result = await updateWorkOrder(workOrder.id, payload);
    setSavingA(false);
    if (result.success) { toast.success('Artisan report saved'); await onRefresh(); }
  };

  const saveForeman = async () => {
    setSavingF(true);
    if (foreman.foreman_name) localStorage.setItem('maint_foreman_name', foreman.foreman_name);
    const result = await updateWorkOrder(workOrder.id, foreman);
    setSavingF(false);
    if (result.success) { toast.success('Foreman sign-off saved'); await onRefresh(); }
  };

  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);

  return (
    <CenterModal open onClose={onClose} title={`#${workOrder.work_order_number}`} subtitle={workOrder.equipment_info} accent="violet" width="max-w-3xl">
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 pb-3">
          <StatusBadge color={scfg.color} label={scfg.label} dot />
          <StatusBadge color={pcfg.color} label={pcfg.label} />
        </div>
      </div>
      <div className="px-5 pb-5 space-y-4">

        {/* SECTION 1: Work Request */}
        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
            <FileText className="h-4 w-4 text-blue-400" />
            <span className={`font-semibold text-sm ${t.textPrimary}`}>Work Request</span>
            <span className={`ml-auto text-xs ${t.textFaint}`}>supervisor-issued · read-only</span>
          </div>
          <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-x-6 gap-y-2">
            <InfoField label="Machine" value={workOrder.equipment_info} />
            <InfoField label="Allocated To" value={workOrder.allocated_to || workOrder.artisan_name} />
            <InfoField label="Date Raised" value={workOrder.date_raised} />
            {workOrder.job_request_details && (
              <div className="col-span-3 mt-1">
                <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Job</div>
                <div className={`text-xs leading-relaxed ${t.textMuted} ${s1Open ? '' : 'line-clamp-2'}`}>{workOrder.job_request_details}</div>
              </div>
            )}
          </div>
          {s1Open && (
            <div className={`px-4 pb-3 pt-2 border-t ${t.border} grid grid-cols-2 gap-x-8 gap-y-3 mt-1`}>
              <InfoField label="Department" value={workOrder.to_department} />
              <InfoField label="Estimated Hours" value={workOrder.estimated_hours ? `${workOrder.estimated_hours} h` : ''} />
              <InfoField label="Requested By" value={workOrder.requested_by} />
              <InfoField label="Authorising Foreman" value={workOrder.authorising_foreman} />
              {workOrder.job_instructions && <div className="col-span-2"><InfoField label="Special Instructions" value={workOrder.job_instructions} /></div>}
            </div>
          )}
          <button type="button" onClick={() => setS1Open(o => !o)} className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t ${t.border} ${t.hoverBgSoft} transition-colors text-blue-400/70 hover:text-blue-400 text-xs`}>
            {s1Open ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> View full details</>}
          </button>
        </div>

        {/* SECTION 2: Artisan Report */}
        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <button type="button" className={`w-full flex items-center gap-2 px-4 py-3 border-b ${t.border} ${t.hoverBgSoft} transition-colors`} onClick={() => setS2Open(o => !o)}>
            <HardHat className="h-4 w-4 text-cyan-400" />
            <span className={`font-semibold text-sm ${t.textPrimary}`}>Artisan Report</span>
            <span className={`ml-auto text-xs mr-2 ${t.textFaint}`}>Fill in after completing work</span>
            {s2Open ? <ChevronUp className={`h-4 w-4 ${t.textFaint}`} /> : <ChevronDown className={`h-4 w-4 ${t.textFaint}`} />}
          </button>

          {s2Open && (
            <div className="px-4 py-4 space-y-4">
              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><Layers className="h-3.5 w-3.5" /> Work Order Classification</div>
                <div className="flex flex-wrap gap-1.5">
                  {([{ v: 'planned_maintenance', label: 'Planned Maintenance' }, { v: 'project', label: 'Project' }, { v: 'breakdown', label: 'Breakdown' }, { v: 'custom', label: 'Other / Custom' }] as { v: WOClassification; label: string }[]).map(opt => (
                    <button key={opt.v} type="button" onClick={() => setA('classification', opt.v)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${artisan.classification === opt.v ? 'bg-blue-500/20 text-blue-400 font-medium' : `${t.hoverBg} ${t.textFaint}`}`}>
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
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors ${artisan.discipline === d ? 'bg-blue-500/20 text-blue-400 font-medium' : `${t.hoverBg} ${t.textFaint}`}`}>
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
                <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><Timer className="h-3.5 w-3.5" /> Time Tracking</div>
                <div className="grid grid-cols-3 gap-3">
                  <ThemedInput id="a-t-start" label="Time Started" type="time" value={artisan.time_work_started} onChange={v => setA('time_work_started', v)} />
                  <ThemedInput id="a-t-finish" label="Time Finished" type="time" value={artisan.time_work_finished} onChange={v => setA('time_work_finished', v)} />
                  <ThemedInput id="a-t-total" label="Total Time (auto)" value={artisan.total_time_worked} onChange={v => setA('total_time_worked', v)} placeholder="auto" readOnly={!!(artisan.time_work_started && artisan.time_work_finished)} />
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${t.textFaint}`}>Overtime</span><NAToggle checked={otNA} onChange={setOtNA} label={otNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
                  {otNA ? <p className="text-orange-400/60 text-xs italic px-0.5">No overtime for this job.</p> : (
                    <div className="grid grid-cols-3 gap-3">
                      <ThemedInput id="a-ot-start" label="OT Start" type="time" value={artisan.overtime_start_time} onChange={v => setA('overtime_start_time', v)} />
                      <ThemedInput id="a-ot-end" label="OT End" type="time" value={artisan.overtime_end_time} onChange={v => setA('overtime_end_time', v)} />
                      <ThemedInput id="a-ot-hrs" label="OT Hours (auto)" value={artisan.overtime_hours} onChange={v => setA('overtime_hours', v)} placeholder="auto" readOnly={!!(artisan.overtime_start_time && artisan.overtime_end_time)} />
                    </div>
                  )}
                </div>
                <div className={`border-t ${t.border} pt-3 space-y-2`}>
                  <div className="flex items-center gap-2"><span className={`text-xs font-medium ${t.textFaint}`}>Delays</span><NAToggle checked={delayNA} onChange={setDelayNA} label={delayNA ? '↩ Undo N/A' : 'Mark as N/A'} /></div>
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
                <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><Package className="h-3.5 w-3.5 text-amber-400/80" /> Spares Used</div>
                <div className="grid grid-cols-[1fr_70px_80px_auto] gap-2 items-end">
                  <FormField label="Spare / Part"><SpareAutocomplete value={newSpare.name} onChange={v => setNewSpare(s => ({ ...s, name: v }))} onSelect={item => setNewSpare(s => ({ ...s, name: item.description, unit_cost: String(item.unit_price ?? 0) }))} placeholder="Search spares register or type…" /></FormField>
                  <FormField label="Qty"><input type="number" min="0.01" step="0.01" value={newSpare.quantity} onChange={e => setNewSpare(s => ({ ...s, quantity: e.target.value }))} className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <FormField label="Unit Cost (R)"><input type="number" min="0" step="0.01" value={newSpare.unit_cost} onChange={e => setNewSpare(s => ({ ...s, unit_cost: e.target.value }))} className={`w-full rounded px-2 py-1.5 text-xs outline-none transition-colors ${t.inputBg}`} /></FormField>
                  <button type="button" onClick={addArtisanSpare} className="h-[30px] px-2.5 bg-amber-500/15 hover:bg-amber-500/25 rounded text-amber-400 text-xs font-medium transition-colors">Add</button>
                </div>
                {artisanSpares.length > 0 && (
                  <div className="space-y-1.5">
                    {artisanSpares.map(s => (
                      <div key={s.id} className={`flex items-center gap-2 ${t.hoverBgSoft} rounded px-2.5 py-1.5`}>
                        <Package className="h-3 w-3 text-amber-400/60 flex-shrink-0" />
                        <span className={`flex-1 text-xs truncate ${t.textMuted}`}>{s.name}</span>
                        <span className={`text-xs ${t.textFaint}`}>×{s.quantity}</span>
                        <span className="text-amber-400/80 text-xs font-mono">R {(s.quantity * s.unit_cost).toFixed(2)}</span>
                        <button type="button" onClick={() => setArtisanSpares(p => p.filter(x => x.id !== s.id))} className={`${t.textFaint} hover:text-rose-500 transition-colors ml-0.5`}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <div className="flex justify-end"><span className="text-amber-400/90 text-xs font-mono font-semibold">Total: ${artisanSpares.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}</span></div>
                  </div>
                )}
              </div>

              <div className={`border ${t.border} rounded-lg p-3 space-y-3`}>
                <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><Signature className="h-3.5 w-3.5" /> Artisan Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete id="a-name" label="Artisan Name" value={artisan.artisan_name} onChange={v => setA('artisan_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="a-sign" label="Signature (type name)" value={artisan.artisan_sign} onChange={v => setA('artisan_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="a-date" label="Date" type="date" value={artisan.artisan_date} onChange={v => setA('artisan_date', v)} />
                </div>
              </div>

              <Button onClick={saveArtisan} disabled={savingA} className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400"><Save className="h-3.5 w-3.5 mr-2" />{savingA ? 'Saving…' : 'Save Artisan Report'}</Button>
            </div>
          )}
        </div>

        {/* SECTION 3: Foreman Sign-off */}
        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <button type="button" className={`w-full flex items-center gap-2 px-4 py-3 border-b ${t.border} ${t.hoverBgSoft} transition-colors`} onClick={() => setS3Open(o => !o)}>
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            <span className={`font-semibold text-sm ${t.textPrimary}`}>Foreman Sign-off</span>
            <span className={`ml-auto text-xs mr-2 ${t.textFaint}`}>Foreman review &amp; approval</span>
            {s3Open ? <ChevronUp className={`h-4 w-4 ${t.textFaint}`} /> : <ChevronDown className={`h-4 w-4 ${t.textFaint}`} />}
          </button>
          {s3Open && (
            <div className="px-4 py-4 space-y-4">
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
                <div className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}><Signature className="h-3.5 w-3.5" /> Foreman Sign-off</div>
                <div className="grid grid-cols-3 gap-3">
                  <PersonAutocomplete id="f-name" label="Foreman Name" value={foreman.foreman_name} onChange={v => setF('foreman_name', v)} placeholder="Type to search employees…" />
                  <ThemedInput id="f-sign" label="Signature (type name)" value={foreman.foreman_sign} onChange={v => setF('foreman_sign', v)} placeholder="Type name" autoComplete="name" />
                  <ThemedInput id="f-date" label="Date" type="date" value={foreman.foreman_date} onChange={v => setF('foreman_date', v)} />
                </div>
              </div>
              <Button onClick={saveForeman} disabled={savingF} className="w-full bg-violet-500/15 hover:bg-violet-500/25 text-violet-400"><Save className="h-3.5 w-3.5 mr-2" />{savingF ? 'Saving…' : 'Save Foreman Sign-off'}</Button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={() => { if (confirm('Delete this work order? This cannot be undone.')) { onDelete(workOrder.id); onClose(); } }} className="flex items-center gap-1.5 text-rose-500/70 hover:text-rose-500 text-xs transition-colors">
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
    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400/90 text-[10px] px-2 py-0.5 rounded-full">
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
        <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400/80 flex-shrink-0" />
        <span className={`text-xs font-medium ${t.textMuted}`}>Filter Analytics</span>
        {activeCount > 0 && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-1.5 py-px rounded-full">{activeCount}</span>}
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
              <span className="text-blue-400/80">{a.hours.toFixed(1)}h</span>
              {a.sparesCost > 0 && <span className="text-amber-400/80">${a.sparesCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
              <span className={t.textFaint}>({a.count} WO)</span>
            </div>
          </div>
          <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden`}><div className="h-full rounded-full bg-blue-400/50 transition-all duration-500" style={{ width: `${(a.hours / maxHours) * 100}%` }} /></div>
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
          { label: 'Breakdown Hrs', value: `${activeStats.artisanCost.reduce((a, x) => a + x.hours, 0).toFixed(1)}h`, color: 'text-blue-400', sub: undefined },
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
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><Layers className="h-3.5 w-3.5 text-blue-400" /> WO Classification</div>
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
          <div className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${t.textMuted}`}><HardHat className="h-3.5 w-3.5 text-blue-400" /> Artisan Hours (Breakdowns)</div>
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
            <InfoField label="Artisan" value={artisanDisplay} />
            <InfoField label="Foreman" value={foremanDisplay} />
            <InfoField label="Time Worked" value={workOrder.total_time_worked} />
            <InfoField label="Est. Hours" value={workOrder.estimated_hours ? `${workOrder.estimated_hours}h` : undefined} />
            {(workOrder.work_done_details || workOrder.job_request_details) && (
              <div className="col-span-2 sm:col-span-4">
                <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{workOrder.work_done_details ? 'Work Done' : 'Job Request'}</div>
                <div className={`text-xs leading-relaxed line-clamp-3 ${t.textMuted}`}>{workOrder.work_done_details || workOrder.job_request_details}</div>
              </div>
            )}
            {workOrder.cause_of_failure && <div className="col-span-2 sm:col-span-4"><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>Cause of Failure</div><div className={`text-xs line-clamp-2 ${t.textMuted}`}>{workOrder.cause_of_failure}</div></div>}
            {workOrder.failure_mode && <InfoField label="Failure Mode" value={workOrder.failure_mode} />}
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
          <div className="mt-3 flex justify-end"><button type="button" onClick={onClick} className="text-blue-400/80 hover:text-blue-400 text-xs flex items-center gap-1.5 transition-colors">Open full details <ChevronRight className="h-3 w-3" /></button></div>
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
      <div className="text-blue-400/70 text-xs flex-shrink-0 hidden md:block w-52 truncate"><Repeat2 className="h-3 w-3 inline mr-1 opacity-60" />{recurrenceLabel(schedule)}</div>
      <div className="flex-shrink-0 hidden sm:block text-right"><div className={`text-[10px] uppercase tracking-wide ${t.textFaint}`}>Next</div><div className={`text-xs ${t.textMuted}`}>{schedule.next_due_date || '—'}</div></div>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pcfg.color }} title={pcfg.label} />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={onRunNow} title="Create work order(s) from this schedule now" className="text-[10px] px-2.5 py-0.5 rounded transition-colors text-blue-400 bg-blue-500/[0.10] hover:bg-blue-500/[0.20] whitespace-nowrap font-medium">Create Work Order(s)</button>
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
          <PersonAutocomplete id="cs-artisan" label="Allocated To" value={form.allocated_to} onChange={v => set('allocated_to', v)} />
          <PersonAutocomplete id="cs-foreman" label="Authorising Foreman" value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
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
          <div className={`flex items-center gap-2 text-sm font-medium ${t.textMuted}`}><Repeat2 className="h-4 w-4 text-blue-400" /> Recurrence</div>
          <div className="flex flex-wrap gap-1.5">
            {(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'] as RecurrenceType[]).map(rt => (
              <button key={rt} type="button" onClick={() => set('recurrence_type', rt)} className={`px-3 py-1 rounded-lg text-xs transition-colors capitalize ${form.recurrence_type === rt ? 'bg-blue-500/20 text-blue-400 font-medium' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{rt}</button>
            ))}
          </div>
          {(form.recurrence_type === 'weekly' || form.recurrence_type === 'biweekly') && (
            <FormField label="Day of Week">
              <div className="flex gap-1">{DOW.map((d, i) => <button key={d} type="button" onClick={() => set('recurrence_dow', i)} className={`flex-1 py-1.5 rounded text-[11px] transition-colors ${form.recurrence_dow === i ? 'bg-blue-500/20 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{d.slice(0, 3)}</button>)}</div>
            </FormField>
          )}
          {(form.recurrence_type === 'monthly' || form.recurrence_type === 'quarterly' || form.recurrence_type === 'yearly') && (
            <FormField label="Day of Month (1–28)"><Input type="number" min="1" max="28" value={form.recurrence_dom} onChange={e => set('recurrence_dom', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} className={`h-9 ${t.inputBg}`} /></FormField>
          )}
          {form.recurrence_type === 'quarterly' && (
            <FormField label="Which months"><div className="flex flex-wrap gap-1.5">{MON.map((m, i) => <button key={m} type="button" onClick={() => toggleMonth(i)} className={`px-2.5 py-1 rounded text-[11px] transition-colors ${form.recurrence_months.includes(i) ? 'bg-blue-500/20 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>{m}</button>)}</div></FormField>
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
                <Button type="button" onClick={addDate} size="sm" className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400">Add</Button>
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
    if (!confirm(`Permanently delete ${count} work order${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    let failed = 0;
    for (const id of selectedIds) { const { success } = await deleteWorkOrder(id); if (!success) failed++; }
    exitBulk();
    await load();
    if (failed === 0) toast.success(`${count} work order${count !== 1 ? 's' : ''} deleted`);
    else toast.error(`${count - failed} deleted, ${failed} failed`);
  };

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [schedPanelOpen, setSchedPanelOpen] = useState(true);
  const [showCreateSched, setShowCreateSched] = useState(false);
  const [editingSched, setEditingSched] = useState<MaintenanceSchedule | null>(null);

  type SortBy = 'date-desc' | 'date-asc' | 'priority' | 'machine' | 'status';
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const selectedOrder = useMemo(() => selectedOrderId ? workOrders.find(w => String(w.id) === String(selectedOrderId)) ?? null : null, [workOrders, selectedOrderId]);

  const load = async () => { setLoading(true); const data = await getWorkOrders(); setWorkOrders(data); setLoading(false); };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loaded = loadSchedules();
    setSchedules(loaded);
    const today = new Date().toISOString().split('T')[0];
    let updated = [...loaded];
    let anyGenerated = false;

    const autoGenerate = async () => {
      for (const sched of loaded) {
        if (!isScheduleDue(sched)) continue;
        const result = await createWorkOrder({
          work_order_number: `WO-${Date.now().toString().slice(-6)}`, equipment_info: sched.equipment_info,
          to_department: sched.to_department, allocated_to: sched.allocated_to, authorising_foreman: sched.authorising_foreman,
          estimated_hours: sched.estimated_hours, job_request_details: sched.job_request_details,
          job_instructions: sched.job_instructions, priority: sched.priority,
          to_section: '', from_department: '', from_section: '', account_number: '', user_lab_today: '',
          date_raised: sched.next_due_date, time_raised: new Date().toTimeString().slice(0, 5),
          job_type: { operational: false, maintenance: true, mining: false },
          requested_by: 'Auto-generated', authorising_engineer: '', responsible_foreman: sched.authorising_foreman, manpower: [],
          work_done_details: '', cause_of_failure: '', delay_details: '',
          artisan_name: sched.allocated_to, artisan_sign: '', artisan_date: '',
          foreman_name: '', foreman_sign: '', foreman_date: '',
          time_work_started: '', time_work_finished: '', total_time_worked: '',
          overtime_start_time: '', overtime_end_time: '', overtime_hours: '',
          delay_from_time: '', delay_to_time: '', total_delay_hours: '',
          status: 'pending', progress: 0,
        });
        if (result.success) {
          const next = getNextOccurrence(sched, new Date(sched.next_due_date + 'T00:00:00'));
          updated = updated.map(x => x.id === sched.id ? { ...x, last_generated: today, next_due_date: next.toISOString().split('T')[0] } : x);
          anyGenerated = true;
        }
      }
      if (anyGenerated) { setSchedules(updated); persistSchedules(updated); toast.success('Recurring maintenance work orders generated'); load(); }
    };
    autoGenerate();
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
    for (let i = 0; i < machines.length; i++) {
      const result = await createWorkOrder({
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
      if (result.success && result.data) created.push(result.data);
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
            {mainTab === 'workorders' && <button type="button" onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all"><Plus className="h-3.5 w-3.5" /> New Work Order</button>}
          </>
        }
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: 'Total', value: stats.total, color: t.textPrimary },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
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
                <CalendarClock className="h-4 w-4 text-blue-400" />
                <span className={`font-semibold text-sm ${t.textPrimary}`}>Recurring Schedules</span>
                {schedules.length > 0 && <span className={`text-xs ${t.chipBg} rounded-full px-2 py-0.5 ${t.textFaint}`}>{schedules.filter(s => s.active).length} active</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { setEditingSched(null); setShowCreateSched(true); }} className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 gap-1.5 h-7 text-xs"><Plus className="h-3.5 w-3.5" /> New Schedule</Button>
                <button type="button" onClick={() => setSchedPanelOpen(o => !o)} title={schedPanelOpen ? 'Collapse schedules' : 'Expand schedules'} className={`${t.chipBg} ${t.hoverBg} ${t.textFaint} rounded-lg p-1.5 transition-colors`}>{schedPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              </div>
            </div>
            {schedPanelOpen && (schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className={`${t.chipBg} p-4 rounded-2xl mb-3`}><Repeat2 className={`h-7 w-7 ${t.textFaint}`} /></div>
                <div className={`text-sm font-medium ${t.textMuted}`}>No recurring schedules yet</div>
                <div className={`text-xs mt-1 mb-4 ${t.textFaint}`}>Set up schedules to auto-generate work orders — every week, month, quarter, or custom dates.</div>
                <Button size="sm" onClick={() => { setEditingSched(null); setShowCreateSched(true); }} className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 gap-1.5"><Plus className="h-3.5 w-3.5" /> Create First Schedule</Button>
              </div>
            ) : (
              <div>{schedules.map(s => (
                <ScheduleRow key={s.id} schedule={s} onEdit={() => { setEditingSched(s); setShowCreateSched(true); }} onRunNow={() => handleRunScheduleNow(s)}
                  onDelete={() => { if (confirm(`Delete schedule "${s.name}"? This cannot be undone.`)) { const updated = schedules.filter(x => x.id !== s.id); setSchedules(updated); persistSchedules(updated); } }}
                  onToggle={() => { const updated = schedules.map(x => x.id === s.id ? { ...x, active: !x.active } : x); setSchedules(updated); persistSchedules(updated); }} />
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
                    <button type="button" key={tab.key} onClick={() => setStatusTab(tab.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-blue-500/20 text-blue-400 font-semibold' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
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
                  <button type="button" onClick={() => setShowFilterMenu(o => !o)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${priorityFilter.length > 0 ? 'bg-blue-500/15 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
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
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-blue-500 border-blue-500' : `border ${t.border}`}`}>{active && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}</div>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pcfg.color }} />
                            <span className={`text-xs capitalize ${t.textMuted}`}>{p}</span>
                          </button>
                        );
                      })}
                      {priorityFilter.length > 0 && <button type="button" onClick={() => setPriorityFilter([])} className={`mt-2 pt-2 border-t ${t.border} w-full text-center text-[10px] ${t.textFaint} ${t.hoverText}`}>Clear filter</button>}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search machine, artisan, WO#…" className={`rounded-lg pl-8 pr-8 py-1.5 text-sm w-52 outline-none transition-colors ${t.inputBg}`} />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${t.textFaint} ${t.hoverText} transition-colors`}><X className="h-3.5 w-3.5" /></button>}
                </div>

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
              <div className={`flex items-center gap-3 px-5 py-2.5 bg-blue-500/[0.06] border-b ${t.border}`}>
                <button type="button" onClick={() => selectedIds.size === filtered.length ? clearSelect() : selectAll()} className={`flex items-center gap-2 text-xs ${t.textMuted} ${t.hoverText} transition-colors`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-blue-500 border-blue-500' : selectedIds.size > 0 ? 'bg-blue-500/40 border-blue-500' : `border ${t.border} bg-transparent`}`}>
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
                  <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className={`${t.chipBg} p-4 rounded-2xl mb-3`}><Wrench className={`h-8 w-8 ${t.textFaint}`} /></div>
                    <div className={`font-medium mb-1 ${t.textMuted}`}>{searchQuery || statusTab !== 'all' ? 'No matching work orders' : 'No work orders yet'}</div>
                    <div className={`text-sm mb-4 ${t.textFaint}`}>{searchQuery || statusTab !== 'all' ? 'Try clearing the search or filter' : 'Create the first one with "New Work Order"'}</div>
                    {!searchQuery && statusTab === 'all' && <Button onClick={() => setShowCreateModal(true)} size="sm" className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 gap-1"><Plus className="h-3.5 w-3.5" /> New Work Order</Button>}
                  </div>
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
                      <div key={wo.id} className={`flex items-stretch transition-colors ${bulkMode && selectedIds.has(String(wo.id)) ? 'bg-blue-500/[0.05]' : ''}`}>
                        {bulkMode && (
                          <div className={`flex items-center px-4 border-r ${t.border}`}>
                            <button type="button" onClick={() => toggleSelect(wo.id)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedIds.has(String(wo.id)) ? 'bg-blue-500 border-blue-500' : `border ${t.border} bg-transparent`}`}>
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
                      {bulkMode && selectedIds.size > 0 && <span className="text-blue-400/70 text-xs">{selectedIds.size} selected</span>}
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
        onSave={schedule => {
          const updated = editingSched ? schedules.map(x => x.id === schedule.id ? schedule : x) : [schedule, ...schedules];
          setSchedules(updated); persistSchedules(updated);
          toast.success(editingSched ? 'Schedule updated' : 'Schedule created');
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
