// app/maintenance/ScheduleFlowForm.tsx — a schedule with many machines (each picked from the equipment register, free text allowed), the
// work order template (what to do, who, how urgent), how often, how many days before due to raise it, and when to skip. A preview lists
// the next occurrences per machine as the server's own date function would raise them, flags a skipped one and a planned person on leave,
// and writes nothing. If the preview cannot load, saving is still possible and the form says so.
'use client';

import { useEffect, useState } from 'react';
import { Button, DataTable, Field, FormDialog, Icon, Input, Notice, Segmented, SkeletonRows, Textarea, type Column } from '@/components/ui-system';
import { RegisterField, emptyRef, type RegisterLoad, type RegisterOption, type RegisterRef } from '@/components/shared/RegisterField';
import { fmtDate } from '@/components/shared/utils';
import { personOption } from './AssignmentPicker';
import { PRIORITY } from './meta';
import type { WorkOrderPriority } from './types';
import type { Person, ProjectionRow } from './workflowTypes';

export interface ScheduleDraft { name: string; assets: string[]; description: string; priority: WorkOrderPriority; person: RegisterRef; kind: 'weekly' | 'biweekly' | 'monthly'; leadDays: number; suppressDays: number }
type Preview = { state: 'idle' } | { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; rows: ProjectionRow[] };

export function ScheduleFlowForm({ open, onOpenChange, machines, machinesLoad = 'ready', peopleOn, project, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; machines: RegisterOption[]; machinesLoad?: RegisterLoad; peopleOn: (day: string) => Person[];
  /** The preview source (the real one calls POST /schedules/projection). Reject to show the preview's failure state. */
  project: (draft: ScheduleDraft) => Promise<ProjectionRow[]>; onSave: (draft: ScheduleDraft) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [assets, setAssets] = useState<string[]>([]); const [pick, setPick] = useState<RegisterRef>(emptyRef);
  const [description, setDescription] = useState(''); const [priority, setPriority] = useState<WorkOrderPriority>('medium'); const [person, setPerson] = useState<RegisterRef>(emptyRef);
  const [kind, setKind] = useState<ScheduleDraft['kind']>('weekly'); const [leadDays, setLeadDays] = useState('2'); const [suppress, setSuppress] = useState('0');
  const [touched, setTouched] = useState(false); const [preview, setPreview] = useState<Preview>({ state: 'idle' });
  const [openedFor, setOpenedFor] = useState(false); const [nonce, setNonce] = useState(0);
  if (open !== openedFor) { setOpenedFor(open); if (open) { setName(''); setAssets([]); setPick(emptyRef); setDescription(''); setPriority('medium'); setPerson(emptyRef); setKind('weekly'); setLeadDays('2'); setSuppress('0'); setTouched(false); setPreview({ state: 'idle' }); } }

  const draft: ScheduleDraft = { name, assets, description, priority, person, kind, leadDays: Number(leadDays) || 0, suppressDays: Number(suppress) || 0 };
  const key = JSON.stringify(draft);
  useEffect(() => {
    if (!open || assets.length === 0) { setPreview({ state: 'idle' }); return undefined; }
    let live = true; setPreview({ state: 'loading' });
    const t = setTimeout(() => { project(JSON.parse(key) as ScheduleDraft).then(rows => { if (live) setPreview({ state: 'ready', rows }); }, e => { if (live) setPreview({ state: 'error', message: e instanceof Error ? e.message : 'Could not load.' }); }); }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [open, key, project, assets.length, nonce]);

  const addAsset = () => { const t = pick.text.trim(); if (t && !assets.some(a => a.toLowerCase() === t.toLowerCase())) setAssets([...assets, t]); setPick(emptyRef); };
  const submit = async () => { setTouched(true); if (!name.trim() || assets.length === 0) return false; await onSave(draft); };
  const peopleOptions = peopleOn(new Date().toISOString().slice(0, 10)).map(personOption);
  const columns: Column<ProjectionRow>[] = [
    { id: 'due', header: 'Due', cell: r => <span className="tabular">{fmtDate(r.due)}</span> }, { id: 'raise', header: 'Raised on', hideBelow: 'md', cell: r => <span className="tabular">{fmtDate(r.raise_on)}</span> },
    { id: 'm', header: 'Machine', cell: r => r.machine },
    { id: 'n', header: 'Note', cell: r => (r.note ? <span className={r.tone === 'warning' ? 'font-medium text-warning' : 'text-ink-muted'}>{r.note}</span> : '') },
  ];

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="xl" title="New schedule" description="Work orders are raised from it automatically, one for each machine." submitLabel="Create schedule" onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <Field label="Schedule name" required error={touched && !name.trim() ? 'Give the schedule a name.' : undefined}><Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly pump check" /></Field>
        <div className="flex flex-col gap-2">
          <Field label="Machines" required error={touched && assets.length === 0 ? 'Add at least one machine.' : undefined} description="Type a few characters and press Tab to fill, then Add. A work order is raised for each machine.">
            <RegisterField noun="machine" value={pick} onChange={setPick} options={machines.filter(m => !assets.some(a => a.toLowerCase() === m.label.toLowerCase()))} load={machinesLoad} />
          </Field>
          <div><Button icon="plus" disabled={!pick.text.trim()} onClick={addAsset}>Add machine</Button></div>
          {assets.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Machines on this schedule">
              {assets.map(a => (
                <li key={a} className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-line-subtle bg-surface-subtle py-0.5 pl-2 pr-1 font-sans text-caption text-ink">
                  <span className="truncate">{a}</span>
                  <button type="button" aria-label={`Remove ${a}`} onClick={() => setAssets(assets.filter(x => x !== a))} className="focus-ring inline-flex size-5 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted"><Icon name="close" size="sm" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Field label="What to do"><Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <Field label="Priority"><Segmented label="Priority" value={priority} onValueChange={v => setPriority(v as WorkOrderPriority)} options={(Object.keys(PRIORITY) as WorkOrderPriority[]).map(value => ({ value, label: PRIORITY[value].label }))} /></Field>
          <Field label="Planned person" optional description="If they are on leave on a due date, the work order is raised unassigned."><RegisterField noun="person" value={person} onChange={setPerson} options={peopleOptions} /></Field>
        </div>
        <section aria-labelledby="sf-how" className="flex flex-col gap-3 rounded-card border border-line p-4">
          <h3 id="sf-how" className="flex items-center gap-2 font-sans text-label font-semibold text-ink"><Icon name="clock" size="sm" />How often</h3>
          <Segmented label="How often" value={kind} onValueChange={v => setKind(v as ScheduleDraft['kind'])} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'monthly', label: 'Monthly' }]} />
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <Field label="Raise the work order days before it is due"><Input type="number" min={0} value={leadDays} onChange={e => setLeadDays(e.target.value)} /></Field>
            <Field label="Skip if done within this many days" description="0 means never skip."><Input type="number" min={0} value={suppress} onChange={e => setSuppress(e.target.value)} /></Field>
          </div>
        </section>
        <section aria-labelledby="sf-prev" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2"><h3 id="sf-prev" className="font-sans text-label font-semibold text-ink">Next occurrences (preview)</h3><Button size="sm" variant="ghost" icon="refresh" onClick={() => setNonce(n => n + 1)}>Refresh</Button></div>
          {preview.state === 'idle' && <p className="font-sans text-body-sm text-ink-muted">Add a machine to see when work orders would be raised.</p>}
          {preview.state === 'loading' && <SkeletonRows rows={3} label="Loading the preview" />}
          {preview.state === 'error' && <Notice tone="warning" icon="warning" title="The preview could not be loaded" action={<Button size="sm" onClick={() => setNonce(n => n + 1)}>Try again</Button>}>You can still save the schedule. {preview.message}</Notice>}
          {preview.state === 'ready' && (preview.rows.length === 0
            ? <p className="font-sans text-body-sm text-ink-muted">No occurrences in the next 12 months.</p>
            : <DataTable caption="Next occurrences" rows={preview.rows} columns={columns} getRowId={r => `${r.due}-${r.machine}`} density="compact" />)}
        </section>
      </div>
    </FormDialog>
  );
}
