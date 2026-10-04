// app/shifts/AssignDialog.tsx — assign a shift cycle to an employee or edit one: who, the on/off pattern and start date, the
// default timing and timing blocks, standby periods. Required fields and date ranges are explained on the field; a refused
// save is shown inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Combobox, Field, FormDialog, IconButton, Input, Select, Textarea } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import { SHIFT_PATTERNS, TIMING_KEYS, TIMING_PRESETS } from './shiftMeta';
import type { FormState, ShiftAssignment, ShiftTimingPeriod, ShiftType, StandbyPeriod } from './types';

const blank = (): FormState => ({
  employee_id: '', employee_name: '', designation: '', department: '', section: '', phone: '', shift_type: '10-4', on_days: '10', off_days: '4', cycle_start_date: todayLocal(),
  notes: '', is_active: true, standby_periods: [], shift_label: '', shift_hours: '', shift_timing_periods: [],
});
const fromAssignment = (e: ShiftAssignment): FormState => ({
  employee_id: e.employee_id, employee_name: e.employee_name, designation: e.designation || '', department: e.department || '', section: e.section || '', phone: e.phone || '',
  shift_type: e.shift_type, on_days: String(e.on_days), off_days: String(e.off_days), cycle_start_date: e.cycle_start_date, notes: e.notes || '', is_active: e.is_active,
  standby_periods: e.standby_periods || [], shift_label: e.shift_label || '', shift_hours: e.shift_hours || '', shift_timing_periods: e.shift_timing_periods || [],
});
const TYPE_OPTIONS = (Object.keys(SHIFT_PATTERNS) as ShiftType[]).map(k => ({ value: k, label: SHIFT_PATTERNS[k].label }));
const swap = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((x, n) => (n === i ? { ...x, ...patch } : x));

export function AssignDialog({ open, assignment, onOpenChange, onSave }: {
  open: boolean; assignment: ShiftAssignment | null; onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState<FormState>(blank);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(assignment?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setForm(assignment ? fromAssignment(assignment) : blank()); } }
  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const options = useMemo(() => employees.map(e => ({ value: String(e.id), label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee'), description: [e.designation || e.position, e.department].filter(Boolean).join(' · ') })), [employees]);
  const pick = (id: string) => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return;
    const name = `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_id || 'Employee');
    setForm(f => ({ ...f, employee_id: String(e.id), employee_name: name, designation: ((e.designation || e.position || '') as string) || f.designation, department: e.department || f.department, section: (e.section as string) || f.section, phone: e.phone || f.phone }));
  };
  const changeType = (t: string) => { const p = SHIFT_PATTERNS[t as ShiftType]; set({ shift_type: t as ShiftType, on_days: String(p.on), off_days: String(p.off) }); };

  const isCustom = form.shift_type === 'custom';
  const isStandby = form.shift_type === 'standby';
  const [defStart = '', defEnd = ''] = (form.shift_hours || '').split('–').map(s => s.trim());
  const bad = {
    employee: !form.employee_id.trim() || !form.employee_name.trim(),
    start: !form.cycle_start_date,
    cycle: isCustom && !(parseInt(form.on_days, 10) > 0),
    blocks: form.shift_timing_periods.map(b => !b.from || !b.to || b.to < b.from),
    standby: form.standby_periods.map(p => !p.from || !p.to || p.to < p.from),
  };
  const anyBad = bad.employee || bad.start || bad.cycle || bad.blocks.some(Boolean) || bad.standby.some(Boolean);
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (anyBad) return false;
    await onSave(assignment?.id ?? null, {
      employee_id: form.employee_id.trim(), employee_name: form.employee_name.trim(), designation: form.designation || null, department: form.department || null, section: form.section || null, phone: form.phone || null,
      shift_type: form.shift_type, on_days: parseInt(form.on_days, 10) || 0, off_days: parseInt(form.off_days, 10) || 0, cycle_start_date: form.cycle_start_date,
      notes: form.notes || null, is_active: form.is_active, standby_periods: form.standby_periods, shift_label: form.shift_label || null, shift_hours: form.shift_hours || null, shift_timing_periods: form.shift_timing_periods,
    });
    toast.success(assignment ? 'Assignment updated.' : 'Shift assigned.');
  };

  const block = (i: number, patch: Partial<ShiftTimingPeriod>) => set({ shift_timing_periods: swap(form.shift_timing_periods, i, patch) });
  const stand = (i: number, patch: Partial<StandbyPeriod>) => set({ standby_periods: swap(form.standby_periods, i, patch) });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="xl" title={assignment ? 'Edit assignment' : 'Assign shift'} description={assignment ? 'Change the shift cycle for this employee.' : 'Set up a shift cycle for an employee.'} submitLabel={assignment ? 'Update assignment' : 'Assign shift'} onSubmit={submit}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="as-emp" className="flex flex-col gap-3">
          <h3 id="as-emp" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Employee</h3>
          <Field label="Employee" required error={err(bad.employee, 'Choose the employee or enter their ID and name.')}>
            <Combobox aria-label="Employee" value={options.find(o => o.label === form.employee_name && o.value === form.employee_id)?.value ?? ''} onValueChange={pick} options={options} placeholder={form.employee_name || 'Search employees'} searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Employee ID" required><Input value={form.employee_id} onChange={e => set({ employee_id: e.target.value })} /></Field>
            <Field label="Phone" optional><Input inputMode="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} /></Field>
            <Field label="Designation" optional><Input value={form.designation} onChange={e => set({ designation: e.target.value })} /></Field>
            <Field label="Department" optional><Input value={form.department} onChange={e => set({ department: e.target.value })} /></Field>
          </div>
        </section>

        <section aria-labelledby="as-pat" className="flex flex-col gap-3">
          <h3 id="as-pat" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Shift pattern</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Shift type" required><Select aria-label="Shift type" value={form.shift_type} onValueChange={changeType} options={TYPE_OPTIONS} /></Field>
            <Field label="Cycle start date" required error={err(bad.start, 'Enter the first day of the cycle.')}><Input type="date" value={form.cycle_start_date} onChange={e => set({ cycle_start_date: e.target.value })} /></Field>
            {!isStandby && (
              <>
                <Field label="On days" description={isCustom ? undefined : 'Set by the shift type.'} error={err(bad.cycle, 'A custom cycle needs at least one on day.')}><Input type="number" min={0} max={365} readOnly={!isCustom} value={form.on_days} onChange={e => set({ on_days: e.target.value })} /></Field>
                <Field label="Off days" description={isCustom ? undefined : 'Set by the shift type.'}><Input type="number" min={0} max={365} readOnly={!isCustom} value={form.off_days} onChange={e => set({ off_days: e.target.value })} /></Field>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="as-tim" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
            <h3 id="as-tim" className="font-display text-section font-semibold text-ink">Shift timing</h3>
            <Button type="button" size="sm" icon="plus" onClick={() => set({ shift_timing_periods: [...form.shift_timing_periods, { from: form.cycle_start_date, to: form.cycle_start_date, label: form.shift_label || '', start_time: '', end_time: '' }] })}>Add timing block</Button>
          </div>
          <div role="group" aria-label="Default timing" className="flex flex-col gap-2">
            <p className="font-sans text-label font-medium text-ink">Default timing <span className="font-normal text-ink-muted">(days without a timing block)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {TIMING_KEYS.map(k => { const on = form.shift_label === k; return <Button key={k} type="button" size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => set({ shift_label: on ? '' : k, shift_hours: on ? '' : TIMING_PRESETS[k].hours })}>{TIMING_PRESETS[k].abbr} {TIMING_PRESETS[k].label.replace(' shift', '')} <span className="opacity-75">{TIMING_PRESETS[k].hours}</span></Button>; })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time" optional><Input type="time" value={defStart} onChange={e => set({ shift_hours: `${e.target.value}–${defEnd}`, shift_label: form.shift_label || 'custom' })} /></Field>
              <Field label="End time" optional><Input type="time" value={defEnd} onChange={e => set({ shift_hours: `${defStart}–${e.target.value}`, shift_label: form.shift_label || 'custom' })} /></Field>
            </div>
          </div>
          {form.shift_timing_periods.map((b, i) => (
            <fieldset key={i} className="flex flex-col gap-3 rounded-control bg-surface-subtle p-3">
              <legend className="px-1 font-sans text-label font-semibold text-ink">Timing block {i + 1}</legend>
              <div className="flex flex-wrap items-center gap-1.5">
                {TIMING_KEYS.map(k => { const on = b.label === k; const [s, e] = TIMING_PRESETS[k].hours.split('–'); return <Button key={k} type="button" size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => block(i, { label: on ? '' : k, start_time: on ? b.start_time : s || '', end_time: on ? b.end_time : e || '' })}>{TIMING_PRESETS[k].abbr}</Button>; })}
                <IconButton className="ml-auto" icon="close" variant="danger" size="sm" label={`Remove timing block ${i + 1}`} onClick={() => set({ shift_timing_periods: form.shift_timing_periods.filter((_, n) => n !== i) })} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="From" error={err(bad.blocks[i], 'Dates are needed, and the end cannot be before the start.')}><Input type="date" value={b.from || ''} onChange={e => block(i, { from: e.target.value })} /></Field>
                <Field label="To"><Input type="date" value={b.to || ''} onChange={e => block(i, { to: e.target.value })} /></Field>
                <Field label="Start time"><Input type="time" value={b.start_time || ''} onChange={e => block(i, { start_time: e.target.value })} /></Field>
                <Field label="End time"><Input type="time" value={b.end_time || ''} onChange={e => block(i, { end_time: e.target.value })} /></Field>
              </div>
            </fieldset>
          ))}
        </section>

        {!isStandby && (
          <section aria-labelledby="as-sby" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
              <h3 id="as-sby" className="font-display text-section font-semibold text-ink">Standby periods</h3>
              <Button type="button" size="sm" icon="plus" onClick={() => set({ standby_periods: [...form.standby_periods, { from: form.cycle_start_date, to: form.cycle_start_date }] })}>Add period</Button>
            </div>
            {form.standby_periods.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">None. Add a period for the dates this person is also on call.</p> : form.standby_periods.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <Field label={`Standby ${i + 1} from`} error={err(bad.standby[i], 'Dates are needed, and the end cannot be before the start.')}><Input type="date" value={p.from} onChange={e => stand(i, { from: e.target.value })} /></Field>
                  <Field label={`Standby ${i + 1} to`}><Input type="date" value={p.to} onChange={e => stand(i, { to: e.target.value })} /></Field>
                </div>
                <IconButton className="mt-7" icon="close" variant="danger" size="sm" label={`Remove standby period ${i + 1}`} onClick={() => set({ standby_periods: form.standby_periods.filter((_, n) => n !== i) })} />
              </div>
            ))}
          </section>
        )}
        <Field label="Notes" optional><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
      </div>
    </FormDialog>
  );
}
