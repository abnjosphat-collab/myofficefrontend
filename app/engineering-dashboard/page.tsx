'use client';
import { useState, useMemo } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus, Wrench, RefreshCw, Gauge, ClipboardCheck, Clock3, AlertTriangle, ClipboardList, Droplet, Users } from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, StatCard, ACCENT_HEX, type Accent, TYPE_WEIGHT } from '@/components/shared/theme';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useEngineeringDashboardData, statusDist } from './useEngineeringDashboardData';

const PRIORITY_HEX: Record<string, string> = { critical: '#f43f5e', high: '#f59e0b', medium: '#86BBD8', low: '#94a3b8' };

interface KpiCardProps {
  label: string; value: string | number; unit?: string;
  target?: number; actual?: number; trend?: 'up' | 'down' | 'flat';
  good?: 'high' | 'low'; icon: React.ElementType; accent: Accent;
}
function KpiCard({ label, value, unit, target, actual, trend, good = 'high', icon, accent }: KpiCardProps) {
  const onTarget = actual !== undefined && target !== undefined
    ? (good === 'high' ? actual >= target : actual <= target) : null;
  const direction: 'up' | 'down' = trend === 'down' ? 'down' : 'up';
  const trendGood = trend === 'up' ? good === 'high' : trend === 'down' ? good === 'low' : true;
  const trendLabel = target !== undefined
    ? `Target ${target}${unit ?? ''} · ${onTarget ? 'on target' : 'below target'}`
    : trend === 'flat' ? 'Stable' : trendGood ? 'Improving' : 'Needs attention';
  return (
    <StatCard icon={icon} accent={accent} label={label} value={`${value}${unit ?? ''}`}
      trend={trend ? { direction: trendGood ? 'up' : 'down', label: trendLabel } : undefined} />
  );
}

function useChartColors() {
  const t = useTheme();
  return useMemo(() => ({
    grid: t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.05)',
    tick: { fill: t.light ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.4)', fontSize: 11 },
    tooltipStyle: {
      background: t.light ? 'rgba(255,255,255,0.98)' : 'rgba(5,15,28,0.92)',
      border: t.light ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12, fontSize: 11,
      color: t.light ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
    },
  }), [t.light]);
}

function CustomTooltip({ active, payload, label, tooltipStyle, textFaint }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl" style={tooltipStyle}>
      <p className={`mb-1 ${textFaint}`}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className={`${TYPE_WEIGHT.semibold}`}>{p.name}: {p.value}{p.name === 'target' || p.name === 'actual' ? '%' : ''}</p>
      ))}
    </div>
  );
}

function EngineeringDashboardContent() {
  const t = useTheme();
  const { grid, tick, tooltipStyle } = useChartColors();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const { openWOs, bdTrend, topFails, avTrend, loading } = useEngineeringDashboardData();

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={LayoutDashboard}
        accent="violet"
        crumbs={['Engineering', 'Dashboard']}
        title="Engineering Dashboard"
        description="Gold Mine Operations · June 2024"
        actions={
          <div className="flex gap-1">
            {(['week', 'month', 'quarter'] as const).map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.semibold} transition-all ${period === p ? 'bg-cyan-500/20 text-cyan-500' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Fleet Availability" value={83} unit="%" target={85} actual={83} trend="up" icon={Gauge} accent="emerald" />
        <KpiCard label="PM Compliance" value={87} unit="%" target={90} actual={87} trend="down" icon={ClipboardCheck} accent="amber" />
        <KpiCard label="Avg MTTR" value={4.2} unit="h" target={4} actual={4.2} trend="down" good="low" icon={Clock3} accent="cyan" />
        <KpiCard label="Breakdowns (MTD)" value={22} target={20} actual={22} trend="up" good="low" icon={AlertTriangle} accent="amber" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Open Work Orders" value={18} trend="flat" icon={ClipboardList} accent="amber" />
        <KpiCard label="Overdue PMs" value={3} trend="down" good="low" icon={AlertTriangle} accent="amber" />
        <KpiCard label="Lube Compliance" value={94} unit="%" target={95} actual={94} trend="up" icon={Droplet} accent="emerald" />
        <KpiCard label="Contractor Jobs" value={5} trend="flat" icon={Users} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <p className={`text-sm ${TYPE_WEIGHT.semibold} mb-4 ${t.textPrimary}`}>Fleet Availability vs Target (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={avTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 95]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip tooltipStyle={tooltipStyle} textFaint={t.textFaint} />} />
              <Line type="monotone" dataKey="target" stroke="rgba(134,187,216,0.4)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="target" />
              <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <p className={`text-sm ${TYPE_WEIGHT.semibold} mb-2 ${t.textPrimary}`}>Fleet Status Now</p>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                  {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} units`, n]} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {statusDist.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className={t.textMuted}>{d.name}</span>
                </div>
                <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <p className={`text-sm ${TYPE_WEIGHT.semibold} mb-4 ${t.textPrimary}`}>Monthly Breakdown Count</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bdTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#f87171" radius={[6, 6, 0, 0]} name="Breakdowns" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <p className={`text-sm ${TYPE_WEIGHT.semibold} mb-3 ${t.textPrimary}`}>Top 5 Repeat Failures (MTD)</p>
          <div className="space-y-2">
            {topFails.map((b, i) => (
              <div key={b.equipment} className="flex items-center gap-3">
                <span className={`text-xs w-4 shrink-0 ${t.textFaint}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{b.equipment}</p>
                  <div className={`h-1.5 mt-1 rounded-full ${t.chipBg} overflow-hidden`}>
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${(b.count / 10) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{b.count}×</p>
                  <p className={`text-[10px] ${t.textFaint}`}>{b.hours}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#86BBD8]" />
            <span className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>Open Work Orders ({openWOs.length})</span>
          </div>
          <a href="/job-cards" className="text-xs text-[#86BBD8] hover:text-[#86BBD8]/70 transition-colors">View all →</a>
        </div>
        <div>
          {loading ? (
            <div className={`flex items-center justify-center py-6 gap-2 ${t.textFaint} text-sm`}>
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : openWOs.map(wo => (
            <div key={wo.id} className={`flex items-center gap-3 px-5 py-3 border-b ${t.border} last:border-0 ${t.hoverBg} transition-colors`}>
              <span className={`text-xs font-mono w-28 shrink-0 ${t.textFaint}`}>{wo.id}</span>
              <p className={`text-sm flex-1 truncate ${t.textPrimary}`}>{wo.title}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${TYPE_WEIGHT.semibold}`} style={{ color: PRIORITY_HEX[wo.priority], background: `${PRIORITY_HEX[wo.priority]}22`, border: `1px solid ${PRIORITY_HEX[wo.priority]}40` }}>{wo.priority}</span>
              <span className={`text-xs shrink-0 ${t.textFaint}`}>{wo.assigned}</span>
              <span className={`text-xs ${TYPE_WEIGHT.semibold} shrink-0`} style={{ color: wo.age <= 1 ? undefined : wo.age <= 3 ? '#f59e0b' : '#f43f5e' }}>{wo.age}d</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function EngineeringDashboard() {
  return <AppShell><EngineeringDashboardContent /></AppShell>;
}
