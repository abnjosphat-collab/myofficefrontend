// app/ppe/types.ts — PPE page's data model: record/employee/stats shapes and the
// PPE-type/replacement-interval reference data they're built from. Split out of
// page.tsx (was 1,545 lines mixing types, data-fetching, and UI in one file) as the
// first step of the standing "decompose on touch" convention — see the roadmap's
// Phase 7. Component *prop* interfaces (EmployeeAutocompleteProps, IssueFormProps,
// etc.) stay in page.tsx; they're tightly coupled to their one component, not the
// page's actual data contract.
import type React from 'react';

export interface PPETypeInfo {
  name: string; shortName: string; color: string;
  icon: React.ElementType; bgColor: string; textColor: string;
  borderColor: string; description: string;
}

export interface PPERecord {
  id: string; employee_id: string; employee_name: string;
  position: string; department: string;
  ppe_type: string; item_name: string; size: string;
  issue_date: string; expiry_date: string | null;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  status: 'active' | 'expired' | 'returned' | 'lost' | 'damaged' | 'not_required';
  notes: string; issued_by: string; location: string; mine_section: string;
}

export interface EmployeeRow {
  employee_id: string; employee_name: string;
  position: string; department: string; section: string;
}

export interface EmployeeWithPPE {
  employee_id: string; employee_name: string;
  position: string; records: PPERecord[];
  // Employee's Mechanical/Electrical/Civil/Instrumentation section — see lib/sections.ts.
  // Not yet normalized here; normalize at the point of display/filter (matches how the
  // rest of this file leaves raw strings as-is and lets calcPPE.ts do the shaping).
  section: string;
}

export interface PPEStats {
  total: number; active: number; expired: number;
  unique_employees: number; expiring_soon: number;
}

export interface EnhancedStats extends PPEStats {
  activeRecords: number; expiringSoon: number;
  employeesWithExpiring: number; employeesWithExpired: number;
}

export interface FormState {
  employee_name: string; employee_id: string; position: string;
  ppe_type: string; item_name: string; size: string;
  issue_date: string; expiry_date: string;
  condition: string; status: string; notes: string;
  issued_by: string; location: string; mine_section: string;
}
