// app/compressors/ReadingCard.tsx — one compressor's daily reading: previous totals, the cumulative meter inputs,
// the daily figures they imply, and the save. Remounted (keyed by the page) whenever the saved totals or the
// chosen day change, so its inputs always start from the truth.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, Icon, Input, Notice, Progress, StatusBadge, cn } from '@/components/ui-system';
import { calculateDailyDelta, calculateEfficiency, efficiencyTone, getEfficiencyStatus, readingProblems, type NextServiceInfo } from './calcCompressors';
import { STATUS_META, URGENCY_TONE, hours, statusLabel } from './meta';
import type { Compressor, PreviousReading } from './types';

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

export function ReadingCard({ compressor, previous, previousUnavailable, previousLoading, nextService, dateLabel, showDaily, onSave, onChangeStatus }: {
  compressor: Compressor;
  previous: PreviousReading | undefined;
  previousUnavailable: boolean;
  /** The history is still loading: saving waits, so a reading is never checked against nothing. */
  previousLoading: boolean;
  nextService: NextServiceInfo | null;
  dateLabel: string;
  showDaily: boolean;
  onSave: (v: { running: number; loaded: number; pressure: number; temperature: number; notes: string }) => Promise<void>;
  onChangeStatus: () => void;
}) {
  const [running, setRunning] = useState(String(compressor.total_running_hours ?? 0));
  const [loaded, setLoaded] = useState(String(compressor.total_loaded_hours ?? 0));
  const [pressure, setPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const run = num(running); const load = num(loaded);
  const valid = Number.isFinite(run) && Number.isFinite(load);
  const problems = valid ? readingProblems(previous, run, load) : {};
  const dailyRun = valid ? calculateDailyDelta(run, previous?.total_running_hours ?? 0) : 0;
  const dailyLoad = valid ? calculateDailyDelta(load, previous?.total_loaded_hours ?? 0) : 0;
  const efficiency = calculateEfficiency(dailyRun, dailyLoad);
  const eff = getEfficiencyStatus(efficiency);
  const status = STATUS_META[compressor.status];
  const prevRun = previous?.total_running_hours ?? 0; const prevLoad = previous?.total_loaded_hours ?? 0;

  const save = async () => {
    setTouched(true);
    if (!valid || problems.running || problems.loaded) return;
    setSaving(true);
    try {
      await onSave({ running: run, loaded: load, pressure: Number(pressure) || 0, temperature: Number(temperature) || 0, notes: notes.trim() });
      toast.success(`${compressor.name}: reading saved.`);
    } catch (e) { toast.error(`${compressor.name}: ${(e as Error).message}`); }
    finally { setSaving(false); }
  };

  return (
    <article aria-label={`${compressor.name} reading`} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><Icon name="compressor" size="md" /></span>
          <div className="min-w-0">
            <h3 className="font-display text-title font-semibold text-ink [overflow-wrap:anywhere]">{compressor.name}</h3>
            <p className="font-sans text-caption text-ink-muted [overflow-wrap:anywhere]">{[compressor.model, compressor.location].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <button type="button" onClick={onChangeStatus} aria-label={`Change status of ${compressor.name}, currently ${statusLabel(compressor.status)}`} className="focus-ring shrink-0 rounded-full">
          <StatusBadge tone={status?.tone ?? 'neutral'} icon={status?.icon}>{statusLabel(compressor.status)}</StatusBadge>
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {nextService
          ? <StatusBadge tone={URGENCY_TONE[nextService.urgency] ?? 'neutral'} icon={nextService.isUrgent ? 'warning' : 'service'}>{`${nextService.interval} h service in ${nextService.daysRemaining} days`}</StatusBadge>
          : <StatusBadge tone="success" icon="success">All service intervals passed</StatusBadge>}
      </div>

      {previousUnavailable
        ? <Notice tone="warning" title="Previous reading unavailable">Its history could not be loaded, so today&apos;s hours and the checks against the previous totals cannot be worked out. You can still save a reading.</Notice>
        : (
          <dl className="grid grid-cols-2 gap-3 rounded-control bg-surface-subtle p-3">
            <div className="col-span-2 flex items-center justify-between"><dt className="font-sans text-label font-medium text-ink">Previous reading</dt><dd className="font-sans text-caption text-ink-muted">{previous ? previous.date === 'Initial' ? 'Initial totals' : previous.date : 'None recorded'}</dd></div>
            <div><dt className="font-sans text-caption text-ink-muted">Running</dt><dd className="font-display text-title font-semibold text-ink tabular">{hours(previous?.total_running_hours)}</dd></div>
            <div><dt className="font-sans text-caption text-ink-muted">Loaded</dt><dd className="font-display text-title font-semibold text-ink tabular">{hours(previous?.total_loaded_hours)}</dd></div>
          </dl>
        )}

      <fieldset className="flex flex-col gap-3" disabled={saving}>
        <legend className="mb-1 font-sans text-label font-semibold text-ink">Cumulative hours on {dateLabel}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total running (h)" error={touched && !valid ? 'Enter a number.' : problems.running}><Input type="number" inputMode="decimal" step="0.1" min="0" value={running} onChange={e => setRunning(e.target.value)} /></Field>
          <Field label="Total loaded (h)" error={touched && !valid ? 'Enter a number.' : problems.loaded}><Input type="number" inputMode="decimal" step="0.1" min="0" value={loaded} onChange={e => setLoaded(e.target.value)} /></Field>
        </div>
        <div className="flex items-center justify-between font-sans text-caption text-ink-muted">
          <span>Saved totals: {hours(compressor.total_running_hours)} running, {hours(compressor.total_loaded_hours)} loaded</span>
          {previous && <button type="button" className="focus-ring rounded-xs font-medium text-action underline underline-offset-2" onClick={() => { setRunning(String(prevRun)); setLoaded(String(prevLoad)); }}>Copy previous</button>}
        </div>
      </fieldset>

      {showDaily && (
        <dl className={cn('grid grid-cols-2 gap-3 rounded-control p-3', previousUnavailable ? 'bg-surface-subtle' : 'bg-action-soft/60')} aria-label="Calculated for the day">
          <div><dt className="font-sans text-caption text-ink-muted">Running that day</dt><dd className="font-display text-metric font-semibold text-ink tabular">{previousUnavailable ? '—' : hours(dailyRun)}</dd></div>
          <div><dt className="font-sans text-caption text-ink-muted">Loaded that day</dt><dd className="font-display text-metric font-semibold text-ink tabular">{previousUnavailable ? '—' : hours(dailyLoad)}</dd></div>
        </dl>
      )}

      {!previousUnavailable && dailyRun > 0 && (
        <div className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-sans text-label font-medium text-ink">Efficiency <span className="font-display text-title font-semibold tabular">{efficiency}%</span></p>
            <StatusBadge tone={efficiencyTone(efficiency)}>{eff.label}</StatusBadge>
          </div>
          <Progress value={efficiency} label={`${compressor.name} efficiency`} />
        </div>
      )}

      <fieldset className="flex flex-col gap-3" disabled={saving}>
        <legend className="sr-only">Other readings</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pressure (psi)" optional><Input type="number" inputMode="decimal" step="0.1" value={pressure} onChange={e => setPressure(e.target.value)} placeholder="0.0" /></Field>
          <Field label="Temperature (°C)" optional><Input type="number" inputMode="decimal" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="0.0" /></Field>
        </div>
        <Field label="Notes" optional><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything worth recording" /></Field>
      </fieldset>

      <Button variant="primary" icon="save" pending={saving} disabled={previousLoading} onClick={save} aria-label={`Save reading for ${compressor.name}`}>Save reading</Button>
    </article>
  );
}
