// app/pto/types.ts — the Planned Task Observation page's data model: the report shape
// and its nested sub-shapes. Split out of page.tsx as part of the standing "decompose
// on touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled
// to one component, not the page's data contract. SECTION_COLORS/SECTION_ICONS/
// OBS_COLORS/STATUS_COLORS/ACTION_COLORS/REASON_LABELS/REMEDY_LABELS also stay in
// page.tsx (business vocabulary, same as every other page's config constants).

export type SectionType = 'Mechanical' | 'Electrical';
export type ObservationType = 'Initial' | 'Follow up';
export type YesNoType = 'Yes' | 'No';
export type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';
export type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

export interface TimeOnJob { months: string; years: string; }
export interface Notification { toldInAdvance: YesNoType; }
export interface Reasons {
  monthly: boolean; newEmployee: boolean; safetyAwareness: boolean;
  incidentFollowUp: boolean; trainingFollowUp: boolean; infrequentTask: boolean;
}
export interface Procedures { hasProcedure: YesNoType; familiarWithProcedure: YesNoType; }
export interface RiskAssessment { made: YesNoType; identified: YesNoType; effective: YesNoType; }
export interface SuggestedRemedies {
  newProcedure: YesNoType; reviseExisting: YesNoType; differentEquipment: YesNoType;
  engineeringControls: YesNoType; retraining: YesNoType; improvedPPE: YesNoType; placementOfWorker: YesNoType;
}
export interface ActionPlanItem {
  id: string; no: number; action: string; byWhom: string; byWhen: string;
  status: ActionStatus; completedDate?: string; remarks?: string;
}
export interface PTOReport {
  id: string; date: string; observerName: string; section: SectionType;
  deptSectionContractor: string; workerName: string; occupation: string;
  jobTaskObserved: string; sheqRefNo: string; observationType: ObservationType;
  timeOnJob: TimeOnJob; notification: Notification; reasons: Reasons;
  procedures: Procedures; riskAssessment: RiskAssessment; suggestedRemedies: SuggestedRemedies;
  observationScope: 'All' | 'Partial'; followUpNeeded: YesNoType;
  actionPlan: ActionPlanItem[]; status: ReportStatus;
  created_at: string; updated_at?: string; submitted_at?: string;
}
