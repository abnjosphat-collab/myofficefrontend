// app/availabilities/types.ts — the equipment availability tracker's data model: the
// equipment/record shapes and their derived summary-row shapes. Split out of page.tsx as
// part of the standing "decompose on touch" convention. Component *prop* interfaces stay
// in page.tsx — they're coupled to one component, not the page's data contract.

export interface Equipment {
  id: number | string;
  equipment_id: string;
  name: string;
  category?: string;
  department?: string;
  location?: string;
  status?: string;
}

export interface AvailRecord {
  id: number | string;
  equipment_id: number | string;
  equipment_name?: string;
  date: string;
  operational_hours: number;
  breakdown_hours: number;
  availability_percentage: number;
  notes?: string;
  created_at?: string;
  source?: 'breakdown' | 'manual';
}

export interface EqSummaryRow {
  id: string;
  name: string;
  category: string;
  department: string;
  pct: number;
  opH: number;
  bdH: number;
  lastDate: string;
}

export interface PeriodRow {
  periodKey: string;
  label: string;
  avgAvailability: number;
  totalOpHours: number;
  totalBdHours: number;
  recordCount: number;
}

export interface FormData {
  equipment_id: string;
  date: string;
  operational_hours: string;
  breakdown_hours: string;
  notes: string;
}
