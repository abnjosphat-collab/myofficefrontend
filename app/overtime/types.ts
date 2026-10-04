// app/overtime/types.ts — the overtime page's data model: the request record shape and
// its form-payload mirror. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled to
// one component, not the page's data contract. OT_TYPES/STATUSES/TYPE_LABELS/TYPE_ICONS/
// TYPE_HEX/STATUS_HEX/STATUS_COLOR also stay in page.tsx (business vocabulary, same as
// every other page's config constants) — OTType/OTStatus are re-derived here from the
// same literal unions so both files agree without importing JSX-bearing page.tsx code.

// OT_TYPES stays the full historical set — existing records still hold 'emergency'/
// 'project'/'night' and must keep rendering correctly (badges, filters, analytics).
// SELECTABLE_OT_TYPES is the narrower set actually offered going forward (the create/
// edit form only) — removed per business decision, not a data migration.
export const OT_TYPES = ['regular', 'weekend', 'emergency', 'project', 'holiday', 'night'] as const;
export type OTType = typeof OT_TYPES[number];
export const SELECTABLE_OT_TYPES: OTType[] = ['regular', 'weekend', 'holiday'];
export const STATUSES = ['pending', 'approved', 'rejected', 'paid', 'cancelled'] as const;
export type OTStatus = typeof STATUSES[number];

// Whether the overtime was scheduled/rostered in advance ('planned') or came up
// reactively ('unplanned'). Absent/null on a record means unclassified — legacy
// records predating this field, deliberately not backfilled with a guess.
export const PLANNING_STATUSES = ['planned', 'unplanned'] as const;
export type PlanningStatus = typeof PLANNING_STATUSES[number];

// Whether this overtime will be paid out ('cash', the default/normal case) or was
// compensated with time off instead ('lieu' — matches the Leaves module's "Leave in
// Lieu of Overtime" leave type; no hard link to a specific leave request, just a
// manual flag). Named payout_method, not payment_status/paid, so its values can't be
// confused with OTStatus's own unrelated 'paid' (the approval-lifecycle status).
// Absent/null means unclassified — same reasoning as PlanningStatus above.
export const PAYOUT_METHODS = ['cash', 'lieu'] as const;
export type PayoutMethod = typeof PAYOUT_METHODS[number];

export const ENGINEERING_COST_CENTRE = 'Engineering';
export const COST_CENTRE_SUGGESTIONS = [
  ENGINEERING_COST_CENTRE,
  'Projects',
  'Mining Technical Services (MTS)',
  'Mining',
  'Stores',
  'Human Resources',
  'Shared Services',
] as const;

/**
 * Returns the approved cost-centre choices while retaining a legacy value during
 * edits so opening an old record never silently changes its allocation.
 */
export function overtimeCostCentreOptions(currentValue?: string): string[] {
  const legacyValue = currentValue?.trim();
  if (legacyValue && !COST_CENTRE_SUGGESTIONS.some(option => option === legacyValue)) {
    return [legacyValue, ...COST_CENTRE_SUGGESTIONS];
  }
  return [...COST_CENTRE_SUGGESTIONS];
}

/** One line of the "Spares Used" log — a reference/cost record only, same scope as
 *  breakdowns/work_orders' spares_used: it never touches Spares-module stock
 *  (`current_quantity`), which stays a Stores-department function. `unit_price`
 *  comes from the Spares register listing at the time it was picked, not live. */
export interface SpareUsedEntry {
  name: string;
  part_number?: string;
  quantity: number;
  unit_price?: number;
  total_cost?: number;
}

export interface OTRecord {
  id: number | string;
  employee_name: string;
  employee_id: string;
  position: string;
  department?: string;
  /** Department whose budget carries this overtime; distinct from the employee's home department. */
  cost_centre?: string;
  overtime_type: OTType;
  planning_status?: PlanningStatus | null;
  payout_method?: PayoutMethod | null;
  date: string;
  start_time?: string;
  end_time?: string;
  /** Set when entered via the hours-only fast path — no exact times recorded. */
  hours?: number;
  reason?: string;
  status: OTStatus;
  notes?: string;
  contact_number?: string;
  spares_used?: SpareUsedEntry[];
  created_at?: string;
}

export interface OTForm {
  employee_name: string;
  employee_id: string;
  position: string;
  department: string;
  cost_centre: string;
  overtime_type: OTType;
  planning_status: PlanningStatus | null;
  payout_method: PayoutMethod | null;
  date: string;
  start_time: string;
  end_time: string;
  /** Entered directly when the fast path is on; empty string means "use start/end". */
  hours: string;
  reason: string;
  contact_number: string;
  notes: string;
}

// ── The server's analysis of a set of records (POST /api/overtime/analyze) ──────────────────────────────
export interface OTProblemArea { title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low' }
export interface OTTrend { metric: string; direction: 'worsening' | 'improving' | 'stable'; insight: string; older_hours: number; newer_hours: number }
export interface OTRecommendation { priority: 'immediate' | 'short_term' | 'long_term'; action: string; rationale: string; target: string }
export interface OTCategoryDetail {
  category: string; instances: number; hours: number; avg_hours: number; pct_of_total: number;
  top_weekday: string | null; top_employee: string | null; top_spare: string | null;
  records: { employee_name: string; date: string; hours: number; reason: string }[];
}
export type PunchRecord = { employee_name: string; hours: number; reason: string; date: string };
export interface OTAnalysisResult {
  summary: string;
  total_hours: number; total_instances: number; employees_involved: number; sections_involved: number;
  avg_hours_per_instance: number; avg_hours_per_employee: number; double_time_pct: number;
  top_reasons: { phrase: string; count: number; hours: number }[];
  category_detail: OTCategoryDetail[];
  top_machines: { name: string; count: number; hours: number }[];
  top_employees: { name: string; hours: number }[];
  top_sections: { section: string; hours: number }[];
  weekly_series: { week: string; hours: number }[];
  trend_direction: 'worsening' | 'improving' | 'stable';
  trends: OTTrend[];
  hour_weekday_hours: number[][];
  weekday_labels: string[];
  punch_records: Record<string, PunchRecord[]>;
  possible_causes: OTProblemArea[];
  recommendations: OTRecommendation[];
  _records_analysed: number;
  generated_at: string;
}

