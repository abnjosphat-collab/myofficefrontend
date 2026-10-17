// app/overtime/OTBulkEditDialog.tsx — rewrite the same fields on every selected
// request. Who worked the hours, the times and the approval state are not here:
// identity and lifecycle are never bulk operations.
'use client';

import { useMemo } from 'react';
import { BulkEditDialog, BulkEditLockedNotice, Input, Select, Textarea, type BulkField } from '@/components/ui-system';
import { PAYOUT_LABELS, PLANNING_LABELS, TYPE_LABELS } from './overtimeMeta';
import { COST_CENTRE_SUGGESTIONS, SELECTABLE_OT_TYPES, type OTRecord, type PayoutMethod, type PlanningStatus } from './types';
import { bulkEditOT } from './useOvertimeData';

const FIELDS: BulkField[] = [
  { key: 'date', label: 'Date' },
  { key: 'overtime_type', label: 'Overtime type' },
  { key: 'planning_status', label: 'Planned or unplanned' },
  { key: 'payout_method', label: 'Payout' },
  { key: 'cost_centre', label: 'Cost centre' },
  { key: 'reason', label: 'Reason' },
  { key: 'notes', label: 'Notes', hint: 'Replaces the notes on every selected request.' },
];

const TYPES = SELECTABLE_OT_TYPES.map(value => ({ value, label: TYPE_LABELS[value] }));
const PLANNING = (Object.keys(PLANNING_LABELS) as PlanningStatus[]).map(value => ({ value, label: PLANNING_LABELS[value] }));
const PAYOUT = (Object.keys(PAYOUT_LABELS) as PayoutMethod[]).map(value => ({ value, label: PAYOUT_LABELS[value] }));
const CENTRES = COST_CENTRE_SUGGESTIONS.map(value => ({ value, label: value }));

export function OTBulkEditDialog({ open, records, onOpenChange, onApplied }: {
  open: boolean;
  records: OTRecord[];
  onOpenChange: (open: boolean) => void;
  onApplied: (updated: OTRecord[], result: { succeeded: number; failed: number; errors: string[] }) => void;
}) {
  const locked = useMemo(() => records.filter(r => r.status !== 'pending').length, [records]);
  return (
    <BulkEditDialog open={open} onOpenChange={onOpenChange} title={`Edit ${records.length} ${records.length === 1 ? 'request' : 'requests'}`}
      description="Unlock a field to rewrite it on every selected request." count={records.length}
      notice={<BulkEditLockedNotice count={locked} noun="request" />} fields={FIELDS} submitLabel="Apply to selected"
      onSubmit={async patch => {
        const result = await bulkEditOT(records.map(r => r.id), patch);
        onApplied(result.updated, result);
      }}
      renderControl={(field, value, setValue, isLocked) => {
        const v = String(value ?? '');
        switch (field.key) {
          case 'date':
            return <Input type="date" aria-label="Date" value={v} disabled={isLocked} onChange={e => setValue(e.target.value || undefined)} />;
          case 'overtime_type':
            return <Select aria-label="Overtime type" value={v} disabled={isLocked} onValueChange={setValue} options={TYPES} placeholder="Choose a type" />;
          case 'planning_status':
            return <Select aria-label="Planned or unplanned" value={v} disabled={isLocked} onValueChange={setValue} options={PLANNING} placeholder="Choose" />;
          case 'payout_method':
            return <Select aria-label="Payout" value={v} disabled={isLocked} onValueChange={setValue} options={PAYOUT} placeholder="Choose" />;
          case 'cost_centre':
            return <Select aria-label="Cost centre" value={v} disabled={isLocked} onValueChange={setValue} options={CENTRES} placeholder="Choose a cost centre" />;
          case 'reason':
            return <Textarea aria-label="Reason" value={v} disabled={isLocked} onChange={e => setValue(e.target.value)} placeholder="The same reason for everyone" rows={2} />;
          default:
            return <Input aria-label={field.label} value={v} disabled={isLocked} onChange={e => setValue(e.target.value)} placeholder="The same notes for everyone" />;
        }
      }} />
  );
}
