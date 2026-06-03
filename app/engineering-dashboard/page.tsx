'use client';
import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock, Wrench, Activity, Zap, BarChart3, Target, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');

const availabilityTrend = [
  { month: 'Jan', target: 85, actual: 82 }, { month: 'Feb', target: 85, actual: 84 },
  { month: 'Mar', target: 85, actual: 79 }, { month: 'Apr', target: 85, actual: 88 },
  { month: 'May', target: 85, actual: 86 }, { month: 'Jun', target: 85, actual: 83 },
];

const breakdownTrend = [
  { month: 'Jan', count: 24 }, { month: 'Feb', count: 18 }, { month: 'Mar', count: 31 },
  { month: 'Apr', count: 15 }, { month: 'May', count: 19 }, { month: 'Jun', count: 22 },
];

const statusDist = [
  { name: 'Running',  value: 14, color: '#34d399' },
  { name: 'Degraded', value: 3,  color: '#fbbf24' },
  { name: 'Down',     value: 2,  color: '#f87171' },
  { name: 'Planned',  value: 1,  color: '#86BBD8' },
];

const topBreakdowns = [
  { equipment: 'Secondary Crusher', count: 8, hours: 24.5 },
  { equipment: 'Ball Mill 2',       count: 6, hours: 18.2 },
  { equipment: 'Conveyor CV3',      count: 5, hours: 12.0 },
  { equipment: 'Tailings Pump TP1', count: 4, hours: 9.5  },
  { equipment: 'Compressor C2',     count: 3, hours: 7.0  },
];

const openWorkOrders = [
  { id: 'JC-2024-0843', title: 'Belt splice failure – CV3',        priority: 'critical', age: 1,  assigned: 'T. Moyo' },
  { id: 'JC-2024-0842', title: 'Toggle plate replacement – Sec. Crusher', priority: 'high', age: 1, assigned: 'F. Ncube' },
  { id: 'JC-2024-0841', title: 'Bearing replacement – Ball Mill 2', priority: 'high',    age: 2,  assigned: 'P. Dube' },
  { id: 'JC-2024-0838', title: 'Impeller replacement – TP1',       priority: 'medium',  age: 3,  assigned: 'S. Mutasa' },
  { id: 'JC-2024-0835', title: '500hr service – Compressor C2',    priority: 'medium',  age: 5,  assigned: 'J. Nyoni' },
];

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border border-rose-500/35',
  high:     'bg-amber-500/20 text-amber-300 border border-amber-500/35',
  medium:   'bg-[#86BBD8]/20 text-[#86BBD8] border border-[#86BBD8]/35',
  low:      'bg-white/10 text-white/50 border border-white/20',
};

interface KpiCardProps {
  label: string; value: string | number; unit?: string;
  target?: number; actual?: number; trend?: 'up' | 'down' | 'flat';
  good?: 'high' | 'low'; color?: string;
}
function KpiCard({ label, value, unit, target, actual, trend, good = 'high', color = 'text-white' }: KpiCardProps) {
  const onTarget = actual !== undefined && target !== undefined
    ? (good === 'high' ? actual >= target : actual <= target) : null;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? (good === 'high' ? 'text-emerald-400' : 'text-rose-400')
    : trend === 'down' ? (good === 'high' ? 'text-rose-400' : 'text-emerald-400') : 'text-white/40';

  return (
    <div className="oz-glass-dark rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-[11px] text-white/45 uppercase tracking-wider font-semibold">{label}</p>
      <div className="flex items-end gap-1.5 mt-1">
        <span className={`text-3xl font-bold font-heading ${color}`}>{value}</span>
        {unit && <span className="text-sm text-white/40 mb-1">{unit}</span>}
      </div>
      <div className="flex items-center justify-between mt-1">
        {target !== undefined && <p className="text-xs text-white/30">Target: {target}{unit}</p>}
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {onTarget !== null && (
            <span className={onTarget ? 'text-emerald-400' : 'text-rose-400'}>
              {onTarget ? 'On target' : 'Below target'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="oz-glass-dark rounded-xl px-3 py-2 text-xs shadow-xl border border-white/10">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}{p.name === 'target' || p.name === 'actual' ? '%' : ''}</p>
      ))}
    </div>
  );
};

export default function EngineeringDashboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Live data from API
  const [openWOs, setOpenWOs]       = useState<typeof openWorkOrders>([]);
  const [bdTrend, setBdTrend]        = useState<typeof breakdownTrend>(breakdownTrend);
  const [topFails, setTopFails]      = useState<typeof topBreakdowns>(topBreakdowns);
  const [avTrend,  setAvTrend]       = useState<typeof availabilityTrend>(availabilityTrend);
  const [loading,  setLoading]       = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [jcRes, bdRes] = await Promise.all([
        fetch(`${_API}/api/job-cards?status=open`),
        fetch(`${_API}/api/breakdowns`),
      ]);

      // Open job cards → work order list
      if (jcRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jcs: any[] = await jcRes.json();
        setOpenWOs(jcs.slice(0, 10).map(j => ({
          id: j.job_no || `JC-${j.id}`,
          title: j.title,
          priority: j.priority || 'medium',
          age: j.scheduled_date ? Math.max(0, Math.round((Date.now() - new Date(j.scheduled_date).getTime()) / 86400000)) : 0,
          assigned: j.assigned_to || '—',
        })));
      }

      // Breakdowns → trend + top failures
      if (bdRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bds: any[] = await bdRes.json();
        // Monthly counts last 6 months
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const monthlyCounts: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthlyCounts[months[d.getMonth()]] = 0;
        }
        for (const bd of bds) {
          const m = months[new Date(bd.breakdown_date || bd.date || bd.created_at).getMonth()];
          if (m in monthlyCounts) monthlyCounts[m]++;
        }
        setBdTrend(Object.entries(monthlyCounts).map(([month, count]) => ({ month, count })));

        // Top failures by equipment
        const equipCount: Record<string, { equipment: string; count: number; hours: number }> = {};
        for (const bd of bds) {
          const eq = bd.equipment_name || bd.equipment || 'Unknown';
          if (!equipCount[eq]) equipCount[eq] = { equipment: eq, count: 0, hours: 0 };
          equipCount[eq].count++;
          equipCount[eq].hours += Number(bd.downtime_hours || bd.duration_hours || 0);
        }
        setTopFails(Object.values(equipCount).sort((a, b) => b.count - a.count).slice(0, 5).map(e => ({ ...e, hours: Math.round(e.hours * 10) / 10 })));
      }
    } catch { /* keep static fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#86BBD8]/15 border border-[#86BBD8]/25">
                <LayoutDashboard className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-heading">Engineering Dashboard</h1>
                <p className="text-xs text-white/50">Gold Mine Operations · June 2024</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(['week','month','quarter'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-[#86BBD8]/30 border border-[#86BBD8]/45 text-white' : 'bg-white/[0.05] border border-white/10 text-white/50 hover:bg-white/10'}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Fleet Availability" value={83} unit="%" target={85} actual={83} trend="up"   color="text-emerald-400" />
          <KpiCard label="PM Compliance"      value={87} unit="%" target={90} actual={87} trend="down" color="text-amber-400" />
          <KpiCard label="Avg MTTR"           value={4.2} unit="h" target={4}  actual={4.2} trend="down" good="low" color="text-[#86BBD8]" />
          <KpiCard label="Breakdowns (MTD)"   value={22} target={20} actual={22} trend="up" good="low" color="text-rose-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Open Work Orders" value={18} trend="flat" color="text-amber-300" />
          <KpiCard label="Overdue PMs"       value={3}  trend="down" good="low" color="text-rose-300" />
          <KpiCard label="Lube Compliance"   value={94} unit="%" target={95} actual={94} trend="up" color="text-emerald-300" />
          <KpiCard label="Contractor Jobs"   value={5}  trend="flat" color="text-[#86BBD8]" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Availability trend */}
          <div className="lg:col-span-2 oz-glass-panel rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Fleet Availability vs Target (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={avTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 95]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="target" stroke="rgba(134,187,216,0.4)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="target" />
                <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="oz-glass-panel rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-2">Fleet Status Now</p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} units`, n]} contentStyle={{ background: 'rgba(5,15,28,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {statusDist.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-white/60">{d.name}</span>
                  </div>
                  <span className="font-semibold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown trend + top failures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="oz-glass-panel rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Monthly Breakdown Count</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bdTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(5,15,28,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 11 }} />
                <Bar dataKey="count" fill="#f87171" radius={[6,6,0,0]} name="Breakdowns" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="oz-glass-panel rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-3">Top 5 Repeat Failures (MTD)</p>
            <div className="space-y-2">
              {topFails.map((b, i) => (
                <div key={b.equipment} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{b.equipment}</p>
                    <div className="h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${(b.count / 10) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">{b.count}×</p>
                    <p className="text-[10px] text-white/35">{b.hours}h</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Open work orders */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#86BBD8]" />
              <span className="text-sm font-semibold text-white">Open Work Orders ({openWOs.length})</span>
            </div>
            <a href="/job-cards" className="text-xs text-[#86BBD8] hover:text-[#86BBD8]/70 transition-colors">View all →</a>
          </div>
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-white/30 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : openWOs.map(wo => (
              <div key={wo.id} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-white/30 font-mono w-28 shrink-0">{wo.id}</span>
                <p className="text-sm text-white flex-1 truncate">{wo.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_STYLE[wo.priority]}`}>{wo.priority}</span>
                <span className="text-xs text-white/35 shrink-0">{wo.assigned}</span>
                <span className={`text-xs font-semibold shrink-0 ${wo.age <= 1 ? 'text-white/40' : wo.age <= 3 ? 'text-amber-400' : 'text-rose-400'}`}>{wo.age}d</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
