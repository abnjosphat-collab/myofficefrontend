// app/maintenance/ForemanSignoff.tsx — the foreman's close-out of a job: the final status and confirmed progress, comments, and the
// foreman's sign-off. Starts from the work order as it is NOW, so it never writes back a status the artisan has since changed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, Input, Notice } from '@/components/ui-system';
import { PersonField } from './PersonField';
import { rememberChoice } from '@/components/shared/RecentChoices';
import { todayLocal } from '@/lib/dates';
import { conflictOf, signOffWorkOrder, updateWorkOrder } from './api';
import { ConflictNotice } from './ConflictNotice';
import { statusMeta } from './meta';
import { PhraseField } from './PhraseField';
import { SignOffField } from './SignOffField';
import type { WorkOrder } from './types';

const SAVED_NAME = 'maint_foreman_name';
const savedName = () => { try { return localStorage.getItem(SAVED_NAME) || ''; } catch { return ''; } };

export function ForemanSignoff({ order, onSaved }: { order: WorkOrder; onSaved: (updated: WorkOrder) => void }) {
  const [f, setF] = useState(() => ({ progress: order.progress ?? 0, notes: order.notes || '', foreman_name: order.foreman_name || savedName(), foreman_sign: order.foreman_sign || '', foreman_date: order.foreman_date || todayLocal() }));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<WorkOrder | null>(null);
  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));

  const save = async (version = order.version) => {
    setPending(true); setError(null); setConflict(null);
    try {
      // A new drawn signature on a completed job goes through the sign-off endpoint, which records who signed and when (a manager signs off).
      // Everything else is an ordinary edit. The status is never sent from here: the buttons on the work order move it.
      const signing = order.status === 'completed' && f.foreman_sign.startsWith('data:image') && f.foreman_sign !== order.foreman_sign;
      const { foreman_sign, ...rest } = f;
      let updated = await updateWorkOrder(order.id, signing ? rest : f, version);
      if (signing) {
        try { updated = await signOffWorkOrder(order.id, { foreman_sign, version: updated.version }); }
        catch (e) {
          // The edit is saved and the form restarts from it, so say so in a toast that survives that restart.
          toast.warning(`The comments were saved, but the signature was not recorded: ${e instanceof Error ? e.message : 'try again.'}`);
          onSaved(updated);
          return;
        }
      }
      try { if (f.foreman_name) localStorage.setItem(SAVED_NAME, f.foreman_name); } catch { /* a convenience */ }
      if (f.notes.trim()) rememberChoice('maint_foreman_notes', f.notes);
      toast.success('Foreman sign-off saved.');
      onSaved(updated);
    } catch (e) {
      const theirs = conflictOf(e);
      if (theirs) setConflict(theirs); else setError(e instanceof Error ? e.message : 'The sign-off was not saved.');
    } finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Status" description="Move the job with the buttons at the top of this window."><p className="flex h-9 items-center font-sans text-body font-semibold text-ink">{statusMeta(order.status).label}</p></Field>
        <Field label={`Confirmed progress, ${f.progress}%`}><Input type="range" min={0} max={100} step={5} value={f.progress} onChange={e => set({ progress: parseInt(e.target.value, 10) || 0 })} /></Field>
      </div>
      <PhraseField label="Foreman comments" value={f.notes} onChange={v => set({ notes: v })} placeholder="Comments on the work done, observations, follow-up needed" historyKey="maint_foreman_notes" />
      <section aria-labelledby="fs-sign" className="flex flex-col gap-3 rounded-card border border-line p-4">
        <h3 id="fs-sign" className="font-sans text-label font-semibold text-ink">Foreman sign-off</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Foreman name"><PersonField value={f.foreman_name} onChange={v => set({ foreman_name: v })} /></Field>
          <Field label="Signature"><SignOffField label="Foreman signature" signerName={f.foreman_name} value={f.foreman_sign} onChange={v => set({ foreman_sign: v })} /></Field>
          <Field label="Date"><Input type="date" value={f.foreman_date} onChange={e => set({ foreman_date: e.target.value })} /></Field>
        </div>
      </section>
      {conflict && <ConflictNotice current={conflict} pending={pending} onKeepMine={() => void save(conflict.version)} onUseTheirs={() => onSaved(conflict)} />}
      {error && <Notice tone="danger" title="The sign-off was not saved">{error}</Notice>}
      <div className="sticky bottom-0 z-10 flex justify-end border-t border-line-subtle bg-surface py-3"><Button variant="primary" icon="check" pending={pending} onClick={() => void save()}>Save foreman sign-off</Button></div>
    </div>
  );
}
