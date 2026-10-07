// app/maintenance-preview/ApprovalDialog.tsx — approve a request: the summary, who and by when (from the registers), the approver's signature.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input } from '@/components/ui-system';
import { SignOffField } from '@/app/maintenance/SignOffField';
import { PEOPLE, dayOffset, fmt, type Request } from './fixtures';
import { RegisterField, personItems } from './RegisterField';
import { usePreview } from './store';

export function ApprovalDialog({ request, onClose }: { request: Request | null; onClose: () => void }) {
  const { approve } = usePreview();
  const [who, setWho] = useState('');
  const [due, setDue] = useState(dayOffset(3));
  const [signature, setSignature] = useState('');
  const person = PEOPLE.find(p => p.name.toLowerCase() === who.trim().toLowerCase());
  const submit = async () => {
    if (!signature) throw new Error('Sign to approve.');
    if (person?.leave) throw new Error(`${person.name} is on leave (${fmt(person.leave.from)} to ${fmt(person.leave.to)}) and cannot be assigned.`);
    const wo = request ? approve(request.id, { assignee: who.trim(), due }) : null;
    if (!wo) throw new Error('This request has already been decided.');
    toast.success(`${wo.number} raised from ${request?.number}.`);
    setWho(''); setSignature('');
  };
  return (
    <FormDialog open={!!request} onOpenChange={o => { if (!o) onClose(); }} size="md" title="Approve request" description={request ? `${request.machine}, ${request.title}` : undefined} submitLabel="Approve and raise work order" onSubmit={submit} onSaved={onClose}>
      <div className="flex flex-col gap-4">
        <RegisterField label="Assign to" register="employees" items={personItems(PEOPLE, fmt)} value={who} onChange={setWho} placeholder="Type to search people" hint="Optional. People on leave are shown but cannot be chosen." />
        <Field label="Due date"><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
        <Field label="Your signature" required><SignOffField label="Approver signature" signerName="Foreman" value={signature} onChange={setSignature} /></Field>
      </div>
    </FormDialog>
  );
}
