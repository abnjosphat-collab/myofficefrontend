// app/handover/types.ts — the shift handover report's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention. No data-layer
// file here: this page already fetches via the shared
// useModuleData<Handover>('handover') hook (lib/useModuleData.ts).

export const SHIFTS = ['Day', 'Night', 'Afternoon'] as const;
export type Shift = typeof SHIFTS[number];

export interface EquipmentItem { name: string; status: string; }
export interface Handover {
  id: number; handover_date: string; shift: Shift; section: string;
  outgoing_supervisor: string; incoming_supervisor: string;
  completed_work: string; outstanding_work: string; safety_concerns: string;
  equipment_summary: EquipmentItem[];
}
