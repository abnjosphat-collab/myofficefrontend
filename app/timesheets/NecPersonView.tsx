// app/timesheets/NecPersonView.tsx — one NEC person's period on the shared timesheet shells: who and which
// period, the days (day cards or the quick-view table), and the per-person download. The look is the artisan
// editor's; the figures are NEC throughout — per-day buckets from necDayBuckets, period totals from
// calcEmployeeTotals (the 208 cap and floor, excess over the cap, standby runs), and edits through the NEC
// entry dialog. Entries save as they are made; nothing here holds unsaved state.
'use client';

import { useMemo } from 'react';
import { Button, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Tag, usePersistentState } from '@/components/ui-system';
import { typeOf } from '@/app/leaves/leaveTypes';
import { DayBreakdown, type BreakdownRecord } from '@/components/shared/timesheet/DayBreakdown';
import { DayCard, DayCardsShell, DayHoursList } from '@/components/shared/timesheet/DayCards';
import { DayTable, DayTableNum, type DayTableRow } from '@/components/shared/timesheet/DayTable';
import { TotalsStrip } from '@/components/shared/timesheet/TotalsStrip';
import { otTypeLabel } from '@/components/shared/timesheet/overtimeLabels';
import { formatDate } from '@/lib/format';
import { zimHolidayName } from '@/lib/zimHolidays';
import { buildEarlyMorningOtDatesForEmployee, buildModuleOt15ByDateForEmployee } from './calcTotals';
import { normalizeTimesheetEmployeeCode } from './employeeCode';
import { approvedOvertimeHours } from './mergeEffectiveTimesheets';
import { moduleRecordIncluded } from './moduleApproval';
import { ModuleApprovalIndicator } from './ModuleApprovalIndicator';
import { necDayBuckets, type NecDayBuckets } from './necDayBuckets';
import { fmtDate, fmtPeriod, statusMeta } from './timesheetMeta';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord, Employee, HourTotals, Period, TimesheetEntry } from './types';

const COLUMNS = [
  { header: 'Date' },
  { header: 'Day' },
  { header: 'Status' },
  { header: 'Normal', align: 'center' as const },
  { header: 'OT 1.5', align: 'center' as const },
  { header: 'OT 2.0', align: 'center' as const },
  { header: 'Night', align: 'center' as const },
  { header: 'Standby', align: 'center' as const },
  { header: 'In', align: 'center' as const },
  { header: 'Out', align: 'center' as const },
];

const weekdayOf = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short' });
const isApproved = (status: string) => status.trim().toLowerCase() === 'approved';

interface NecDay {
  day: Date;
  ds: string;
  label: string;
  entry?: TimesheetEntry;
  buckets: NecDayBuckets;
  leave?: ApprovedLeaveRecord;
  pendingLeave?: ApprovedLeaveRecord;
  overtime: ApprovedOvertimeRecord[];
  pendingOvertime: ApprovedOvertimeRecord[];
  holiday: string | null;
}

const otLine = (ot: ApprovedOvertimeRecord, prefix = ''): BreakdownRecord => ({
  key: `${prefix}${ot.date}-${ot.start_time}-${ot.end_time}-${ot.id ?? ''}`,
  tag: otTypeLabel(ot.overtime_type),
  time: `${ot.start_time || '?'}–${ot.end_time || '?'} (${approvedOvertimeHours(ot).toFixed(1)}h)`,
  note: ot.reason,
});

export function NecPersonView({ employee, period, days, entries, approvedLeaves, approvedOvertime, totals, onEditDay, onDownload }: {
  employee: Employee;
  period: Period;
  days: Date[];
  /** The effective (merged) entries for the whole roster; this view picks the person's days. */
  entries: TimesheetEntry[];
  approvedLeaves: ApprovedLeaveRecord[];
  approvedOvertime: ApprovedOvertimeRecord[];
  /** The person's authoritative period figures from calcEmployeeTotals. */
  totals: HourTotals;
  onEditDay: (day: Date, entry?: TimesheetEntry) => void;
  onDownload: () => void;
}) {
  const [daysView, setDaysView] = usePersistentState<'cards' | 'quick'>('myoffice_nec_dayview', 'quick', raw => (raw === 'cards' || raw === 'quick' ? raw : undefined));
  const mine = normalizeTimesheetEmployeeCode(employee.employeeId);
  const moduleOt15 = useMemo(() => buildModuleOt15ByDateForEmployee(employee.employeeId, approvedOvertime), [employee.employeeId, approvedOvertime]);
  const earlyMorning = useMemo(() => buildEarlyMorningOtDatesForEmployee(employee.employeeId, approvedOvertime), [employee.employeeId, approvedOvertime]);

  const necDays: NecDay[] = useMemo(() => days.map(day => {
    const ds = fmtDate(day);
    const entry = entries.find(ts => String(ts.employee_id) === String(employee.id) && ts.date === ds);
    const buckets = entry
      ? necDayBuckets(entry, { moduleOt15ForDay: moduleOt15[ds] ?? 0, earlyMorningModuleOt: earlyMorning.has(ds) })
      : { normal: 0, ot15Module: 0, ot20: 0, nightAllowance: 0, nightExcess: 0, standby: false };
    const mineLeave = (l: ApprovedLeaveRecord) => normalizeTimesheetEmployeeCode(l.employee_id) === mine && ds >= l.start_date && ds <= l.end_date && moduleRecordIncluded(l.status);
    const mineOt = (ot: ApprovedOvertimeRecord) => normalizeTimesheetEmployeeCode(ot.employee_id) === mine && ot.date === ds && moduleRecordIncluded(ot.status);
    const dayLeaves = approvedLeaves.filter(mineLeave);
    const dayOt = approvedOvertime.filter(mineOt);
    return {
      day, ds, label: formatDate(day), entry, buckets,
      leave: dayLeaves.find(l => isApproved(l.status)),
      pendingLeave: dayLeaves.find(l => !isApproved(l.status)),
      overtime: dayOt.filter(ot => isApproved(ot.status)),
      pendingOvertime: dayOt.filter(ot => !isApproved(ot.status)),
      holiday: zimHolidayName(ds),
    };
  }), [days, entries, employee.id, mine, approvedLeaves, approvedOvertime, moduleOt15, earlyMorning]);

  const footnotes = useMemo(() => {
    const notes: string[] = [];
    if ((totals.excess ?? 0) > 0) notes.push(`${totals.excess!.toFixed(1)}h over the 208 cap counts at 1.5×.`);
    if (totals.reg === 208 && totals.actual < 208) notes.push('Regular floored to 208 (no absence this period).');
    if (totals.night > 0) notes.push(`Includes ${totals.night.toFixed(1)}h stored night hours above the allowance.`);
    return notes.join(' ');
  }, [totals]);

  const h = (v: number) => `${v.toFixed(1)}h`;
  const totalsStrip = (
    <TotalsStrip
      label={`${employee.name}'s period totals`}
      figures={[
        { value: h(totals.actual), label: 'Actual hours', note: 'reporting figure, uncapped' },
        { value: h(totals.reg), label: 'Regular (payable)', note: totals.actual > 208 ? 'capped at 208' : undefined },
        { value: h(totals.ot15), label: 'Overtime 1.5×', dim: totals.ot15 === 0 },
        { value: h(totals.ot20), label: 'Overtime 2.0×', dim: totals.ot20 === 0 },
        { value: h(totals.nightAllowanceBonus), label: 'Night allowance', dim: totals.nightAllowanceBonus === 0 },
        { value: h(totals.standbyBonus), label: 'Standby', dim: totals.standbyBonus === 0 },
      ]}
      foot={(
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-body-sm text-ink-muted">Payable total</p>
          <p className="font-sans text-title font-semibold tabular text-action">{h(totals.total)}</p>
        </div>
      )}
      footnote={footnotes || undefined}
    />
  );

  const breakdownFor = (d: NecDay) => {
    const extraLines: string[] = [];
    if (d.buckets.nightAllowance > 0) {
      const span = d.entry?.start_time && d.entry?.end_time ? ` from ${d.entry.start_time}–${d.entry.end_time}` : '';
      extraLines.push(`Night allowance ${d.buckets.nightAllowance.toFixed(1)}h${span}.`);
    }
    if (d.buckets.nightExcess > 0) extraLines.push(`Plus ${d.buckets.nightExcess.toFixed(1)}h stored night hours above the allowance.`);
    return (
      <DayBreakdown
        dateLabel={d.label}
        records={d.overtime.map(ot => otLine(ot))}
        pendingRecords={d.pendingOvertime.map(ot => otLine(ot, 'pending-'))}
        warnings={[]}
        leaveLine={d.leave ? `Leave: ${typeOf(d.leave.leave_type).name} ${d.leave.start_date} → ${d.leave.end_date}${d.leave.reason?.trim() ? ` — ${d.leave.reason.trim()}` : ''}` : undefined}
        pendingLeaveLine={d.pendingLeave ? `Leave requested: ${typeOf(d.pendingLeave.leave_type).name} ${d.pendingLeave.start_date} → ${d.pendingLeave.end_date}${d.pendingLeave.reason?.trim() ? ` — ${d.pendingLeave.reason.trim()}` : ''}` : undefined}
        holidayLine={d.holiday ? `Public holiday: ${d.holiday}.` : undefined}
        extraLines={extraLines}
        standbyLine={d.entry?.standby_allowance ? 'Standby on — the 8h bonus counts once per run in the foot.' : 'Standby off.'}
        emptyText="No overtime, leave or holiday records — the hours were entered by hand."
      />
    );
  };
  const breakable = (d: NecDay) =>
    d.overtime.length > 0 || !!d.leave || !!d.holiday || d.pendingOvertime.length > 0 || !!d.pendingLeave ||
    !!d.entry?.standby_allowance || d.buckets.nightAllowance > 0 || !!d.entry?.notes?.trim();

  const tableRows: DayTableRow[] = necDays.map(d => {
    const meta = d.entry ? statusMeta(d.entry.status) : null;
    const pending = d.pendingOvertime.length > 0 || !!d.pendingLeave;
    return {
      key: d.ds,
      cells: [
        <button
          key="edit" type="button" onClick={() => onEditDay(d.day, d.entry)}
          aria-label={d.entry ? `Edit ${d.label}` : `Add an entry for ${d.label}`}
          title={d.entry ? `Edit ${d.label}` : `Add an entry for ${d.label}`}
          className="focus-ring rounded-control hover:underline"
        >
          {d.label}
          {d.entry?._auto && <span className="ml-1 inline-block size-1.5 rounded-full bg-action align-middle" title="Came from leave, overtime or a holiday and is not saved yet — edit the day to review it."><span className="sr-only">Not saved yet</span></span>}
        </button>,
        <span key="day" className="text-ink-muted">{weekdayOf(d.day)}</span>,
        <span key="status">
          <span className="block max-w-36 truncate">{d.entry ? (meta!.short || '—') : '—'}</span>
          {pending && <StatusBadge tone="warning">Pending</StatusBadge>}
        </span>,
        <DayTableNum key="n" value={d.buckets.normal} decimals={1} />,
        <DayTableNum key="o15" value={d.buckets.ot15Module} decimals={1} bold />,
        <DayTableNum key="o20" value={d.buckets.ot20} decimals={1} />,
        <DayTableNum key="ng" value={d.buckets.nightAllowance} decimals={1} />,
        d.entry?.standby_allowance ? <span key="sb" className="font-medium">SB</span> : <span key="sb" className="text-ink-subtle">—</span>,
        <span key="in" className="tabular text-ink">{d.entry?.start_time || <span className="text-ink-subtle">—</span>}</span>,
        <span key="out" className="tabular text-ink">{d.entry?.end_time || <span className="text-ink-subtle">—</span>}</span>,
      ],
      detail: breakable(d) ? { id: `nec-${d.ds}`, label: d.label, content: breakdownFor(d) } : undefined,
    };
  });
  const standbyRuns = totals.standbyBonus / 8;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="This timesheet" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="font-display text-title font-semibold text-ink">{employee.name}, {fmtPeriod(period)}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([['Mine number', employee.employeeId], ['Department', employee.department], ['Position', employee.position]] as const).map(([k, v]) => (
            <div key={k} className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">{k}</dt><dd className="font-sans text-body text-ink [overflow-wrap:anywhere]">{v || 'Not recorded'}</dd></div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-subtle px-4 py-2.5">
        <p className="max-w-3xl font-sans text-caption text-ink-muted">Days marked with a dot came from leave, overtime or a holiday and are not saved yet. Tap a day to enter or change it — entries save as you make them.</p>
        <Button icon="download" onClick={onDownload}>Download this person</Button>
      </div>

      <Tabs value={daysView} onValueChange={v => setDaysView(v === 'quick' ? 'quick' : 'cards')}>
        <TabsList aria-label="How the days are shown">
          <TabsTrigger value="cards" icon="grid-view">Day cards</TabsTrigger>
          <TabsTrigger value="quick" icon="table-view">Quick view</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4">
          <DayCardsShell totals={totalsStrip}>
            {necDays.map(d => {
              const meta = d.entry ? statusMeta(d.entry.status) : null;
              const ot = d.buckets.ot15Module + d.buckets.ot20;
              return (
                <DayCard
                  key={d.ds}
                  titleId={`nec-day-${d.ds}`}
                  title={`${weekdayOf(d.day)}, ${d.label}`}
                  auto={d.entry?._auto ? { title: 'Came from leave, overtime or a holiday and is not saved yet — edit the day to review it.', srLabel: 'Not saved yet' } : undefined}
                  headline={ot > 0 ? `${ot.toFixed(1)}h OT` : undefined}
                  badges={(
                    <>
                      {d.entry ? <StatusBadge tone={meta!.tone}>{meta!.label}</StatusBadge> : <span className="font-sans text-body-sm text-ink-muted">No entry yet</span>}
                      {d.holiday && <Tag>{d.holiday}</Tag>}
                      {d.entry?.standby_allowance && <StatusBadge tone="warning">Standby</StatusBadge>}
                      {(d.pendingOvertime.length > 0 || d.pendingLeave) && <StatusBadge tone="warning">Awaiting approval</StatusBadge>}
                    </>
                  )}
                >
                  <DayHoursList
                    lines={[
                      d.buckets.normal > 0 && { label: 'Normal', value: `${d.buckets.normal.toFixed(1)}h` },
                      d.buckets.ot15Module > 0 && { label: 'Overtime @ 1.5×', value: `${d.buckets.ot15Module.toFixed(1)}h` },
                      d.buckets.ot20 > 0 && { label: 'Overtime @ 2.0×', value: `${d.buckets.ot20.toFixed(1)}h` },
                      d.buckets.nightAllowance > 0 && { label: 'Night allowance', value: `${d.buckets.nightAllowance.toFixed(1)}h` },
                    ].filter((l): l is { label: string; value: string } => l !== false)}
                    emptyText={d.entry ? 'No hours recorded.' : 'Nothing entered for this day yet.'}
                  />
                  {d.entry && <p className="font-sans text-body-sm tabular text-ink-muted">Shift {d.entry.start_time || '—'} – {d.entry.end_time || '—'}</p>}
                  {d.entry?.notes?.trim() && <p className="font-sans text-body-sm text-ink-muted">{d.entry.notes.trim()}</p>}
                  {d.entry && <ModuleApprovalIndicator approval={d.entry._moduleApproval} />}
                  <div><Button size="sm" icon={d.entry ? 'edit' : 'plus'} onClick={() => onEditDay(d.day, d.entry)}>{d.entry ? 'Edit day' : 'Add entry'}</Button></div>
                </DayCard>
              );
            })}
          </DayCardsShell>
        </TabsContent>
        <TabsContent value="quick" className="mt-4">
          <div className="flex flex-col gap-4">
            {totalsStrip}
            <DayTable
              caption={`${employee.name}'s days: status, shift times and computed hours`}
              regionLabel={`${employee.name}'s days at a glance (scrollable)`}
              columns={COLUMNS}
              rows={tableRows}
              footerLabel="Period totals"
              footerLabelSpan={3}
              footerCells={[
                { content: totals.actual.toFixed(1) },
                { content: totals.ot15.toFixed(1) },
                { content: totals.ot20.toFixed(1) },
                { content: totals.nightAllowanceBonus.toFixed(1) },
                { content: standbyRuns > 0 ? <>{standbyRuns} {standbyRuns === 1 ? 'run' : 'runs'}</> : '0', title: 'Standby runs (8h each)' },
                { content: <span className="sr-only">No total for shift times</span>, colSpan: 2 },
              ]}
              footerFiller={<span className="sr-only">No total for breakdown</span>}
              footnote={footnotes || undefined}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
