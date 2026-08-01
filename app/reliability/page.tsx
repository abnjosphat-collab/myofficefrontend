// FILE: app/reliability/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import { Activity, RefreshCw } from '@/components/shared/theme';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme, accentText, PageHero, StatTile, ACCENT_HEX } from '@/components/shared/theme';
import { useReliabilityData, MTBF_TREND } from './useReliabilityData';

const rpnColor = (n: number, light: boolean) => n > 100 ? accentText('rose', light) : n >= 50 ? accentText('amber', light) : accentText('emerald', light);
const availColor = (n: number, light: boolean) => n >= 95 ? accentText('emerald', light) : n >= 90 ? accentText('amber', light) : accentText('rose', light);

function ReliabilityContent() {
  const t = useTheme();
  const { table, mttrSect, loading, refresh } = useReliabilityData();

  const tooltipStyle = { backgroundColor: t.light ? '#fff' : '#0f1e2e', border: `1px solid ${t.light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`, borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 };
  const axisColor = t.light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

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
                  <td className="px-4 py-3 text-brand-400 font-semibold">{eq.mtbf}</td>
                  <td className={`px-4 py-3 ${accentText('amber', t.light)} font-semibold`}>{eq.mttr}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{eq.failures}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${availColor(eq.availability, t.light)}`}>{eq.availability}%</span></td>
                  <td className="px-4 py-3"><span className={`font-bold text-base ${rpnColor(eq.rpn, t.light)}`}>{eq.rpn}</span></td>
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
