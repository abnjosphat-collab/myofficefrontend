// app/equipment-status/types.ts — the equipment status board's data model. Split
// out of page.tsx as part of the standing "decompose on touch" convention. No
// data-layer file here: this page already fetches via the shared useEquipment()
// hook (lib/useEquipment.ts), so there's no page-specific fetch layer to extract.
// Component prop interfaces stay in page.tsx.

import type { BoardStatus } from '@/lib/useEquipment';

export interface BoardEntry {
  id: string;
  equipment_id: string;
  name: string;
  section: string;
  type: string;
  status: BoardStatus;
  defect?: string;
  job_card?: string;
  downtime_hours?: number;
}
