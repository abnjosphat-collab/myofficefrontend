// app/contractors/types.ts — the contractor register's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Component prop
// interfaces stay in page.tsx — they're coupled to one component, not the page's
// data contract.

export type CStatus = 'active' | 'inactive';
export interface Job { title: string; location: string; startDate: string; progress: number; }
export interface Contractor {
  id: number; company: string; trade: string; contact: string; phone: string;
  status: CStatus; rating: number; contractExpiry: string; insuranceExpiry: string; jobs: Job[];
}
