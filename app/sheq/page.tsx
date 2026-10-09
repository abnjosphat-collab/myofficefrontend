// app/sheq/page.tsx — SHEQ safety dashboard (read-only overview across the six safety modules)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Card, ChartPanel, DataRegion, DataTable, Distribution, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Progress,
  Segmented, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toolbar, chartColor, chartTheme, deriveDataStatus, useConfirm, useMediaQuery, usePersistentState,
  type Column, type IconMeaning, type Tone,
} from '@/components/ui-system';
import { formatDateTime } from '@/lib/format';
import { computeStats, rangeToFromTo, scoreLabel, weekLabel, weeklyActuals } from './stats';
import type { Comment, ModuleKey, QuickRange } from './types';
import { postSafetyAnalysis, useSheqDashboardData } from './useSheqDashboardData';
import { priorityTone } from '@/lib/status';

const RANGES: { value: QuickRange | 'custom'; label: string }[] = [
  { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' },
  { value: '6m', label: '6 months' }, { value: 'all', label: 'All time' }, { value: 'custom', label: 'Custom' },
];

const MODULES: { key: ModuleKey; label: string; href: string; icon: IconMeaning }[] = [
  { key: 'nm', label: 'Near miss', href: '/near_miss', icon: 'warning' },
  { key: 'ws', label: 'Work stoppage', href: '/work_stoppage', icon: 'cancel' },
  { key: 'vfl', label: 'Visible felt leadership', href: '/vfl', icon: 'eye' },
  { key: 'pto', label: 'Planned task observation', href: '/pto', icon: 'task' },
  { key: 'insp', label: 'SHEQ inspections', href: '/sheq_inspection', icon: 'compliance' },
  { key: 'pach', label: 'Pachedu', href: '/pachedu', icon: 'care' },
];

type TargetKey = 'vfl' | 'pto' | 'insp' | 'pach' | 'nm';
const TARGET_MODULES: { key: TargetKey; label: string; href: string }[] = [
  { key: 'vfl', label: 'Visible felt leadership', href: '/vfl' }, { key: 'pto', label: 'Planned task observation', href: '/pto' },
  { key: 'insp', label: 'SHEQ inspections', href: '/sheq_inspection' }, { key: 'pach', label: 'Pachedu', href: '/pachedu' }, { key: 'nm', label: 'Near miss', href: '/near_miss' },
];
// Starting targets until a device saves its own. They are not company policy and are stored per device.
const DEFAULT_TARGETS: Record<TargetKey, number> = { vfl: 2, pto: 4, insp: 7, pach: 20, nm: 5 };
const validTargets = (raw: unknown): Record<TargetKey, number> | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = { ...DEFAULT_TARGETS };
  for (const k of Object.keys(out) as TargetKey[]) { const v = (raw as Record<string, unknown>)[k]; if (typeof v === 'number' && v >= 1) out[k] = v; }
  return out;
};
const validNotes = (raw: unknown): Comment[] | undefined => (Array.isArray(raw) ? (raw as Comment[]).filter(c => c && typeof c.text === 'string' && typeof c.id === 'string') : undefined);

interface AiResult {
  summary?: string; overall_risk?: string; risk_score?: number; _records_analysed?: number; generated_at?: string;
  problem_areas?: { title: string; severity?: string; description?: string; module?: string; location_or_dept?: string; count?: number }[];
  recommendations?: { priority?: string; action: string; rationale?: string; owner?: string; target?: string }[];
  trends?: { metric: string; direction?: string; insight?: string }[];
  top_risk_locations?: string[]; top_risk_departments?: string[];
}
const RISK_TONE: Record<string, Tone> = { low: priorityTone('low'), medium: priorityTone('medium'), high: priorityTone('high'), critical: priorityTone('critical') };
const PRIORITY_TONE: Record<string, Tone> = { immediate: 'danger', short_term: 'warning', long_term: 'info' };
const summarise = (rows: { name: string; value: number }[]) => rows.map(r => `${r.name} ${r.value}`).join(', ') || 'no data';
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

function weeklyStatus(actual: number, target: number): { label: string; tone: Tone } {
  const p = Math.min(Math.round((actual / target) * 100), 100);
  if (actual > target) return { label: 'Exceeded', tone: 'success' };
  if (p >= 100) return { label: 'On target', tone: 'success' };
  if (p >= 80) return { label: 'Almost', tone: 'info' };
  if (p >= 50) return { label: 'In progress', tone: 'warning' };
  return actual === 0 ? { label: 'Not started', tone: 'danger' } : { label: 'Below target', tone: 'danger' };
}

function TargetsDialog({ targets, open, onOpenChange, onSave }: { targets: Record<TargetKey, number>; open: boolean; onOpenChange: (open: boolean) => void; onSave: (t: Record<TargetKey, number>) => void }) {
  const [draft, setDraft] = useState(targets);
  const [loadedFor, setLoadedFor] = useState(false);
  if (open !== loadedFor) { setLoadedFor(open); if (open) setDraft(targets); }
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Edit weekly targets" description="Saved on this device only. Each target is the number of records expected per week." submitLabel="Save targets" onSubmit={async () => { onSave(draft); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TARGET_MODULES.map(m => (
          <Field key={m.key} label={`${m.label} target`}>
            <Input type="number" min={1} max={999} value={draft[m.key]} onChange={e => setDraft(p => ({ ...p, [m.key]: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
          </Field>
        ))}
      </div>
    </FormDialog>
  );
}

function ModuleCard({ label, href, total, rows, facts }: { label: string; href: string; total: number; rows: { name: string; value: number }[]; facts?: string }) {
  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-title font-semibold text-ink">{label}</h3>
          <p className="font-sans text-caption text-ink-muted tabular">{total} {total === 1 ? 'record' : 'records'}</p>
        </div>
        <Link href={href} className="focus-ring rounded-xs font-sans text-label font-medium text-action underline underline-offset-2">Open<span className="sr-only"> {label}</span></Link>
      </div>
      <Distribution rows={rows} empty="No records in this period" />
      {facts && <p className="font-sans text-caption text-ink-muted">{facts}</p>}
    </Card>
  );
}

function SheqContent() {
  const confirm = useConfirm();
  const narrow = useMediaQuery('(max-width: 480px)');
  const { raw, loading, refreshing, loadError, lastUpdated, refresh } = useSheqDashboardData();
  const loaded = lastUpdated !== null;
  const [tab, setTab] = useState('overview');
  const [range, setRange] = useState<QuickRange | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [targets, setTargets] = usePersistentState<Record<TargetKey, number>>('sheq_weekly_targets', DEFAULT_TARGETS, validTargets);
  const [editingTargets, setEditingTargets] = useState(false);
  const [notes, setNotes] = usePersistentState<Comment[]>('sheq_dash_notes', [], validNotes);
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [ai, setAi] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRefresh) timer.current = setInterval(refresh, 5 * 60 * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [autoRefresh, refresh]);

  const [from, to] = useMemo(() => rangeToFromTo(range, customFrom, customTo), [range, customFrom, customTo]);
  const stats = useMemo(() => computeStats(raw, from, to), [raw, from, to]);
  const actuals = useMemo(() => weeklyActuals(raw), [raw]);
  const week = useMemo(() => weekLabel(), []);
  const { totals } = stats;
  const everything = raw.nm.length + raw.ws.length + raw.vfl.length + raw.pto.length + raw.insp.length + raw.pach.length;
  const status = deriveDataStatus({ loaded, loading, error: loadError || null, errorStatus: null, count: everything, transient: false });
  const pending = loading && !loaded;

  const runAnalysis = useCallback(async () => {
    setAiLoading(true); setAiError('');
    try {
      setAi(await postSafetyAnalysis({ near_miss: raw.nm, work_stoppage: raw.ws, vfl: raw.vfl, pto: raw.pto, inspections: raw.insp, pachedu: raw.pach, period_label: range === 'all' ? 'all time' : range }) as AiResult);
    } catch (e) { setAiError(`Analysis failed: ${(e as Error).message}`); }
    finally { setAiLoading(false); }
  }, [raw, range]);

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes([{ id: Date.now().toString(), text: noteText.trim(), author: noteAuthor.trim() || 'Safety manager', ts: new Date().toISOString() }, ...notes].slice(0, 50));
    setNoteText('');
  };
  const removeNote = async (c: Comment) => {
    if (!await confirm({ title: 'Delete this note?', message: 'Notes are kept on this device only, so this cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    setNotes(notes.filter(x => x.id !== c.id));
  };

  const alerts: { text: string; tone: 'warning' | 'danger' }[] = [];
  if (stats.pto.highRisk > 0) alerts.push({ text: `${stats.pto.highRisk} planned task ${stats.pto.highRisk === 1 ? 'observation is' : 'observations are'} flagged as high risk.`, tone: 'warning' });
  if (totals.totalActionsPend > 5) alerts.push({ text: `${totals.totalActionsPend} corrective actions are pending. Review is required.`, tone: 'warning' });
  if (stats.insp.criticalFindings > 0) alerts.push({ text: `${stats.insp.criticalFindings} critical inspection ${stats.insp.criticalFindings === 1 ? 'finding needs' : 'findings need'} immediate action.`, tone: 'danger' });
  if (stats.insp.overdueFindings > 0) alerts.push({ text: `${stats.insp.overdueFindings} inspection ${stats.insp.overdueFindings === 1 ? 'finding is' : 'findings are'} overdue.`, tone: 'danger' });

  const trend = stats.months.map(m => ({ month: m.label, reports: m.count }));
  const delta = trend.length >= 2 ? trend[trend.length - 1].reports - trend[trend.length - 2].reports : null;
  const score = stats.safetyScore;

  const monthRows = MODULES.map(m => ({ id: m.key, label: m.label, counts: stats.moduleMonthly[m.key] }));
  const monthColumns: Column<(typeof monthRows)[number]>[] = [
    { id: 'label', header: 'Module', sticky: true, cell: r => r.label },
    ...stats.months.map((m, i) => ({ id: `m${i}`, header: m.label, numeric: true, cell: (r: (typeof monthRows)[number]) => r.counts[i] })),
    { id: 'sum', header: 'Total', numeric: true, cell: r => r.counts.reduce((a, b) => a + b, 0) },
  ];

  const weeklyRows = TARGET_MODULES.map(m => { const actual = actuals[m.key]; const target = targets[m.key]; return { ...m, id: m.key, actual, target, p: Math.min(Math.round((actual / target) * 100), 100), st: weeklyStatus(actual, target) }; });
  const weeklyColumns: Column<(typeof weeklyRows)[number]>[] = [
    { id: 'label', header: 'Module', sticky: true, cell: r => <Link href={r.href} className="focus-ring rounded-xs text-action underline underline-offset-2">{r.label}</Link> },
    { id: 'actual', header: 'This week', numeric: true, cell: r => r.actual },
    { id: 'target', header: 'Target', numeric: true, cell: r => r.target },
    { id: 'p', header: 'Achievement', cell: r => <Progress value={r.p} label={`${r.label} weekly achievement`} className="min-w-32" /> },
    { id: 'st', header: 'Status', cell: r => <StatusBadge tone={r.st.tone}>{r.st.label}</StatusBadge> },
  ];
  const met = weeklyRows.filter(r => r.actual >= r.target).length;
  const totalTarget = weeklyRows.reduce((s, r) => s + r.target, 0);
  const totalActual = weeklyRows.reduce((s, r) => s + r.actual, 0);
  const overall = Math.min(Math.round((totalActual / totalTarget) * 100), 100);

  const SHORT: Record<ModuleKey, string> = { nm: 'Near miss', ws: 'Stoppage', vfl: 'VFL', pto: 'PTO', insp: 'Inspect.', pach: 'Pachedu' };
  const reportsByModule = MODULES.map(m => ({ name: SHORT[m.key], value: stats[m.key].total }));
  const actionRows = [{ name: 'Completed', value: totals.totalActionsDone }, { name: 'In progress', value: totals.totalActionsProg }, { name: 'Pending', value: totals.totalActionsPend }];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'SHEQ dashboard' }]}
        title="SHEQ safety dashboard"
        description="Overview across near miss, work stoppage, VFL, PTO, inspections and Pachedu."
        actions={(
          <>
            <Button variant={autoRefresh ? "secondary" : "ghost"} icon="sync" aria-pressed={autoRefresh} onClick={() => setAutoRefresh(a => !a)}>{autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}</Button>
            <IconButton icon="refresh" label="Refresh dashboard" variant="ghost" pending={(loading && loaded) || refreshing} onClick={() => refresh()} />
          </>
        )}
      />
      {lastUpdated && <p className="-mt-3 font-sans text-caption text-ink-muted">Refreshed {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{autoRefresh ? ' · refreshes every 5 minutes' : ''}</p>}

      <Toolbar>
        <Segmented label="Period" value={range} onValueChange={setRange} options={RANGES} />
        {range === 'custom' && (
          <>
            <Input type="date" aria-label="From date" className="w-40" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <Input type="date" aria-label="To date" className="w-40" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </>
        )}
      </Toolbar>

      <DataRegion
        status={status}
        subject="the SHEQ dashboard"
        error={loadError || null}
        onRetry={() => refresh()}
        skeletonRows={4}
        empty={<EmptyState icon="compliance" title="No safety records yet" description="The dashboard fills in as near miss, work stoppage, VFL, PTO, inspection and Pachedu records are logged." />}
      >
        <MetricGrid compact>
          <MetricTile compact label="Total reports" detail="All six modules" value={totals.totalReports} loading={pending} />
          <MetricTile compact label="Near miss" href="/near_miss" detail={`${stats.nm.mechanical} mech, ${stats.nm.electrical} elec, ${stats.nm.general} general`} value={stats.nm.total} loading={pending} />
          <MetricTile compact label="Work stoppages" href="/work_stoppage" detail={`${stats.ws.actPend} ${stats.ws.actPend === 1 ? 'action' : 'actions'} pending`} value={stats.ws.total} loading={pending} />
          <MetricTile compact label="VFL observations" href="/vfl" detail={`${stats.vfl.safe} safe, ${stats.vfl.unsafe} unsafe`} value={stats.vfl.total} loading={pending} />
          <MetricTile compact label="PTO reports" href="/pto" tone={stats.pto.highRisk ? 'warning' : 'default'} detail={`${stats.pto.highRisk} high risk`} value={stats.pto.total} loading={pending} />
          <MetricTile compact label="Inspections" href="/sheq_inspection" detail={`${stats.insp.openFindings} open ${stats.insp.openFindings === 1 ? 'finding' : 'findings'}`} value={stats.insp.total} loading={pending} />
          <MetricTile compact label="Pending actions" tone={totals.totalActionsPend > 5 ? 'warning' : 'default'} detail={`${totals.totalActionsDone} completed`} value={totals.totalActionsPend} loading={pending} />
        </MetricGrid>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList aria-label="SHEQ dashboard sections">
            <TabsTrigger value="overview" icon="home">Overview</TabsTrigger>
            <TabsTrigger value="weekly" icon="target">Weekly targets</TabsTrigger>
            <TabsTrigger value="modules" icon="grid-view">Modules</TabsTrigger>
            <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="analysis" icon="shield">Analysis</TabsTrigger>
            <TabsTrigger value="notes" icon="draft" count={notes.length || undefined}>Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 flex flex-col gap-4">
            {alerts.map(a => <Notice key={a.text} tone={a.tone} title={a.text} />)}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartPanel
                title="Safety score"
                description="Average of the measures below that have records in this period"
                summary={score === null ? 'No safety score: there are no records in this period to judge.' : `Safety score ${score} out of 100, ${scoreLabel(score).toLowerCase()}. ${stats.scoreParts.map(p => (p.value === null ? `${p.label}: no records` : `${p.label} ${Math.round(p.value)} percent`)).join('; ')}.`}
              >
                <div className="flex flex-col gap-4">
                  {score === null ? (
                    <p className="font-sans text-body text-ink-muted">No score for this period. Nothing has been recorded that the score can judge.</p>
                  ) : (
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-display font-semibold tabular text-ink">{score}</span>
                      <span className="font-sans text-body text-ink-muted">out of 100</span>
                      <StatusBadge tone={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}>{scoreLabel(score)}</StatusBadge>
                    </div>
                  )}
                  <ul className="flex flex-col gap-3">
                    {stats.scoreParts.map(p => (
                      <li key={p.key}>
                        <div className="mb-1 flex justify-between font-sans text-body-sm"><span className="text-ink">{p.label}</span><span className="tabular text-ink-muted">{p.den > 0 ? `${p.num} of ${p.den}` : 'No records'}</span></div>
                        {p.value !== null && <Progress value={p.value} label={p.label} />}
                      </li>
                    ))}
                  </ul>
                </div>
              </ChartPanel>
              <ChartPanel
                title="Monthly report trend"
                description="All modules combined, last six months"
                summary={`Reports per month: ${trend.map(t => `${t.month} ${t.reports}`).join(', ')}.${delta === null ? '' : ` ${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta)} on the previous month.`}`}
              >
                {delta !== null && <p className="mb-2 font-sans text-body-sm text-ink-muted">{delta >= 0 ? '+' : ''}{delta} compared with the previous month</p>}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="month" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Bar dataKey="reports" name="Reports" fill={chartColor(1)} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
            <section aria-labelledby="sheq-monthly">
              <h2 id="sheq-monthly" className="mb-3 font-display text-section font-semibold text-ink">Reports per module and month</h2>
              <DataTable caption="Reports per module and month" rows={monthRows} columns={monthColumns} getRowId={r => r.id} />
            </section>
          </TabsContent>

          <TabsContent value="weekly" className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-sans text-body-sm text-ink-muted">Week of {week}. Targets are saved on this device only.</p>
              <Button icon="edit" onClick={() => setEditingTargets(true)}>Edit targets</Button>
            </div>
            <DataTable caption="Weekly performance against target" rows={weeklyRows} columns={weeklyColumns} getRowId={r => r.id} />
            <Card padding="lg" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><p className="font-sans text-caption text-ink-muted">Modules on target</p><p className="font-display text-title font-semibold tabular text-ink">{met} of {weeklyRows.length}</p></div>
              <div><p className="font-sans text-caption text-ink-muted">Records this week</p><p className="font-display text-title font-semibold tabular text-ink">{totalActual} of {totalTarget}</p></div>
              <div><p className="mb-1 font-sans text-caption text-ink-muted">Overall achievement</p><Progress value={overall} label="Overall weekly achievement" /></div>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ModuleCard label="Near miss" href="/near_miss" total={stats.nm.total} rows={[{ name: 'Mechanical', value: stats.nm.mechanical }, { name: 'Electrical', value: stats.nm.electrical }, { name: 'General', value: stats.nm.general }]} facts="Near miss records carry no status, so only the section split is shown." />
            <ModuleCard label="Work stoppage" href="/work_stoppage" total={stats.ws.total} rows={[{ name: 'Actions done', value: stats.ws.actDone }, { name: 'In progress', value: stats.ws.actProg }, { name: 'Pending', value: stats.ws.actPend }]} facts="Corrective actions across all stoppages." />
            <ModuleCard label="Visible felt leadership" href="/vfl" total={stats.vfl.total} rows={[{ name: 'Safe', value: stats.vfl.safe }, { name: 'Unsafe', value: stats.vfl.unsafe }]} facts={`${stats.vfl.actTotal} actions recorded.`} />
            <ModuleCard label="Planned task observation" href="/pto" total={stats.pto.total} rows={[{ name: 'Low risk', value: stats.pto.total - stats.pto.highRisk }, { name: 'High risk', value: stats.pto.highRisk }]} facts={`${stats.pto.initial} initial, ${stats.pto.followup} follow-up.`} />
            <ModuleCard label="SHEQ inspections" href="/sheq_inspection" total={stats.insp.total} rows={[{ name: 'Approved', value: stats.insp.approved }, { name: 'Submitted', value: stats.insp.submitted }, { name: 'Draft', value: stats.insp.draft }, { name: 'Rejected', value: stats.insp.rejected }]} facts={`${stats.insp.openFindings} open findings, ${stats.insp.criticalFindings} critical.`} />
            <ModuleCard label="Pachedu" href="/pachedu" total={stats.pach.total} rows={[{ name: 'Closed', value: stats.pach.closed }, { name: 'Reviewed', value: stats.pach.reviewed }, { name: 'Submitted', value: stats.pach.submitted }, { name: 'Draft', value: stats.pach.draft }]} facts={`${stats.pach.intentional} intentional, ${stats.pach.unintentional} unintentional.`} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="Reports by module" summary={`Reports by module: ${summarise(reportsByModule)}.`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={reportsByModule} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval={0} angle={narrow ? -40 : 0} textAnchor={narrow ? 'end' : 'middle'} height={narrow ? 60 : 30} />
                  <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar dataKey="value" name="Reports" fill={chartColor(2)} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Action items" description="Across work stoppage, VFL and PTO" summary={`Corrective actions: ${summarise(actionRows)} of ${totals.totalActions}.`}>
              {totals.totalActions === 0 ? <p className="py-4 font-sans text-body-sm text-ink-muted">No actions recorded in this period.</p> : <Distribution rows={actionRows} />}
            </ChartPanel>
            <ChartPanel title="VFL behaviour" description="Safe and unsafe observations" summary={`VFL behaviour: ${stats.vfl.safe} safe and ${stats.vfl.unsafe} unsafe of ${stats.vfl.total}.`}>
              {stats.vfl.total === 0 ? <p className="py-4 font-sans text-body-sm text-ink-muted">No VFL observations in this period.</p> : (
                <div className="flex flex-col gap-3">
                  <Distribution rows={[{ name: 'Safe', value: stats.vfl.safe }, { name: 'Unsafe', value: stats.vfl.unsafe }]} />
                  <Progress value={pct(stats.vfl.safe, stats.vfl.total)} label="Safe share of VFL observations" />
                </div>
              )}
            </ChartPanel>
            <ChartPanel title="Pachedu behaviour" description="Intentional and unintentional" summary={`Pachedu: ${stats.pach.intentional} intentional, ${stats.pach.unintentional} unintentional, ${stats.pach.closed + stats.pach.reviewed} resolved of ${stats.pach.total}.`}>
              {stats.pach.total === 0 ? <p className="py-4 font-sans text-body-sm text-ink-muted">No Pachedu reports in this period.</p> : (
                <div className="flex flex-col gap-3">
                  <Distribution rows={[{ name: 'Intentional', value: stats.pach.intentional }, { name: 'Unintentional', value: stats.pach.unintentional }]} />
                  <p className="font-sans text-caption text-ink-muted">Resolved (closed or reviewed)</p>
                  <Progress value={pct(stats.pach.closed + stats.pach.reviewed, stats.pach.total)} label="Pachedu resolved share" />
                </div>
              )}
            </ChartPanel>
            <ChartPanel title="Near miss by section" summary={`Near miss by section: ${stats.nm.mechanical} mechanical, ${stats.nm.electrical} electrical, ${stats.nm.general} general.`}>
              <Distribution rows={[{ name: 'Mechanical', value: stats.nm.mechanical }, { name: 'Electrical', value: stats.nm.electrical }, { name: 'General', value: stats.nm.general }]} />
            </ChartPanel>
            <ChartPanel title="Action plan progress" description="Completed actions per module" summary={`Action completion: work stoppage ${stats.ws.actDone} of ${stats.ws.actTotal}, VFL ${stats.vfl.actDone} of ${stats.vfl.actTotal}, PTO ${stats.pto.actDone} of ${stats.pto.actTotal}.`}>
              <ul className="flex flex-col gap-3">
                {[{ label: 'Work stoppage', done: stats.ws.actDone, total: stats.ws.actTotal }, { label: 'VFL', done: stats.vfl.actDone, total: stats.vfl.actTotal }, { label: 'PTO', done: stats.pto.actDone, total: stats.pto.actTotal }, { label: 'All combined', done: totals.totalActionsDone, total: totals.totalActions }].map(r => (
                  <li key={r.label}>
                    <div className="mb-1 flex justify-between font-sans text-body-sm"><span className="text-ink">{r.label}</span><span className="tabular text-ink-muted">{r.total > 0 ? `${r.done} of ${r.total}` : 'No actions recorded'}</span></div>
                    {r.total > 0 && <Progress value={pct(r.done, r.total)} label={`${r.label} action completion`} />}
                  </li>
                ))}
              </ul>
            </ChartPanel>
          </TabsContent>

          <TabsContent value="analysis" className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon="analytics" pending={aiLoading} disabled={loading || refreshing} onClick={runAnalysis}>{aiLoading ? 'Analysing' : ai ? 'Re-analyse' : 'Analyse'}</Button>
              {ai?._records_analysed != null && <span className="font-sans text-caption text-ink-muted">{ai._records_analysed} records analysed across all modules</span>}
            </div>
            {aiError && <Notice tone="danger" title={aiError} />}
            {!ai && !aiError && <p className="font-sans text-body-sm text-ink-muted">Run the analysis to see hotspots, trend direction, a risk score and prioritised recommendations. It reads every record, not only the selected period.</p>}
            {ai && !aiLoading && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card padding="lg" className="md:col-span-2"><h3 className="font-sans text-caption text-ink-muted">Executive summary</h3><p className="mt-1 font-sans text-body text-ink">{ai.summary}</p></Card>
                  <Card padding="lg">
                    <h3 className="font-sans text-caption text-ink-muted">Risk level</h3>
                    <p className="font-display text-display font-semibold tabular text-ink">{ai.risk_score ?? 'n/a'}</p>
                    <StatusBadge tone={RISK_TONE[ai.overall_risk ?? ''] ?? 'neutral'}>{(ai.overall_risk ?? 'unknown').toUpperCase()}</StatusBadge>
                    {typeof ai.risk_score === 'number' && <Progress value={ai.risk_score} label="Risk score" className="mt-3" />}
                  </Card>
                </div>
                {(ai.problem_areas ?? []).length > 0 && (
                  <section aria-labelledby="ai-problems">
                    <h3 id="ai-problems" className="mb-2 font-display text-section font-semibold text-ink">Problem areas</h3>
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {ai.problem_areas!.map((p, i) => (
                        <li key={i}><Card className="h-full">
                          <div className="flex items-start justify-between gap-2"><p className="font-sans text-body font-medium text-ink">{p.title}</p><StatusBadge tone={RISK_TONE[p.severity ?? ''] ?? 'neutral'}>{(p.severity ?? '').toUpperCase()}</StatusBadge></div>
                          <p className="mt-1 font-sans text-body-sm text-ink-muted">{p.description}</p>
                          <p className="mt-2 font-sans text-caption text-ink-muted">{[p.module, p.location_or_dept, p.count ? `${p.count} incidents` : ''].filter(Boolean).join(' · ')}</p>
                        </Card></li>
                      ))}
                    </ul>
                  </section>
                )}
                {(ai.recommendations ?? []).length > 0 && (
                  <section aria-labelledby="ai-recs">
                    <h3 id="ai-recs" className="mb-2 font-display text-section font-semibold text-ink">Recommendations</h3>
                    <ol className="flex flex-col gap-2">
                      {ai.recommendations!.map((r, i) => (
                        <li key={i}><Card className="flex flex-wrap gap-3">
                          <StatusBadge tone={PRIORITY_TONE[r.priority ?? ''] ?? 'info'}>{(r.priority ?? '').replace('_', ' ').toUpperCase()}</StatusBadge>
                          <div className="min-w-0 flex-1"><p className="font-sans text-body font-medium text-ink">{r.action}</p><p className="font-sans text-body-sm text-ink-muted">{r.rationale}</p>
                            {(r.owner || r.target) && <p className="mt-1 font-sans text-caption text-ink-muted">{[r.owner && `Owner: ${r.owner}`, r.target && `Target: ${r.target}`].filter(Boolean).join(' · ')}</p>}</div>
                        </Card></li>
                      ))}
                    </ol>
                  </section>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(ai.trends ?? []).length > 0 && (
                    <Card padding="lg"><h3 className="mb-2 font-sans text-caption text-ink-muted">Trends</h3>
                      <ul className="flex flex-col gap-2">{ai.trends!.map((t, i) => <li key={i}><p className="font-sans text-body font-medium text-ink">{t.metric} <span className="font-normal text-ink-muted">({t.direction ?? 'stable'})</span></p><p className="font-sans text-body-sm text-ink-muted">{t.insight}</p></li>)}</ul></Card>
                  )}
                  {((ai.top_risk_locations ?? []).length > 0 || (ai.top_risk_departments ?? []).length > 0) && (
                    <Card padding="lg"><h3 className="mb-2 font-sans text-caption text-ink-muted">Risk hotspots</h3>
                      {(ai.top_risk_locations ?? []).length > 0 && <><p className="font-sans text-caption text-ink-muted">Locations</p><ul className="mb-2 list-disc pl-5 font-sans text-body text-ink">{ai.top_risk_locations!.map(l => <li key={l}>{l}</li>)}</ul></>}
                      {(ai.top_risk_departments ?? []).length > 0 && <><p className="font-sans text-caption text-ink-muted">Departments</p><ul className="list-disc pl-5 font-sans text-body text-ink">{ai.top_risk_departments!.map(d => <li key={d}>{d}</li>)}</ul></>}
                    </Card>
                  )}
                </div>
                <p className="text-right font-sans text-caption text-ink-muted">Generated {ai.generated_at ? new Date(ai.generated_at).toLocaleString('en-GB') : ''}. Review the recommendations with your safety team before acting.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-5 flex flex-col gap-4">
            <p className="font-sans text-body-sm text-ink-muted">Notes are saved on this device only; they are not shared with other people or devices.</p>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end" onSubmit={e => { e.preventDefault(); addNote(); }}>
              <Field label="Your name" optional><Input value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} placeholder="Safety manager" /></Field>
              <Field label="Note"><Textarea rows={2} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a safety observation, flag or reminder" /></Field>
              <Button variant="primary" type="submit" icon="plus" disabled={!noteText.trim()}>Add note</Button>
            </form>
            {notes.length === 0 ? <EmptyState icon="draft" title="No notes yet" description="Add safety observations, flags or reminders above." /> : (
              <ul className="flex flex-col gap-2">
                {notes.map(c => (
                  <li key={c.id}><Card className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="whitespace-pre-wrap font-sans text-body text-ink">{c.text}</p><p className="mt-1 font-sans text-caption text-ink-muted">{c.author} · {formatDateTime(c.ts)}</p></div>
                    <IconButton icon="delete" variant="danger" size="sm" label={`Delete note by ${c.author}`} onClick={() => removeNote(c)} />
                  </Card></li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DataRegion>

      <TargetsDialog targets={targets} open={editingTargets} onOpenChange={setEditingTargets} onSave={t => { setTargets(t); toast.success('Weekly targets saved on this device.'); }} />
    </div>
  );
}

export default function SHEQDashboardPage() {
  return <AppShell migrated><SheqContent /></AppShell>;
}
