// app/quotations/types.ts — the quotation generator's data model: the line-item, client,
// recent-quotation, and template shapes. Split out of page.tsx as part of the standing
// "decompose on touch" convention. This page has no backend or persistence layer at
// all — every value is ephemeral demo state seeded once on mount — so unlike every other
// page in this pass, there is no data-fetching hook/api file to extract alongside these
// types; page.tsx keeps the generators (generatePDF/generateWord), calculations, and all
// UI state exactly as they were. QUOTATION_TEMPLATES/CURRENCIES/PREMIUM_THEMES/TABS stay
// in page.tsx too (business vocabulary, same as every other page's config constants).

export interface QuotationItem { id: number; description: string; quantity: number; rate: number; amount: number; category: string; }
export interface ClientData { id?: number; name: string; company: string; email: string; phone: string; address: string; city: string; country: string; website?: string | undefined; }
export interface RecentQuotation { id: number; number: string; client: string; amount: number; date: string; status: string; }
export interface QuotationTemplate { id: string; name: string; category: string; color: string; icon: string; items: { description: string; quantity: number; rate: number; amount: number }[]; notes: string; terms: string; }
