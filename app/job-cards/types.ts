// app/job-cards/types.ts — the job card's data model. Split out of page.tsx as part
// of the standing "decompose on touch" convention. No data-layer file here: this
// page already fetches via the shared generic useModuleData<JobCard>('job-cards')
// hook (lib/useModuleData.ts), so there's no page-specific fetch layer to extract.
// Component prop interfaces stay in page.tsx.

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type JCStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type JCType = 'corrective' | 'preventive' | 'predictive' | 'shutdown' | 'project';

export interface Task { id: string; description: string; done: boolean; }
export interface PartUsed { id: string; part_no: string; description: string; qty: number; }

export interface JobCard {
  id: string; job_no: string; title: string; equipment_name: string;
  type: JCType; priority: Priority; status: JCStatus;
  description: string; section: string; assigned_to: string; supervisor: string;
  scheduled_date: string; tasks: Task[]; parts_used: PartUsed[];
  labour_hours: number; notes: string;
}
