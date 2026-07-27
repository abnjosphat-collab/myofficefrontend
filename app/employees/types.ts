// app/employees/types.ts — the employees page's data model: the employee record shape,
// its create/update form payload, sort config, and the section/profession grouping shape
// shared between the on-page accordion and the roster export dialog. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Component *prop*
// interfaces (EmployeeFormProps, EmployeeRowProps) stay in page.tsx — they're coupled to
// one component, not the page's data contract.

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  id_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_engagement?: string;
  designation?: string;
  employee_class?: string;
  supervisor?: string;
  section?: string;
  department?: string;
  grade?: string;
  qualifications?: string[];
  employment_type?: 'NEC' | 'SALARIED' | '';
  discipline?: 'mechanical' | 'electrical' | '';
  drivers_license_class?: string;
  ppe_issue_date?: string;
  offences?: string[];
  awards_recognition?: string[];
  other_positions?: string[];
  previous_employer?: string;
}

export interface EmployeeFormData {
  employee_id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string;
  address: string;
  date_of_engagement: string;
  designation: string;
  employee_class: string;
  employment_type: 'NEC' | 'SALARIED' | '';
  discipline: 'mechanical' | 'electrical' | '';
  supervisor: string;
  section: string;
  department: string;
  grade: string;
  qualifications: string[];
  drivers_license_class: string;
  offences: string[];
  awards_recognition: string[];
  other_positions: string[];
  previous_employer: string;
}

export type SortField = 'first_name' | 'employee_id' | 'designation' | 'department' | 'date_of_engagement';
export type SortDir = 'asc' | 'desc';

/** Section → profession/designation grouping — shared by the on-page accordion
 *  and the roster export dialog so both produce the same grouping. */
export interface SectionGroup {
  section: string; color: string; employees: Employee[];
  subgroups: { designation: string; employees: Employee[] }[];
  hasMeaningfulSubgroups: boolean;
}
