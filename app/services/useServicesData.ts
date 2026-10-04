// app/services/useServicesData.ts — the services tracker's reads (honest load state, never a failure shown as an empty register)
// and writes (they throw, so a dialog can show the reason and keep what was typed).
'use client';

import { api } from '@/lib/apiClient';
import { todayLocal } from '@/lib/dates';
import { useApiList } from '@/lib/useApiList';
import { useApiResource } from '@/lib/useApiResource';
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
    id: '', created_at: '',
    date: todayLocal(),
    description: '', supplier: '', contact_person: '',
    requisition_number: '', invoice_number: '', order_number: '',
    amount: '', category: '', general_comments: '',
    planning: stage(), engineering_manager: stage(), finance: stage(),
    gm: stage(), stores: stores(), payment: pay(),
  };
}

/** The signature images of one job, by stage (a data URL each). Read for the open job only; the register list leaves them out. */
export const useStageSignatures = (serviceId: string) => useApiResource<Record<string, string>>(`/api/services/${serviceId}/signatures`);
export const saveStageSignature = async (serviceId: string, stage: string, imageData: string) => { await api.put(`/api/services/${serviceId}/signatures/${stage}`, { image_data: imageData }); };

export const useServices = () => useApiList<Record<string, unknown>, ServiceRecord>('/api/services', fromApi);
/** The files attached to one job. Nothing is requested until the Attachments tab is open. */
export const useAttachments = (serviceId: string | null) => useApiList<Attachment>(`/api/services/${serviceId ?? ''}/attachments`, undefined, { enabled: serviceId !== null });

export const createService = async (r: ServiceRecord): Promise<ServiceRecord> => fromApi(await api.post<Record<string, unknown>>('/api/services', toApi(r)));
export const updateService = async (r: ServiceRecord): Promise<ServiceRecord> => fromApi(await api.put<Record<string, unknown>>(`/api/services/${r.id}`, toApi(r)));
export const deleteService = async (id: string) => { await api.delete(`/api/services/${id}`); };

export const uploadAttachment = (serviceId: string, file: File) => { const fd = new FormData(); fd.append('file', file); return api.post<Attachment>(`/api/services/${serviceId}/attachments`, fd); };
export const deleteAttachment = async (serviceId: string, attachmentId: string) => { await api.delete(`/api/services/${serviceId}/attachments/${attachmentId}`); };

export const ocrExtract = (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post<import('./extract').OcrFields>('/api/services/ocr', fd); };
