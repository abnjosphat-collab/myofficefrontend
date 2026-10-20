// app/compressors/UnitDrawer.tsx — one compressor up close, in a side panel: where it stands, its status, and
// the meter reading for the chosen day (with the day's change shown as you type). Built on the shared Dialog for its focus
// trap, Escape and focus return. Quiet by design: sections divided by hairlines, one control per job, the optional
// fields (pressure, temperature, notes) folded away until wanted.
'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, Icon, Input, Textarea, useDismissGuard } from '@/components/ui-system';
import { calculateDailyDelta, calculateEfficiency, readingProblems } from './calcCompressors';
import { STATUS_KEYS, STATUS_META, hours } from './meta';
import type { Compressor, PreviousReading } from './types';
import { useResetOnOpen } from '@/lib/useResetOnOpen';
import { CountUp } from '@/components/shared/floor/motion';
import { serviceLife, statusAccent } from './floorLogic';
import s from '@/components/shared/floor/floor.module.css';

const num = (v: string) => (v.trim() === '' ? NaN : Number(v));

export interface ReadingInput { running: number; loaded: number; pressure: number; temperature: number; notes: string }

export function UnitDrawer({ compressor, previous, previousUnavailable, previousLoading, dateLabel, recordedToday, onClose, onSave, onStatus, onHistory }: {
  compressor: Compressor | null;
  previous: PreviousReading | undefined;
  previousUnavailable: boolean;
  previousLoading: boolean;
  dateLabel: string;
  recordedToday: boolean;
  onClose: () => void;
  onSave: (id: number, v: ReadingInput) => Promise<void>;
  onStatus: (id: number, status: string) => Promise<void>;
  /** Show this compressor's week and month. */
  onHistory: (id: number) => void;
}) {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState('');
  const [loaded, setLoaded] = useState('');
  const [pressure, setPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [more, setMore] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  useResetOnOpen(compressor ? String(compressor.id) : null, () => {
    setRunning(String(compressor?.total_running_hours ?? ''));
    setLoaded(String(compressor?.total_loaded_hours ?? ''));
    setPressure(''); setTemperature(''); setNotes(''); setMore(false); setTouched(false);
  });

  const c = compressor;
  const run = num(running); const load = num(loaded);
  const valid = Number.isFinite(run) && Number.isFinite(load);
  const problems = readingProblems(previous, run, load);
  const prevRun = previous?.total_running_hours ?? 0;
  const prevLoad = previous?.total_loaded_hours ?? 0;
  const dayRun = valid ? calculateDailyDelta(run, prevRun) : 0;
  const dayLoad = valid ? calculateDailyDelta(load, prevLoad) : 0;
  const eff = calculateEfficiency(dayRun, dayLoad);
  const blocked = previousLoading || previousUnavailable;
  const dirty = running !== String(c?.total_running_hours ?? '') || loaded !== String(c?.total_loaded_hours ?? '') || pressure !== '' || temperature !== '' || notes !== '';
  const { guardClose } = useDismissGuard({ when: !!c && dirty && !saving, message: 'The reading is not saved yet.' });
  const close = () => guardClose(() => onClose());

  const save = async () => {
    if (!c) return;
    setTouched(true);
    if (problems.running || problems.loaded || blocked) return;
    setSaving(true);
    try {
      await onSave(c.id, { running: run, loaded: load, pressure: Number(pressure) || 0, temperature: Number(temperature) || 0, notes: notes.trim() });
      toast.success(`${c.name}: reading for ${dateLabel} saved.`);
      onClose();
    } catch (e) { toast.error(`${c.name}: ${(e as Error).message}`); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status: string) => {
    if (!c || status === c.status) return;
    setChanging(status);
    try { await onStatus(c.id, status); toast.success(`${c.name} is now ${STATUS_META[status]?.label.toLowerCase() ?? status}.`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setChanging(null); }
  };

  const life = c ? serviceLife(c.total_running_hours) : null;
  const accent = c ? statusAccent(c.status) : 'var(--mo-neutral)';
  const effTone = eff >= 80 ? 'var(--mo-success)' : eff >= 60 ? 'var(--mo-info)' : eff >= 40 ? 'var(--mo-warning)' : 'var(--mo-danger)';

  return (
    <Dialog
      open={!!c}
      onOpenChange={o => { if (!o) close(); }}
      placement="right"
      title={c?.name.trim() ?? 'Compressor'}
      description={c ? [c.equipment_code, c.model, c.location].filter(Boolean).join(' · ') || 'Compressor' : undefined}
      dismissible={!saving}
      footer={c && (
        <>
          <Button variant="ghost" icon="analytics" className="mr-auto" onClick={() => onHistory(c.id)} disabled={saving}>Week and month</Button>
          <Button onClick={close} disabled={saving}>Close</Button>
          <Button variant="primary" pending={saving} disabled={blocked} onClick={save}>{recordedToday ? 'Update reading' : 'Save reading'}</Button>
        </>
      )}
    >
      {c && life && (
        <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
          {/* Where it stands: three plain figures and one thin bar towards the next service */}
          <section aria-label="Where it stands" className="flex flex-col gap-3">
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-4">
              <div>
                <dt className="font-sans text-caption text-ink-muted">Running</dt>
                <dd className="floor-meter mt-0.5 text-readout font-medium leading-none text-ink"><CountUp value={c.total_running_hours} decimals={1} /><span className="ml-1 font-sans text-caption font-normal text-ink-muted">h</span></dd>
              </div>
              <div>
                <dt className="font-sans text-caption text-ink-muted">Loaded</dt>
                <dd className="floor-meter mt-0.5 text-readout font-medium leading-none text-ink"><CountUp value={c.total_loaded_hours} decimals={1} /><span className="ml-1 font-sans text-caption font-normal text-ink-muted">h</span></dd>
              </div>
              <div>
                <dt className="font-sans text-caption text-ink-muted">Next service</dt>
                <dd className="mt-0.5 font-sans text-body-sm leading-tight text-ink">{life.next ? <><span className="floor-meter font-medium">{life.hoursLeft?.toFixed(0)}</span> h to {life.next} h</> : 'All passed'}</dd>
              </div>
            </dl>
            {life.next && (
              <div className={s.runway} role="img" aria-label={`${Math.round(life.fraction * 100)}% of the way to the ${life.next} hour service`} style={{ ['--accent' as string]: life.tone, height: 6 }}>
                <div className={s.runwayFill} style={{ width: `${Math.max(3, life.fraction * 100)}%` }} />
              </div>
            )}
          </section>

          {/* Status: one segmented control, equal widths */}
          <section aria-label="Status" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
            <div className="flex items-baseline justify-between gap-2"><h3 className="font-sans text-caption font-medium text-ink-muted">Status</h3><span className="font-sans text-caption text-ink-muted">Tap an option to change it</span></div>
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_KEYS.map(k => {
                const on = c.status === k;
                return (
                  <button key={k} type="button" role="radio" aria-checked={on} disabled={!!changing} onClick={() => changeStatus(k)}
                    style={{ ['--accent' as string]: statusAccent(k) }}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border px-2 py-2 font-sans text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-wait ${on ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] font-medium text-ink' : 'border-line bg-surface-raised text-ink hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'}`}>
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                    {on && changing !== k && <Icon name="check" size="sm" />}
                    <span className="truncate">{changing === k ? 'Saving…' : STATUS_META[k].label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* The reading for the chosen day */}
          <section aria-label="Meter reading" className="flex flex-col gap-3 border-t border-line-subtle pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-sans text-caption font-medium text-ink-muted">Meter reading</h3>
              <span className="font-sans text-caption text-ink-muted">{dateLabel}{recordedToday && ' · recorded'}</span>
            </div>
            {previousUnavailable && <p className="font-sans text-caption" style={{ color: 'var(--mo-warning)' }}>The previous reading could not be loaded, so this one cannot be checked yet. Refresh and try again.</p>}
            <div className="grid grid-cols-2 gap-3">
              <MeterField label="Running hours" value={running} onChange={setRunning} previous={previousLoading ? 'Loading…' : `Previous ${hours(prevRun)}`} error={touched ? problems.running : undefined} delta={valid ? dayRun : null} onEnter={save} />
              <MeterField label="Loaded hours" value={loaded} onChange={setLoaded} previous={previousLoading ? 'Loading…' : `Previous ${hours(prevLoad)}`} error={touched ? problems.loaded : undefined} delta={valid ? dayLoad : null} onEnter={save} />
            </div>
            <AnimatePresence initial={false}>
              {valid && dayRun > 0 && (
                <motion.p key="day" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }}
                  className="font-sans text-body-sm text-ink-muted">
                  This day: <span className="tabular text-ink">{dayRun.toFixed(1)} h</span> running, <span className="tabular text-ink">{dayLoad.toFixed(1)} h</span> loaded · <span className="tabular font-medium" style={{ color: effTone }}>{eff}%</span> loaded
                </motion.p>
              )}
            </AnimatePresence>

            <button type="button" aria-expanded={more} onClick={() => setMore(m => !m)}
              className="flex w-fit items-center gap-1 rounded-sm font-sans text-body-sm text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              <Icon name="chevron-down" size="xs" className={`transition-transform duration-200 ${more ? 'rotate-180' : ''}`} />
              Pressure, temperature and notes
            </button>
            <AnimatePresence initial={false}>
              {more && (
                <motion.div key="more" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }} className="overflow-hidden">
                  <div className="flex flex-col gap-3 pb-1">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Pressure" optional><Input type="number" inputMode="decimal" value={pressure} onChange={e => setPressure(e.target.value)} placeholder="bar" /></Field>
                      <Field label="Temperature" optional><Input type="number" inputMode="decimal" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="°C" /></Field>
                    </div>
                    <Field label="Notes" optional><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the next shift should know" /></Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      )}
    </Dialog>
  );
}

function MeterField({ label, value, onChange, previous, error, delta, onEnter }: {
  label: string; value: string; onChange: (v: string) => void; previous: string; error?: string; delta: number | null; onEnter?: () => void;
}) {
  return (
    <Field label={label} error={error} description={previous}>
      <div className="relative">
        <Input type="number" inputMode="decimal" step="0.1" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }} className="floor-meter pr-16 text-base" />
        {delta != null && delta > 0 && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-sans text-caption tabular" style={{ color: 'var(--mo-success)' }}>+{delta.toFixed(1)}</span>}
      </div>
    </Field>
  );
}
