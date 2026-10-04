// app/breakdowns/BreakdownForm.tsx — log or edit a breakdown on one scrolling form, in four labelled parts so nothing hides behind a
// tab: what broke (machine from the register or typed, date, kind, priority, status, place, description), who attended and when
// (downtime worked out as the times are typed), the work done, and the parts used. A refused save stays inside the dialog.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Combobox, Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import { ListInput } from '@/components/shared/ListInput';
import { PersonInput } from '@/components/shared/PersonInput';
import { RecentChoices, rememberChoice } from '@/components/shared/RecentChoices';
import { SparesEditor, type SpareLine } from '@/components/shared/SparesEditor';
import { useEquipment } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import { minutesToDisplay } from './calcBreakdowns';
import { PRIORITIES, STATUSES, TYPES } from './breakdownMeta';
import { emptyForm, formFromRecord, formProblems, previewDowntime } from './breakdownLogic';
import type { Breakdown, BreakdownFormData } from './types';

const OPTIONS = (list: { value: string; label: string }[]) => list.map(m => ({ value: m.value, label: m.label }));
const h2 = 'border-b border-line pb-1.5 font-display text-section font-semibold text-ink';

export function BreakdownForm({ open, record, onOpenChange, onSave }: { open: boolean; record: Breakdown | null; onOpenChange: (open: boolean) => void; onSave: (form: BreakdownFormData, id?: number) => Promise<void> }) {
  const equipment = useEquipment();
  const [f, setF] = useState<BreakdownFormData>(() => emptyForm(todayLocal()));
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(record?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setF(record ? formFromRecord(record, todayLocal()) : emptyForm(todayLocal())); } }
  const editing = !!record;
  const set = (patch: Partial<BreakdownFormData>) => setF(prev => ({ ...prev, ...patch }));
  const problems = formProblems(f);
  const err = (k: keyof typeof problems) => (touched ? problems[k] : undefined);
  const machines = useMemo(() => equipment.slice(0, 500).map(e => ({ value: String(e.id), label: e.name || e.equipment_id || 'Equipment', description: [e.equipment_id, e.department, e.location].filter(Boolean).join(' · ') })), [equipment]);
  const pickMachine = (id: string) => { const e = equipment.find(x => String(x.id) === id); if (e) set({ machine_name: e.name || e.equipment_id || f.machine_name, machine_id: e.equipment_id || f.machine_id, location: f.location || e.location || '' }); };
  const downtime = previewDowntime(f.breakdown_start, f.breakdown_end);
  const repair = previewDowntime(f.work_start, f.work_end);
  const pastMidnight = (!!f.breakdown_start && !!f.breakdown_end && f.breakdown_end < f.breakdown_start) || (!!f.work_start && !!f.work_end && f.work_end < f.work_start);
  const parts: SpareLine[] = f.spares_used;

  const submit = async () => {
    setTouched(true);
    if (Object.keys(problems).length > 0) return false;
    await onSave(f, record?.id);
    rememberChoice('bd_description', f.breakdown_description); if (f.work_done.trim()) rememberChoice('bd_work_done', f.work_done);
    toast.success(editing ? 'Breakdown updated.' : 'Breakdown logged.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? `Edit breakdown, ${record.machine_name}` : 'Log a breakdown'} description={editing ? undefined : 'Which machine, what happened, and who attended.'} submitLabel={editing ? 'Save changes' : 'Log breakdown'} onSubmit={submit}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="bf-what" className="flex flex-col gap-3">
          <h3 id="bf-what" className={h2}>What broke</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Find the machine in the equipment register" optional className="sm:col-span-2"><Combobox aria-label="Find the machine in the equipment register" value="" onValueChange={pickMachine} options={machines} placeholder="Search equipment" /></Field>
            <Field label="Machine name" required error={err('machine_name')}><Input value={f.machine_name} onChange={e => set({ machine_name: e.target.value })} autoComplete="off" /></Field>
            <Field label="Machine ID" required error={err('machine_id')}><Input value={f.machine_id} onChange={e => set({ machine_id: e.target.value })} autoComplete="off" /></Field>
            <Field label="Breakdown date" required error={err('breakdown_date')}><Input type="date" value={f.breakdown_date} onChange={e => set({ breakdown_date: e.target.value })} /></Field>
            <Field label="Location" required error={err('location')}><ListInput listName="location" value={f.location} onChange={v => set({ location: v })} placeholder="6 Level, Southwell" /></Field>
            <Field label="Kind of fault"><Select aria-label="Kind of fault" value={f.breakdown_type} onValueChange={v => set({ breakdown_type: v })} options={OPTIONS(TYPES)} /></Field>
            <Field label="Nature of the breakdown" optional><ListInput listName="breakdown_nature" value={f.breakdown_nature} onChange={v => set({ breakdown_nature: v })} placeholder="Bearing failure" /></Field>
            <Field label="Priority"><Select aria-label="Priority" value={f.priority} onValueChange={v => set({ priority: v })} options={OPTIONS(PRIORITIES)} /></Field>
            <Field label="Status"><Select aria-label="Status" value={f.status} onValueChange={v => set({ status: v })} options={OPTIONS(STATUSES)} /></Field>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Field label="What happened" required error={err('breakdown_description')}><Textarea rows={3} value={f.breakdown_description} onChange={e => set({ breakdown_description: e.target.value })} placeholder="Describe what happened" /></Field>
              <RecentChoices historyKey="bd_description" onPick={v => set({ breakdown_description: v })} />
            </div>
          </div>
        </section>

        <section aria-labelledby="bf-who" className="flex flex-col gap-3">
          <h3 id="bf-who" className={h2}>Who attended, and when</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Artisan" required error={err('artisan_name')}><PersonInput value={f.artisan_name} onChange={v => set({ artisan_name: v })} placeholder="Type to search employees" /></Field>
            <Field label="Department" required error={err('department')}><Input value={f.department} onChange={e => set({ department: e.target.value })} /></Field>
            <Field label="Breakdown started" optional><Input type="time" value={f.breakdown_start} onChange={e => set({ breakdown_start: e.target.value })} /></Field>
            <Field label="Breakdown ended" optional error={err('breakdown_end')}><Input type="time" value={f.breakdown_end} onChange={e => set({ breakdown_end: e.target.value })} /></Field>
            <Field label="Work started" optional><Input type="time" value={f.work_start} onChange={e => set({ work_start: e.target.value })} /></Field>
            <Field label="Work ended" optional error={err('work_end')}><Input type="time" value={f.work_end} onChange={e => set({ work_end: e.target.value })} /></Field>
          </div>
          {(downtime !== null || repair !== null) && (
            <p className="font-sans text-body-sm text-ink-muted" role="status">
              {downtime !== null && <>Downtime <span className="font-semibold tabular text-ink">{minutesToDisplay(downtime)}</span></>}
              {downtime !== null && repair !== null && ', '}
              {repair !== null && <>repair <span className="font-semibold tabular text-ink">{minutesToDisplay(repair)}</span></>}
              {pastMidnight ? '. The end is earlier than the start, so it counts as running past midnight' : ''}.
            </p>
          )}
        </section>

        <section aria-labelledby="bf-work" className="flex flex-col gap-3">
          <h3 id="bf-work" className={h2}>The work</h3>
          <div className="flex flex-col gap-1.5">
            <Field label="Work done" optional><Textarea rows={3} value={f.work_done} onChange={e => set({ work_done: e.target.value })} placeholder="Describe the work performed" /></Field>
            <RecentChoices historyKey="bd_work_done" onPick={v => set({ work_done: v })} />
          </div>
          <Field label="Recommendations" optional><Textarea rows={2} value={f.artisan_recommendations} onChange={e => set({ artisan_recommendations: e.target.value })} placeholder="What should be done to stop it happening again" /></Field>
        </section>

        <SparesEditor value={parts} onChange={lines => set({ spares_used: lines.map(l => ({ name: l.name, part_number: l.part_number, quantity: Math.max(1, Math.round(l.quantity)), unit_price: l.unit_price ?? 0, total_cost: Math.max(1, Math.round(l.quantity)) * (l.unit_price ?? 0) })) })} />
      </div>
    </FormDialog>
  );
}
