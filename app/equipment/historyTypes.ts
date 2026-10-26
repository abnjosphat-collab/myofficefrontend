// app/equipment/historyTypes.ts — one machine's history (M6) as the server counts it
// (GET /api/equipment/{id}/history). Lists and totals cover everything ever recorded;
// the measures reuse the M5 definitions over the trailing window in `period`.
import type { Breakdown } from '../breakdowns/types';
import type { MaintenanceSchedule, WorkOrder } from '../maintenance/types';
import type { EquipmentItem } from './types';

/** A breakdown row with the measured minutes the register table does not carry. */
export interface HistoryBreakdown extends Breakdown {
  downtime_minutes?: number | null;
  repair_time_minutes?: number | null;
}

export interface HistoryTotals {
  jobs: number;
  open_jobs: number;
  breakdowns: number;
  schedules: number;
  labour_hours: number;
  spares_cost: number;
  downtime_hours: number;
  counts_by_status: Record<string, number>;
}

export interface HistorySpare {
  name: string;
  quantity: number;
  cost: number;
  jobs: number;
  breakdowns: number;
}

export type HistoryId = string | number;

export interface HistoryPm {
  percent: number | null;
  on_time: number;
  total: number;
  ids: HistoryId[];
  on_time_ids: HistoryId[];
}

export interface HistoryDowntime {
  machine: string;
  breakdowns: number;
  downtime_hours: number;
  mttr_hours: number | null;
  mtbf_days: number | null;
  breakdown_ids: HistoryId[];
}

export interface HistoryRepeat {
  machine: string;
  code: string;
  count: number;
  window_days: number;
  first: string;
  last: string;
  ids: HistoryId[];
}

export interface MachineHistoryPayload {
  equipment: EquipmentItem;
  period: { days: number; start: string; end: string };
  /** Whether jobs were matched by register link (false until the M1 SQL has run). */
  links_active: boolean;
  totals: HistoryTotals;
  jobs: WorkOrder[];
  breakdowns: HistoryBreakdown[];
  schedules: MaintenanceSchedule[];
  spares: HistorySpare[];
  measures: {
    pm_on_time: HistoryPm;
    downtime: HistoryDowntime | null;
    repeat_failures: { groups_30d: number; groups_90d: number; groups: HistoryRepeat[] };
  };
}
