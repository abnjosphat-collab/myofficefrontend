// app/artisan-timesheets/DayGrid.tsx — the month, one row per day: status, the six hour columns, standby, sign-in and sign-out (time and
// signature) and comments, with the totals at the foot. Each column can be copied down (drag the corner handle, or press Enter on it
// to copy to the end of the month), the header and the date and status columns can be frozen, and the hours are typed as text and read
// once so a half-typed "1." is not rewritten under the cursor.
'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Checkbox, DESKTOP_QUERY, Input, NativeSelect, cn, useMediaQuery } from '@/components/ui-system';
import type { SignatureReuseOption } from '@/components/shared/SignaturePad';
import { formatDate } from '@/lib/format';
import { calcArtisanTimesheetTotals } from './calcTotals';
import { CommentField } from './CommentField';
import { DAY_STATUS_OPTIONS, applyDayStatus, type DayStatusKey } from './dayStatus';
import { FILL_COLUMN_LABELS, HOUR_FIELDS, fillColumnDown, type FillColumn, type FillTarget } from './fillHours';
import { formatHourInput, roundHours2 } from './hourFormat';
import { SignatureField } from '@/components/shared/SignatureField';
import type { ArtisanTimesheetDayRow } from './types';

const ZERO_NORMAL = new Set(['off', 'absent']);
/** Widths of the frozen Date, Day and Status columns; they must match the colgroup. */
const W = { date: 96, day: 52, status: 132 } as const;
const LEFT = { date: 0, day: W.date, status: W.date + W.day } as const;
const EDGE = 48; const STEP = 16;

function HourInput({ value, label, disabled, onCommit }: { value: number; label: string; disabled?: boolean; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="number" inputMode="decimal" min={0} step={0.25} disabled={disabled} aria-label={label} className="h-8 w-[4.5rem] px-1.5 text-center tabular" value={draft ?? formatHourInput(value)}
      onFocus={e => e.target.select()} onChange={e => { setDraft(e.target.value); const n = e.target.value.trim() === '' ? 0 : Number(e.target.value); if (Number.isFinite(n)) onCommit(roundHours2(n)); }} onBlur={() => setDraft(null)}
    />
  );
}

function FillCell({ rowIndex, column, active, preview, onStartFill, onKeyFill, className, style, children }: {
  rowIndex: number; column: FillColumn; active: boolean; preview: boolean; onStartFill: (row: number, column: FillColumn) => void; onKeyFill: (row: number, column: FillColumn) => void; className?: string; style?: React.CSSProperties; children: ReactNode;
}) {
  const label = FILL_COLUMN_LABELS[column];
  return (
    <td style={style} className={cn('group relative px-1 py-1 align-middle', preview && '!bg-action-soft', active && 'ring-1 ring-inset ring-action', className)}>
      {children}
      <button type="button" title={`Drag to copy ${label} down. Press Enter to copy it to the end of the month.`} aria-label={`Copy ${label} down from day ${rowIndex + 1}`}
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onStartFill(rowIndex, column); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKeyFill(rowIndex, column); } }}
        className={cn('focus-ring absolute bottom-0 right-0 z-10 size-3 cursor-ns-resize rounded-br-xs border-b-2 border-r-2 transition-opacity', active ? 'border-action opacity-90' : 'border-line-strong opacity-0 hover:border-action hover:!opacity-100 focus-visible:opacity-100 group-hover:opacity-70')} />
    </td>
  );
}

export function DayGrid({ rows, employeeName, reuseSignatures, onChange }: { rows: ArtisanTimesheetDayRow[]; employeeName: string; reuseSignatures: SignatureReuseOption[]; onChange: (rows: ArtisanTimesheetDayRow[]) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ target: FillTarget; source: number; end: number } | null>(null);
  const [freezeHeader, setFreezeHeader] = useState(true);
  // On a phone the three frozen columns would take most of the width, so they start unfrozen there (the choice is still the person's).
  const wide = useMediaQuery(DESKTOP_QUERY);
  const [freezeChoice, setFreezeChoice] = useState<boolean | null>(null);
  const freezeCols = freezeChoice ?? wide;
  const setFreezeCols = (v: boolean) => setFreezeChoice(v);
  const totals = calcArtisanTimesheetTotals(rows);

  const update = useCallback((i: number, patch: Partial<ArtisanTimesheetDayRow>) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch, _auto: false } : r))), [rows, onChange]);
  const fill = useCallback((source: number, end: number, target: FillTarget) => {
    if (end <= source || target === 'all-hours') return;
    onChange(fillColumnDown(rows, target, source, end));
    const n = end - source;
    toast.success(`Copied ${FILL_COLUMN_LABELS[target]} to ${n} ${n === 1 ? 'day' : 'days'}.`);
  }, [rows, onChange]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const el = scroller.current;
      if (el) {
        const r = el.getBoundingClientRect();
        if (e.clientY > r.bottom - EDGE) el.scrollTop += STEP; else if (e.clientY < r.top + EDGE) el.scrollTop -= STEP;
        if (e.clientX > r.right - EDGE) el.scrollLeft += STEP; else if (e.clientX < r.left + EDGE) el.scrollLeft -= STEP;
      }
      const tr = document.elementFromPoint(e.clientX, e.clientY)?.closest('tr[data-row-index]');
      const idx = tr ? Number(tr.getAttribute('data-row-index')) : NaN;
      if (!Number.isNaN(idx) && idx > drag.source) setDrag(prev => (prev ? { ...prev, end: Math.min(idx, rows.length - 1) } : null));
    };
    const up = () => { if (drag.end > drag.source) fill(drag.source, drag.end, drag.target); setDrag(null); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [drag, fill, rows.length]);

  const cell = (i: number, c: FillColumn) => ({ active: !!drag && drag.target === c && drag.source === i, preview: !!drag && drag.target === c && i > drag.source && i <= drag.end });
  const props = (i: number, c: FillColumn) => ({ rowIndex: i, column: c, ...cell(i, c), onStartFill: (row: number, column: FillColumn) => setDrag({ target: column, source: row, end: row }), onKeyFill: (row: number, column: FillColumn) => fill(row, rows.length - 1, column) });
  const frozen = (col: keyof typeof W) => (freezeCols ? { left: LEFT[col], minWidth: W[col], maxWidth: W[col] } : undefined);
  const head = (extra = '') => cn('bg-surface-muted px-1.5 py-2 text-center font-sans text-caption font-semibold text-ink', freezeHeader && 'sticky top-0 z-30', extra);
  const frozenHead = (col: keyof typeof W) => cn(head('text-left'), freezeCols && 'sticky', freezeHeader && freezeCols ? 'z-50' : freezeCols ? 'z-40' : '', col === 'status' && freezeCols && 'shadow-[4px_0_8px_-4px_rgb(0_0_0/0.18)]');
  const bg = (i: number) => (i % 2 ? 'bg-surface-subtle' : 'bg-surface');
  const frozenCell = (col: keyof typeof W, i: number) => cn('px-1.5 py-1 align-middle', bg(i), freezeCols && 'sticky z-20', col === 'status' && freezeCols && 'shadow-[4px_0_8px_-4px_rgb(0_0_0/0.12)]');

  return (
    <div className={cn('overflow-hidden rounded-card border border-line', drag && 'select-none')}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface-subtle px-4 py-2.5">
        <span className="font-sans text-label font-medium text-ink">Freeze</span>
        <Checkbox label="Header row" checked={freezeHeader} onChange={e => setFreezeHeader(e.target.checked)} />
        <Checkbox label="Date and status columns" checked={freezeCols} onChange={e => setFreezeCols(e.target.checked)} />
        <span className="ml-auto font-sans text-caption text-ink-muted">Drag a cell&apos;s corner to copy it down, or press Enter on it to copy to the end of the month.</span>
      </div>
      {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={scroller} tabIndex={0} role="region" aria-label="Daily timesheet (scrollable)" className="max-h-[min(75vh,800px)] overflow-auto overscroll-contain">
        <table className="w-full min-w-[1400px] border-collapse font-sans text-caption">
          <caption className="sr-only">{employeeName}: one row for each day of the month</caption>
          <colgroup><col style={{ width: W.date }} /><col style={{ width: W.day }} /><col style={{ width: W.status }} /></colgroup>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={frozenHead('date')} style={frozen('date')}>Date</th>
              <th scope="col" className={frozenHead('day')} style={frozen('day')}>Day</th>
              <th scope="col" className={frozenHead('status')} style={frozen('status')}>Status</th>
              {HOUR_FIELDS.map(f => <th key={f} scope="col" className={head('min-w-[5.5rem] whitespace-nowrap')}>{FILL_COLUMN_LABELS[f]}</th>)}
              <th scope="col" className={head('min-w-[7rem]')}>Standby</th><th scope="col" className={head('min-w-16')}>In time</th><th scope="col" className={head('min-w-24')}>Sign in</th>
              <th scope="col" className={head('min-w-16')}>Out time</th><th scope="col" className={head('min-w-24')}>Sign out</th><th scope="col" className={head('min-w-64 text-left')}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const zero = ZERO_NORMAL.has(r.day_status);
              const date = formatDate(r.date);
              return (
                <tr key={r.date} data-row-index={i} className={cn('border-b border-line-subtle', bg(i), r.on_standby && '!bg-warning-soft/40')}>
                  <th scope="row" className={cn(frozenCell('date', i), 'whitespace-nowrap text-left font-normal text-ink')} style={frozen('date')}>
                    {date}{r._auto && <span className="ml-1 inline-block size-1.5 rounded-full bg-action align-middle" title="Filled from leave, overtime, standby or holidays"><span className="sr-only">Filled from the system</span></span>}
                  </th>
                  <td className={cn(frozenCell('day', i), 'text-ink-muted')} style={frozen('day')}>{r.day}</td>
                  <FillCell {...props(i, 'day_status')} className={frozenCell('status', i)} style={frozen('status')}>
                    <NativeSelect aria-label={`Status on ${date}`} className="h-8 text-caption" value={r.day_status} onChange={e => update(i, applyDayStatus(r, e.target.value as DayStatusKey))}>
                      {DAY_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </NativeSelect>
                  </FillCell>
                  {HOUR_FIELDS.map(f => (
                    <FillCell key={f} {...props(i, f)} className="text-center">
                      <HourInput value={r[f]} label={`${FILL_COLUMN_LABELS[f]} on ${date}`} disabled={zero && f === 'normal_hrs'} onCommit={n => update(i, { [f]: n })} />
                    </FillCell>
                  ))}
                  <FillCell {...props(i, 'on_standby')}>
                    <NativeSelect aria-label={`Standby on ${date}`} className="h-8 text-caption" value={r.on_standby ? 'yes' : ''} onChange={e => update(i, { on_standby: e.target.value === 'yes' })}><option value="">No</option><option value="yes">On standby</option></NativeSelect>
                  </FillCell>
                  <td className="px-1 py-1"><Input aria-label={`Sign in time on ${date}`} className="h-8 w-16 px-1.5 text-center tabular" value={r.sign_in_time} onChange={e => update(i, { sign_in_time: e.target.value })} /></td>
                  <FillCell {...props(i, 'sign_in_signature')}><SignatureField compact label={`Sign in, ${date}`} signerName={employeeName} value={r.sign_in_signature} reuseSignatures={reuseSignatures} onChange={v => update(i, { sign_in_signature: v })} /></FillCell>
                  <td className="px-1 py-1"><Input aria-label={`Sign out time on ${date}`} className="h-8 w-16 px-1.5 text-center tabular" value={r.sign_out_time} onChange={e => update(i, { sign_out_time: e.target.value })} /></td>
                  <FillCell {...props(i, 'sign_out_signature')}><SignatureField compact label={`Sign out, ${date}`} signerName={employeeName} value={r.sign_out_signature} reuseSignatures={reuseSignatures} onChange={v => update(i, { sign_out_signature: v })} /></FillCell>
                  <td className="px-1 py-1"><CommentField value={r.comments} dateLabel={date} onChange={v => update(i, { comments: v })} /></td>
                </tr>
              );
            })}
            <tr data-row-index={rows.length} className="border-t-2 border-line bg-surface-muted font-semibold">
              <th scope="row" colSpan={3} className={cn('px-1.5 py-2 text-left', freezeCols && 'sticky left-0 z-20 bg-surface-muted')}>Totals</th>
              {HOUR_FIELDS.map(f => <td key={f} className="px-1.5 py-2 text-center tabular">{totals[f].toFixed(2)}</td>)}
              <td colSpan={6}><span className="sr-only">No total for these columns</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
