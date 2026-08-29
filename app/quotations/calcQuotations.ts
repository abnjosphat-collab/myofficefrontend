// app/quotations/calcQuotations.ts — the subtotal/tax/discount/total calculation
// behind the quotations page, split out of page.tsx per the "extract + test business
// logic" standard (app/timesheets/calcTotals.ts precedent). Previously inline in
// page.tsx with no test coverage at all. Per-line-item totals already went through
// the shared components/shared/utils.ts's lineTotal (now also tested) — this is the
// document-level roll-up on top of that.
import type { QuotationItem } from './types';

export interface QuotationTotals {
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
}

// Returned as formatted 2-decimal strings (not numbers) — every call site (on-screen,
// PDF export, DOCX export) displays these directly, so the rounding happens once here
// instead of being repeated (and potentially drifting) at each render/export site.
export function calculateTotals(items: QuotationItem[], taxRate: number, discount: number): QuotationTotals {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;
  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
  };
}
