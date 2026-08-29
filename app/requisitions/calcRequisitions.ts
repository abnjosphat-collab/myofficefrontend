// app/requisitions/calcRequisitions.ts — the per-requisition cost total behind the
// requisitions page, split out of page.tsx per the "extract + test business logic"
// standard (app/timesheets/calcTotals.ts precedent). Previously inline in page.tsx
// with no test coverage at all, despite being the one building block every status/
// section rollup on the page (pending value, approved value, per-section cost, etc.)
// is computed from.
import type { RequisitionItem } from './types';

export function itemTotal(items: RequisitionItem[]): number {
  return items.reduce((s, i) => s + i.costPerUnit * i.quantity, 0);
}
