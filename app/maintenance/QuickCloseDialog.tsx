// app/maintenance/QuickCloseDialog.tsx — close a job in seconds: what was done, the time as start/finish or plain hours,
// and (for a breakdown) its Problem, Cause and Action codes. One job or a batch of routine planned jobs share the same note and
// time; each job keeps its own artisan and date, and anything already recorded counts. A refusal shows its reason here
// and keeps what was typed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FieldGroup, FormDialog, Input, Notice, Segmented } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { rememberChoice } from '@/components/shared/RecentChoices';
import { ApiError } from '@/lib/apiClient';
import { todayLocal } from '@/lib/dates';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import { bulkCloseWorkOrders, closeWorkOrder, type BulkCloseResult } from './api';
import { bulkCloseRefusal, durationText, parseDurationHours, quickCloseBody, quickCloseProblems, type QuickCloseDraft } from './helpers';
import { ListInput } from '@/components/shared/ListInput';
import { PhraseField } from './PhraseField';
import type { WorkOrder } from './types';

export type QuickCloseRequest = { kind: 'single'; order: WorkOrder } | { kind: 'bulk'; orders: WorkOrder[] };

const SAVED_NAME = 'maint_artisan_name';
const savedName = () => { try { return localStorage.getItem(SAVED_NAME) || ''; } catch { return ''; } };
const blank = (): QuickCloseDraft => ({ work_done: '', mode: 'times', start: '', finish: '', hours: '', artisan_name: savedName(), artisan_date: todayLocal(), cause: '', failure_mode: '', action: '' });
const fromOrder = (w: WorkOrder): QuickCloseDraft => {
  const hours = !w.time_work_started && !w.time_work_finished && w.total_time_worked ? String(parseDurationHours(w.total_time_worked) || '') : '';
  return {
    work_done: w.work_done_details || '', mode: hours ? 'hours' : 'times', start: w.time_work_started || '', finish: w.time_work_finished || '', hours,
    artisan_name: w.artisan_name || w.allocated_to || savedName(), artisan_date: w.artisan_date || todayLocal(),
    cause: w.cause_of_failure || '', failure_mode: w.failure_mode || '', action: w.corrective_action || '',
  };
};
// Bulk validation runs against an empty probe: the shared note and time are always required, and breakdowns (with
// their cause and mode) never join a batch.
const BLANK_PROBE = { work_done_details: '', total_time_worked: '', classification: undefined } as WorkOrder;

export function QuickCloseDialog({ request, onOpenChange, onClosed, onBulkClosed, onStale }: {
  request: QuickCloseRequest | null;
  onOpenChange: (open: boolean) => void;
  onClosed: (updated: WorkOrder) => void;
  onBulkClosed: (result: BulkCloseResult) => void;
  onStale: () => void;
}) {
  const [d, setD] = useState<QuickCloseDraft>(blank);
  const [touched, setTouched] = useState(false);
  const key = request?.kind === 'single' ? `close-${request.order.id}` : request ? `bulk-${request.orders.map(w => w.id).join(',')}` : null;
  useResetOnOpen(dialogKey(!!request, key, 'blank'), () => { setTouched(false); setD(request?.kind === 'single' ? fromOrder(request.order) : blank()); });
  const set = (patch: Partial<QuickCloseDraft>) => setD(prev => ({ ...prev, ...patch }));

  const single = request?.kind === 'single' ? request.order : null;
  const bulkOrders = request?.kind === 'bulk' ? request.orders : [];
  const eligible = bulkOrders.filter(w => !bulkCloseRefusal(w));
  const refused = bulkOrders.filter(w => bulkCloseRefusal(w));
  const probe = single ?? BLANK_PROBE;
  const problems = touched ? quickCloseProblems(d, probe) : {};
  const err = (p?: string) => p;
  const breakdown = !!single && single.classification === 'breakdown';

  const submit = async () => {
    setTouched(true);
    if (request?.kind === 'bulk' && eligible.length === 0) return false;
    if (Object.values(quickCloseProblems(d, probe)).some(Boolean)) return false;
    try {
      if (single) {
        const updated = await closeWorkOrder(single.id, { ...quickCloseBody(d), expected_updated_at: single.updated_at });
        try { if (d.artisan_name.trim()) localStorage.setItem(SAVED_NAME, d.artisan_name.trim()); } catch { /* a convenience */ }
        if (d.work_done.trim()) rememberChoice('maint_work_done', d.work_done);
        toast.success(`Work order ${single.work_order_number} closed.`);
        onClosed(updated);
      } else {
        const result = await bulkCloseWorkOrders({ ids: eligible.map(w => w.id), ...quickCloseBody(d) });
        if (d.work_done.trim()) rememberChoice('maint_work_done', d.work_done);
        onBulkClosed(result);
      }
      return undefined;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) onStale();
      throw e;
    }
  };

  return (
    <FormDialog
      open={!!request} onOpenChange={onOpenChange} size="md"
      title={single ? `Done: ${single.work_order_number}` : `Done: ${eligible.length} ${eligible.length === 1 ? 'work order' : 'work orders'}`}
      description={single ? single.equipment_info : 'The same note and time go on each one; each keeps its own artisan and date.'}
      submitLabel={single ? 'Close work order' : `Close ${eligible.length} ${eligible.length === 1 ? 'work order' : 'work orders'}`}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        {refused.length > 0 && (
          <Notice tone="warning" title={`${refused.length} selected ${refused.length === 1 ? 'job' : 'jobs'} cannot close in this batch`}>
            {refused.map(w => `${w.work_order_number} (${bulkCloseRefusal(w)})`).join(' ')}
          </Notice>
        )}
        <PhraseField label="Work done" value={d.work_done} onChange={v => set({ work_done: v })} placeholder="Describe exactly what was done" historyKey="maint_work_done" required error={err(problems.work_done)} />
        <FieldGroup label="Time worked" error={err(problems.time)}>
          <Segmented label="Time worked" value={d.mode} onValueChange={v => set({ mode: v as QuickCloseDraft['mode'] })} options={[{ value: 'times', label: 'Start and finish' }, { value: 'hours', label: 'Hours' }]} />
          {d.mode === 'times' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Started"><Input type="time" value={d.start} onChange={e => set({ start: e.target.value })} /></Field>
              <Field label="Finished"><Input type="time" value={d.finish} onChange={e => set({ finish: e.target.value })} /></Field>
              <FieldGroup label="Duration"><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular" aria-live="polite">{durationText(d.start, d.finish) || 'Not set'}</p></FieldGroup>
            </div>
          ) : (
            <Field label="Hours" description="Time on this job, to the half hour."><Input type="number" min={0} step={0.5} value={d.hours} onChange={e => set({ hours: e.target.value })} placeholder="2.5" /></Field>
          )}
        </FieldGroup>
        {breakdown && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Problem" required error={err(problems.failure_mode)}><ListInput listName="failure_problem" value={d.failure_mode} onChange={v => set({ failure_mode: v })} placeholder="What failed" /></Field>
            <Field label="Cause" required error={err(problems.cause)}><ListInput listName="failure_cause" value={d.cause} onChange={v => set({ cause: v })} placeholder="Why it failed" /></Field>
            <Field label="Action taken" required error={err(problems.action)}><ListInput listName="failure_action" value={d.action} onChange={v => set({ action: v })} placeholder="What fixed it" /></Field>
          </div>
        )}
        {single && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Artisan name"><PersonInput value={d.artisan_name} onChange={v => set({ artisan_name: v })} placeholder="Type to search employees" /></Field>
            <Field label="Date" error={err(problems.date)}><Input type="date" value={d.artisan_date} onChange={e => set({ artisan_date: e.target.value })} /></Field>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
