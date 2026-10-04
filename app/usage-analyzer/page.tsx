// app/usage-analyzer/page.tsx — Usage Analyzer: how the app is actually used. Two data sources:
// "This device" reads lib/usage's local event log (localStorage, always available, live-refreshes);
// "All users" (manager and above) reads the backend-persisted event log via fetchRemoteEvents, the
// durable cross-device copy including anonymous visitors.
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import {
  Button, Card, ChartPanel, EmptyState, IconButton, MetricGrid, MetricTile, Notice, PageHeader, Progress, Rating, Segmented, SkeletonRows, chartColor, chartTheme, useConfirm,
} from '@/components/ui-system';
import {
  getEvents, clearUsage, USAGE_EVENT, summarize, topModules, topSearches, usageOverTime, hourWeekdayHeat, usageByHourSplit, dailyActivity, dwellByPath, getFeedback, fmtDuration,
  fetchRemoteEvents, topUsers, signedInVsAnonymous, byModule, moduleKeyOf, type UsageEvent, type Granularity, type EnrichedUsageEvent,
} from '@/lib/usage';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS: Record<Granularity, number> = { day: 30, week: 12, month: 12 };
/** Heatmap cell colour: the first chart colour at a given strength, from tokens. */
const heat = (intensity: number, slot: 1 | 3 = 1) => `color-mix(in srgb, ${chartColor(slot)} ${Math.round((0.15 + intensity * 0.75) * 100)}%, transparent)`;

/** Live-updating snapshot of the local usage event log. */
function useUsageEvents(): [UsageEvent[], () => void] {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const refresh = () => setEvents(getEvents());
    refresh();
    window.addEventListener(USAGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(USAGE_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, [nonce]);
  return [events, () => setNonce(n => n + 1)];
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-title font-semibold text-ink">{title}</h2>{action}</div>
      {children}
    </Card>
  );
}
const NoData = ({ hint = 'No data yet.' }: { hint?: string }) => <p className="py-6 text-center font-sans text-body-sm text-ink-muted">{hint}</p>;

function RankList<T extends { key?: string }>({ items, render }: { items: T[]; render: (item: T, index: number) => ReactNode }) {
  return <ol className="flex flex-col gap-1">{items.map((item, i) => <li key={item.key ?? i} className="flex items-center gap-3 rounded-control px-2 py-1.5 font-sans text-body-sm hover:bg-surface-subtle"><span className="w-4 shrink-0 text-caption text-ink-muted tabular">{i + 1}</span>{render(item, i)}</li>)}</ol>;
}

function UsageAnalyzerContent() {
  const confirm = useConfirm();
  const [localEvents, refresh] = useUsageEvents();
  const { isAtLeast } = useAuth();
  const canViewAll = isAtLeast('manager');

  const [dataSource, setDataSource] = useState<'local' | 'all'>('local');
  const [remoteEvents, setRemoteEvents] = useState<EnrichedUsageEvent[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const loadRemote = () => {
    setRemoteLoading(true);
    setRemoteError(null);
    fetchRemoteEvents(180)
      .then(events => { setRemoteEvents(events); setRemoteLoaded(true); })
      .catch((e: Error & { status?: number }) => setRemoteError(e.status === 401 || e.status === 403 ? 'You need the manager role to view activity across all users.' : 'Activity across all users could not be loaded right now.'))
      .finally(() => setRemoteLoading(false));
  };

  const switchSource = (next: 'local' | 'all') => {
    setDataSource(next);
    if (next === 'all' && canViewAll && !remoteLoaded && !remoteLoading) loadRemote();
  };

  const events: UsageEvent[] = dataSource === 'all' ? remoteEvents : localEvents;
  const userSplit = useMemo(() => signedInVsAnonymous(remoteEvents), [remoteEvents]);
  const activeUsers = useMemo(() => topUsers(remoteEvents, 10), [remoteEvents]);

  // Selecting a module scopes the time-based charts to it; the breakdown panels stay global.
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const moduleUsage = useMemo(() => byModule(events), [events]);
  const filteredEvents = useMemo(() => (moduleFilter ? events.filter(e => (e.type === 'module_open' || e.type === 'page_view') && moduleKeyOf(e) === moduleFilter) : events), [events, moduleFilter]);
  const [granularity, setGranularity] = useState<Granularity>('day');

  const s = useMemo(() => summarize(filteredEvents), [filteredEvents]);
  const modules = useMemo(() => topModules(events, 10), [events]);
  const searches = useMemo(() => topSearches(events, 8), [events]);
  const overTime = useMemo(() => usageOverTime(filteredEvents, granularity, PERIODS[granularity]), [filteredEvents, granularity]);
  const week = useMemo(() => hourWeekdayHeat(filteredEvents), [filteredEvents]);
  const byHour = useMemo(() => usageByHourSplit(filteredEvents), [filteredEvents]);
  const days = useMemo(() => dailyActivity(filteredEvents, 98), [filteredEvents]);
  const calendarWeeks = useMemo(() => {
    if (days.length === 0) return [];
    const pad = new Date(`${days[0].date}T00:00:00`).getDay();
    const cells: (typeof days[number] | null)[] = [...Array(pad).fill(null), ...days];
    const weeks: (typeof days[number] | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [days]);
  const maxDayCount = useMemo(() => Math.max(1, ...days.map(d => d.count)), [days]);
  const dwell = useMemo(() => dwellByPath(events, 10), [events]);
  const feedback = useMemo(() => getFeedback(events), [events]);

  const hasData = events.length > 0;
  const busiestLabel = s.busiestHour ? `${String(s.busiestHour.hour).padStart(2, '0')}:00` : 'No data';
  const moduleLabel = moduleFilter ? moduleUsage.find(m => m.module === moduleFilter)?.label ?? moduleFilter : null;
  const busiestDay = useMemo(() => {
    let best = { day: 0, hour: 0, v: 0 };
    week.grid.forEach((row, day) => row.forEach((v, hour) => { if (v > best.v) best = { day, hour, v }; }));
    return best.v > 0 ? `${DAY_LABELS[best.day]} at ${String(best.hour).padStart(2, '0')}:00 with ${best.v} interactions` : 'no activity yet';
  }, [week]);

  const clearAll = async () => {
    if (await confirm({ title: 'Clear the usage analytics stored on this device?', message: 'This cannot be undone.', confirmLabel: 'Clear', destructive: true })) { clearUsage(); refresh(); }
  };

  const showRemoteSkeleton = dataSource === 'all' && remoteLoading && remoteEvents.length === 0;
  const showRemoteError = dataSource === 'all' && remoteError !== null && remoteEvents.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Analytics and insights' }, { label: 'Usage analyzer' }]}
        title="Usage analyzer"
        description="How this workspace is being used: most-opened modules, activity over time, busiest hours, dwell time and feedback."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh usage data" variant="outline" pending={remoteLoading} onClick={() => (dataSource === 'all' ? loadRemote() : refresh())} />
            {dataSource === 'local' && <Button variant="danger-quiet" icon="delete" onClick={clearAll}>Clear</Button>}
          </>
        )}
      />

      {canViewAll && <Segmented label="Data source" value={dataSource} onValueChange={switchSource} options={[{ value: 'local', label: 'This device' }, { value: 'all', label: 'All users' }]} />}

      {dataSource === 'all' && remoteError && <Notice tone="warning" title={remoteError} action={<Button size="sm" onClick={loadRemote}>Try again</Button>} />}

      {showRemoteSkeleton ? <SkeletonRows rows={4} label="Loading activity across all users" />
        : showRemoteError ? null
        : !hasData ? <EmptyState icon="analytics" title="No usage recorded yet" description="As you open modules, browse pages, search and leave feedback, this page fills with charts: most-used modules, activity trends, a time-of-day heatmap, dwell time and more." />
        : (
          <>
            <MetricGrid columns={4}>
              <MetricTile label="Interactions" icon="activity" value={s.moduleOpens + s.pageViews} />
              <MetricTile label="Module opens" icon="app" value={s.moduleOpens} />
              <MetricTile label="Active days" icon="calendar" value={s.activeDays} />
              <MetricTile label="Searches" icon="search" value={s.searches} />
              <MetricTile label="Busiest hour" icon="clock" value={busiestLabel} />
              <MetricTile label="Average rating" icon="starred" value={s.avgFeedbackRating ? `${s.avgFeedbackRating.toFixed(1)} of 5` : 'No data'} detail={`From ${s.feedbackCount} feedback`} />
              {dataSource === 'all' && <MetricTile label="Signed-in users" icon="employees" value={userSplit.distinctUsers} />}
              {dataSource === 'all' && <MetricTile label="Anonymous visitors" icon="user" value={userSplit.distinctAnonymousSessions} />}
            </MetricGrid>

            <Panel title="By module" action={moduleFilter ? <Button size="sm" onClick={() => setModuleFilter(null)}>Showing {moduleLabel} only. Clear</Button> : undefined}>
              {moduleUsage.length === 0 ? <NoData /> : (
                <ul className="flex flex-col gap-1">
                  {moduleUsage.slice(0, 12).map(m => {
                    const active = moduleFilter === m.module;
                    return (
                      <li key={m.module}>
                        <button type="button" aria-pressed={active} onClick={() => setModuleFilter(active ? null : m.module)} aria-label={`${active ? 'Clear filter for' : 'Filter by'} ${m.label}`} className="focus-ring w-full rounded-control px-2.5 py-2 text-left hover:bg-surface-subtle aria-pressed:bg-action-soft">
                          <span className="mb-1 flex items-center justify-between gap-2 font-sans text-body-sm"><span className="truncate text-ink">{m.label}</span><span className="shrink-0 text-ink-muted">{dataSource === 'all' && m.distinctUsers > 0 ? `${m.distinctUsers} ${m.distinctUsers === 1 ? 'user' : 'users'} · ` : ''}<strong className="font-semibold text-ink">{m.total}</strong></span></span>
                          <Progress value={(m.total / (moduleUsage[0].total || 1)) * 100} label={`${m.label}: ${m.total}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {dataSource === 'all' && userSplit.signedIn + userSplit.anonymous > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Signed-in and anonymous">
                  <Progress value={(userSplit.signedIn / (userSplit.signedIn + userSplit.anonymous)) * 100} label="Share of interactions by signed-in users" />
                  <p className="font-sans text-body-sm text-ink-muted">{userSplit.signedIn} signed-in interactions, {userSplit.anonymous} anonymous interactions.</p>
                </Panel>
                <Panel title="Most active users">
                  {activeUsers.length === 0 ? <NoData /> : <RankList items={activeUsers} render={u => <><span className="min-w-0 flex-1 truncate text-ink">{u.label}</span><span className="text-ink-muted">{u.anonymous ? 'Anonymous' : 'Signed in'}</span><strong className="font-semibold text-ink tabular">{u.count}</strong></>} />}
                </Panel>
              </div>
            )}

            <ChartPanel
              title={`Activity by ${granularity}${moduleLabel ? `: ${moduleLabel}` : ''}`}
              summary={`Module opens and page views per ${granularity}: ${overTime.map(p => `${p.label} ${p.opens + p.views}`).join(', ')}.`}
            >
              <div className="mb-3"><Segmented label="Time grouping" value={granularity} onValueChange={setGranularity} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} /></div>
              <ResponsiveContainer width="100%" height={240} minWidth={320}>
                <LineChart data={overTime} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTheme.axisTick} tickLine={false} axisLine={false} interval={granularity === 'day' ? 4 : 0} />
                  <YAxis tick={chartTheme.axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Legend wrapperStyle={chartTheme.legend} />
                  <Line type="monotone" dataKey="opens" name="Module opens" stroke={chartColor(1)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="views" name="Page views" stroke={chartColor(2)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartPanel title="Most-used modules" summary={modules.length ? `Module opens: ${modules.map(m => `${m.label} ${m.count}`).join(', ')}.` : 'No module opens yet.'}>
                {modules.length === 0 ? <NoData /> : (
                  <ResponsiveContainer width="100%" height={Math.max(180, modules.length * 30)} minWidth={280}>
                    <BarChart data={modules} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                      <XAxis type="number" tick={chartTheme.axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={chartTheme.axisTick} tickLine={false} axisLine={false} width={110} />
                      <Tooltip {...chartTheme.tooltip} />
                      <Bar dataKey="count" name="Opens" fill={chartColor(1)} radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
              <ChartPanel title="Activity by time of day" summary={`Interactions by hour of day. Busiest hour: ${busiestLabel}.`}>
                <ResponsiveContainer width="100%" height={220} minWidth={320}>
                  <AreaChart data={byHour} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis dataKey="hour" tick={chartTheme.axisTick} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={chartTheme.axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
                    <Tooltip {...chartTheme.tooltip} />
                    <Legend wrapperStyle={chartTheme.legend} />
                    <Area type="monotone" dataKey="opens" name="Module opens" stroke={chartColor(1)} strokeWidth={2} fill={chartColor(1)} fillOpacity={0.25} stackId="1" />
                    <Area type="monotone" dataKey="views" name="Page views" stroke={chartColor(2)} strokeWidth={2} fill={chartColor(2)} fillOpacity={0.25} stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            <ChartPanel title="When in the week the app is used" description="All history. Darker cells mean more interactions." summary={`Interactions by weekday and hour. Busiest slot: ${busiestDay}.`}>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="mb-1 flex gap-[3px] pl-9">{Array.from({ length: 24 }, (_, h) => <div key={h} className="flex-1 text-center font-sans text-caption text-ink-muted">{h % 3 === 0 ? h : ''}</div>)}</div>
                  {week.grid.map((row, day) => (
                    <div key={day} className="mb-[3px] flex items-center gap-[3px]">
                      <div className="w-8 shrink-0 font-sans text-caption text-ink-muted">{DAY_LABELS[day]}</div>
                      {row.map((v, hour) => <div key={hour} className="aspect-square flex-1 rounded-[3px]" style={{ background: v === 0 ? 'var(--mo-surface-muted)' : heat(week.max ? v / week.max : 0) }} title={`${DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00: ${v} ${v === 1 ? 'interaction' : 'interactions'}`} />)}
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-end gap-1.5 font-sans text-caption text-ink-muted"><span>Less</span>{[0.15, 0.4, 0.65, 0.9].map(o => <span key={o} className="size-2.5 rounded-[2px]" style={{ background: heat(o) }} />)}<span>More</span></div>
                </div>
              </div>
            </ChartPanel>

            <ChartPanel title="Daily activity" description="Last 14 weeks. Hover a day for the exact date and times." summary={`${days.filter(d => d.count > 0).length} active days in the last 14 weeks; busiest day had ${maxDayCount} interactions.`}>
              <div className="overflow-x-auto">
                <div className="flex min-w-fit gap-[3px]">
                  {calendarWeeks.map((w, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {w.map((day, di) => {
                        if (!day) return <div key={di} className="size-[13px]" />;
                        const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        const title = day.count === 0 ? `${dateLabel}: no activity` : `${dateLabel}: ${day.count} ${day.count === 1 ? 'interaction' : 'interactions'}${day.times.length ? ` at ${day.times.join(', ')}${day.count > day.times.length ? '…' : ''}` : ''}`;
                        return <div key={di} className="size-[13px] rounded-[3px]" style={{ background: day.count === 0 ? 'var(--mo-surface-muted)' : heat(day.count / maxDayCount, 3) }} title={title} />;
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1.5 font-sans text-caption text-ink-muted"><span>Less</span>{[0.15, 0.4, 0.65, 0.9].map(o => <span key={o} className="size-2.5 rounded-[2px]" style={{ background: heat(o, 3) }} />)}<span>More</span></div>
              </div>
            </ChartPanel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Time spent per page">
                {dwell.length === 0 ? <NoData hint="Browse a few pages to record dwell time." /> : (
                  <ul className="flex flex-col gap-3">
                    {dwell.map(d => (
                      <li key={d.path}>
                        <div className="mb-1 flex items-center justify-between gap-2 font-sans text-body-sm"><span className="truncate text-ink">{d.path}</span><strong className="shrink-0 font-semibold text-ink tabular">{fmtDuration(d.totalMs)}</strong></div>
                        <Progress value={(d.totalMs / (dwell[0].totalMs || 1)) * 100} label={`${d.path}: ${fmtDuration(d.totalMs)}`} />
                        <p className="mt-0.5 font-sans text-caption text-ink-muted">{d.visits} {d.visits === 1 ? 'visit' : 'visits'}, average {fmtDuration(d.avgMs)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Top searches">
                {searches.length === 0 ? <NoData hint="Use the search bar to build history." /> : <RankList items={searches} render={q => <><span className="min-w-0 flex-1 truncate text-ink">{q.label}</span><strong className="font-semibold text-ink tabular">{q.count}×</strong></>} />}
              </Panel>
            </div>

            <Panel title={`Feedback (${feedback.length})`}>
              {feedback.length === 0 ? <NoData hint="Send feedback from the top bar. It collects here by page and rating." /> : (
                <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                  {feedback.map((f, i) => (
                    <li key={i} className="rounded-control border border-line-subtle bg-surface-subtle px-3 py-2">
                      <div className="mb-0.5 flex items-center justify-between gap-2"><span className="truncate font-sans text-label font-medium text-ink">{f.page}</span>{f.rating > 0 ? <Rating value={f.rating} /> : <span className="font-sans text-caption text-ink-muted">No rating</span>}</div>
                      {f.text && <p className="font-sans text-body text-ink">{f.text}</p>}
                      <p className="mt-0.5 font-sans text-caption text-ink-muted">{new Date(f.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
    </div>
  );
}

export default function UsageAnalyzerPage() {
  return <AppShell migrated><UsageAnalyzerContent /></AppShell>;
}
