// FILE: app/engineering_report/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import {
  FileBarChart, RefreshCw, Download, Calendar, Wrench, Activity,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus,
  Gauge, Shield, Users, Package, ClipboardList, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const TOOLTIP_STYLE = { backgroundColor: '#0f1e2e', border: '1px solid rgba(134,187,216,0.2)', borderRadius: 12, color: '#fff', fontSize: 12 };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

function currentMonthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function kpiColor(val: number, target: number, goodHigh = true) {
  const ok = goodHigh ? val >= target : val <= target;
  const warn = goodHigh ? val >= target * 0.9 : val <= target * 1.1;
  return ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-rose-400';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  return trend === 'up'
    ? <TrendingUp className="h-3.5 w-3.5" />
    : trend === 'down'
    ? <TrendingDown className="h-3.5 w-3.5" />
    : <Minus className="h-3.5 w-3.5" />;
}

interface KpiCardProps {
  label: string; value: string | number; unit?: string;
  target?: string; color?: string; trend?: 'up' | 'down' | 'flat';
  icon?: React.ElementType;
}
function KpiCard({ label, value, unit, target, color = 'text-[#86BBD8]', trend, icon: Icon }: KpiCardProps) {
  return (
    <div className="bg-white/[0.05] rounded-xl p-4 border border-white/10 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-white/45 font-semibold uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 text-white/25" />}
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold font-heading ${color}`}>{value}</span>
        {unit && <span className="text-xs text-white/40 mb-0.5">{unit}</span>}
      </div>
      <div className="flex items-center justify-between text-xs mt-0.5">
        {target && <span className="text-white/35">Target: {target}</span>}
        {trend && (
          <span className={`flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white/35'}`}>
            <TrendIcon trend={trend} />
          </span>
        )}
      </div>
    </div>
  );
}

interface SectionHeaderProps { title: string; icon: React.ElementType; }
function SectionHeader({ title, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-[#86BBD8]/15 border border-[#86BBD8]/20">
        <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
      </div>
      <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-white/[0.07]" />
    </div>
  );
}

export default function EngineeringReportPage() {
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [loading, setLoading]   = useState(true);

  // Raw data
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [jobCards,   setJobCards]   = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [lube,       setLube]       = useState<any[]>([]);
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

  // ── Period filtering ─────────────────────────────────────────────────────────
  const inPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    return dateStr.startsWith(period);
  };

  const periodBDs    = breakdowns.filter(b => inPeriod(b.breakdown_date || b.date || b.created_at));
  const periodJCs    = jobCards.filter(j => inPeriod(j.created_at || j.scheduled_date));
  const periodProd   = production.filter(p => inPeriod(p.prod_date));
  const overdueComp  = compliance.filter((c: any) => c.status === 'overdue');
  const dueSoonComp  = compliance.filter((c: any) => c.status === 'due_soon');
  const overdueLube  = lube.filter((l: any) => l.status === 'overdue');

  // Maintenance KPIs
  const totalBDs       = periodBDs.length;
  const totalDowntime  = periodBDs.reduce((s: number, b: any) => s + Number(b.downtime_hours || b.duration_hours || 0), 0);
  const avgMTTR        = totalBDs > 0 ? (totalDowntime / totalBDs).toFixed(1) : '0';
  const completedJCs   = periodJCs.filter((j: any) => j.status === 'completed').length;
  const openJCs        = jobCards.filter((j: any) => j.status === 'open' || j.status === 'in_progress').length;
  const pmCompliance   = periodJCs.length > 0
    ? Math.round((completedJCs / periodJCs.length) * 100) : 0;

  // Production KPIs
  const totalTonnes = periodProd.reduce((s: number, r: any) => s + Number(r.tonnes_milled || 0), 0);
  const avgRecovery = periodProd.length > 0
    ? (periodProd.reduce((s: number, r: any) => s + Number(r.recovery_pct || 0), 0) / periodProd.length).toFixed(1)
    : '0';
  const totalGold   = periodProd.reduce((s: number, r: any) => s + Number(r.gold_produced_oz || 0), 0).toFixed(1);

  // Breakdown trend (last 6 months)
  const now = new Date();
  const bdTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = MONTHS[d.getMonth()];
    const pfx = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const count = breakdowns.filter(b => (b.breakdown_date || b.date || b.created_at || '').startsWith(pfx)).length;
    return { month: label, count };
  });

  // Top failure equipment
  const equipCount: Record<string, number> = {};
  periodBDs.forEach((b: any) => {
    const eq = b.equipment_name || 'Unknown';
    equipCount[eq] = (equipCount[eq] || 0) + 1;
  });
  const topFails = Object.entries(equipCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([equipment, count]) => ({ equipment, count }));

  // Production trend
  const prodTrend = [...periodProd].reverse().slice(-10).map((r: any) => ({
    date: (r.prod_date || '').slice(5),
    tonnes: Number(r.tonnes_milled || 0),
    target: 1900,
  }));

  // Job card status distribution
  const jcStatuses = ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'];
  const jcDist = jcStatuses.map(s => ({
    status: s.replace('_', ' '),
    count: jobCards.filter((j: any) => j.status === s).length,
  })).filter(s => s.count > 0);

  const periodLabel = (() => {
    const [y, m] = period.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  })();

  // Period picker — last 12 months
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return { val, label };
  });

  return (
    <PageShell>
      <section className="container mx-auto px-4 pt-6 pb-3">
        <div className="oz-glass-dark rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#86BBD8]/15 border border-[#86BBD8]/25">
                <FileBarChart className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-heading">Engineering Monthly Report</h1>
                <p className="text-xs text-white/50 mt-0.5">{periodLabel} · Gold Mine Operations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Period picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPeriod(v => !v)}
                  className="flex items-center gap-2 h-8 px-3 rounded-xl bg-white/[0.07] border border-white/15 text-xs text-white/80 hover:bg-white/[0.12] transition-all"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#86BBD8]" />
                  {periodLabel}
                  <ChevronDown className="h-3 w-3 text-white/40" />
                </button>
                {openPeriod && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenPeriod(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[160] rounded-xl bg-[rgba(4,12,24,0.97)] border border-white/14 shadow-2xl overflow-hidden w-44">
                      {periodOptions.map(o => (
                        <button key={o.val} type="button"
                          onClick={() => { setPeriod(o.val); setOpenPeriod(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/10 ${period === o.val ? 'text-[#86BBD8] font-semibold' : 'text-white/70'}`}
                        >{o.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button" onClick={load} disabled={loading}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.07] border border-white/15 text-white/60 hover:text-white hover:bg-white/[0.12] transition-all disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#2A4D69]/60 border border-[#86BBD8]/35 text-white text-xs font-semibold hover:bg-[#2A4D69]/80 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Print / Export
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 space-y-5">

        {/* ── MAINTENANCE KPIs ── */}
        <div className="oz-glass-panel rounded-2xl p-5">
          <SectionHeader title="Maintenance Performance" icon={Wrench} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Breakdowns (MTD)" value={totalBDs}
              color={kpiColor(totalBDs, 20, false)} target="≤20" icon={AlertTriangle}
              trend={totalBDs <= 20 ? 'down' : 'up'} />
            <KpiCard label="Avg MTTR" value={avgMTTR} unit="h"
              color={kpiColor(parseFloat(avgMTTR as string), 4, false)} target="≤4h" icon={Activity}
              trend={parseFloat(avgMTTR as string) <= 4 ? 'down' : 'up'} />
            <KpiCard label="PM Compliance" value={`${pmCompliance}%`}
              color={kpiColor(pmCompliance, 90)} target="90%" icon={ClipboardList}
              trend={pmCompliance >= 90 ? 'up' : pmCompliance >= 80 ? 'flat' : 'down'} />
            <KpiCard label="Open Work Orders" value={openJCs}
              color={openJCs < 20 ? 'text-emerald-400' : openJCs < 30 ? 'text-amber-400' : 'text-rose-400'}
              icon={Wrench} trend={openJCs < 20 ? 'down' : 'flat'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <KpiCard label="Total Downtime" value={totalDowntime.toFixed(0)} unit="h" icon={Activity} />
            <KpiCard label="Completed WOs" value={completedJCs} icon={CheckCircle2} color="text-emerald-400" />
            <KpiCard label="Compliance Overdue" value={overdueComp.length}
              color={overdueComp.length === 0 ? 'text-emerald-400' : 'text-rose-400'} icon={Shield} />
          </div>
        </div>

        {/* ── CHARTS ROW 1 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="oz-glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Breakdown Trend — Last 6 Months</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bdTrend} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Breakdowns" fill="#f87171" fillOpacity={0.8} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="oz-glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Work Order Status Distribution</h3>
            {jcDist.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-white/30 text-sm">No job card data</div>
            ) : (
              <div className="space-y-2.5 mt-4">
                {jcDist.map(({ status, count }) => {
                  const max = Math.max(...jcDist.map(s => s.count), 1);
                  const color = status === 'completed' ? '#34d399' : status === 'open' ? '#fbbf24' : status === 'in progress' ? '#86BBD8' : 'rgba(255,255,255,0.2)';
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-white/60">{status}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── PRODUCTION KPIs ── */}
        <div className="oz-glass-panel rounded-2xl p-5">
          <SectionHeader title="Production Performance" icon={Gauge} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Tonnes Milled" value={totalTonnes.toLocaleString()} unit="t"
              color={kpiColor(totalTonnes, 1900 * (periodProd.length || 1))} icon={Gauge} />
            <KpiCard label="Avg Recovery" value={`${avgRecovery}%`}
              color={kpiColor(parseFloat(avgRecovery as string), 92)} target="92%" icon={TrendingUp}
              trend={parseFloat(avgRecovery as string) >= 92 ? 'up' : 'down'} />
            <KpiCard label="Gold Produced" value={totalGold} unit="oz"
              color="text-amber-400" icon={Activity} />
            <KpiCard label="Shift Records" value={periodProd.length} icon={ClipboardList} />
          </div>
        </div>

        {/* ── PRODUCTION TREND CHART ── */}
        {prodTrend.length > 0 && (
          <div className="oz-glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Daily Tonnes Milled vs Target</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={prodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="target" name="Target" stroke="rgba(134,187,216,0.35)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="tonnes" name="Actual Tonnes" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── TOP FAILURE EQUIPMENT ── */}
        {topFails.length > 0 && (
          <div className="oz-glass-panel rounded-2xl p-5">
            <SectionHeader title="Top Repeat Failure Equipment (MTD)" icon={AlertTriangle} />
            <div className="space-y-2">
              {topFails.map(({ equipment, count }, i) => (
                <div key={equipment} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{equipment}</p>
                    <div className="h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${(count / topFails[0].count) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white shrink-0">{count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPLIANCE & LUBRICATION ALERTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="oz-glass-panel rounded-2xl p-5">
            <SectionHeader title="Statutory Compliance Status" icon={Shield} />
            <div className="space-y-2">
              {[
                { label: 'Compliant', count: compliance.filter((c: any) => c.status === 'current').length, color: 'text-emerald-400', bar: 'bg-emerald-500/70' },
                { label: 'Due Soon',  count: dueSoonComp.length, color: 'text-amber-400',  bar: 'bg-amber-500/70' },
                { label: 'Overdue',   count: overdueComp.length, color: 'text-rose-400',   bar: 'bg-rose-500/70' },
              ].map(({ label, count, color, bar }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${compliance.length > 0 ? (count / compliance.length) * 100 : 0}%` }} />
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${color}`}>{count}</span>
                </div>
              ))}
              {compliance.length === 0 && <p className="text-white/30 text-xs text-center py-4">No compliance data — run SQL migration</p>}
            </div>
          </div>

          <div className="oz-glass-panel rounded-2xl p-5">
            <SectionHeader title="Lubrication Status" icon={Package} />
            <div className="space-y-2">
              {[
                { label: 'Current',   count: lube.filter((l: any) => l.status === 'current').length,   color: 'text-emerald-400', bar: 'bg-emerald-500/70' },
                { label: 'Due Soon',  count: lube.filter((l: any) => l.status === 'due_soon').length,  color: 'text-amber-400',   bar: 'bg-amber-500/70' },
                { label: 'Overdue',   count: overdueLube.length,  color: 'text-rose-400',   bar: 'bg-rose-500/70' },
              ].map(({ label, count, color, bar }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${lube.length > 0 ? (count / lube.length) * 100 : 0}%` }} />
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${color}`}>{count}</span>
                </div>
              ))}
              {lube.length === 0 && <p className="text-white/30 text-xs text-center py-4">No lube data — run SQL migration</p>}
            </div>
          </div>
        </div>

        {/* ── REPORT SUMMARY BOX ── */}
        <div className="oz-glass-dark rounded-2xl p-5">
          <SectionHeader title="Report Summary" icon={FileBarChart} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">Maintenance</p>
              <ul className="space-y-1.5 text-white/70 text-xs">
                <li className="flex justify-between"><span>Total breakdowns</span><span className="font-semibold text-white">{totalBDs}</span></li>
                <li className="flex justify-between"><span>Total downtime</span><span className="font-semibold text-white">{totalDowntime.toFixed(1)}h</span></li>
                <li className="flex justify-between"><span>Average MTTR</span><span className="font-semibold text-white">{avgMTTR}h</span></li>
                <li className="flex justify-between"><span>Work orders closed</span><span className="font-semibold text-white">{completedJCs}</span></li>
                <li className="flex justify-between"><span>Work orders open</span><span className="font-semibold text-white">{openJCs}</span></li>
              </ul>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">Production</p>
              <ul className="space-y-1.5 text-white/70 text-xs">
                <li className="flex justify-between"><span>Tonnes milled</span><span className="font-semibold text-white">{totalTonnes.toLocaleString()}t</span></li>
                <li className="flex justify-between"><span>Recovery rate</span><span className="font-semibold text-white">{avgRecovery}%</span></li>
                <li className="flex justify-between"><span>Gold produced</span><span className="font-semibold text-amber-400">{totalGold}oz</span></li>
                <li className="flex justify-between"><span>Shift records</span><span className="font-semibold text-white">{periodProd.length}</span></li>
              </ul>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">Compliance &amp; Safety</p>
              <ul className="space-y-1.5 text-white/70 text-xs">
                <li className="flex justify-between"><span>Compliance overdue</span><span className={`font-semibold ${overdueComp.length ? 'text-rose-400' : 'text-emerald-400'}`}>{overdueComp.length}</span></li>
                <li className="flex justify-between"><span>Due soon</span><span className="font-semibold text-amber-400">{dueSoonComp.length}</span></li>
                <li className="flex justify-between"><span>Lube overdue</span><span className={`font-semibold ${overdueLube.length ? 'text-rose-400' : 'text-emerald-400'}`}>{overdueLube.length}</span></li>
                <li className="flex justify-between"><span>PM compliance</span><span className={`font-semibold ${pmCompliance >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{pmCompliance}%</span></li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/25 pb-2">
          Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Ozech MyOffice Engineering
        </p>
      </section>
    </PageShell>
  );
}
