// app/maintenance/ForemanSignoff.tsx — the foreman's close-out of a job: the final status and confirmed progress, comments, and the
// foreman's sign-off. Starts from the work order as it is NOW, so it never writes back a status the artisan has since changed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { asString, Button, Fact, FactList, Field, Input, Notice, readStored, Select, storeValue } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { fmtDate } from '@/components/shared/utils';
import { rememberChoice } from '@/components/shared/RecentChoices';
import { todayLocal } from '@/lib/dates';
import { updateWorkOrder } from './api';
import { REPORT_STATUSES, statusMeta } from './meta';
import { PhraseField } from './PhraseField';
import { SignOffField } from './SignOffField';
import type { WorkOrder, WorkOrderStatus } from './types';

const STATUS_OPTIONS = REPORT_STATUSES.map(s => ({ value: s, label: statusMeta(s).label }));

function ForemanSignImage({ src }: { src: string }) {
  // A signature is a PNG data URL, so it is shown as it is rather than through the image optimiser.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Foreman signature" className="h-8 max-w-[7.5rem] rounded-xs border border-line bg-white object-contain" />;
}

export function ForemanSignoff({ order, onSaved, canManage }: { order: WorkOrder; onSaved: (updated: WorkOrder) => void; canManage: boolean }) {
  const [f, setF] = useState(() => ({ status: order.status, progress: order.progress ?? 0, notes: order.notes || '', foreman_name: order.foreman_name || readStored('maint_foreman_name', asString, ''), foreman_sign: order.foreman_sign || '', foreman_date: order.foreman_date || todayLocal() }));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));
  const foremanSigned = (order.foreman_sign || '').startsWith('data:image');

  const save = async () => {
    setPending(true); setError(null);
    try {
      // Without a manager account the foreman block below is display-only (the server would refuse it): the save
      // carries the final status, progress and comments only, so those stay editable by whoever did the job.
      const body = canManage
        ? { ...f, expected_updated_at: order.updated_at }
        : { status: f.status, progress: f.progress, notes: f.notes, expected_updated_at: order.updated_at };
      const updated = await updateWorkOrder(order.id, body);
      if (canManage && f.foreman_name.trim()) storeValue('maint_foreman_name', f.foreman_name.trim());
      if (f.notes.trim()) rememberChoice('maint_foreman_notes', f.notes);
      toast.success('Foreman sign-off saved.');
      onSaved(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'The sign-off was not saved.'); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Final status"><Select aria-label="Final status" value={f.status} onValueChange={v => set({ status: v as WorkOrderStatus })} options={STATUS_OPTIONS} /></Field>
        <Field label={`Confirmed progress, ${f.progress}%`}><Input type="range" min={0} max={100} step={5} value={f.progress} onChange={e => set({ progress: parseInt(e.target.value, 10) || 0 })} /></Field>
      </div>
      <PhraseField label="Foreman comments" value={f.notes} onChange={v => set({ notes: v })} placeholder="Comments on the work done, observations, follow-up needed" historyKey="maint_foreman_notes" />
      <section aria-labelledby="fs-sign" className="flex flex-col gap-3 rounded-card border border-line p-4">
        <h3 id="fs-sign" className="font-sans text-label font-semibold text-ink">Foreman sign-off</h3>
        {canManage ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Foreman name"><PersonInput value={f.foreman_name} onChange={v => set({ foreman_name: v })} placeholder="Type to search employees" /></Field>
            <Field label="Signature"><SignOffField label="Foreman signature" signerName={f.foreman_name} value={f.foreman_sign} onChange={v => set({ foreman_sign: v })} /></Field>
            <Field label="Date"><Input type="date" value={f.foreman_date} onChange={e => set({ foreman_date: e.target.value })} /></Field>
          </div>
        ) : (
          <>
            <FactList>
              <Fact label="Foreman name">{order.foreman_name}</Fact>
              <Fact label="Date">{order.foreman_date && fmtDate(order.foreman_date)}</Fact>
              <Fact label="Signature">{foremanSigned ? <ForemanSignImage src={order.foreman_sign} /> : (order.foreman_sign || 'Not signed')}</Fact>
            </FactList>
            <p className="font-sans text-body-sm text-ink-muted">Only a manager account can sign off.</p>
          </>
        )}
      </section>
      {error && <Notice tone="danger" title="The sign-off was not saved">{error}</Notice>}
      <div className="sticky bottom-0 z-10 flex justify-end border-t border-line-subtle bg-surface py-3"><Button variant="primary" icon="check" pending={pending} onClick={save}>Save foreman sign-off</Button></div>
    </div>
  );
}
