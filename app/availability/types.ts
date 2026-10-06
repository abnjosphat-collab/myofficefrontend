// app/availability/types.ts — the equipment availability page's data model. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Field
// names match the real backend response (snake_case) now that the mock endpoints
// that previously shadowed it are gone.

export interface Equipment {
  id: string;
  name: string;
  category: string;
  department: string | null;
  operational_hours: number;
  breakdown_hours: number;
  /** Null when the equipment has no availability record: unmeasured, not 100%. */
  availability: number | null;
  status: 'operational' | 'maintenance' | 'breakdown' | 'idle';
  last_maintenance: string | null;
  next_maintenance?: string | null;
  uptime: number;
  downtime: number;
  /** Null when there is no availability record (not a default of 100 h). */
  mtbf: number | null;
  /** Null when there is no availability record (not a default of 4 h). */
  mttr: number | null;
}

export interface AvailabilityStats {
  totalEquipment: number;
  operational: number;
  inMaintenance: number;
  inBreakdown: number;
  overallAvailability: number;
  avgUptime: number;
  avgDowntime: number;
  totalOperationalHours: number;
  totalBreakdownHours: number;
  monthAvailability: number;
  weekAvailability: number;
}
