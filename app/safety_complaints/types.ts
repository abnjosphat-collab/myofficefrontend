// app/safety_complaints/types.ts — the safety complaints register's data model: the
// complaint record shape. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled to
// one component, not the page's data contract. The derived `Stats` shape and its
// `calcStats` computation also stay in page.tsx (an analytics/display concern, same as
// every other page's inline stats useMemo, not a data-model type). CATEGORIES/
// PRIORITIES/SECTIONS/STATUSES/PRIORITY_HEX/STATUS_HEX stay in page.tsx too (business
// vocabulary, same as every other page's config constants).

export interface Complaint {
  id: string;
  date: string;
  raisedBy: string;
  issueRaised: string;
  category: string;
  priority: string;
  section: string;
  location: string;
  actionPlan: string;
  byWho: string;
  byWhen: string;
  supervisorName: string;
  supervisorSignature: string;
  dateClosed: string | null;
  status: string;
  submittedAt: string;
}

export type Tab = 'records' | 'analytics';
