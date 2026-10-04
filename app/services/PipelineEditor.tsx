// app/services/PipelineEditor.tsx — the six approvals a job passes (planning, engineering manager, finance, GM, stores, payment).
// Each stage is saved on its own with an explicit button, so nothing is lost to a timer, and a refused save shows its reason and
// keeps what was typed. Marking a stage complete is a signature (the signer's name is recorded from their account) and a date; reopening
// one asks first. The signature image is kept with the record (read for the open job only) and shown on the completed stage.
'use client';

import { useState } from 'react';
import { Button, Field, Icon, Input, StatusBadge, Textarea, cn, useConfirm } from '@/components/ui-system';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import { STAGES } from './meta';
import { useStageSignatures } from './useServicesData';
import { isStageDone, nextStage, stageProblem, stageToDraft, type StageDraft } from './serviceLogic';
import type { StageKey } from './meta';
import type { ServiceRecord } from './types';

function StageRow({ stage, record, isNext, who, signature, onSave }: {
  stage: (typeof STAGES)[number]; record: ServiceRecord; isNext: boolean; who: string; signature: string | undefined; onSave: (key: StageKey, d: StageDraft, signature?: string) => Promise<void>;
}) {
  const confirm = useConfirm();
  const saved = stageToDraft(record, stage.key);
  const [draft, setDraft] = useState<StageDraft>(saved.done ? saved : { ...saved, by: saved.by || who, date: saved.date || todayLocal() });
  const [open, setOpen] = useState(isNext);
  const [pending, setPending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = saved.done;
  const set = (patch: Partial<StageDraft>) => setDraft(d => ({ ...d, ...patch }));
  const panel = `stage-${stage.key}`;

  const save = async (next: StageDraft) => {
    const problem = stageProblem(next);
    if (problem) { setError(problem); return; }
    setPending(true); setError(null);
    try { await onSave(stage.key, next); }
    catch (e) { setError(e instanceof Error ? e.message : 'The stage was not saved.'); }
    finally { setPending(false); }
  };
  const reopen = async () => {
    if (!await confirm({ title: `Reopen ${stage.label}?`, message: 'The stage goes back to waiting. The name, date and comments stay on record.', confirmLabel: 'Reopen' })) return;
    await save({ ...draft, done: false });
  };
  const summary = [saved.by, saved.date && fmtDate(saved.date), saved.extra && `${stage.key === 'stores' ? 'GRV' : 'Ref'} ${saved.extra}`].filter(Boolean).join(', ');

  return (
    <li className={cn('rounded-card border bg-surface', done ? 'border-success-line' : 'border-line')}>
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(o => !o)} className="focus-ring flex w-full items-center gap-3 rounded-card px-4 py-3 text-left">
        <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', done ? 'bg-success-soft text-success' : 'bg-surface-muted text-ink-muted')}><Icon name={done ? 'check' : stage.icon} size="md" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-label font-semibold text-ink">{stage.label}</span>
          <span className="block truncate font-sans text-caption text-ink-muted">{done ? summary || 'Complete' : isNext ? 'Waiting here' : 'Not yet'}</span>
        </span>
        <StatusBadge tone={done ? 'success' : isNext ? 'warning' : 'neutral'}>{done ? 'Complete' : isNext ? 'Next' : 'Pending'}</StatusBadge>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" className="text-ink-muted" />
      </button>
      {open && (
        <div id={panel} className="flex flex-col gap-3 border-t border-line-subtle px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={stage.key === 'payment' ? 'Paid by' : 'Approved by'}><p className="flex min-h-10 items-center font-sans text-body text-ink">{draft.done && draft.by ? draft.by : <span className="text-ink-muted">Recorded from your signature</span>}</p></Field>
            <Field label={stage.key === 'payment' ? 'Date of payment' : 'Date approved'}><Input type="date" value={draft.date} onChange={e => set({ date: e.target.value })} /></Field>
            {stage.extra && <Field label={stage.extra.label} optional className="sm:col-span-2"><Input value={draft.extra} onChange={e => set({ extra: e.target.value })} placeholder={stage.extra.placeholder} /></Field>}
            <Field label="Comments" optional className="sm:col-span-2"><Textarea rows={2} value={draft.comments} onChange={e => set({ comments: e.target.value })} placeholder="Handed to whom, what is still awaited" /></Field>
          </div>
          {done && signature && (
            <div className="flex items-center gap-3">
              {/* A signature is a PNG data URL kept with the record, so it is shown as it is rather than through the image optimiser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt={`Signature of ${saved.by || 'the approver'}`} className="h-12 max-w-[10rem] rounded-xs border border-line bg-white object-contain" />
              <span className="font-sans text-caption text-ink-muted">Signed{saved.by ? ` by ${saved.by}` : ''}</span>
            </div>
          )}
          {error && <p role="alert" className="font-sans text-body-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            {done && <Button variant="ghost" disabled={pending} onClick={reopen}>Reopen stage</Button>}
            <Button variant="primary" icon="check" pending={pending} onClick={() => (done ? save({ ...draft, done: true }) : setSigning(true))}>{done ? 'Save changes' : 'Sign and complete'}</Button>
          </div>
        </div>
      )}
      {signing && (
        <ApprovalGate
          title={`Sign off ${stage.label}`} description={`${record.description || 'This job'}: ${stage.label}`} actionLabel="Sign and complete" requiredRole="user" preferSavedSignature
          onConfirm={async (sig: SignatureResult) => { await onSave(stage.key, { ...draft, done: true, by: sig.signerName }, sig.dataUrl); }} onCancel={() => setSigning(false)}
        />
      )}
    </li>
  );
}

export function PipelineEditor({ record, who, onSave }: { record: ServiceRecord; who: string; onSave: (key: StageKey, d: StageDraft, signature?: string) => Promise<void> }) {
  const next = nextStage(record)?.key ?? null;
  const signatures = useStageSignatures(record.id);
  const save = async (key: StageKey, d: StageDraft, signature?: string) => { await onSave(key, d, signature); if (signature) await signatures.refetch(); };
  return (
    <>
      {signatures.error && <p role="status" className="mb-2 font-sans text-body-sm text-ink-muted">The signatures could not be loaded: {signatures.error}</p>}
      <ul className="flex flex-col gap-2" aria-label="Approval stages">
        {STAGES.map(stage => (
          // Remount when the stored stage changes so the fields show what was saved.
          <StageRow key={`${stage.key}-${JSON.stringify(stageToDraft(record, stage.key))}-${isStageDone(record, stage.key)}`} stage={stage} record={record} isNext={stage.key === next} who={who} signature={signatures.data?.[stage.key]} onSave={save} />
        ))}
      </ul>
    </>
  );
}
