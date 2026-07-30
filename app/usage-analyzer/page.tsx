// app/usage-analyzer/page.tsx — Usage Analyzer: rich visualisations of how the app is
// actually used. Two data sources: "This device" reads lib/usage's local event log
// (localStorage, always available, live-refreshes); "All users" (manager+) reads the
// backend-persisted event log (app/routers/usage.py) via fetchRemoteEvents — the
// durable, cross-device, cross-session copy, including anonymous visitors.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import {
  Activity, BarChart3, Clock, MessageSquare, Search, Star, Layers,
  RefreshCw, Trash2, Calendar, TrendingUp, Users, Globe,
} from '@/components/shared/theme';
import { useTheme, PageHero, StatTile, GlowCard, ACCENT_HEX, useConfirm } from '@/components/shared/theme';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  getEvents, clearUsage, USAGE_EVENT, summarize, topModules, topSearches,
  usageOverTime, hourWeekdayHeat, usageByHourSplit, dailyActivity, dwellByPath, getFeedback, fmtDuration,
  fetchRemoteEvents, topUsers, signedInVsAnonymous, byModule, moduleKeyOf,
  type UsageEvent, type Granularity, type EnrichedUsageEvent,
} from '@/lib/usage';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Two-series categorical order (fixed): opens vs page views.
const SERIES = { opens: ACCENT_HEX.blue, views: ACCENT_HEX.violet };

function useChartStyle() {
  const t = useTheme();
  return useMemo(() => ({
    grid: t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
    tick: { fill: t.light ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.45)', fontSize: 10 },
    tooltipBg: t.light ? '#ffffff' : 'rgba(15,23,42,0.96)',
    tooltipBorder: t.light ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.12)',
    emptyCell: t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)',
  }), [t.light]);
}

/** Live-updating snapshot of the usage event log. */
function useUsageEvents(): [UsageEvent[], () => void] {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const refresh = () => setEvents(getEvents());
    refresh();
    window.addEventListener(USAGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(USAGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [nonce]);
  return [events, () => setNonce(n => n + 1)];
}

export default function UsageAnalyzerPage() {
  const t = useTheme();
  const confirm = useConfirm();
  const cs = useChartStyle();
  const [localEvents, refresh] = useUsageEvents();
  const { isAtLeast } = useAuth();
  const canViewAll = isAtLeast('manager');

  // "This device" (localStorage, always available) vs "All users" (backend, manager+
  // only — cross-user, cross-device, including anonymous visitors). The whole point
  // of the backend build is that localStorage can never show what other people did.
  const [dataSource, setDataSource] = useState<'local' | 'all'>('local');
  const [remoteEvents, setRemoteEvents] = useState<EnrichedUsageEvent[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const loadRemote = () => {
    setRemoteLoading(true);
    setRemoteError(null);
    fetchRemoteEvents(180)
      .then(setRemoteEvents)
      .catch((e: Error & { status?: number }) => {
        setRemoteError(
          e.status === 401 || e.status === 403
            ? "You need manager role to view cross-user activity."
            : 'Could not load cross-user activity right now.'
        );
      })
      .finally(() => setRemoteLoading(false));
  };

  useEffect(() => {
    if (dataSource === 'all' && canViewAll && remoteEvents.length === 0 && !remoteLoading && !remoteError) loadRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  const events: UsageEvent[] = dataSource === 'all' ? remoteEvents : localEvents;
  const userSplit = useMemo(() => signedInVsAnonymous(remoteEvents), [remoteEvents]);
  const activeUsers = useMemo(() => topUsers(remoteEvents, 10), [remoteEvents]);

  // Clicking a "By module" row scopes the time-based charts (activity-over-time, hour
  // heatmap, day-of-week heatmap, calendar) down to that module — the breakdown panels
  // (top modules, searches, dwell, feedback) stay global since they're their own views.
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const moduleUsage = useMemo(() => byModule(events), [events]);
  const filteredEvents = useMemo(
    () => moduleFilter ? events.filter(e => (e.type === 'module_open' || e.type === 'page_view') && moduleKeyOf(e) === moduleFilter) : events,
    [events, moduleFilter]
  );

  const [granularity, setGranularity] = useState<Granularity>('day');
  const PERIODS: Record<Granularity, number> = { day: 30, week: 12, month: 12 };

  const s = useMemo(() => summarize(filteredEvents), [filteredEvents]);
  const modules = useMemo(() => topModules(events, 10), [events]);
  const searches = useMemo(() => topSearches(events, 8), [events]);
  const overTime = useMemo(() => usageOverTime(filteredEvents, granularity, PERIODS[granularity]), [filteredEvents, granularity]);
  const heat = useMemo(() => hourWeekdayHeat(filteredEvents), [filteredEvents]);
  const byHour = useMemo(() => usageByHourSplit(filteredEvents), [filteredEvents]);
  const days = useMemo(() => dailyActivity(filteredEvents, 98), [filteredEvents]);
  // GitHub-style calendar grid: columns are weeks, rows are Sun..Sat — pad the first
  // column so `days[0]` lands on its correct weekday rather than always at row 0.
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
  const busiestLabel = s.busiestHour ? `${String(s.busiestHour.hour).padStart(2, '0')}:00` : '—';

  const clearAll = async () => {
    if (await confirm({ title: 'Clear all locally-stored usage analytics?', message: 'This cannot be undone.', destructive: true })) {
      clearUsage();
      refresh();
    }
  };

  const doRefresh = () => (dataSource === 'all' ? loadRemote() : refresh());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: cs.tooltipBg, border: `1px solid ${cs.tooltipBorder}`, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}>
        <p className={`font-semibold mb-1 ${t.textPrimary}`}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className={t.textMuted} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <PageHero
          icon={BarChart3}
          accent="violet"
          crumbs={['Analytics & Insights', 'Usage Analyzer']}
          title="Usage Analyzer"
          description="How this workspace is being used — most-opened modules, activity over time, busiest hours, dwell time and feedback."
          actions={
            <>
              <button onClick={doRefresh} type="button" title="Refresh" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} ${t.shadow} transition-shadow`}>
                <RefreshCw className={`h-3.5 w-3.5 ${remoteLoading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
              </button>
              {dataSource === 'local' && (
                <button onClick={clearAll} type="button" title="Clear data" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-rose-500 ${t.glassSoft} ${t.shadow} hover:bg-rose-500/10 transition-colors`}>
                  <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </>
          }
        />

        {canViewAll && (
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg w-fit ${t.chipBg}`}>
            <button type="button" onClick={() => setDataSource('local')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${dataSource === 'local' ? `${t.glass} ${t.textPrimary} ${t.shadow}` : `${t.textFaint} ${t.hoverText}`}`}>
              <Layers className="h-3.5 w-3.5" /> This device
            </button>
            <button type="button" onClick={() => setDataSource('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${dataSource === 'all' ? `${t.glass} ${t.textPrimary} ${t.shadow}` : `${t.textFaint} ${t.hoverText}`}`}>
              <Globe className="h-3.5 w-3.5" /> All users
            </button>
          </div>
        )}

        {dataSource === 'all' && remoteError && (
          <GlowCard color={ACCENT_HEX.amber} className="p-4">
            <p className={`text-[12.5px] ${t.textMuted}`}>{remoteError}</p>
          </GlowCard>
        )}

        {dataSource === 'all' && remoteLoading && remoteEvents.length === 0 ? (
          <GlowCard color={ACCENT_HEX.violet} className="p-10 text-center">
            <RefreshCw className={`h-6 w-6 mx-auto mb-2 animate-spin ${t.textFaint}`} />
            <p className={`text-[12.5px] ${t.textFaint}`}>Loading cross-user activity…</p>
          </GlowCard>
        ) : !hasData ? (
          <GlowCard color={ACCENT_HEX.violet} className="p-10 text-center">
            <Activity className={`h-8 w-8 mx-auto mb-3 ${t.textFaint}`} />
            <p className={`text-[14px] font-medium ${t.textPrimary}`}>No usage recorded yet</p>
            <p className={`text-[12.5px] ${t.textFaint} mt-1 max-w-md mx-auto`}>
              As you open modules, browse pages, search and leave feedback, this page fills with charts — most-used modules, activity trends, a time-of-day heatmap, dwell time and more.
            </p>
          </GlowCard>
        ) : (
          <>
            {/* ── Headline stat tiles ─────────────────────────────────────── */}
            <GlowCard color={ACCENT_HEX.blue} className="px-2 py-2">
              <div className="flex flex-wrap items-center gap-1">
                <StatTile icon={Activity} color={ACCENT_HEX.blue} value={s.moduleOpens + s.pageViews} label="interactions" />
                <StatTile icon={Layers} color={ACCENT_HEX.violet} value={s.moduleOpens} label="module opens" />
                <StatTile icon={Calendar} color={ACCENT_HEX.emerald} value={s.activeDays} label="active days" />
                <StatTile icon={Search} color={ACCENT_HEX.cyan} value={s.searches} label="searches" />
                <StatTile icon={Clock} color={ACCENT_HEX.amber} value={busiestLabel} label="busiest hour" />
                <StatTile icon={Star} color={ACCENT_HEX.amber} value={s.avgFeedbackRating ? `${s.avgFeedbackRating.toFixed(1)}★` : '—'} label={`from ${s.feedbackCount} feedback`} />
                {dataSource === 'all' && (
                  <>
                    <StatTile icon={Users} color={ACCENT_HEX.emerald} value={userSplit.distinctUsers} label="signed-in users" />
                    <StatTile icon={Globe} color={ACCENT_HEX.cyan} value={userSplit.distinctAnonymousSessions} label="anonymous visitors" />
                  </>
                )}
              </div>
            </GlowCard>

            {/* ── By module (drill-down) ───────────────────────────────────── */}
            <GlowCard color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <SectionTitle icon={Layers} label="By module" noMargin />
                {moduleFilter && (
                  <button type="button" onClick={() => setModuleFilter(null)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverText} transition-colors`}>
                    Showing {moduleUsage.find(m => m.module === moduleFilter)?.label ?? moduleFilter} only — clear
                  </button>
                )}
              </div>
              {moduleUsage.length === 0 ? <Empty t={t} /> : (
                <div className="space-y-1.5">
                  {moduleUsage.slice(0, 12).map(m => {
                    const max = moduleUsage[0].total || 1;
                    const active = moduleFilter === m.module;
                    return (
                      <button key={m.module} type="button" onClick={() => setModuleFilter(active ? null : m.module)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${active ? `${t.chipBg} ring-1 ring-brand-500/40` : t.hoverBgSoft}`}>
                        <div className="flex items-center justify-between gap-2 text-[12.5px] mb-1">
                          <span className={`${t.textMuted} truncate`}>{m.label}</span>
                          <span className={`flex items-center gap-2 shrink-0 ${t.textFaint}`}>
                            {dataSource === 'all' && m.distinctUsers > 0 && <span>{m.distinctUsers} user{m.distinctUsers === 1 ? '' : 's'}</span>}
                            <span className={`font-semibold ${t.textPrimary}`}>{m.total}</span>
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden`}>
                          <div className="h-full rounded-full" style={{ width: `${(m.total / max) * 100}%`, background: ACCENT_HEX.violet }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlowCard>

            {/* ── Who's using it (signed-in vs anonymous, top users) ────────── */}
            {dataSource === 'all' && (userSplit.signedIn + userSplit.anonymous) > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-4">
                  <SectionTitle icon={Users} label="Signed-in vs anonymous" />
                  <div className="flex items-center gap-4 mt-1">
                    <div className={`h-2.5 rounded-full flex-1 overflow-hidden flex ${t.chipBg}`}>
                      <div className="h-full" style={{ width: `${(userSplit.signedIn / (userSplit.signedIn + userSplit.anonymous)) * 100}%`, background: ACCENT_HEX.emerald }} />
                      <div className="h-full" style={{ width: `${(userSplit.anonymous / (userSplit.signedIn + userSplit.anonymous)) * 100}%`, background: ACCENT_HEX.cyan }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11.5px]">
                    <span className={t.textMuted}><span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: ACCENT_HEX.emerald }} />{userSplit.signedIn} signed-in interactions</span>
                    <span className={t.textMuted}><span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: ACCENT_HEX.cyan }} />{userSplit.anonymous} anonymous interactions</span>
                  </div>
                </GlowCard>

                <GlowCard color={ACCENT_HEX.cyan} surface={`${t.glass} rounded-2xl`} className="p-4">
                  <SectionTitle icon={Globe} label="Most-active users" />
                  {activeUsers.length === 0 ? <Empty t={t} /> : (
                    <div className="space-y-1.5 mt-1">
                      {activeUsers.map((u, i) => (
                        <div key={u.key} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${t.hoverBgSoft}`}>
                          <span className={`text-[11px] font-bold tabular-nums w-4 ${t.textFaint}`}>{i + 1}</span>
                          {u.anonymous ? <Globe className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} /> : <Users className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />}
                          <span className={`text-[12.5px] ${t.textMuted} truncate flex-1`}>{u.label}</span>
                          <span className={`text-[11px] font-semibold tabular-nums ${t.textPrimary}`}>{u.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlowCard>
              </div>
            )}

            {/* ── Activity over time (2-series line, day/week/month) ────────── */}
            <GlowCard color={ACCENT_HEX.blue} surface={`${t.glass} rounded-2xl`} className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <SectionTitle icon={TrendingUp} label={`Activity by ${granularity}${moduleFilter ? ` — ${moduleUsage.find(m => m.module === moduleFilter)?.label ?? moduleFilter}` : ''}`} noMargin />
                <div className={`flex items-center gap-0.5 p-0.5 rounded-lg ${t.chipBg}`}>
                  {(['day', 'week', 'month'] as Granularity[]).map(g => (
                    <button key={g} type="button" onClick={() => setGranularity(g)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${granularity === g ? `${t.glass} ${t.textPrimary} ${t.shadow}` : `${t.textFaint} ${t.hoverText}`}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={240} minWidth={320}>
                  <LineChart data={overTime} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={cs.grid} vertical={false} />
                    <XAxis dataKey="label" tick={cs.tick} tickLine={false} axisLine={false} interval={granularity === 'day' ? 4 : 0} />
                    <YAxis tick={cs.tick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="opens" name="Module opens" stroke={SERIES.opens} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="views" name="Page views" stroke={SERIES.views} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ── Most-used modules (horizontal bar) ────────────────────── */}
              <GlowCard color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="p-4">
                <SectionTitle icon={Layers} label="Most-used modules" />
                {modules.length === 0 ? <Empty t={t} /> : (
                  <div className="overflow-x-auto">
                    <ResponsiveContainer width="100%" height={Math.max(180, modules.length * 30)} minWidth={280}>
                      <BarChart data={modules} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={cs.grid} horizontal={false} />
                        <XAxis type="number" tick={cs.tick} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" tick={cs.tick} tickLine={false} axisLine={false} width={110} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                        <Bar dataKey="count" name="Opens" fill={ACCENT_HEX.violet} radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlowCard>

              {/* ── Usage by hour (stacked area, opens vs views) ─────────────── */}
              <GlowCard color={ACCENT_HEX.amber} surface={`${t.glass} rounded-2xl`} className="p-4">
                <SectionTitle icon={Clock} label="Activity by time of day" />
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={220} minWidth={320}>
                    <AreaChart data={byHour} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="hourOpens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT_HEX.violet} stopOpacity={0.55} />
                          <stop offset="95%" stopColor={ACCENT_HEX.violet} stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="hourViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT_HEX.amber} stopOpacity={0.55} />
                          <stop offset="95%" stopColor={ACCENT_HEX.amber} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={cs.grid} vertical={false} />
                      <XAxis dataKey="hour" tick={cs.tick} tickLine={false} axisLine={false} interval={2} tickFormatter={(h) => `${h}`} />
                      <YAxis tick={cs.tick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="opens" name="Module opens" stroke={ACCENT_HEX.violet} strokeWidth={2} fill="url(#hourOpens)" stackId="1" />
                      <Area type="monotone" dataKey="views" name="Page views" stroke={ACCENT_HEX.amber} strokeWidth={2} fill="url(#hourViews)" stackId="1" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlowCard>
            </div>

            {/* ── Hour × weekday heatmap (single-hue sequential) ──────────── */}
            <GlowCard color={ACCENT_HEX.blue} surface={`${t.glass} rounded-2xl`} className="p-4">
              <SectionTitle icon={Calendar} label="When in the week the app is used (aggregated across all history)" />
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="flex gap-[3px] mb-1 pl-9">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className={`flex-1 text-center text-[8.5px] ${t.textFaint}`}>{h % 3 === 0 ? h : ''}</div>
                    ))}
                  </div>
                  {heat.grid.map((row, day) => (
                    <div key={day} className="flex items-center gap-[3px] mb-[3px]">
                      <div className={`w-8 text-[9.5px] ${t.textFaint} shrink-0`}>{DAY_LABELS[day]}</div>
                      {row.map((v, hour) => {
                        const intensity = heat.max ? v / heat.max : 0;
                        const bg = v === 0 ? cs.emptyCell : `rgba(37,99,235,${(0.15 + intensity * 0.75).toFixed(3)})`;
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square rounded-[3px]"
                            style={{ background: bg }}
                            title={`${DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00 — ${v} interaction${v === 1 ? '' : 's'}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className={`flex items-center justify-end gap-1.5 mt-2 text-[9.5px] ${t.textFaint}`}>
                    <span>Less</span>
                    {[0.15, 0.4, 0.65, 0.9].map(o => <span key={o} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `rgba(37,99,235,${o})` }} />)}
                    <span>More</span>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* ── Calendar heatmap (real dates, GitHub-style) ──────────────── */}
            <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-4">
              <SectionTitle icon={Calendar} label="Daily activity — last 14 weeks (exact dates)" />
              <div className="overflow-x-auto">
                <div className="flex gap-[3px] min-w-fit">
                  {calendarWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((day, di) => {
                        if (!day) return <div key={di} className="h-[13px] w-[13px]" />;
                        const intensity = day.count ? day.count / maxDayCount : 0;
                        const bg = day.count === 0 ? cs.emptyCell : `rgba(16,185,129,${(0.15 + intensity * 0.75).toFixed(3)})`;
                        const d = new Date(`${day.date}T00:00:00`);
                        const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        const title = day.count === 0
                          ? `${dateLabel} — no activity`
                          : `${dateLabel} — ${day.count} interaction${day.count === 1 ? '' : 's'}${day.times.length ? ` at ${day.times.join(', ')}${day.count > day.times.length ? '…' : ''}` : ''}`;
                        return <div key={di} className="h-[13px] w-[13px] rounded-[3px]" style={{ background: bg }} title={title} />;
                      })}
                    </div>
                  ))}
                </div>
                <div className={`flex items-center justify-end gap-1.5 mt-2 text-[9.5px] ${t.textFaint}`}>
                  <span>Less</span>
                  {[0.15, 0.4, 0.65, 0.9].map(o => <span key={o} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `rgba(16,185,129,${o})` }} />)}
                  <span>More</span>
                  <span className="ml-2">Hover a day for exact date &amp; times</span>
                </div>
              </div>
            </GlowCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ── Dwell time by page ────────────────────────────────────── */}
              <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-4">
                <SectionTitle icon={Clock} label="Time spent per page" />
                {dwell.length === 0 ? <Empty t={t} hint="Browse a few pages to record dwell time." /> : (
                  <div className="space-y-2 mt-1">
                    {dwell.map(d => {
                      const max = dwell[0].totalMs || 1;
                      return (
                        <div key={d.path}>
                          <div className="flex items-center justify-between text-[12px] mb-0.5">
                            <span className={`${t.textMuted} truncate mr-2`}>{d.path}</span>
                            <span className={`${t.textPrimary} font-semibold tabular-nums shrink-0`}>{fmtDuration(d.totalMs)}</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden`}>
                            <div className="h-full rounded-full" style={{ width: `${(d.totalMs / max) * 100}%`, background: ACCENT_HEX.emerald }} />
                          </div>
                          <p className={`text-[10px] ${t.textFaint} mt-0.5`}>{d.visits} visit{d.visits === 1 ? '' : 's'} · avg {fmtDuration(d.avgMs)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlowCard>

              {/* ── Top searches ──────────────────────────────────────────── */}
              <GlowCard color={ACCENT_HEX.cyan} surface={`${t.glass} rounded-2xl`} className="p-4">
                <SectionTitle icon={Search} label="Top searches" />
                {searches.length === 0 ? <Empty t={t} hint="Use the search bar to build history." /> : (
                  <div className="space-y-1.5 mt-1">
                    {searches.map((q, i) => (
                      <div key={q.key} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${t.hoverBgSoft}`}>
                        <span className={`text-[11px] font-bold tabular-nums w-4 ${t.textFaint}`}>{i + 1}</span>
                        <Search className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
                        <span className={`text-[12.5px] ${t.textMuted} truncate flex-1`}>{q.label}</span>
                        <span className={`text-[11px] font-semibold tabular-nums ${t.textPrimary}`}>{q.count}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlowCard>
            </div>

            {/* ── Feedback log + analysis ─────────────────────────────────── */}
            <GlowCard color={ACCENT_HEX.amber} surface={`${t.glass} rounded-2xl`} className="p-4">
              <SectionTitle icon={MessageSquare} label={`Feedback (${feedback.length})`} />
              {feedback.length === 0 ? <Empty t={t} hint="Leave feedback from the bottom bar — it collects here by page and rating." /> : (
                <div className="space-y-2 mt-1 max-h-[360px] overflow-y-auto pr-1">
                  {feedback.map((f, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2 ${t.glassSoft}`}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[11px] font-medium ${t.textMuted} truncate`}>{f.page}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`h-3 w-3 ${n <= f.rating ? 'text-amber-400' : t.textFaint}`} weight={n <= f.rating ? 'fill' : 'regular'} />
                          ))}
                        </div>
                      </div>
                      {f.text && <p className={`text-[12.5px] ${t.textSecondary}`}>{f.text}</p>}
                      <p className={`text-[10px] ${t.textFaint} mt-0.5`}>{new Date(f.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SectionTitle({ icon: Icon, label, noMargin }: { icon: React.ElementType; label: string; noMargin?: boolean }) {
  const t = useTheme();
  return (
    <div className={`flex items-center gap-2 ${noMargin ? '' : 'mb-3'}`}>
      <Icon className={`h-4 w-4 ${t.textMuted}`} />
      <h2 className={`text-[13px] font-semibold ${t.textPrimary}`}>{label}</h2>
    </div>
  );
}

function Empty({ t, hint }: { t: ReturnType<typeof useTheme>; hint?: string }) {
  return <p className={`text-[12px] ${t.textFaint} py-6 text-center`}>{hint || 'No data yet.'}</p>;
}
