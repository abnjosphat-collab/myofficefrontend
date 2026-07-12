// FILE: app/reliability/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { Activity, RefreshCw } from '@/components/shared/theme';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme, PageHero, StatTile, ACCENT_HEX } from '@/components/shared/theme';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');

const MTBF_TREND = [
  { month: 'Jan', SAGMill: 18, BallMill: 24, JawCrusher: 12, Compressor: 45 },
  { month: 'Feb', SAGMill: 22, BallMill: 26, JawCrusher: 15, Compressor: 42 },
  { month: 'Mar', SAGMill: 19, BallMill: 21, JawCrusher: 10, Compressor: 50 },
  { month: 'Apr', SAGMill: 25, BallMill: 28, JawCrusher: 18, Compressor: 55 },
  { month: 'May', SAGMill: 23, BallMill: 30, JawCrusher: 14, Compressor: 48 },
  { month: 'Jun', SAGMill: 27, BallMill: 32, JawCrusher: 20, Compressor: 52 },
];

const MTTR_BY_SECTION = [
  { section: 'Milling', mttr: 4.2 },
  { section: 'Crushing', mttr: 2.8 },
  { section: 'Dewatering', mttr: 1.5 },
  { section: 'Compressors', mttr: 0.8 },
  { section: 'Conveying', mttr: 1.2 },
];

interface EquipReliability {
  equipment: string; section: string; mtbf: number; mttr: number; failures: number; availability: number; rpn: number;
}

const EQUIPMENT_TABLE: EquipReliability[] = [
  { equipment: 'SAG Mill', section: 'Milling', mtbf: 27, mttr: 5.1, failures: 6, availability: 92.3, rpn: 108 },
  { equipment: 'Ball Mill 1', section: 'Milling', mtbf: 32, mttr: 3.8, failures: 4, availability: 94.7, rpn: 72 },
  { equipment: 'Ball Mill 2', section: 'Milling', mtbf: 29, mttr: 4.2, failures: 5, availability: 93.5, rpn: 80 },
  { equipment: 'Jaw Crusher', section: 'Crushing', mtbf: 20, mttr: 2.9, failures: 9, availability: 90.1, rpn: 126 },
  { equipment: 'Secondary Crusher', section: 'Crushing', mtbf: 35, mttr: 2.5, failures: 3, availability: 96.8, rpn: 45 },
  { equipment: 'Air Compressor #1', section: 'Compressors', mtbf: 52, mttr: 0.9, failures: 2, availability: 98.4, rpn: 24 },
  { equipment: 'Air Compressor #2', section: 'Compressors', mtbf: 48, mttr: 0.7, failures: 3, availability: 98.1, rpn: 18 },
  { equipment: 'Dewatering Pump 1', section: 'Dewatering', mtbf: 41, mttr: 1.4, failures: 2, availability: 97.7, rpn: 32 },
  { equipment: 'Dewatering Pump 2', section: 'Dewatering', mtbf: 38, mttr: 1.6, failures: 3, availability: 97.0, rpn: 36 },
  { equipment: 'Conveyor CV01', section: 'Conveying', mtbf: 45, mttr: 1.1, failures: 2, availability: 98.3, rpn: 28 },
];

interface BreakdownRecord {
  equipment_name?: string; section?: string; location?: string;
  downtime_hours?: number; duration_hours?: number;
  breakdown_date?: string; date?: string; created_at?: string;
}

const rpnColor = (n: number) => n > 100 ? 'text-rose-400' : n >= 50 ? 'text-amber-400' : 'text-emerald-400';
const availColor = (n: number) => n >= 95 ? 'text-emerald-400' : n >= 90 ? 'text-amber-400' : 'text-rose-400';

function ReliabilityContent() {
  const t = useTheme();
  const [table, setTable] = useState<EquipReliability[]>(EQUIPMENT_TABLE);
  const [mttrSect, setMttrSect] = useState<typeof MTTR_BY_SECTION>(MTTR_BY_SECTION);
  const [loading, setLoading] = useState(true);

  const tooltipStyle = { backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 };
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${_API}/api/breakdowns`);
      if (!r.ok) return;
      const bds: BreakdownRecord[] = await r.json();
      const equipMap: Record<string, { failures: number; totalDowntime: number; firstDate: Date; lastDate: Date; section: string }> = {};
      const now = new Date();
      for (const bd of bds) {
        const eq = bd.equipment_name || 'Unknown';
        if (!equipMap[eq]) equipMap[eq] = { failures: 0, totalDowntime: 0, firstDate: now, lastDate: new Date(0), section: bd.section || bd.location || '—' };
        equipMap[eq].failures++;
        equipMap[eq].totalDowntime += Number(bd.downtime_hours || bd.duration_hours || 0);
        const d = new Date(bd.breakdown_date || bd.date || bd.created_at || now);
        if (d < equipMap[eq].firstDate) equipMap[eq].firstDate = d;
        if (d > equipMap[eq].lastDate) equipMap[eq].lastDate = d;
      }
      const derived: EquipReliability[] = Object.entries(equipMap).map(([equipment, v]) => {
        const periodDays = Math.max(1, (now.getTime() - v.firstDate.getTime()) / 86400000);
        const mtbf = Math.round(periodDays / Math.max(1, v.failures));
        const mttr = v.failures > 0 ? Math.round((v.totalDowntime / v.failures) * 10) / 10 : 0;
        const availability = Math.round((1 - v.totalDowntime / (periodDays * 24)) * 1000) / 10;
        const rpn = Math.round((5 - Math.min(4, mtbf / 10)) * Math.max(1, mttr) * 3);
        return { equipment, section: v.section, mtbf, mttr, failures: v.failures, availability: Math.max(0, availability), rpn };
      }).sort((a, b) => b.rpn - a.rpn);

      if (derived.length) setTable(derived);

      const sectionMttr: Record<string, number[]> = {};
      for (const bd of bds) {
        const sec = bd.section || bd.location || 'Other';
        if (!sectionMttr[sec]) sectionMttr[sec] = [];
        sectionMttr[sec].push(Number(bd.downtime_hours || 0));
      }
      const secDerived = Object.entries(sectionMttr).map(([section, hrs]) => ({ section, mttr: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length * 10) / 10 }));
      if (secDerived.length) setMttrSect(secDerived);
    } catch { /* keep static fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fleetMTBF = Math.round(table.reduce((s, e) => s + e.mtbf, 0) / Math.max(1, table.length));
  const fleetMTTR = (table.reduce((s, e) => s + e.mttr, 0) / Math.max(1, table.length)).toFixed(1);
  const fleetAvail = (table.reduce((s, e) => s + e.availability, 0) / Math.max(1, table.length)).toFixed(1);
  const highRPN = table.filter(e => e.rpn > 100).length;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Activity}
        accent="violet"
        crumbs={['Safety & Compliance', 'Reliability']}
        title="MTBF / MTTR Analytics"
        description="Fleet reliability and availability performance"
        statsOpen
        actions={
          <button type="button" onClick={refresh} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Activity} color={ACCENT_HEX.blue} label="Fleet MTBF" value={`${fleetMTBF}d`} />
          <StatTile icon={Activity} color="#fbbf24" label="Fleet MTTR" value={`${fleetMTTR}h`} />
          <StatTile icon={Activity} color="#34d399" label="Availability" value={`${fleetAvail}%`} />
          <StatTile icon={Activity} color="#fb7185" label="High RPN Items" value={highRPN} />
        </div>
      </PageHero>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden p-5`}>
          <h2 className={`font-semibold mb-4 ${t.textPrimary}`}>MTBF Trend (days) — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MTBF_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
              <Line type="monotone" dataKey="SAGMill" name="SAG Mill" stroke="#86BBD8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="BallMill" name="Ball Mill" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="JawCrusher" name="Jaw Crusher" stroke="#fbbf24" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Compressor" name="Compressor" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden p-5`}>
          <h2 className={`font-semibold mb-4 ${t.textPrimary}`}>MTTR by Section (hours)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mttrSect} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="section" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="mttr" name="MTTR (hrs)" fill="#86BBD8" fillOpacity={0.7} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border}`}>
          <h2 className={`font-semibold ${t.textPrimary}`}>Equipment Reliability Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${t.border}`}>
                {['Equipment', 'Section', 'MTBF (days)', 'MTTR (hrs)', 'Failures', 'Availability %', 'RPN Score'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-medium ${t.textFaint}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8"><RefreshCw className={`h-5 w-5 animate-spin mx-auto ${t.textFaint}`} /></td></tr>
              ) : table.sort((a, b) => b.rpn - a.rpn).map(eq => (
                <tr key={eq.equipment} className={`border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                  <td className={`px-4 py-3 font-medium ${t.textPrimary}`}>{eq.equipment}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{eq.section}</td>
                  <td className="px-4 py-3 text-blue-400 font-semibold">{eq.mtbf}</td>
                  <td className="px-4 py-3 text-amber-400 font-semibold">{eq.mttr}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{eq.failures}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${availColor(eq.availability)}`}>{eq.availability}%</span></td>
                  <td className="px-4 py-3"><span className={`font-bold text-base ${rpnColor(eq.rpn)}`}>{eq.rpn}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function ReliabilityPage() {
  return (
    <AppShell>
      <ReliabilityContent />
    </AppShell>
  );
}
