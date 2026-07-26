// frontend/app/maintenance/page.tsx
'use client';
import { useState, useEffect, useMemo, ElementType, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useTheme, PageHero, StatusBadge, ViewToggle,
  useCollapseSection, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
  useConfirm, SearchInput, EmptyState, LoadingState, InfoRow,
  TYPE_SCALE, RADIUS,
} from '@/components/shared/theme';
import {
  Wrench, Plus, RefreshCw,
  ChevronDown, ChevronUp, ChevronRight, X,
  ClipboardCheck, Trash2,
  CalendarClock, Pencil, Repeat2,
  SlidersHorizontal, ArrowUpDown, BarChart2,
  AlertTriangle, Maximize2, Minimize2,
  List, LayoutGrid,
} from "@/components/shared/theme";
import type { WorkOrder, MaintenanceSchedule, WorkOrderPriority, WorkOrderStatus } from "./types";
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, deleteWorkOrder, uploadStrandedLocalFields,
  fetchSchedules, createSchedule, updateSchedule, deleteSchedule, uploadStrandedSchedules,
} from "./api";
import { statusCfg, priorityCfg, isOverdue, calcStats, nextWONumber, recurrenceLabel } from "./helpers";
import { CreateWorkOrderModal } from "@/components/maintenance/CreateWorkOrderModal";
import { WorkOrderDetailModal } from "@/components/maintenance/WorkOrderDetailModal";
import { CreateScheduleModal } from "@/components/maintenance/CreateScheduleModal";
import { AnalyticsPanel } from "@/components/maintenance/analytics";

// Display/sort maps used only within this file's own WorkOrderCard/Row and sort logic.
const CLASS_COLORS: Record<string, string> = { breakdown: '#f87171', planned_maintenance: '#4ade80', project: '#60a5fa', custom: '#c084fc' };
const CLASS_SHORT: Record<string, string> = { planned_maintenance: 'PM', project: 'Proj', breakdown: 'BKD', custom: 'Custom' };
const PORD: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const SORD: Record<WorkOrderStatus, number> = {
  'in-progress': 0, pending: 1, 'on-hold': 2, 'not-done': 3,
  completed: 4, postponed: 5, cancelled: 6,
};

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
                  <span className={`${t.chipBg} ${t.textFaint} text-[10px] px-2 py-0.5 rounded-full font-mono`}>Total: R {workOrder.spares_used.reduce((a, s) => a + s.quantity * s.unit_cost, 0).toFixed(2)}</span>
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
  // Close the priority-filter dropdown on any click outside it — it used to stay
  // open over the content until its own button was clicked again.
  const filterMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showFilterMenu) return;
    const onDown = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showFilterMenu]);
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
      <div className={`flex items-center gap-0.5 ${t.glassSoft} ${RADIUS.tile} p-[3px] w-fit`}>
        {([{ key: 'workorders', label: 'Work Orders', icon: Wrench }, { key: 'analytics', label: 'Analytics & Insights', icon: BarChart2 }] as { key: 'workorders' | 'analytics'; label: string; icon: ElementType }[]).map(tb => {
          const active = mainTab === tb.key;
          return (
            <button key={tb.key} type="button" onClick={() => { setMainTab(tb.key); if (tb.key === 'workorders' && bulkMode) exitBulk(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 ${RADIUS.chip} ${TYPE_SCALE.body} font-medium tracking-tight transition-colors ${active ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverText} ${t.hoverBg}`}`}>
              <tb.icon className="h-3.5 w-3.5" />{tb.label}
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
                    <button type="button" key={tab.key} onClick={() => setStatusTab(tab.key)} className={`px-2.5 py-1 ${RADIUS.chip} ${TYPE_SCALE.label} font-medium tracking-tight transition-colors ${active ? 'bg-brand-500/15 text-brand-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}>
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

                <div className="relative" ref={filterMenuRef}>
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
