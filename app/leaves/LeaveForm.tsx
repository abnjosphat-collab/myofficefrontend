// app/leaves/LeaveForm.tsx — apply for leave or edit a request. The employee comes from the employee list (it fills the
// position, phone, supervisor and department); the days are counted as the dates change; an overlapping request of the
// same person is a warning, not a block. Errors are explained on the field and a refused save keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Combobox, Field, FormDialog, Input, Notice, Select, StatusBadge, Textarea } from '@/components/ui-system';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { calcCalendarLeaveDays, calcLeaveDays } from '@/lib/calcLeaveDays';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { hasContactPhone, primaryContactPhone } from '@/lib/phone';
import { fmtDate } from '@/components/shared/utils';
import { overlappingLeave } from './leaveLogic';
import { LEAVE_TYPES, defaultReasonFor, isDefaultReason } from './leaveTypes';
import type { Leave } from './types';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const COMMON_REASONS = ['Annual leave', 'Sick leave', 'Family emergency', 'Medical appointment', 'Personal reasons', 'Bereavement', 'Study leave', 'Maternity leave', 'Paternity leave', 'Unpaid leave'];
const TYPE_OPTIONS = Object.entries(LEAVE_TYPES).map(([value, t]) => ({ value, label: t.name }));
type Form = Partial<Leave>;
const blank = (): Form => ({ employee_id: '', employee_name: '', position: '', leave_type: 'annual', start_date: '', end_date: '', reason: defaultReasonFor('annual'), contact_number: '', emergency_contact: '', handover_to: '', department: '', manager_name: '', exclude_weekends_holidays: true });
const fromLeave = (l: Leave): Form => ({ employee_id: l.employee_id, employee_name: l.employee_name, position: l.position || '', leave_type: l.leave_type || 'annual', start_date: l.start_date, end_date: l.end_date, reason: l.reason || '', contact_number: l.contact_number || '', emergency_contact: l.emergency_contact || '', handover_to: l.handover_to || '', department: l.department || '', manager_name: l.manager_name || '', exclude_weekends_holidays: l.exclude_weekends_holidays ?? false });
const nameOf = (e: EmployeeLookup) => (e.name as string) || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || `Employee ${e.id}`;

export function LeaveForm({ open, leave, leaves, onOpenChange, onSave }: {
  open: boolean; leave: Leave | null; leaves: Leave[]; onOpenChange: (open: boolean) => void;
  onSave: (id: string | null, data: Form) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form>(blank);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, leave?.id), () => { setTouched(false); setForm(leave ? fromLeave(leave) : blank()); });
  const set = (patch: Form) => setForm(f => ({ ...f, ...patch }));
  const setType = (t: string) => setForm(f => {
    const current = f.reason?.trim() ?? '';
    return { ...f, leave_type: t, reason: !current || isDefaultReason(current) ? defaultReasonFor(t) : f.reason };
  });

  const options = useMemo(() => employees.map(e => ({ value: String(e.id), label: nameOf(e), description: [e.employee_id, e.designation].filter(Boolean).join(' · ') })), [employees]);
  const pick = (id: string) => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return;
    set({
      employee_id: e.employee_id || String(e.id), employee_name: nameOf(e),
      position: normalizeDesignation(e.designation as string) || (e.designation as string) || '',
      contact_number: primaryContactPhone(e.phone as string) || '',
      manager_name: (e.supervisor as string) || (e.manager_name as string) || '', department: e.department || '',
    });
  };

  const exclude = form.exclude_weekends_holidays ?? false;
  const counted = calcLeaveDays(form.start_date, form.end_date, { excludeWeekendsAndHolidays: exclude });
  const calendar = calcCalendarLeaveDays(form.start_date, form.end_date);
  const overlap = useMemo(() => overlappingLeave(leaves, form.employee_id, form.start_date, form.end_date, leave?.id), [leaves, form.employee_id, form.start_date, form.end_date, leave?.id]);
  const bad = {
    employee: !form.employee_name?.trim(), start: !form.start_date, end: !form.end_date,
    order: !!form.start_date && !!form.end_date && form.end_date < form.start_date,
    reason: !form.reason?.trim(), phone: !hasContactPhone(form.contact_number),
  };
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (Object.values(bad).some(Boolean)) return false;
    await onSave(leave?.id ?? null, {
      ...form,
      contact_number: primaryContactPhone(form.contact_number) || form.contact_number?.trim() || '',
      position: normalizeDesignation(form.position) || form.position || '',
    });
    toast.success(leave ? 'Leave request updated.' : 'Leave request submitted.');
  };
  const type = LEAVE_TYPES[form.leave_type || 'annual'];

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={leave ? 'Edit leave request' : 'New leave request'} description="Who is going on leave, when, and how to reach them." submitLabel={leave ? 'Update request' : 'Submit request'} onSubmit={submit} size="lg">
      <div className="flex flex-col gap-4">
        <Field label="Employee" required error={err(bad.employee, 'Choose the employee.')}>
          <Combobox aria-label="Employee" value={options.find(o => o.label === form.employee_name)?.value ?? ''} onValueChange={pick} options={options} disabled={!!leave}
            placeholder={form.employee_name || 'Search by name or employee ID'} searchPlaceholder="Name or employee ID" emptyMessage="No employee matches." />
        </Field>
        {form.employee_name && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-control bg-surface-subtle p-3 sm:grid-cols-4" aria-label="Employee details">
            {[['Employee ID', form.employee_id], ['Position', form.position], ['Department', form.department], ['Supervisor', form.manager_name]].map(([l, v]) => (
              <div key={l}><dt className="font-sans text-caption text-ink-muted">{l}</dt><dd className="font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{v || 'Not recorded'}</dd></div>
            ))}
          </dl>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Leave type" required description={type.description}><Select aria-label="Leave type" value={form.leave_type || 'annual'} onValueChange={setType} options={TYPE_OPTIONS} /></Field>
          <div className="sm:pt-6"><Checkbox label="Count working days only" description="Skips weekends and Zimbabwe public holidays (Friday to Monday counts as 2 days)." checked={exclude} onChange={e => set({ exclude_weekends_holidays: e.target.checked })} /></div>
          <Field label="Start date" required error={err(bad.start, 'Enter the first day of leave.')}><Input type="date" value={form.start_date || ''} onChange={e => set({ start_date: e.target.value })} /></Field>
          <Field label="End date" required description="The last day on leave, not the day back at work." error={err(bad.end, 'Enter the last day of leave.') ?? err(bad.order, 'The end date cannot be before the start date.')}><Input type="date" min={form.start_date} value={form.end_date || ''} onChange={e => set({ end_date: e.target.value })} /></Field>
        </div>

        {counted > 0 && (
          <div className="flex items-center justify-between rounded-control bg-surface-subtle px-4 py-3" aria-live="polite">
            <span className="font-sans text-body-sm text-ink-muted">{exclude ? 'Working leave days' : 'Total leave days'}</span>
            <span className="text-right"><span className="font-display text-metric font-semibold tabular text-ink">{counted}</span> <span className="font-sans text-body-sm text-ink-muted">{counted === 1 ? 'day' : 'days'}</span>{exclude && calendar !== counted && <span className="block font-sans text-caption text-ink-muted">{calendar} calendar days in the range</span>}</span>
          </div>
        )}
        {overlap && (
          <Notice tone="warning" title="This person already has a leave request on these dates">
            {overlap.employee_name}, {fmtDate(overlap.start_date)} to {fmtDate(overlap.end_date)}, {LEAVE_TYPES[overlap.leave_type]?.name ?? overlap.leave_type}. <StatusBadge tone={overlap.status === 'approved' ? 'success' : 'warning'}>{overlap.status}</StatusBadge> You can still submit this one.
          </Notice>
        )}

        <Field label="Contact number during leave" required description="If the employee has several numbers on file only the primary one is used." error={err(bad.phone, 'Enter a contact number.')}>
          <Input inputMode="tel" value={form.contact_number || ''} onChange={e => set({ contact_number: e.target.value })} placeholder="Phone number to reach them" />
        </Field>
        <Field label="Reason for leave" required error={err(bad.reason, 'Enter a reason.')}>
          <Textarea rows={3} value={form.reason || ''} onChange={e => set({ reason: e.target.value })} placeholder="Type a reason or choose one below" />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Common reasons">
          {COMMON_REASONS.map(r => <Button key={r} type="button" size="sm" variant={form.reason === r ? 'primary' : 'secondary'} aria-pressed={form.reason === r} onClick={() => set({ reason: r })}>{r}</Button>)}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Emergency contact" optional><Input value={form.emergency_contact || ''} onChange={e => set({ emergency_contact: e.target.value })} placeholder="Name and phone number" /></Field>
          <Field label="Handover to" optional><Input value={form.handover_to || ''} onChange={e => set({ handover_to: e.target.value })} placeholder="Colleague's name" /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
