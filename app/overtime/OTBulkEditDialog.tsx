// app/overtime/OTBulkEditDialog.tsx — rewrite the same fields on every selected
// request. Who worked the hours and the approval state are not here: identity and
// lifecycle are never bulk operations. Times move as a pair (a crew's shift
// changed); the hours then come from the new times, as in a single edit.
'use client';

import { useMemo } from 'react';
import { ShiftTimeRange } from '@/components/shared/ShiftTimeRange';
import { BulkEditDialog, BulkEditLockedNotice, Field, Input, Select, Textarea, type BulkField } from '@/components/ui-system';
import { calcHours } from './calcOvertime';
import { PAYOUT_LABELS, PLANNING_LABELS, TYPE_LABELS } from './overtimeMeta';
import { COST_CENTRE_SUGGESTIONS, SELECTABLE_OT_TYPES, type OTRecord, type PayoutMethod, type PlanningStatus } from './types';
import { bulkEditOT } from './useOvertimeData';

interface TimePair { start: string; end: string }

/** The bulk patch the server takes: the times pair becomes start_time/end_time, everything else passes through. */
export function toBulkOTPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const { times, ...rest } = patch;
  if (times === undefined) return rest;
  const { start, end } = times as TimePair;
  if (!start || !end) throw new Error('Give both a start and an end time, or lock the times again.');
  if (calcHours(start, end) <= 0) throw new Error('The start and end time are the same, so no hours were worked.');
  return { ...rest, start_time: start, end_time: end };
}

const FIELDS: BulkField[] = [
  { key: 'date', label: 'Date' },
  { key: 'times', label: 'Start and end time', hint: 'Sets the same times on every selected request; the hours are worked out from them.' },
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
        const result = await bulkEditOT(records.map(r => r.id), toBulkOTPatch(patch));
        onApplied(result.updated, result);
      }}
      renderControl={(field, value, setValue, isLocked) => {
        const v = String(value ?? '');
        switch (field.key) {
          case 'date':
            return <Input type="date" aria-label="Date" value={v} disabled={isLocked} onChange={e => setValue(e.target.value || undefined)} />;
          case 'times': {
            if (isLocked) return <Input aria-label="Start and end time" value="" disabled placeholder="Unlock to set new times" />;
            const { start, end } = (value as TimePair | undefined) ?? { start: '', end: '' };
            const hours = calcHours(start, end);
            return (
              <ShiftTimeRange start={start} end={end} onChange={(s, e) => setValue({ start: s, end: e })}
                trailing={<Field label="Duration"><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular" aria-live="polite">{hours > 0 ? `${hours.toFixed(1)} hours` : 'Not set'}</p></Field>} />
            );
          }
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
