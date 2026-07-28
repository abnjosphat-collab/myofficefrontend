// app/near_miss/types.ts — the near-miss report's data model. Split out of page.tsx
// as part of the standing "decompose on touch" convention. Component prop interfaces
// stay in page.tsx — they're coupled to one component, not the page's data contract.

import type { EmployeeLookup } from '@/hooks/useLookups';

export interface NearMissReport {
  id: string;
  department: string;
  section: 'Mechanical' | 'Electrical' | 'General';
  date: string;
  time: string;
  location: string;
  description: string;
  witnessDetails: string;
  reporterName: string;
  submittedAt: string;
}

export type EmployeeItem = EmployeeLookup;
