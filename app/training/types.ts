// app/training/types.ts — the training register's data model. Split out of page.tsx
// as part of the standing "decompose on touch" convention. Component prop interfaces
// stay in page.tsx — they're coupled to one component, not the page's data contract.

export interface Certification {
  id: string | number;
  employee_name: string;
  employee_id: string;
  department: string;
  certification_name: string;
  expiry_date: string;
  required_refresher: string;
  status: 'Valid' | 'Due Soon' | 'Expired';
  certificate_url?: string | null;
  provider: string;
  training_date: string | null;
  snapshot_designation: string;
  snapshot_section: string;
  snapshot_department: string;
  group_evidence_url?: string | null;
  batch_id?: string | null;
}

export interface RefresherItem { refresher: string; employees_due: number; }
export interface ComplianceReport { compliance_rate: number; total_tracked: number; non_compliant: number; }

export interface FormState {
  employee_name: string; employee_id: string; department: string;
  designation: string; section: string;
  certification_name: string; provider: string; training_date: string; expiry_date: string; required_refresher: string; certificate_file: File | null;
}

export interface BulkPersonOverride {
  employee_id: string;
  expiry_date?: string;
  required_refresher?: string;
  provider?: string;
  training_date?: string;
}

export interface BulkSharedDetails {
  certification_name: string;
  provider: string;
  training_date: string;
  expiry_date: string;
  required_refresher: string;
  group_evidence_url?: string;
}

export type BulkOutcome = 'created' | 'skipped' | 'failed';

export interface BulkItemResult {
  employee_id: string;
  outcome: BulkOutcome;
  record_id?: string | null;
  reason?: string | null;
  uncertain: boolean;
}

export interface BulkSubmitResponse {
  batch_id?: string | null;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: BulkItemResult[];
}
