// app/lubrication/types.ts — the lubrication page's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Schedules
// already fetch via the shared useModuleData<LubeSchedule>('lubrication') hook, so
// there's no page-specific fetch layer to extract. Oil samples have no backend at
// all (OIL_SAMPLES is static demo data, never fetched or mutated) — it stays in
// page.tsx, same precedent as quotations.tsx's sample arrays.

export type LubeStatus = 'current' | 'due_soon' | 'overdue';
export type SampleResult = 'normal' | 'caution' | 'critical';

export interface LubeSchedule {
  id: number; equipment_name: string; lube_point: string; lubricant_type: string; lubricant_grade: string;
  interval_days: number; last_done_date: string; next_due_date: string; status: LubeStatus; section: string;
}

export interface OilSample {
  id: number; equipment: string; component: string; sampleDate: string;
  viscosity: number; particleCount: number; waterPct: number; result: SampleResult; notes: string;
}
