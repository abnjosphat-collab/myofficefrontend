// app/overtime/BudgetView.tsx — the Overtime Budget tab: forecast average monthly
// overtime per employee for HR, in the shape of the FY2027 split-budget workbook
// (one sheet per department), with a matching Excel download. NEC shift overtime
// (OT @ 1.5 Shift) comes from the NEC Timesheets module only; OT @ 2.0 Shift
// (holiday/off-day working) and OT @ 1.5 Adhoc come from the Overtime module
// only. Data arrives through the existing authenticated fetchers, so the tab
// respects the same access permissions as the rest of the page.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, DataTable, EXPORT_CHECK_MS, EmptyState, ExportButton, LoadingPulse, MetricGrid,
  MetricTile, Notice, StatusBadge, useActionFeedback, type Column,
} from '@/components/ui-system';
import type { EmployeeLookup } from '@/hooks/useLookups';
import { toLocalISODate } from '@/lib/dates';
import type { ApprovedOvertimeRecord } from '../timesheets/types';
import type { ShiftAssignment } from '../shifts/types';
import { api as tsApi } from '../timesheets/useTimesheetsData';
import { BUDGET_OCT_PERIOD, BUDGET_SEP_PERIOD, adhocTotals, budgetTotals, buildSplitBudgetRows, periodActuals, toBudgetEmployees, type BudgetRow } from './budgetReport';
import { downloadSplitBudgetReport } from './exportBudgetReport';
import type { OTRecord } from './types';

const hrs = (n: number | null) => (n == null ? '—' : `${n.toFixed(2)}h`);

const STATUS_TONE = { OK: 'success', Incomplete: 'warning', Missing: 'danger', 'Non-NEC': 'neutral', Unclassified: 'warning' } as const;

const COLUMNS: Column<BudgetRow>[] = [
  {
    id: 'employee', header: 'Employee', sortable: false,
    cell: r => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{r.firstName} {r.surname}</p>
        <p className="text-caption text-ink-muted">{r.employeeId} · {r.occupation} · {r.costCentre || r.department}</p>
      </div>
    ),
  },
  { id: 'ot15shift', header: 'OT @ 1.5 Shift', numeric: true, cell: r => <span className="tabular">{r.ot15Shift == null ? '—' : r.ot15Shift.toFixed(2)}</span> },
  { id: 'ot15adhoc', header: 'OT @ 1.5 Adhoc', numeric: true, cell: r => <span className="tabular">{r.ot15Adhoc.toFixed(2)}</span> },
  { id: 'ot20shift', header: 'OT @ 2.0 Shift', numeric: true, cell: r => <span className="tabular">{r.ot20Shift.toFixed(2)}</span> },
  {
    id: 'comment', header: 'Comment',
    cell: r => (
      r.status === 'OK' ? <span className="text-ink-muted">—</span> : (
        <div className="flex flex-col gap-1">
          <StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge>
          <span className="text-caption text-ink-muted">{r.comment}</span>
        </div>
      )
    ),
  },
];

interface PeriodFetch {
  sepTs: import('../timesheets/types').TimesheetEntry[];
  sepLv: import('../timesheets/types').ApprovedLeaveRecord[];
  octTs: import('../timesheets/types').TimesheetEntry[];
  octLv: import('../timesheets/types').ApprovedLeaveRecord[];
  shifts: ShiftAssignment[];
}

export function BudgetView({ records, register, otLoaded }: { records: OTRecord[]; register: EmployeeLookup[]; otLoaded: boolean }) {
  const [periods, setPeriods] = useState<PeriodFetch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fb = useActionFeedback(EXPORT_CHECK_MS);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [sepTs, sepLv, octTs, octLv, shifts] = await Promise.all([
          tsApi.timesheets(toLocalISODate(BUDGET_SEP_PERIOD_START), toLocalISODate(BUDGET_SEP_PERIOD_END), controller.signal),
          tsApi.moduleLeaves({ start: BUDGET_SEP_PERIOD_START, end: BUDGET_SEP_PERIOD_END }, true, controller.signal),
          tsApi.timesheets(toLocalISODate(BUDGET_OCT_PERIOD_START), toLocalISODate(BUDGET_OCT_PERIOD_END), controller.signal),
          tsApi.moduleLeaves({ start: BUDGET_OCT_PERIOD_START, end: BUDGET_OCT_PERIOD_END }, true, controller.signal),
          tsApi.shiftAssignments(controller.signal),
        ]);
        if (!live) return;
        setPeriods({ sepTs, sepLv, octTs, octLv, shifts });
        setLoading(false);
      } catch (e) {
        if (!live) return;
        setError(e instanceof Error ? e.message : 'The timesheets could not be loaded.');
        setLoading(false);
      }
    })();
    return () => { live = false; controller.abort(); };
  }, [attempt]);

  const employees = useMemo(() => toBudgetEmployees(register), [register]);
  const approvedOt = useMemo<ApprovedOvertimeRecord[]>(() => records.map(r => ({
    id: typeof r.id === 'number' ? r.id : undefined,
    employee_id: r.employee_id, overtime_type: r.overtime_type, date: r.date,
    start_time: r.start_time, end_time: r.end_time, status: r.status,
    hours: r.hours, reason: r.reason,
  })), [records]);

  const computed = useMemo(() => {
    if (!periods) return null;
    const sep = periodActuals(employees, periods.sepTs, periods.sepLv, approvedOt, periods.shifts, { start: BUDGET_SEP_PERIOD_START, end: BUDGET_SEP_PERIOD_END });
    const oct = periodActuals(employees, periods.octTs, periods.octLv, approvedOt, periods.shifts, { start: BUDGET_OCT_PERIOD_START, end: BUDGET_OCT_PERIOD_END });
    const adhoc = adhocTotals(records, employees);
    const rows = buildSplitBudgetRows(employees, sep, oct, adhoc.byKey);
    // This report fills the ENGINEERING sheet: show and download Engineering only.
    const engRows = rows.filter(r => r.sheet === 'ENGINEERING');
    return { rows, engRows, totals: budgetTotals(rows), engTotals: budgetTotals(engRows), orphanCount: adhoc.orphanCount, orphanHours: adhoc.orphanHours };
  }, [periods, employees, approvedOt, records]);

  const download = () => fb.run(async () => {
    if (!computed) throw new Error('nothing to download yet');
    try { await downloadSplitBudgetReport(computed.engRows); toast.success('Overtime Budget downloaded.'); }
    catch (e) { toast.error(`The download failed: ${(e as Error).message}`); throw e; }
  });

  const ready = otLoaded && !loading && !error && computed;
  const shown = computed?.engRows ?? [];
  const incomplete = shown.filter(r => r.status === 'Incomplete').length;
  const missing = shown.filter(r => r.status === 'Missing').length;
  const unclassified = shown.filter(r => r.status === 'Unclassified').length;
  const elsewhere = (computed?.rows.length ?? 0) - shown.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-sans text-heading-sm font-semibold text-ink">Overtime Budget — Engineering</h2>
          <p className="mt-1 font-sans text-body-sm text-ink-muted">
            Forecast monthly overtime for the ENGINEERING sheet of the FY2027 split-budget workbook.
            OT @ 1.5 Shift averages the two NEC pay periods ending 12 September 2026 and 12 October
            2026: actual hours above 208 per period (NEC employees, from NEC timesheets). OT @ 2.0
            Shift covers holiday and off-day working, and OT @ 1.5 Adhoc every other overtime hour —
            both averaged from Overtime-module records for July to September 2026 (total ÷ 3).
            Averages are withheld — never zeroed — when a NEC pay period is missing or incomplete.
            {computed && ` Showing ${shown.length} of ${computed.rows.length} employees; the download contains the ENGINEERING sheet only.`}
          </p>
        </div>
        {ready && <ExportButton label="Download Excel" onPress={download} pending={fb.pending} success={fb.success} />}
      </div>

      {loading || !otLoaded ? (
        <LoadingPulse compact label="Loading budget data" />
      ) : error || !computed ? (
        <Notice
          tone="danger" title="The budget data could not be loaded"
          action={<Button size="sm" variant="secondary" onClick={() => setAttempt(a => a + 1)}>Retry</Button>}
        >
          <p className="font-sans text-body-sm">{error ?? 'The timesheets could not be loaded.'}</p>
        </Notice>
      ) : shown.length === 0 ? (
        <EmptyState icon="employees" title="No Engineering employees on the register" description="Add employees in Personnel before forecasting the overtime budget." />
      ) : (
        <>
          <MetricGrid compact>
            <MetricTile compact label="Engineering employees" value={shown.length} />
            <MetricTile compact label="OT @ 1.5 Shift" value={`${hrs(computed.engTotals.total15Shift)}`} detail="Sum of shift averages" />
            <MetricTile compact label="OT @ 1.5 Adhoc" value={`${hrs(computed.engTotals.total15Adhoc)}`} detail="Sum of Adhoc averages" />
            <MetricTile compact label="OT @ 2.0 Shift" value={`${hrs(computed.engTotals.total20Shift)}`} detail="Sum of 2.0 averages" />
          </MetricGrid>

          {(incomplete > 0 || missing > 0 || unclassified > 0 || elsewhere > 0 || computed.orphanCount > 0) && (
            <Notice tone={missing > 0 ? 'warning' : 'info'} title="Data quality">
              <p className="font-sans text-body-sm">
                {[
                  incomplete > 0 ? `${incomplete} incomplete NEC ${incomplete === 1 ? 'record' : 'records'} (average withheld)` : '',
                  missing > 0 ? `${missing} missing NEC ${missing === 1 ? 'period' : 'periods'} (average withheld)` : '',
                  unclassified > 0 ? `${unclassified} without an employment type in Personnel` : '',
                  elsewhere > 0 ? `${elsewhere} ${elsewhere === 1 ? 'employee' : 'employees'} on other departments (not shown)` : '',
                  computed.orphanCount > 0 ? `${computed.orphanCount} overtime ${computed.orphanCount === 1 ? 'record' : 'records'} for people outside the register (${computed.orphanHours.toFixed(2)}h, excluded from rows)` : '',
                ].filter(Boolean).join(' · ')}.
              </p>
            </Notice>
          )}

          <DataTable caption="Overtime Budget forecast — Engineering" rows={shown} columns={COLUMNS} getRowId={r => r.employeeId} stillKey={shown.length} />
        </>
      )}
    </div>
  );
}

// Period bounds mirror the canonical Period objects in budgetReport.ts.
const BUDGET_SEP_PERIOD_START = BUDGET_SEP_PERIOD.start;
const BUDGET_SEP_PERIOD_END = BUDGET_SEP_PERIOD.end;
const BUDGET_OCT_PERIOD_START = BUDGET_OCT_PERIOD.start;
const BUDGET_OCT_PERIOD_END = BUDGET_OCT_PERIOD.end;
