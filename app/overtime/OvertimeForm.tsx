// app/overtime/OvertimeForm.tsx — record or edit one overtime request: who, when and for how long (start and end, or just the hours),
// why, which cost centre pays, planned or unplanned, paid or taken as leave, and any spares used. The server needs the employee's
// name, ID and position, so those are required here too. A refused save is shown inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox, Combobox, Field, FormDialog, Input, Notice, Segmented, Select, Textarea } from '@/components/ui-system';
import { RecentChoices, rememberChoice } from '@/components/shared/RecentChoices';
import { ShiftTimeRange } from '@/components/shared/ShiftTimeRange';
import { SparesEditor } from '@/components/shared/SparesEditor';
import { fmtDate } from '@/components/shared/utils';
import { useEmployees } from '@/hooks/useLookups';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { primaryContactPhone } from '@/lib/phone';
import { recordShiftTimeUsage } from '@/lib/shiftTimePresetsPersonal';
import { todayLocal } from '@/lib/dates';
import { zimHolidayName } from '@/lib/zimHolidays';
import { calcHours, overtimeCostCentre, overtimeDefaultsForPublicHoliday } from './calcOvertime';
import { findDuplicate } from './overtimeLogic';
import { PAYOUT_LABELS, PLANNING_LABELS, TYPE_LABELS, statusMeta } from './overtimeMeta';
import { ENGINEERING_COST_CENTRE, SELECTABLE_OT_TYPES, overtimeCostCentreOptions, type OTForm, type OTRecord, type OTType, type PayoutMethod, type PlanningStatus, type SpareUsedEntry } from './types';
import { buildOvertimePayload } from './useOvertimeData';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

export const REASON_HISTORY_KEY = 'overtime_reason';

export function blankForm(): OTForm {
  const base: OTForm = {
    employee_name: '', employee_id: '', position: '', department: '', cost_centre: ENGINEERING_COST_CENTRE, overtime_type: 'regular',
    // New entries get a real choice; "unclassified" survives only on old records.
    planning_status: 'planned', payout_method: 'cash', date: todayLocal(), start_time: '17:00', end_time: '20:00', hours: '', reason: '', contact_number: '', notes: '',
  };
  const holiday = overtimeDefaultsForPublicHoliday(base.date);
  return holiday ? { ...base, ...holiday } : base;
}
const fromRecord = (r: OTRecord): OTForm => ({
  employee_name: r.employee_name, employee_id: r.employee_id, position: r.position, department: r.department || '', cost_centre: overtimeCostCentre(r), overtime_type: r.overtime_type,
  // An old record with no classification stays unclassified: saving an unrelated edit must not stamp a guessed value on it.
  planning_status: r.planning_status ?? null, payout_method: r.payout_method ?? null, date: r.date,
  start_time: r.start_time || '17:00', end_time: r.end_time || '20:00', hours: r.hours != null ? String(r.hours) : '', reason: r.reason || '', contact_number: r.contact_number || '', notes: r.notes || '',
});

const PLANNING = (Object.keys(PLANNING_LABELS) as PlanningStatus[]).map(value => ({ value, label: PLANNING_LABELS[value] }));
const PAYOUT = (Object.keys(PAYOUT_LABELS) as PayoutMethod[]).map(value => ({ value, label: value === 'lieu' ? 'Taken as leave' : PAYOUT_LABELS[value] }));
function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">{label}</span>{children}</div>;
}

export function OvertimeForm({ open, record, records, onOpenChange, onSave }: {
  open: boolean; record: OTRecord | null; records: OTRecord[]; onOpenChange: (open: boolean) => void; onSave: (payload: Record<string, unknown>, id?: number | string) => Promise<void>;
}) {
  const employees = useEmployees();
  const [form, setForm] = useState<OTForm>(blankForm);
  const [useHours, setUseHours] = useState(false);
  const [used, setUsed] = useState<SpareUsedEntry[]>([]);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, record?.id), () => {
    setTouched(false); setForm(record ? fromRecord(record) : blankForm()); setUsed(record?.spares_used || []);
    // A record with a stored hours value and no times was entered the fast way: reopen it that way.
    setUseHours(!!record && !record.start_time && record.hours != null);
  });
  const editing = !!record;
  const set = (patch: Partial<OTForm>) => setForm(f => ({ ...f, ...patch }));
  const hours = useHours ? parseFloat(form.hours) || 0 : calcHours(form.start_time, form.end_time);
  const duplicate = useMemo(() => (useHours ? undefined : findDuplicate(records, form, record?.id)), [records, form, useHours, record]);
  const holiday = form.date ? zimHolidayName(form.date) : null;

  const employeeOptions = useMemo(() => employees.map(e => ({
    value: String(e.id), label: (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim() || String(e.employee_id || 'Employee'),
    description: [e.employee_id, e.designation].filter(Boolean).join(' · '),
  })), [employees]);
  const pickEmployee = (id: string) => {
    const e = employees.find(x => String(x.id) === id);
    if (!e) return;
    set({
      employee_name: (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim(), employee_id: e.employee_id || String(e.id),
      position: normalizeDesignation(e.designation as string) || (e.designation as string) || form.position, department: e.department || form.department,
      contact_number: primaryContactPhone(e.phone as string) || form.contact_number,
    });
  };
  const setDate = (date: string) => setForm(f => ({ ...f, date, ...(overtimeDefaultsForPublicHoliday(date) ?? {}) }));
  const setType = (t: OTType) => setForm(f => ({ ...f, overtime_type: t, ...(t === 'holiday' ? { start_time: '07:00', end_time: '17:00' } : {}) }));
  const missing = { name: !form.employee_name.trim(), id: !form.employee_id.trim(), position: !form.position.trim(), date: !form.date, hours: useHours ? !(parseFloat(form.hours) > 0) : !(hours > 0) };
  const err = (bad: boolean, msg: string) => (touched && bad ? msg : undefined);
  const typeOptions = [...SELECTABLE_OT_TYPES, ...(SELECTABLE_OT_TYPES.includes(form.overtime_type) ? [] : [form.overtime_type])].map(t => ({ value: t, label: TYPE_LABELS[t] ?? String(t) }));

  const submit = async () => {
    setTouched(true);
    if (Object.values(missing).some(Boolean)) return false;
    if (!useHours) recordShiftTimeUsage(form.start_time, form.end_time);
    await onSave({ ...buildOvertimePayload(form, useHours, editing), spares_used: used }, record?.id);
    if (form.reason.trim()) rememberChoice(REASON_HISTORY_KEY, form.reason);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? 'Edit overtime request' : 'New overtime request'} description={editing ? `${record.employee_name}, ${fmtDate(record.date)}` : 'Employee, date and time are required.'} submitLabel={editing ? 'Save changes' : 'Submit request'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pick an employee" optional description="Fills the name, ID, position and phone." className="sm:col-span-2">
            <Combobox aria-label="Pick an employee" disabled={editing} value="" onValueChange={pickEmployee} options={employeeOptions} placeholder="Search the employee list" />
          </Field>
          <Field label="Employee name" required error={err(missing.name, 'Enter the employee name.')}><Input value={form.employee_name} disabled={editing} onChange={e => set({ employee_name: e.target.value })} autoComplete="off" /></Field>
          <Field label="Employee ID" required error={err(missing.id, 'Enter the employee ID.')}><Input value={form.employee_id} disabled={editing} onChange={e => set({ employee_id: e.target.value })} placeholder="C1165" autoComplete="off" /></Field>
          <Field label="Position" required error={err(missing.position, 'Enter the position.')}><Input value={form.position} onChange={e => set({ position: e.target.value })} placeholder="Job title" /></Field>
          <Field label="Contact number" optional><Input value={form.contact_number} onChange={e => set({ contact_number: e.target.value })} placeholder="+263 77 000 0000" /></Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required error={err(missing.date, 'Choose the date.')} description={holiday ? `Public holiday: ${holiday}. The type, reason and times are set for a holiday; change them if needed.` : undefined}><Input type="date" value={form.date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Overtime type" required><Select aria-label="Overtime type" value={form.overtime_type} onValueChange={v => setType(v as OTType)} options={typeOptions} /></Field>
          <Field label="Cost centre" required description="Which department pays. It does not change the employee's home department."><Select aria-label="Cost centre" value={form.cost_centre} onValueChange={v => set({ cost_centre: v })} options={overtimeCostCentreOptions(form.cost_centre).map(c => ({ value: c, label: c }))} /></Field>
          <Choice label="Planned or unplanned"><Segmented label="Planned or unplanned" value={form.planning_status ?? ('' as PlanningStatus)} onValueChange={v => set({ planning_status: v })} options={PLANNING} /></Choice>
          <Choice label="Payout"><Segmented label="Payout" value={form.payout_method ?? ('' as PayoutMethod)} onValueChange={v => set({ payout_method: v })} options={PAYOUT} /></Choice>
        </div>

        <div className="flex flex-col gap-3">
          <Checkbox label="Just enter the hours" description="For when exact start and end times are not known." checked={useHours} onChange={e => setUseHours(e.target.checked)} />
          {useHours ? (
            <Field label="Hours" required error={err(missing.hours, 'Enter the hours worked, more than 0 and up to 24.')} className="max-w-xs"><Input type="number" min={0.5} max={24} step={0.5} value={form.hours} onChange={e => set({ hours: e.target.value })} placeholder="3.5" /></Field>
          ) : (
            <ShiftTimeRange start={form.start_time} end={form.end_time} onChange={(start_time, end_time) => set({ start_time, end_time })} endError={err(missing.hours, 'The start and end times give no duration.')}
              trailing={<Field label="Duration"><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular" aria-live="polite">{hours > 0 ? `${hours.toFixed(1)} hours` : 'Not set'}</p></Field>} />
          )}
          {duplicate && (
            <Notice tone="warning" title="This person already has a request for this slot">
              {duplicate.employee_name}, {fmtDate(duplicate.date)}, {duplicate.start_time} to {duplicate.end_time}, {statusMeta(duplicate.status).label.toLowerCase()}. You can still submit it: stacked overtime is allowed.
            </Notice>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Field label="Reason" optional><Textarea rows={3} value={form.reason} onChange={e => set({ reason: e.target.value })} placeholder="What the overtime was for" /></Field>
          <RecentChoices historyKey={REASON_HISTORY_KEY} onPick={v => set({ reason: v })} />
        </div>
        <Field label="Notes" optional><Input value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Anything else worth recording" /></Field>

        <SparesEditor value={used} onChange={setUsed} />
        {editing && record.status !== 'pending' && <Notice tone="info" title={`This request is ${statusMeta(record.status).label.toLowerCase()}`}>Changing an approved, paid or rejected request needs a manager. If you are not one, the save will be refused and say so.</Notice>}
      </div>
    </FormDialog>
  );
}

