// app/breakdowns/analytics/types.ts — the breakdown-analytics page's data model:
// the heatmap-endpoint response shape, plus the pure display helpers/lookup
// tables every tab draws from. Split out of page.tsx as part of the standing
// "decompose on touch" convention.

import { formatCurrency as formatMoney } from '@/components/shared/utils';

export interface HeatmapData {
  heatmap: {
    hour_day: number[][];
    labels: {
      hours: string[];
      days: string[];
    };
  };
  hourly_distribution: { hour: string; count: number }[];
  daily_distribution: { day: string; count: number }[];
  top_problem_machines: {
    name: string;
    count: number;
    total_downtime: number;
    department: string;
    avg_downtime: number;
    avg_repair_time: number;
    avg_response_time: number;
  }[];
  top_artisans: {
    name: string;
    count: number;
    total_repair_time: number;
    avg_repair_time: number;
  }[];
  top_spare_parts: {
    name: string;
    count: number;
    total_cost: number;
    part_number: string;
    total_quantity: number;
  }[];
  breakdown_type_distribution: { type: string; count: number }[];
  priority_distribution: { priority: string; count: number }[];
  status_distribution: { status: string; count: number }[];
  department_comparison: { department: string; count: number; downtime: number }[];
  monthly_trends: { month: string; count: number }[];
  weekly_trends: { week: string; count: number }[];
  location_distribution: { location: string; count: number }[];
  response_time_by_hour: { hour: string; avg_response_time: number; count: number }[];
  machine_downtime_scatter: {
    name: string;
    breakdowns: number;
    total_downtime: number;
    avg_downtime: number;
    avg_repair_time: number;
    department: string;
  }[];
  artisan_performance: {
    name: string;
    count: number;
    total_repair_time: number;
    avg_repair_time: number;
  }[];
  summary: {
    total_breakdowns: number;
    unique_machines: number;
    unique_artisans: number;
    unique_spares: number;
    unique_departments: number;
    unique_types: number;
    total_downtime_minutes: number;
    total_repair_time_minutes: number;
    total_spare_cost: number;
  };
  response_time_heatmap: number[][];
  type_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  type_day_heatmap: Record<string, { day: string; count: number }[]>;
  dept_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  priority_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  artisan_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  location_hour_heatmap: Record<string, { hour: string; count: number }[]>;
  monthly_day_heatmap: Record<string, { day: number; count: number }[]>;
  filters_applied: {
    date_from: string | null;
    date_to: string | null;
    department: string | null;
    machine_id: string | null;
  };
  success: boolean;
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getHeatmapColor = (value: number, max: number, emptyCell: string): string => {
  if (value === 0) return emptyCell;
  const intensity = value / max;
  if (intensity < 0.33) {
    return `rgba(59, 130, 246, ${0.3 + 0.4 * intensity})`;
  } else if (intensity < 0.66) {
    return `rgba(245, 158, 11, ${0.4 + 0.4 * intensity})`;
  } else {
    return `rgba(239, 68, 68, ${0.5 + 0.5 * intensity})`;
  }
};

export const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
};

/** Whole dollars, from the app's one currency formatter. */
export const formatCurrency = (value: number): string => formatMoney(value, 'USD', 0);
