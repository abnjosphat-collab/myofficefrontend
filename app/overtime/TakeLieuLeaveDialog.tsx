// app/overtime/TakeLieuLeaveDialog.tsx — which days the lieu leave was taken on. Saving creates the approved
// "Leave in Lieu of Overtime" request linked to the overtime record (a second save returns the existing leave
// instead of duplicating it). The linked leave does not show on timesheets.
'use client';

import { useState } from 'react';
import { Field, FormDialog, Input } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import type { OTRecord } from './types';
import { takeLieuAsLeave, type TakeLieuLeaveResult } from './useOvertimeData';

export function TakeLieuLeaveDialog({ record, open, onOpenChange, onTaken }: {
  record: OTRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onTaken: (result: TakeLieuLeaveResult, record: OTRecord) => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  useResetOnOpen(dialogKey(open, record?.id), () => { setStart(record?.date ?? ''); setEnd(record?.date ?? ''); });
  const submit = async () => {
    if (!record) return;
    if (!start || !end) throw new Error('Choose the first and last day of the leave.');
    if (end < start) throw new Error('The leave cannot end before it starts.');
    onTaken(await takeLieuAsLeave(record.id, { start_date: start, end_date: end }), record);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Mark as leave taken"
      description={record ? `${record.employee_name}, overtime ${fmtDate(record.date)}` : 'Which days the leave was taken on.'}
      submitLabel="Record leave taken" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First day" required><Input type="date" aria-label="First day" value={start} onChange={e => setStart(e.target.value)} /></Field>
        <Field label="Last day" required><Input type="date" aria-label="Last day" value={end} onChange={e => setEnd(e.target.value)} /></Field>
      </div>
      <p className="font-sans text-caption text-ink-muted">Creates an approved Leave in Lieu of Overtime request for these days, linked to this overtime. The linked leave does not show on timesheets.</p>
    </FormDialog>
  );
}
