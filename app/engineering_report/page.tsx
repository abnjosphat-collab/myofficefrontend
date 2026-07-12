// FILE: app/engineering_report/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, StatCard, type Accent } from '@/components/shared/theme';
import {
  FileBarChart, RefreshCw, Download, Calendar, Wrench, Activity,
  AlertTriangle, CheckCircle2, TrendingUp,
  Gauge, Shield, Package, ClipboardList, ChevronDown,
} from '@/components/shared/theme';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

function kpiAccent(val: number, target: number, goodHigh = true): Accent {
  const ok = goodHigh ? val >= target : val <= target;
  const warn = goodHigh ? val >= target * 0.9 : val <= target * 1.1;
  return ok ? 'emerald' : warn ? 'amber' : 'blue';
}

interface KpiCardProps {
  label: string; value: string | number; unit?: string;
  target?: string; accent?: Accent; trend?: 'up' | 'down' | 'flat';
  icon: React.ElementType;
}
function KpiCard({ label, value, unit, target, accent = 'cyan', trend, icon }: KpiCardProps) {
  return (
    <StatCard icon={icon} accent={accent} label={label} value={`${value}${unit ?? ''}`}
      trend={trend && trend !== 'flat' ? { direction: trend, label: target ? `Target ${target}` : trend === 'up' ? 'Improving' : 'Declining' } : undefined} />
  );
}

function useChartStyle() {
  const t = useTheme();
  return useMemo(() => ({
    grid: t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
    tick: { fill: t.light ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.4)', fontSize: 11 },
    tooltipStyle: {
      backgroundColor: t.light ? '#ffffff' : '#0f1e2e',
      border: t.light ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(134,187,216,0.2)',
      borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12,
    },
  }), [t.light]);
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  const t = useTheme();
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-[#86BBD8]/15 border border-[#86BBD8]/20">
        <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
      </div>
      <h2 className={`text-sm font-bold tracking-tight ${t.textPrimary}`}>{title}</h2>
      <div className={`flex-1 h-px ${t.border} border-t`} />
    </div>
  );
}

function EngineeringReportContent() {
  const t = useTheme();
  const { grid, tick, tooltipStyle } = useChartStyle();
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [loading, setLoading] = useState(true);

  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [lube, setLube] = useState<any[]>([]);
  const [openPeriod, setOpenPeriod] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bdR, jcR, prR, coR, luR] = await Promise.allSettled([
        fetch(`${API}/api/breakdowns`),
        fetch(`${API}/api/job-cards`),
        fetch(`${API}/api/production`),
        fetch(`${API}/api/compliance`),
        fetch(`${API}/api/lubrication`),
      ]);
      if (bdR.status === 'fulfilled' && bdR.value.ok) setBreakdowns(await bdR.value.json());
      if (jcR.status === 'fulfilled' && jcR.value.ok) setJobCards(await jcR.value.json());
      if (prR.status === 'fulfilled' && prR.value.ok) setProduction(await prR.value.json());
      if (coR.status === 'fulfilled' && coR.value.ok) setCompliance(await coR.value.json());
      if (luR.status === 'fulfilled' && luR.value.ok) setLube(await luR.value.json());
    } catch { /* silently use empty fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inPeriod = (dateStr?: string) => !!dateStr && dateStr.startsWith(period);

  const periodBDs = breakdowns.filter(b => inPeriod(b.breakdown_date || b.date || b.created_at));
  const periodJCs = jobCards.filter(j => inPeriod(j.created_at || j.scheduled_date));
  const periodProd = production.filter(p => inPeriod(p.prod_date));
  const overdueComp = compliance.filter((c: any) => c.status === 'overdue');
  const dueSoonComp = compliance.filter((c: any) => c.status === 'due_soon');
  const overdueLube = lube.filter((l: any) => l.status === 'overdue');

  const totalBDs = periodBDs.length;
  const totalDowntime = periodBDs.reduce((s: number, b: any) => s + Number(b.downtime_hours || b.duration_hours || 0), 0);
  const avgMTTR = totalBDs > 0 ? (totalDowntime / totalBDs).toFixed(1) : '0';
  const completedJCs = periodJCs.filter((j: any) => j.status === 'completed').length;
  const openJCs = jobCards.filter((j: any) => j.status === 'open' || j.status === 'in_progress').length;
  const pmCompliance = periodJCs.length > 0 ? Math.round((completedJCs / periodJCs.length) * 100) : 0;

  const totalTonnes = periodProd.reduce((s: number, r: any) => s + Number(r.tonnes_milled || 0), 0);
  const avgRecovery = periodProd.length > 0
    ? (periodProd.reduce((s: number, r: any) => s + Number(r.recovery_pct || 0), 0) / periodProd.length).toFixed(1)
    : '0';
  const totalGold = periodProd.reduce((s: number, r: any) => s + Number(r.gold_produced_oz || 0), 0).toFixed(1);

  const now = new Date();
  const bdTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = MONTHS[d.getMonth()];
    const pfx = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const count = breakdowns.filter(b => (b.breakdown_date || b.date || b.created_at || '').startsWith(pfx)).length;
    return { month: label, count };
  });

  const equipCount: Record<string, number> = {};
  periodBDs.forEach((b: any) => {
    const eq = b.equipment_name || 'Unknown';
    equipCount[eq] = (equipCount[eq] || 0) + 1;
  });
  const topFails = Object.entries(equipCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([equipment, count]) => ({ equipment, count }));

  const prodTrend = [...periodProd].reverse().slice(-10).map((r: any) => ({
    date: (r.prod_date || '').slice(5),
    tonnes: Number(r.tonnes_milled || 0),
    target: 1900,
  }));

  const jcStatuses = ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'];
  const jcDist = jcStatuses.map(s => ({
    status: s.replace('_', ' '),
    count: jobCards.filter((j: any) => j.status === s).length,
  })).filter(s => s.count > 0);

  const periodLabel = (() => {
    const [y, m] = period.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  })();

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return { val, label };
  });

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHero
        icon={FileBarChart}
        accent="violet"
        crumbs={['Engineering', 'Monthly Report']}
        title="Engineering Monthly Report"
        description={`${periodLabel} · Gold Mine Operations`}
        actions={
          <>
            <div className="relative">
              <button type="button" onClick={() => setOpenPeriod(v => !v)}
                className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}>
                <Calendar className="h-3.5 w-3.5 text-[#86BBD8]" />
                {periodLabel}
                <ChevronDown className={`h-3 w-3 ${t.textFaint}`} />
              </button>
              {openPeriod && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenPeriod(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-[160] rounded-xl overflow-hidden w-44 ${t.glass} ${t.shadow}`}>
                    {periodOptions.map(o => (
                      <button key={o.val} type="button"
                        onClick={() => { setPeriod(o.val); setOpenPeriod(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${t.hoverBg} ${period === o.val ? 'text-[#86BBD8] font-semibold' : t.textMuted}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={load} disabled={loading} title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all disabled:opacity-40`}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => window.print()}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#2A4D69]/60 border border-[#86BBD8]/35 text-white text-xs font-semibold hover:bg-[#2A4D69]/80 transition-all">
              <Download className="h-3.5 w-3.5" /> Print / Export
            </button>
          </>
        }
      />

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <SectionHeader title="Maintenance Performance" icon={Wrench} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Breakdowns (MTD)" value={totalBDs} accent={kpiAccent(totalBDs, 20, false)} target="≤20" icon={AlertTriangle} trend={totalBDs <= 20 ? 'down' : 'up'} />
          <KpiCard label="Avg MTTR" value={avgMTTR} unit="h" accent={kpiAccent(parseFloat(avgMTTR), 4, false)} target="≤4h" icon={Activity} trend={parseFloat(avgMTTR) <= 4 ? 'down' : 'up'} />
          <KpiCard label="PM Compliance" value={`${pmCompliance}%`} accent={kpiAccent(pmCompliance, 90)} target="90%" icon={ClipboardList} trend={pmCompliance >= 90 ? 'up' : pmCompliance >= 80 ? 'flat' : 'down'} />
          <KpiCard label="Open Work Orders" value={openJCs} accent={openJCs < 20 ? 'emerald' : openJCs < 30 ? 'amber' : 'blue'} icon={Wrench} trend={openJCs < 20 ? 'down' : 'flat'} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <KpiCard label="Total Downtime" value={totalDowntime.toFixed(0)} unit="h" icon={Activity} accent="cyan" />
          <KpiCard label="Completed WOs" value={completedJCs} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="Compliance Overdue" value={overdueComp.length} accent={overdueComp.length === 0 ? 'emerald' : 'blue'} icon={Shield} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h3 className={`text-sm font-semibold mb-4 ${t.textPrimary}`}>Breakdown Trend — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bdTrend} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Breakdowns" fill="#f87171" fillOpacity={0.8} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${t.textPrimary}`}>Work Order Status Distribution</h3>
          {jcDist.length === 0 ? (
            <div className={`flex items-center justify-center h-40 ${t.textFaint} text-sm`}>No job card data</div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {jcDist.map(({ status, count }) => {
                const max = Math.max(...jcDist.map(s => s.count), 1);
                const color = status === 'completed' ? '#34d399' : status === 'open' ? '#fbbf24' : status === 'in progress' ? '#86BBD8' : '#94a3b8';
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`capitalize ${t.textMuted}`}>{status}</span>
                      <span className={`font-semibold ${t.textPrimary}`}>{count}</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden`}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <SectionHeader title="Production Performance" icon={Gauge} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Tonnes Milled" value={totalTonnes.toLocaleString()} unit="t" accent={kpiAccent(totalTonnes, 1900 * (periodProd.length || 1))} icon={Gauge} />
          <KpiCard label="Avg Recovery" value={`${avgRecovery}%`} accent={kpiAccent(parseFloat(avgRecovery), 92)} target="92%" icon={TrendingUp} trend={parseFloat(avgRecovery) >= 92 ? 'up' : 'down'} />
          <KpiCard label="Gold Produced" value={totalGold} unit="oz" accent="amber" icon={Activity} />
          <KpiCard label="Shift Records" value={periodProd.length} icon={ClipboardList} accent="cyan" />
        </div>
      </div>

      {prodTrend.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h3 className={`text-sm font-semibold mb-4 ${t.textPrimary}`}>Daily Tonnes Milled vs Target</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={prodTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" tick={{ ...tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="target" name="Target" stroke="rgba(134,187,216,0.35)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="tonnes" name="Actual Tonnes" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {topFails.length > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <SectionHeader title="Top Repeat Failure Equipment (MTD)" icon={AlertTriangle} />
          <div className="space-y-2">
            {topFails.map(({ equipment, count }, i) => (
              <div key={equipment} className="flex items-center gap-3">
                <span className={`text-xs w-4 shrink-0 ${t.textFaint}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${t.textPrimary}`}>{equipment}</p>
                  <div className={`h-1.5 mt-1 rounded-full ${t.chipBg} overflow-hidden`}>
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${(count / topFails[0].count) * 100}%` }} />
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${t.textPrimary}`}>{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <SectionHeader title="Statutory Compliance Status" icon={Shield} />
          <div className="space-y-2">
            {[
              { label: 'Compliant', count: compliance.filter((c: any) => c.status === 'current').length, color: '#34d399' },
              { label: 'Due Soon', count: dueSoonComp.length, color: '#f59e0b' },
              { label: 'Overdue', count: overdueComp.length, color: '#f43f5e' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`text-xs w-20 shrink-0 ${t.textFaint}`}>{label}</span>
                <div className={`flex-1 h-2 rounded-full ${t.chipBg} overflow-hidden`}>
                  <div className="h-full rounded-full" style={{ width: `${compliance.length > 0 ? (count / compliance.length) * 100 : 0}%`, background: color }} />
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color }}>{count}</span>
              </div>
            ))}
            {compliance.length === 0 && <p className={`${t.textFaint} text-xs text-center py-4`}>No compliance data — run SQL migration</p>}
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <SectionHeader title="Lubrication Status" icon={Package} />
          <div className="space-y-2">
            {[
              { label: 'Current', count: lube.filter((l: any) => l.status === 'current').length, color: '#34d399' },
              { label: 'Due Soon', count: lube.filter((l: any) => l.status === 'due_soon').length, color: '#f59e0b' },
              { label: 'Overdue', count: overdueLube.length, color: '#f43f5e' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`text-xs w-20 shrink-0 ${t.textFaint}`}>{label}</span>
                <div className={`flex-1 h-2 rounded-full ${t.chipBg} overflow-hidden`}>
                  <div className="h-full rounded-full" style={{ width: `${lube.length > 0 ? (count / lube.length) * 100 : 0}%`, background: color }} />
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color }}>{count}</span>
              </div>
            ))}
            {lube.length === 0 && <p className={`${t.textFaint} text-xs text-center py-4`}>No lube data — run SQL migration</p>}
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <SectionHeader title="Report Summary" icon={FileBarChart} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${t.textFaint}`}>Maintenance</p>
            <ul className={`space-y-1.5 text-xs ${t.textMuted}`}>
              <li className="flex justify-between"><span>Total breakdowns</span><span className={`font-semibold ${t.textPrimary}`}>{totalBDs}</span></li>
              <li className="flex justify-between"><span>Total downtime</span><span className={`font-semibold ${t.textPrimary}`}>{totalDowntime.toFixed(1)}h</span></li>
              <li className="flex justify-between"><span>Average MTTR</span><span className={`font-semibold ${t.textPrimary}`}>{avgMTTR}h</span></li>
              <li className="flex justify-between"><span>Work orders closed</span><span className={`font-semibold ${t.textPrimary}`}>{completedJCs}</span></li>
              <li className="flex justify-between"><span>Work orders open</span><span className={`font-semibold ${t.textPrimary}`}>{openJCs}</span></li>
            </ul>
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${t.textFaint}`}>Production</p>
            <ul className={`space-y-1.5 text-xs ${t.textMuted}`}>
              <li className="flex justify-between"><span>Tonnes milled</span><span className={`font-semibold ${t.textPrimary}`}>{totalTonnes.toLocaleString()}t</span></li>
              <li className="flex justify-between"><span>Recovery rate</span><span className={`font-semibold ${t.textPrimary}`}>{avgRecovery}%</span></li>
              <li className="flex justify-between"><span>Gold produced</span><span className="font-semibold text-amber-500">{totalGold}oz</span></li>
              <li className="flex justify-between"><span>Shift records</span><span className={`font-semibold ${t.textPrimary}`}>{periodProd.length}</span></li>
            </ul>
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${t.textFaint}`}>Compliance &amp; Safety</p>
            <ul className={`space-y-1.5 text-xs ${t.textMuted}`}>
              <li className="flex justify-between"><span>Compliance overdue</span><span className={`font-semibold ${overdueComp.length ? 'text-rose-500' : 'text-emerald-500'}`}>{overdueComp.length}</span></li>
              <li className="flex justify-between"><span>Due soon</span><span className="font-semibold text-amber-500">{dueSoonComp.length}</span></li>
              <li className="flex justify-between"><span>Lube overdue</span><span className={`font-semibold ${overdueLube.length ? 'text-rose-500' : 'text-emerald-500'}`}>{overdueLube.length}</span></li>
              <li className="flex justify-between"><span>PM compliance</span><span className={`font-semibold ${pmCompliance >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{pmCompliance}%</span></li>
            </ul>
          </div>
        </div>
      </div>

      <p className={`text-center text-[11px] pb-2 ${t.textFaint}`}>
        Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Ozech MyOffice Engineering
      </p>
    </main>
  );
}

export default function EngineeringReportPage() {
  return <AppShell><EngineeringReportContent /></AppShell>;
}
