// app/artisan-timesheets/DayCards.tsx — the month as day cards, readable and
// tappable on a phone: one card per day with its status, the system-filled hours
// (read-only — overtime is computed, not typed), a standby toggle, sign-in/out
// with native time inputs, and comments. A totals summary leads. One layout at
// every width (1/2/3 columns), so there is no separate desktop grid to drift.
'use client';

import { useMemo } from 'react';
import { Checkbox, Input, StatusBadge, Tag, cn } from '@/components/ui-system';
import type { SignatureReuseOption } from '@/components/shared/SignaturePad';
import { SignatureField } from '@/components/shared/SignatureField';
import { formatDate } from '@/lib/format';
import { zimHolidayName } from '@/lib/zimHolidays';
import { pendingFootnoteText, pendingForDay, pendingMonthTotals, pendingSummaryText, type AutoPopulateSources, type PendingDayItems } from './autoPopulate';
import { calcArtisanTimesheetTotals } from './calcTotals';
import { CommentField } from './CommentField';
import { dayStatusLabel, isLeaveDayStatus } from './dayStatus';
import type { ArtisanTimesheetDayRow } from './types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

function statusTone(status: ArtisanTimesheetDayRow['day_status']): Tone | null {
  if (!status) return null;
  if (isLeaveDayStatus(status)) return 'info';
  if (status === 'absent') return 'warning';
  if (status === 'training') return 'brand';
  return 'neutral';
}

function DayHours({ row }: { row: ArtisanTimesheetDayRow }) {
  const all: [string, number][] = [
    ['Normal', row.normal_hrs || 0],
    ['Overtime @ 1.5×', row.ot_15 || 0],
    ['Overtime @ 2.0×', row.ot_20 || 0],
  ];
  const lines = all.filter(([, n]) => n > 0);
  if (lines.length === 0) return <p className="font-sans text-body-sm text-ink-muted">No hours recorded.</p>;
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
      {lines.map(([label, n]) => (
        <div key={label} className="contents">
          <dt className="font-sans text-body-sm text-ink-muted">{label}</dt>
          <dd className="font-sans text-body-sm font-semibold tabular text-ink">{n.toFixed(2)}h</dd>
        </div>
      ))}
    </dl>
  );
}

function DayCard({ row, employeeName, pending, reuseSignatures, onChange }: {
  row: ArtisanTimesheetDayRow;
  employeeName: string;
  pending: PendingDayItems;
  reuseSignatures: SignatureReuseOption[];
  onChange: (patch: Partial<ArtisanTimesheetDayRow>) => void;
}) {
  const date = formatDate(row.date);
  const tone = statusTone(row.day_status);
  const holiday = zimHolidayName(row.date);
  const dayOt = (row.ot_15 || 0) + (row.ot_20 || 0);
  const onLeave = isLeaveDayStatus(row.day_status);
  return (
    <article aria-labelledby={`day-${row.date}`} className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={`day-${row.date}`} className="font-display text-title font-semibold text-ink">
          {row.day}, {date}
          {row._auto && (
            <span className="ml-2 inline-block size-1.5 rounded-full bg-action align-middle" title="Filled from leave, overtime, standby or holidays">
              <span className="sr-only">Filled from the system</span>
            </span>
          )}
        </h3>
        {dayOt > 0 && <span className="shrink-0 font-display text-title font-semibold tabular text-action">{dayOt.toFixed(2)}h OT</span>}
      </div>

      {(tone || holiday) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tone && <StatusBadge tone={tone}>{dayStatusLabel(row.day_status)}</StatusBadge>}
          {holiday && <Tag>{holiday}</Tag>}
        </div>
      )}

      {(pending.leaves.length > 0 || pending.overtime.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone="warning">Awaiting approval</StatusBadge>
          <span className="font-sans text-body-sm text-ink-muted">{pendingSummaryText(pending)}</span>
        </div>
      )}

      <DayHours row={row} />

      <div className={cn('rounded-control border px-3 py-1', row.on_standby ? 'border-warning-line bg-warning-soft' : 'border-line-subtle bg-surface-subtle')}>
        <Checkbox
          label={<span className="font-medium">On standby</span>}
          description={onLeave ? 'Nobody works on leave — standby stays off.' : row.on_standby ? 'Standby is on for this day.' : 'Toggle on if standby was worked.'}
          checked={row.on_standby}
          disabled={onLeave && !row.on_standby}
          title={onLeave ? 'Nobody works on leave — standby stays off on leave days.' : undefined}
          onChange={e => onChange({ on_standby: e.target.checked, _standbyManual: true })}
          className="min-h-11 items-center py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-sans text-caption text-ink-muted">In</span>
          <Input type="time" aria-label={`Sign in time, ${date}`} className="tabular" value={row.sign_in_time} onChange={e => onChange({ sign_in_time: e.target.value })} />
          <SignatureField label={`Sign in, ${date}`} signerName={employeeName} value={row.sign_in_signature} reuseSignatures={reuseSignatures} onChange={v => onChange({ sign_in_signature: v })} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-sans text-caption text-ink-muted">Out</span>
          <Input type="time" aria-label={`Sign out time, ${date}`} className="tabular" value={row.sign_out_time} onChange={e => onChange({ sign_out_time: e.target.value })} />
          <SignatureField label={`Sign out, ${date}`} signerName={employeeName} value={row.sign_out_signature} reuseSignatures={reuseSignatures} onChange={v => onChange({ sign_out_signature: v })} />
        </div>
      </div>

      <CommentField value={row.comments} dateLabel={date} onChange={v => onChange({ comments: v })} />
    </article>
  );
}

export function DayCards({ rows, employeeName, employeeMineNo, sources, year, month, reuseSignatures, onChange }: {
  rows: ArtisanTimesheetDayRow[];
  employeeName: string;
  employeeMineNo: string;
  sources: AutoPopulateSources;
  year: number;
  month: number;
  reuseSignatures: SignatureReuseOption[];
  onChange: (rows: ArtisanTimesheetDayRow[]) => void;
}) {
  const totals = calcArtisanTimesheetTotals(rows);
  const pendingByDay = useMemo(() => new Map(rows.map(r => [r.date, pendingForDay(sources, employeeMineNo, r.date)] as const)), [rows, sources, employeeMineNo]);
  const pendingFootnote = useMemo(() => pendingFootnoteText(pendingMonthTotals(sources, employeeMineNo, year, month)), [sources, employeeMineNo, year, month]);
  const update = (i: number, patch: Partial<ArtisanTimesheetDayRow>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch, _auto: false } : r)));
  const standbyDays = rows.filter(r => r.on_standby).length;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Month totals" className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="font-display text-metric tabular text-ink">{totals.ot_15.toFixed(2)}h</p>
            <p className="mt-0.5 font-sans text-caption text-ink-muted">Overtime @ 1.5×</p>
          </div>
          <div>
            <p className="font-display text-title font-semibold tabular text-ink">{totals.ot_20.toFixed(2)}h</p>
            <p className="mt-0.5 font-sans text-caption text-ink-muted">Overtime @ 2.0×</p>
          </div>
          <div>
            <p className="font-display text-title font-semibold text-ink">{standbyDays} {standbyDays === 1 ? 'day' : 'days'}</p>
            <p className="mt-0.5 font-sans text-caption text-ink-muted">Standby</p>
          </div>
          <div>
            <p className="font-display text-title font-semibold tabular text-ink">{totals.normal_hrs.toFixed(2)}h</p>
            <p className="mt-0.5 font-sans text-caption text-ink-muted">Normal (leave only)</p>
          </div>
        </div>
        {pendingFootnote && <p className="mt-3 font-sans text-body-sm text-warning">{pendingFootnote}</p>}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r, i) => (
          <DayCard key={r.date} row={r} employeeName={employeeName} pending={pendingByDay.get(r.date) ?? { leaves: [], overtime: [] }} reuseSignatures={reuseSignatures} onChange={patch => update(i, patch)} />
        ))}
      </div>
    </div>
  );
}
