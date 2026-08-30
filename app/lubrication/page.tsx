// FILE: app/lubrication/page.tsx
'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Droplets, ChevronDown, ChevronUp, FlaskConical, RefreshCw } from '@/components/shared/theme';
import { useModuleData } from '@/lib/useModuleData';
import { useTheme, PageHero, StatTile, StatusBadge, TYPE_WEIGHT } from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { LubeStatus, SampleResult, LubeSchedule, OilSample } from './types';

const OIL_SAMPLES: OilSample[] = [
  { id: 1, equipment: 'Ball Mill 1', component: 'Gearbox', sampleDate: '2026-05-28', viscosity: 318, particleCount: 4200, waterPct: 0.03, result: 'normal', notes: 'All parameters within acceptable range.' },
  { id: 2, equipment: 'SAG Mill', component: 'Pinion Bearings', sampleDate: '2026-05-25', viscosity: 104, particleCount: 8900, waterPct: 0.12, result: 'caution', notes: 'Elevated Fe and Cr wear particles. Monitor closely, resample in 2 weeks.' },
  { id: 3, equipment: 'Air Compressor #1', component: 'Air End', sampleDate: '2026-05-20', viscosity: 45, particleCount: 2100, waterPct: 0.01, result: 'normal', notes: 'Oil condition excellent.' },
  { id: 4, equipment: 'Jaw Crusher', component: 'Eccentric Shaft', sampleDate: '2026-05-18', viscosity: 228, particleCount: 18500, waterPct: 0.41, result: 'critical', notes: 'High water ingress detected. Si contamination high — possible seal failure. Change oil immediately.' },
  { id: 5, equipment: 'Thickener', component: 'Rake Drive', sampleDate: '2026-05-15', viscosity: 682, particleCount: 5600, waterPct: 0.08, result: 'caution', notes: 'Viscosity slightly degraded. Schedule oil change at next planned shutdown.' },
];

const STATUS_HEX: Record<LubeStatus, string> = { current: '#34d399', due_soon: '#f59e0b', overdue: '#f43f5e' };
const RESULT_HEX: Record<SampleResult, string> = { normal: '#34d399', caution: '#f59e0b', critical: '#f43f5e' };

function LubricationContent() {
  const t = useTheme();
  const { data: records, loading, error } = useModuleData<LubeSchedule>('lubrication');
  const [activeTab, setActiveTab] = useState<'schedules' | 'samples'>('schedules');
  const [filter, setFilter] = useState<LubeStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const compliance = records.length ? Math.round(records.filter(l => l.status === 'current').length / records.length * 100) : 0;
  const displayed = filter === 'all' ? records : records.filter(l => l.status === filter);

  const scheduleColumns: DLColumn[] = [
    { key: 'equipment_name', label: 'Equipment', width: 22 },
    { key: 'lube_point', label: 'Lube Point', width: 20 },
    { key: 'lubricant_type', label: 'Lubricant Type', width: 18 },
    { key: 'lubricant_grade', label: 'Grade', width: 14 },
    { key: 'interval_days', label: 'Interval', width: 12, format: v => v ? `Every ${v}d` : '' },
    { key: 'last_done_date', label: 'Last Done', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'next_due_date', label: 'Next Due', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'status', label: 'Status', width: 12, format: v => v === 'due_soon' ? 'Due Soon' : (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
    { key: 'section', label: 'Section', width: 16 },
  ];
  const sampleColumns: DLColumn[] = [
    { key: 'equipment', label: 'Equipment', width: 22 },
    { key: 'component', label: 'Component', width: 20 },
    { key: 'sampleDate', label: 'Sample Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'viscosity', label: 'Viscosity (cSt)', width: 14 },
    { key: 'particleCount', label: 'Particle Count (/mL)', width: 18 },
    { key: 'waterPct', label: 'Water %', width: 10 },
    { key: 'result', label: 'Result', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
    { key: 'notes', label: 'Notes', width: 34 },
  ];

  if (loading) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className={`flex flex-col items-center justify-center py-32 gap-3 ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span></div>
    </main>
  );

  if (error) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 px-5 py-4 text-sm">{error}</div>
    </main>
  );

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Droplets}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Lubrication']}
        title="Lubrication Management"
        description="Scheduled lubrication and oil analysis tracking"
        statsOpen
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Droplets} color="#86BBD8" label="Total Points" value={records.length} />
          <StatTile icon={Droplets} color="#34d399" label="Current" value={records.filter(l => l.status === 'current').length} />
          <StatTile icon={Droplets} color="#f59e0b" label="Due Soon" value={records.filter(l => l.status === 'due_soon').length} />
          <StatTile icon={Droplets} color={compliance >= 80 ? '#34d399' : '#f59e0b'} label={`Compliance ${compliance}%`} value={compliance >= 80 ? '✓' : '!'} />
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <div className="flex gap-1">
            {(['schedules', 'samples'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm ${TYPE_WEIGHT.medium} transition-colors ${activeTab === tab ? 'bg-brand-500/15 text-brand-500' : `${t.textFaint} ${t.hoverText}`}`}>
                {tab === 'schedules' ? 'Lube Schedules' : <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Oil Samples</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'schedules' && (
              <div className="flex gap-2">
                {(['all', 'current', 'due_soon', 'overdue'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs ${TYPE_WEIGHT.semibold} transition-colors ${filter === s ? 'bg-brand-500/20 text-brand-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                    {s === 'all' ? 'All' : s === 'due_soon' ? 'Due Soon' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {activeTab === 'schedules' && displayed.length > 0 && (
              <DownloadButton
                data={displayed as unknown as Record<string, unknown>[]}
                columns={scheduleColumns}
                filename={exportFilename('Lube_Schedules')}
                title="Lube Schedules"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_HEX[row.status as LubeStatus]?.replace('#', '')}
              />
            )}
            {activeTab === 'samples' && OIL_SAMPLES.length > 0 && (
              <DownloadButton
                data={OIL_SAMPLES as unknown as Record<string, unknown>[]}
                columns={sampleColumns}
                filename={exportFilename('Oil_Samples')}
                title="Oil Samples"
                statusColumn="result"
                statusColor={(_v, row) => RESULT_HEX[row.result as SampleResult]?.replace('#', '')}
              />
            )}
          </div>
        </div>

        {activeTab === 'schedules' && (
          <div className={`divide-y ${t.divide}`}>
            {displayed.map(s => (
              <div key={s.id}>
                <button type="button" onClick={() => setExpanded(prev => prev === s.id ? null : s.id)} className={`w-full flex items-center px-5 py-3 ${t.hoverBg} transition-colors text-left gap-4`}>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-x-4 items-center text-sm">
                    <span className={`${TYPE_WEIGHT.medium} col-span-2 md:col-span-1 ${t.textPrimary}`}>{s.equipment_name}</span>
                    <span className={t.textMuted}>{s.lube_point}</span>
                    <span className={t.textFaint}>{s.lubricant_type} {s.lubricant_grade}</span>
                    <span className={`hidden md:block ${t.textFaint}`}>Every {s.interval_days}d</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${t.textFaint}`}>Next: {s.next_due_date}</span>
                      <StatusBadge color={STATUS_HEX[s.status]} label={s.status === 'due_soon' ? 'Due Soon' : s.status.charAt(0).toUpperCase() + s.status.slice(1)} />
                    </div>
                  </div>
                  {expanded === s.id ? <ChevronUp className={`w-4 h-4 flex-shrink-0 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 flex-shrink-0 ${t.textFaint}`} />}
                </button>
                {expanded === s.id && (
                  <div className={`px-5 pb-4 ${t.chipBg}`}>
                    <div className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider mb-2 ${t.textFaint}`}>Schedule Details</div>
                    <div className={`space-y-1 text-xs ${t.textMuted}`}>
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
              <thead><tr className={`border-b ${t.border}`}>
                {['Equipment', 'Component', 'Sample Date', 'Viscosity cSt', 'Particles /mL', 'Water %', 'Result', 'Notes'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs ${TYPE_WEIGHT.medium} ${t.textFaint}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className={`divide-y ${t.divide}`}>
                {OIL_SAMPLES.map(s => (
                  <tr key={s.id} className={`${t.hoverBg} transition-colors`}>
                    <td className={`px-4 py-3 ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{s.equipment}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{s.component}</td>
                    <td className={`px-4 py-3 ${t.textFaint}`}>{s.sampleDate}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{s.viscosity}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{s.particleCount.toLocaleString()}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{s.waterPct}%</td>
                    <td className="px-4 py-3"><StatusBadge color={RESULT_HEX[s.result]} label={s.result.charAt(0).toUpperCase() + s.result.slice(1)} /></td>
                    <td className={`px-4 py-3 text-xs max-w-xs ${t.textFaint}`}>{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LubricationPage() {
  return <AppShell><LubricationContent /></AppShell>;
}
