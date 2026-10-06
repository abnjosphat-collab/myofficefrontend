// app/maintenance/AssignmentPicker.tsx — assign a person to a work order for one day. People come from the staff register with their
// availability for that day, as the SERVER reports it: someone on approved leave stays in the list, greyed, with the leave type and
// dates; someone with leave still requested is selectable with a warning; a name not on the register can be typed (free text). Whatever
// the interface shows, the server refuses an unavailable person again, and that refusal is shown here with the typed values kept.
'use client';

import { useMemo, useState } from 'react';
import { Field, FormDialog, Input, Segmented } from '@/components/ui-system';
import { RegisterField, emptyRef, type RegisterLoad, type RegisterOption, type RegisterRef } from '@/components/shared/RegisterField';
import { fmtDate } from '@/components/shared/utils';
import type { Person } from './workflowTypes';

export interface AssignInput { person: RegisterRef; role: 'lead' | 'assistant'; day: string; hours: number | null }

/** The register option for a person on the chosen day: availability is text first (reason and dates), never colour alone. */
export function personOption(p: Person): RegisterOption {
  const base = [p.designation, p.section].filter(Boolean).join(' · ');
  const l = p.availability.leave;
  switch (p.availability.state) {
    case 'on_leave': return { id: p.id, label: p.name, description: base, disabled: true, note: `On ${l?.leave_type.toLowerCase() ?? 'leave'}, ${l ? `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}` : ''} (approved)` };
    case 'archived': return { id: p.id, label: p.name, description: base, disabled: true, note: 'No longer on the staff register' };
    case 'leave_requested': return { id: p.id, label: p.name, description: `${base} · Leave requested ${l ? `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}` : ''} (pending)` };
    default: return { id: p.id, label: p.name, description: base };
  }
}

export function AssignmentPicker({ open, onOpenChange, subject, initialDay, peopleOn, load = 'ready', onRetry, onAssign }: {
  open: boolean; onOpenChange: (open: boolean) => void; subject: string; initialDay: string;
  /** People with their availability for the given day (the real source calls GET /maintenance/people-availability). */
  peopleOn: (day: string) => Person[]; load?: RegisterLoad; onRetry?: () => void;
  /** Throw to refuse: the message is shown inside the dialog and the form keeps what was typed. */
  onAssign: (input: AssignInput) => Promise<void>;
}) {
  const [person, setPerson] = useState<RegisterRef>(emptyRef);
  const [day, setDay] = useState(initialDay);
  const [role, setRole] = useState<'lead' | 'assistant'>('lead');
  const [hours, setHours] = useState('4');
  const [touched, setTouched] = useState(false);
  const [openedFor, setOpenedFor] = useState<boolean>(false);
  if (open !== openedFor) { setOpenedFor(open); if (open) { setPerson(emptyRef); setDay(initialDay); setRole('lead'); setHours('4'); setTouched(false); } }

  const people = useMemo(() => peopleOn(day), [peopleOn, day]);
  const options = useMemo(() => people.map(personOption), [people]);
  const chosen = options.find(o => o.label.toLowerCase() === person.text.trim().toLowerCase());
  const blocked = chosen?.disabled ? chosen.note : undefined;
  const pending = chosen && !chosen.disabled && people.find(p => p.id === chosen.id)?.availability.state === 'leave_requested';

  const submit = async () => {
    setTouched(true);
    if (!person.text.trim() || blocked) return false;
    await onAssign({ person, role, day, hours: hours ? Number(hours) : null });
  };
  const err = touched && !person.text.trim() ? 'Choose a person, or type a name.' : blocked ? `${person.text} cannot be assigned: ${blocked}.` : undefined;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="md" title="Assign someone" description={subject} submitLabel="Assign" onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label="Day of the work" required description="Availability is checked for this day."><Input type="date" value={day} onChange={e => setDay(e.target.value)} /></Field>
        <Field label="Person" required error={err} description={pending ? 'This person has leave requested for that day. They can still be assigned.' : undefined}>
          <RegisterField noun="person" value={person} onChange={setPerson} options={options} load={load} onRetry={onRetry} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role"><Segmented label="Role" value={role} onValueChange={v => setRole(v as 'lead' | 'assistant')} options={[{ value: 'lead', label: 'Lead' }, { value: 'assistant', label: 'Assistant' }]} /></Field>
          <Field label="Planned hours" optional><Input type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
