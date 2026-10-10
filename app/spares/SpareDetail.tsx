// app/spares/SpareDetail.tsx — one part in full: stock against its minimum and maximum, price and value, categories, machine, location,
// supplier and notes, with the actions that apply (add to the requisition, edit, delete).
'use client';

import { Button, Dialog, Progress, StatusBadge, Fact, FactList, DetailActions } from '@/components/ui-system';
import { fmtDate, formatCurrency } from '@/components/shared/utils';
import { categoriesOf, lineValue, priorityMeta, stockOf } from './stock';
import type { Spare } from './types';

export function SpareDetail({ spare: s, onClose, onEdit, onDelete, onAddToRequisition }: { spare: Spare | null; onClose: () => void; onEdit: (s: Spare) => void; onDelete: (s: Spare) => void; onAddToRequisition: (s: Spare) => void }) {
  const st = s ? stockOf(s) : null;
  const pr = s ? priorityMeta(s.priority) : null;
  return (
    <Dialog
      open={!!s} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={s?.description ?? 'Spare part'} description={s?.stock_code}
      footer={s && <DetailActions onDelete={() => onDelete(s)} onClose={onClose} onEdit={() => onEdit(s)} primary="edit"><Button icon="cart" onClick={() => onAddToRequisition(s)}>Add to requisition</Button></DetailActions>}
    >
      {s && st && pr && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
            <StatusBadge tone={pr.tone}>{pr.label} priority</StatusBadge>
            {s.safety_stock && <StatusBadge tone="brand">Safety stock</StatusBadge>}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-sans text-body text-ink"><span className="font-semibold tabular">{s.current_quantity}</span> {s.unit_of_measure || 'UN'} on hand, minimum <span className="tabular">{s.min_quantity}</span>, maximum <span className="tabular">{s.max_quantity}</span></p>
            <Progress value={s.max_quantity > 0 ? (s.current_quantity / s.max_quantity) * 100 : 0} label={`${s.stock_code} stock against its maximum`} />
          </div>
          <FactList>
            <Fact label="Unit price">{formatCurrency(s.unit_price)}</Fact>
            <Fact label="Value on hand">{formatCurrency(lineValue(s.current_quantity, s.unit_price))}</Fact>
            <Fact label="Categories">{categoriesOf(s).join(', ')}</Fact>
            <Fact label="Machine or equipment">{s.machine_type}</Fact>
            <Fact label="Storage location">{s.storage_location}</Fact>
            <Fact label="Supplier">{s.supplier}</Fact>
            {s.lead_time_days ? <Fact label="Lead time">{s.lead_time_days} days</Fact> : null}
            {s.last_ordered_date ? <Fact label="Last ordered">{fmtDate(s.last_ordered_date)}</Fact> : null}
            {s.notes && <Fact label="Notes" wide>{s.notes}</Fact>}
          </FactList>
        </div>
      )}
    </Dialog>
  );
}
