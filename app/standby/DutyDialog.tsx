// app/standby/DutyDialog.tsx — name the duty official for a date range, mine-wide
// or for one department. A refused save (including a clash with another official
// over the same dates) is shown inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { Combobox, Field, FormDialog, Input, Textarea } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import type { DutyEntry } from './types';

const blank = () => ({ employee_id: '', employee_name: '', phone: '', department: '', date_from: todayLocal(), date_to: todayLocal(), note: '' });
const fromEntry = (e: DutyEntry) => ({
  employee_id: e.employee_id, employee_name: e.employee_name, phone: e.phone || '', department: e.department || '',
  date_from: e.date_from.slice(0, 10), date_to: e.date_to.slice(0, 10), note: e.note || '',
});

export function DutyDialog({ open, entry, onOpenChange, onSave }: {
  open: boolean; entry: DutyEntry | null; onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState(blank);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(entry?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setForm(entry ? fromEntry(entry) : blank()); } }
  const set = (patch: Partial<ReturnType<typeof blank>>) => setForm(f => ({ ...f, ...patch }));

  const options = useMemo(() => employees.map(e => ({
    value: String(e.id),
    label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
    description: [e.designation || e.position, e.department].filter(Boolean).join(' · '),
  })), [employees]);
  const pick = (id: string) => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return;
    setForm(f => ({
      ...f,
      employee_id: String(e.employee_id || e.id),
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'),
      phone: e.phone || f.phone,
    }));
  };

  const bad = {
    employee: !form.employee_id.trim() || !form.employee_name.trim(),
    dates: !form.date_from || !form.date_to || form.date_to < form.date_from,
  };
  const anyBad = bad.employee || bad.dates;
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (anyBad) return false;
    await onSave(entry?.id ?? null, {
      employee_id: form.employee_id.trim(), employee_name: form.employee_name.trim(), phone: form.phone.trim() || null,
      department: form.department.trim() || null, date_from: form.date_from, date_to: form.date_to, note: form.note.trim() || null,
    });
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={entry ? 'Edit duty official' : 'Name duty official'} description="Who answers for the mine over these dates." submitLabel={entry ? 'Update official' : 'Name official'} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label="Official" required error={err(bad.employee, 'Choose the official or enter their ID and name.')}>
          <Combobox aria-label="Official" value={options.find(o => o.label === form.employee_name)?.value ?? ''} onValueChange={pick} options={options} placeholder={form.employee_name || 'Search employees'} searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee ID" required><Input value={form.employee_id} onChange={e => set({ employee_id: e.target.value })} /></Field>
          <Field label="Phone" optional><Input inputMode="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} /></Field>
          <Field label="Department" optional description="Leave blank for a mine-wide official."><Input value={form.department} onChange={e => set({ department: e.target.value })} placeholder="Mine-wide" /></Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From" required error={err(bad.dates, 'Both dates are needed, and the end cannot be before the start.')}><Input type="date" value={form.date_from} onChange={e => set({ date_from: e.target.value })} /></Field>
          <Field label="To" required><Input type="date" value={form.date_to} onChange={e => set({ date_to: e.target.value })} /></Field>
        </div>
        <Field label="Note" optional><Textarea rows={2} value={form.note} onChange={e => set({ note: e.target.value })} /></Field>
      </div>
    </FormDialog>
  );
}
