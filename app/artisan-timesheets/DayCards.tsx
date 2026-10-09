// app/artisan-timesheets/DayCards.tsx — the month as day cards, readable and
// tappable on a phone: one card per day with its status, the system-filled hours
// (read-only — overtime is computed, not typed), a standby toggle, sign-in/out
// with native time inputs, and comments. A totals summary leads. One layout at
// every width (1/2/3 columns), so there is no separate desktop grid to drift.
// The cards and the totals are the shared timesheet shells; this file owns the
// artisan behaviour.
'use client';

import { useMemo } from 'react';
import { Checkbox, Input, StatusBadge, Tag, cn } from '@/components/ui-system';
import type { SignatureReuseOption } from '@/components/shared/SignaturePad';
import { SignatureField } from '@/components/shared/SignatureField';
import { DayCard, DayCardsShell, DayHoursList } from '@/components/shared/timesheet/DayCards';
import { TotalsStrip } from '@/components/shared/timesheet/TotalsStrip';
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
  return <DayHoursList lines={all.filter(([, n]) => n > 0).map(([label, n]) => ({ label, value: `${n.toFixed(2)}h` }))} emptyText="No hours recorded." />;
}

function ArtisanDayCard({ row, employeeName, pending, reuseSignatures, onChange }: {
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
  const hasPending = pending.leaves.length > 0 || pending.overtime.length > 0;
  return (
    <DayCard
      titleId={`day-${row.date}`}
      title={`${row.day}, ${date}`}
      auto={row._auto ? { title: 'Filled from leave, overtime, standby or holidays', srLabel: 'Filled from the system' } : undefined}
      headline={dayOt > 0 ? `${dayOt.toFixed(2)}h OT` : undefined}
      badges={(tone || holiday || hasPending) ? (
        <>
          {tone && <StatusBadge tone={tone}>{dayStatusLabel(row.day_status)}</StatusBadge>}
          {holiday && <Tag>{holiday}</Tag>}
          {hasPending && (
            <>
              <StatusBadge tone="warning">Awaiting approval</StatusBadge>
              <span className="font-sans text-body-sm text-ink-muted">{pendingSummaryText(pending)}</span>
            </>
          )}
        </>
      ) : undefined}
    >
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
    </DayCard>
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
    <DayCardsShell
      totals={(
        <TotalsStrip
          label="Month totals"
          figures={[
            { value: `${totals.ot_15.toFixed(2)}h`, label: 'Overtime @ 1.5×', hero: true },
            { value: `${totals.ot_20.toFixed(2)}h`, label: 'Overtime @ 2.0×' },
            { value: `${standbyDays} ${standbyDays === 1 ? 'day' : 'days'}`, label: 'Standby' },
            { value: `${totals.normal_hrs.toFixed(2)}h`, label: 'Normal (leave only)' },
          ]}
          footnote={pendingFootnote || undefined}
        />
      )}
    >
      {rows.map((r, i) => (
        <ArtisanDayCard key={r.date} row={r} employeeName={employeeName} pending={pendingByDay.get(r.date) ?? { leaves: [], overtime: [] }} reuseSignatures={reuseSignatures} onChange={patch => update(i, patch)} />
      ))}
    </DayCardsShell>
  );
}
