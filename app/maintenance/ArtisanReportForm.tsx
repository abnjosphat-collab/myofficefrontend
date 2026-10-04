// app/maintenance/ArtisanReportForm.tsx — the artisan's report on a job: how it is classified, its status and progress, what was done
// and why it failed, the time worked, overtime and delays (the durations are worked out from the times), the spares used, and the
// artisan's sign-off. Saved with one button; a refusal shows its reason here and keeps what was typed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Field, Input, Notice, Segmented, Select } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { rememberChoice } from '@/components/shared/RecentChoices';
import { SparesEditor, type SpareLine } from '@/components/shared/SparesEditor';
import { todayLocal } from '@/lib/dates';
import { updateWorkOrder } from './api';
import { artisanBody, durationText, type ArtisanReport } from './helpers';
import { CLASSIFICATIONS, DISCIPLINES, FAILURE_MODES, MECHANICAL_TRADES, REPORT_STATUSES, statusMeta } from './meta';
import { PhraseField } from './PhraseField';
import { SignOffField } from './SignOffField';
import type { SpareItem, WorkOrder, WorkOrderStatus } from './types';

const SAVED_NAME = 'maint_artisan_name';
const CLASS_OPTIONS = [{ value: '', label: 'Not set' }, ...CLASSIFICATIONS.map(c => ({ value: c.value as string, label: c.label }))];
const DISCIPLINE_OPTIONS = [{ value: '', label: 'Not set' }, ...DISCIPLINES.map(d => ({ value: d as string, label: d }))];
const STATUS_OPTIONS = REPORT_STATUSES.map(s => ({ value: s, label: statusMeta(s).label }));
const savedName = () => { try { return localStorage.getItem(SAVED_NAME) || ''; } catch { return ''; } };
const toLines = (s: SpareItem[]): SpareLine[] => s.map(x => ({ name: x.name, quantity: x.quantity, unit_price: x.unit_cost, total_cost: x.quantity * x.unit_cost }));
const fromLines = (l: SpareLine[]): SpareItem[] => l.map((x, i) => ({ id: `${Date.now()}-${i}`, name: x.name, quantity: x.quantity, unit_cost: x.unit_price ?? 0 }));

function Duration({ label, value }: { label: string; value: string }) {
  return <Field label={label}><p className="flex h-9 items-center font-sans text-body font-semibold text-ink tabular" aria-live="polite">{value || 'Not set'}</p></Field>;
}

export function ArtisanReportForm({ order, onSaved }: { order: WorkOrder; onSaved: (updated: WorkOrder) => void }) {
  const [r, setR] = useState<ArtisanReport>(() => ({
    work_done_details: order.work_done_details || '', cause_of_failure: order.cause_of_failure || '', delay_details: order.delay_details || '',
    time_work_started: order.time_work_started || '', time_work_finished: order.time_work_finished || '', overtime_start_time: order.overtime_start_time || '', overtime_end_time: order.overtime_end_time || '',
    delay_from_time: order.delay_from_time || '', delay_to_time: order.delay_to_time || '', artisan_name: order.artisan_name || order.allocated_to || savedName(), artisan_sign: order.artisan_sign || '',
    artisan_date: order.artisan_date || todayLocal(), status: order.status, progress: order.progress ?? 0, classification: order.classification || '', classification_custom: order.classification_custom || '',
    failure_mode: order.failure_mode || '', discipline: order.discipline || '', trade: order.trade || '',
  }));
  const [spares, setSpares] = useState<SpareItem[]>(order.spares_used || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ArtisanReport>) => setR(prev => ({ ...prev, ...patch }));
  const noOvertime = !r.overtime_start_time && !r.overtime_end_time;
  const noDelay = !r.delay_from_time && !r.delay_to_time;

  const save = async () => {
    setPending(true); setError(null);
    try {
      const updated = await updateWorkOrder(order.id, artisanBody(r, spares));
      try { if (r.artisan_name) localStorage.setItem(SAVED_NAME, r.artisan_name); } catch { /* a convenience */ }
      if (r.work_done_details.trim()) rememberChoice('maint_work_done', r.work_done_details);
      toast.success('Artisan report saved.');
      onSaved(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'The report was not saved.'); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="ar-class" className="flex flex-col gap-3 rounded-card border border-line p-4">
        <h3 id="ar-class" className="font-sans text-label font-semibold text-ink">Classification</h3>
        <Segmented label="Classification" value={r.classification} onValueChange={v => set({ classification: v as ArtisanReport['classification'] })} options={CLASS_OPTIONS} />
        {r.classification === 'custom' && <Field label="Specify the type"><Input value={r.classification_custom} onChange={e => set({ classification_custom: e.target.value })} placeholder="Commissioning, shutdown work" /></Field>}
        {r.classification === 'breakdown' && (
          <Field label="Failure mode" optional><Input list="ar-failure-modes" value={r.failure_mode} onChange={e => set({ failure_mode: e.target.value })} placeholder="Choose or type" /><datalist id="ar-failure-modes">{FAILURE_MODES.map(m => <option key={m} value={m}>{m}</option>)}</datalist></Field>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Discipline</span><Segmented label="Discipline" value={r.discipline} onValueChange={v => set({ discipline: v as ArtisanReport['discipline'], ...(v !== 'Mechanical' ? { trade: '' } : {}) })} options={DISCIPLINE_OPTIONS} /></div>
          {r.discipline === 'Mechanical' && <Field label="Trade" optional><Input list="ar-trades" value={r.trade} onChange={e => set({ trade: e.target.value as ArtisanReport['trade'] })} placeholder="Choose or type" /><datalist id="ar-trades">{MECHANICAL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}</datalist></Field>}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Status"><Select aria-label="Status" value={r.status} onValueChange={v => set({ status: v as WorkOrderStatus })} options={STATUS_OPTIONS} /></Field>
        <Field label={`Progress, ${r.progress}%`}><Input type="range" min={0} max={100} step={5} value={r.progress} onChange={e => set({ progress: parseInt(e.target.value, 10) || 0 })} /></Field>
      </div>

      <PhraseField label="Work done" value={r.work_done_details} onChange={v => set({ work_done_details: v })} placeholder="Describe exactly what was done" historyKey="maint_work_done" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PhraseField label="Cause of failure" value={r.cause_of_failure} onChange={v => set({ cause_of_failure: v })} placeholder="What caused the issue" historyKey="maint_cause" />
        <PhraseField label="Delay details" value={r.delay_details} onChange={v => set({ delay_details: v })} placeholder="Any delays met" historyKey="maint_delay" />
      </div>

      <section aria-labelledby="ar-time" className="flex flex-col gap-4 rounded-card border border-line p-4">
        <h3 id="ar-time" className="font-sans text-label font-semibold text-ink">Time</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Started"><Input type="time" value={r.time_work_started} onChange={e => set({ time_work_started: e.target.value })} /></Field>
          <Field label="Finished"><Input type="time" value={r.time_work_finished} onChange={e => set({ time_work_finished: e.target.value })} /></Field>
          <Duration label="Time worked" value={durationText(r.time_work_started, r.time_work_finished)} />
        </div>
        <div className="flex flex-col gap-3 border-t border-line-subtle pt-3">
          <Checkbox label="No overtime on this job" checked={noOvertime} onChange={e => { if (e.target.checked) set({ overtime_start_time: '', overtime_end_time: '' }); }} disabled={noOvertime} />
          {!noOvertime && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Overtime from"><Input type="time" value={r.overtime_start_time} onChange={e => set({ overtime_start_time: e.target.value })} /></Field>
              <Field label="Overtime to"><Input type="time" value={r.overtime_end_time} onChange={e => set({ overtime_end_time: e.target.value })} /></Field>
              <Duration label="Overtime" value={durationText(r.overtime_start_time, r.overtime_end_time)} />
            </div>
          )}
          {noOvertime && <div><Button size="sm" variant="ghost" icon="plus" onClick={() => set({ overtime_start_time: '17:00' })}>Record overtime</Button></div>}
        </div>
        <div className="flex flex-col gap-3 border-t border-line-subtle pt-3">
          <Checkbox label="No delays on this job" checked={noDelay} onChange={e => { if (e.target.checked) set({ delay_from_time: '', delay_to_time: '' }); }} disabled={noDelay} />
          {!noDelay && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Delay from"><Input type="time" value={r.delay_from_time} onChange={e => set({ delay_from_time: e.target.value })} /></Field>
              <Field label="Delay to"><Input type="time" value={r.delay_to_time} onChange={e => set({ delay_to_time: e.target.value })} /></Field>
              <Duration label="Delay" value={durationText(r.delay_from_time, r.delay_to_time)} />
            </div>
          )}
          {noDelay && <div><Button size="sm" variant="ghost" icon="plus" onClick={() => set({ delay_from_time: '08:00' })}>Record a delay</Button></div>}
        </div>
      </section>

      <SparesEditor value={toLines(spares)} onChange={l => setSpares(fromLines(l))} />

      <section aria-labelledby="ar-sign" className="flex flex-col gap-3 rounded-card border border-line p-4">
        <h3 id="ar-sign" className="font-sans text-label font-semibold text-ink">Artisan sign-off</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Artisan name"><PersonInput value={r.artisan_name} onChange={v => set({ artisan_name: v })} placeholder="Type to search employees" /></Field>
          <Field label="Signature"><SignOffField label="Artisan signature" signerName={r.artisan_name} value={r.artisan_sign} onChange={v => set({ artisan_sign: v })} /></Field>
          <Field label="Date"><Input type="date" value={r.artisan_date} onChange={e => set({ artisan_date: e.target.value })} /></Field>
        </div>
      </section>

      {error && <Notice tone="danger" title="The report was not saved">{error}</Notice>}
      <div className="sticky bottom-0 z-10 flex justify-end border-t border-line-subtle bg-surface py-3"><Button variant="primary" icon="check" pending={pending} onClick={save}>Save artisan report</Button></div>
    </div>
  );
}
