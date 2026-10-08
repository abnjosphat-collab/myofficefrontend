// app/timesheets/NecQuickView.tsx — the NEC period at a glance, in the artisan
// QuickView language: one labeled row per bucket with zeros dimmed, the payable
// total as the foot, and a completion bar. Read-only; every figure is summed
// from calcEmployeeTotals by the caller, so this never re-derives payroll rules.
'use client';

import { Progress, Skeleton, cn } from '@/components/ui-system';

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

function Row({ label, value, unit, bold, note }: {
  label: string; value: number; unit: string; bold?: boolean; note?: string;
}) {
  const zero = value === 0;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-sans text-body-sm text-ink-muted">
        {label}
        {note && <span className="ml-2 font-sans text-caption text-ink-subtle">{note}</span>}
      </p>
      <p className={cn('font-sans text-body-sm tabular', zero ? 'text-ink-subtle' : 'font-medium text-ink', bold && !zero && 'text-title font-semibold text-action')}>
        {unit === 'people' ? String(value) : `${value.toFixed(1)}h`}
      </p>
    </div>
  );
}

export function NecQuickView({ totals, loading }: { totals: NecPeriodTotals; loading: boolean }) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading period totals" className="flex flex-col gap-2 rounded-card border border-line-subtle bg-surface p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  const pct = totals.possible > 0 ? Math.round((totals.filled / totals.possible) * 100) : 0;
  const payable = totals.reg + totals.ot15 + totals.ot20 + totals.night + totals.standby;
  return (
    <section aria-label="Period at a glance" className="flex flex-col gap-2.5 rounded-card border border-line-subtle bg-surface p-4">
      <h2 className="font-display text-title font-semibold text-ink">Period at a glance</h2>
      <Row label="People on the roster" value={totals.people} unit="people" />
      <Row label="Actual hours" value={totals.actual} unit="h" note="reporting figure, uncapped" />
      <Row label="Regular (payable)" value={totals.reg} unit="h" note={totals.actual > 208 ? 'capped at 208' : undefined} />
      <Row label="Overtime 1.5×" value={totals.ot15} unit="h" />
      <Row label="Overtime 2.0×" value={totals.ot20} unit="h" />
      <Row label="Night allowance" value={totals.night} unit="h" />
      <Row label="Standby" value={totals.standby} unit="h" />
      <div className="border-t border-line-subtle pt-2">
        <Row label="Payable total" value={payable} unit="h" bold />
      </div>
      <Progress value={pct} label={`${pct}% filled`} />
      <p className="font-sans text-caption tabular text-ink-muted">{totals.filled} of {totals.possible} days entered</p>
    </section>
  );
}
