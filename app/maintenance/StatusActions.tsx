// app/maintenance/StatusActions.tsx — the buttons that move a work order along its life: Start work, Put on hold, Resume, Complete, Reopen.
// The server decides which moves exist for this person and what each needs (a reason, the artisan's signature, permit references), so
// this keeps no copy of the rules: it asks, and shows only what it is told. A move that is refused says why and changes nothing.
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, FormDialog, Notice, Textarea } from '@/components/ui-system';
import { conflictOf, getWorkOrderMoves, transitionWorkOrder } from './api';
import { PERMIT_NAMES, permitsMissingReference } from './helpers';
import { SignOffField } from './SignOffField';
import type { WorkOrder, WorkOrderMove } from './types';

const LABEL: Record<string, (from: string) => { label: string; icon: 'active' | 'pending' | 'check' | 'refresh'; primary?: boolean }> = {
  'in-progress': from => (from === 'pending' ? { label: 'Start work', icon: 'active', primary: true } : from === 'on-hold' ? { label: 'Resume work', icon: 'active', primary: true } : { label: 'Reopen', icon: 'refresh' }),
  'on-hold': () => ({ label: 'Put on hold', icon: 'pending' }),
  completed: () => ({ label: 'Complete job', icon: 'check', primary: true }),
};

export function StatusActions({ order, onSaved }: { order: WorkOrder; onSaved: (updated: WorkOrder) => void }) {
  const [moves, setMoves] = useState<WorkOrderMove[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<WorkOrderMove | null>(null);
  const [reason, setReason] = useState('');
  const [sign, setSign] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setMoves(null); setLoadError(null);
    getWorkOrderMoves(order.id).then(m => { if (live) setMoves(m); }).catch(e => { if (live) setLoadError(e instanceof Error ? e.message : 'Not loaded.'); });
    return () => { live = false; };
  }, [order.id, order.status, order.updated_at]);

  const missing = permitsMissingReference(order.permits);
  const run = async (move: WorkOrderMove, extra: { reason?: string; artisan_sign?: string } = {}) => {
    try {
      const updated = await transitionWorkOrder(order.id, { to: move.to, version: order.version, ...extra });
      toast.success(`${LABEL[move.to]?.(order.status).label ?? 'Moved'}: done.`);
      onSaved(updated);
    } catch (e) {
      if (conflictOf(e)) throw new Error('Someone else changed this work order first. Close it and open it again to see their change.');
      throw e;
    }
  };
  const click = async (move: WorkOrderMove) => {
    setError(null);
    if (move.needs_reason || move.needs_signature) { setReason(''); setSign(''); setDialog(move); return; }
    setBusy(move.to);
    try { await run(move); } catch (e) { setError(e instanceof Error ? e.message : 'The move was not saved.'); } finally { setBusy(null); }
  };

  if (loadError) return <p className="font-sans text-caption text-ink-muted">The status buttons could not be loaded ({loadError}). The work order itself is unchanged.</p>;
  if (!moves || moves.length === 0) return null;
  const meta = (m: WorkOrderMove) => LABEL[m.to]?.(order.status) ?? { label: m.to, icon: 'check' as const };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Move this work order">
        {moves.map(m => {
          const info = meta(m);
          const blocked = m.checks_permits && missing.length > 0;
          return <Button key={m.to} variant={info.primary ? 'primary' : 'secondary'} icon={info.icon} pending={busy === m.to} disabled={blocked} onClick={() => void click(m)}>{info.label}</Button>;
        })}
      </div>
      {moves.some(m => m.checks_permits) && missing.length > 0 && <p role="status" className="font-sans text-caption text-warning">Add the reference for {missing.map(k => order.permits?.[k]?.label || PERMIT_NAMES[k]).join(', ')} before the job can start (Edit request, Permits).</p>}
      {error && <Notice tone="danger" title="The move was not saved">{error}</Notice>}
      {dialog && (
        <FormDialog
          open onOpenChange={o => { if (!o) setDialog(null); }} size="md" title={meta(dialog).label} description={dialog.needs_signature ? 'The artisan signs to say the job is complete.' : undefined}
          submitLabel={meta(dialog).label}
          onSubmit={async () => {
            if (dialog.needs_reason && !reason.trim()) throw new Error('Give a reason.');
            if (dialog.needs_signature && !sign) throw new Error('The artisan must sign to complete the job.');
            await run(dialog, { ...(dialog.needs_reason ? { reason: reason.trim() } : {}), ...(dialog.needs_signature ? { artisan_sign: sign } : {}) });
          }}
        >
          <div className="flex flex-col gap-4">
            {dialog.needs_reason && <Field label="Reason" required><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is the job being moved?" /></Field>}
            {dialog.needs_signature && <Field label="Artisan signature" required><SignOffField label="Artisan signature" signerName={order.artisan_name || order.allocated_to} value={sign} onChange={setSign} /></Field>}
          </div>
        </FormDialog>
      )}
    </div>
  );
}
