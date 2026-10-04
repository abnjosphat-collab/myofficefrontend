// app/overtime/OvertimeDetail.tsx — one overtime request in full: who, when, how long, why, the spares used, and the actions that
// apply to it (approve or reject while it is pending, edit, delete).
'use client';

import { Button, Dialog, StatusBadge } from '@/components/ui-system';
import { fmtDate, formatCurrency } from '@/components/shared/utils';
import { overtimeCostCentre } from './calcOvertime';
import { payoutMeta, planningMeta, statusMeta, typeMeta } from './overtimeMeta';
import { recordHours, timeSpan } from './overtimeLogic';
import type { OTRecord } from './types';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">{label}</dt><dd className="font-sans text-body text-ink [overflow-wrap:anywhere]">{children || 'Not recorded'}</dd></div>;
}

export function OvertimeDetail({ record, onClose, onEdit, onDelete, onApprove, onReject }: {
  record: OTRecord | null; onClose: () => void; onEdit: (r: OTRecord) => void; onDelete: (r: OTRecord) => void; onApprove: (r: OTRecord) => void; onReject: (r: OTRecord) => void;
}) {
  const r = record;
  const hours = r ? recordHours(r) : 0;
  const status = r ? statusMeta(r.status) : null;
  const type = r ? typeMeta(r.overtime_type) : null;
  const planning = r ? planningMeta(r.planning_status) : null;
  const payout = r ? payoutMeta(r.payout_method) : null;
  return (
    <Dialog
      open={!!r} onOpenChange={o => { if (!o) onClose(); }} size="lg"
      title={r ? `${r.employee_name}` : 'Overtime request'} description={r ? [r.employee_id, r.position].filter(Boolean).join(', ') : undefined}
      footer={r && (
        <>
          <Button variant="danger" icon="delete" onClick={() => onDelete(r)}>Delete</Button>
          {r.status === 'pending' && <><Button icon="close" onClick={() => onReject(r)}>Reject</Button><Button variant="primary" icon="success" onClick={() => onApprove(r)}>Approve</Button></>}
          <Button icon="edit" onClick={() => onEdit(r)}>Edit</Button>
          <Button onClick={onClose}>Close</Button>
        </>
      )}
    >
      {r && status && type && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
            {planning && <StatusBadge tone={planning.tone}>{planning.label}</StatusBadge>}
            {payout && <StatusBadge tone={payout.tone}>{payout.label}</StatusBadge>}
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Fact label="Date">{fmtDate(r.date)}</Fact>
            <Fact label="Time">{timeSpan(r)}</Fact>
            <Fact label="Duration">{hours > 0 ? `${hours.toFixed(1)} hours` : ''}</Fact>
            <Fact label="Cost centre">{overtimeCostCentre(r)}</Fact>
            <Fact label="Department">{r.department}</Fact>
            <Fact label="Contact">{r.contact_number}</Fact>
            <Fact label="Applied">{r.created_at ? fmtDate(r.created_at) : ''}</Fact>
          </dl>
          <div className="rounded-control bg-surface-subtle p-3"><p className="font-sans text-caption text-ink-muted">Reason</p><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{r.reason || 'No reason given'}</p></div>
          {!!r.spares_used?.length && (
            <div className="rounded-control bg-surface-subtle p-3">
              <p className="mb-1.5 font-sans text-caption text-ink-muted">Spares used</p>
              <ul className="flex flex-col gap-1">
                {r.spares_used.map((s, i) => (
                  <li key={i} className="flex justify-between gap-3 font-sans text-body-sm"><span className="[overflow-wrap:anywhere]">{s.name}{s.part_number && ` (${s.part_number})`}, {s.quantity} × {formatCurrency(s.unit_price || 0)}</span><span className="font-semibold tabular">{formatCurrency(s.total_cost || 0)}</span></li>
                ))}
              </ul>
            </div>
          )}
          {r.notes && <div className="rounded-control bg-surface-subtle p-3"><p className="font-sans text-caption text-ink-muted">Notes</p><p className="mt-1 whitespace-pre-wrap font-sans text-body text-ink [overflow-wrap:anywhere]">{r.notes}</p></div>}
        </div>
      )}
    </Dialog>
  );
}
