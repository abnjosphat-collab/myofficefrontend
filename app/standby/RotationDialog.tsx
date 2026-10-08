// app/standby/RotationDialog.tsx — create or edit a rotation: the name, stint
// length and start, and the ordered member sequence. Standby rotations carry
// each lead's crew; duty rosters carry a department scope and solo officials.
// A refused save is shown inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox, Combobox, Field, FormDialog, IconButton, Input, Textarea } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import type { CrewMember, DutyRotation, DutyRotationMember, RotationMember, StandbyRotation } from './types';
import type { RotationKind } from './types';

interface MemberDraft extends RotationMember { key: string }

const blank = (): { name: string; scope: string; week_length_days: string; cycle_start_date: string; is_active: boolean; notes: string; members: MemberDraft[] } => ({
  name: '', scope: '', week_length_days: '7', cycle_start_date: todayLocal(), is_active: true, notes: '', members: [],
});

const toDraft = (m: RotationMember | DutyRotationMember, i: number): MemberDraft => ({
  employee_id: m.employee_id, employee_name: m.employee_name, phone: m.phone ?? null, designation: m.designation ?? null,
  crew: (m as RotationMember).crew ?? [], key: `${m.employee_id}-${i}`,
});
const fromRotation = (r: StandbyRotation | DutyRotation, mode: RotationKind) => ({
  name: r.name, scope: (mode === 'standby' ? (r as StandbyRotation).section : (r as DutyRotation).department) || '',
  week_length_days: String(r.week_length_days), cycle_start_date: r.cycle_start_date.slice(0, 10),
  is_active: r.is_active, notes: r.notes || '', members: (r.members || []).map(toDraft),
});

let keySeq = 0;
const nextKey = () => `new-${Date.now()}-${(keySeq += 1)}`;

export function RotationDialog({ open, mode, rotation, onOpenChange, onSave }: {
  open: boolean; mode: RotationKind; rotation: StandbyRotation | DutyRotation | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState(blank);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? `${mode}-${String(rotation?.id ?? 'new')}` : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setForm(rotation ? fromRotation(rotation, mode) : blank()); } }
  const set = (patch: Partial<ReturnType<typeof blank>>) => setForm(f => ({ ...f, ...patch }));

  const options = useMemo(() => employees.map(e => ({
    value: String(e.id),
    label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
    description: [e.designation || e.position, e.department].filter(Boolean).join(' · '),
  })), [employees]);
  const snapshotOf = (id: string) => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return null;
    return {
      employee_id: String(e.employee_id || e.id),
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
      phone: e.phone || null,
      designation: (e.designation || e.position || null) as string | null,
    };
  };
  const addMember = (id: string) => {
    const s = snapshotOf(id);
    if (!s || form.members.some(m => m.employee_id === s.employee_id)) return;
    set({ members: [...form.members, { ...s, crew: [], key: nextKey() }] });
  };
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= form.members.length) return;
    const next = [...form.members];
    ([next[i], next[j]] = [next[j], next[i]]);
    set({ members: next });
  };
  const addCrew = (i: number, id: string) => {
    const s = snapshotOf(id);
    if (!s) return;
    const next = [...form.members];
    const crew = next[i].crew ?? [];
    if (crew.some(c => c.employee_id === s.employee_id)) return;
    next[i] = { ...next[i], crew: [...crew, { employee_id: s.employee_id, employee_name: s.employee_name, phone: s.phone }] };
    set({ members: next });
  };
  const removeCrew = (i: number, employeeId: string) => {
    const next = [...form.members];
    next[i] = { ...next[i], crew: (next[i].crew ?? []).filter(c => c.employee_id !== employeeId) };
    set({ members: next });
  };

  const week = parseInt(form.week_length_days, 10);
  const bad = {
    name: !form.name.trim(),
    start: !form.cycle_start_date,
    week: !(week >= 1 && week <= 31),
    members: form.members.length === 0,
  };
  const anyBad = bad.name || bad.start || bad.week || bad.members;
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (anyBad) return false;
    const members: RotationMember[] | DutyRotationMember[] = form.members.map(m => {
      const base = {
        employee_id: m.employee_id, employee_name: m.employee_name,
        phone: m.phone || null, designation: m.designation || null,
      };
      return mode === 'standby'
        ? { ...base, crew: (m.crew ?? []).map((c: CrewMember) => ({ employee_id: c.employee_id, employee_name: c.employee_name, phone: c.phone || null })) }
        : base;
    });
    await onSave(rotation?.id ?? null, {
      name: form.name.trim(), [mode === 'standby' ? 'section' : 'department']: form.scope.trim() || null,
      week_length_days: week, cycle_start_date: form.cycle_start_date, is_active: form.is_active,
      notes: form.notes.trim() || null, members,
    });
  };

  const copy = mode === 'standby'
    ? { title: rotation ? 'Edit standby rotation' : 'New standby rotation', description: rotation ? 'Change who stands standby and in what order.' : 'Set up who stands standby, in what order, and for how long each.' }
    : { title: rotation ? 'Edit duty roster' : 'New duty roster', description: rotation ? 'Change who answers as duty official and in what order.' : 'Set up who answers as duty official, in what order, and for how long each.' };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="xl" title={copy.title} description={copy.description} submitLabel={rotation ? 'Update rotation' : 'Create rotation'} onSubmit={submit}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="rt-bas" className="flex flex-col gap-3">
          <h3 id="rt-bas" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Rotation</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required error={err(bad.name, 'Give the rotation a name.')}><Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder={mode === 'standby' ? 'Electrical standby' : 'Mine-wide duty'} /></Field>
            {mode === 'standby' ? (
              <Field label="Section" optional><Input value={form.scope} onChange={e => set({ scope: e.target.value })} placeholder="Electrical" /></Field>
            ) : (
              <Field label="Department" optional description="Leave blank for a mine-wide roster."><Input value={form.scope} onChange={e => set({ scope: e.target.value })} placeholder="Mine-wide" /></Field>
            )}
            <Field label="Stint length (days)" required error={err(bad.week, 'Enter 1 to 31 days.')}><Input type="number" min={1} max={31} value={form.week_length_days} onChange={e => set({ week_length_days: e.target.value })} /></Field>
            <Field label="Cycle start date" required error={err(bad.start, 'Enter the first day of the rotation.')}><Input type="date" value={form.cycle_start_date} onChange={e => set({ cycle_start_date: e.target.value })} /></Field>
          </div>
          <Field label="Notes" optional><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
          <Checkbox label="Active rotation" description="Only active rotations appear on the standby board." checked={form.is_active} onChange={e => set({ is_active: e.target.checked })} />
        </section>

        <section aria-labelledby="rt-seq" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
            <h3 id="rt-seq" className="font-display text-section font-semibold text-ink">Sequence {form.members.length > 0 && <span className="font-sans text-caption font-normal text-ink-muted">{form.members.length} {form.members.length === 1 ? 'member' : 'members'}</span>}</h3>
          </div>
          {touched && bad.members && <p className="font-sans text-body-sm text-danger">Add at least one member — an empty rotation stands no standby.</p>}
          <ol className="flex flex-col gap-2">
            {form.members.map((m, i) => (
              <li key={m.key} className="flex flex-col gap-2 rounded-control border border-line bg-surface-subtle p-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted font-sans text-label font-semibold tabular text-ink" aria-hidden="true">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-label font-medium text-ink">{m.employee_name}</p>
                    <p className="truncate font-sans text-caption text-ink-muted">{mode === 'standby' ? [m.designation, (m.crew ?? []).length ? `${(m.crew ?? []).length} crew` : 'no crew yet'].filter(Boolean).join(' · ') : (m.designation || 'Official')}</p>
                  </div>
                  <IconButton icon="arrow-up" size="sm" variant="ghost" label={`Move ${m.employee_name} earlier`} disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon="arrow-down" size="sm" variant="ghost" label={`Move ${m.employee_name} later`} disabled={i === form.members.length - 1} onClick={() => move(i, 1)} />
                  <IconButton icon="close" size="sm" variant="danger" label={`Remove ${m.employee_name} from the rotation`} onClick={() => set({ members: form.members.filter((_, n) => n !== i) })} />
                </div>
                {mode === 'standby' && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-9">
                    {(m.crew ?? []).map(c => (
                      <span key={c.employee_id} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pl-2.5 pr-1 font-sans text-caption text-ink">
                        {c.employee_name}
                        <IconButton icon="close" size="sm" variant="ghost" label={`Remove ${c.employee_name} from ${m.employee_name}'s crew`} onClick={() => removeCrew(i, c.employee_id)} />
                      </span>
                    ))}
                    <Combobox aria-label={`Add crew for ${m.employee_name}`} value="" onValueChange={id => addCrew(i, id)} options={options} placeholder="Add crew" searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." className="min-w-44 flex-1" />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <Field label="Add member" optional><Combobox aria-label="Add member" value="" onValueChange={addMember} options={options} placeholder="Search employees" searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." /></Field>
        </section>
      </div>
    </FormDialog>
  );
}
