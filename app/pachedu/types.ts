// app/pachedu/types.ts — the Pachedu care-observation page's data model: the report
// shape and its computed stats. Split out of page.tsx as part of the standing
// "decompose on touch" convention. Component *prop* interfaces stay in page.tsx —
// they're coupled to one component, not the page's data contract. SECTION_ICONS/
// SECTION_META/BEHAVIOUR_META/STATUS_META/IMPACT_OPTIONS/CHECKLIST_CATEGORIES also
// stay in page.tsx (business vocabulary, same as every other page's config constants).

export type SectionType = 'Mechanical' | 'Electrical';
export type BehaviourType = 'Intentional' | 'Unintentional';
export type PacheduStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';

export interface PacheduReport {
  id: string;
  location: string;
  date: string;
  activityObserved: string;
  whatDidYouSee: string;
  reasons: string;
  behaviourType: BehaviourType;
  impacts: string[];
  whatDidYouDo: string;
  observerName: string;
  dept: string;
  sdwt: string;
  sectionChoice: SectionType;
  checklist: string[];
  status: PacheduStatus;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

export interface PacheduStats {
  total: number;
  bySection: Record<SectionType, number>;
  byDept: Record<string, number>;
  byBehaviour: Record<BehaviourType, number>;
  totalImpacts: number;
  totalChecklist: number;
  draftCount: number;
  submittedCount: number;
  reviewedCount: number;
  closedCount: number;
}
