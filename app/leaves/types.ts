// app/leaves/types.ts — the leave-management page's data model: the leave record shape,
// its employee-search lookup shape, and the derived stats shape. Split out of page.tsx
// as part of the standing "decompose on touch" convention. Component *prop* interfaces
// stay in page.tsx — they're coupled to one component, not the page's data contract.
// LeaveType stays in page.tsx too (it carries icon components, same as every other
// page's business-vocabulary constant).

export interface EmployeeSearchResult {
  id: number;
  employee_id: string;
  name: string;
  designation: string;
  phone: string;
  supervisor: string;
  department: string;
}

export interface Leave {
  id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  contact_number: string;
  emergency_contact?: string;
  handover_to?: string;
  status: 'pending' | 'approved' | 'rejected';
  total_days: number;
  applied_date: string;
  updated_at?: string;
  department?: string;
  manager_name?: string;
  supporting_docs?: string[];
}

export interface Stats {
  total: number; pending: number; approved: number; rejected: number;
  on_leave_now: number; approvalRate: number; total_days_requested: number; average_days: number;
}
