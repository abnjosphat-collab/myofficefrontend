// app/breakdowns/types.ts — the breakdowns page's data model: the breakdown record
// shape, its create/update form payload, spare-part line items, filter state, and the
// analytics heatmap response shape. Split out of page.tsx as part of the standing
// "decompose on touch" convention. Component *prop* interfaces stay in page.tsx — they're
// coupled to one component, not the page's data contract.

export interface SparePart { name: string; quantity: number; part_number?: string; unit_price: number; total_cost: number; }
export interface SpareUsed { part_number?: string; name?: string; quantity?: number; unit_price?: number; total_cost?: number; }

export interface Breakdown {
  id: number;
  breakdown_uid?: string;
  machine_id: string;
  machine_name: string;
  machine_description?: string;
  artisan_name: string;
  department: string;
  location: string;
  breakdown_date: string;
  breakdown_type: string;
  work_done?: string;
  artisan_recommendations?: string;
  status: string;
  priority: string;
  breakdown_start?: string;
  breakdown_end?: string;
  work_start?: string;
  work_end?: string;
  created_at?: string;
  updated_at?: string;
  breakdown_description?: string;
  spares_used?: SparePart[] | string;
}

export interface BreakdownFormData {
  machine_id: string; machine_name: string; breakdown_description: string;
  machine_description?: string; artisan_name: string; breakdown_date: string;
  location: string; department: string; breakdown_type: string; work_done: string;
  artisan_recommendations: string; status: string; priority: string;
  breakdown_start: string; breakdown_end: string; work_start: string; work_end: string;
  spares_used: SparePart[];
}

export interface Filters { status: string; breakdown_type: string; priority: string; department: string; location: string; }

export interface HeatmapData {
  heatmap: { hour_day: number[][]; labels: { hours: string[]; days: string[] } };
  top_problem_machines: { name: string; count: number; total_downtime: number; department: string; avg_downtime: number; avg_repair_time: number; avg_response_time: number }[];
  top_spare_parts: { name: string; count: number; total_cost: number; part_number: string; total_quantity: number }[];
  breakdown_type_distribution: { type: string; count: number }[];
  department_comparison: { department: string; count: number; downtime: number }[];
  monthly_trends: { month: string; count: number }[];
  artisan_performance: { name: string; count: number; total_repair_time: number; avg_repair_time: number }[];
  success: boolean;
}
