// app/sheq_inspection/types.ts — the SHEQ inspection page's data model: the finding and
// inspection record shapes. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled to
// one component, not the page's data contract. The status/priority hex-color lookup
// constants also stay in page.tsx (business vocabulary, same as every other page's
// STATUS_META-shaped config, even though these particular ones don't carry JSX icons).

export type SectionType = 'mechanical' | 'electrical';
export type PriorityType = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'in-progress' | 'closed' | 'overdue';
export type InspectionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface InspectionFinding {
  id: string;
  finding: string;
  requiredAction: string;
  byWho: string;
  byWhen: string;
  status: FindingStatus;
  priority: PriorityType;
  section: SectionType;
  completedDate?: string;
  remarks?: string;
}

export interface SHEQFormData {
  id: string;
  inspectors: string;
  title: string;
  place: string;
  date: string;
  time: string;
  department: string;
  section: SectionType;
  findings: InspectionFinding[];
  hodName: string;
  sheqOfficialName: string;
  hodSignature?: string;
  sheqSignature?: string;
  status: InspectionStatus;
  before_photos: string[];
  after_photos: string[];
  createdAt: string;
  updatedAt: string;
}
