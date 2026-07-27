// app/requisitions/types.ts — the requisitions page's data model: the line-item and
// requisition record shapes. Split out of page.tsx as part of the standing "decompose
// on touch" convention. Component *prop* interfaces stay in page.tsx — they're coupled
// to one component, not the page's data contract. STATUS_CONFIG/PRIORITY_COLOR/
// STATUSES/PRIORITIES/SECTIONS also stay in page.tsx (business vocabulary, same as
// every other page's config constants).

export interface RequisitionItem {
  description: string;
  costPerUnit: number;
  quantity: number;
  reason: string;
}

export interface Requisition {
  id: string;
  date: string;
  requester: string;
  section: 'Electrical' | 'Mechanical';
  required_for: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed';
  requisitionNumber: string;
  items: RequisitionItem[];
  notes?: string;
  lineNumber: number;
  createdAt: string;
  updatedAt: string;
}
