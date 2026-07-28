// app/reliability/types.ts — the reliability page's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention.

export interface EquipReliability {
  equipment: string; section: string; mtbf: number; mttr: number; failures: number; availability: number; rpn: number;
}

export interface BreakdownRecord {
  equipment_name?: string; section?: string; location?: string;
  downtime_hours?: number; duration_hours?: number;
  breakdown_date?: string; date?: string; created_at?: string;
}
