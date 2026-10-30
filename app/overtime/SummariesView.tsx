// app/overtime/SummariesView.tsx — custom overtime summaries for any period,
// covering everybody in Personnel. Pick a date range and departments, generate,
// then download the workbook (one sheet per department, same columns as the
// FY2027 split budget). OT @ 1.5 Shift comes from live NEC timesheets: actual
// hours above the 208h monthly cap, pro-rated to the range. OT @ 2.0 Shift and
// OT @ 1.5 Adhoc come from the Overtime module, averaged over the calendar
// months the range touches. Whole hours; Comment names each person's top cause.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, DataTable, EXPORT_CHECK_MS, EmptyState, ExportButton, LoadingPulse, MetricGrid,
  MetricTile, Notice, useActionFeedback, type Column,
} from '@/components/ui-system';
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { ApprovedOvertimeRecord } from '../timesheets/types';
import type { ShiftAssignment } from '../shifts/types';
import { api as tsApi } from '../timesheets/useTimesheetsData';
import { adhocTotals, budgetTotals, buildSplitBudgetRows, toBudgetEmployees, type BudgetRow, type BudgetTotals } from './budgetReport';
import { downloadSummaryWorkbook } from './exportBudgetReport';
import { daysInRange, defaultSummaryRange, monthsInRange, rangeActuals, shiftCapForRange } from './summaryReport';
import type { OTRecord } from './types';

const hrs = (n: number | null) => (n == null ? '—' : `${n.toFixed(0)}`);

const COLUMNS: Column<BudgetRow>[] = [
  {
    id: 'employee', header: 'Employee', sortable: false,
    cell: r => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{r.firstName} {r.surname}</p>
        <p className="text-caption text-ink-muted">{r.employeeId} · {r.occupation} · {r.department}</p>
      </div>
    ),
  },
  { id: 'ot15shift', header: 'OT @ 1.5 Shift', numeric: true, cell: r => <span className="tabular">{r.ot15Shift == null ? '—' : r.ot15Shift.toFixed(0)}</span> },
  { id: 'ot15adhoc', header: 'OT @ 1.5 Adhoc', numeric: true, cell: r => <span className="tabular">{r.ot15Adhoc.toFixed(0)}</span> },
  { id: 'ot20shift', header: 'OT @ 2.0 Shift', numeric: true, cell: r => <span className="tabular">{r.ot20Shift.toFixed(0)}</span> },
  {
    id: 'comment', header: 'Comment', cell: r => (
      r.comment ? <span className="text-body-sm text-ink">{r.comment}</span> : <span className="text-ink-muted">—</span>
    ),
  },
];

export function SummariesView({ records, register, otLoaded }: { records: OTRecord[]; register: EmployeeLookup[]; otLoaded: boolean }) {
  const initial = useMemo(() => defaultSummaryRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [excludedDepts, setExcludedDepts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fb = useActionFeedback(EXPORT_CHECK_MS);

  const employees = useMemo(() => toBudgetEmployees(register), [register]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.department))].sort(), [employees]);
  const [computed, setComputed] = useState<{
    rows: BudgetRow[]; totals: BudgetTotals; months: number; cap: number;
    orphanCount: number; orphanHours: number;
  } | null>(null);

  const approvedOt = useMemo<ApprovedOvertimeRecord[]>(() => records.map(r => ({
    id: typeof r.id === 'number' ? r.id : undefined,
    employee_id: r.employee_id, overtime_type: r.overtime_type, date: r.date,
    start_time: r.start_time, end_time: r.end_time, status: r.status,
    hours: r.hours, reason: r.reason,
  })), [records]);

  const generate = async () => {
    if (!from || !to) { toast.error('Pick a from and to date first.'); return; }
    setGenerating(true);
    setError(null);
    try {
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const [ts, lv, shifts] = await Promise.all([
        tsApi.timesheets(lo, hi),
        tsApi.moduleLeaves({ start: new Date(`${lo}T00:00:00`), end: new Date(`${hi}T00:00:00`) }, true),
        tsApi.shiftAssignments(),
      ]);
      const actuals = rangeActuals(employees, ts, lv, approvedOt, shifts as ShiftAssignment[], lo, hi);
      const cap = shiftCapForRange(daysInRange(lo, hi));
      const months = monthsInRange(lo, hi);
      const shift = new Map<string, number>();
      for (const emp of employees) {
        if (emp.employmentType !== 'NEC') continue;
        const a = actuals.get(emp.dbId);
        if (!a || a.filled === 0) continue;
        const ot = Math.max(0, Math.round(a.actual - cap));
        shift.set(emp.employeeId, ot);
      }
      const adhoc = adhocTotals(records, employees, lo, hi);
      const rows = buildSplitBudgetRows(employees, shift, adhoc.byKey, adhoc.causeByKey, months);
      setComputed({ rows, totals: budgetTotals(rows), months, cap, orphanCount: adhoc.orphanCount, orphanHours: adhoc.orphanHours });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The summary could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { setComputed(null); }, [from, to]);

  const toggleDept = (d: string) => setExcludedDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const shown = useMemo(() => (computed?.rows ?? []).filter(r => !excludedDepts.includes(r.department)), [computed, excludedDepts]);
  const shownTotals = useMemo(() => budgetTotals(shown), [shown]);

  const download = () => fb.run(async () => {
    if (!computed) throw new Error('nothing to download yet');
    try {
      await downloadSummaryWorkbook(shown, `overtime-summary_${from}_to_${to}`);
      toast.success('Overtime summary downloaded.');
    } catch (e) { toast.error(`The download failed: ${(e as Error).message}`); throw e; }
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-sans text-heading-sm font-semibold text-ink">Overtime summaries</h2>
          <p className="mt-1 font-sans text-body-sm text-ink-muted">
            Download overtime averages for everybody in Personnel over any period. OT @ 1.5 Shift
            uses live NEC timesheets (actual hours above the 208h monthly cap, pro-rated to the
            range); OT @ 2.0 Shift and OT @ 1.5 Adhoc average Overtime-module records over the
            calendar months touched. Whole hours; one sheet per department.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-sans text-body-sm text-ink">
              From
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="rounded border border-ink-muted px-2 py-1 font-sans text-body-sm" />
            </label>
            <label className="flex items-center gap-2 font-sans text-body-sm text-ink">
              To
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="rounded border border-ink-muted px-2 py-1 font-sans text-body-sm" />
            </label>
            <Button size="sm" variant="primary" disabled={generating || !otLoaded} onClick={() => void generate()}>
              {generating ? 'Generating…' : computed ? 'Regenerate' : 'Generate'}
            </Button>
            {computed && <ExportButton label="Download Excel" onPress={download} pending={fb.pending} success={fb.success} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {departments.map(d => (
              <label key={d} className="flex items-center gap-1 font-sans text-body-sm text-ink">
                <input type="checkbox" checked={!excludedDepts.includes(d)} onChange={() => toggleDept(d)} />
                {d}
              </label>
            ))}
          </div>
        </div>
      </div>

      {!otLoaded || generating ? (
        <LoadingPulse compact label={generating ? 'Building summary' : 'Loading overtime data'} />
      ) : error || !computed ? (
        <Notice
          tone="danger" title="The summary could not be generated"
          action={<Button size="sm" variant="secondary" onClick={() => void generate()}>Retry</Button>}
        >
          <p className="font-sans text-body-sm">{error ?? 'Pick a period and press Generate.'}</p>
        </Notice>
      ) : shown.length === 0 ? (
        <EmptyState icon="employees" title="Nobody to show" description="Everyone is filtered out, or the register is empty." />
      ) : (
        <>
          <MetricGrid compact>
            <MetricTile compact label="Employees" value={shown.length} />
            <MetricTile compact label="OT @ 1.5 Shift" value={`${hrs(shownTotals.total15Shift)}`} detail={`Cap ${computed.cap}h · ${computed.months} mo`} />
            <MetricTile compact label="OT @ 1.5 Adhoc" value={`${hrs(shownTotals.total15Adhoc)}`} detail="Sum of Adhoc averages" />
            <MetricTile compact label="OT @ 2.0 Shift" value={`${hrs(shownTotals.total20Shift)}`} detail="Sum of 2.0 averages" />
          </MetricGrid>

          {computed.orphanCount > 0 && (
            <Notice tone="info" title="Data quality">
              <p className="font-sans text-body-sm">
                {computed.orphanCount} overtime {computed.orphanCount === 1 ? 'record' : 'records'} for people outside the register ({computed.orphanHours}h, excluded from rows).
              </p>
            </Notice>
          )}

          <DataTable caption={`Overtime summary ${from} to ${to}`} rows={shown} columns={COLUMNS} getRowId={r => r.employeeId} stillKey={shown.length} />
        </>
      )}
    </div>
  );
}
