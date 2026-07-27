// app/services/useServicesData.ts — the services tracker's data-fetching layer: the
// record CRUD calls, the OCR-extraction and attachment calls, and a hook that owns the
// main record list's load-once cycle. Split out of page.tsx as part of the standing
// "decompose on touch" convention. Attachment fetch/upload/delete stay separate exports
// (like breakdowns' fetchBreakdownAnalytics) since AttachmentPanel is an independent,
// per-record, lazily-mounted component with its own state — not part of this page-level
// load cycle. ocrExtract consolidates two previously-duplicated call sites
// (ExcelImportModal and OcrUploadModal both posted to the same endpoint identically).
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Attachment, PaymentStage, ServiceRecord, StageData, StoresStage } from './types';

export function toApi(r: ServiceRecord): Record<string, unknown> {
  return {
    date: r.date || null,
    description: r.description,          supplier: r.supplier,
    contact_person: r.contact_person,    requisition_number: r.requisition_number,
    invoice_number: r.invoice_number,    order_number: r.order_number,
    amount: r.amount,                    category: r.category,
    general_comments: r.general_comments,
    planning_signed: r.planning.signed,        planning_signed_by: r.planning.signed_by,
    planning_signed_date: r.planning.signed_date || null,
    planning_comments: r.planning.comments,
    eng_mgr_signed: r.engineering_manager.signed,
    eng_mgr_signed_by: r.engineering_manager.signed_by,
    eng_mgr_signed_date: r.engineering_manager.signed_date || null,
    eng_mgr_comments: r.engineering_manager.comments,
    finance_signed: r.finance.signed,          finance_signed_by: r.finance.signed_by,
    finance_signed_date: r.finance.signed_date || null,
    finance_comments: r.finance.comments,
    gm_signed: r.gm.signed,                   gm_signed_by: r.gm.signed_by,
    gm_signed_date: r.gm.signed_date || null,  gm_comments: r.gm.comments,
    stores_signed: r.stores.signed,            stores_signed_by: r.stores.signed_by,
    stores_signed_date: r.stores.signed_date || null,
    stores_comments: r.stores.comments,        stores_grv_number: r.stores.grv_number,
    payment_done: r.payment.done,              payment_paid_by: r.payment.paid_by,
    payment_date: r.payment.payment_date || null,
    payment_reference: r.payment.payment_reference,
    payment_comments: r.payment.comments,
  };
}

export function fromApi(d: Record<string, unknown>): ServiceRecord {
  const s = (v: unknown) => String(v ?? '');
  const b = (v: unknown) => v === true || v === 'true';
  return {
    id: s(d.id), created_at: s(d.created_at),
    date: s(d.date), description: s(d.description), supplier: s(d.supplier),
    contact_person: s(d.contact_person), requisition_number: s(d.requisition_number),
    invoice_number: s(d.invoice_number), order_number: s(d.order_number),
    amount: s(d.amount), category: s(d.category), general_comments: s(d.general_comments),
    planning:            { signed: b(d.planning_signed),  signed_by: s(d.planning_signed_by),  signed_date: s(d.planning_signed_date),  comments: s(d.planning_comments) },
    engineering_manager: { signed: b(d.eng_mgr_signed),   signed_by: s(d.eng_mgr_signed_by),   signed_date: s(d.eng_mgr_signed_date),   comments: s(d.eng_mgr_comments) },
    finance:             { signed: b(d.finance_signed),   signed_by: s(d.finance_signed_by),   signed_date: s(d.finance_signed_date),   comments: s(d.finance_comments) },
    gm:                  { signed: b(d.gm_signed),        signed_by: s(d.gm_signed_by),        signed_date: s(d.gm_signed_date),        comments: s(d.gm_comments) },
    stores:              { signed: b(d.stores_signed),    signed_by: s(d.stores_signed_by),    signed_date: s(d.stores_signed_date),    comments: s(d.stores_comments), grv_number: s(d.stores_grv_number) },
    payment:             { done: b(d.payment_done),       paid_by: s(d.payment_paid_by),       payment_date: s(d.payment_date),         payment_reference: s(d.payment_reference), comments: s(d.payment_comments) },
  };
}

export function emptyRecord(): ServiceRecord {
  const stage  = (): StageData   => ({ signed: false, signed_by: '', signed_date: '', comments: '' });
  const stores = (): StoresStage => ({ ...stage(), grv_number: '' });
  const pay    = (): PaymentStage => ({ done: false, paid_by: '', payment_date: '', payment_reference: '', comments: '' });
  return {
    id: crypto.randomUUID(), created_at: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    description: '', supplier: '', contact_person: '',
    requisition_number: '', invoice_number: '', order_number: '',
    amount: '', category: '', general_comments: '',
    planning: stage(), engineering_manager: stage(), finance: stage(),
    gm: stage(), stores: stores(), payment: pay(),
  };
}

export async function fetchServices(): Promise<ServiceRecord[]> {
  const data = await api.get<Record<string, unknown>[]>('/api/services');
  return data.map(fromApi);
}
export async function createService(r: ServiceRecord): Promise<ServiceRecord> {
  return fromApi(await api.post<Record<string, unknown>>('/api/services', toApi(r)));
}
export async function updateService(r: ServiceRecord): Promise<ServiceRecord> {
  return fromApi(await api.put<Record<string, unknown>>(`/api/services/${r.id}`, toApi(r)));
}
export async function deleteService(id: string): Promise<void> {
  await api.delete(`/api/services/${id}`);
}

export async function fetchAttachments(serviceId: string): Promise<Attachment[]> {
  const data = await api.get<Attachment[]>(`/api/services/${serviceId}/attachments`);
  return Array.isArray(data) ? data : [];
}
export async function uploadAttachment(serviceId: string, file: File): Promise<Attachment> {
  const fd = new FormData(); fd.append('file', file);
  return api.post<Attachment>(`/api/services/${serviceId}/attachments`, fd);
}
export async function deleteAttachment(serviceId: string, attachmentId: string): Promise<void> {
  await api.delete(`/api/services/${serviceId}/attachments/${attachmentId}`);
}

export async function ocrExtract(file: File): Promise<any> {
  const fd = new FormData(); fd.append('file', file);
  return api.post<any>('/api/services/ocr', fd);
}

export function useServicesData() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchServices()
      .then(data => { setRecords(data); setLoading(false); })
      .catch(e => { setApiError(`Could not connect to backend: ${e.message}`); setLoading(false); });
  }, []);

  return { records, setRecords, loading, apiError };
}
