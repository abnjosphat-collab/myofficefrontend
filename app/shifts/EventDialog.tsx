// app/shifts/EventDialog.tsx — add, change or remove a schedule event (leave, overtime, a deferred day off, a timing change…)
// for one person starting from one day. Saves the person's whole event list; a refused save is shown inside the dialog
// and keeps what was typed. Removing an event asks first.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, FormDialog, IconButton, Input, Select, useConfirm } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { computeDayStatus, findEvent } from './calcShifts';
import { DAY_STATUS, EVENT_TYPES, TIMING_KEYS, TIMING_PRESETS, eventOf } from './shiftMeta';
import { timingFor } from './cellLogic';
import type { DayStatus, EventForm, EventType, ScheduleEvent, ShiftAssignment } from './types';

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`);
const blank = (date: string): EventForm => ({ id: newId(), from: date, to: date, type: 'annual_leave', status: '', label: '', start_time: '', end_time: '', note: '' });
const fromEvent = (e: ScheduleEvent): EventForm => ({ id: e.id, from: e.from, to: e.to || e.from, type: e.type, status: e.status || '', label: e.label || '', start_time: e.start_time || '', end_time: e.end_time || '', note: e.note || '' });
const TYPE_OPTIONS = (Object.keys(EVENT_TYPES) as EventType[]).map(k => ({ value: k, label: `${EVENT_TYPES[k].abbr}  ${EVENT_TYPES[k].label}` }));
const STATUS_OPTIONS = [{ value: '__cycle__', label: 'Use the cycle default' }, ...(['on', 'off', 'standby', 'on+standby'] as DayStatus[]).map(s => ({ value: s, label: DAY_STATUS[s].label }))];

export function EventDialog({ target, onClose, onSave }: {
  target: { assignment: ShiftAssignment; date: string } | null; onClose: () => void;
  /** Saves the person's complete event list; throws to say why it was refused. */
  onSave: (assignment: ShiftAssignment, events: ScheduleEvent[]) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [form, setForm] = useState<EventForm>(() => blank(''));
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = target ? `${target.assignment.id}:${target.date}` : null;
  if (key !== loadedFor) {
    setLoadedFor(key); setTouched(false);
    if (target) { const existing = findEvent(target.assignment, target.date); setForm(existing ? fromEvent(existing) : blank(target.date)); }
  }
  const a = target?.assignment;
  const events = (a?.day_overrides || []) as ScheduleEvent[];
  const type = eventOf(form.type);
  const editing = events.some(e => e.id === form.id);
  const set = (patch: Partial<EventForm>) => setForm(f => ({ ...f, ...patch }));
  const preset = (k: string) => { const [s, e] = TIMING_PRESETS[k].hours.split('–'); set({ label: k, start_time: s || '', end_time: e || '' }); };
  const bad = { from: !form.from, order: !!form.from && !!form.to && form.to < form.from, times: type.showTiming && (!!form.start_time !== !!form.end_time) };
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  const submit = async () => {
    setTouched(true);
    if (!a || bad.from || bad.order || bad.times) return false;
    const event: ScheduleEvent = {
      id: form.id, from: form.from, to: form.to || form.from, type: form.type,
      ...(form.type === 'custom' && form.status ? { status: form.status as DayStatus } : {}),
      ...(form.label ? { label: form.label } : {}), ...(form.start_time ? { start_time: form.start_time } : {}), ...(form.end_time ? { end_time: form.end_time } : {}), ...(form.note ? { note: form.note } : {}),
    };
    await onSave(a, editing ? events.map(e => (e.id === form.id ? event : e)) : [...events, event]);
    toast.success(editing ? 'Event updated.' : 'Event added.');
  };
  const remove = async (ev: ScheduleEvent) => {
    if (!a) return;
    const t = eventOf(ev.type);
    if (!await confirm({ title: `Remove this ${t.label.toLowerCase()} event?`, message: `${fmtDate(ev.from)}${ev.to && ev.to !== ev.from ? ` to ${fmtDate(ev.to)}` : ''} for ${a.employee_name}.`, confirmLabel: 'Remove', destructive: true })) return;
    try { await onSave(a, events.filter(e => e.id !== ev.id)); toast.success('Event removed.'); setForm(blank(target!.date)); }
    catch (e) { toast.error(`The event was not removed: ${(e as Error).message}`); }
  };

  const cycle = a && target ? DAY_STATUS[computeDayStatus(a, new Date(`${target.date}T12:00:00`))].label : '';
  const cycleHours = a && target ? timingFor(a, target.date)?.hours : '';

  return (
    <FormDialog
      open={!!target} onOpenChange={o => { if (!o) onClose(); }} size="lg"
      title="Schedule event" description={a && target ? `${a.employee_name}, ${fmtDate(target.date)}. The cycle says: ${cycle}${cycleHours ? `, ${cycleHours}` : ''}.` : undefined}
      submitLabel={editing ? 'Update event' : 'Add event'} onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <Field label="Event type" required><Select aria-label="Event type" value={form.type} onValueChange={v => set({ type: v as EventType, status: '', ...(eventOf(v).showTiming ? {} : { label: '', start_time: '', end_time: '' }) })} options={TYPE_OPTIONS} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From" required error={err(bad.from, 'Enter the first day.')}><Input type="date" value={form.from} onChange={e => set({ from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} /></Field>
          <Field label="To" description="Leave it the same as From for one day." error={err(bad.order, 'The last day cannot be before the first.')}><Input type="date" min={form.from} value={form.to} onChange={e => set({ to: e.target.value })} /></Field>
        </div>

        {type.showTiming && (
          <fieldset className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3">
            <legend className="px-1 font-sans text-label font-semibold text-ink">Timing</legend>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Timing presets">
              <Button type="button" size="sm" variant={!form.label ? 'primary' : 'secondary'} aria-pressed={!form.label} onClick={() => set({ label: '', start_time: '', end_time: '' })}>Default</Button>
              {TIMING_KEYS.map(k => <Button key={k} type="button" size="sm" variant={form.label === k ? 'primary' : 'secondary'} aria-pressed={form.label === k} onClick={() => preset(k)}>{TIMING_PRESETS[k].abbr} {TIMING_PRESETS[k].label.replace(' shift', '')}</Button>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time" error={err(bad.times && !form.start_time, 'Enter both times, or neither.')}><Input type="time" value={form.start_time} onChange={e => set({ start_time: e.target.value })} /></Field>
              <Field label="End time" error={err(bad.times && !form.end_time, 'Enter both times, or neither.')}><Input type="time" value={form.end_time} onChange={e => set({ end_time: e.target.value })} /></Field>
            </div>
          </fieldset>
        )}
        {form.type === 'custom' && <Field label="Status override"><Select aria-label="Status override" value={form.status || '__cycle__'} onValueChange={v => set({ status: v === '__cycle__' ? '' : (v as DayStatus) })} options={STATUS_OPTIONS} /></Field>}
        <Field label="Note or reason" optional><Input value={form.note} onChange={e => set({ note: e.target.value })} placeholder="For example family leave, covering for a colleague" /></Field>

        {events.length > 0 && (
          <section aria-labelledby="ev-all" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id="ev-all" className="font-sans text-label font-semibold text-ink">All events for {a?.employee_name.split(' ')[0]} ({events.length})</h3>
              <Button type="button" size="sm" icon="plus" onClick={() => target && setForm(blank(target.date))}>New event</Button>
            </div>
            <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
              {events.map(ev => {
                const t = eventOf(ev.type);
                return (
                  <li key={ev.id} className={`flex items-center gap-2 rounded-control border px-3 py-2 ${ev.id === form.id ? 'border-action bg-action-soft/50' : 'border-line bg-surface-subtle'}`}>
                    <div className="min-w-0 flex-1"><p className="font-sans text-label font-medium text-ink">{t.abbr} {t.label}</p><p className="truncate font-sans text-caption text-ink-muted">{fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` to ${fmtDate(ev.to)}` : ''}{ev.note ? `, ${ev.note}` : ''}</p></div>
                    <IconButton icon="edit" size="sm" label={`Edit the ${t.label.toLowerCase()} event from ${fmtDate(ev.from)}`} onClick={() => setForm(fromEvent(ev))} />
                    <IconButton icon="delete" variant="danger" size="sm" label={`Remove the ${t.label.toLowerCase()} event from ${fmtDate(ev.from)}`} onClick={() => remove(ev)} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </FormDialog>
  );
}
