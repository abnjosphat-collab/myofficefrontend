// app/timesheets/EntryDialog.tsx — one person's one day: the status, the shift times (the hours, night hours and night allowance follow the
// times), callout overtime, standby and notes. Overtime itself is not typed here: it comes from the Overtime module. Opening a derived
// (unsaved) cell pre-fills this, and saving turns it into a real entry. A refused save stays in the dialog with its reason.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Field, FormDialog, Input, Notice, Select, StatusBadge, useConfirm } from '@/components/ui-system';
import { ShiftTimeRange } from '@/components/shared/ShiftTimeRange';
import { TIMESHEET_BULK_SHIFT_PRESETS } from '@/lib/shiftTimePresets';
import { recordShiftTimeUsage } from '@/lib/shiftTimePresetsPersonal';
import { zimHolidayName } from '@/lib/zimHolidays';
import { DOUBLE_TIME_STATUSES, LEAVE_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
import { entryProblems, entryTotal, initialForm, toEntry, withStatus, withTimes } from './entryForm';
import { STATUS_KEYS, fmtDate, statusMeta } from './timesheetMeta';
import type { Employee, EntryForm, StatusKey, TimesheetEntry } from './types';
import { formatFullDate, formatDayMonth } from '@/lib/format';

const OPTIONS = STATUS_KEYS.map(k => ({ value: k as string, label: statusMeta(k).label }));

export function EntryDialog({ employee, date, entry, onSave, onDelete, onClose }: {
  employee: Employee; date: Date; entry?: TimesheetEntry; onSave: (data: Omit<TimesheetEntry, 'id'>) => Promise<void>; onDelete?: () => Promise<void>; onClose: () => void;
}) {
  const confirm = useConfirm();
  const holiday = zimHolidayName(fmtDate(date));
  const [form, setForm] = useState<EntryForm>(() => initialForm(entry, date, holiday));
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<EntryForm>) => setForm(f => ({ ...f, ...patch }));
  const dt = DOUBLE_TIME_STATUSES.has(form.status);
  const problems = entryProblems(form);
  const timeError = touched && problems.find(p => /times/.test(p));

  const submit = async () => {
    setTouched(true);
    if (problems.length > 0) return false;
    if (!LEAVE_STATUSES.has(form.status) && !ZERO_HOUR_STATUSES.has(form.status) && form.start_time && form.end_time) recordShiftTimeUsage(form.start_time, form.end_time);
    await onSave(toEntry(form, parseInt(employee.id), date));
    toast.success('Entry saved.');
  };
  const remove = async () => {
    if (!onDelete) return;
    if (!await confirm({ title: 'Delete this entry?', message: `${employee.name}, ${formatDayMonth(date, true)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await onDelete(); toast.success('Entry deleted.'); onClose(); }
    catch (e) { toast.error(`The entry was not deleted: ${(e as Error).message}`); }
  };

  return (
    <FormDialog
      open onOpenChange={o => { if (!o) onClose(); }} size="md" title="Timesheet entry" description={`${employee.name}, ${formatFullDate(date)}`} submitLabel="Save entry" onSubmit={submit}
      secondaryAction={onDelete ? <Button variant="danger" icon="delete" onClick={remove}>Delete entry</Button> : undefined}
    >
      <div className="flex flex-col gap-4">
        {holiday && <Notice tone="info" icon="calendar" title={`Zimbabwe public holiday: ${holiday}`}>{form.status === 'holiday_paid' ? 'Not worked, so 8 regular hours are credited. Enter shift times, or choose PPH, if they worked it.' : 'Worked on the holiday: all hours count at 2.0×.'}</Notice>}
        <Field label="Status">
          <Select aria-label="Status" value={form.status} onValueChange={v => setForm(f => withStatus(f, v as StatusKey))} options={OPTIONS} />
        </Field>
        {LEAVE_STATUSES.has(form.status) && <p className="font-sans text-body-sm text-ink-muted">8 hours are credited for {statusMeta(form.status).label}.</p>}
        {dt && <p className="font-sans text-body-sm text-ink-muted">All hours worked count as <strong className="text-ink">2.0× (double time)</strong>. Enter the actual shift times.</p>}
        {ZERO_HOUR_STATUSES.has(form.status) && <p className="font-sans text-body-sm text-ink-muted">0 hours recorded: {statusMeta(form.status).label} days are not credited.</p>}

        {!ZERO_HOUR_STATUSES.has(form.status) && form.status !== 'holiday_paid' && (
          <section aria-label="Shift" className="flex flex-col gap-3 rounded-card border border-line bg-surface-subtle p-4">
            <h3 className="font-sans text-label font-semibold text-ink">{dt ? 'Shift (all hours at double time)' : 'Shift'}</h3>
            <ShiftTimeRange start={form.start_time} end={form.end_time} builtin={TIMESHEET_BULK_SHIFT_PRESETS} onChange={(s, e) => setForm(f => withTimes(f, s, e))} startError={timeError || undefined} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-control bg-surface p-3 text-center"><p className="font-sans text-caption text-ink-muted">{dt ? 'Hours at 2.0×' : 'Regular hours'}</p><p className="font-sans text-title font-semibold tabular text-ink">{form.regular_hours.toFixed(2)}h</p></div>
              <div className="rounded-control bg-surface p-3 text-center"><p className="font-sans text-caption text-ink-muted">Night hours</p><p className="font-sans text-title font-semibold tabular text-ink">{form.nightshift_hours.toFixed(2)}h</p></div>
            </div>
            {form.nightshift_hours > 0 && <p className="font-sans text-caption text-ink-muted">{form.nightshift_hours.toFixed(2)}h between 18:00 and 06:00 count as night allowance. Breakdown or callout work at night goes in Callout hours below, not here.</p>}
          </section>
        )}

        <p className="font-sans text-caption text-ink-muted">Overtime is not entered here. Log it in the Overtime module and it is picked up automatically.</p>
        <div className="flex items-center justify-between rounded-control bg-surface-subtle px-4 py-3"><span className="font-sans text-label font-semibold text-ink">Total hours</span><StatusBadge tone="brand">{entryTotal(form).toFixed(2)}h</StatusBadge></div>

        <section aria-label="Callout overtime" className="flex flex-col gap-2">
          <h3 className="font-sans text-label font-semibold text-ink">Callout overtime</h3>
          <p className="font-sans text-caption text-ink-muted">Hours worked when phoned in after hours or called out off-site.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Callout hours"><Input type="number" min={0} max={24} step={0.5} value={form.callout_overtime_hours} onChange={e => set({ callout_overtime_hours: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Number of callouts"><Input type="number" min={0} step={1} value={form.callout_count} onChange={e => set({ callout_count: parseInt(e.target.value) || 0 })} /></Field>
          </div>
        </section>
        <Checkbox label="Standby allowance" description="Adds a flat 8 hours once for this standby period, whatever its length." checked={form.standby_allowance} onChange={e => set({ standby_allowance: e.target.checked })} />
        <Field label="Notes" optional><Input value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Optional" /></Field>
      </div>
    </FormDialog>
  );
}
