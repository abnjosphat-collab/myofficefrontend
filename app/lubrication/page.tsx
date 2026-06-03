// FILE: app/lubrication/page.tsx
'use client';

import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Droplets, ChevronDown, ChevronUp, FlaskConical, RefreshCw } from 'lucide-react';
import { useModuleData } from '@/lib/useModuleData';

type LubeStatus = 'current' | 'due_soon' | 'overdue';
type SampleResult = 'normal' | 'caution' | 'critical';

interface LubeSchedule {
  id: number; equipment_name: string; lube_point: string; lubricant_type: string; lubricant_grade: string;
  interval_days: number; last_done_date: string; next_due_date: string; status: LubeStatus; section: string;
}

interface OilSample {
  id: number; equipment: string; component: string; sampleDate: string;
  viscosity: number; particleCount: number; waterPct: number; result: SampleResult; notes: string;
}

const OIL_SAMPLES: OilSample[] = [
  { id: 1, equipment: 'Ball Mill 1', component: 'Gearbox', sampleDate: '2026-05-28', viscosity: 318, particleCount: 4200, waterPct: 0.03, result: 'normal', notes: 'All parameters within acceptable range.' },
  { id: 2, equipment: 'SAG Mill', component: 'Pinion Bearings', sampleDate: '2026-05-25', viscosity: 104, particleCount: 8900, waterPct: 0.12, result: 'caution', notes: 'Elevated Fe and Cr wear particles. Monitor closely, resample in 2 weeks.' },
  { id: 3, equipment: 'Air Compressor #1', component: 'Air End', sampleDate: '2026-05-20', viscosity: 45, particleCount: 2100, waterPct: 0.01, result: 'normal', notes: 'Oil condition excellent.' },
  { id: 4, equipment: 'Jaw Crusher', component: 'Eccentric Shaft', sampleDate: '2026-05-18', viscosity: 228, particleCount: 18500, waterPct: 0.41, result: 'critical', notes: 'High water ingress detected. Si contamination high — possible seal failure. Change oil immediately.' },
  { id: 5, equipment: 'Thickener', component: 'Rake Drive', sampleDate: '2026-05-15', viscosity: 682, particleCount: 5600, waterPct: 0.08, result: 'caution', notes: 'Viscosity slightly degraded. Schedule oil change at next planned shutdown.' },
];

const statusStyle: Record<LubeStatus, string> = {
  current: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  due_soon: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  overdue: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
};
const sampleStyle: Record<SampleResult, string> = {
  normal: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  caution: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  critical: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
};

export default function LubricationPage() {
  const { data: records, loading, error } = useModuleData<LubeSchedule>('lubrication');
  const [activeTab, setActiveTab] = useState<'schedules' | 'samples'>('schedules');
  const [filter, setFilter] = useState<LubeStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const compliance = records.length ? Math.round(records.filter(l => l.status === 'current').length / records.length * 100) : 0;
  const displayed = filter === 'all' ? records : records.filter(l => l.status === filter);

  if (loading) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-white/40" />
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    </PageShell>
  );

  if (error) return (
    <PageShell>
      <div className="container mx-auto px-4 pt-6">
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 px-5 py-4 text-sm">{error}</div>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center gap-3 mb-5">
              <Droplets className="w-7 h-7 text-[#86BBD8]" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Lubrication Management</h1>
                <p className="text-white/50 text-sm mt-0.5">Scheduled lubrication and oil analysis tracking</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total Points', records.length, 'text-white'], ['Current', records.filter(l => l.status === 'current').length, 'text-emerald-300'], ['Due Soon', records.filter(l => l.status === 'due_soon').length, 'text-amber-300'], [`Compliance ${compliance}%`, compliance >= 80 ? '✓' : '!', compliance >= 80 ? 'text-emerald-300' : 'text-amber-300']].map(([l, v, c]) => (
                <div key={String(l)} className="bg-white/[0.06] rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${c}`}>{v}</div>
                  <div className="text-white/50 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1">
              {(['schedules', 'samples'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-[#86BBD8]/20 text-[#86BBD8]' : 'text-white/50 hover:text-white'}`}>
                  {t === 'schedules' ? 'Lube Schedules' : <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Oil Samples</span>}
                </button>
              ))}
            </div>
            {activeTab === 'schedules' && (
              <div className="flex gap-2">
                {(['all', 'current', 'due_soon', 'overdue'] as const).map(s => (
                  <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter === s ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>
                    {s === 'all' ? 'All' : s === 'due_soon' ? 'Due Soon' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'schedules' && (
            <div className="divide-y divide-white/[0.06]">
              {displayed.map(s => (
                <div key={s.id}>
                  <button onClick={() => setExpanded(prev => prev === s.id ? null : s.id)} className="w-full flex items-center px-5 py-3 hover:bg-white/[0.03] transition-colors text-left gap-4">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-x-4 items-center text-sm">
                      <span className="text-white font-medium col-span-2 md:col-span-1">{s.equipment_name}</span>
                      <span className="text-white/60">{s.lube_point}</span>
                      <span className="text-white/50">{s.lubricant_type} {s.lubricant_grade}</span>
                      <span className="text-white/50 hidden md:block">Every {s.interval_days}d</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">Next: {s.next_due_date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle[s.status]}`}>{s.status === 'due_soon' ? 'Due Soon' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                      </div>
                    </div>
                    {expanded === s.id ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
                  </button>
                  {expanded === s.id && (
                    <div className="px-5 pb-4 bg-white/[0.02]">
                      <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Schedule Details</div>
                      <div className="space-y-1 text-xs text-white/60">
                        <div>Last done: {s.last_done_date}</div>
                        <div>Next due: {s.next_due_date}</div>
                        <div>Section: {s.section}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Equipment', 'Component', 'Sample Date', 'Viscosity cSt', 'Particles /mL', 'Water %', 'Result', 'Notes'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {OIL_SAMPLES.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{s.equipment}</td>
                      <td className="px-4 py-3 text-white/70">{s.component}</td>
                      <td className="px-4 py-3 text-white/60">{s.sampleDate}</td>
                      <td className="px-4 py-3 text-white/70">{s.viscosity}</td>
                      <td className="px-4 py-3 text-white/70">{s.particleCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-white/70">{s.waterPct}%</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sampleStyle[s.result]}`}>{s.result.charAt(0).toUpperCase() + s.result.slice(1)}</span></td>
                      <td className="px-4 py-3 text-white/50 text-xs max-w-xs">{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
