// app/overtime/BulkOvertimeForm.tsx — the same overtime for a crew: one date, times, type and reason, and one pending request per
// person. People whose request is saved leave the list, so a retry after a partial failure never duplicates them; the others stay
// with the reason each was refused.
'use client';

import { useMemo, useState } from 'react';
import { Checkbox, Field, FormDialog, Input, Notice, Segmented, Select, Textarea } from '@/components/ui-system';
import { RecentChoices, rememberChoice } from '@/components/shared/RecentChoices';
import { ShiftTimeRange } from '@/components/shared/ShiftTimeRange';
import { useEmployees } from '@/hooks/useLookups';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { primaryContactPhone } from '@/lib/phone';
import { recordShiftTimeUsage } from '@/lib/shiftTimePresetsPersonal';
import { calcHours } from './calcOvertime';
import { EmployeePicks, type PickedPerson } from './EmployeePicks';
import { REASON_HISTORY_KEY, blankForm } from './OvertimeForm';
import { countDuplicates } from './overtimeLogic';
import { PAYOUT_LABELS, PLANNING_LABELS, TYPE_LABELS } from './overtimeMeta';
import { SELECTABLE_OT_TYPES, overtimeCostCentreOptions, type OTForm, type OTRecord, type OTType, type PayoutMethod, type PlanningStatus } from './types';
import { buildOvertimePayload, createOT } from './useOvertimeData';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

type Shared = Omit<OTForm, 'employee_name' | 'employee_id' | 'position' | 'department' | 'contact_number'>;
const sharedOf = (): Shared => {
  const f: Partial<OTForm> = blankForm();
  for (const k of ['employee_name', 'employee_id', 'position', 'department', 'contact_number'] as const) delete f[k];
  return f as Shared;
};
const PLANNING = (Object.keys(PLANNING_LABELS) as PlanningStatus[]).map(value => ({ value, label: PLANNING_LABELS[value] }));
const PAYOUT = (Object.keys(PAYOUT_LABELS) as PayoutMethod[]).map(value => ({ value, label: value === 'lieu' ? 'Taken as leave' : PAYOUT_LABELS[value] }));

export function BulkOvertimeForm({ open, initial, records, onOpenChange, onCreated }: {
  open: boolean; initial: PickedPerson[]; records: OTRecord[]; onOpenChange: (open: boolean) => void; onCreated: () => void;
}) {
  const employees = useEmployees();
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [form, setForm] = useState<Shared>(sharedOf);
  const [useHours, setUseHours] = useState(false);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, undefined), () => { setForm(sharedOf()); setUseHours(false); setTouched(false); setPeople(initial); });
  const set = (patch: Partial<Shared>) => setForm(f => ({ ...f, ...patch }));
  const hours = useHours ? parseFloat(form.hours) || 0 : calcHours(form.start_time, form.end_time);
  const dupes = useMemo(() => (useHours ? 0 : countDuplicates(records, people.map(p => p.employee_id), form.date, form.start_time)), [records, people, form.date, form.start_time, useHours]);
  const metaOf = (p: PickedPerson) => {
    const e = employees.find(x => x.employee_id === p.employee_id);
    return { position: normalizeDesignation(e?.designation as string) || (e?.designation as string) || '', department: (e?.department as string) || '', contact_number: primaryContactPhone(e?.phone as string) || '' };
  };
  const noPosition = people.filter(p => !metaOf(p).position);
  const bad = people.length === 0 || !(hours > 0) || noPosition.length > 0;

  const submit = async () => {
    setTouched(true);
    if (bad) return false;
    if (!useHours) recordShiftTimeUsage(form.start_time, form.end_time);
    const failed: { person: PickedPerson; reason: string }[] = [];
    let ok = 0;
    for (const p of people) {
      try { await createOT(buildOvertimePayload({ ...form, employee_name: p.name, employee_id: p.employee_id, ...metaOf(p) }, useHours)); ok += 1; }
      catch (e) { failed.push({ person: p, reason: e instanceof Error ? e.message : 'Not saved.' }); }
    }
    if (ok) onCreated();
    if (form.reason.trim()) rememberChoice(REASON_HISTORY_KEY, form.reason);
    if (failed.length) {
      setPeople(failed.map(f => f.person));
      throw new Error(`${ok} submitted, ${failed.length} not saved. ${failed.map(f => `${f.person.name}: ${f.reason}`).join(' ')}`);
    }
    return undefined;
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title="Bulk overtime" description="One request per person, all with these details." submitLabel={people.length > 0 ? `Submit ${people.length} ${people.length === 1 ? 'request' : 'requests'}` : 'Submit'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <EmployeePicks label="Employees" value={people} onChange={setPeople} hint={touched && people.length === 0 ? undefined : 'Everyone who worked the same overtime.'} />
        {touched && people.length === 0 && <p role="alert" className="-mt-3 font-sans text-caption text-danger">Add at least one employee.</p>}
        {touched && noPosition.length > 0 && <Notice tone="danger" title="No position on record">The server needs a position for every request. Use New request for {noPosition.map(p => p.name).join(', ')}.</Notice>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Overtime type" required><Select aria-label="Overtime type" value={form.overtime_type} onValueChange={v => set({ overtime_type: v as OTType, ...(v === 'holiday' ? { start_time: '07:00', end_time: '17:00' } : {}) })} options={SELECTABLE_OT_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))} /></Field>
          <Field label="Cost centre" required><Select aria-label="Cost centre" value={form.cost_centre} onValueChange={v => set({ cost_centre: v })} options={overtimeCostCentreOptions(form.cost_centre).map(c => ({ value: c, label: c }))} /></Field>
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Planned or unplanned</span><Segmented label="Planned or unplanned" value={form.planning_status ?? ('' as PlanningStatus)} onValueChange={v => set({ planning_status: v })} options={PLANNING} /></div>
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Payout</span><Segmented label="Payout" value={form.payout_method ?? ('' as PayoutMethod)} onValueChange={v => set({ payout_method: v })} options={PAYOUT} /></div>
        </div>
        <div className="flex flex-col gap-3">
          <Checkbox label="Just enter the hours" description="The same hours for everyone." checked={useHours} onChange={e => setUseHours(e.target.checked)} />
          {useHours
            ? <Field label="Hours" required error={touched && !(hours > 0) ? 'Enter the hours worked, more than 0 and up to 24.' : undefined} className="max-w-xs"><Input type="number" min={0.5} max={24} step={0.5} value={form.hours} onChange={e => set({ hours: e.target.value })} placeholder="3.5" /></Field>
            : <ShiftTimeRange start={form.start_time} end={form.end_time} onChange={(start_time, end_time) => set({ start_time, end_time })} endError={touched && !(hours > 0) ? 'The start and end times give no duration.' : undefined} trailing={<Field label="Duration"><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular">{hours > 0 ? `${hours.toFixed(1)} hours` : 'Not set'}</p></Field>} />}
          {dupes > 0 && <Notice tone="warning" title="Some of these people already have a request for this slot">{dupes} of {people.length} already {dupes === 1 ? 'has' : 'have'} one for this date and start time. They get another row if you submit: stacked overtime is allowed.</Notice>}
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Reason" optional><Textarea rows={2} value={form.reason} onChange={e => set({ reason: e.target.value })} placeholder="The same reason for everyone" /></Field>
          <RecentChoices historyKey={REASON_HISTORY_KEY} onPick={v => set({ reason: v })} />
        </div>
        <Field label="Notes" optional><Input value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
      </div>
    </FormDialog>
  );
}
