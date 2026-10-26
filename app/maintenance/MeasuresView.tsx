// app/maintenance/MeasuresView.tsx — the seven maintenance measures as the server counts them (M5):
// PM done on time, backlog by age, opened vs completed per week, downtime/MTTR/MTBF per machine,
// repeat failures, worst machines, and labour hours and spares cost per machine. Every figure drills
// down to the list it counts: work-order figures open the counted jobs, breakdown figures link to
// the Breakdowns page for that machine. Definitions live in docs/WORK_ORDERS.md.
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Dialog, LoadingPulse, MetricGrid, MetricTile, Notice, Panel } from '@/components/ui-system';
import { formatCurrency, fmtDate } from '@/components/shared/utils';
import { statusMeta } from './meta';
import type { MeasureId, MeasuresPayload, WorkOrder } from './types';
import { useMeasures } from './useMaintenanceData';

const dash = (v: number | null, unit: string) => (v === null ? '–' : `${v}${unit}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const weekLabel = (iso: string) => `Week of ${fmtDate(iso)}`;

function DrillRow({ order, onOpen }: { order: WorkOrder; onOpen: (id: string | number) => void }) {
  const s = statusMeta(order.status);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(order.id)}
        className="focus-ring flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-control border border-line-subtle px-3 py-2 text-left font-sans text-body-sm hover:border-action/35"
      >
        <span className="font-semibold text-ink tabular">#{order.work_order_number}</span>
        <span className="min-w-0 flex-1 truncate text-ink">{order.equipment_info}</span>
        <span className="text-caption text-ink-muted">{s.label}</span>
        {order.date_raised && <span className="text-caption text-ink-subtle tabular">{fmtDate(order.date_raised)}</span>}
      </button>
    </li>
  );
}

export interface Drill {
  title: string;
  ids: MeasureId[];
  machine?: string;
}

function DrillDialog({ drill, orders, onClose, onOpen }: { drill: Drill; orders: WorkOrder[]; onClose: () => void; onOpen: (id: string | number) => void }) {
  const byId = new Map(orders.map(o => [String(o.id), o]));
  const found = drill.ids.map(id => byId.get(String(id))).filter((o): o is WorkOrder => !!o);
  const missing = drill.ids.length - found.length;
  return (
    <Dialog
      open
      onOpenChange={o => { if (!o) onClose(); }}
      title={drill.title}
      description={drill.ids.length === 0 ? 'Nothing was counted here.' : `The ${drill.ids.length} work ${drill.ids.length === 1 ? 'order' : 'orders'} this figure counts.`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {found.length === 0 ? (
        <p className="py-4 font-sans text-body-sm text-ink-muted">None of the counted jobs are in the loaded list.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {found.map(o => <DrillRow key={String(o.id)} order={o} onOpen={id => { onClose(); onOpen(id); }} />)}
        </ul>
      )}
      {missing > 0 && found.length > 0 && (
        <p className="mt-3 font-sans text-caption text-ink-muted">{missing} of the counted {missing === 1 ? 'jobs is' : 'jobs are'} not in the loaded list.</p>
      )}
      {drill.machine && (
        <p className="mt-3 font-sans text-body-sm">
          <Button variant="ghost" size="sm" asChild><Link href={`/breakdowns?q=${encodeURIComponent(drill.machine)}`}>Open the breakdowns for {drill.machine}</Link></Button>
        </p>
      )}
    </Dialog>
  );
}

function RowButton({ label, detail, onClick, name }: { label: string; detail: string; onClick?: () => void; name: string }) {
  if (!onClick) {
    return (
      <li className="flex items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
        <span className="min-w-0 truncate text-ink">{label}</span>
        <span className="shrink-0 text-caption text-ink-muted tabular">{detail}</span>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onClick} aria-label={name} className="focus-ring flex w-full items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 text-left font-sans text-body-sm hover:border-action/35">
        <span className="min-w-0 truncate text-ink">{label}</span>
        <span className="shrink-0 text-caption text-ink-muted tabular">{detail}</span>
      </button>
    </li>
  );
}

function BreakdownsLink({ machine }: { machine: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/breakdowns?q=${encodeURIComponent(machine)}`} aria-label={`Open the breakdowns for ${machine}`}>Breakdowns</Link>
    </Button>
  );
}

export function MeasuresView({ orders, onOpen }: { orders: WorkOrder[]; onOpen: (id: string | number) => void }) {
  const { payload, loading, failed, refetch } = useMeasures();
  const [drill, setDrill] = useState<Drill | null>(null);

  if (loading) return <LoadingPulse compact label="Loading measures" />;
  if (failed || !payload) {
    return (
      <Notice
        tone="danger"
        title="The measures could not be loaded."
        action={<Button size="sm" variant="secondary" onClick={refetch}>Try again</Button>}
      />
    );
  }
  return <MeasuresLoaded m={payload} orders={orders} onOpen={onOpen} drill={drill} setDrill={setDrill} />;
}

function MeasuresLoaded({ m, orders, onOpen, drill, setDrill }: {
  m: MeasuresPayload; orders: WorkOrder[]; onOpen: (id: string | number) => void; drill: Drill | null; setDrill: (d: Drill | null) => void;
}) {
  const pm = m.pm_on_time;
  const backlogIds = m.backlog_by_age.buckets.flatMap(b => b.ids);
  const repeatIds = m.repeat_failures.groups.flatMap(g => g.ids);
  const repeatCount = m.repeat_failures.groups_30d + m.repeat_failures.groups_90d;
  const downtimeTotal = m.machine_downtime.rows.reduce((a, r) => a + r.downtime_hours, 0);
  const breakdownCount = m.machine_downtime.rows.reduce((a, r) => a + r.breakdowns, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-caption text-ink-muted" role="status">
        Counted on the server · {fmtDate(m.period.start)} – {fmtDate(m.period.end)} ({m.period.days} days)
      </p>
      <MetricGrid columns={4}>
        <MetricTile
          label="PM done on time" icon="maintenance" tone={pm.percent === null ? 'default' : pm.percent >= 70 ? 'success' : pm.percent >= 40 ? 'warning' : 'danger'}
          value={pm.percent === null ? 'No data' : `${pm.percent}%`}
          detail={pm.total === 0 ? 'No planned jobs due' : `${pm.on_time} of ${pm.total}`}
          onClick={pm.total === 0 ? undefined : () => setDrill({ title: 'Planned jobs due in the last 90 days', ids: pm.ids })}
        />
        <MetricTile
          label="Open backlog" icon="wrench" tone={m.backlog_by_age.total ? 'warning' : 'default'}
          value={m.backlog_by_age.total} detail="Jobs still open"
          onClick={m.backlog_by_age.total === 0 ? undefined : () => setDrill({ title: 'The open backlog', ids: backlogIds })}
        />
        <MetricTile
          label="Repeat failures" icon="breakdown" tone={repeatCount ? 'danger' : 'default'}
          value={repeatCount} detail={repeatCount === 0 ? 'None in 90 days' : `${m.repeat_failures.groups_30d} within 30 days · ${m.repeat_failures.groups_90d} within 90`}
          onClick={repeatCount === 0 ? undefined : () => setDrill({ title: 'Repeat failures in the last 90 days', ids: repeatIds })}
        />
        <MetricTile
          label="Downtime" icon="clock" tone={breakdownCount ? 'warning' : 'default'}
          value={`${Math.round(downtimeTotal * 10) / 10}h`}
          detail={breakdownCount === 0 ? 'No breakdowns in 90 days' : plural(breakdownCount, 'breakdown', 'breakdowns')}
          href={breakdownCount === 0 ? undefined : '/breakdowns'}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Backlog by age"
          description="Open jobs by how long ago they were raised."
        >
          <ul className="flex flex-col gap-2">
            {m.backlog_by_age.buckets.map(b => (
              <RowButton
                key={b.label} label={b.label} detail={`${b.count} ${b.count === 1 ? 'job' : 'jobs'}`}
                name={`${b.label}: ${b.count} ${b.count === 1 ? 'job' : 'jobs'}`}
                onClick={b.count === 0 ? undefined : () => setDrill({ title: `Backlog: ${b.label}`, ids: b.ids })}
              />
            ))}
          </ul>
        </Panel>

        <Panel
          title="Opened vs completed per week"
          description="Jobs raised and jobs the artisan closed, by week."
        >
          <ul className="flex flex-col gap-2">
            {m.opened_vs_completed.weeks.map(w => (
              <li key={w.week_start} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
                <span className="text-ink">{weekLabel(w.week_start)}</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={w.opened === 0} onClick={() => setDrill({ title: `${weekLabel(w.week_start)}: opened`, ids: w.opened_ids })}>{w.opened} opened</Button>
                  <Button size="sm" variant="ghost" disabled={w.completed === 0} onClick={() => setDrill({ title: `${weekLabel(w.week_start)}: completed`, ids: w.completed_ids })}>{w.completed} done</Button>
                </span>
              </li>
            ))}
            {(m.opened_vs_completed.undated_opened.length > 0 || m.opened_vs_completed.undated_completed.length > 0) && (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
                <span className="text-ink-muted">No date recorded</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={m.opened_vs_completed.undated_opened.length === 0} onClick={() => setDrill({ title: 'Opened on no known date', ids: m.opened_vs_completed.undated_opened })}>{m.opened_vs_completed.undated_opened.length} opened</Button>
                  <Button size="sm" variant="ghost" disabled={m.opened_vs_completed.undated_completed.length === 0} onClick={() => setDrill({ title: 'Completed on no known date', ids: m.opened_vs_completed.undated_completed })}>{m.opened_vs_completed.undated_completed.length} done</Button>
                </span>
              </li>
            )}
          </ul>
        </Panel>

        <Panel
          title="Downtime, MTTR and MTBF per machine"
          description="From the breakdowns of the last 90 days. MTTR is the mean repair time; MTBF the mean gap between breakdowns."
        >
          {m.machine_downtime.rows.length === 0 ? (
            <p className="py-4 font-sans text-body-sm text-ink-muted">No breakdowns in the last 90 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {m.machine_downtime.rows.map(r => (
                <li key={r.machine} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">{r.machine}</span>
                  <span className="text-caption text-ink-muted tabular">{plural(r.breakdowns, 'breakdown', 'breakdowns')} · {r.downtime_hours}h down · MTTR {dash(r.mttr_hours, 'h')} · MTBF {dash(r.mtbf_days, ' days')}</span>
                  <BreakdownsLink machine={r.machine} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Repeat failures"
          description="The same machine failing the same way twice or more in 90 days."
        >
          {m.repeat_failures.groups.length === 0 ? (
            <p className="py-4 font-sans text-body-sm text-ink-muted">No repeats in the last 90 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {m.repeat_failures.groups.map((g, i) => (
                <RowButton
                  key={`${g.machine}|${g.code}|${i}`} label={`${g.machine} · ${g.code}`}
                  detail={`${g.count} times in ${g.window_days} days`}
                  name={`${g.machine}, ${g.code}: ${g.count} times from ${fmtDate(g.first)} to ${fmtDate(g.last)}`}
                  onClick={() => setDrill({ title: `${g.machine} · ${g.code}`, ids: g.ids })}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Worst machines"
          description="Ranked by breakdowns, then downtime, in the last 90 days."
        >
          {m.worst_machines.rows.length === 0 ? (
            <p className="py-4 font-sans text-body-sm text-ink-muted">No breakdowns in the last 90 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {m.worst_machines.rows.map(r => (
                <li key={r.machine} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">{r.machine}</span>
                  <span className="text-caption text-ink-muted tabular">{plural(r.breakdowns, 'breakdown', 'breakdowns')} · {r.downtime_hours}h down</span>
                  <span className="flex gap-2">
                    <BreakdownsLink machine={r.machine} />
                    <Button size="sm" variant="ghost" disabled={r.open_jobs === 0} onClick={() => setDrill({ title: `Open jobs on ${r.machine}`, ids: r.work_order_ids, machine: r.machine })}>{r.open_jobs} open {r.open_jobs === 1 ? 'job' : 'jobs'}</Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Labour hours and spares cost per machine"
          description="Recorded time and spares on jobs raised in the last 90 days."
        >
          {m.cost_by_machine.rows.length === 0 ? (
            <p className="py-4 font-sans text-body-sm text-ink-muted">No jobs raised in the last 90 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {m.cost_by_machine.rows.map(r => (
                <RowButton
                  key={r.machine} label={r.machine}
                  detail={`${r.labour_hours}h labour · ${formatCurrency(r.spares_cost)} spares · ${r.jobs} ${r.jobs === 1 ? 'job' : 'jobs'}`}
                  name={`${r.machine}: ${r.labour_hours} hours, ${formatCurrency(r.spares_cost)} in spares, ${r.jobs} ${r.jobs === 1 ? 'job' : 'jobs'}`}
                  onClick={() => setDrill({ title: `${r.machine}: labour and spares`, ids: r.ids })}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {drill && <DrillDialog drill={drill} orders={orders} onClose={() => setDrill(null)} onOpen={onOpen} />}
    </div>
  );
}
