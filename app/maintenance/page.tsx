// frontend/app/maintenance/page.tsx
'use client';
import { useState, useEffect, useMemo, ElementType, useRef } from "react";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Wrench, Plus, RefreshCw, CheckCircle2, Clock, PlayCircle, PauseCircle,
  Search, ChevronDown, ChevronUp, ChevronRight, X, XCircle, AlertCircle,
  CalendarOff, ClipboardCheck, FileText, Trash2, Save, Signature,
  HardHat, ShieldCheck, Timer, CalendarClock, Pencil, Repeat2,
  SlidersHorizontal, ArrowUpDown, Zap, Settings2, Package, BarChart2,
  Activity, Layers, AlertTriangle, TrendingUp, Cpu, Maximize2, Minimize2
} from "lucide-react";

// ==================== TYPES ====================
type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' | 'postponed' | 'not-done';
type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
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

interface SpareItem {
  id: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface SpareRegisterItem {
  id: number | string;
  stock_code: string;
  description: string;
  unit_price: number;
  unit_of_measure?: string;
  category?: string;
  current_quantity?: number;
}

// Module-level caches — fetched once per session
let _empCache: EmployeeItem[] = [];
let _empFetched = false;
let _eqCache: EquipmentItem[] = [];
let _eqFetched = false;
let _spCache: SpareRegisterItem[] = [];
let _spFetched = false;

interface MaintenanceSchedule {
  id: string;
  name: string;
  equipment_info: string;
  to_department: string;
  allocated_to: string;
  authorising_foreman: string;
  estimated_hours: string;
  job_request_details: string;
  job_instructions: string;
  priority: WorkOrderPriority;
  recurrence_type: RecurrenceType;
  recurrence_dow: number;      // 0-6: day of week (weekly/biweekly)
  recurrence_dom: number;      // 1-28: day of month
  recurrence_months: number[]; // 0-11: months (quarterly/yearly)
  specific_dates: string[];    // ISO date strings (custom)
  advance_days: number;        // generate WO this many days before due date
  active: boolean;
  next_due_date: string;
  last_generated: string;
  created_at: string;
}

interface EquipmentItem {
  id: string;
  equipment_id: string;
  name: string;
  category?: string;
  department?: string;
  location?: string;
  status?: string;
}

interface EmployeeItem {
  id: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  designation?: string;
  department?: string;
  section?: string;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
  equipment_info: string;
  to_department: string;
  to_section: string;
  from_department: string;
  from_section: string;
  date_raised: string;
  time_raised: string;
  account_number: string;
  user_lab_today: string;
  job_type: { operational: boolean; maintenance: boolean; mining: boolean } | string;
  job_request_details: string;
  requested_by: string;
  authorising_foreman: string;
  authorising_engineer: string;
  allocated_to: string;
  estimated_hours: string;
  responsible_foreman: string;
  job_instructions: string;
  manpower: unknown;
  work_done_details: string;
  cause_of_failure: string;
  delay_details: string;
  artisan_name: string;
  artisan_sign: string;
  artisan_date: string;
  foreman_name: string;
  foreman_sign: string;
  foreman_date: string;
  time_work_started: string;
  time_work_finished: string;
  total_time_worked: string;
  overtime_start_time: string;
  overtime_end_time: string;
  overtime_hours: string;
  delay_from_time: string;
  delay_to_time: string;
  total_delay_hours: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  progress: number;
  notes?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  // Classification & discipline
  classification?: WOClassification;
  classification_custom?: string;
  failure_mode?: string;
  discipline?: Discipline;
  trade?: Trade;
  spares_used?: SpareItem[];
}

// ==================== API ====================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Fields the backend may not have columns for yet — kept authoritative in localStorage
const LOCAL_FIELDS: (keyof WorkOrder)[] = [
  'classification', 'classification_custom', 'failure_mode', 'discipline', 'trade', 'spares_used',
];

function lsRead(): WorkOrder[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('maint_work_orders') || '[]');
}
function lsWrite(list: WorkOrder[]) {
  localStorage.setItem('maint_work_orders', JSON.stringify(list));
}
function lsMergeIn(patch: Partial<WorkOrder> & { id: string | number }) {
  const list = lsRead();
  const idx = list.findIndex(w => String(w.id) === String(patch.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
  } else {
    list.unshift(patch as WorkOrder);
  }
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
    // Merge local-only fields back into API records so they survive backend round-trips
    const merged = apiData.map(w => {
      const loc = localMap.get(String(w.id));
      if (!loc) return w;
      const extra: Partial<WorkOrder> = {};
      for (const f of LOCAL_FIELDS) {
        const apiVal = w[f];
        const locVal = loc[f];
        // Prefer API value if it exists; otherwise keep local
        (extra as Record<string, unknown>)[f] = (apiVal !== null && apiVal !== undefined) ? apiVal : locVal;
      }
      return { ...w, ...extra };
    });
    return [...merged, ...localOnly];
  } catch {
    return local;
  }
}

async function createWorkOrder(data: Record<string, unknown>): Promise<{ success: boolean; data?: WorkOrder }> {
  try {
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const result = await res.json();
    // Merge request fields the backend may not echo back (classification, spares_used, etc.)
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
    const res = await fetch(`${API_BASE}/api/maintenance/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, updated_at: ts }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    // Always persist updates locally — backend may not store custom fields
    lsPatchFields(id, { ...updates, updated_at: ts });
    return { success: true };
  } catch {
    lsPatchFields(id, { ...updates, updated_at: ts });
    return { success: true };
  }
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function loadSchedules(): MaintenanceSchedule[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(SCHED_KEY) || '[]');
}

function persistSchedules(list: MaintenanceSchedule[]) {
  localStorage.setItem(SCHED_KEY, JSON.stringify(list));
}

function recurrenceLabel(s: MaintenanceSchedule): string {
  switch (s.recurrence_type) {
    case 'daily':     return 'Every day';
    case 'weekly':    return `Every ${DOW[s.recurrence_dow]}`;
    case 'biweekly':  return `Every 2 weeks on ${DOW[s.recurrence_dow]}`;
    case 'monthly':   return `Monthly on the ${ordinal(s.recurrence_dom)}`;
    case 'quarterly': return `Quarterly — ${(s.recurrence_months ?? []).map(m => MON[m]).join(', ')}`;
    case 'yearly':    return `Yearly — ${MON[s.recurrence_months?.[0] ?? 0]} ${ordinal(s.recurrence_dom)}`;
    case 'custom':    return `Custom (${(s.specific_dates ?? []).length} date${(s.specific_dates ?? []).length !== 1 ? 's' : ''})`;
    default:          return '';
  }
}

function getNextOccurrence(s: MaintenanceSchedule, from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  switch (s.recurrence_type) {
    case 'daily':    { d.setDate(d.getDate() + 1);  return d; }
    case 'weekly':   { d.setDate(d.getDate() + 7);  return d; }
    case 'biweekly': { d.setDate(d.getDate() + 14); return d; }
    case 'monthly':  { return new Date(d.getFullYear(), d.getMonth() + 1, s.recurrence_dom); }
    case 'quarterly': {
      const months = [...(s.recurrence_months ?? [0, 3, 6, 9])].sort((a, b) => a - b);
      const cur = d.getMonth();
      const next = months.find(m => m > cur);
      return next !== undefined
        ? new Date(d.getFullYear(), next, s.recurrence_dom)
        : new Date(d.getFullYear() + 1, months[0] ?? 0, s.recurrence_dom);
    }
    case 'yearly': {
      const month = s.recurrence_months?.[0] ?? 0;
      return new Date(d.getFullYear() + 1, month, s.recurrence_dom);
    }
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
    'pending':     { Icon: Clock,        dot: 'bg-yellow-400', pill: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',  label: 'Pending' },
    'in-progress': { Icon: PlayCircle,   dot: 'bg-blue-400',   pill: 'bg-blue-400/15   text-blue-300   border-blue-400/30',    label: 'In Progress' },
    'completed':   { Icon: CheckCircle2, dot: 'bg-green-400',  pill: 'bg-green-400/15  text-green-300  border-green-400/30',   label: 'Completed' },
    'on-hold':     { Icon: PauseCircle,  dot: 'bg-orange-400', pill: 'bg-orange-400/15 text-orange-300 border-orange-400/30',  label: 'On Hold' },
    'cancelled':   { Icon: XCircle,      dot: 'bg-red-400',    pill: 'bg-red-400/15    text-red-300    border-red-400/30',     label: 'Cancelled' },
    'postponed':   { Icon: CalendarOff,  dot: 'bg-purple-400', pill: 'bg-purple-400/15 text-purple-300 border-purple-400/30',  label: 'Postponed' },
    'not-done':    { Icon: AlertCircle,  dot: 'bg-gray-400',   pill: 'bg-gray-400/15   text-gray-300   border-gray-400/30',    label: 'Not Done' },
  } as const;
  return m[s] ?? m['pending'];
}

function priorityCfg(p: WorkOrderPriority) {
  const m = {
    'urgent': { dot: 'bg-red-500',    badge: 'bg-red-500/15    text-red-300    border-red-500/30',    label: 'Urgent' },
    'high':   { dot: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', label: 'High' },
    'medium': { dot: 'bg-yellow-500', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', label: 'Medium' },
    'low':    { dot: 'bg-green-500',  badge: 'bg-green-500/15  text-green-300  border-green-500/30',  label: 'Low' },
  } as const;
  return m[p] ?? m['medium'];
}

function calcStats(orders: WorkOrder[]) {
  const by = (s: WorkOrderStatus) => orders.filter(o => o.status === s).length;
  const total = orders.length;
  const completed = by('completed');

  // Classification breakdown
  const byClass = (c: WOClassification) => orders.filter(o => o.classification === c).length;
  const breakdowns = orders.filter(o => o.classification === 'breakdown');

  // Discipline breakdown
  const byDiscipline = (d: Discipline) => orders.filter(o => o.discipline === d).length;

  // Artisan breakdown cost (estimated_hours × rate proxy = hours as cost proxy)
  const artisanCostMap: Record<string, { hours: number; sparesCost: number; count: number }> = {};
  breakdowns.forEach(w => {
    const name = w.artisan_name || w.allocated_to || 'Unknown';
    if (!artisanCostMap[name]) artisanCostMap[name] = { hours: 0, sparesCost: 0, count: 0 };
    artisanCostMap[name].hours += parseFloat(w.estimated_hours || '0') || 0;
    artisanCostMap[name].count += 1;
    (w.spares_used || []).forEach(s => { artisanCostMap[name].sparesCost += s.quantity * s.unit_cost; });
  });
  const artisanCost = Object.entries(artisanCostMap)
    .map(([name, d]) => ({ name, hours: d.hours, sparesCost: d.sparesCost, count: d.count, total: d.hours * 50 + d.sparesCost }))
    .sort((a, b) => b.total - a.total);

  // Failure mode breakdown
  const failureModeMap: Record<string, number> = {};
  breakdowns.forEach(w => { if (w.failure_mode) failureModeMap[w.failure_mode] = (failureModeMap[w.failure_mode] || 0) + 1; });
  const failureModes = Object.entries(failureModeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Time-of-day breakdown (hour buckets 0-23)
  const hourBuckets = new Array(24).fill(0);
  breakdowns.forEach(w => {
    if (w.time_raised) {
      const h = parseInt(w.time_raised.split(':')[0]);
      if (!isNaN(h) && h >= 0 && h < 24) hourBuckets[h]++;
    }
  });

  // Spares total cost
  const sparesTotalCost = orders.reduce((acc, w) => {
    return acc + (w.spares_used || []).reduce((s, x) => s + x.quantity * x.unit_cost, 0);
  }, 0);

  return {
    total,
    pending:    by('pending'),
    inProgress: by('in-progress'),
    completed,
    onHold:     by('on-hold'),
    overdue:    orders.filter(o => o.due_date && o.status !== 'completed' && new Date(o.due_date) < new Date()).length,
    efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
    // Analytics
    plannedMaintenance: byClass('planned_maintenance'),
    projects:           byClass('project'),
    breakdowns:         byClass('breakdown'),
    customClass:        byClass('custom'),
    mechanical:         byDiscipline('Mechanical'),
    electrical:         byDiscipline('Electrical'),
    artisanCost,
    failureModes,
    hourBuckets,
    sparesTotalCost,
  };
}

// ==================== HELPERS ====================
function nextWONumber(existingOrders: WorkOrder[], offset = 0): string {
  const nums = existingOrders.map(w => {
    const m = w.work_order_number?.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `WO-${String(max + 1 + offset).padStart(5, '0')}`;
}

// ==================== CREATE / EDIT WORK ORDER MODAL ====================
interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newOrder: WorkOrder) => void;
  editingOrder?: WorkOrder;
  allOrders?: WorkOrder[];
}

function CreateWorkOrderModal({ isOpen, onClose, onCreated, editingOrder, allOrders = [] }: CreateModalProps) {
  const blankForm = () => ({
    equipment_info: '', to_department: 'Engineering', allocated_to: '',
    priority: 'medium' as WorkOrderPriority, estimated_hours: '2',
    job_request_details: '', requested_by: '', authorising_foreman: '',
    job_instructions: '', date_raised: new Date().toISOString().split('T')[0],
    classification: '' as WOClassification | '',
  });

  const fromOrder = (wo: WorkOrder) => ({
    equipment_info: wo.equipment_info || '',
    to_department: wo.to_department || 'Engineering',
    allocated_to: wo.allocated_to || wo.artisan_name || '',
    priority: wo.priority || 'medium' as WorkOrderPriority,
    estimated_hours: wo.estimated_hours || '2',
    job_request_details: wo.job_request_details || '',
    requested_by: wo.requested_by || '',
    authorising_foreman: wo.authorising_foreman || wo.responsible_foreman || '',
    job_instructions: wo.job_instructions || '',
    date_raised: wo.date_raised || new Date().toISOString().split('T')[0],
    classification: (wo.classification || '') as WOClassification | '',
  });

  const [form, setForm] = useState(editingOrder ? fromOrder(editingOrder) : blankForm());
  const [saving, setSaving] = useState(false);

  // Re-fill form whenever the modal opens or the editing target changes
  useEffect(() => {
    if (isOpen) setForm(editingOrder ? fromOrder(editingOrder) : blankForm());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingOrder?.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isEditing = !!editingOrder;

  // Derive machine list — each comma-separated item becomes its own work order (create only)
  const machines = form.equipment_info.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!form.equipment_info.trim() || !form.job_request_details.trim() || !form.allocated_to.trim()) {
      toast.error('Machine, artisan name and job request are required');
      return;
    }
    setSaving(true);

    if (isEditing && editingOrder) {
      // ── Edit existing WO ──
      const updates = {
        equipment_info: form.equipment_info.trim(),
        to_department: form.to_department,
        allocated_to: form.allocated_to,
        artisan_name: form.allocated_to,
        priority: form.priority,
        estimated_hours: form.estimated_hours,
        job_request_details: form.job_request_details,
        requested_by: form.requested_by,
        authorising_foreman: form.authorising_foreman,
        responsible_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions,
        date_raised: form.date_raised,
        ...(form.classification ? { classification: form.classification } : {}),
      };
      const { success } = await updateWorkOrder(editingOrder.id, updates);
      setSaving(false);
      if (success) {
        toast.success('Work order updated');
        onCreated({ ...editingOrder, ...updates } as WorkOrder);
        onClose();
      } else {
        toast.error('Failed to update work order');
      }
      return;
    }

    // ── Create new WO(s) ──
    const created: WorkOrder[] = [];
    for (let i = 0; i < machines.length; i++) {
      const result = await createWorkOrder({
        work_order_number: nextWONumber(allOrders, created.length),
        equipment_info: machines[i],
        to_department: form.to_department,
        allocated_to: form.allocated_to,
        priority: form.priority,
        estimated_hours: form.estimated_hours,
        job_request_details: form.job_request_details,
        requested_by: form.requested_by,
        authorising_foreman: form.authorising_foreman,
        job_instructions: form.job_instructions,
        date_raised: form.date_raised,
        to_section: '', from_department: '', from_section: '',
        account_number: '', user_lab_today: '',
        time_raised: new Date().toTimeString().slice(0, 5),
        job_type: { operational: false, maintenance: true, mining: false },
        authorising_engineer: '',
        responsible_foreman: form.authorising_foreman,
        manpower: [],
        work_done_details: '', cause_of_failure: '', delay_details: '',
        artisan_name: form.allocated_to,
        artisan_sign: '', artisan_date: '',
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
    } else {
      toast.error('Failed to create work order');
    }
  };

  const inputCls = "bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10]";
  const labelCls = "text-white/55 text-xs";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgba(5,15,28,0.96)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="bg-[#86BBD8]/20 p-2 rounded-lg border border-[#86BBD8]/25">
              <Wrench className="h-4 w-4 text-[#86BBD8]" />
            </div>
            {isEditing ? `Edit Work Order — ${editingOrder?.work_order_number}` : 'New Work Order'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Machine / Equipment */}
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Machine / Equipment *
              <span className="text-white/25 ml-1.5">— comma-separate for multiple</span>
            </Label>
            <EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Department</Label>
            <Input value={form.to_department} onChange={e => set('to_department', e.target.value)}
              placeholder="Engineering" className={inputCls} />
          </div>

          {/* Allocated To */}
          <PersonAutocomplete id="cwo-artisan" label="Allocated To (Artisan) *"
            value={form.allocated_to} onChange={v => set('allocated_to', v)} />

          {/* Priority + Hours + Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1f35] border-white/10 text-white">
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Est. Hours</Label>
              <Input type="number" min="0.5" step="0.5" value={form.estimated_hours}
                onChange={e => set('estimated_hours', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Date Raised</Label>
              <Input type="date" value={form.date_raised} onChange={e => set('date_raised', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Requested By + Authorising Foreman */}
          <div className="grid grid-cols-2 gap-3">
            <PersonAutocomplete id="cwo-reqby" label="Requested By"
              value={form.requested_by} onChange={v => set('requested_by', v)}
              placeholder="Who is requesting this work?" />
            <PersonAutocomplete id="cwo-foreman" label="Authorising Foreman"
              value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
          </div>

          {/* Job Request */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Job Request — What to Do *</Label>
            <Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)}
              placeholder="Describe exactly what the artisan needs to do…"
              rows={4} className={`${inputCls} resize-none`} />
          </div>

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Special Instructions (optional)</Label>
            <Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)}
              placeholder="Safety notes, special tools, access requirements…"
              rows={2} className={`${inputCls} resize-none`} />
          </div>

          {/* WO Classification — quick-select (optional) */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Work Order Classification <span className="text-white/25">(optional — artisan can update later)</span></Label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'planned_maintenance', label: 'Planned Maint.' },
                { key: 'project',             label: 'Project' },
                { key: 'breakdown',           label: 'Breakdown' },
                { key: 'custom',              label: 'Other / Custom' },
              ] as { key: WOClassification; label: string }[]).map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => set('classification', form.classification === opt.key ? '' : opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.classification === opt.key
                      ? 'bg-[#86BBD8]/25 border-[#86BBD8]/50 text-white'
                      : 'bg-white/[0.04] border-white/[0.10] text-white/50 hover:bg-white/[0.08] hover:text-white/75'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}
            className="bg-white/[0.08] hover:bg-white/[0.16] text-white/80 border border-white/15">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/35">
            {saving
              ? (isEditing ? 'Saving…' : 'Creating…')
              : isEditing
              ? 'Save Changes'
              : machines.length > 1 ? `Create ${machines.length} Work Orders` : 'Create Work Order'}
          </Button>
        </DialogFooter>
        <div className="flex justify-center pb-1 pt-0">
          <button type="button" onClick={onClose}
            className="text-white/25 hover:text-white/55 text-xs flex items-center gap-1.5 transition-colors">
            <X className="h-3 w-3" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MODULE-LEVEL FIELD HELPERS ====================
// Defined here (not inside a component) so React sees stable component identity
// and never remounts them — fixing the focus-loss-after-each-keystroke bug.

function calcTotal(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

const GIN = "bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 h-8 text-sm focus:border-[#86BBD8]/40";
const GLB = "text-white/50 text-xs";

function GlassInput({ id, label, value, onChange, placeholder, type = 'text', readOnly, autoComplete }: {
  id: string; label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean; autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={GLB}>{label}</label>
      <Input id={id} type={type} value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${GIN}${readOnly ? ' opacity-60 cursor-default' : ''}`} />
    </div>
  );
}

function GlassTextarea({ id, label, value, onChange, placeholder, rows = 3, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={GLB}>{label}</label>
      <Textarea id={id} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} autoComplete={autoComplete}
        className={`${GIN} h-auto resize-none`} />
    </div>
  );
}

function NAToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 ml-auto">
      <span className={`text-xs transition-colors ${checked ? 'text-orange-400' : 'text-white/30'}`}>{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-orange-500/50' : 'bg-white/20'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

// ==================== PREDICTION ====================
const MAINT_VOCAB: string[] = [
  // Single words — complete the word being typed
  'adjusted', 'bearing', 'bearings', 'belt', 'belts', 'broken', 'calibrated',
  'checked', 'cleaned', 'compressor', 'conveyor', 'corrective', 'coupling',
  'cracked', 'damaged', 'drained', 'electrical', 'filter', 'flushed',
  'gasket', 'gaskets', 'gearbox', 'greased', 'hydraulic', 'inspected',
  'installed', 'lubricated', 'maintenance', 'mechanical', 'motor',
  'overhauled', 'pneumatic', 'preventive', 'pump', 'realigned', 'rectified',
  'refitted', 'removed', 'repaired', 'replaced', 'seal', 'seals', 'serviced',
  'shaft', 'tightened', 'tested', 'valve', 'vibration', 'welded',
  // Phrases — suggest after a space (next-word completion)
  'preventive maintenance completed', 'corrective maintenance done',
  'no further action required', 'machine running normally',
  'awaiting spare parts', 'spare parts ordered',
  'bearing worn out', 'belt worn out', 'belt slipping',
  'oil level low', 'oil leak detected', 'oil changed',
  'found and rectified', 'found fault in',
  'maintenance complete', 'works normally after repair',
  'safety hazard identified', 'lockout tagout applied',
];

function getPrediction(text: string): string {
  if (!text) return '';
  // After a space: suggest next word/phrase
  if (text.endsWith(' ') || text.endsWith('\n')) {
    const trimmed = text.trimEnd().toLowerCase();
    const phrase = MAINT_VOCAB
      .filter(v => v.includes(' '))
      .find(v => v.toLowerCase().startsWith(trimmed + ' '));
    return phrase ? phrase.slice(trimmed.length + 1) : '';
  }
  // Mid-word: complete the current word
  const last = text.split(/[\s\n]+/).pop() || '';
  if (last.length < 2) return '';
  const lower = last.toLowerCase();
  const match = MAINT_VOCAB.find(v => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower);
  return match ? match.slice(last.length) : '';
}

function PredictiveArea({ id, label, value, onChange, placeholder, rows = 3, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; autoComplete?: string;
}) {
  const [ghost, setGhost] = useState('');

  const accept = () => {
    if (!ghost) return;
    onChange(value + ghost + ' ');
    setGhost('');
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={GLB}>{label}</label>
      <Textarea
        id={id} value={value} rows={rows} autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${GIN} h-auto resize-none`}
        onChange={e => { onChange(e.target.value); setGhost(getPrediction(e.target.value)); }}
        onKeyDown={e => {
          if (e.key === 'Tab' && ghost) { e.preventDefault(); accept(); }
          else if (e.key === 'Escape') setGhost('');
        }}
        onBlur={() => setGhost('')}
      />
      {ghost && (
        <div className="flex items-center gap-2 px-0.5">
          <kbd className="text-[9px] text-white/25 bg-white/[0.05] border border-white/10 rounded px-1 py-px font-mono leading-none">Tab</kbd>
          <button type="button" onClick={accept}
            className="text-[11px] text-[#86BBD8]/60 hover:text-[#86BBD8] bg-[#86BBD8]/[0.07] hover:bg-[#86BBD8]/[0.14] px-2 py-0.5 rounded border border-[#86BBD8]/15 transition-colors max-w-[240px] truncate">
            {ghost.trim()}
          </button>
          <span className="text-white/20 text-[10px] hidden sm:inline">or click to accept</span>
        </div>
      )}
    </div>
  );
}

// ==================== AUTOCOMPLETE HELPERS ====================

function useEmployees() {
  const [list, setList] = useState<EmployeeItem[]>(_empCache);
  useEffect(() => {
    if (_empFetched) { setList(_empCache); return; }
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then((d: EmployeeItem[]) => { if (Array.isArray(d)) { _empCache = d; setList(d); } _empFetched = true; })
      .catch(() => { _empFetched = true; });
  }, []);
  return list;
}

function useEquipment() {
  const [list, setList] = useState<EquipmentItem[]>(_eqCache);
  useEffect(() => {
    if (_eqFetched) { setList(_eqCache); return; }
    fetch(`${API_BASE}/api/equipment`)
      .then(r => r.json())
      .then((d: EquipmentItem[]) => { if (Array.isArray(d)) { _eqCache = d; setList(d); } _eqFetched = true; })
      .catch(() => { _eqFetched = true; });
  }, []);
  return list;
}

function useSpares() {
  const [list, setList] = useState<SpareRegisterItem[]>(_spCache);
  useEffect(() => {
    if (_spFetched) { setList(_spCache); return; }
    fetch(`${API_BASE}/api/spares?limit=500`)
      .then(r => r.json())
      .then((d) => {
        const items: SpareRegisterItem[] = Array.isArray(d) ? d : (d?.results ?? []);
        _spCache = items; setList(items); _spFetched = true;
      })
      .catch(() => { _spFetched = true; });
  }, []);
  return list;
}

// Shared dropdown wrapper — closes on outside click
function ACDropdown({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="absolute z-50 w-full mt-1 bg-[#0b1a2e] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="max-h-52 overflow-y-auto">{children}</div>
    </div>
  );
}

// ==================== PERSON AUTOCOMPLETE ====================
// Replaces EmployeePicker — typeahead from employees table, free-type allowed.
function PersonAutocomplete({ id, label, value, onChange, placeholder }: {
  id?: string; label?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const employees = useEmployees();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0
    ? employees.slice(0, 8)
    : employees.filter(e => {
        const full = `${e.first_name} ${e.last_name}`.toLowerCase();
        return full.includes(q) || (e.employee_id || '').toLowerCase().includes(q) ||
               (e.designation || '').toLowerCase().includes(q);
      }).slice(0, 8);

  return (
    <div className="space-y-1">
      {label && <label htmlFor={id} className={GLB}>{label}</label>}
      <div className="relative" ref={ref}>
        <input id={id} value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Type to search employees, or enter name…'}
          className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors ${GIN}`} />
        <ACDropdown show={open && suggestions.length > 0}>
          {suggestions.map(e => {
            const full = `${e.first_name} ${e.last_name}`;
            return (
              <button key={e.id} type="button"
                onMouseDown={() => { onChange(full); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-white/[0.04] hover:bg-white/[0.06] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#86BBD8]/15 border border-[#86BBD8]/20 flex items-center justify-center flex-shrink-0 text-[10px] text-[#86BBD8]/70 font-bold uppercase">
                  {e.first_name?.[0]}{e.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-xs font-medium truncate">{full}</div>
                  <div className="text-white/35 text-[10px] truncate">
                    {e.designation}{e.department ? ` · ${e.department}` : ''}{e.section ? ` · ${e.section}` : ''}
                  </div>
                </div>
                {e.employee_id && <span className="text-white/25 text-[10px] flex-shrink-0">{e.employee_id}</span>}
              </button>
            );
          })}
        </ACDropdown>
      </div>
    </div>
  );
}

// ==================== EQUIPMENT AUTOCOMPLETE ====================
// Typeahead from equipment register. Comma-separate for multi-machine WOs.
function EquipmentAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const equipment = useEquipment();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Match against the fragment being typed after the last comma
  const fragment = value.split(',').pop()?.trimStart() ?? '';
  const q = fragment.toLowerCase();
  const suggestions = q.length === 0
    ? equipment.slice(0, 8)
    : equipment.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.equipment_id || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
      ).slice(0, 8);

  const pick = (eq: EquipmentItem) => {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    // Replace last fragment with the chosen equipment name
    parts.splice(parts.length > 0 && !value.endsWith(',') ? parts.length - 1 : parts.length, 1, eq.name || eq.equipment_id);
    onChange(parts.join(', '));
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative" ref={ref}>
        <input value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type machine name — comma-separate for multiple…"
          className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors ${GIN}`} />
        <ACDropdown show={open && suggestions.length > 0}>
          {suggestions.map(eq => (
            <button key={eq.id} type="button"
              onMouseDown={() => pick(eq)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-white/[0.04] hover:bg-white/[0.06] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-xs font-medium truncate">{eq.name}</div>
                <div className="text-white/35 text-[10px] truncate">
                  {eq.equipment_id}{eq.department ? ` · ${eq.department}` : ''}{eq.location ? ` · ${eq.location}` : ''}
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-px rounded-full border flex-shrink-0 ${
                eq.status === 'operational'
                  ? 'text-green-400 border-green-500/20 bg-green-500/[0.07]'
                  : 'text-orange-400 border-orange-500/20 bg-orange-500/[0.07]'
              }`}>{eq.status || 'unknown'}</span>
            </button>
          ))}
        </ACDropdown>
      </div>
      {value.includes(',') && (
        <p className="text-[10px] text-[#86BBD8]/50 px-0.5">
          {value.split(',').filter(s => s.trim()).length} machines — will create one work order each
        </p>
      )}
    </div>
  );
}

// ==================== SPARE AUTOCOMPLETE ====================
// Searches spares register; autofills unit price on selection. Free-type allowed.
function SpareAutocomplete({ value, onChange, onSelect, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: SpareRegisterItem) => void;
  placeholder?: string;
}) {
  const spares = useSpares();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0
    ? spares.slice(0, 8)
    : spares.filter(s =>
        (s.description || '').toLowerCase().includes(q) ||
        (s.stock_code || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      ).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <input value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Search spares register or type manually…'}
        className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none transition-colors ${GIN}`} />
      <ACDropdown show={open && (suggestions.length > 0 || spares.length === 0)}>
        {spares.length === 0 ? (
          <div className="px-3 py-3 text-white/30 text-xs flex items-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin" /> Loading spares register…
          </div>
        ) : suggestions.length === 0 ? (
          <div className="px-3 py-3 text-white/30 text-xs">No matches — value will be saved as typed</div>
        ) : (
          suggestions.map(s => (
            <button key={s.id} type="button"
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left border-b border-white/[0.04] hover:bg-white/[0.06] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-xs font-medium truncate">{s.description}</div>
                <div className="text-white/35 text-[10px] truncate">
                  {s.stock_code}{s.category ? ` · ${s.category}` : ''}{s.unit_of_measure ? ` · ${s.unit_of_measure}` : ''}
                  {s.current_quantity !== undefined ? ` · Stock: ${s.current_quantity}` : ''}
                </div>
              </div>
              <span className="text-amber-300/80 text-xs font-mono flex-shrink-0">
                R {(s.unit_price || 0).toFixed(2)}
              </span>
            </button>
          ))
        )}
      </ACDropdown>
    </div>
  );
}

// ==================== WORK ORDER DETAIL MODAL ====================
interface DetailModalProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

function WorkOrderDetailModal({ workOrder, onClose, onRefresh, onDelete }: DetailModalProps) {
  const [s1Open, setS1Open] = useState(false); // sneak peek by default
  const [s2Open, setS2Open] = useState(true);
  const [s3Open, setS3Open] = useState(true);
  const [savingA, setSavingA] = useState(false);
  const [savingF, setSavingF] = useState(false);

  // OT / delay are shown by default; user clicks "Mark as N/A" to hide
  const [otNA, setOtNA] = useState(false);
  const [delayNA, setDelayNA] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [artisanSpares, setArtisanSpares] = useState<SpareItem[]>(workOrder.spares_used || []);
  const [newSpare, setNewSpare] = useState({ name: '', quantity: '1', unit_cost: '0' });

  const [artisan, setArtisan] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '';
    return {
      work_done_details:   workOrder.work_done_details   || '',
      cause_of_failure:    workOrder.cause_of_failure    || '',
      delay_details:       workOrder.delay_details        || '',
      time_work_started:   workOrder.time_work_started   || '',
      time_work_finished:  workOrder.time_work_finished  || '',
      total_time_worked:   workOrder.total_time_worked   || '',
      overtime_start_time: workOrder.overtime_start_time || '',
      overtime_end_time:   workOrder.overtime_end_time   || '',
      overtime_hours:      workOrder.overtime_hours      || '',
      delay_from_time:     workOrder.delay_from_time     || '',
      delay_to_time:       workOrder.delay_to_time       || '',
      total_delay_hours:   workOrder.total_delay_hours   || '',
      artisan_name: workOrder.artisan_name || workOrder.allocated_to || savedName,
      artisan_sign: workOrder.artisan_sign || '',
      artisan_date: workOrder.artisan_date || today,
      status:   workOrder.status,
      progress: workOrder.progress,
      // Classification — filled by artisan
      classification: workOrder.classification || '' as WOClassification | '',
      classification_custom: workOrder.classification_custom || '',
      failure_mode: workOrder.failure_mode || '',
      discipline: workOrder.discipline || '' as Discipline | '',
      trade: workOrder.trade || '' as Trade | '',
    };
  });

  const [foreman, setForeman] = useState(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '';
    return {
      foreman_name: workOrder.foreman_name || savedName,
      foreman_sign: workOrder.foreman_sign || '',
      foreman_date: workOrder.foreman_date || today,
      notes:        workOrder.notes        || '',
      status:   workOrder.status,
      progress: workOrder.progress,
    };
  });

  const setA = (k: string, v: string | number) => setArtisan(f => ({ ...f, [k]: v }));
  const setF = (k: string, v: string | number) => setForeman(f => ({ ...f, [k]: v }));

  // Auto-calculate totals
  useEffect(() => {
    const t = calcTotal(artisan.time_work_started, artisan.time_work_finished);
    setArtisan(f => ({ ...f, total_time_worked: t }));
  }, [artisan.time_work_started, artisan.time_work_finished]);

  useEffect(() => {
    const t = calcTotal(artisan.overtime_start_time, artisan.overtime_end_time);
    setArtisan(f => ({ ...f, overtime_hours: t }));
  }, [artisan.overtime_start_time, artisan.overtime_end_time]);

  useEffect(() => {
    const t = calcTotal(artisan.delay_from_time, artisan.delay_to_time);
    setArtisan(f => ({ ...f, total_delay_hours: t }));
  }, [artisan.delay_from_time, artisan.delay_to_time]);

  // Clear fields when toggled N/A
  useEffect(() => {
    if (otNA) setArtisan(f => ({ ...f, overtime_start_time: '', overtime_end_time: '', overtime_hours: '' }));
  }, [otNA]);

  useEffect(() => {
    if (delayNA) setArtisan(f => ({ ...f, delay_from_time: '', delay_to_time: '', total_delay_hours: '' }));
  }, [delayNA]);

  const addArtisanSpare = () => {
    const name = newSpare.name.trim();
    if (!name) return;
    setArtisanSpares(prev => [...prev, {
      id: Date.now().toString(),
      name,
      quantity: parseFloat(newSpare.quantity) || 1,
      unit_cost: parseFloat(newSpare.unit_cost) || 0,
    }]);
    setNewSpare({ name: '', quantity: '1', unit_cost: '0' });
  };

  const saveArtisan = async () => {
    setSavingA(true);
    if (artisan.artisan_name) localStorage.setItem('maint_artisan_name', artisan.artisan_name);
    const payload = {
      ...artisan,
      classification:        artisan.classification || undefined,
      classification_custom: artisan.classification === 'custom' ? artisan.classification_custom : undefined,
      failure_mode:          artisan.classification === 'breakdown' ? artisan.failure_mode || undefined : undefined,
      discipline:            artisan.discipline || undefined,
      trade:                 artisan.discipline === 'Mechanical' ? artisan.trade || undefined : undefined,
      spares_used:           artisanSpares.length > 0 ? artisanSpares : undefined,
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

  const Info = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <div className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-white/85 text-sm">{value || '—'}</div>
    </div>
  );

  const selectCls = "bg-white/[0.06] border-white/[0.10] text-white h-8 text-sm focus:border-[#86BBD8]/40";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="oz-glass-dark rounded-2xl w-full max-w-3xl overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-[#86BBD8]/20 p-2 rounded-lg border border-[#86BBD8]/20">
              <Wrench className="h-5 w-5 text-[#86BBD8]" />
            </div>
            <div>
              <div className="text-white font-bold text-lg font-mono tracking-wide">
                #{workOrder.work_order_number}
              </div>
              <div className="text-white/55 text-sm">{workOrder.equipment_info}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${scfg.pill}`}>
              <scfg.Icon className="h-3 w-3" />{scfg.label}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${pcfg.badge}`}>
              {pcfg.label}
            </span>
            <button type="button" onClick={onClose} title="Close"
              className="bg-white/[0.08] hover:bg-white/[0.16] text-white/70 border border-white/15 rounded-lg p-1.5 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── SECTION 1: Work Request — sneak peek always visible ── */}
          <div className="bg-white/[0.04] rounded-xl border border-[#86BBD8]/20 overflow-hidden">
            {/* Section bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <FileText className="h-4 w-4 text-[#86BBD8]" />
              <span className="text-white/90 font-semibold text-sm">Work Request</span>
              <span className="ml-auto text-white/30 text-xs">supervisor-issued · read-only</span>
            </div>

            {/* Sneak peek — always visible */}
            <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-x-6 gap-y-2">
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Machine</div>
                <div className="text-white/80 text-sm truncate">{workOrder.equipment_info || '—'}</div>
              </div>
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Allocated To</div>
                <div className="text-white/80 text-sm truncate">{workOrder.allocated_to || workOrder.artisan_name || '—'}</div>
              </div>
              <div>
                <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Date Raised</div>
                <div className="text-white/80 text-sm truncate">{workOrder.date_raised || '—'}</div>
              </div>
              {workOrder.job_request_details && (
                <div className="col-span-3 mt-1">
                  <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">Job</div>
                  <div className={`text-white/60 text-xs leading-relaxed ${s1Open ? '' : 'line-clamp-2'}`}>
                    {workOrder.job_request_details}
                  </div>
                </div>
              )}
            </div>

            {/* Full details — collapsible */}
            {s1Open && (
              <div className="px-4 pb-3 pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-x-8 gap-y-3 mt-1">
                <Info label="Department"          value={workOrder.to_department} />
                <Info label="Estimated Hours"     value={workOrder.estimated_hours ? `${workOrder.estimated_hours} h` : ''} />
                <Info label="Requested By"        value={workOrder.requested_by} />
                <Info label="Authorising Foreman" value={workOrder.authorising_foreman} />
                {workOrder.job_instructions && (
                  <div className="col-span-2">
                    <Info label="Special Instructions" value={workOrder.job_instructions} />
                  </div>
                )}
              </div>
            )}

            {/* Toggle button */}
            <button type="button" onClick={() => setS1Open(o => !o)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-white/[0.05] hover:bg-[#86BBD8]/[0.05] transition-colors text-[#86BBD8]/55 hover:text-[#86BBD8] text-xs">
              {s1Open
                ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                : <><ChevronDown className="h-3.5 w-3.5" /> View full details</>}
            </button>
          </div>

          {/* ── SECTION 2: Artisan Report ── */}
          <div className="bg-white/[0.04] rounded-xl border border-cyan-500/20 overflow-hidden">
            <button type="button"
              className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
              onClick={() => setS2Open(o => !o)}
            >
              <HardHat className="h-4 w-4 text-cyan-400" />
              <span className="text-white/90 font-semibold text-sm">Artisan Report</span>
              <span className="ml-auto text-white/35 text-xs mr-2">Fill in after completing work</span>
              {s2Open ? <ChevronUp className="h-4 w-4 text-white/35" /> : <ChevronDown className="h-4 w-4 text-white/35" />}
            </button>

            {s2Open && (
              <div className="px-4 py-4 space-y-4">

                {/* ── Classification (artisan fills this) ── */}
                <div className="border border-white/[0.07] rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <Layers className="h-3.5 w-3.5" /> Work Order Classification
                  </div>

                  {/* Type buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { v: 'planned_maintenance', label: 'Planned Maintenance' },
                      { v: 'project',             label: 'Project' },
                      { v: 'breakdown',           label: 'Breakdown' },
                      { v: 'custom',              label: 'Other / Custom' },
                    ] as { v: WOClassification; label: string }[]).map(opt => (
                      <button key={opt.v} type="button"
                        onClick={() => setA('classification', opt.v)}
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                          artisan.classification === opt.v
                            ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white font-medium'
                            : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08] hover:text-white/75'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {artisan.classification === 'custom' && (
                    <div className="space-y-1">
                      <label className={GLB}>Specify Type</label>
                      <input value={artisan.classification_custom}
                        onChange={e => setA('classification_custom', e.target.value)}
                        placeholder="e.g. Commissioning, Shutdown work…"
                        className={`w-full rounded border px-2.5 py-1.5 text-xs outline-none transition-colors ${GIN}`} />
                    </div>
                  )}

                  {/* Failure mode — breakdowns only */}
                  {artisan.classification === 'breakdown' && (
                    <div className="space-y-1">
                      <label className={GLB}>Failure Mode</label>
                      <div className="relative">
                        <input
                          value={artisan.failure_mode}
                          onChange={e => setA('failure_mode', e.target.value)}
                          list="failure-mode-list"
                          placeholder="Select or type failure mode…"
                          className={`w-full rounded border px-2.5 py-1.5 text-xs outline-none transition-colors ${GIN}`} />
                        <datalist id="failure-mode-list">
                          {FAILURE_MODES.map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>
                    </div>
                  )}

                  {/* Discipline + Trade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={GLB}>Discipline</label>
                      <div className="flex gap-1.5">
                        {(['Mechanical', 'Electrical'] as Discipline[]).map(d => (
                          <button key={d} type="button"
                            onClick={() => { setA('discipline', d); if (d === 'Electrical') setA('trade', ''); }}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs border transition-colors ${
                              artisan.discipline === d
                                ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white font-medium'
                                : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]'
                            }`}>
                            {d === 'Mechanical' ? <Settings2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    {artisan.discipline === 'Mechanical' && (
                      <div className="space-y-1">
                        <label className={GLB}>Trade</label>
                        <div className="relative">
                          <input value={artisan.trade}
                            onChange={e => setA('trade', e.target.value)}
                            list="trade-list"
                            placeholder="Select or type trade…"
                            className={`w-full rounded border px-2.5 py-1.5 text-xs outline-none transition-colors ${GIN}`} />
                          <datalist id="trade-list">
                            {MECHANICAL_TRADES.map(t => <option key={t} value={t} />)}
                          </datalist>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status + Progress */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={GLB}>Status</label>
                    <Select value={artisan.status} onValueChange={v => setA('status', v)}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0d1f35] border-white/10 text-white">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="not-done">Not Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="a-progress" className={GLB}>Progress: {artisan.progress}%</label>
                    <input id="a-progress" type="range" min="0" max="100" value={artisan.progress}
                      title={`Artisan progress: ${artisan.progress}%`}
                      onChange={e => setA('progress', parseInt(e.target.value))}
                      className="w-full mt-2 accent-cyan-400" />
                  </div>
                </div>

                {/* Work Done — with phrase prediction */}
                <PredictiveArea id="a-work-done" label="Work Done — what was carried out *"
                  value={artisan.work_done_details} onChange={v => setA('work_done_details', v)}
                  placeholder="Describe exactly what was done…" rows={4} autoComplete="on" />

                {/* Cause + Delay narrative — with phrase prediction */}
                <div className="grid grid-cols-2 gap-3">
                  <PredictiveArea id="a-cause" label="Cause of Failure"
                    value={artisan.cause_of_failure} onChange={v => setA('cause_of_failure', v)}
                    placeholder="What caused the issue…" rows={3} autoComplete="on" />
                  <PredictiveArea id="a-delay-desc" label="Delay Details"
                    value={artisan.delay_details} onChange={v => setA('delay_details', v)}
                    placeholder="Any delays encountered…" rows={3} autoComplete="on" />
                </div>

                {/* Time Tracking */}
                <div className="border border-white/[0.07] rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <Timer className="h-3.5 w-3.5" /> Time Tracking
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <GlassInput id="a-t-start"  label="Time Started"      type="time"
                      value={artisan.time_work_started}  onChange={v => setA('time_work_started', v)} />
                    <GlassInput id="a-t-finish" label="Time Finished"     type="time"
                      value={artisan.time_work_finished} onChange={v => setA('time_work_finished', v)} />
                    <GlassInput id="a-t-total"  label="Total Time (auto)"
                      value={artisan.total_time_worked}  onChange={v => setA('total_time_worked', v)}
                      placeholder="auto"
                      readOnly={!!(artisan.time_work_started && artisan.time_work_finished)} />
                  </div>

                  {/* Overtime — shown by default, button to mark N/A */}
                  <div className="border-t border-white/[0.05] pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs font-medium">Overtime</span>
                      <button type="button" onClick={() => setOtNA(v => !v)}
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          otNA
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                            : 'text-white/35 bg-white/[0.05] border-white/10 hover:bg-white/[0.10] hover:text-white/60'
                        }`}>
                        {otNA ? '↩ Undo N/A' : 'Mark as N/A'}
                      </button>
                    </div>
                    {otNA ? (
                      <p className="text-orange-400/50 text-xs italic px-0.5">No overtime for this job.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <GlassInput id="a-ot-start" label="OT Start"        type="time"
                          value={artisan.overtime_start_time} onChange={v => setA('overtime_start_time', v)} />
                        <GlassInput id="a-ot-end"   label="OT End"          type="time"
                          value={artisan.overtime_end_time}   onChange={v => setA('overtime_end_time', v)} />
                        <GlassInput id="a-ot-hrs"   label="OT Hours (auto)"
                          value={artisan.overtime_hours}      onChange={v => setA('overtime_hours', v)}
                          placeholder="auto"
                          readOnly={!!(artisan.overtime_start_time && artisan.overtime_end_time)} />
                      </div>
                    )}
                  </div>

                  {/* Delays — shown by default, button to mark N/A */}
                  <div className="border-t border-white/[0.05] pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs font-medium">Delays</span>
                      <button type="button" onClick={() => setDelayNA(v => !v)}
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          delayNA
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                            : 'text-white/35 bg-white/[0.05] border-white/10 hover:bg-white/[0.10] hover:text-white/60'
                        }`}>
                        {delayNA ? '↩ Undo N/A' : 'Mark as N/A'}
                      </button>
                    </div>
                    {delayNA ? (
                      <p className="text-orange-400/50 text-xs italic px-0.5">No delays for this job.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <GlassInput id="a-d-from"  label="Delay From"         type="time"
                          value={artisan.delay_from_time}   onChange={v => setA('delay_from_time', v)} />
                        <GlassInput id="a-d-to"    label="Delay To"           type="time"
                          value={artisan.delay_to_time}     onChange={v => setA('delay_to_time', v)} />
                        <GlassInput id="a-d-total" label="Delay Hours (auto)"
                          value={artisan.total_delay_hours} onChange={v => setA('total_delay_hours', v)}
                          placeholder="auto"
                          readOnly={!!(artisan.delay_from_time && artisan.delay_to_time)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Spares Used ── */}
                <div className="border border-white/[0.07] rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <Package className="h-3.5 w-3.5 text-amber-400/70" /> Spares Used
                  </div>

                  {/* Add spare row */}
                  <div className="grid grid-cols-[1fr_70px_80px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className={GLB}>Spare / Part</label>
                      <SpareAutocomplete
                        value={newSpare.name}
                        onChange={v => setNewSpare(s => ({ ...s, name: v }))}
                        onSelect={item => setNewSpare(s => ({
                          ...s,
                          name: item.description,
                          unit_cost: String(item.unit_price ?? 0),
                        }))}
                        placeholder="Search spares register or type…" />
                    </div>
                    <div className="space-y-1">
                      <label className={GLB}>Qty</label>
                      <input type="number" min="0.01" step="0.01" value={newSpare.quantity}
                        onChange={e => setNewSpare(s => ({ ...s, quantity: e.target.value }))}
                        className={`w-full rounded border px-2 py-1.5 text-xs outline-none transition-colors ${GIN}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={GLB}>Unit Cost (R)</label>
                      <input type="number" min="0" step="0.01" value={newSpare.unit_cost}
                        onChange={e => setNewSpare(s => ({ ...s, unit_cost: e.target.value }))}
                        className={`w-full rounded border px-2 py-1.5 text-xs outline-none transition-colors ${GIN}`} />
                    </div>
                    <button type="button" onClick={addArtisanSpare}
                      className="h-[30px] px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded text-amber-300 text-xs font-medium transition-colors">
                      Add
                    </button>
                  </div>

                  {artisanSpares.length > 0 && (
                    <div className="space-y-1.5">
                      {artisanSpares.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-1.5">
                          <Package className="h-3 w-3 text-amber-400/50 flex-shrink-0" />
                          <span className="flex-1 text-white/75 text-xs truncate">{s.name}</span>
                          <span className="text-white/35 text-xs">×{s.quantity}</span>
                          <span className="text-amber-300/70 text-xs font-mono">R {(s.quantity * s.unit_cost).toFixed(2)}</span>
                          <button type="button" onClick={() => setArtisanSpares(p => p.filter(x => x.id !== s.id))}
                            className="text-white/20 hover:text-red-400 transition-colors ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <span className="text-amber-300/80 text-xs font-mono font-semibold">
                          Total: ${artisanSpares.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Artisan Sign-off */}
                <div className="border border-white/[0.07] rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <Signature className="h-3.5 w-3.5" /> Artisan Sign-off
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <PersonAutocomplete id="a-name" label="Artisan Name"
                      value={artisan.artisan_name} onChange={v => setA('artisan_name', v)}
                      placeholder="Type to search employees…" />
                    <GlassInput id="a-sign" label="Signature (type name)"
                      value={artisan.artisan_sign} onChange={v => setA('artisan_sign', v)}
                      placeholder="Type name" autoComplete="name" />
                    <GlassInput id="a-date" label="Date" type="date"
                      value={artisan.artisan_date} onChange={v => setA('artisan_date', v)} />
                  </div>
                </div>

                <Button onClick={saveArtisan} disabled={savingA}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30">
                  <Save className="h-3.5 w-3.5 mr-2" />
                  {savingA ? 'Saving…' : 'Save Artisan Report'}
                </Button>
              </div>
            )}
          </div>

          {/* ── SECTION 3: Foreman Sign-off ── */}
          <div className="bg-white/[0.04] rounded-xl border border-violet-500/20 overflow-hidden">
            <button type="button"
              className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
              onClick={() => setS3Open(o => !o)}
            >
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              <span className="text-white/90 font-semibold text-sm">Foreman Sign-off</span>
              <span className="ml-auto text-white/35 text-xs mr-2">Foreman review &amp; approval</span>
              {s3Open ? <ChevronUp className="h-4 w-4 text-white/35" /> : <ChevronDown className="h-4 w-4 text-white/35" />}
            </button>

            {s3Open && (
              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={GLB}>Final Status</label>
                    <Select value={foreman.status} onValueChange={v => setF('status', v)}>
                      <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0d1f35] border-white/10 text-white">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed ✓</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="not-done">Not Done</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="f-progress" className={GLB}>Confirmed Progress: {foreman.progress}%</label>
                    <input id="f-progress" type="range" min="0" max="100" value={foreman.progress}
                      title={`Foreman confirmed progress: ${foreman.progress}%`}
                      onChange={e => setF('progress', parseInt(e.target.value))}
                      className="w-full mt-2 accent-violet-400" />
                  </div>
                </div>

                <PredictiveArea id="f-notes" label="Foreman Comments"
                  value={foreman.notes} onChange={v => setF('notes', v)}
                  placeholder="Comments on work done, observations, follow-up required…"
                  rows={3} autoComplete="on" />

                <div className="border border-white/[0.07] rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <Signature className="h-3.5 w-3.5" /> Foreman Sign-off
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <PersonAutocomplete id="f-name" label="Foreman Name"
                      value={foreman.foreman_name} onChange={v => setF('foreman_name', v)}
                      placeholder="Type to search employees…" />
                    <GlassInput id="f-sign" label="Signature (type name)"
                      value={foreman.foreman_sign} onChange={v => setF('foreman_sign', v)}
                      placeholder="Type name" autoComplete="name" />
                    <GlassInput id="f-date" label="Date" type="date"
                      value={foreman.foreman_date} onChange={v => setF('foreman_date', v)} />
                  </div>
                </div>

                <Button onClick={saveForeman} disabled={savingF}
                  className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30">
                  <Save className="h-3.5 w-3.5 mr-2" />
                  {savingF ? 'Saving…' : 'Save Foreman Sign-off'}
                </Button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <button type="button"
              onClick={() => {
                if (confirm('Delete this work order? This cannot be undone.')) {
                  onDelete(workOrder.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-xs transition-colors">
              <Trash2 className="h-3 w-3" /> Delete work order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ANALYTICS CHARTS ====================
function DonutChart({ segments, centerLabel }: {
  segments: { value: number; color: string; label: string }[];
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-full text-white/20 text-xs">No data</div>
  );
  const r = 36, cx = 50, cy = 50, sw = 14;
  const circ = 2 * Math.PI * r;
  let startPct = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = pct * circ;
        const dashOff = -(startPct * circ);
        startPct += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={dashOff}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}>
            <title>{seg.label}: {seg.value} ({Math.round(pct * 100)}%)</title>
          </circle>
        );
      })}
      {centerLabel && (
        <text x="50" y="47" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="600">{centerLabel}</text>
      )}
      <text x="50" y="59" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7">
        {total} total
      </text>
    </svg>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string; value: number; total: number }[] }) {
  return (
    <div className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-white/55 text-xs flex-1 truncate">{item.label}</span>
          <span className="text-white/70 text-xs font-medium">{item.value}</span>
          <span className="text-white/30 text-[10px] w-8 text-right">
            {item.total > 0 ? `${Math.round(item.value / item.total * 100)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function HBarChart({ data, maxColor }: { data: { label: string; value: number }[]; maxColor: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs truncate max-w-[140px]">{d.label}</span>
            <span className="text-white/70 text-xs font-medium ml-2">{d.value}</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: maxColor, opacity: 0.6 + 0.4 * (d.value / max) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeHeatmap({ hourBuckets }: { hourBuckets: number[] }) {
  const max = Math.max(...hourBuckets, 1);
  const LABELS = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22'];
  const PERIOD_COLORS: Record<string, string> = {
    night: '#6366f1', dawn: '#f59e0b', morning: '#10b981', afternoon: '#3b82f6', evening: '#f43f5e', late: '#8b5cf6',
  };
  const getPeriod = (h: number) => {
    if (h < 4) return 'night'; if (h < 7) return 'dawn'; if (h < 12) return 'morning';
    if (h < 17) return 'afternoon'; if (h < 21) return 'evening'; return 'late';
  };
  const peakHour = hourBuckets.indexOf(max);

  return (
    <div>
      <div className="flex gap-0.5">
        {hourBuckets.map((count, h) => {
          const intensity = count / max;
          const color = PERIOD_COLORS[getPeriod(h)];
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5" title={`${String(h).padStart(2, '0')}:00 — ${count} breakdown${count !== 1 ? 's' : ''}`}>
              <div className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: 40,
                  backgroundColor: count > 0 ? color : 'rgba(255,255,255,0.04)',
                  opacity: count > 0 ? 0.2 + 0.8 * intensity : 1,
                  border: h === peakHour && count > 0 ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                }} />
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">
        {LABELS.map((l, i) => (
          <div key={i} className="text-[9px] text-white/25" style={{ width: `${100 / 12}%` }}>{l}</div>
        ))}
      </div>
      {max > 0 && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {Object.entries(PERIOD_COLORS).map(([period, color]) => (
            <div key={period} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.7 }} />
              <span className="text-white/30 text-[9px] capitalize">{period}</span>
            </div>
          ))}
          <span className="text-white/25 text-[9px] ml-auto">
            Peak: {String(peakHour).padStart(2, '0')}:00 ({hourBuckets[peakHour]} breakdowns)
          </span>
        </div>
      )}
    </div>
  );
}

function ArtisanCostChart({ artisanCost }: { artisanCost: ReturnType<typeof calcStats>['artisanCost'] }) {
  if (artisanCost.length === 0) return (
    <div className="flex items-center justify-center h-20 text-white/20 text-xs">No breakdown data yet</div>
  );
  const top = artisanCost.slice(0, 6);
  const maxHours = Math.max(...top.map(a => a.hours), 1);
  return (
    <div className="space-y-2">
      {top.map((a, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs truncate max-w-[120px]">{a.name}</span>
            <div className="flex items-center gap-3 text-[10px] text-right">
              <span className="text-[#86BBD8]/70">{a.hours.toFixed(1)}h</span>
              {a.sparesCost > 0 && <span className="text-amber-300/70">${a.sparesCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
              <span className="text-white/35">({a.count} WO)</span>
            </div>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#86BBD8]/50 transition-all duration-500"
              style={{ width: `${(a.hours / maxHours) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPanel({ stats, isOpen, onToggle, standalone }: {
  stats: ReturnType<typeof calcStats>;
  isOpen: boolean;
  onToggle: () => void;
  standalone?: boolean;
}) {
  const classSegs = [
    { value: stats.plannedMaintenance, color: '#10b981', label: 'Planned Maintenance' },
    { value: stats.projects,           color: '#3b82f6', label: 'Projects' },
    { value: stats.breakdowns,         color: '#ef4444', label: 'Breakdowns' },
    { value: stats.customClass,        color: '#8b5cf6', label: 'Custom / Other' },
  ].filter(s => s.value > 0);

  const statusSegs = [
    { value: stats.pending,    color: '#fbbf24', label: 'Pending' },
    { value: stats.inProgress, color: '#60a5fa', label: 'In Progress' },
    { value: stats.completed,  color: '#34d399', label: 'Completed' },
    { value: stats.onHold,     color: '#fb923c', label: 'On Hold' },
  ].filter(s => s.value > 0);

  const discSegs = [
    { value: stats.mechanical, color: '#86BBD8', label: 'Mechanical' },
    { value: stats.electrical, color: '#fbbf24', label: 'Electrical' },
  ].filter(s => s.value > 0);

  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden">
      {!standalone && (
        <button type="button" className="w-full flex items-center gap-3 px-5 py-3 border-b border-white/[0.08] hover:bg-white/[0.02] transition-colors"
          onClick={onToggle}>
          <BarChart2 className="h-4 w-4 text-[#86BBD8]" />
          <span className="text-white/90 font-semibold text-sm">Analytics &amp; Insights</span>
          <span className="ml-auto text-white/25 text-xs mr-2">
            {stats.total} work orders · {stats.efficiency}% efficiency
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-white/35" /> : <ChevronDown className="h-4 w-4 text-white/35" />}
        </button>
      )}
      {standalone && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08]">
          <BarChart2 className="h-5 w-5 text-[#86BBD8]" />
          <span className="text-white/90 font-semibold">Analytics &amp; Insights</span>
          <span className="ml-auto text-white/35 text-sm">
            {stats.total} work orders · {stats.efficiency}% efficiency · ${stats.sparesTotalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} spares
          </span>
        </div>
      )}

      {(isOpen || standalone) && (
        <div className="p-5 space-y-6">

          {/* KPI summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total WOs',       value: stats.total,            color: 'text-white', sub: undefined },
              { label: 'Breakdowns',      value: stats.breakdowns,       color: 'text-red-300', sub: stats.total > 0 ? `${Math.round(stats.breakdowns/stats.total*100)}%` : '—' },
              { label: 'Planned Maint.',  value: stats.plannedMaintenance, color: 'text-green-300', sub: undefined },
              { label: 'Breakdown Hrs',  value: `${stats.artisanCost.reduce((a,x) => a+x.hours, 0).toFixed(1)}h`, color: 'text-[#86BBD8]', sub: undefined },
              { label: 'Spares Cost',    value: `$${stats.sparesTotalCost.toLocaleString('en-US',{maximumFractionDigits:0})}`, color: 'text-amber-300', sub: undefined },
              { label: 'Completion',     value: `${stats.efficiency}%`,  color: stats.efficiency >= 70 ? 'text-green-300' : stats.efficiency >= 40 ? 'text-yellow-300' : 'text-red-300', sub: `${stats.completed}/${stats.total}` },
            ].map(k => (
              <div key={k.label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-center">
                <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
                <div className="text-white/35 text-[10px] mt-0.5">{k.label}</div>
                {k.sub && <div className="text-white/20 text-[9px]">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Row 1: Three donut charts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Classification donut */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#86BBD8]" /> WO Classification
              </div>
              <div className="h-28"><DonutChart segments={classSegs} centerLabel={String(stats.total)} /></div>
              <ChartLegend items={classSegs.map(s => ({ ...s, total: stats.total }))} />
            </div>

            {/* Status donut */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-green-400" /> Status Breakdown
              </div>
              <div className="h-28"><DonutChart segments={statusSegs} centerLabel={`${stats.efficiency}%`} /></div>
              <ChartLegend items={statusSegs.map(s => ({ ...s, total: stats.total }))} />
            </div>

            {/* Discipline donut */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-amber-400" /> Discipline
              </div>
              <div className="h-28"><DonutChart segments={discSegs} centerLabel={stats.mechanical + stats.electrical > 0 ? undefined : '—'} /></div>
              <ChartLegend items={discSegs.map(s => ({ ...s, total: stats.mechanical + stats.electrical }))} />
              {stats.sparesTotalCost > 0 && (
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-center">
                  <div className="text-white/30 text-[10px]">Spares Cost</div>
                  <div className="text-amber-300/80 text-sm font-semibold font-mono">
                    ${stats.sparesTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Artisan cost + Failure modes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Artisan breakdown cost */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
                <HardHat className="h-3.5 w-3.5 text-[#86BBD8]" /> Artisan Hours (Breakdowns)
              </div>
              <ArtisanCostChart artisanCost={stats.artisanCost} />
              {stats.artisanCost.length > 0 && (
                <div className="mt-3 text-[10px] text-white/25">
                  Hours shown as a cost proxy. Spares cost in USD ($) shown where entered.
                </div>
              )}
            </div>

            {/* Failure modes */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Failure Modes (Top 8)
              </div>
              {stats.failureModes.length > 0
                ? <HBarChart data={stats.failureModes.map(([label, value]) => ({ label, value }))} maxColor="#ef4444" />
                : <div className="text-white/20 text-xs">No breakdown failure modes recorded</div>
              }
            </div>
          </div>

          {/* Row 3: Time-of-day heatmap */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <div className="text-white/60 text-xs font-medium mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-violet-400" /> Breakdown Occurrence — Time of Day
            </div>
            {stats.breakdowns > 0
              ? <TimeHeatmap hourBuckets={stats.hourBuckets} />
              : <div className="text-white/20 text-xs py-4">No breakdown time data recorded yet</div>
            }
          </div>

        </div>
      )}
    </div>
  );
}

// ==================== WORK ORDER CARD (grid view) ====================
function WorkOrderCard({ workOrder, onClick, onEdit }: {
  workOrder: WorkOrder;
  onClick: () => void;
  onEdit: () => void;
}) {
  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-4 flex flex-col gap-3 transition-colors group cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white/40 font-mono text-[10px]">#{workOrder.work_order_number}</span>
            {workOrder.classification && (
              <span className={`px-1.5 py-px rounded text-[9px] font-medium border ${
                workOrder.classification === 'breakdown' ? 'bg-red-500/15 text-red-300 border-red-500/25'
                : workOrder.classification === 'planned_maintenance' ? 'bg-green-500/15 text-green-300 border-green-500/25'
                : workOrder.classification === 'project' ? 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                : 'bg-purple-500/15 text-purple-300 border-purple-500/25'
              }`}>
                {workOrder.classification === 'planned_maintenance' ? 'PM'
                  : workOrder.classification === 'project' ? 'Proj'
                  : workOrder.classification === 'breakdown' ? 'BKD' : 'Custom'}
              </span>
            )}
          </div>
          <button type="button" onClick={onClick} className="text-left mt-1">
            <div className="text-white/90 font-semibold text-sm leading-tight group-hover:text-white transition-colors truncate max-w-[200px]">
              {workOrder.equipment_info}
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-white/30 hover:text-white/70 transition-colors"
            title="Edit work order">
            <Pencil className="h-3 w-3" />
          </button>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pcfg.dot}`} title={pcfg.label} />
        </div>
      </div>

      {/* Body */}
      <div className="text-white/40 text-xs line-clamp-2 leading-relaxed flex-1">{workOrder.job_request_details}</div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <div className="text-white/50 text-xs truncate">{workOrder.allocated_to || workOrder.artisan_name || '—'}</div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${scfg.pill}`}>{scfg.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/[0.06] rounded-full h-1">
          <div className="bg-[#86BBD8] h-1 rounded-full transition-all" style={{ width: `${workOrder.progress}%` }} />
        </div>
        <span className="text-white/25 text-[10px] w-7 text-right">{workOrder.progress}%</span>
      </div>
    </div>
  );
}

// ==================== WORK ORDER ROW ====================
function WorkOrderRow({ workOrder, onClick, isExpanded, onToggle, onEdit }: {
  workOrder: WorkOrder;
  onClick: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const scfg = statusCfg(workOrder.status);
  const pcfg = priorityCfg(workOrder.priority);
  const artisanDisplay = workOrder.allocated_to || workOrder.artisan_name || '—';
  const foremanDisplay = workOrder.authorising_foreman || workOrder.foreman_name || workOrder.responsible_foreman || '—';

  return (
    <div className="border-b border-white/[0.05]">
      {/* ── Main row ── */}
      <div className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors group">

        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scfg.dot}`} />

        {/* WO # */}
        <div className="text-white/40 font-mono text-xs w-[5.5rem] flex-shrink-0 truncate">
          #{workOrder.work_order_number}
        </div>

        {/* Machine + Artisan — click opens full modal */}
        <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white/90 font-medium text-sm truncate group-hover:text-white transition-colors">
              {workOrder.equipment_info}
            </span>
            {workOrder.classification && (
              <span className={`px-1.5 py-px rounded text-[9px] font-medium border flex-shrink-0 ${
                workOrder.classification === 'breakdown'
                  ? 'bg-red-500/15 text-red-300 border-red-500/25'
                  : workOrder.classification === 'planned_maintenance'
                  ? 'bg-green-500/15 text-green-300 border-green-500/25'
                  : workOrder.classification === 'project'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                  : 'bg-purple-500/15 text-purple-300 border-purple-500/25'
              }`}>
                {workOrder.classification === 'planned_maintenance' ? 'PM'
                  : workOrder.classification === 'project' ? 'Proj'
                  : workOrder.classification === 'breakdown' ? 'BKD'
                  : workOrder.classification_custom?.slice(0, 6) || 'Custom'}
              </span>
            )}
            {workOrder.discipline && (
              <span className={`px-1.5 py-px rounded text-[9px] border flex-shrink-0 ${
                workOrder.discipline === 'Electrical'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                  : 'bg-[#86BBD8]/15 text-[#86BBD8]/80 border-[#86BBD8]/25'
              }`}>
                {workOrder.discipline === 'Electrical' ? '⚡' : '⚙'} {workOrder.trade || workOrder.discipline}
              </span>
            )}
          </div>
          <div className="text-white/40 text-xs truncate mt-0.5">
            {artisanDisplay}{workOrder.to_department ? ` · ${workOrder.to_department}` : ''}
          </div>
        </button>

        {/* Job snippet */}
        <div className="hidden md:block flex-1 min-w-0">
          <div className="text-white/30 text-xs truncate">{workOrder.job_request_details}</div>
        </div>

        {/* Progress */}
        <div className="w-16 flex-shrink-0 hidden sm:block">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-white/10 rounded-full h-1">
              <div className="bg-[#86BBD8] h-1 rounded-full transition-all"
                style={{ width: `${workOrder.progress}%` }} />
            </div>
            <span className="text-white/35 text-[10px] w-5 text-right">{workOrder.progress}%</span>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${scfg.pill}`}>
            {scfg.label}
          </span>
        </div>

        {/* Priority dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pcfg.dot}`} title={pcfg.label} />

        {/* Date */}
        <div className="text-white/30 text-xs flex-shrink-0 hidden lg:block w-[5.5rem]">
          {workOrder.date_raised}
        </div>

        {/* Edit button */}
        <button type="button" onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Edit work order"
          className="p-1 rounded text-white/15 hover:text-white/60 hover:bg-white/[0.06] transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Expand toggle — quick preview */}
        <button type="button" onClick={onToggle}
          title={isExpanded ? 'Collapse preview' : 'Quick preview'}
          className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors flex-shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Inline quick-view ── */}
      {isExpanded && (
        <div className="px-14 pb-4 pt-2 bg-white/[0.02] border-t border-white/[0.04]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5">
            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Artisan</div>
              <div className="text-white/70 text-xs">{artisanDisplay}</div>
            </div>
            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Foreman</div>
              <div className="text-white/70 text-xs">{foremanDisplay}</div>
            </div>
            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Time Worked</div>
              <div className="text-white/70 text-xs">{workOrder.total_time_worked || '—'}</div>
            </div>
            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Est. Hours</div>
              <div className="text-white/70 text-xs">{workOrder.estimated_hours ? `${workOrder.estimated_hours}h` : '—'}</div>
            </div>
            {(workOrder.work_done_details || workOrder.job_request_details) && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">
                  {workOrder.work_done_details ? 'Work Done' : 'Job Request'}
                </div>
                <div className="text-white/55 text-xs leading-relaxed line-clamp-3">
                  {workOrder.work_done_details || workOrder.job_request_details}
                </div>
              </div>
            )}
            {workOrder.cause_of_failure && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Cause of Failure</div>
                <div className="text-white/55 text-xs line-clamp-2">{workOrder.cause_of_failure}</div>
              </div>
            )}
            {workOrder.failure_mode && (
              <div>
                <div className="text-white/25 text-[10px] uppercase tracking-wide mb-0.5">Failure Mode</div>
                <div className="text-red-300/70 text-xs">{workOrder.failure_mode}</div>
              </div>
            )}
            {workOrder.spares_used && workOrder.spares_used.length > 0 && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-white/25 text-[10px] uppercase tracking-wide mb-1">Spares Used</div>
                <div className="flex flex-wrap gap-1.5">
                  {workOrder.spares_used.map(s => (
                    <span key={s.id} className="bg-amber-500/10 border border-amber-500/20 text-amber-300/70 text-[10px] px-2 py-0.5 rounded-full">
                      {s.name} ×{s.quantity} · ${(s.quantity * s.unit_cost).toFixed(0)}
                    </span>
                  ))}
                  <span className="bg-white/[0.05] border border-white/10 text-white/40 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    Total: ${workOrder.spares_used.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onClick}
              className="text-[#86BBD8]/70 hover:text-[#86BBD8] text-xs flex items-center gap-1.5 transition-colors">
              Open full details <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SCHEDULE ROW ====================
function ScheduleRow({ schedule, onEdit, onDelete, onToggle, onRunNow }: {
  schedule: MaintenanceSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRunNow: () => void;
}) {
  const pcfg = priorityCfg(schedule.priority);
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${schedule.active ? 'bg-green-400' : 'bg-white/20'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-white/90 font-medium text-sm truncate">{schedule.name}</div>
        <div className="text-white/40 text-xs truncate">
          {schedule.equipment_info}{schedule.to_department ? ` · ${schedule.to_department}` : ''}
          {schedule.allocated_to ? ` — ${schedule.allocated_to}` : ''}
        </div>
      </div>
      <div className="text-[#86BBD8]/60 text-xs flex-shrink-0 hidden md:block w-52 truncate">
        <Repeat2 className="h-3 w-3 inline mr-1 opacity-60" />{recurrenceLabel(schedule)}
      </div>
      <div className="flex-shrink-0 hidden sm:block text-right">
        <div className="text-white/25 text-[10px] uppercase tracking-wide">Next</div>
        <div className="text-white/65 text-xs">{schedule.next_due_date || '—'}</div>
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pcfg.dot}`} title={pcfg.label} />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Generate WO now */}
        <button type="button" onClick={onRunNow} title="Create work order(s) from this schedule now"
          className="text-[10px] px-2.5 py-0.5 rounded border transition-colors text-[#86BBD8]/80 bg-[#86BBD8]/[0.10] border-[#86BBD8]/25 hover:bg-[#86BBD8]/[0.22] hover:text-[#86BBD8] whitespace-nowrap font-medium">
          Create Work Order(s)
        </button>
        <button type="button" onClick={onToggle}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            schedule.active
              ? 'text-green-400 bg-green-500/10 border-green-500/25 hover:bg-green-500/20'
              : 'text-white/30 bg-white/[0.05] border-white/10 hover:bg-white/[0.10]'
          }`}>
          {schedule.active ? 'Active' : 'Paused'}
        </button>
        <button type="button" onClick={onEdit} title="Edit schedule"
          className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded p-1.5 transition-colors">
          <Pencil className="h-3 w-3 text-white/50" />
        </button>
        <button type="button" onClick={onDelete} title="Delete schedule"
          className="bg-white/[0.06] hover:bg-red-500/[0.15] border border-white/10 hover:border-red-500/30 rounded p-1.5 transition-colors">
          <Trash2 className="h-3 w-3 text-white/50" />
        </button>
      </div>
    </div>
  );
}

// ==================== CREATE SCHEDULE MODAL ====================
interface CreateScheduleModalProps {
  isOpen: boolean;
  initial: MaintenanceSchedule | null;
  onClose: () => void;
  onSave: (s: MaintenanceSchedule) => void;
}

function CreateScheduleModal({ isOpen, initial, onClose, onSave }: CreateScheduleModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const blankForm = () => ({
    name: '',
    equipment_info: '',
    to_department: '',
    allocated_to: typeof window !== 'undefined' ? localStorage.getItem('maint_artisan_name') || '' : '',
    authorising_foreman: typeof window !== 'undefined' ? localStorage.getItem('maint_foreman_name') || '' : '',
    estimated_hours: '2',
    job_request_details: '',
    job_instructions: '',
    priority: 'medium' as WorkOrderPriority,
    recurrence_type: 'weekly' as RecurrenceType,
    recurrence_dow: 1,
    recurrence_dom: 1,
    recurrence_months: [0, 3, 6, 9] as number[],
    specific_dates: [] as string[],
    advance_days: 1,
    start_date: today,
  });

  const [form, setForm] = useState(blankForm);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setForm({
        name: initial.name,
        equipment_info: initial.equipment_info,
        to_department: initial.to_department,
        allocated_to: initial.allocated_to,
        authorising_foreman: initial.authorising_foreman,
        estimated_hours: initial.estimated_hours,
        job_request_details: initial.job_request_details,
        job_instructions: initial.job_instructions,
        priority: initial.priority,
        recurrence_type: initial.recurrence_type,
        recurrence_dow: initial.recurrence_dow,
        recurrence_dom: initial.recurrence_dom,
        recurrence_months: initial.recurrence_months ?? [],
        specific_dates: initial.specific_dates ?? [],
        advance_days: initial.advance_days ?? 1,
        start_date: initial.next_due_date || today,
      });
    } else {
      setForm(blankForm());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: ReturnType<typeof blankForm>[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleMonth = (m: number) =>
    setForm(f => ({
      ...f,
      recurrence_months: f.recurrence_months.includes(m)
        ? f.recurrence_months.filter(x => x !== m)
        : [...f.recurrence_months, m].sort((a, b) => a - b),
    }));

  const addDate = () => {
    if (!newDate || form.specific_dates.includes(newDate)) return;
    setForm(f => ({ ...f, specific_dates: [...f.specific_dates, newDate].sort() }));
    setNewDate('');
  };

  const removeDate = (d: string) =>
    setForm(f => ({ ...f, specific_dates: f.specific_dates.filter(x => x !== d) }));

  const handleSave = () => {
    if (!form.name.trim() || !form.equipment_info.trim() || !form.job_request_details.trim()) {
      toast.error('Schedule name, equipment, and job request are required');
      return;
    }
    if (form.recurrence_type === 'custom' && form.specific_dates.length === 0) {
      toast.error('Add at least one date for a custom schedule');
      return;
    }
    const schedule: MaintenanceSchedule = {
      id: initial?.id || Date.now().toString(),
      name: form.name.trim(),
      equipment_info: form.equipment_info.trim(),
      to_department: form.to_department,
      allocated_to: form.allocated_to,
      authorising_foreman: form.authorising_foreman,
      estimated_hours: form.estimated_hours,
      job_request_details: form.job_request_details.trim(),
      job_instructions: form.job_instructions,
      priority: form.priority,
      recurrence_type: form.recurrence_type,
      recurrence_dow: form.recurrence_dow,
      recurrence_dom: form.recurrence_dom,
      recurrence_months: form.recurrence_months,
      specific_dates: form.specific_dates,
      advance_days: form.advance_days,
      active: initial?.active ?? true,
      next_due_date: form.start_date,
      last_generated: initial?.last_generated || '',
      created_at: initial?.created_at || new Date().toISOString(),
    };
    onSave(schedule);
    onClose();
  };

  const inputCls = "bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10]";
  const labelCls = "text-white/55 text-xs";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgba(5,15,28,0.96)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className="bg-[#86BBD8]/20 p-2 rounded-lg border border-[#86BBD8]/25">
              <CalendarClock className="h-4 w-4 text-[#86BBD8]" />
            </div>
            {initial ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Schedule Name */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Schedule Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Weekly Compressor Check" className={inputCls} />
          </div>

          {/* Machine / Equipment */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Machine / Equipment *</Label>
            <EquipmentAutocomplete value={form.equipment_info} onChange={v => set('equipment_info', v)} />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Department</Label>
            <Input value={form.to_department} onChange={e => set('to_department', e.target.value)}
              placeholder="Engineering…" className={inputCls} />
          </div>

          {/* Allocated To + Foreman — employee pickers */}
          <div className="grid grid-cols-2 gap-3">
            <PersonAutocomplete id="cs-artisan" label="Allocated To"
              value={form.allocated_to} onChange={v => set('allocated_to', v)} />
            <PersonAutocomplete id="cs-foreman" label="Authorising Foreman"
              value={form.authorising_foreman} onChange={v => set('authorising_foreman', v)} />
          </div>

          {/* Hours + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Est. Hours</Label>
              <Input type="number" min="0.5" step="0.5" value={form.estimated_hours}
                onChange={e => set('estimated_hours', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v as WorkOrderPriority)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1f35] border-white/10 text-white">
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-3 border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <Repeat2 className="h-4 w-4 text-[#86BBD8]" /> Recurrence
            </div>

            {/* Type buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'] as RecurrenceType[]).map(rt => (
                <button key={rt} type="button" onClick={() => set('recurrence_type', rt)}
                  className={`px-3 py-1 rounded-lg text-xs border transition-colors capitalize ${
                    form.recurrence_type === rt
                      ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white font-medium'
                      : 'bg-white/[0.05] border-white/10 text-white/50 hover:bg-white/[0.10] hover:text-white/70'
                  }`}>
                  {rt}
                </button>
              ))}
            </div>

            {/* Day of week (weekly / biweekly) */}
            {(form.recurrence_type === 'weekly' || form.recurrence_type === 'biweekly') && (
              <div className="space-y-1.5">
                <Label className={labelCls}>Day of Week</Label>
                <div className="flex gap-1">
                  {DOW.map((d, i) => (
                    <button key={d} type="button" onClick={() => set('recurrence_dow', i)}
                      className={`flex-1 py-1.5 rounded text-[11px] border transition-colors ${
                        form.recurrence_dow === i
                          ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white'
                          : 'bg-white/[0.05] border-white/10 text-white/40 hover:bg-white/[0.10]'
                      }`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of month (monthly / quarterly / yearly) */}
            {(form.recurrence_type === 'monthly' || form.recurrence_type === 'quarterly' || form.recurrence_type === 'yearly') && (
              <div className="space-y-1.5">
                <Label className={labelCls}>Day of Month (1–28)</Label>
                <Input type="number" min="1" max="28" value={form.recurrence_dom}
                  onChange={e => set('recurrence_dom', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={inputCls} />
              </div>
            )}

            {/* Which months (quarterly) */}
            {form.recurrence_type === 'quarterly' && (
              <div className="space-y-1.5">
                <Label className={labelCls}>Which months</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MON.map((m, i) => (
                    <button key={m} type="button" onClick={() => toggleMonth(i)}
                      className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                        form.recurrence_months.includes(i)
                          ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white'
                          : 'bg-white/[0.05] border-white/10 text-white/40 hover:bg-white/[0.10]'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Month (yearly) */}
            {form.recurrence_type === 'yearly' && (
              <div className="space-y-1.5">
                <Label className={labelCls}>Month of Year</Label>
                <Select value={String(form.recurrence_months[0] ?? 0)}
                  onValueChange={v => set('recurrence_months', [parseInt(v)])}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0d1f35] border-white/10 text-white">
                    {MON.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom dates */}
            {form.recurrence_type === 'custom' && (
              <div className="space-y-2">
                <Label className={labelCls}>Specific Dates</Label>
                <div className="flex gap-2">
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className={`${inputCls} flex-1`} />
                  <Button type="button" onClick={addDate} size="sm"
                    className="bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 border border-[#86BBD8]/30 text-white">
                    Add
                  </Button>
                </div>
                {form.specific_dates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.specific_dates.map(d => (
                      <span key={d} className="flex items-center gap-1 bg-white/[0.08] border border-white/10 rounded px-2 py-0.5 text-xs text-white/70">
                        {d}
                        <button type="button" onClick={() => removeDate(d)} title={`Remove ${d}`}
                          className="text-white/30 hover:text-red-400 ml-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>{initial ? 'Next Due Date' : 'First Occurrence Date'}</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Generate work order ___ days early</Label>
              <Input type="number" min="0" max="14" value={form.advance_days}
                onChange={e => set('advance_days', Math.max(0, parseInt(e.target.value) || 0))}
                className={inputCls} />
            </div>
          </div>

          {/* Job details */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Job Request — What to Do *</Label>
            <Textarea value={form.job_request_details} onChange={e => set('job_request_details', e.target.value)}
              placeholder="Describe exactly what the artisan needs to do on each occurrence…"
              rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>Special Instructions (optional)</Label>
            <Textarea value={form.job_instructions} onChange={e => set('job_instructions', e.target.value)}
              placeholder="Safety notes, tools, access…"
              rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}
            className="bg-white/[0.08] hover:bg-white/[0.16] text-white/80 border border-white/15">
            Cancel
          </Button>
          <Button onClick={handleSave}
            className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/35">
            {initial ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== STATUS TABS CONFIG ====================
const STATUS_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'on-hold',     label: 'On Hold' },
] as const;

// ==================== MAIN PAGE ====================
export default function MaintenancePage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHeroStats, setShowHeroStats] = useState(true);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // Page-level tab
  const [mainTab, setMainTab] = useState<'workorders' | 'analytics'>('workorders');
  const [woViewMode, setWoViewMode] = useState<'list' | 'grid'>('list');
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);

  const handleEditWO = (wo: WorkOrder) => { setEditingWO(wo); setShowCreateModal(true); };
  const handleCloseCreateModal = () => { setShowCreateModal(false); setEditingWO(null); };

  // Expand/collapse state for work order rows (default: all collapsed)
  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set());
  const toggleWO = (id: string) => setExpandedWOs(prev => {
    const next = new Set(prev);
    if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
    return next;
  });

  // Bulk-select / bulk-delete
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(filtered.map(w => String(w.id))));
  const clearSelect = () => setSelectedIds(new Set());
  const exitBulk = () => { setBulkMode(false); clearSelect(); };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Permanently delete ${count} work order${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    let failed = 0;
    for (const id of selectedIds) {
      const { success } = await deleteWorkOrder(id);
      if (!success) failed++;
    }
    exitBulk();
    await load();
    if (failed === 0) toast.success(`${count} work order${count !== 1 ? 's' : ''} deleted`);
    else toast.error(`${count - failed} deleted, ${failed} failed`);
  };

  // Schedule state
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [schedPanelOpen, setSchedPanelOpen] = useState(true);
  const [showCreateSched, setShowCreateSched] = useState(false);
  const [editingSched, setEditingSched] = useState<MaintenanceSchedule | null>(null);

  // Sort + filter state
  type SortBy = 'date-desc' | 'date-asc' | 'priority' | 'machine' | 'status';
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  // Derive selectedOrder reactively so reopening always shows the latest saved data
  const selectedOrder = useMemo(
    () => selectedOrderId ? workOrders.find(w => String(w.id) === String(selectedOrderId)) ?? null : null,
    [workOrders, selectedOrderId]
  );

  const load = async () => {
    setLoading(true);
    const data = await getWorkOrders();
    setWorkOrders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Load schedules and auto-generate due work orders on mount
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
          work_order_number: `WO-${Date.now().toString().slice(-6)}`,
          equipment_info: sched.equipment_info,
          to_department: sched.to_department,
          allocated_to: sched.allocated_to,
          authorising_foreman: sched.authorising_foreman,
          estimated_hours: sched.estimated_hours,
          job_request_details: sched.job_request_details,
          job_instructions: sched.job_instructions,
          priority: sched.priority,
          to_section: '', from_department: '', from_section: '',
          account_number: '', user_lab_today: '',
          date_raised: sched.next_due_date,
          time_raised: new Date().toTimeString().slice(0, 5),
          job_type: { operational: false, maintenance: true, mining: false },
          requested_by: 'Auto-generated', authorising_engineer: '',
          responsible_foreman: sched.authorising_foreman,
          manpower: [],
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
          updated = updated.map(x => x.id === sched.id ? {
            ...x,
            last_generated: today,
            next_due_date: next.toISOString().split('T')[0],
          } : x);
          anyGenerated = true;
        }
      }
      if (anyGenerated) {
        setSchedules(updated);
        persistSchedules(updated);
        toast.success('Recurring maintenance work orders generated');
        load();
      }
    };

    autoGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => calcStats(workOrders), [workOrders]);

  const filtered = useMemo(() => {
    let list = workOrders;
    if (statusTab !== 'all') list = list.filter(w => w.status === statusTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w =>
        w.work_order_number?.toLowerCase().includes(q) ||
        w.equipment_info?.toLowerCase().includes(q) ||
        w.allocated_to?.toLowerCase().includes(q) ||
        w.artisan_name?.toLowerCase().includes(q) ||
        w.to_department?.toLowerCase().includes(q) ||
        w.job_request_details?.toLowerCase().includes(q) ||
        w.requested_by?.toLowerCase().includes(q)
      );
    }
    if (priorityFilter.length > 0) {
      list = list.filter(w => priorityFilter.includes(w.priority));
    }
    const PORD: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const SORD: Record<WorkOrderStatus, number> = {
      'in-progress': 0, pending: 1, 'on-hold': 2, 'not-done': 3,
      completed: 4, postponed: 5, cancelled: 6,
    };
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return (b.date_raised || '').localeCompare(a.date_raised || '');
        case 'date-asc':  return (a.date_raised || '').localeCompare(b.date_raised || '');
        case 'priority':  return (PORD[a.priority] ?? 4) - (PORD[b.priority] ?? 4);
        case 'machine':   return (a.equipment_info || '').localeCompare(b.equipment_info || '');
        case 'status':    return (SORD[a.status] ?? 7) - (SORD[b.status] ?? 7);
        default: return 0;
      }
    });
  }, [workOrders, statusTab, searchQuery, priorityFilter, sortBy]);

  const tabCount = (key: string) =>
    key === 'all' ? workOrders.length : workOrders.filter(w => w.status === key).length;

  const handleCreated = (savedOrder: WorkOrder) => {
    setWorkOrders(prev => {
      const exists = prev.some(w => String(w.id) === String(savedOrder.id));
      return exists
        ? prev.map(w => String(w.id) === String(savedOrder.id) ? savedOrder : w)
        : [savedOrder, ...prev];
    });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteWorkOrder(id);
    setSelectedOrderId(null);
    await load();
    toast.success('Work order deleted');
  };

  const handleRunScheduleNow = async (sched: MaintenanceSchedule) => {
    const today = new Date().toISOString().split('T')[0];
    const machines = sched.equipment_info.split(',').map(s => s.trim()).filter(Boolean);
    const created: WorkOrder[] = [];
    for (let i = 0; i < machines.length; i++) {
      const result = await createWorkOrder({
        work_order_number: nextWONumber(workOrders, created.length),
        equipment_info: machines[i],
        to_department: sched.to_department,
        allocated_to: sched.allocated_to,
        authorising_foreman: sched.authorising_foreman,
        estimated_hours: sched.estimated_hours,
        job_request_details: sched.job_request_details,
        job_instructions: sched.job_instructions,
        priority: sched.priority,
        to_section: '', from_department: '', from_section: '',
        account_number: '', user_lab_today: '',
        date_raised: today,
        time_raised: new Date().toTimeString().slice(0, 5),
        job_type: { operational: false, maintenance: true, mining: false },
        requested_by: 'Manual — from schedule', authorising_engineer: '',
        responsible_foreman: sched.authorising_foreman,
        manpower: [],
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
      toast.success(
        created.length > 1
          ? `${created.length} work orders created from "${sched.name}"`
          : `Work order created from "${sched.name}"`
      );
      setWorkOrders(prev => [...created, ...prev]);
      load();
    }
  };

  return (
    <PageShell>
      {/* ── HERO ── */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#86BBD8]/20 p-2.5 rounded-xl border border-[#86BBD8]/20">
                  <Wrench className="h-6 w-6 text-[#86BBD8]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white font-heading">Work Orders</h1>
                  <p className="text-white/50 text-sm">Maintenance management &amp; tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={load}
                  className="bg-white/[0.08] hover:bg-white/[0.16] text-white/60 border border-white/15 rounded-lg p-2 transition-colors"
                  title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </button>
                {mainTab === 'workorders' && (
                  <Button onClick={() => setShowCreateModal(true)}
                    className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/35 gap-1.5">
                    <Plus className="h-4 w-4" /> New Work Order
                  </Button>
                )}
                <button type="button" onClick={() => setShowHeroStats(s => !s)}
                  title={showHeroStats ? 'Hide stats' : 'Show stats'}
                  className="bg-white/[0.08] hover:bg-white/[0.16] text-white/50 border border-white/10 rounded-lg p-2 transition-colors">
                  {showHeroStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showHeroStats && (
              <div className="border-t border-white/10 px-6 py-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
                {[
                  { label: 'Total',       value: stats.total,      color: 'text-white' },
                  { label: 'Pending',     value: stats.pending,    color: 'text-yellow-300' },
                  { label: 'In Progress', value: stats.inProgress, color: 'text-blue-300' },
                  { label: 'Completed',   value: stats.completed,  color: 'text-green-300' },
                  { label: 'On Hold',     value: stats.onHold,     color: 'text-orange-300' },
                  { label: 'Overdue',     value: stats.overdue,    color: 'text-red-300' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PAGE TAB BAR ── */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pb-3">
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 w-fit">
            {([
              { key: 'workorders', label: 'Work Orders',         icon: Wrench },
              { key: 'analytics',  label: 'Analytics & Insights', icon: BarChart2 },
            ] as { key: 'workorders' | 'analytics'; label: string; icon: ElementType }[]).map(t => {
              const Icon = t.icon;
              const active = mainTab === t.key;
              return (
                <button key={t.key} type="button"
                  onClick={() => { setMainTab(t.key); if (t.key === 'workorders' && bulkMode) exitBulk(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#86BBD8]/25 border border-[#86BBD8]/35 text-white shadow-sm'
                      : 'text-white/45 hover:text-white/75 hover:bg-white/[0.05]'
                  }`}>
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TAB: WORK ORDERS
      ══════════════════════════════════════════ */}
      {mainTab === 'workorders' && (
        <>
          {/* ── SCHEDULES PANEL ── */}
          <section className="relative text-white">
            <div className="container mx-auto px-4 pb-3">
              <div className="oz-glass-panel rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-[#86BBD8]" />
                    <span className="text-white/90 font-semibold text-sm">Recurring Schedules</span>
                    {schedules.length > 0 && (
                      <span className="text-white/30 text-xs bg-white/[0.06] border border-white/10 rounded-full px-2 py-0.5">
                        {schedules.filter(s => s.active).length} active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => { setEditingSched(null); setShowCreateSched(true); }}
                      className="bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 text-white border border-[#86BBD8]/30 gap-1.5 h-7 text-xs">
                      <Plus className="h-3.5 w-3.5" /> New Schedule
                    </Button>
                    <button type="button" onClick={() => setSchedPanelOpen(o => !o)}
                      title={schedPanelOpen ? 'Collapse schedules' : 'Expand schedules'}
                      className="bg-white/[0.08] hover:bg-white/[0.16] text-white/50 border border-white/10 rounded-lg p-1.5 transition-colors">
                      {schedPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {schedPanelOpen && (
                  schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="bg-white/[0.04] p-4 rounded-2xl mb-3 border border-white/[0.06]">
                        <Repeat2 className="h-7 w-7 text-white/20" />
                      </div>
                      <div className="text-white/40 text-sm font-medium">No recurring schedules yet</div>
                      <div className="text-white/25 text-xs mt-1 mb-4">
                        Set up schedules to auto-generate work orders — every week, month, quarter, or custom dates.
                      </div>
                      <Button size="sm" onClick={() => { setEditingSched(null); setShowCreateSched(true); }}
                        className="bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 text-white border border-[#86BBD8]/30 gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Create First Schedule
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {schedules.map(s => (
                        <ScheduleRow key={s.id} schedule={s}
                          onEdit={() => { setEditingSched(s); setShowCreateSched(true); }}
                          onRunNow={() => handleRunScheduleNow(s)}
                          onDelete={() => {
                            if (confirm(`Delete schedule "${s.name}"? This cannot be undone.`)) {
                              const updated = schedules.filter(x => x.id !== s.id);
                              setSchedules(updated);
                              persistSchedules(updated);
                            }
                          }}
                          onToggle={() => {
                            const updated = schedules.map(x => x.id === s.id ? { ...x, active: !x.active } : x);
                            setSchedules(updated);
                            persistSchedules(updated);
                          }}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* ── RECORDS PANEL ── */}
          <section className="relative text-white">
            <div className="container mx-auto px-4 pb-6">
              <div className="oz-glass-panel rounded-2xl overflow-hidden">

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-white/[0.08]">
                  {/* Status tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STATUS_TABS.map(tab => {
                      const active = statusTab === tab.key;
                      return (
                        <button type="button"
                          key={tab.key}
                          onClick={() => setStatusTab(tab.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold'
                              : 'bg-white/[0.05] border-white/[0.12] text-white/55 hover:bg-white/[0.10] hover:text-white/80'
                          }`}
                        >
                          {tab.label}
                          <span className={`ml-1.5 text-[10px] ${active ? 'text-white/75' : 'text-white/30'}`}>
                            {tabCount(tab.key)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto flex-wrap">

                {/* Sort */}
                <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.10] rounded-lg px-2.5 py-1.5">
                  <ArrowUpDown className="h-3 w-3 text-white/35 flex-shrink-0" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortBy)}
                    className="bg-transparent text-white/60 text-xs outline-none cursor-pointer"
                  >
                    <option value="date-desc">Newest first</option>
                    <option value="date-asc">Oldest first</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="machine">Machine A–Z</option>
                  </select>
                </div>

                {/* Priority filter */}
                <div className="relative">
                  <button type="button"
                    onClick={() => setShowFilterMenu(o => !o)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      priorityFilter.length > 0
                        ? 'bg-[#86BBD8]/20 border-[#86BBD8]/40 text-[#86BBD8]'
                        : 'bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-white/[0.12] hover:text-white/70'
                    }`}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {priorityFilter.length > 0 ? `Priority (${priorityFilter.length})` : 'Filter'}
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-[#0d1f35] border border-white/10 rounded-xl p-3 shadow-2xl">
                      <div className="text-white/35 text-[10px] uppercase tracking-wide mb-2">Priority</div>
                      {(['urgent', 'high', 'medium', 'low'] as WorkOrderPriority[]).map(p => {
                        const pcfg = priorityCfg(p);
                        const active = priorityFilter.includes(p);
                        return (
                          <button key={p} type="button"
                            onClick={() => setPriorityFilter(prev =>
                              active ? prev.filter(x => x !== p) : [...prev, p]
                            )}
                            className="w-full flex items-center gap-2.5 py-1.5 text-left transition-colors hover:text-white/90">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                              active ? 'bg-[#86BBD8] border-[#86BBD8]' : 'border-white/20'
                            }`}>
                              {active && <div className="w-1.5 h-1.5 rounded-sm bg-[#0d1f35]" />}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${pcfg.dot}`} />
                            <span className="text-white/70 text-xs capitalize">{p}</span>
                          </button>
                        );
                      })}
                      {priorityFilter.length > 0 && (
                        <button type="button" onClick={() => setPriorityFilter([])}
                          className="mt-2 pt-2 border-t border-white/[0.06] w-full text-center text-[10px] text-white/30 hover:text-white/60 transition-colors">
                          Clear filter
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search machine, artisan, WO#…"
                    className="bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 rounded-lg pl-8 pr-8 py-1.5 text-sm w-52 outline-none focus:border-[#86BBD8]/40 focus:bg-white/[0.10] transition-colors"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* View mode toggle */}
                {!panelMinimized && (
                  <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
                    <button type="button" onClick={() => setWoViewMode('list')}
                      title="List view"
                      className={`p-1.5 rounded transition-colors ${woViewMode === 'list' ? 'bg-white/[0.12] text-white/80' : 'text-white/30 hover:text-white/60'}`}>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                        <rect x="2" y="3" width="12" height="2" rx="1"/><rect x="2" y="7" width="12" height="2" rx="1"/><rect x="2" y="11" width="12" height="2" rx="1"/>
                      </svg>
                    </button>
                    <button type="button" onClick={() => setWoViewMode('grid')}
                      title="Grid view"
                      className={`p-1.5 rounded transition-colors ${woViewMode === 'grid' ? 'bg-white/[0.12] text-white/80' : 'text-white/30 hover:text-white/60'}`}>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                        <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                        <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                      </svg>
                    </button>
                  </div>
                )}

                {/* Collapse / Expand all (list view only) */}
                {filtered.length > 0 && !panelMinimized && !bulkMode && woViewMode === 'list' && (
                  <div className="flex items-center gap-1">
                    <button type="button"
                      onClick={() => setExpandedWOs(new Set(filtered.map(w => String(w.id))))}
                      title="Expand all"
                      className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg px-2 py-1.5 text-white/40 hover:text-white/70 text-[10px] transition-colors flex items-center gap-1">
                      <Maximize2 className="h-3 w-3" /> All
                    </button>
                    <button type="button"
                      onClick={() => setExpandedWOs(new Set())}
                      title="Collapse all"
                      className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg px-2 py-1.5 text-white/40 hover:text-white/70 text-[10px] transition-colors flex items-center gap-1">
                      <Minimize2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Bulk select toggle */}
                {!panelMinimized && filtered.length > 0 && !bulkMode && (
                  <button type="button" onClick={() => setBulkMode(true)}
                    className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors bg-white/[0.06] border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white/70">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Select
                  </button>
                )}

                {/* Minimize */}
                <button type="button"
                  onClick={() => setPanelMinimized(m => !m)}
                  title={panelMinimized ? 'Expand panel' : 'Minimize panel'}
                  className="bg-white/[0.08] hover:bg-white/[0.16] text-white/50 border border-white/10 rounded-lg p-1.5 transition-colors">
                  {panelMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bulk-select action bar */}
            {bulkMode && !panelMinimized && (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-[#86BBD8]/[0.06] border-b border-[#86BBD8]/20">
                {/* Select-all checkbox */}
                <button type="button"
                  onClick={() => selectedIds.size === filtered.length ? clearSelect() : selectAll()}
                  className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    selectedIds.size === filtered.length && filtered.length > 0
                      ? 'bg-[#86BBD8] border-[#86BBD8]'
                      : selectedIds.size > 0
                      ? 'bg-[#86BBD8]/40 border-[#86BBD8]'
                      : 'border-white/30 bg-transparent'
                  }`}>
                    {selectedIds.size > 0 && <div className="w-2 h-0.5 bg-white rounded-full" />}
                  </div>
                  {selectedIds.size === 0 ? 'Select all' : `${selectedIds.size} selected`}
                </button>

                <div className="flex-1" />

                {selectedIds.size > 0 && (
                  <button type="button" onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete {selectedIds.size} work order{selectedIds.size !== 1 ? 's' : ''}
                  </button>
                )}

                <button type="button" onClick={exitBulk}
                  className="flex items-center gap-1 text-xs text-white/35 hover:text-white/65 transition-colors px-2 py-1.5">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            )}

            {/* Records list */}
            {!panelMinimized && (
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-6 w-6 text-white/30 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-white/[0.05] p-4 rounded-2xl mb-3">
                      <Wrench className="h-8 w-8 text-white/25" />
                    </div>
                    <div className="text-white/55 font-medium mb-1">
                      {searchQuery || statusTab !== 'all' ? 'No matching work orders' : 'No work orders yet'}
                    </div>
                    <div className="text-white/30 text-sm mb-4">
                      {searchQuery || statusTab !== 'all'
                        ? 'Try clearing the search or filter'
                        : 'Create the first one with "New Work Order"'}
                    </div>
                    {!searchQuery && statusTab === 'all' && (
                      <Button onClick={() => setShowCreateModal(true)} size="sm"
                        className="bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white border border-[#86BBD8]/35 gap-1">
                        <Plus className="h-3.5 w-3.5" /> New Work Order
                      </Button>
                    )}
                  </div>
                ) : woViewMode === 'grid' ? (
                  /* ── Grid view ── */
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filtered.map(wo => (
                        <WorkOrderCard key={wo.id} workOrder={wo}
                          onClick={() => setSelectedOrderId(wo.id)}
                          onEdit={() => handleEditWO(wo)} />
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/[0.04] text-white/25 text-xs">
                      {filtered.length} of {workOrders.length} work orders
                    </div>
                  </div>
                ) : (
                  /* ── List view ── */
                  <div>
                    {filtered.map(wo => (
                      <div key={wo.id} className={`flex items-stretch transition-colors ${
                        bulkMode && selectedIds.has(String(wo.id)) ? 'bg-[#86BBD8]/[0.05]' : ''
                      }`}>
                        {/* Bulk select checkbox column */}
                        {bulkMode && (
                          <div className="flex items-center px-4 border-r border-white/[0.05]">
                            <button type="button"
                              onClick={() => toggleSelect(wo.id)}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                selectedIds.has(String(wo.id))
                                  ? 'bg-[#86BBD8] border-[#86BBD8]'
                                  : 'border-white/25 bg-transparent hover:border-white/50'
                              }`}>
                              {selectedIds.has(String(wo.id)) && (
                                <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-2">
                                  <polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <WorkOrderRow workOrder={wo}
                            onClick={bulkMode ? () => toggleSelect(wo.id) : () => setSelectedOrderId(wo.id)}
                            isExpanded={!bulkMode && expandedWOs.has(String(wo.id))}
                            onToggle={() => { if (!bulkMode) toggleWO(wo.id); }}
                            onEdit={() => handleEditWO(wo)} />
                        </div>
                      </div>
                    ))}
                    <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-white/25 text-xs">
                        {filtered.length} of {workOrders.length} work orders
                      </span>
                      {bulkMode && selectedIds.size > 0 && (
                        <span className="text-[#86BBD8]/60 text-xs">{selectedIds.size} selected</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: ANALYTICS & INSIGHTS
      ══════════════════════════════════════════ */}
      {mainTab === 'analytics' && (
        <section className="relative text-white">
          <div className="container mx-auto px-4 pb-6">
            <AnalyticsPanel stats={stats} isOpen={true} onToggle={() => {}} standalone />
          </div>
        </section>
      )}

      {/* ── MODALS (always mounted) ── */}
      <CreateWorkOrderModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onCreated={handleCreated}
        editingOrder={editingWO ?? undefined}
        allOrders={workOrders}
      />

      {selectedOrder && (
        <WorkOrderDetailModal
          workOrder={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onRefresh={load}
          onDelete={handleDelete}
        />
      )}

      <CreateScheduleModal
        isOpen={showCreateSched}
        initial={editingSched}
        onClose={() => { setShowCreateSched(false); setEditingSched(null); }}
        onSave={schedule => {
          const updated = editingSched
            ? schedules.map(x => x.id === schedule.id ? schedule : x)
            : [schedule, ...schedules];
          setSchedules(updated);
          persistSchedules(updated);
          toast.success(editingSched ? 'Schedule updated' : 'Schedule created');
        }}
      />
    </PageShell>
  );
}
