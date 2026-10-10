// app/leaves/LeaveDetails.tsx — one leave request in full, with the status actions. Approving or rejecting needs a
// manager's signature (ApprovalGate); setting a request back to pending asks first, because it undoes a decision.
'use client';

import { useState } from 'react';
import { Button, Dialog, Menu, MenuContent, MenuItem, MenuTrigger, StatusBadge, Fact, FactList, DetailActions } from '@/components/ui-system';
import { ApprovalGate } from '@/components/shared/ApprovalGate';
import { fmtDate, fmtDateTime } from '@/components/shared/utils';
import { typeOf } from './leaveTypes';
import { daysText, statusMeta } from './leaveMeta';
import type { Leave } from './types';

export function LeaveDetails({ leave, onClose, onEdit, onDelete, onStatus }: {
  leave: Leave | null; onClose: () => void; onEdit: (l: Leave) => void; onDelete: (l: Leave) => void;
  /** Throws to say why a change was refused. */
  onStatus: (l: Leave, status: Leave['status']) => Promise<void>;
}) {
  const [pending, setPending] = useState<'approved' | 'rejected' | null>(null);
  const type = leave ? typeOf(leave.leave_type) : null;
  const meta = leave ? statusMeta(leave.status) : null;

  return (
    <>
      <Dialog
        open={!!leave} onOpenChange={o => { if (!o) onClose(); }}
        title={leave ? `Leave request #${leave.id}` : 'Leave request'} description={leave ? `${leave.employee_name}, ${type?.name}` : undefined} size="lg"
        footer={leave && (
          <DetailActions onDelete={() => onDelete(leave)} onEdit={() => onEdit(leave)}>
            <Menu>
              <MenuTrigger asChild><Button variant="primary" iconAfter="chevron-down">Update status</Button></MenuTrigger>
              <MenuContent>
                <MenuItem icon="success" onSelect={() => setPending('approved')}>Approve</MenuItem>
                <MenuItem icon="close" tone="danger" onSelect={() => setPending('rejected')}>Reject</MenuItem>
                <MenuItem icon="undo" onSelect={() => { onStatus(leave, 'pending').catch(() => {}); }}>Mark pending</MenuItem>
              </MenuContent>
            </Menu>
          </DetailActions>
        )}
      >
        {leave && meta && type && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2"><StatusBadge tone={meta.tone} icon={meta.icon}>{meta.label}</StatusBadge><StatusBadge tone={type.tone} icon={type.icon}>{type.shortName}</StatusBadge></div>
            <section aria-labelledby="lv-emp"><h3 id="lv-emp" className="mb-2 font-sans text-label font-semibold text-ink">Employee</h3>
              <FactList columns={3}>
                <Fact label="Name">{leave.employee_name}</Fact><Fact label="Employee ID">{leave.employee_id}</Fact><Fact label="Position">{leave.position}</Fact>
                <Fact label="Department">{leave.department}</Fact><Fact label="Contact">{leave.contact_number}</Fact>
                {leave.emergency_contact && <Fact label="Emergency contact">{leave.emergency_contact}</Fact>}
              </FactList>
            </section>
            <section aria-labelledby="lv-det"><h3 id="lv-det" className="mb-2 font-sans text-label font-semibold text-ink">Leave</h3>
              <FactList columns={3}>
                <Fact label="Type">{type.name}</Fact><Fact label="Start date">{fmtDate(leave.start_date)}</Fact><Fact label="End date">{fmtDate(leave.end_date)}</Fact>
                <Fact label="Duration"><span className="font-semibold tabular">{daysText(leave.total_days)}</span></Fact>
                <Fact label="Day count">{leave.exclude_weekends_holidays ? 'Working days (no weekends or holidays)' : 'Calendar days'}</Fact>
                <Fact label="Applied">{fmtDateTime(leave.applied_date)}</Fact>
                {leave.handover_to && <Fact label="Handover to">{leave.handover_to}</Fact>}
              </FactList>
            </section>
            {leave.reason && <section aria-labelledby="lv-why"><h3 id="lv-why" className="mb-2 font-sans text-label font-semibold text-ink">Reason</h3><p className="whitespace-pre-wrap rounded-control bg-surface-subtle p-3 font-sans text-body text-ink [overflow-wrap:anywhere]">{leave.reason}</p></section>}
          </div>
        )}
      </Dialog>
      {pending && leave && (
        <ApprovalGate
          title={pending === 'approved' ? 'Approve leave request' : 'Reject leave request'}
          description={`${leave.employee_name}, ${type?.name}, ${daysText(leave.total_days)}`}
          actionLabel={pending === 'approved' ? 'Sign and approve' : 'Sign and reject'}
          requiredRole="manager" variant={pending === 'approved' ? 'approve' : 'reject'} preferSavedSignature={pending === 'approved'}
          onConfirm={async () => { await onStatus(leave, pending); setPending(null); }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
