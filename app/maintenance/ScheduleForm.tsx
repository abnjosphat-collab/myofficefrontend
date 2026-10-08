// app/maintenance/ScheduleForm.tsx — a recurring maintenance schedule: which machines, what to do, who does it, how often (daily
// through yearly, or specific dates), when the next one is due and how many days early the work order is raised. The server raises
// the work orders on that rule. A refused save is shown inside the dialog and keeps what was typed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, FormDialog, Icon, Input, Segmented, Select, Textarea, cn } from '@/components/ui-system';
import { PersonField } from './PersonField';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import { createSchedule, updateSchedule } from './api';
import { DOW, MON, scheduleBody, scheduleProblems, type ScheduleDraft } from './helpers';
import { MachinePicker } from './MachinePicker';
import { PRIORITY, RECURRENCES } from './meta';
import type { MaintenanceSchedule, RecurrenceType, WorkOrderPriority } from './types';

const saved = (key: string) => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
const blank = (): ScheduleDraft => ({
  name: '', equipment_info: '', to_department: '', allocated_to: saved('maint_artisan_name'), authorising_foreman: saved('maint_foreman_name'), estimated_hours: '2', job_request_details: '', job_instructions: '',
  priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [0, 3, 6, 9], specific_dates: [], advance_days: 1, start_date: todayLocal(),
});
const fromSchedule = (s: MaintenanceSchedule): ScheduleDraft => ({
  name: s.name, equipment_info: s.equipment_info, to_department: s.to_department, allocated_to: s.allocated_to, authorising_foreman: s.authorising_foreman, estimated_hours: s.estimated_hours,
  job_request_details: s.job_request_details, job_instructions: s.job_instructions, priority: s.priority, recurrence_type: s.recurrence_type, recurrence_dow: s.recurrence_dow, recurrence_dom: s.recurrence_dom,
  recurrence_months: s.recurrence_months ?? [], specific_dates: s.specific_dates ?? [], advance_days: s.advance_days ?? 1, start_date: s.next_due_date || todayLocal(),
});
const PRIORITIES = (Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }));
const WEEKDAYS = DOW.map((d, i) => ({ value: String(i), label: d.slice(0, 3) }));

export function ScheduleForm({ open, schedule, onOpenChange, onSaved }: { open: boolean; schedule: MaintenanceSchedule | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [d, setD] = useState<ScheduleDraft>(blank);
  const [newDate, setNewDate] = useState('');
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(schedule?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setNewDate(''); setD(schedule ? fromSchedule(schedule) : blank()); } }
  const editing = !!schedule;
  const set = (patch: Partial<ScheduleDraft>) => setD(prev => ({ ...prev, ...patch }));
  const problems = scheduleProblems(d);
  const err = (m?: string) => (touched ? m : undefined);
  const toggleMonth = (m: number) => set({ recurrence_months: d.recurrence_months.includes(m) ? d.recurrence_months.filter(x => x !== m) : [...d.recurrence_months, m].sort((a, b) => a - b) });
  const addDate = () => { if (newDate && !d.specific_dates.includes(newDate)) set({ specific_dates: [...d.specific_dates, newDate].sort() }); setNewDate(''); };

  const submit = async () => {
    setTouched(true);
    if (Object.keys(problems).length > 0) return false;
    if (editing && schedule) { await updateSchedule(schedule.id, scheduleBody(d)); toast.success('Schedule updated.'); }
    else { await createSchedule(scheduleBody(d)); toast.success('Schedule created.'); }
    onSaved();
  };
  const kind = d.recurrence_type;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? 'Edit schedule' : 'New schedule'} description="Work orders are raised from it automatically." submitLabel={editing ? 'Save changes' : 'Create schedule'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <Field label="Schedule name" required error={err(problems.name)}><Input value={d.name} onChange={e => set({ name: e.target.value })} placeholder="Weekly compressor check" /></Field>
        <MachinePicker value={d.equipment_info} onChange={v => set({ equipment_info: v })} error={err(problems.machines)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department" optional><Input value={d.to_department} onChange={e => set({ to_department: e.target.value })} placeholder="Engineering" /></Field>
          <Field label="Priority"><Select aria-label="Priority" value={d.priority} onValueChange={v => set({ priority: v as WorkOrderPriority })} options={PRIORITIES} /></Field>
          <Field label="Allocated to" optional><PersonField value={d.allocated_to} onChange={v => set({ allocated_to: v })} /></Field>
          <Field label="Authorising foreman" optional><PersonField value={d.authorising_foreman} onChange={v => set({ authorising_foreman: v })} /></Field>
          <Field label="Estimated hours"><Input type="number" min={0.5} step={0.5} value={d.estimated_hours} onChange={e => set({ estimated_hours: e.target.value })} /></Field>
        </div>

        <section aria-labelledby="sf-rec" className="flex flex-col gap-3 rounded-card border border-line p-4">
          <h3 id="sf-rec" className="flex items-center gap-2 font-sans text-label font-semibold text-ink"><Icon name="clock" size="sm" />How often</h3>
          <Segmented label="How often" value={kind} onValueChange={v => set({ recurrence_type: v as RecurrenceType })} options={RECURRENCES} />
          {(kind === 'weekly' || kind === 'biweekly') && <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Day of the week</span><Segmented label="Day of the week" value={String(d.recurrence_dow)} onValueChange={v => set({ recurrence_dow: Number(v) })} options={WEEKDAYS} /></div>}
          {(kind === 'monthly' || kind === 'quarterly' || kind === 'yearly') && <Field label="Day of the month" description="1 to 28, so every month has it." className="max-w-xs"><Input type="number" min={1} max={28} value={d.recurrence_dom} onChange={e => set({ recurrence_dom: Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)) })} /></Field>}
          {kind === 'quarterly' && (
            <Field label="Which months" error={err(problems.recurrence)}>
              <div role="group" aria-label="Which months" className="flex flex-wrap gap-1.5">{MON.map((m, i) => <Button key={m} size="sm" variant={d.recurrence_months.includes(i) ? 'primary' : 'secondary'} aria-pressed={d.recurrence_months.includes(i)} onClick={() => toggleMonth(i)}>{m}</Button>)}</div>
            </Field>
          )}
          {kind === 'yearly' && <Field label="Month of the year" className="max-w-xs"><Select aria-label="Month of the year" value={String(d.recurrence_months[0] ?? 0)} onValueChange={v => set({ recurrence_months: [Number(v)] })} options={MON.map((m, i) => ({ value: String(i), label: m }))} /></Field>}
          {kind === 'custom' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2"><Field label="Add a date" error={err(problems.recurrence)} className="flex-1"><Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></Field><Button icon="plus" disabled={!newDate} onClick={addDate}>Add</Button></div>
              {d.specific_dates.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Dates">
                  {d.specific_dates.map(x => <li key={x} className={cn('inline-flex items-center gap-1.5 rounded-control border border-line-subtle bg-surface-subtle py-0.5 pl-2 pr-1 font-sans text-caption text-ink tabular')}>{fmtDate(x)}<button type="button" aria-label={`Remove ${fmtDate(x)}`} onClick={() => set({ specific_dates: d.specific_dates.filter(y => y !== x) })} className="focus-ring inline-flex size-5 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted hover:text-ink"><Icon name="close" size="xs" /></button></li>)}
                </ul>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={editing ? 'Next due date' : 'First due date'}><Input type="date" value={d.start_date} onChange={e => set({ start_date: e.target.value })} /></Field>
            <Field label="Raise the work order days early" description="0 to 14."><Input type="number" min={0} max={14} value={d.advance_days} onChange={e => set({ advance_days: Math.min(14, Math.max(0, parseInt(e.target.value, 10) || 0)) })} /></Field>
          </div>
        </section>

        <Field label="Job request: what to do" required error={err(problems.job)}><Textarea rows={3} value={d.job_request_details} onChange={e => set({ job_request_details: e.target.value })} placeholder="Describe exactly what the artisan has to do" /></Field>
        <Field label="Special instructions" optional><Textarea rows={2} value={d.job_instructions} onChange={e => set({ job_instructions: e.target.value })} placeholder="Safety notes, tools, access" /></Field>
      </div>
    </FormDialog>
  );
}
