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

export interface DutyRotationMember {
  employee_id: string;
  employee_name: string;
  phone?: string | null;
  designation?: string | null;
}

export interface DutyRotation {
  id: number;
  name: string;
  /** Null = mine-wide roster; otherwise the roster for that department. */
  department?: string | null;
  members: DutyRotationMember[];
  week_length_days: number;
  cycle_start_date: string;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RotationKind = 'standby' | 'duty';

/** Prefill for naming cover — e.g. from a leave warning on the board. */
export interface CoverPreset {
  kind: RotationKind;
  rotation_id: number;
  absent_employee_id: string;
  absent_employee_name: string;
  date_from: string;
  date_to: string;
  reason?: string;
}

export interface RotationCover {
  id: number;
  kind: RotationKind;
  rotation_id: number;
  absent_employee_id: string;
  absent_employee_name: string;
  cover_employee_id: string;
  cover_employee_name: string;
  cover_phone?: string | null;
  date_from: string;
  date_to: string;
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
}
