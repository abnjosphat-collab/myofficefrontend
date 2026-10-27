// app/maintenance/GuideView.tsx — the one-page in-app guide (M8): how a job
// moves, who does what, where things live, and the cutover checklist with
// its date. The date is shared (one lookup-list value, set by a manager);
// the checkmarks are this browser's own walkthrough of the list.
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Checkbox, Field, Input, LoadingPulse, Notice, readStored, storeValue } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { api } from '@/lib/apiClient';

/** The shared list holding the single cutover date value (never in Admin > Shared lists). */
export const CUTOVER_LIST = 'maintenance_cutover_date';
const CHECKS_KEY = 'maint_cutover_checks_v1';

interface LookupValue { id: number; value: string }

/** A real calendar date in YYYY-MM-DD form (2026-02-30 fails the round trip). UTC parts, never local. */
function validDate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const d = new Date(`${m[0]}T12:00:00Z`);
  return !Number.isNaN(d.getTime())
    && d.getUTCFullYear() === Number(m[1])
    && d.getUTCMonth() + 1 === Number(m[2])
    && d.getUTCDate() === Number(m[3]);
}

/** Pure — the shared cutover date: the lowest-id valid YYYY-MM-DD value wins; anything else is ignored. */
export function cutoverOf(values: unknown): { id: number; date: string } | null {
  if (!Array.isArray(values)) return null;
  const rows = (values as LookupValue[])
    .filter(v => v && validDate(v.value))
    .sort((a, b) => a.id - b.id);
  return rows.length ? { id: rows[0].id, date: (rows[0].value as string).trim() } : null;
}

function asChecks(raw: unknown): Record<string, boolean> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'boolean') out[k] = v;
  return out;
}

const CHECKLIST: { id: string; text: string; href?: string; link?: string }[] = [
  { id: 'date', text: 'The cutover date above is set, and everyone has been told it.' },
  { id: 'assets', text: 'eMaint assets are imported and reconciled against the register.', href: '/maintenance/import', link: 'Open the import' },
  { id: 'pm', text: 'eMaint PM schedules are imported.', href: '/maintenance/import?kind=schedules', link: 'Open the PM import' },
  { id: 'schedules', text: 'Test schedules are paused or removed (the Schedules tab).' },
  { id: 'phone', text: 'Everyone can sign in and close a job on a phone.' },
  { id: 'bell', text: 'The bell shows assigned, overdue and waiting-for-sign-off jobs.' },
  { id: 'readonly', text: 'eMaint is read-only from the cutover date.' },
  { id: 'paper', text: 'Paper job cards print cleanly, if the site still uses them.' },
  { id: 'checks', text: 'Two weeks of daily checks after the switch: jobs closed per day, errors, feedback (the Analytics tab).' },
];

export function GuideView({ canManage }: { canManage: boolean }) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<{ values: LookupValue[] | null; failed: boolean }>({ values: null, failed: false });
  const [draft, setDraft] = useState('');
  const [draftTouched, setDraftTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>(() => readStored(CHECKS_KEY, asChecks, {}));

  useEffect(() => {
    let current = true;
    api.get<LookupValue[]>(`/api/lookup-lists/${CUTOVER_LIST}`).then(
      values => { if (current) setSettled({ values, failed: false }); },
      () => { if (current) setSettled({ values: null, failed: true }); },
    );
    return () => { current = false; };
  }, [tick]);

  const dateLoading = settled.values === null && !settled.failed;
  const cutover = cutoverOf(settled.values);
  const shown = draftTouched ? draft : (cutover?.date ?? '');
  const done = CHECKLIST.filter(c => checks[c.id]).length;

  const toggle = (id: string) => setChecks(prev => {
    const next = { ...prev, [id]: !prev[id] };
    storeValue(CHECKS_KEY, next);
    return next;
  });

  const saveDate = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shown)) { setSaveError('Pick the cutover date.'); return; }
    setSaving(true); setSaveError(null);
    try {
      // Exactly one value: clear any strays first, so a refused write leaves the list as it was.
      for (const v of settled.values ?? []) {
        if (cutover && v.id === cutover.id) continue;
        await api.delete(`/api/lookup-lists/${CUTOVER_LIST}/${v.id}`);
      }
      if (cutover) {
        if (shown !== cutover.date) await api.patch(`/api/lookup-lists/${CUTOVER_LIST}/${cutover.id}`, { value: shown });
      } else {
        await api.post(`/api/lookup-lists/${CUTOVER_LIST}`, { value: shown });
      }
      setDraftTouched(false);
      setTick(t => t + 1);
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'The date was not saved.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section aria-labelledby="guide-flow">
        <h2 id="guide-flow" className="mb-2 font-display text-section font-semibold text-ink">How a job moves</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 font-sans text-body-sm text-ink">
          <li><strong>Raise it</strong> — New work order: the machine, who does it, what is needed. A breakdown can start from Breakdowns instead, and its job is raised with it.</li>
          <li><strong>Do the work</strong> — the job sits with its artisan; the bell&apos;s Assigned to me lists yours.</li>
          <li><strong>Close it fast</strong> — Done from the list, the card or the detail: what was done plus the actual time. A breakdown also needs its Problem, Cause and Action.</li>
          <li><strong>The foreman signs later</strong> — finished jobs wait on the Awaiting sign-off tile until a manager signs. Completion and sign-off stay separate.</li>
          <li><strong>Missed planned jobs read Not done</strong> — they count against PM done on time, so the measure stays honest.</li>
        </ol>
      </section>
      <section aria-labelledby="guide-roles">
        <h2 id="guide-roles" className="mb-2 font-display text-section font-semibold text-ink">Who does what</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 font-sans text-body-sm text-ink">
          <li><strong>Everyone signed in</strong> raises jobs, closes them with Done, records downtime, and raises jobs from a schedule.</li>
          <li><strong>Managers</strong> sign jobs off, delete them, create and change schedules, commit PM imports, and set the cutover date below.</li>
        </ul>
      </section>
      <section aria-labelledby="guide-where">
        <h2 id="guide-where" className="mb-2 font-display text-section font-semibold text-ink">Where things live</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 font-sans text-body-sm text-ink">
          <li>Your jobs, overdue jobs and jobs waiting for sign-off: the bell, top right.</li>
          <li>Recurring work: the Schedules tab. Past numbers: the Analytics tab.</li>
          <li>Everything about one machine: <Link href="/equipment/history" className="font-medium text-action hover:underline">Machine history</Link>.</li>
          <li>Bringing eMaint across: <Link href="/maintenance/import" className="font-medium text-action hover:underline">the import</Link>.</li>
        </ul>
      </section>
      <section aria-labelledby="guide-cutover">
        <h2 id="guide-cutover" className="mb-2 font-display text-section font-semibold text-ink">Cutover checklist</h2>
        {dateLoading ? (
          <LoadingPulse compact label="Loading the cutover date" />
        ) : settled.failed ? (
          <Notice tone="warning" title="The cutover date could not be loaded" action={<Button size="sm" onClick={() => setTick(t => t + 1)}>Try again</Button>}>
            The checklist below still works.
          </Notice>
        ) : canManage ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Cutover date">
                <Input type="date" value={shown} onChange={e => { setDraft(e.target.value); setDraftTouched(true); }} className="w-44" />
              </Field>
              <Button variant="primary" pending={saving} onClick={() => void saveDate()}>Save the date</Button>
            </div>
            {saveError && <Notice tone="danger" title="The date was not saved">{saveError}</Notice>}
            {!cutover && !saveError && <p className="font-sans text-body-sm text-ink-muted">No cutover date yet — pick the day everyone switches.</p>}
          </div>
        ) : (
          <p className="font-sans text-body-sm text-ink" role="status">
            {cutover ? <>Cutover date: <strong>{fmtDate(cutover.date)}</strong>.</> : 'No cutover date yet — a manager sets it here.'}
          </p>
        )}
        <p className="mt-3 font-sans text-caption text-ink-muted" role="status">{done} of {CHECKLIST.length} done. Checkmarks are kept in this browser.</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {CHECKLIST.map(c => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line-subtle bg-surface px-3 py-2">
              <div className="min-w-0 flex-1 basis-64"><Checkbox checked={!!checks[c.id]} onChange={() => toggle(c.id)} label={c.text} /></div>
              {c.href && <Link href={c.href} className="shrink-0 font-sans text-body-sm font-medium text-action hover:underline">{c.link}</Link>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
