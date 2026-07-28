// app/vfl/types.ts — the Visible Felt Leadership page's data model: the action-item and
// report shapes. Split out of page.tsx as part of the standing "decompose on touch"
// convention. Component *prop* interfaces stay in page.tsx — they're coupled to one
// component, not the page's data contract. SECTIONS/BEHAVIOUR_CATEGORIES/
// OBSERVATION_TYPES/COACHING_TECHNIQUES/SECTION_HEX/SECTION_ICONS/BEHAVIOUR_HEX/
// OBSERVATION_HEX/COACHING_DESC/STATUS_HEX/ACTION_HEX also stay in page.tsx (business
// vocabulary, same as every other page's config constants).

export type SectionType = 'Mechanical' | 'Electrical';
export type BehaviourCategory = 'Safe Behaviour' | 'Unsafe Behaviour';
export type ObservationType = 'Safe Behaviour' | 'Safe Condition' | 'At Risk Behaviour' | 'At Risk Condition';
export type CoachingTechnique = 'SBR' | 'CC';
export type VFLStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';
export type ActionStatus = 'Pending' | 'In Progress' | 'Completed';

export interface ActionItem {
  id: string; action: string; responsible: string; targetDate: string;
  status: ActionStatus; completedDate?: string; remarks?: string;
}

export interface VFLReport {
  id: string; observerName: string; designation: string; sectionChoice: SectionType;
  departmentSection: string; date: string; time: string; behaviourCategory: BehaviourCategory;
  observationType: ObservationType; description: string; coachingTechnique: CoachingTechnique;
  actions: ActionItem[]; status: VFLStatus; created_at: string; updated_at?: string; submitted_at?: string;
}
