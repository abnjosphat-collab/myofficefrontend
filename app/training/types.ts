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
}

export interface RefresherItem { refresher: string; employees_due: number; }
export interface ComplianceReport { compliance_rate: number; total_tracked: number; non_compliant: number; }

export interface FormState {
  employee_name: string; employee_id: string; department: string;
  certification_name: string; expiry_date: string; required_refresher: string; certificate_file: File | null;
}
