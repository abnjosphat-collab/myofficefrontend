export type CompetencyRecord = {
  id: string;
  employee_id: string;
  tool_id?: string;
  category?: string;
  trained: boolean;
  qualified: boolean;
  authorized: boolean;
  training_certificate_ref?: string;
  training_expires_at?: string;
  qualification_ref?: string;
  qualification_expires_at?: string;
  authorization_expires_at?: string;
  authorized_by?: string;
  notes?: string;
  updated_at: string;
};

export type InspectionType = 'pre_use' | 'weekly' | 'monthly' | 'quarterly' | 'calibration' | 'maintenance' | 'storage_audit' | 'repair';
export type InspectionRecord = {
  id: string;
  tool_id: string;
  inspection_type: InspectionType;
  outcome: 'passed' | 'conditional' | 'failed';
  inspected_at: string;
  next_due_at?: string;
  inspector_name: string;
  colour_code?: string;
  condition?: string;
  defects?: string;
  notes?: string;
  repair_quote?: number;
  new_equipment_price?: number;
  repair_eligible?: boolean;
};
export type IncidentRecord = { id:string;tool_id:string;incident_type:'lost'|'damaged'|'stolen'|'missing_components'|'late_return';occurred_at:string;reported_at:string;reported_by:string;employee_id?:string;explanation:string;investigation_due_at:string;status:'open'|'investigating'|'closed';negligence_confirmed?:boolean;replacement_cost?:number;recovery_months?:number;investigation_outcome?:string;closed_at?:string;closed_by?:string };

export type ApprovalRole = 'hos' | 'hod' | 'security' | 'finance' | 'general_manager';
export type GatePassApproval = {
  id: string;
  role: ApprovalRole;
  step_order: number;
  status: 'pending' | 'approved' | 'rejected';
  signer_name?: string;
  signed_at?: string;
  comment?: string;
  signature_method?: 'password' | 'pin';
};
export type GatePass = {
  id: string;
  pass_number: string;
  movement_scope: 'internal' | 'external';
  department: string;
  destination: string;
  purpose: string;
  expected_out_at: string;
  expected_return_at?: string;
  finance_required: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'closed';
  requested_by: string;
  requested_at: string;
  verification_code: string;
  tools: Array<{id:string;register_number:string;name:string;serial_number?:string;replacement_value?:number}>;
  approvals: GatePassApproval[];
};
export type ComplianceData = { competencies: CompetencyRecord[]; inspections: InspectionRecord[]; incidents:IncidentRecord[]; gate_passes: GatePass[] };
