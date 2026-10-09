// app/timesheets/NecQuickView.tsx — the NEC period at a glance on the shared totals strip: one figure per
// bucket with zeros dimmed, the payable total as the foot, and a completion bar. Read-only; every figure is
// summed from calcEmployeeTotals by the caller, so this never re-derives payroll rules.
'use client';

import { LoadingPulse, Progress } from '@/components/ui-system';
import { TotalsStrip } from '@/components/shared/timesheet/TotalsStrip';

export interface NecPeriodTotals {
  people: number;
  actual: number;
  reg: number;
  ot15: number;
  ot20: number;
  night: number;
  standby: number;
  filled: number;
  possible: number;
}

export function NecQuickView({ totals, loading }: { totals: NecPeriodTotals; loading: boolean }) {
  if (loading) {
    return (
      <LoadingPulse label="Loading period totals" />
    );
  }
  const pct = totals.possible > 0 ? Math.round((totals.filled / totals.possible) * 100) : 0;
  const payable = totals.reg + totals.ot15 + totals.ot20 + totals.night + totals.standby;
  const h = (v: number) => `${v.toFixed(1)}h`;
  return (
    <TotalsStrip
      label="Period at a glance"
      title="Period at a glance"
      figures={[
        { value: String(totals.people), label: 'People on the roster' },
        { value: h(totals.actual), label: 'Actual hours', note: 'reporting figure, uncapped' },
        { value: h(totals.reg), label: 'Regular (payable)', note: totals.actual > 208 ? 'capped at 208' : undefined },
        { value: h(totals.ot15), label: 'Overtime 1.5×', dim: totals.ot15 === 0 },
        { value: h(totals.ot20), label: 'Overtime 2.0×', dim: totals.ot20 === 0 },
        { value: h(totals.night), label: 'Night allowance', dim: totals.night === 0 },
        { value: h(totals.standby), label: 'Standby', dim: totals.standby === 0 },
      ]}
      foot={(
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-sans text-body-sm text-ink-muted">Payable total</p>
            <p className="font-sans text-title font-semibold tabular text-action">{h(payable)}</p>
          </div>
          <Progress value={pct} label={`${pct}% filled`} />
          <p className="font-sans text-caption tabular text-ink-muted">{totals.filled} of {totals.possible} days entered</p>
        </div>
      )}
    />
  );
}
