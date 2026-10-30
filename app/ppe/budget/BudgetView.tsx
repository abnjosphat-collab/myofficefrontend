// app/ppe/budget/BudgetView.tsx — the 2027 PPE Budget view: tiles, charts, the editable
// allocations table, the month grid, starters/gaps/assumptions panels, Save with an
// unsaved-changes guard, Reset to defaults and the PDF/XLSX downloads.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { toast } from 'sonner';
import {
  Button, Card, Chart, ChartPanel, Checkbox, DataRegion, EmptyState, ExportButton, Field, Input, MetricGrid, MetricTile,
  Notice, Segmented, Select, Textarea, chartColor, chartTheme, deriveDataStatus, useConfirm,
} from '@/components/ui-system';
import type { EmployeeRow, PPERecord } from '../types';
import { normalizePpeType } from '../ppeTypes';
import {
  calculateBudget,
  type BudgetInput,
  type BudgetLineSettings,
  type BudgetRule,
  type BudgetSettings,
  type BudgetWho,
} from './budgetCalc';
import { fetchBudget, saveBudget } from './budgetApi';
import { MONTH_SHORT, downloadBudgetPdf, downloadBudgetXlsx, svgToPng, usd } from './budgetDownloads';

const RULE_LABEL: Record<BudgetRule, string> = {
  per_working_day: 'Per working day', per_week: 'Per week', per_month: 'Per month', per_year: 'Per year', matrix: 'Matrix dues',
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'line';
}

function lineYear(line: { yearQty: number; yearCost: number; yearQtyBase: number; yearCostBase: number }, useProvisional: boolean) {
  return useProvisional ? { qty: line.yearQty, cost: line.yearCost } : { qty: line.yearQtyBase, cost: line.yearCostBase };
}

export function BudgetView({ people, records, matrix, canManage }: {
  people: EmployeeRow[];
  records: PPERecord[];
  matrix: Record<string, number>;
  canManage: boolean;
}) {
  const confirm = useConfirm();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear + 1);
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [defaults, setDefaults] = useState<BudgetSettings | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [costMode, setCostMode] = useState<'cost' | 'qty'>('cost');
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const rankedChartRef = useRef<HTMLDivElement>(null);

  const load = async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBudget(y);
      setSettings(res.settings);
      setDefaults(res.defaults ?? res.settings);
      setServerCalendar(res.calendar);
      setUpdatedAt(res.updated_at);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The budget could not be loaded.');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(year); }, [year]);

  const budgetPeople = useMemo(() => people.filter(p => p.archived !== true).map(p => ({
    id: p.employee_id, name: p.employee_name, department: p.department ?? '', section: p.section ?? '',
    title: p.position ?? '', active: true,
  })), [people]);
  const budgetRecords = useMemo(() => records.map(r => ({
    employee_id: r.employee_id, employee_name: r.employee_name, ppe_type: r.ppe_type, size: r.size ?? '',
    issue_date: r.issue_date ?? '', status: r.status ?? '', premature_failure: r.premature_failure,
  })), [records]);
  const dataDate = useMemo(() => budgetRecords.reduce((best, r) => (r.issue_date > best ? r.issue_date.slice(0, 10) : best), ''), [budgetRecords]);

  const [serverCalendar, setServerCalendar] = useState<BudgetInput['calendar'] | null>(null);

  const result = useMemo(() => {
    if (!settings || !serverCalendar) return null;
    return calculateBudget({ people: budgetPeople, records: budgetRecords, matrix, calendar: serverCalendar, settings, dataDate, actualsEnd: `${year - 1}-12` });
  }, [settings, serverCalendar, budgetPeople, budgetRecords, matrix, dataDate, year]);

  const patch = (next: BudgetSettings) => { setSettings(next); setDirty(true); };
  const patchLine = (key: string, change: Partial<BudgetLineSettings>) => {
    if (!settings) return;
    patch({ ...settings, lines: settings.lines.map(l => (l.key === key ? { ...l, ...change } : l)) });
  };

  const changeYear = async (next: number) => {
    if (next === year) return;
    if (dirty && !(await confirm({ title: 'Discard unsaved budget changes?', message: 'Year switch without saving loses the edits.', confirmLabel: 'Discard' }))) return;
    setYear(next);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await saveBudget(year, settings, updatedAt);
      setUpdatedAt(res.updated_at);
      setDirty(false);
      toast.success('Budget saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The budget could not be saved.');
      await load(year);
    } finally {
      setSaving(false);
    }
  };

  const settingsByKey = useMemo(() => new Map((settings?.lines ?? []).map(l => [l.key, l])), [settings]);
  const useProvisional = settings?.show_provisional ?? true;
  const totalCost = result ? (useProvisional ? result.monthlyCost.reduce((a, b) => a + b, 0) : result.monthlyCostBase.reduce((a, b) => a + b, 0)) : 0;
  const totalQty = result ? (useProvisional ? result.monthlyQty.reduce((a, b) => a + b, 0) : result.monthlyQtyBase.reduce((a, b) => a + b, 0)) : 0;
  const noPrice = result?.lines.filter(l => l.noPrice).length ?? 0;
  const staffCount = budgetPeople.length;
  const starterCount = (settings?.confirmed.count ?? 0) + (useProvisional ? (settings?.provisional.count ?? 0) : 0);
  const biggest = result?.byItem[0];
  const provisionalNote = settings && (settings.provisional.count > 0 ? ` (+${settings.provisional.count} provisional)` : '');

  // ── charts ──────────────────────────────────────────────────────────────
  const topLines = useMemo(() => (result?.lines ?? []).slice(0, 7), [result]);
  const monthlyStacked = useMemo(() => {
    if (!result) return [];
    const other = result.lines.slice(7);
    return MONTH_SHORT.map((label, m) => {
      const row: Record<string, string | number> = { label };
      topLines.forEach((l, i) => {
        const c = l.months[m];
        row[`s${i}`] = Math.round((costMode === 'cost' ? (useProvisional ? c.cost : c.costBase) : (useProvisional ? c.qty : c.qtyBase)) * 100) / 100;
      });
      const rest = other.reduce((t, l) => {
        const c = l.months[m];
        return t + (costMode === 'cost' ? (useProvisional ? c.cost : c.costBase) : (useProvisional ? c.qty : c.qtyBase));
      }, 0);
      if (other.length > 0) row.other = Math.round(rest * 100) / 100;
      return row;
    });
  }, [result, topLines, costMode, useProvisional]);
  const ranked = useMemo(() => (result?.byItem ?? []).slice(0, 12).map(b => ({
    name: b.item.length > 22 ? `${b.item.slice(0, 21)}…` : b.item,
    value: Math.round((useProvisional ? b.cost : b.costBase) * 100) / 100,
  })), [result, useProvisional]);
  const bySection = useMemo(() => (result?.bySection ?? []).map(s => ({
    name: s.section, value: Math.round(s.cost * 100) / 100,
  })), [result]);
  const actualVsPlan = useMemo(() => {
    if (!result) return [];
    return MONTH_SHORT.map((label, m) => ({
      label,
      actual: result.actuals[m]?.count ?? 0,
      plan: Math.round((useProvisional ? result.monthlyCost[m] : result.monthlyCostBase[m]) * 100) / 100,
    }));
  }, [result, useProvisional]);
  const cumulative = useMemo(() => {
    if (!result) return [];
    let running = 0;
    return MONTH_SHORT.map((label, m) => {
      running += useProvisional ? result.monthlyCost[m] : result.monthlyCostBase[m];
      return { label, value: Math.round(running * 100) / 100 };
    });
  }, [result, useProvisional]);

  const download = async (kind: 'xlsx' | 'pdf') => {
    if (!result || !serverCalendar || !settings || downloading) return;
    setDownloading(true);
    try {
      if (kind === 'xlsx') {
        await downloadBudgetXlsx(result, serverCalendar, settings, { year, people: staffCount + starterCount, useProvisional });
      } else {
        const grab = async (ref: React.RefObject<HTMLDivElement | null>) => {
          const svg = ref.current?.querySelector('svg');
          if (!svg) throw new Error('chart not ready');
          return svgToPng(svg as SVGSVGElement);
        };
        await downloadBudgetPdf(result, settings, { year, people: staffCount + starterCount, useProvisional }, {
          monthlyCost: await grab(monthlyChartRef),
          ranked: await grab(rankedChartRef),
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  const status = deriveDataStatus({ loaded: !!result, loading, error, count: result ? 1 : 0 });

  return (
    <DataRegion
      status={status} subject={`the ${year} PPE budget`} error={error} onRetry={() => { void load(year); }}
      empty={result !== null && budgetPeople.length === 0 ? <EmptyState icon="ppe" title="No budget data" description="The budget needs the employee register and PPE records to calculate." /> : undefined}
    >
      {result && settings && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select aria-label="Budget year" className="w-32" value={String(year)} onValueChange={v => { void changeYear(Number(v)); }} options={yearOptions.map(y => ({ value: String(y), label: String(y) }))} />
            {canManage && (
              <>
                <Button variant="primary" icon="success" pending={saving} disabled={!dirty} onClick={() => { void save(); }}>
                  {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                </Button>
                <Button variant="ghost" icon="reset" disabled={!defaults} onClick={() => { if (defaults) patch(defaults); }}>Reset to defaults</Button>
              </>
            )}
            <ExportButton
              label="Download" pending={downloading}
              items={[
                { label: 'Excel (.xlsx)', icon: 'table-view', onSelect: () => { void download('xlsx'); } },
                { label: 'PDF', icon: 'pdf', onSelect: () => { void download('pdf'); } },
              ]}
            />
            {dirty && <span className="font-sans text-caption text-ink-muted" role="status">Unsaved changes</span>}
          </div>

          <MetricGrid>
            <MetricTile label="Total cost" value={usd(totalCost)} detail={noPrice > 0 ? `+ ${noPrice} line${noPrice === 1 ? '' : 's'} without a price` : `${result.lines.length} lines`} />
            <MetricTile label="Total items" value={totalQty.toLocaleString('en-US')} detail="whole units, rounded up per month" />
            <MetricTile label="People" value={`${staffCount + starterCount}`} detail={`${staffCount} on the register${provisionalNote}`} />
            <MetricTile label="Biggest line" value={biggest?.item ?? '—'} detail={biggest ? usd(useProvisional ? biggest.cost : biggest.costBase) : undefined} />
          </MetricGrid>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel
              title={`Monthly ${costMode === 'cost' ? 'cost' : 'quantity'} by item`}
              description="Stacked by budget line."
              summary={`Monthly ${costMode === 'cost' ? `cost, peaking at ${usd(Math.max(...result.monthlyCost))}` : `quantity, peaking at ${Math.max(...result.monthlyQty)} units`}. Top line: ${topLines[0]?.item ?? 'none'}.`}
              controls={<Segmented label="Show" value={costMode} onValueChange={setCostMode} options={[{ value: 'cost', label: 'Cost' }, { value: 'qty', label: 'Quantity' }]} />}
            >
              <div ref={monthlyChartRef} className="overflow-x-auto">
                <Chart height={260} minWidth={560}>
                  <BarChart data={monthlyStacked} margin={{ top: 12, right: 12, bottom: 2, left: -6 }} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="label" tick={chartTheme.axisTick} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                    <Tooltip {...chartTheme.tooltip} />
                    {topLines.map((l, i) => (
                      <Bar key={l.key} dataKey={`s${i}`} name={l.item} stackId="total" fill={chartColor(((i % 8) + 1) as 1)} />
                    ))}
                    {result.lines.length > 7 && <Bar dataKey="other" name="Other lines" stackId="total" fill={chartColor(8)} />}
                  </BarChart>
                </Chart>
              </div>
            </ChartPanel>

            <ChartPanel
              title="Lines ranked by cost"
              description="Year totals, highest first."
              summary={`Highest: ${ranked[0]?.name ?? 'none'} at ${usd(ranked[0]?.value ?? 0)}.`}
            >
              <div ref={rankedChartRef}>
                <Chart height={Math.max(210, ranked.length * 34)}>
                  <BarChart data={ranked} layout="vertical" margin={{ top: 8, right: 18, bottom: 2, left: 2 }} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                    <XAxis type="number" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={150} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTheme.tooltip} formatter={(value: unknown) => [usd(Number(value)), 'Year cost']} />
                    <Bar dataKey="value" barSize={16} radius={[0, 6, 6, 0]}>
                      {ranked.map((entry, index) => <Cell key={entry.name} fill={chartColor(((index % 8) + 1) as 1)} />)}
                    </Bar>
                  </BarChart>
                </Chart>
              </div>
            </ChartPanel>

            <ChartPanel
              title="Cost by section"
              description="Card items by holder section; consumables by qualifying headcount."
              summary={bySection.length === 0 ? 'Nothing budgeted by section.' : `Highest: ${bySection[0]?.name} at ${usd(bySection[0]?.value ?? 0)}.`}
            >
              <Chart height={220}>
                <BarChart data={bySection} margin={{ top: 12, right: 12, bottom: 2, left: -6 }} accessibilityLayer={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...chartTheme.tooltip} formatter={(value: unknown) => [usd(Number(value)), 'Year cost']} />
                  <Bar dataKey="value" barSize={28} radius={[6, 6, 0, 0]}>
                    {bySection.map((entry, index) => <Cell key={entry.name} fill={chartColor(((index % 8) + 1) as 1)} />)}
                  </Bar>
                </BarChart>
              </Chart>
            </ChartPanel>

            <ChartPanel
              title={`Last 12 months actual vs ${year} plan`}
              description="Issued items per month against the budgeted monthly cost."
              summary={`Actual issues peak at ${Math.max(...actualVsPlan.map(p => p.actual))} in a month; the plan peaks at ${usd(Math.max(...actualVsPlan.map(p => p.plan)))}.`}
            >
              <Chart height={220}>
                <ComposedChart data={actualVsPlan} margin={{ top: 12, right: 12, bottom: 2, left: -6 }} accessibilityLayer={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTheme.axisTick} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis yAxisId="left" tick={chartTheme.axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                  <YAxis yAxisId="right" orientation="right" tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar yAxisId="left" dataKey="actual" name="Issued (actual)" fill={chartColor(2)} barSize={14} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="plan" name="Plan (USD)" stroke={chartColor(1)} strokeWidth={2} dot={false} />
                </ComposedChart>
              </Chart>
            </ChartPanel>

            <ChartPanel
              title="Cumulative cost through the year"
              description="Running total of the budgeted cost."
              summary={`Reaches ${usd(totalCost)} by December.`}
            >
              <Chart height={200}>
                <LineChart data={cumulative} margin={{ top: 12, right: 12, bottom: 2, left: -6 }} accessibilityLayer={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTheme.axisTick} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...chartTheme.tooltip} formatter={(value: unknown) => [usd(Number(value)), 'Cumulative']} />
                  <Line type="monotone" dataKey="value" stroke={chartColor(1)} strokeWidth={2} dot={false} />
                </LineChart>
              </Chart>
            </ChartPanel>
          </div>

          <Card padding="lg" className="flex flex-col gap-3">
            <h2 className="font-sans text-title font-semibold text-ink">Allocations</h2>
            <div className="overflow-x-auto">
              <table aria-label="Allocations" className="w-full min-w-[880px] border-collapse font-sans text-body-sm">
                <thead>
                  <tr className="text-left text-ink-muted">
                    {['Item', 'Rule', 'Qty each', 'Who', 'Unit price (USD)', 'Buffer %', 'Year qty', 'Year cost'].map(h => (
                      <th key={h} scope="col" className="border-b border-line-subtle px-2 py-2 font-medium">{h}</th>
                    ))}
                    {canManage && <th scope="col" className="border-b border-line-subtle px-2 py-2"><span className="sr-only">Remove</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map(line => {
                    const yt = lineYear(line, useProvisional);
                    const rate = result.prematureRate[normalizePpeType(line.item)];
                    const editable = settingsByKey.get(line.key);
                    return (
                      <tr key={line.key} className="border-b border-line-subtle last:border-0">
                        <td className="px-2 py-2 text-ink">{line.item}{line.noPrice && <span className="ml-2 text-caption text-ink-muted">no price</span>}</td>
                        <td className="px-2 py-2 text-ink-muted">{RULE_LABEL[line.rule]}</td>
                        <td className="px-2 py-2">
                          {line.rule === 'matrix' || !canManage || !editable ? <span className="text-ink-muted">{line.rule === 'matrix' ? '—' : editable?.qty_per_person}</span> : (
                            <Input aria-label={`${line.item} quantity each`} type="number" min="0" step="any" className="w-24" value={String(editable.qty_per_person)} onChange={e => patchLine(line.key, { qty_per_person: Math.max(0, Number(e.target.value)) })} />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {line.rule === 'matrix' || !canManage || !editable ? <span className="text-ink-muted">{line.kind === 'card' ? line.peopleBasis : !editable ? '' : editable.who.kind === 'everyone' ? 'Everyone' : editable.who.kind === 'sections' ? editable.who.sections.join(', ') : editable.who.text}</span> : (
                            <WhoEditor who={editable.who} onChange={who => patchLine(line.key, { who })} />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {!canManage ? <span className="text-ink-muted">{line.unit_price == null ? '—' : usd(line.unit_price)}</span> : (
                            <Input aria-label={`${line.item} unit price`} type="number" min="0" step="0.01" className="w-28" value={line.unit_price == null ? '' : String(line.unit_price)} placeholder="No price" onChange={e => patchLine(line.key, { unit_price: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {!canManage ? <span className="text-ink-muted">{line.buffer_pct}%</span> : (
                            <span className="flex items-center gap-1">
                              <Input aria-label={`${line.item} buffer percent`} type="number" min="0" step="any" className="w-20" value={String(line.buffer_pct)} onChange={e => patchLine(line.key, { buffer_pct: Math.max(0, Number(e.target.value)) })} />
                              {rate && rate.total > 0 && <span className="whitespace-nowrap text-caption text-ink-muted" title={`${rate.premature} of ${rate.total} issues failed early`}>{Math.round(rate.rate * 100)}% failed</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-ink">{yt.qty.toLocaleString('en-US')}</td>
                        <td className="px-2 py-2 text-ink">{line.noPrice ? '—' : usd(yt.cost)}</td>
                        {canManage && (
                          <td className="px-2 py-2">
                            {line.rule !== 'matrix' && (
                              <Button size="sm" variant="ghost" icon="delete" aria-label={`Remove ${line.item}`} onClick={() => patch({ ...settings, lines: settings.lines.filter(l => l.key !== line.key) })} />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {canManage && <AddLineForm lines={settings.lines} onAdd={line => patch({ ...settings, lines: [...settings.lines, line] })} />}
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <h2 className="font-sans text-title font-semibold text-ink">Month grid</h2>
            <div className="overflow-x-auto">
              <table aria-label="Month grid" className="w-full min-w-[1020px] border-collapse font-sans text-body-sm">
                <thead>
                  <tr className="text-left text-ink-muted">
                    <th scope="col" className="sticky left-0 bg-surface px-2 py-2 font-medium">Item</th>
                    {MONTH_SHORT.map(m => <th key={m} scope="col" className="px-2 py-2 text-right font-medium">{m}</th>)}
                    <th scope="col" className="px-2 py-2 text-right font-medium">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map(line => {
                    const yt = lineYear(line, useProvisional);
                    return (
                      <tr key={line.key} className="border-t border-line-subtle">
                        <th scope="row" className="sticky left-0 bg-surface px-2 py-2 text-left font-normal text-ink">{line.item}</th>
                        {line.months.map((c, m) => (
                          <td key={m} className="px-2 py-2 text-right text-ink" title={c.basis || undefined}>
                            {useProvisional ? c.qty : c.qtyBase}{line.noPrice ? '' : ` · ${usd(useProvisional ? c.cost : c.costBase)}`}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-medium text-ink">{yt.qty.toLocaleString('en-US')}{line.noPrice ? '' : ` · ${usd(yt.cost)}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card padding="lg" className="flex flex-col gap-3">
              <h2 className="font-sans text-title font-semibold text-ink">New starters</h2>
              {(['confirmed', 'provisional'] as const).map(group => (
                <div key={group} className="flex flex-col gap-2 border-t border-line-subtle pt-3 first:border-0 first:pt-0">
                  <h3 className="font-sans text-body-sm font-medium capitalize text-ink">{group}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Field label="Count"><Input aria-label={`${group} starter count`} type="number" min="0" className="w-24" disabled={!canManage} value={String(settings[group].count)} onChange={e => patch({ ...settings, [group]: { ...settings[group], count: Math.max(0, Math.floor(Number(e.target.value))) } })} /></Field>
                    <Field label="Start month"><Input aria-label={`${group} start month`} type="number" min="1" max="12" className="w-24" disabled={!canManage} value={String(settings[group].start_month)} onChange={e => patch({ ...settings, [group]: { ...settings[group], start_month: Math.min(12, Math.max(1, Math.floor(Number(e.target.value) || 1))) } })} /></Field>
                    <Field label="Boilermakers"><Input aria-label={`${group} boilermakers`} type="number" min="0" className="w-24" disabled={!canManage} value={String(settings[group].boilermakers)} onChange={e => patch({ ...settings, [group]: { ...settings[group], boilermakers: Math.max(0, Math.floor(Number(e.target.value))) } })} /></Field>
                  </div>
                </div>
              ))}
              <Field label="Starter kit (one type per line; empty means automatic)" optional>
                <Textarea
                  aria-label="Starter kit"
                  rows={4}
                  disabled={!canManage}
                  value={(settings.starter_kit ?? []).join('\n')}
                  placeholder={result.starterKit.join('\n') || 'Automatic: types at least half of staff hold'}
                  onChange={e => {
                    const types = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    patch({ ...settings, starter_kit: types.length === 0 ? null : types });
                  }}
                />
              </Field>
              <Checkbox label="Show provisional starters in the headline totals" checked={settings.show_provisional} disabled={!canManage} onChange={e => patch({ ...settings, show_provisional: e.target.checked })} />
            </Card>

            <Card padding="lg" className="flex flex-col gap-3">
              <h2 className="font-sans text-title font-semibold text-ink">Gaps</h2>
              {result.gaps.length === 0 ? (
                <p className="font-sans text-body-sm text-ink-muted">Everyone holds what most of their job title holds.</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {result.gaps.map(g => (
                    <li key={`${g.person}:${g.type}`} className="font-sans text-body-sm text-ink">
                      {g.personName} <span className="text-ink-muted">· {g.title} · missing {g.type}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Checkbox label="Add gaps in January" checked={settings.add_gaps_in_january} disabled={!canManage} onChange={e => patch({ ...settings, add_gaps_in_january: e.target.checked })} />
            </Card>

            <Card padding="lg" className="flex flex-col gap-3">
              <h2 className="font-sans text-title font-semibold text-ink">Assumptions</h2>
              <ul className="flex flex-col gap-1.5">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="font-sans text-body-sm text-ink-muted">• {a}</li>
                ))}
              </ul>
            </Card>
          </div>

          {result.unknownTypes.length > 0 && (
            <Notice tone="warning" title="Types with no replacement interval">
              {result.unknownTypes.map(u => `${u.type} (${u.count})`).join(', ')} — listed here and never projected.
            </Notice>
          )}
        </div>
      )}
    </DataRegion>
  );
}

function WhoEditor({ who, onChange }: { who: BudgetWho; onChange: (who: BudgetWho) => void }) {
  return (
    <span className="flex items-center gap-1">
      <Select
        aria-label="Who gets this line"
        className="w-32"
        value={who.kind}
        onValueChange={v => onChange({ kind: v as BudgetWho['kind'], sections: [], text: '' })}
        options={[{ value: 'everyone', label: 'Everyone' }, { value: 'sections', label: 'Sections' }, { value: 'job_title', label: 'Job title' }]}
      />
      {who.kind !== 'everyone' && (
        <Input
          aria-label={who.kind === 'sections' ? 'Sections, comma separated' : 'Job title contains'}
          className="w-36"
          value={who.kind === 'sections' ? who.sections.join(', ') : who.text}
          placeholder={who.kind === 'sections' ? 'Mechanical, Electrical' : 'Boilermaker'}
          onChange={e => (who.kind === 'sections'
            ? onChange({ ...who, sections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })
            : onChange({ ...who, text: e.target.value }))}
        />
      )}
    </span>
  );
}

function AddLineForm({ lines, onAdd }: { lines: BudgetLineSettings[]; onAdd: (line: BudgetLineSettings) => void }) {
  const [item, setItem] = useState('');
  const add = () => {
    const name = item.trim();
    if (!name) {
      toast.error('Name the new line first.');
      return;
    }
    const key = slug(name);
    if (lines.some(l => l.key === key)) {
      toast.error('A line with that name already exists.');
      return;
    }
    onAdd({ key, item: name, rule: 'per_month', qty_per_person: 1, who: { kind: 'everyone', sections: [], text: '' }, unit_price: null, buffer_pct: 0 });
    setItem('');
  };
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-line-subtle pt-3">
      <Field label="New line">
        <Input aria-label="New line item" className="w-56" value={item} onChange={e => setItem(e.target.value)} placeholder="Dust masks" />
      </Field>
      <Button icon="plus" onClick={add}>Add a line</Button>
    </div>
  );
}
