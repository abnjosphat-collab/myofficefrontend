// app/maintenance/QuickWorkOrderForm.tsx — raise a work order on the fly with four fields (machine, what is wrong, type, priority), or
// a breakdown work order (the same form with the type and priority preset and "start now" ticked). Everything else defaults on the
// server. The form carries one idempotency key for as long as it is open, so a retry after a lost connection cannot create a second
// work order. A refused save stays inside the dialog with what was typed.
'use client';

import { useState } from 'react';
import { Checkbox, Field, FormDialog, Segmented, Textarea } from '@/components/ui-system';
import { RegisterField, emptyRef, type RegisterLoad, type RegisterOption, type RegisterRef } from '@/components/shared/RegisterField';
import { CLASSIFICATIONS, PRIORITY } from './meta';
import type { WOClassification, WorkOrderPriority } from './types';

export interface QuickInput { machine: RegisterRef; description: string; classification: WOClassification; priority: WorkOrderPriority; startNow: boolean; idempotencyKey: string }

const PRIORITIES = (Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }));
const TYPES = CLASSIFICATIONS.map(c => ({ value: c.value as string, label: c.value === 'planned_maintenance' ? 'Preventive' : c.label }));
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random()}`);

export function QuickWorkOrderForm({ open, onOpenChange, preset, machines, machinesLoad = 'ready', onRetryMachines, onCreate }: {
  open: boolean; onOpenChange: (open: boolean) => void; preset?: 'breakdown'; machines: RegisterOption[]; machinesLoad?: RegisterLoad; onRetryMachines?: () => void;
  /** Throw to refuse: the message is shown in the dialog and nothing typed is lost. */
  onCreate: (input: QuickInput) => Promise<void>;
}) {
  const breakdown = preset === 'breakdown';
  const [machine, setMachine] = useState<RegisterRef>(emptyRef);
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState<WOClassification>('planned_maintenance');
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [startNow, setStartNow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [openedFor, setOpenedFor] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) { setMachine(emptyRef); setDescription(''); setClassification(breakdown ? 'breakdown' : 'planned_maintenance'); setPriority(breakdown ? 'high' : 'medium'); setStartNow(breakdown); setTouched(false); setIdempotencyKey(newKey()); }
  }
  const submit = async () => {
    setTouched(true);
    if (!machine.text.trim() || !description.trim()) return false;
    await onCreate({ machine, description: description.trim(), classification, priority, startNow, idempotencyKey });
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="md" title={breakdown ? 'New breakdown work order' : 'New work order'} description={breakdown ? 'A machine has stopped. Raise it now; the rest can be filled in later.' : 'The machine and what needs doing. Everything else can be filled in later.'} submitLabel={breakdown ? 'Raise breakdown work order' : 'Raise work order'} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label="Machine" required error={touched && !machine.text.trim() ? 'Choose a machine, or type its name.' : undefined}>
          <RegisterField noun="machine" value={machine} onChange={setMachine} options={machines} load={machinesLoad} onRetry={onRetryMachines} />
        </Field>
        <Field label={breakdown ? 'What has happened?' : 'What is wrong or to be done?'} required error={touched && !description.trim() ? 'Describe the job.' : undefined}>
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <Field label="Type"><Segmented label="Type" value={classification} onValueChange={v => setClassification(v as WOClassification)} options={TYPES} /></Field>
        <Field label="Priority"><Segmented label="Priority" value={priority} onValueChange={v => setPriority(v as WorkOrderPriority)} options={PRIORITIES} /></Field>
        <Checkbox checked={startNow} onChange={e => setStartNow(e.target.checked)} label="Start now, assigned to me" />
      </div>
    </FormDialog>
  );
}
