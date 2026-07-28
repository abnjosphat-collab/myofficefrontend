// app/work_stoppage/types.ts — the work stoppage page's data model: the corrective-action
// and report shapes. Split out of page.tsx as part of the standing "decompose on touch"
// convention. Component *prop* interfaces stay in page.tsx — they're coupled to one
// component, not the page's data contract. SECTIONS/ACTION_STATUSES/SECTION_ICON/
// SECTION_HEX/STATUS_HEX also stay in page.tsx (business vocabulary, same as every
// other page's config constants).

export type SectionType = 'Mechanical' | 'Electrical' | 'General';
export type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

export interface CorrectiveAction {
  id: string; finding: string; action: string; byWho: string; byWhen: string;
  status: ActionStatus; completedDate?: string; remarks?: string;
}

export interface WorkStoppageReport {
  id: string; date: string; department: string; section: SectionType;
  description: string; investigationFindings: string; stoppageBy: string; stoppagePosition: string;
  acceptedBy: string; sheqCheckedBy: string; correctiveActions: CorrectiveAction[]; submittedAt: string;
}
