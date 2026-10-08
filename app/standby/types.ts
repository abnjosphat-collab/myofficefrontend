export interface CrewMember {
  employee_id: string;
  employee_name: string;
  phone?: string | null;
}

export interface RotationMember {
  employee_id: string;
  employee_name: string;
  phone?: string | null;
  designation?: string | null;
  /** The crew backing this lead whenever they hold a stint — they follow their lead. */
  crew?: CrewMember[];
}

export interface StandbyRotation {
  id: number;
  name: string;
  section?: string | null;
  members: RotationMember[];
  week_length_days: number;
  cycle_start_date: string;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DutyEntry {
  id: number;
  employee_id: string;
  employee_name: string;
  phone?: string | null;
  /** Null = mine-wide official; otherwise the official for that department. */
  department?: string | null;
  date_from: string;
  date_to: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}
