// app/services/types.ts — the services tracker's data model: the approval-pipeline
// stage shapes, the service record shape, and its file attachments. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Component *prop*
// interfaces stay in page.tsx — they're coupled to one component, not the page's data
// contract.

export interface StageData  { signed: boolean; signed_by: string; signed_date: string; comments: string; }
export interface StoresStage extends StageData { grv_number: string; }
export interface PaymentStage { done: boolean; paid_by: string; payment_date: string; payment_reference: string; comments: string; }

export interface ServiceRecord {
  id: string;
  created_at: string;
  date: string;
  description: string;
  supplier: string;
  contact_person: string;
  requisition_number: string;
  invoice_number: string;
  order_number: string;
  amount: string;
  category: string;
  planning: StageData;
  engineering_manager: StageData;
  finance: StageData;
  gm: StageData;
  stores: StoresStage;
  payment: PaymentStage;
  general_comments: string;
}

export interface Attachment {
  id: string;
  service_id: string;
  created_at: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}
