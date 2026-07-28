// app/compliance-register/types.ts — the statutory compliance register's data
// model. Split out of page.tsx as part of the standing "decompose on touch"
// convention. No data-layer file here: this page already fetches via the shared
// useModuleData<ComplianceItem>('compliance') hook (lib/useModuleData.ts).

export type Status = 'current' | 'due_soon' | 'overdue';

export interface ComplianceItem {
  id: number; equipment_name: string; inspection_type: string; regulatory_body: string;
  certificate_no: string; expiry_date: string; status: Status; responsible: string; notes: string;
}
