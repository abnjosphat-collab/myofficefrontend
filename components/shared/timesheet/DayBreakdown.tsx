// components/shared/timesheet/DayBreakdown.tsx — "what makes up this day", shared by the artisan and NEC
// timesheets: the overtime records behind the figures, the leave and holiday lines, what is still awaiting
// approval (never counted), and the standby line. Every line is caller-formatted; the shell owns the layout.
'use client';

import { Tag } from '@/components/ui-system';

export interface BreakdownRecord {
  key: string;
  tag: string;
  time: string;
  note?: string;
}

function RecordList({ records }: { records: BreakdownRecord[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {records.map(r => (
        <li key={r.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-body-sm">
          <Tag>{r.tag}</Tag>
          <span className="tabular text-ink">{r.time}</span>
          {r.note?.trim() && <span className="min-w-0 flex-1 basis-40 truncate text-ink-muted">{r.note.trim()}</span>}
        </li>
      ))}
    </ul>
  );
}

export function DayBreakdown({ dateLabel, records, pendingRecords, warnings, leaveLine, pendingLeaveLine, holidayLine, extraLines, standbyLine, emptyText }: {
  dateLabel: string;
  records: BreakdownRecord[];
  pendingRecords: BreakdownRecord[];
  warnings: string[];
  leaveLine?: string;
  pendingLeaveLine?: string;
  holidayLine?: string;
  /** Caller-specific lines between the holiday and the standby (the NEC night allowance). */
  extraLines?: string[];
  standbyLine?: string;
  emptyText: string;
}) {
  const bare = records.length === 0 && !leaveLine && !holidayLine && pendingRecords.length === 0 && !pendingLeaveLine;
  return (
    <div className="flex flex-col gap-2 px-2 py-2 text-left">
      <p className="font-sans text-caption font-semibold text-ink">What makes up {dateLabel}</p>
      {bare && <p className="font-sans text-body-sm text-ink-muted">{emptyText}</p>}
      {warnings.map(w => (
        <p key={w} className="font-sans text-caption font-semibold text-warning">{w}</p>
      ))}
      {records.length > 0 && <RecordList records={records} />}
      {leaveLine && <p className="font-sans text-body-sm text-ink-muted">{leaveLine}</p>}
      {(pendingRecords.length > 0 || pendingLeaveLine) && (
        <div className="flex flex-col gap-1">
          <p className="font-sans text-caption font-semibold text-warning">Awaiting approval — not counted in the hours above.</p>
          {pendingRecords.length > 0 && <RecordList records={pendingRecords} />}
          {pendingLeaveLine && <p className="font-sans text-body-sm text-ink-muted">{pendingLeaveLine}</p>}
        </div>
      )}
      {holidayLine && <p className="font-sans text-body-sm text-ink-muted">{holidayLine}</p>}
      {(extraLines ?? []).map(l => (
        <p key={l} className="font-sans text-body-sm text-ink-muted">{l}</p>
      ))}
      {standbyLine && <p className="font-sans text-body-sm text-ink-muted">{standbyLine}</p>}
    </div>
  );
}
