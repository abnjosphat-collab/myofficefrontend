// FILE: app/production/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { BarChart2, Plus, X } from '@/components/shared/theme';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme, PageHero, StatCard, FormField, PrimaryButton, SelectField, type Accent } from '@/components/shared/theme';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const PROD_URL = `${_API}/api/production`;

const fromProdAPI = (d: any): ProductionRecord => ({
  id: d.id, date: d.prod_date || '', shift: d.shift || '',
  tonnesMilled: d.tonnes_milled || 0, feedRate: d.feed_rate_tph || 0, grade: d.grade_gpt || 0,
  recovery: d.recovery_pct || 0, goldOz: d.gold_produced_oz || 0, millAvail: d.mill_availability || 0,
  powerKwh: d.power_kwh || 0, downtimeHrs: d.downtime_hours || 0,
  downtimeReason: d.downtime_reason || '', comments: d.comments || '',
});

interface ProductionRecord {
  id: number; date: string; shift: string; tonnesMilled: number; feedRate: number; grade: number;
  recovery: number; goldOz: number; millAvail: number; powerKwh: number; downtimeHrs: number;
  downtimeReason: string; comments: string;
}

const TARGETS = { tonnesMilled: 1900, grade: 3.0, recovery: 92.0, goldOz: 165 };

function useChartStyle() {
  const t = useTheme();
  return useMemo(() => ({
    grid: t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
    tick: { fill: t.light ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.4)', fontSize: 10 },
    tooltipStyle: { backgroundColor: t.light ? '#ffffff' : '#0f1e2e', border: t.light ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(134,187,216,0.2)', borderRadius: 12, color: t.light ? '#0f172a' : '#fff', fontSize: 12 },
  }), [t.light]);
}

function ProductionContent() {
  const t = useTheme();
  const { grid, tick, tooltipStyle } = useChartStyle();
  const [records, setRecords] = useState<ProductionRecord[]>([]);

  const fetchRecords = useCallback(async () => {
    try { const r = await fetch(PROD_URL); if (r.ok) setRecords((await r.json()).map(fromProdAPI)); }
    catch { /* network */ }
  }, []);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', shift: 'Day', tonnesMilled: '', feedRate: '', grade: '', recovery: '', goldOz: '', millAvail: '', powerKwh: '', downtimeHrs: '', downtimeReason: '', comments: '' });

  const chartData = [...records].reverse().map(r => ({ date: `${r.date.slice(5)} ${r.shift[0]}`, tonnes: r.tonnesMilled, grade: r.grade }));

  const submit = async () => {
    if (!form.date || !form.tonnesMilled) return;
    try {
      const body = { prod_date: form.date, shift: form.shift, tonnes_milled: +form.tonnesMilled, feed_rate_tph: +form.feedRate, grade_gpt: +form.grade, recovery_pct: +form.recovery, gold_produced_oz: +form.goldOz, mill_availability: +form.millAvail, power_kwh: +form.powerKwh, downtime_hours: +form.downtimeHrs, downtime_reason: form.downtimeReason, comments: form.comments };
      const r = await fetch(PROD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) fetchRecords();
    } catch { /* ignore */ }
    setShowForm(false);
  };

  const today = records[0];
  const kpiCards: { label: string; actual: number; target: number; unit: string }[] = today ? [
    { label: "Today's Tonnes", actual: today.tonnesMilled, target: TARGETS.tonnesMilled, unit: 't' },
    { label: 'Grade', actual: today.grade, target: TARGETS.grade, unit: 'g/t' },
    { label: 'Recovery', actual: today.recovery, target: TARGETS.recovery, unit: '%' },
    { label: 'Gold Produced', actual: today.goldOz, target: TARGETS.goldOz, unit: 'oz' },
  ] : [];

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={BarChart2}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Production']}
        title="Production Interface"
        description="Daily milling and gold production tracking"
        statsOpen
        actions={<PrimaryButton icon={Plus} accent="violet" onClick={() => setShowForm(s => !s)}>Log Production</PrimaryButton>}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(k => {
            const pct = k.actual / k.target * 100;
            const good = pct >= 95;
            const accent: Accent = good ? 'emerald' : 'amber';
            return <StatCard key={k.label} icon={BarChart2} accent={accent} label={k.label} value={`${k.actual}${k.unit}`} trend={{ direction: good ? 'up' : 'down', label: `Target: ${k.target}${k.unit}` }} />;
          })}
        </div>
      </PageHero>

      {showForm && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${t.textPrimary}`}>Log Production Data</h2>
            <button type="button" onClick={() => setShowForm(false)} className={`${t.textFaint} ${t.hoverText}`}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FormField label="Date"><input type="date" title="Date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Shift">
              <SelectField size="form" title="Shift" value={form.shift} onChange={v => setForm(f => ({ ...f, shift: v }))}
                options={['Day', 'Night', 'Afternoon']} />
            </FormField>
            <FormField label="Tonnes Milled"><input placeholder="Tonnes Milled" type="number" value={form.tonnesMilled} onChange={e => setForm(f => ({ ...f, tonnesMilled: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Feed Rate (tph)"><input placeholder="Feed Rate (tph)" type="number" value={form.feedRate} onChange={e => setForm(f => ({ ...f, feedRate: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Grade (g/t)"><input placeholder="Grade (g/t)" type="number" step="0.1" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Recovery %"><input placeholder="Recovery %" type="number" step="0.1" value={form.recovery} onChange={e => setForm(f => ({ ...f, recovery: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Gold Oz"><input placeholder="Gold Oz" type="number" value={form.goldOz} onChange={e => setForm(f => ({ ...f, goldOz: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Mill Avail %"><input placeholder="Mill Avail %" type="number" value={form.millAvail} onChange={e => setForm(f => ({ ...f, millAvail: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Power kWh"><input placeholder="Power kWh" type="number" value={form.powerKwh} onChange={e => setForm(f => ({ ...f, powerKwh: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Downtime Hrs"><input placeholder="Downtime Hrs" type="number" step="0.1" value={form.downtimeHrs} onChange={e => setForm(f => ({ ...f, downtimeHrs: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Downtime Reason"><input placeholder="Downtime Reason" value={form.downtimeReason} onChange={e => setForm(f => ({ ...f, downtimeReason: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Comments"><input placeholder="Comments" value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} className={inputCls} /></FormField>
          </div>
          <PrimaryButton accent="violet" size="md" onClick={submit}>Save Record</PrimaryButton>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h2 className={`font-semibold mb-4 ${t.textPrimary}`}>Tonnes Milled Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} interval={1} />
              <YAxis domain={[1700, 2000]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={TARGETS.tonnesMilled} stroke="rgba(134,187,216,0.4)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'rgba(134,187,216,0.6)', fontSize: 10 }} />
              <Line type="monotone" dataKey="tonnes" name="Tonnes" stroke="#86BBD8" strokeWidth={2} dot={{ r: 2, fill: '#86BBD8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h2 className={`font-semibold mb-4 ${t.textPrimary}`}>Grade Trend (g/t)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} interval={1} />
              <YAxis domain={[2.3, 3.5]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={TARGETS.grade} stroke="rgba(251,191,36,0.4)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'rgba(251,191,36,0.6)', fontSize: 10 }} />
              <Line type="monotone" dataKey="grade" name="Grade g/t" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2, fill: '#fbbf24' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border}`}><h2 className={`font-semibold ${t.textPrimary}`}>Production Records — Last 14 Shifts</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${t.border}`}>
              {['Date', 'Shift', 'Tonnes', 'Grade', 'Recovery', 'Gold Oz', 'Avail%', 'Downtime', 'Reason'].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-medium ${t.textFaint}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className={`divide-y ${t.divide}`}>
              {records.slice(0, 14).map(r => (
                <tr key={r.id} className={`${t.hoverBg} transition-colors`}>
                  <td className={`px-4 py-2.5 ${t.textMuted}`}>{r.date}</td>
                  <td className={`px-4 py-2.5 ${t.textFaint}`}>{r.shift}</td>
                  <td className={`px-4 py-2.5 font-semibold ${r.tonnesMilled >= TARGETS.tonnesMilled ? 'text-emerald-500' : 'text-amber-500'}`}>{r.tonnesMilled}</td>
                  <td className={`px-4 py-2.5 font-semibold ${r.grade >= TARGETS.grade ? 'text-emerald-500' : 'text-amber-500'}`}>{r.grade}</td>
                  <td className={`px-4 py-2.5 ${r.recovery >= TARGETS.recovery ? 'text-emerald-500' : 'text-amber-500'}`}>{r.recovery}%</td>
                  <td className={`px-4 py-2.5 font-semibold ${r.goldOz >= TARGETS.goldOz ? 'text-emerald-500' : 'text-amber-500'}`}>{r.goldOz}</td>
                  <td className={`px-4 py-2.5 ${t.textMuted}`}>{r.millAvail}%</td>
                  <td className={`px-4 py-2.5 ${t.textFaint}`}>{r.downtimeHrs}h</td>
                  <td className={`px-4 py-2.5 text-xs ${t.textFaint}`}>{r.downtimeReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function ProductionPage() {
  return <AppShell><ProductionContent /></AppShell>;
}
