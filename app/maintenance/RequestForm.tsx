// app/maintenance/RequestForm.tsx — a request for maintenance work from any department: who is asking, from where, which machine, what
// is wrong, how urgent and by when. Machine, person and section come from their registers (type a few characters, Tab to fill), with free
// text as a provision. The form carries one idempotency key while open so a retry cannot send the request twice, and a refusal stays
// inside the dialog with everything typed kept.
'use client';

import { useState } from 'react';
import { Field, FormDialog, Input, Segmented, Textarea } from '@/components/ui-system';
import { RegisterField, emptyRef, type RegisterLoad, type RegisterOption, type RegisterRef } from '@/components/shared/RegisterField';
import { PRIORITY } from './meta';
import type { WorkOrderPriority } from './types';

export interface RequestInput { requester: RegisterRef; department: RegisterRef; section: RegisterRef; machine: RegisterRef; description: string; priority: WorkOrderPriority; neededBy: string; idempotencyKey: string }
const PRIORITIES = (Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }));
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random()}`);

export function RequestForm({ open, onOpenChange, me, machines, people, departments, sections, load = 'ready', onRetry, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; me: RegisterRef; machines: RegisterOption[]; people: RegisterOption[]; departments: RegisterOption[]; sections: RegisterOption[];
  load?: RegisterLoad; onRetry?: () => void; onCreate: (input: RequestInput) => Promise<void>;
}) {
  const [requester, setRequester] = useState<RegisterRef>(me);
  const [department, setDepartment] = useState<RegisterRef>(emptyRef);
  const [section, setSection] = useState<RegisterRef>(emptyRef);
  const [machine, setMachine] = useState<RegisterRef>(emptyRef);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [neededBy, setNeededBy] = useState('');
  const [touched, setTouched] = useState(false);
  const [openedFor, setOpenedFor] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) { setRequester(me); setDepartment(emptyRef); setSection(emptyRef); setMachine(emptyRef); setDescription(''); setPriority('medium'); setNeededBy(''); setTouched(false); setIdempotencyKey(newKey()); }
  }
  const submit = async () => {
    setTouched(true);
    if (!machine.text.trim() || !description.trim()) return false;
    await onCreate({ requester, department, section, machine, description: description.trim(), priority, neededBy, idempotencyKey });
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title="Request maintenance work" description="Engineering will review it. You can follow it under My requests." submitLabel="Send request" onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Your name"><RegisterField noun="person" value={requester} onChange={setRequester} options={people} load={load} onRetry={onRetry} /></Field>
          <Field label="Department"><RegisterField noun="department" value={department} onChange={setDepartment} options={departments} /></Field>
          <Field label="Section"><RegisterField noun="section" value={section} onChange={setSection} options={sections} /></Field>
        </div>
        <Field label="Machine" required error={touched && !machine.text.trim() ? 'Choose a machine, or type its name.' : undefined}><RegisterField noun="machine" value={machine} onChange={setMachine} options={machines} load={load} onRetry={onRetry} /></Field>
        <Field label="What is the problem?" required error={touched && !description.trim() ? 'Describe what is wrong.' : undefined}><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Priority"><Segmented label="Priority" value={priority} onValueChange={v => setPriority(v as WorkOrderPriority)} options={PRIORITIES} /></Field>
          <Field label="Needed by" optional><Input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
