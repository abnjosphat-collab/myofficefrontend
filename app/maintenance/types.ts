// frontend/app/maintenance/types.ts — data-model interfaces shared across the
// maintenance page and its extracted modal/analytics components. Prop types for
// individual components stay local to those component files.
import type { EmployeeLookup, EquipmentLookup, SpareLookup } from "@/hooks/useLookups";

export type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' | 'postponed' | 'not-done';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type WOClassification = 'planned_maintenance' | 'project' | 'breakdown' | 'custom';
export type Discipline = 'Mechanical' | 'Electrical';
export type Trade = 'Fitter' | 'Boilermaker' | 'Rigger' | 'Plumber' | 'Carpenter';

export interface SpareItem { id: string; name: string; quantity: number; unit_cost: number; }
export type SpareRegisterItem = SpareLookup;

export interface MaintenanceSchedule {
  id: string; name: string; equipment_info: string; to_department: string; allocated_to: string;
  authorising_foreman: string; estimated_hours: string; job_request_details: string;
  job_instructions: string; priority: WorkOrderPriority; recurrence_type: RecurrenceType;
  recurrence_dow: number; recurrence_dom: number; recurrence_months: number[];
  specific_dates: string[]; advance_days: number; active: boolean; next_due_date: string;
  last_generated: string; created_at: string;
  // M1: register link + what generated jobs inherit (absent until the M1 SQL has run).
  equipment_id?: number | null; classification?: WOClassification;
  discipline?: Discipline; trade?: Trade;
}

// Picker record types + fetch hooks are shared (hooks/useLookups) — these are aliases
// so existing references across the module keep working.
export type EquipmentItem = EquipmentLookup;
export type EmployeeItem = EmployeeLookup;

export interface WorkOrder {
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
  classification?: WOClassification; classification_custom?: string; failure_mode?: string; corrective_action?: string;
  discipline?: Discipline; trade?: Trade; spares_used?: SpareItem[];
  // M1: register link, raising schedule, and server-stamped times (absent until the M1 SQL
  // has run; the stamps are set by the server on status/sign-off transitions, never sent).
  equipment_id?: number | null; schedule_id?: number | null;
  started_at?: string | null; completed_at?: string | null; signed_off_at?: string | null;
}
// M5: the maintenance measures, computed on the server (GET /api/maintenance/measures).
// Every figure carries the ids it counts, so the UI drills down to exactly that list.
export type MeasureId = string | number;
export interface MeasuresPeriod { days: number; weeks: number; start: string; end: string; }
export interface PmOnTime { percent: number | null; on_time: number; total: number; ids: MeasureId[]; on_time_ids: MeasureId[]; }
export interface BacklogBucket { label: string; count: number; ids: MeasureId[]; }
export interface BacklogByAge { total: number; buckets: BacklogBucket[]; }
export interface MeasureWeek { week_start: string; opened: number; completed: number; opened_ids: MeasureId[]; completed_ids: MeasureId[]; }
export interface OpenedVsCompleted { weeks: MeasureWeek[]; undated_opened: MeasureId[]; undated_completed: MeasureId[]; }
export interface DowntimeRow { machine: string; breakdowns: number; downtime_hours: number; mttr_hours: number | null; mtbf_days: number | null; breakdown_ids: MeasureId[]; }
export interface RepeatGroup { machine: string; code: string; count: number; window_days: number; first: string; last: string; ids: MeasureId[]; }
export interface RepeatFailures { groups_30d: number; groups_90d: number; groups: RepeatGroup[]; }
export interface WorstRow { machine: string; breakdowns: number; downtime_hours: number; open_jobs: number; breakdown_ids: MeasureId[]; work_order_ids: MeasureId[]; }
export interface CostRow { machine: string; equipment_id: number | null; labour_hours: number; spares_cost: number; jobs: number; ids: MeasureId[]; }
export interface MeasuresPayload {
  period: MeasuresPeriod; pm_on_time: PmOnTime; backlog_by_age: BacklogByAge; opened_vs_completed: OpenedVsCompleted;
  machine_downtime: { rows: DowntimeRow[] }; repeat_failures: RepeatFailures;
  worst_machines: { rows: WorstRow[] }; cost_by_machine: { rows: CostRow[] };
}
