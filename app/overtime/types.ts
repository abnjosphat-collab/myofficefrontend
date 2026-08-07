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
  overtime_type: OTType;
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
  overtime_type: OTType;
  date: string;
  start_time: string;
  end_time: string;
  /** Entered directly when the fast path is on; empty string means "use start/end". */
  hours: string;
  reason: string;
  contact_number: string;
  notes: string;
}
