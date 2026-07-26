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
  classification?: WOClassification; classification_custom?: string; failure_mode?: string;
  discipline?: Discipline; trade?: Trade; spares_used?: SpareItem[];
}
