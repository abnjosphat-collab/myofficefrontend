'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { useTheme, useConfirm } from '@/components/shared/theme';
import type { WorkOrder, MaintenanceSchedule, WorkOrderPriority, WorkOrderStatus } from './types';
import {
  getWorkOrders, createWorkOrder, deleteWorkOrder, uploadStrandedLocalFields,
  fetchSchedules, createSchedule, updateSchedule, deleteSchedule, uploadStrandedSchedules,
} from './api';
import { statusCfg, priorityCfg, isOverdue, calcStats, nextWONumber, recurrenceLabel } from './helpers';
import { CreateWorkOrderModal } from '@/components/maintenance/CreateWorkOrderModal';
import { WorkOrderDetailModal } from '@/components/maintenance/WorkOrderDetailModal';
import { CreateScheduleModal } from '@/components/maintenance/CreateScheduleModal';
import { AnalyticsPanel } from '@/components/maintenance/analytics';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { lineTotal } from '@/components/shared/utils';
import { formatDate } from '@/lib/format';
import { ToolsIcon as Icon } from '../tools/ToolsIcon';
import { AnimatedText } from '../tools/ToolsUI';
import { AnimatedSelect } from '../tools/AnimatedSelect';
import s from '../tools/tools.module.css';
import m from './maintenance.module.css';

const CLASS_SHORT: Record<string, string> = { planned_maintenance: 'PM', project: 'Proj', breakdown: 'BKD', custom: 'Custom' };
const PORD: Record<WorkOrderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const SORD: Record<WorkOrderStatus, number> = {
  'in-progress': 0, pending: 1, 'on-hold': 2, 'not-done': 3,
  completed: 4, postponed: 5, cancelled: 6,
};

type StatusTab = 'all' | 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'overdue';
type MainTab = 'workorders' | 'schedules' | 'analytics';
type SortBy = 'date-desc' | 'date-asc' | 'priority' | 'machine' | 'status';

const MAIN_TABS: { value: MainTab; label: string; icon: 'box' | 'clock' | 'analytics' }[] = [
  { value: 'workorders', label: 'Work orders', icon: 'box' },
  { value: 'schedules', label: 'Schedules', icon: 'clock' },
  { value: 'analytics', label: 'Analytics', icon: 'analytics' },
];
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All active' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'on-hold', label: 'On Hold' },
  { key: 'overdue', label: 'Overdue' },
];

function classLabel(wo: WorkOrder) {
  if (!wo.classification) return '';
  if (wo.classification === 'custom') return wo.classification_custom?.trim() || 'Custom';
  return CLASS_SHORT[wo.classification] || wo.classification;
}
function classMark(wo: WorkOrder) {
  if (wo.classification === 'planned_maintenance') return 'PM';
  if (wo.classification === 'breakdown') return 'BD';
  if (wo.classification === 'project') return 'PR';
  if (wo.classification === 'custom') return (wo.classification_custom?.slice(0, 2) || 'C').toUpperCase();
  const digits = (wo.work_order_number || '').replace(/\D/g, '');
  return digits.slice(-2) || 'WO';
}
function StatusLabel({ status, overdue }: { status: WorkOrderStatus; overdue?: boolean }) {
  return (
    <span>
      <span className={m.woStatus} data-status={status}><i />{statusCfg(status).label}</span>
      {overdue && <span className={m.woStatus} data-status="overdue"><i />Overdue</span>}
    </span>
  );
}
function padCount(n: number) {
  return String(n).padStart(2, '0');
}

function WorkOrderCard({ workOrder, onClick, onEdit }: { workOrder: WorkOrder; onClick: () => void; onEdit: () => void }) {
  const reduced = useReducedMotion();
  const overdue = isOverdue(workOrder);
  const assignee = workOrder.allocated_to || workOrder.artisan_name || 'Unassigned';
  return (
    <motion.article
      className={s.card}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduced ? undefined : { y: -7, scale: 1.009 }}
      transition={{ type: 'spring', stiffness: 330, damping: 25, opacity: { duration: 0.22 } }}
    >
      <button type="button" className={s.cardMain} aria-label={`View ${workOrder.equipment_info}`} onClick={onClick}>
        <div className={s.cardTop}>
          <span className={s.toolCode}>#{workOrder.work_order_number}</span>
          <Icon name="out" size={16} />
        </div>
        <div className={s.symbolArea}>
          <span className={m.mark}>{classMark(workOrder)}</span>
          <span className={s.category}>{classLabel(workOrder) || 'Work order'}{workOrder.discipline ? ` · ${workOrder.trade || workOrder.discipline}` : ''}</span>
        </div>
        <div className={s.cardIdentity}>
          <h2>{workOrder.equipment_info}</h2>
          <p>{workOrder.job_request_details || 'No request details recorded'}</p>
        </div>
      </button>
      <div className={s.cardBottom}>
        <StatusLabel status={workOrder.status} overdue={overdue} />
        <button type="button" className={s.quickAction} onClick={onEdit} aria-label={`Edit ${workOrder.equipment_info}`}>
          Edit<Icon name="edit" size={15} />
        </button>
      </div>
      <div className={s.cardContext}>
        <Icon name="user" size={14} />
        <span>{assignee}</span>
        {workOrder.due_date && <span className={overdue ? s.late : undefined}>{workOrder.due_date}</span>}
        <span>{priorityCfg(workOrder.priority).label}</span>
      </div>
      <div className={m.progress} style={{ margin: '0 17px 14px' }}><i style={{ width: `${workOrder.progress ?? 0}%` }} /></div>
    </motion.article>
  );
}

function WorkOrderRow({
  workOrder, onClick, isExpanded, onToggle, onEdit, bulkMode, selected, onSelect,
}: {
  workOrder: WorkOrder;
  onClick: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  bulkMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const overdue = isOverdue(workOrder);
  const artisanDisplay = workOrder.allocated_to || workOrder.artisan_name || '—';
  const foremanDisplay = workOrder.authorising_foreman || workOrder.foreman_name || workOrder.responsible_foreman || '—';
  return (
    <>
      <tr className={`${s.listRow} ${selected ? m.selectedRow : ''}`}>
        {bulkMode && (
          <td>
            <button type="button" aria-label={selected ? 'Deselect work order' : 'Select work order'} onClick={onSelect}>
              <span className={m.check} data-on={selected || undefined}>
                {selected && <Icon name="check" size={10} />}
              </span>
            </button>
          </td>
        )}
        <td>
          <button type="button" aria-label={`View ${workOrder.equipment_info}`} className={s.tableIdentity} onClick={onClick}>
            <span className={`${m.mark} ${m.miniMark}`}>{classMark(workOrder)}</span>
            <span>
              <strong>{workOrder.equipment_info}</strong>
              <small>#{workOrder.work_order_number}{classLabel(workOrder) ? ` · ${classLabel(workOrder)}` : ''}{workOrder.discipline ? ` · ${workOrder.trade || workOrder.discipline}` : ''}</small>
            </span>
          </button>
        </td>
        <td>
          <StatusLabel status={workOrder.status} overdue={overdue} />
          <small>{priorityCfg(workOrder.priority).label}</small>
        </td>
        <td>
          {artisanDisplay}
          <small>{workOrder.to_department || 'No department'}</small>
        </td>
        <td className={overdue ? s.late : undefined}>{workOrder.due_date || '—'}</td>
        <td>
          <div className={m.progress}><i style={{ width: `${workOrder.progress ?? 0}%` }} /></div>
          <small>{workOrder.progress ?? 0}%</small>
        </td>
        <td>
          <button type="button" className={s.iconButton} aria-label="Edit work order" onClick={onEdit}><Icon name="edit" size={16} /></button>
          <button type="button" className={s.iconButton} aria-label={isExpanded ? 'Collapse preview' : 'Quick preview'} onClick={onToggle}>
            <Icon name={isExpanded ? 'up' : 'down'} size={16} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={bulkMode ? 7 : 6} style={{ padding: 0 }}>
            <div className={m.preview}>
              <div className={m.facts}>
                <div className={m.fact}><span>Artisan</span><strong>{artisanDisplay}</strong></div>
                <div className={m.fact}><span>Foreman</span><strong>{foremanDisplay}</strong></div>
                <div className={m.fact}><span>Time worked</span><strong>{workOrder.total_time_worked || '—'}</strong></div>
                <div className={m.fact}><span>Est. hours</span><strong>{workOrder.estimated_hours ? `${workOrder.estimated_hours}h` : '—'}</strong></div>
                <div className={m.fact}>
                  <span>Due date</span>
                  <strong className={overdue ? s.late : undefined}>{workOrder.due_date ? `${workOrder.due_date}${overdue ? ' — overdue' : ''}` : '—'}</strong>
                </div>
                <div className={m.fact}><span>Raised</span><strong>{workOrder.date_raised || '—'}</strong></div>
                {(workOrder.work_done_details || workOrder.job_request_details) && (
                  <div className={`${m.fact} ${m.note}`}>
                    <span>{workOrder.work_done_details ? 'Work done' : 'Job request'}</span>
                    <p>{workOrder.work_done_details || workOrder.job_request_details}</p>
                  </div>
                )}
                {workOrder.cause_of_failure && (
                  <div className={`${m.fact} ${m.note}`}>
                    <span>Cause of failure</span>
                    <p>{workOrder.cause_of_failure}</p>
                  </div>
                )}
                {workOrder.failure_mode && (
                  <div className={m.fact}><span>Failure mode</span><strong>{workOrder.failure_mode}</strong></div>
                )}
                {workOrder.spares_used && workOrder.spares_used.length > 0 && (
                  <div className={`${m.fact} ${m.note}`}>
                    <span>Spares used</span>
                    <div className={m.spares}>
                      {workOrder.spares_used.map(sp => (
                        <span key={sp.id}>{sp.name} ×{sp.quantity} · ${lineTotal(sp.quantity, sp.unit_cost).toFixed(0)}</span>
                      ))}
                      <span>Total: R {workOrder.spares_used.reduce((a, sp) => a + lineTotal(sp.quantity, sp.unit_cost), 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className={s.registerFooter}>
                <button type="button" className={s.textButton} onClick={onClick}>Open full details<Icon name="chevron" size={14} /></button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ScheduleRow({
  schedule, onEdit, onDelete, onToggle, onRunNow,
}: {
  schedule: MaintenanceSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRunNow: () => void;
}) {
  return (
    <div className={s.journalRow}>
      <span className={s.eventIcon}><Icon name="clock" /></span>
      <span>
        <strong>{schedule.name}</strong>
        <small>
          {schedule.equipment_info}
          {schedule.to_department ? ` · ${schedule.to_department}` : ''}
          {schedule.allocated_to ? ` — ${schedule.allocated_to}` : ''}
          {` · ${recurrenceLabel(schedule)}`}
        </small>
      </span>
      <time>{schedule.next_due_date || 'No next date'}</time>
      <button type="button" className={s.quickAction} onClick={onRunNow}>Create work order(s)</button>
      <button type="button" className={s.quickAction} onClick={onToggle}>{schedule.active ? 'Active' : 'Paused'}</button>
      <button type="button" className={s.iconButton} aria-label="Edit schedule" onClick={onEdit}><Icon name="edit" size={16} /></button>
      <button type="button" className={s.iconButton} aria-label="Delete schedule" onClick={onDelete}><Icon name="archive" size={16} /></button>
    </div>
  );
}

function MaintenancePageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 0.25;
  const searchRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('workorders');
  const [woViewMode, setWoViewMode] = useState<'list' | 'grid'>('list');
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const handleEditWO = (wo: WorkOrder) => { setEditingWO(wo); setShowCreateModal(true); };
  const handleCloseCreateModal = () => { setShowCreateModal(false); setEditingWO(null); };

  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set());
  const toggleWO = (id: string) => setExpandedWOs(prev => {
    const next = new Set(prev);
    if (next.has(String(id))) next.delete(String(id));
    else next.add(String(id));
    return next;
  });

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(String(id))) next.delete(String(id));
    else next.add(String(id));
    return next;
  });
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
  const [showCreateSched, setShowCreateSched] = useState(false);
  const [editingSched, setEditingSched] = useState<MaintenanceSchedule | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority[]>([]);
  const selectedOrder = useMemo(
    () => selectedOrderId ? workOrders.find(w => String(w.id) === String(selectedOrderId)) ?? null : null,
    [workOrders, selectedOrderId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWorkOrders();
      setWorkOrders(data);
      setLoadError('');
    } catch (e) {
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

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActionsOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (showCreateModal || selectedOrderId || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreateModal, selectedOrderId]);

  const stats = useMemo(() => calcStats(workOrders), [workOrders]);
  const q = searchQuery.trim().toLowerCase();
  const filtered = workOrders
    .filter(w => {
      if (statusTab === 'all') return true;
      if (statusTab === 'overdue') return isOverdue(w);
      return w.status === statusTab;
    })
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

  const selectAll = () => setSelectedIds(new Set(filtered.map(w => String(w.id))));
  const tabCount = (key: StatusTab) => {
    if (key === 'all') return workOrders.length;
    if (key === 'overdue') return stats.overdue;
    return workOrders.filter(w => w.status === key).length;
  };
  const activeSchedules = schedules.filter(item => item.active).length;
  const activeRefinements = Number(statusTab !== 'all') + Number(priorityFilter.length > 0) + Number(sortBy !== 'date-desc');
  const resetRefinements = () => { setSearchQuery(''); setStatusTab('all'); setPriorityFilter([]); setSortBy('date-desc'); };
  const filterTo = (next: StatusTab) => { setMainTab('workorders'); setStatusTab(next); setFiltersOpen(false); };

  const exportColumns: DLColumn[] = [
    { key: 'work_order_number', label: 'WO #', width: 14 },
    { key: 'equipment_info', label: 'Equipment', width: 24 },
    { key: 'classification', label: 'Classification', width: 18 },
    { key: 'discipline', label: 'Discipline', width: 14 },
    { key: 'trade', label: 'Trade', width: 14 },
    { key: 'status', label: 'Status', width: 14, format: v => statusCfg(v as WorkOrderStatus).label },
    { key: 'priority', label: 'Priority', width: 12, format: v => priorityCfg(v as WorkOrderPriority).label },
    { key: 'allocated_to', label: 'Allocated To', width: 18 },
    { key: 'authorising_foreman', label: 'Foreman', width: 18 },
    { key: 'to_department', label: 'Department', width: 18 },
    { key: 'date_raised', label: 'Date Raised', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'due_date', label: 'Due Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'progress', label: 'Progress', width: 10, format: v => `${v ?? 0}%` },
    { key: 'estimated_hours', label: 'Est. Hours', width: 12 },
    { key: 'total_time_worked', label: 'Time Worked', width: 12 },
    { key: 'work_done_details', label: 'Work Done', width: 30 },
    { key: 'cause_of_failure', label: 'Cause of Failure', width: 26 },
  ];

  const handleCreated = (savedOrder: WorkOrder) => {
    setWorkOrders(prev => {
      const exists = prev.some(w => String(w.id) === String(savedOrder.id));
      return exists ? prev.map(w => String(w.id) === String(savedOrder.id) ? savedOrder : w) : [savedOrder, ...prev];
    });
    load();
  };
  const handleDelete = async (id: string) => { await deleteWorkOrder(id); setSelectedOrderId(null); await load(); toast.success('Work order deleted'); };

  const handleRunScheduleNow = async (sched: MaintenanceSchedule) => {
    const today = new Date().toISOString().split('T')[0];
    const machines = sched.equipment_info.split(',').map(item => item.trim()).filter(Boolean);
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

  const registerTitle = mainTab === 'schedules'
    ? 'Recurring schedules'
    : mainTab === 'analytics'
      ? 'Analytics and insights'
      : statusTab === 'overdue'
        ? 'Overdue work orders'
        : statusTab !== 'all'
          ? STATUS_TABS.find(tab => tab.key === statusTab)?.label || 'Work orders'
          : 'Work order register';

  return (
    <div className={`${s.surface} ${m.page}`} data-mode={t.light ? 'light' : 'dark'}>
      <section className={`${s.workspace} ${m.workspace}`} aria-label="Work orders workspace">
        <div className={s.topline}>
          <h1 className={s.wordmark}><span><Icon name="app" size={19} /></span>Work Orders</h1>
          <div className={s.previewControls}>
            <button type="button" className={s.iconButton} aria-label="Refresh work orders" onClick={load}>
              <Icon name="reset" size={16} />
            </button>
            {mainTab === 'workorders' && (
              <button type="button" className={s.primary} onClick={() => setShowCreateModal(true)}>
                New work order<Icon name="plus" size={16} />
              </button>
            )}
            {mainTab === 'schedules' && (
              <button type="button" className={s.primary} onClick={() => { setEditingSched(null); setShowCreateSched(true); }}>
                New schedule<Icon name="plus" size={16} />
              </button>
            )}
          </div>
        </div>

        <div>
          <div className={s.sectionCaption}>
            <button type="button" className={s.sectionToggle} aria-expanded={overviewOpen} aria-controls="maintenance-overview" onClick={() => setOverviewOpen(open => !open)}>
              <span>At a glance</span>
              <motion.span animate={{ rotate: overviewOpen ? 180 : 0 }} transition={{ duration }}><Icon name="down" size={13} /></motion.span>
            </button>
          </div>
          <AnimatePresence initial={false}>
            {overviewOpen && (
              <motion.div
                id="maintenance-overview"
                className={m.glance}
                initial={{ height: 0, opacity: 0, y: reduced ? 0 : -4 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: reduced ? 0 : -4 }}
                transition={{ duration }}
              >
                <button type="button" onClick={() => filterTo('all')}>
                  <span>In the register</span>
                  <strong><AnimatedText value={stats.total}>{padCount(stats.total)}</AnimatedText><small>orders</small></strong>
                </button>
                <button type="button" onClick={() => filterTo('pending')}>
                  <span><i className={s.amberDot} />Pending</span>
                  <strong><AnimatedText value={stats.pending}>{padCount(stats.pending)}</AnimatedText><Icon name="out" size={17} /></strong>
                </button>
                <button type="button" onClick={() => filterTo('in-progress')}>
                  <span>In progress</span>
                  <strong><AnimatedText value={stats.inProgress}>{padCount(stats.inProgress)}</AnimatedText><Icon name="out" size={17} /></strong>
                </button>
                <button type="button" onClick={() => filterTo('completed')}>
                  <span><i className={s.greenDot} />Completed</span>
                  <strong><AnimatedText value={stats.completed}>{padCount(stats.completed)}</AnimatedText><Icon name="out" size={17} /></strong>
                </button>
                <button type="button" onClick={() => filterTo('on-hold')}>
                  <span>On hold</span>
                  <strong><AnimatedText value={stats.onHold}>{padCount(stats.onHold)}</AnimatedText><Icon name="out" size={17} /></strong>
                </button>
                <button type="button" onClick={() => filterTo('overdue')}>
                  <span><i className={s.amberDot} />Overdue</span>
                  <strong><AnimatedText value={stats.overdue}>{padCount(stats.overdue)}</AnimatedText><Icon name="out" size={17} /></strong>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <div className={s.navigation}>
            <div className={s.tabs} role="tablist" aria-label="Maintenance sections">
              {MAIN_TABS.map((item, index) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  id={`maintenance-tab-${item.value}`}
                  tabIndex={mainTab === item.value ? 0 : -1}
                  aria-selected={mainTab === item.value}
                  aria-controls="maintenance-panel"
                  onClick={() => { setMainTab(item.value); if (item.value !== 'workorders' && bulkMode) exitBulk(); setFiltersOpen(false); setActionsOpen(false); }}
                  onKeyDown={event => {
                    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? MAIN_TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : MAIN_TABS.length - 1)) % MAIN_TABS.length;
                    setMainTab(MAIN_TABS[next].value);
                    document.getElementById(`maintenance-tab-${MAIN_TABS[next].value}`)?.focus();
                  }}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                  {item.value === 'schedules' && activeSchedules > 0 && <span className={s.tabCount}>{activeSchedules}</span>}
                  {mainTab === item.value && <motion.span layoutId="maintenance-tab-indicator" transition={{ duration }} className={s.tabLine} />}
                </button>
              ))}
            </div>
          </div>

          {mainTab !== 'analytics' && (
            <div className={s.toolbar}>
              <label className={s.search}>
                <Icon name="search" />
                <input
                  ref={searchRef}
                  aria-label={mainTab === 'schedules' ? 'Search schedules' : 'Search work orders'}
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={mainTab === 'schedules' ? 'Search schedule, equipment…' : 'Search machine, artisan, WO#…'}
                />
                <kbd>/</kbd>
              </label>
              {mainTab === 'workorders' && (
                <>
                  <div className={s.filterCluster}>
                    <button
                      type="button"
                      className={s.secondary}
                      aria-label="Open filter and sort controls"
                      aria-expanded={filtersOpen}
                      aria-controls="maintenance-filters"
                      onClick={() => { setFiltersOpen(open => !open); setActionsOpen(false); }}
                    >
                      <Icon name="filter" />Filter &amp; sort
                      {activeRefinements > 0 && <span className={s.filterCount}>{activeRefinements}</span>}
                      <motion.span animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration }}><Icon name="down" size={13} /></motion.span>
                    </button>
                  </div>
                  <div className={s.viewToggle} aria-label="View options">
                    <button type="button" aria-label="Grid view" aria-pressed={woViewMode === 'grid'} onClick={() => setWoViewMode('grid')}><Icon name="grid" size={18} /></button>
                    <button type="button" aria-label="List view" aria-pressed={woViewMode === 'list'} onClick={() => setWoViewMode('list')}><Icon name="list" size={18} /></button>
                  </div>
                </>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {filtersOpen && mainTab === 'workorders' && (
              <motion.div
                id="maintenance-filters"
                className={s.filterReveal}
                initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                transition={{ duration }}
              >
                <div className={s.filters}>
                  <div>
                    <span>Status</span>
                    <AnimatedSelect
                      ariaLabel="Status"
                      value={statusTab}
                      onChange={value => setStatusTab(value as StatusTab)}
                      options={STATUS_TABS.map(tab => ({ value: tab.key, label: `${tab.label} (${tabCount(tab.key)})` }))}
                    />
                  </div>
                  <div>
                    <span>Priority</span>
                    <div className={m.picks}>
                      {(['urgent', 'high', 'medium', 'low'] as WorkOrderPriority[]).map(priority => (
                        <button
                          key={priority}
                          type="button"
                          aria-pressed={priorityFilter.includes(priority)}
                          onClick={() => setPriorityFilter(prev => prev.includes(priority) ? prev.filter(item => item !== priority) : [...prev, priority])}
                        >
                          {priorityCfg(priority).label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span>Sort</span>
                    <AnimatedSelect
                      ariaLabel="Sort work orders"
                      value={sortBy}
                      onChange={value => setSortBy(value as SortBy)}
                      options={[
                        { value: 'date-desc', label: 'Newest first' },
                        { value: 'date-asc', label: 'Oldest first' },
                        { value: 'priority', label: 'Priority' },
                        { value: 'status', label: 'Status' },
                        { value: 'machine', label: 'Machine A–Z' },
                      ]}
                    />
                  </div>
                  <button type="button" className={s.textButton} onClick={resetRefinements}><Icon name="reset" size={15} />Reset</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={s.resultsHeader}>
            <div className={s.resultLabel}>
              <strong><AnimatedText value={`${mainTab}-${statusTab}`}>{registerTitle}</AnimatedText></strong>
              <span role="status" aria-live="polite">
                <AnimatedText value={mainTab === 'schedules' ? `schedules-${schedules.length}` : mainTab === 'analytics' ? `analytics-${stats.total}` : `orders-${filtered.length}`}>
                  {mainTab === 'schedules'
                    ? `${schedules.length} ${schedules.length === 1 ? 'schedule' : 'schedules'}`
                    : mainTab === 'analytics'
                      ? `${stats.total} ${stats.total === 1 ? 'order' : 'orders'} in view`
                      : `${filtered.length} ${filtered.length === 1 ? 'order' : 'orders'}`}
                </AnimatedText>
              </span>
              {mainTab === 'workorders' && (activeRefinements > 0 || searchQuery) && (
                <button type="button" className={s.textButton} onClick={resetRefinements}>Clear search &amp; refinements</button>
              )}
            </div>
            {mainTab === 'workorders' && (
              <div className={s.actionCluster} ref={actionsRef}>
                <AnimatePresence initial={false}>
                  {actionsOpen && (
                    <motion.div
                      id="maintenance-actions"
                      className={s.actionReveal}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.3 }}
                    >
                      <div className={s.secondaryActions}>
                        {woViewMode === 'list' && filtered.length > 0 && (
                          <>
                            <button type="button" onClick={() => { setExpandedWOs(new Set(filtered.map(w => String(w.id)))); setActionsOpen(false); }}>Expand all</button>
                            <button type="button" onClick={() => { setExpandedWOs(new Set()); setActionsOpen(false); }}>Collapse all</button>
                          </>
                        )}
                        {filtered.length > 0 && !bulkMode && (
                          <button type="button" onClick={() => { setBulkMode(true); setActionsOpen(false); }}>Select</button>
                        )}
                        {filtered.length > 0 && (
                          <DownloadButton
                            data={filtered as unknown as Record<string, unknown>[]}
                            columns={exportColumns}
                            filename={exportFilename('Work_Orders')}
                            title="Work Orders"
                            statusColumn="status"
                            statusColor={(_v, row) => statusCfg(row.status as WorkOrderStatus).color.replace('#', '')}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  className={s.actionsAnchor}
                  aria-label="Actions"
                  aria-controls="maintenance-actions"
                  aria-expanded={actionsOpen}
                  onClick={() => { setActionsOpen(open => !open); setFiltersOpen(false); }}
                >
                  <Icon name="more" />Actions
                  <motion.span animate={{ rotate: actionsOpen ? 180 : 0 }} transition={{ duration }}><Icon name="down" size={13} /></motion.span>
                </button>
              </div>
            )}
          </div>

          <div id="maintenance-panel" role="tabpanel" aria-labelledby={`maintenance-tab-${mainTab}`}>
            {mainTab === 'analytics' && (
              <div className={m.analyticsWrap}>
                <AnalyticsPanel stats={stats} standalone rawOrders={workOrders} />
              </div>
            )}

            {mainTab === 'schedules' && (
              scheduleError ? (
                <div className={m.errorBanner}>
                  <Icon name="alert" />
                  <div><strong>Could not load schedules</strong><p>{scheduleError}</p></div>
                </div>
              ) : schedules.length === 0 ? (
                <div className={s.empty}>
                  <Icon name="clock" size={32} />
                  <h2>No recurring schedules yet</h2>
                  <p>Set up schedules to auto-generate work orders — every week, month, quarter, or custom dates.</p>
                  <button type="button" className={s.primary} onClick={() => { setEditingSched(null); setShowCreateSched(true); }}>Create first schedule</button>
                </div>
              ) : (
                <div className={s.journal}>
                  {schedules
                    .filter(item => {
                      const query = searchQuery.trim().toLowerCase();
                      if (!query) return true;
                      return item.name.toLowerCase().includes(query) || item.equipment_info.toLowerCase().includes(query) || (item.allocated_to || '').toLowerCase().includes(query);
                    })
                    .map(item => (
                      <ScheduleRow
                        key={item.id}
                        schedule={item}
                        onEdit={() => { setEditingSched(item); setShowCreateSched(true); }}
                        onRunNow={() => handleRunScheduleNow(item)}
                        onDelete={async () => {
                          if (!await confirm({ title: `Delete schedule "${item.name}"?`, message: 'This cannot be undone.', destructive: true })) return;
                          try {
                            await deleteSchedule(item.id);
                            setSchedules(prev => prev.filter(x => x.id !== item.id));
                            toast.success('Schedule deleted');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Could not delete schedule');
                          }
                        }}
                        onToggle={async () => {
                          const next = !item.active;
                          setSchedules(prev => prev.map(x => x.id === item.id ? { ...x, active: next } : x));
                          try {
                            await updateSchedule(item.id, { active: next });
                          } catch (e) {
                            setSchedules(prev => prev.map(x => x.id === item.id ? { ...x, active: !next } : x));
                            toast.error(e instanceof Error ? e.message : 'Could not update schedule');
                          }
                        }}
                      />
                    ))}
                </div>
              )
            )}

            {mainTab === 'workorders' && (
              <>
                {bulkMode && (
                  <div className={m.bulkBar}>
                    <button type="button" className={s.textButton} onClick={() => selectedIds.size === filtered.length ? clearSelect() : selectAll()}>
                      <span className={m.check} data-on={selectedIds.size === filtered.length && filtered.length > 0 || undefined} data-mixed={selectedIds.size > 0 && selectedIds.size < filtered.length || undefined}>
                        {selectedIds.size > 0 && <Icon name="check" size={10} />}
                      </span>
                      {selectedIds.size === 0 ? 'Select all' : `${selectedIds.size} selected`}
                    </button>
                    {selectedIds.size > 0 && (
                      <button type="button" className={m.danger} onClick={handleBulkDelete}>
                        Delete {selectedIds.size} work order{selectedIds.size !== 1 ? 's' : ''}
                      </button>
                    )}
                    <button type="button" className={s.textButton} onClick={exitBulk}><Icon name="close" size={14} />Cancel</button>
                  </div>
                )}

                {loading ? (
                  <div className={s.empty}><h2>Loading work orders…</h2><p>Fetching the live register from the server.</p></div>
                ) : loadError ? (
                  <div className={s.empty}>
                    <Icon name="alert" size={32} />
                    <h2>Could not load work orders</h2>
                    <p>{loadError}</p>
                    <button type="button" className={s.primary} onClick={load}>Try again</button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className={s.empty}>
                    <Icon name={workOrders.length ? 'search' : 'box'} size={32} />
                    <h2>{workOrders.length ? 'No matching work orders' : 'No work orders yet'}</h2>
                    <p>{workOrders.length ? 'Try fewer filters or a different search.' : 'Create the first one with New work order.'}</p>
                    <button type="button" className={s.primary} onClick={workOrders.length ? resetRefinements : () => setShowCreateModal(true)}>
                      {workOrders.length ? 'Clear search & filters' : 'New work order'}
                    </button>
                  </div>
                ) : woViewMode === 'grid' ? (
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div key="grid" className={s.grid} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration }}>
                      {filtered.map(wo => (
                        <WorkOrderCard key={wo.id} workOrder={wo} onClick={() => setSelectedOrderId(wo.id)} onEdit={() => handleEditWO(wo)} />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className={s.tableWrap}>
                    <table className={s.table}>
                      <thead>
                        <tr>
                          {bulkMode && <th><span className={s.srOnly}>Select</span></th>}
                          <th>Work order</th>
                          <th>Status</th>
                          <th>Assigned</th>
                          <th>Due</th>
                          <th>Progress</th>
                          <th><span className={s.srOnly}>Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(wo => (
                          <WorkOrderRow
                            key={wo.id}
                            workOrder={wo}
                            onClick={bulkMode ? () => toggleSelect(wo.id) : () => setSelectedOrderId(wo.id)}
                            isExpanded={!bulkMode && expandedWOs.has(String(wo.id))}
                            onToggle={() => { if (!bulkMode) toggleWO(wo.id); }}
                            onEdit={() => handleEditWO(wo)}
                            bulkMode={bulkMode}
                            selected={selectedIds.has(String(wo.id))}
                            onSelect={() => toggleSelect(wo.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!loading && !loadError && filtered.length > 0 && (
                  <div className={s.registerFooter}>
                    <span>{filtered.length} of {workOrders.length} work orders</span>
                    {bulkMode && selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <CreateWorkOrderModal isOpen={showCreateModal} onClose={handleCloseCreateModal} onCreated={handleCreated} editingOrder={editingWO ?? undefined} allOrders={workOrders} />
      {selectedOrder && <WorkOrderDetailModal workOrder={selectedOrder} onClose={() => setSelectedOrderId(null)} onRefresh={load} onDelete={handleDelete} />}
      <CreateScheduleModal
        isOpen={showCreateSched}
        initial={editingSched}
        onClose={() => { setShowCreateSched(false); setEditingSched(null); }}
        onSave={async schedule => {
          try {
            if (editingSched) {
              const saved = await updateSchedule(schedule.id, schedule);
              setSchedules(prev => prev.map(x => x.id === schedule.id ? { ...x, ...saved } : x));
              toast.success('Schedule updated');
            } else {
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
        }}
      />
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <AppShell>
      <MaintenancePageContent />
    </AppShell>
  );
}
