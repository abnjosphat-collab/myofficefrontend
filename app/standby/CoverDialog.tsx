// app/standby/CoverDialog.tsx — name who holds in place of whom, for which dates:
// a standby holder, a crew member, or a duty official. A refused save (including
// a second cover for the same person over the same dates) is shown inside the
// dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { Combobox, Field, FormDialog, Input, Segmented, Select } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import type { CoverPreset, DutyRotation, RotationCover, RotationKind, StandbyRotation } from './types';

interface Form {
  kind: RotationKind;
  rotation_id: string;
  absent_employee_id: string;
  absent_employee_name: string;
  cover_employee_id: string;
  cover_employee_name: string;
  cover_phone: string;
  date_from: string;
  date_to: string;
  reason: string;
}

const blank = (preset?: CoverPreset | null): Form => ({
  kind: preset?.kind ?? 'standby',
  rotation_id: preset ? String(preset.rotation_id) : '',
  absent_employee_id: preset?.absent_employee_id ?? '',
  absent_employee_name: preset?.absent_employee_name ?? '',
  cover_employee_id: '',
  cover_employee_name: '',
  cover_phone: '',
  date_from: preset?.date_from ?? todayLocal(),
  date_to: preset?.date_to ?? todayLocal(),
  reason: preset?.reason ?? '',
});

const fromCover = (c: RotationCover): Form => ({
  kind: c.kind,
  rotation_id: String(c.rotation_id),
  absent_employee_id: c.absent_employee_id,
  absent_employee_name: c.absent_employee_name,
  cover_employee_id: c.cover_employee_id,
  cover_employee_name: c.cover_employee_name,
  cover_phone: c.cover_phone || '',
  date_from: c.date_from.slice(0, 10),
  date_to: c.date_to.slice(0, 10),
  reason: c.reason || '',
});

export function CoverDialog({ open, cover, preset, standbyRotations, dutyRotations, onOpenChange, onSave }: {
  open: boolean;
  cover: RotationCover | null;
  preset?: CoverPreset | null;
  standbyRotations: StandbyRotation[];
  dutyRotations: DutyRotation[];
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form>(() => blank(preset));
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? (cover ? `edit-${cover.id}` : `new-${preset?.kind ?? ''}-${preset?.rotation_id ?? ''}-${preset?.absent_employee_id ?? ''}`) : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) { setTouched(false); setForm(cover ? fromCover(cover) : blank(preset)); }
  }
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  const rotationOptions = useMemo(() => {
    const list = form.kind === 'standby' ? standbyRotations : dutyRotations;
    return list.map(r => ({ value: String(r.id), label: r.name }));
  }, [form.kind, standbyRotations, dutyRotations]);

  const employeeOptions = useMemo(() => employees.map(e => ({
    value: String(e.id),
    label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
    description: [e.designation || e.position, e.department].filter(Boolean).join(' · '),
  })), [employees]);

  const pick = (id: string, role: 'absent' | 'cover') => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return;
    const snapshot = {
      employee_id: String(e.employee_id || e.id),
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
    };
    if (role === 'absent') set({ absent_employee_id: snapshot.employee_id, absent_employee_name: snapshot.employee_name });
    else setForm(f => ({ ...f, cover_employee_id: snapshot.employee_id, cover_employee_name: snapshot.employee_name, cover_phone: e.phone || f.cover_phone }));
  };

  const samePerson = form.absent_employee_id.trim().toUpperCase() !== ''
    && form.absent_employee_id.trim().toUpperCase() === form.cover_employee_id.trim().toUpperCase();
  const bad = {
    rotation: !form.rotation_id,
    absent: !form.absent_employee_id.trim() || !form.absent_employee_name.trim(),
    cover: !form.cover_employee_id.trim() || !form.cover_employee_name.trim() || samePerson,
    dates: !form.date_from || !form.date_to || form.date_to < form.date_from,
  };
  const anyBad = bad.rotation || bad.absent || bad.cover || bad.dates;
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (anyBad) return false;
    await onSave(cover?.id ?? null, {
      kind: form.kind,
      rotation_id: parseInt(form.rotation_id, 10),
      absent_employee_id: form.absent_employee_id.trim(),
      absent_employee_name: form.absent_employee_name.trim(),
      cover_employee_id: form.cover_employee_id.trim(),
      cover_employee_name: form.cover_employee_name.trim(),
      cover_phone: form.cover_phone.trim() || null,
      date_from: form.date_from,
      date_to: form.date_to,
      reason: form.reason.trim() || null,
    });
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={cover ? 'Edit cover' : 'Name cover'} description="Who holds in place of whom, and for which dates." submitLabel={cover ? 'Update cover' : 'Name cover'} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label="Roster" required>
          <Segmented label="Roster type" value={form.kind} onValueChange={v => set({ kind: v, rotation_id: '' })} options={[{ value: 'standby', label: 'Standby' }, { value: 'duty', label: 'Duty' }]} />
        </Field>
        <Field label="Rotation" required error={err(bad.rotation, 'Choose the rotation this cover belongs to.')}>
          <Select aria-label="Rotation" value={form.rotation_id} onValueChange={v => set({ rotation_id: v })} options={rotationOptions} placeholder={rotationOptions.length === 0 ? `No ${form.kind} rotations yet` : 'Choose a rotation'} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Away" required error={err(bad.absent, 'Choose who is away.')}>
            <Combobox aria-label="Away" value={employeeOptions.find(o => o.label === form.absent_employee_name)?.value ?? ''} onValueChange={id => pick(id, 'absent')} options={employeeOptions} placeholder={form.absent_employee_name || 'Search employees'} searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." />
          </Field>
          <Field label="Holding in their place" required error={err(bad.cover, samePerson ? 'Nobody holds in place of themselves.' : 'Choose who holds.')}>
            <Combobox aria-label="Holding in their place" value={employeeOptions.find(o => o.label === form.cover_employee_name)?.value ?? ''} onValueChange={id => pick(id, 'cover')} options={employeeOptions} placeholder={form.cover_employee_name || 'Search employees'} searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From" required error={err(bad.dates, 'Both dates are needed, and the end cannot be before the start.')}><Input type="date" value={form.date_from} onChange={e => set({ date_from: e.target.value })} /></Field>
          <Field label="To" required><Input type="date" value={form.date_to} onChange={e => set({ date_to: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cover phone" optional><Input inputMode="tel" value={form.cover_phone} onChange={e => set({ cover_phone: e.target.value })} /></Field>
          <Field label="Reason" optional><Input value={form.reason} onChange={e => set({ reason: e.target.value })} placeholder="Leave" /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
