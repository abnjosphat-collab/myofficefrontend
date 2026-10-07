// app/maintenance-preview/NewWorkOrderDialog.tsx — raise a work order: machine, job, who. Three fields, all from the registers.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input, Segmented } from '@/components/ui-system';
import { MACHINES, PEOPLE, TOOLS, fmt, type Priority } from './fixtures';
import { RegisterField, personItems } from './RegisterField';
import { usePreview } from './store';

const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }] as const;

export function NewWorkOrderDialog({ open, onOpenChange, onRaised }: { open: boolean; onOpenChange: (o: boolean) => void; onRaised?: (id: number) => void }) {
  const { raise } = usePreview();
  const [machine, setMachine] = useState('');
  const [title, setTitle] = useState('');
  const [who, setWho] = useState('');
  const [tool, setTool] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [touched, setTouched] = useState(false);
  const person = PEOPLE.find(p => p.name.toLowerCase() === who.trim().toLowerCase());

  const reset = () => { setMachine(''); setTitle(''); setWho(''); setTool(''); setPriority('medium'); setTouched(false); };
  const submit = async () => {
    setTouched(true);
    if (!machine.trim() || !title.trim()) return false;
    if (person?.leave) throw new Error(`${person.name} is on leave (${fmt(person.leave.from)} to ${fmt(person.leave.to)}) and cannot be assigned.`);
    const wo = raise({ machine: machine.trim(), title: title.trim(), assignee: who.trim(), priority, tools: tool.trim() ? [tool.trim()] : [] });
    toast.success(`${wo.number} raised.`);
    onRaised?.(wo.id);
    reset();
  };

  return (
    <FormDialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset(); }} size="md" title="New work order" description="Machine and job are required. Everything else can be filled in later." submitLabel="Raise work order" onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
        {touched && !machine.trim() && <p className="-mt-3 font-sans text-caption text-danger">Choose or type the machine.</p>}
        <Field label="Job" required error={touched && !title.trim() ? 'Say what needs doing.' : undefined}><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing" /></Field>
        <RegisterField label="Assign to" register="employees" items={personItems(PEOPLE, fmt)} value={who} onChange={setWho} placeholder="Type to search people" hint="Optional. People on leave are shown but cannot be chosen." />
        <RegisterField label="Tool needed" register="tools" items={TOOLS.map(t => ({ key: t.id, label: t.name, meta: t.code, note: t.state === 'available' ? undefined : t.detail }))} value={tool} onChange={setTool} placeholder="Type to search tools" hint="Optional. A warning does not stop you adding a tool." />
        <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Priority</span><Segmented label="Priority" value={priority} onValueChange={setPriority} options={PRIORITIES} /></div>
      </div>
    </FormDialog>
  );
}
