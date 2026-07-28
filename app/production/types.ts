// app/production/types.ts — the production record's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention.

export interface ProductionRecord {
  id: number; date: string; shift: string; tonnesMilled: number; feedRate: number; grade: number;
  recovery: number; goldOz: number; millAvail: number; powerKwh: number; downtimeHrs: number;
  downtimeReason: string; comments: string;
}
